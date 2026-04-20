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
    return "Đang cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Đang cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export interface GetProductsOptions {
  limit?: number;
  offset?: number;
  isPopular?: boolean;
  flash?: boolean;
  category?: string;
  sortBy?: "created_at" | "regular_price" | "is_popular";
  order?: "asc" | "desc";
  all?: boolean;
  excludeOutOfStock?: boolean;
}

export async function getProducts(options: GetProductsOptions = {}): Promise<Product[]> {
  const { supabaseUrl, supabaseKey, productsTable } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[products] Missing Supabase env vars. Add SUPABASE_URL + SUPABASE_ANON_KEY or PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY."
    );
    return sampleProducts;
  }

  const {
    limit = 100,
    offset = 0,
    isPopular,
    flash,
    category,
    sortBy = "created_at",
    order = "desc",
    all = false,
    excludeOutOfStock = false
  } = options;

  let allProducts: Product[] = [];
  let page = 0;
  const pageSize = all ? 1000 : limit;
  let hasMore = true;

  try {
    const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;

    while (hasMore) {
      const from = offset + page * pageSize;
      const to = from + pageSize - 1;

      const endpoint = new URL(`${baseUrl}/rest/v1/${productsTable}`);
      endpoint.searchParams.set("select", PRODUCT_COLUMNS);
      endpoint.searchParams.set("status", "eq.publish");

      if (isPopular !== undefined) {
        endpoint.searchParams.set("is_popular", `eq.${isPopular}`);
      }
      if (flash !== undefined) {
        endpoint.searchParams.set("flash", `eq.${flash}`);
      }
      if (excludeOutOfStock) {
        endpoint.searchParams.set("stock_status", "neq.outofstock");
      }
      if (category) {
        endpoint.searchParams.set("categories", `cs.{"${category}"}`);
      }

      endpoint.searchParams.set("order", `${sortBy}.${order}`);

      const response = await fetch(endpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
          Range: `${from}-${to}`
        }
      });

      if (!response.ok) {
        const message = await response.text();
        console.warn(`[products] Supabase request failed: ${response.status} - ${message}`);
        return allProducts.length > 0 ? allProducts : sampleProducts;
      }

      const rows = (await response.json()) as Record<string, unknown>[];
      const batch = rows.map(normalizeProduct);
      
      allProducts = [...allProducts, ...batch];

      // If we don't want all products, or we got fewer than requested, stop
      if (!all || rows.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
      
      // Safety limit
      if (page > 100) {
        hasMore = false;
      }
    }

    if (allProducts.length === 0 && !all && offset === 0) {
      return sampleProducts;
    }

    return allProducts;
  } catch (error) {
    console.warn("[products] Failed to fetch Supabase products.", error);
    return allProducts.length > 0 ? allProducts : sampleProducts;
  }
}
export interface ProductStats {
  total: number;
  inStock: number;
  outOfStock: number;
  flash: number;
  popular: number;
}

export async function getProductStats(): Promise<ProductStats> {
  const { supabaseUrl, supabaseKey, productsTable } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    return { total: 0, inStock: 0, outOfStock: 0, flash: 0, popular: 0 };
  }

  const fetchCount = async (filters: string = "") => {
    const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const endpoint = new URL(`${baseUrl}/rest/v1/${productsTable}`);
    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("status", "eq.publish");
    if (filters) {
       const parts = filters.split("&");
       parts.forEach(p => {
         const [k, v] = p.split("=");
         endpoint.searchParams.set(k, v);
       });
    }

    const response = await fetch(endpoint, {
      method: "HEAD",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "count=exact"
      }
    });

    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      const parts = contentRange.split("/");
      return parseInt(parts[1], 10) || 0;
    }
    return 0;
  };

  try {
    const [total, outOfStock, flash, popular] = await Promise.all([
      fetchCount(),
      fetchCount("stock_status=eq.outofstock"),
      fetchCount("flash=eq.true"),
      fetchCount("is_popular=eq.true")
    ]);

    return {
      total,
      inStock: total - outOfStock,
      outOfStock,
      flash,
      popular
    };
  } catch (error) {
    console.warn("[products] Failed to fetch product stats.", error);
    return { total: 0, inStock: 0, outOfStock: 0, flash: 0, popular: 0 };
  }
}
