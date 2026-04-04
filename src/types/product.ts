export interface ProductImage {
  src: string;
}

export interface Product {
  id: number;
  name: string;
  type: string;
  url?: string;
  slug: string;
  categories: string[];
  manage_stock: boolean;
  regular_price: number;
  sale_price: number | null;
  images: ProductImage[];
  description: string;
  short_description: string;
  stock_status: string;
  stock_quantity: number;
  is_popular: boolean;
  flash: boolean;
  flash_end_time: string | null;
  created_at?: string;
  updated_at?: string;
  status: string;
}
