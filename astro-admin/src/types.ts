export interface ProductImage {
  src: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  images: ProductImage[];
  regular_price: number;
  sale_price?: number | null;
  stock_status: string;
  flash?: boolean;
  is_popular?: boolean;
  status: string;
  created_at?: string;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string | number | null;
  createdAt: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  note: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  discountAmount?: number;
  total: number;
  items: OrderItem[];
}

export interface Voucher {
  id: number | null;
  code: string;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  is_active: boolean;
  created_at: string;
}
