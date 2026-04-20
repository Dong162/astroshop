export const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export const PAYMENT_LABELS: Record<string, string> = {
  cod: "Tiền mặt (COD)",
  bank: "Chuyển khoản",
};

export const TYPE_LABELS: Record<string, string> = {
  fixed_amount: "Tiền mặt",
  percentage: "Phần trăm",
  free_shipping: "Miễn phí Ship",
};

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatDt(iso: string | null) {
  if (!iso) return "--";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function getDiscountDisplay(item: {
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
}) {
  const val =
    item.discount_value !== undefined
      ? item.discount_value
      : item.discount_amount || 0;
  const type = item.discount_type || "fixed_amount";
  if (type === "percentage") return val + "%";
  if (type === "free_shipping") return "Toàn bộ phí Ship";
  return currencyFormatter.format(val);
}
