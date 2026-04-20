import { useState, useEffect, useCallback, useRef } from "react";
import { fetchOrders } from "../lib/api";
import {
  STATUS_LABELS,
  PAYMENT_LABELS,
  currencyFormatter,
  formatDt,
} from "../lib/constants";
import type { Order } from "../types";

const PAGE_SIZE = 20;
const MAX_SCROLL_LOADS = 2;

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);
  const scrollLoads = useRef(0);
  const hasMore = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadOrders = useCallback(
    async (reset = false) => {
      try {
        const offset = reset ? 0 : orders.length;
        const data = await fetchOrders(PAGE_SIZE, offset);
        if (data.length < PAGE_SIZE) hasMore.current = false;
        setOrders((prev) => (reset ? data : [...prev, ...data]));
      } catch (err) {
        console.error("fetchOrders", err);
      } finally {
        setLoading(false);
      }
    },
    [orders.length]
  );

  useEffect(() => {
    loadOrders(true);
    const interval = setInterval(() => loadOrders(true), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          hasMore.current &&
          scrollLoads.current < MAX_SCROLL_LOADS
        ) {
          scrollLoads.current++;
          loadOrders();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadOrders]);

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        String(o.id).includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Stats
  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const revenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.total, 0);

  const statCards = [
    { label: "Tổng đơn", value: totalOrders, color: "#2563eb" },
    { label: "Chờ xử lý", value: pending, color: "#f59e0b" },
    { label: "Hoàn tất", value: completed, color: "#10b981" },
    {
      label: "Doanh thu",
      value: currencyFormatter.format(revenue),
      color: "#8b5cf6",
    },
  ];

  const loadAll = () => {
    hasMore.current = true;
    scrollLoads.current = 0;
    loadOrders();
  };

  return (
    <div className="admin-page">
      <h2 className="admin-page__title">Đơn hàng</h2>

      <div className="stat-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card" style={{ borderColor: s.color }}>
            <div className="stat-card__value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Tìm theo tên, SĐT, mã đơn..."
          className="toolbar__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="toolbar__filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ xử lý</option>
          <option value="processing">Đang xử lý</option>
          <option value="shipping">Đang giao</option>
          <option value="completed">Hoàn tất</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {loading ? (
        <p className="loading-text">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">Không có đơn hàng nào.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Khách hàng</th>
                  <th>SĐT</th>
                  <th>Tổng</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customerName}</td>
                    <td>{o.customerPhone}</td>
                    <td>{currencyFormatter.format(o.total)}</td>
                    <td>{PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</td>
                    <td>
                      <span className={`status-badge status--${o.status}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td>{formatDt(o.createdAt)}</td>
                    <td>
                      <button
                        className="btn-detail"
                        onClick={() => setDetail(o)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-cards">
            {filtered.map((o) => (
              <div key={o.id} className="mobile-card" onClick={() => setDetail(o)}>
                <div className="mobile-card__header">
                  <strong>#{o.id}</strong>
                  <span className={`status-badge status--${o.status}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
                <div className="mobile-card__body">
                  <div>{o.customerName} — {o.customerPhone}</div>
                  <div className="mobile-card__total">
                    {currencyFormatter.format(o.total)}
                  </div>
                  <div className="mobile-card__date">{formatDt(o.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} />
          {scrollLoads.current >= MAX_SCROLL_LOADS && hasMore.current && (
            <button className="btn-load-all" onClick={loadAll}>
              Xem tất cả
            </button>
          )}
        </>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetail(null)}>
              ✕
            </button>
            <h3>Chi tiết đơn hàng #{detail.id}</h3>
            <div className="detail-grid">
              <div>
                <strong>Khách hàng:</strong> {detail.customerName}
              </div>
              <div>
                <strong>SĐT:</strong> {detail.customerPhone}
              </div>
              <div>
                <strong>Email:</strong> {detail.customerEmail || "--"}
              </div>
              <div>
                <strong>Địa chỉ:</strong> {detail.shippingAddress}
              </div>
              <div>
                <strong>Thanh toán:</strong>{" "}
                {PAYMENT_LABELS[detail.paymentMethod] || detail.paymentMethod}
              </div>
              <div>
                <strong>Trạng thái:</strong>{" "}
                <span className={`status-badge status--${detail.status}`}>
                  {STATUS_LABELS[detail.status] || detail.status}
                </span>
              </div>
              {detail.note && (
                <div>
                  <strong>Ghi chú:</strong> {detail.note}
                </div>
              )}
            </div>

            <h4>Sản phẩm</h4>
            <div className="detail-items">
              {detail.items.map((item, i) => (
                <div key={i} className="detail-item">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="detail-item__img"
                    />
                  )}
                  <div className="detail-item__info">
                    <div>{item.name}</div>
                    <div>
                      {currencyFormatter.format(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="detail-item__total">
                    {currencyFormatter.format(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="detail-totals">
              <div>
                <span>Tạm tính:</span>
                <span>{currencyFormatter.format(detail.subtotal)}</span>
              </div>
              <div>
                <span>Phí vận chuyển:</span>
                <span>{currencyFormatter.format(detail.shippingFee)}</span>
              </div>
              {detail.discountAmount !== undefined && detail.discountAmount > 0 && (
                <div>
                  <span>Giảm giá:</span>
                  <span>-{currencyFormatter.format(detail.discountAmount)}</span>
                </div>
              )}
              <div className="detail-totals__final">
                <span>Tổng cộng:</span>
                <span>{currencyFormatter.format(detail.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
