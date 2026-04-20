/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_ORDERS_TABLE: string;
  readonly VITE_SUPABASE_PRODUCTS_TABLE: string;
  readonly VITE_SUPABASE_VOUCHERS_TABLE: string;
  readonly VITE_ADMIN_SESSION_TTL_MINUTES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
