import { getAdminSessionToken } from "./auth";
import type { Order, OrderItem, Voucher } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const ordersTable = import.meta.env.VITE_SUPABASE_ORDERS_TABLE || "astro_orders";
const productsTable = import.meta.env.VITE_SUPABASE_PRODUCTS_TABLE || "products";
const vouchersTable = import.meta.env.VITE_SUPABASE_VOUCHERS_TABLE || "astro_vouchers";

function headers(token?: string | null) {
  const t = token || getAdminSessionToken();
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${t}`,
    "Content-Type": "application/json",
  };
}

// ── Auth ──
export async function loginWithEmail(email: string, password: string) {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || "Đăng nhập thất bại");
  }
  return res.json();
}

// ── Orders ──
const toText = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const toNumber = (v: unknown, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

function normalizeItems(raw: unknown): OrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const name = toText(item.name);
      const price = toNumber(item.price);
      const quantity = Math.max(1, Math.floor(toNumber(item.quantity, 1)));
      const image = toText(item.image);
      if (!name || price < 0) return null;
      return { name, price, quantity, image };
    })
    .filter((x): x is OrderItem => Boolean(x));
}

function normalizeOrder(rec: Record<string, unknown>): Order {
  const items = normalizeItems(rec.items);
  const subtotal = toNumber(
    rec.subtotal,
    items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
  const shippingFee = toNumber(rec.shipping_fee, 0);
  return {
    id: rec.id as string | number | null,
    createdAt: toText(rec.created_at) || null,
    customerName: toText(rec.customer_name),
    customerPhone: toText(rec.customer_phone),
    customerEmail: toText(rec.customer_email),
    shippingAddress: toText(rec.shipping_address),
    note: toText(rec.note),
    paymentMethod: toText(rec.payment_method).toLowerCase() || "cod",
    status: toText(rec.status).toLowerCase() || "pending",
    subtotal,
    shippingFee,
    discountAmount:
      rec.discount_amount !== undefined
        ? toNumber(rec.discount_amount)
        : undefined,
    total: toNumber(rec.total, subtotal + shippingFee),
    items,
  };
}

export async function fetchOrders(limit: number, offset: number) {
  const params = new URLSearchParams({
    select:
      "id,created_at,customer_name,customer_phone,customer_email,shipping_address,note,payment_method,status,subtotal,shipping_fee,discount_amount,total,items",
    order: "created_at.desc.nullslast",
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/${ordersTable}?${params}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  const raw: Record<string, unknown>[] = await res.json();
  return raw.map(normalizeOrder);
}

// ── Products ──

/** Fetch paginated products with server-side count */
export async function fetchProducts(opts: {
  limit: number;
  offset: number;
  keyword?: string;
  filter?: string;
}): Promise<{ data: import("../types").Product[]; total: number }> {
  const params = new URLSearchParams({
    select:
      "id,name,slug,images,regular_price,sale_price,stock_status,flash,is_popular,status",
    status: "eq.publish",
    order: "created_at.desc",
    limit: String(opts.limit),
    offset: String(opts.offset),
  });
  if (opts.keyword) params.set("name", `ilike.*${opts.keyword}*`);
  if (opts.filter === "instock") params.set("stock_status", "neq.outofstock");
  if (opts.filter === "outofstock") params.set("stock_status", "eq.outofstock");
  if (opts.filter === "flash") params.set("flash", "eq.true");
  if (opts.filter === "popular") params.set("is_popular", "eq.true");

  const h = { ...headers(), Prefer: "count=exact" };
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${productsTable}?${params}`,
    { headers: h }
  );
  if (!res.ok) throw new Error(await res.text());
  const total = parseInt(res.headers.get("content-range")?.split("/")[1] ?? "0", 10);
  const data = await res.json();
  return { data, total };
}

/** Get real counts for product stats (4 parallel HEAD requests) */
export async function fetchProductStats(): Promise<{
  total: number;
  inStock: number;
  outOfStock: number;
  flash: number;
}> {
  const base = `${supabaseUrl}/rest/v1/${productsTable}`;
  const h = { ...headers(), Prefer: "count=exact" };

  const makeReq = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ select: "id", status: "eq.publish", limit: "0", ...extra });
    return fetch(`${base}?${p}`, { method: "HEAD", headers: h }).then(
      (r) => parseInt(r.headers.get("content-range")?.split("/")[1] ?? "0", 10)
    );
  };

  const [total, outOfStock, flash] = await Promise.all([
    makeReq(),
    makeReq({ stock_status: "eq.outofstock" }),
    makeReq({ flash: "eq.true" }),
  ]);

  return { total, inStock: total - outOfStock, outOfStock, flash };
}

/** Batch update products (PATCH) */
export async function updateProductsBatch(
  ids: number[],
  payload: Record<string, unknown>
) {
  const idFilter = `in.(${ids.join(",")})`;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${productsTable}?id=${idFilter}`,
    { method: "PATCH", headers: headers(), body: JSON.stringify(payload) }
  );
  if (!res.ok) throw new Error(await res.text());
}

/** Delete products */
export async function deleteProducts(ids: number[]) {
  const idFilter = `in.(${ids.join(",")})`;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${productsTable}?id=${idFilter}`,
    { method: "DELETE", headers: headers() }
  );
  if (!res.ok) throw new Error(await res.text());
}

// ── Vouchers ──
export async function fetchVouchers(): Promise<Voucher[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${vouchersTable}?select=*&order=created_at.desc`,
    { cache: "no-store", headers: headers() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createVoucher(payload: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${vouchersTable}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateVoucher(
  id: number,
  payload: Record<string, unknown>
) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${vouchersTable}?id=eq.${id}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteVoucher(id: number) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${vouchersTable}?id=eq.${id}`,
    {
      method: "DELETE",
      headers: headers(),
    }
  );
  if (!res.ok) throw new Error("Delete failed");
}
