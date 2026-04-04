import { sampleProducts } from "../data/sample-products";
import type { Product } from "../types/product";

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "type",
  "url",
  "slug",
  "categories",
  "manage_stock",
  "regular_price",
  "sale_price",
  "images",
  "description",
  "short_description",
  "stock_status",
  "stock_quantity",
  "is_popular",
  "flash",
  "flash_end_time",
  "created_at",
  "updated_at",
  "status"
].join(",");

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
        return item.name;
      }

      return "";
    })
    .filter(Boolean);
}

function toImages(value: unknown): Product["images"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (item && typeof item === "object" && "src" in item && typeof item.src === "string") {
        return { src: item.src };
      }

      return null;
    })
    .filter((item): item is { src: string } => Boolean(item));
}

function normalizeProduct(raw: Record<string, unknown>): Product {
  const salePrice =
    raw.sale_price === null || raw.sale_price === undefined || raw.sale_price === ""
      ? null
      : toNumber(raw.sale_price);

  return {
    id: toNumber(raw.id),
    name: typeof raw.name === "string" ? raw.name : "San pham",
    type: typeof raw.type === "string" ? raw.type : "simple",
    url: typeof raw.url === "string" ? raw.url : "",
    slug:
      typeof raw.slug === "string" && raw.slug.length > 0
        ? raw.slug
        : `san-pham-${toNumber(raw.id)}`,
    categories: toStringArray(raw.categories),
    manage_stock: Boolean(raw.manage_stock),
    regular_price: toNumber(raw.regular_price),
    sale_price: salePrice,
    images: toImages(raw.images),
    description: typeof raw.description === "string" ? raw.description : "",
    short_description: typeof raw.short_description === "string" ? raw.short_description : "",
    stock_status: typeof raw.stock_status === "string" ? raw.stock_status : "instock",
    stock_quantity: toNumber(raw.stock_quantity),
    is_popular: Boolean(raw.is_popular),
    flash: Boolean(raw.flash),
    flash_end_time: typeof raw.flash_end_time === "string" ? raw.flash_end_time : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : "",
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "",
    status: typeof raw.status === "string" ? raw.status : "publish"
  };
}

function getSupabaseConfig() {
  const supabaseUrl =
    import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey =
    import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";
  const productsTable =
    import.meta.env.SUPABASE_PRODUCTS_TABLE ??
    import.meta.env.PUBLIC_SUPABASE_PRODUCTS_TABLE ??
    "products";

  return { supabaseUrl, supabaseKey, productsTable };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Dang cap nhat";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Dang cap nhat";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export async function getProducts(): Promise<Product[]> {
  const { supabaseUrl, supabaseKey, productsTable } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[products] Missing Supabase env vars. Add SUPABASE_URL + SUPABASE_ANON_KEY or PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY."
    );
    return sampleProducts;
  }

  try {
    const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const endpoint = new URL(`${baseUrl}/rest/v1/${productsTable}`);
    endpoint.searchParams.set("select", PRODUCT_COLUMNS);
    endpoint.searchParams.set("status", "eq.publish");
    endpoint.searchParams.set("order", "created_at.desc");

    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn(`[products] Supabase request failed: ${response.status} ${response.statusText} - ${message}`);
      return sampleProducts;
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    const products = rows.map(normalizeProduct).filter((product) => product.status === "publish");

    if (products.length === 0) {
      console.warn("[products] Supabase returned 0 published products. Falling back to sample data.");
      return sampleProducts;
    }

    return products;
  } catch (error) {
    console.warn("[products] Failed to fetch Supabase products.", error);
    return sampleProducts;
  }
}
