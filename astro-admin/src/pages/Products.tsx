import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchProducts,
  fetchProductStats,
  updateProductsBatch,
  deleteProducts,
} from "../lib/api";
import { currencyFormatter } from "../lib/constants";
import type { Product } from "../types";

const PAGE_SIZE = 20;

export default function Products() {
  /* ── state ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [stats, setStats] = useState({ total: 0, inStock: 0, outOfStock: 0, flash: 0 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  /* ── debounce search ── */
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  /* ── load stats (real counts from DB) ── */
  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchProductStats());
    } catch (e) {
      console.error("fetchProductStats", e);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ── load first page ── */
  const loadFirst = useCallback(async () => {
    setLoading(true);
    offsetRef.current = 0;
    setSelected(new Set());
    try {
      const { data, total } = await fetchProducts({
        limit: PAGE_SIZE,
        offset: 0,
        keyword: debouncedSearch || undefined,
        filter: filter !== "all" ? filter : undefined,
      });
      setProducts(data);
      offsetRef.current = data.length;
      setHasMore(data.length < total);
    } catch (err) {
      console.error("fetchProducts", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  /* ── load next page ── */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { data, total } = await fetchProducts({
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        keyword: debouncedSearch || undefined,
        filter: filter !== "all" ? filter : undefined,
      });
      setProducts((prev) => [...prev, ...data]);
      offsetRef.current += data.length;
      setHasMore(offsetRef.current < total);
    } catch (err) {
      console.error("fetchProducts more", err);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedSearch, filter, loadingMore, hasMore]);

  /* ── IntersectionObserver infinite scroll ── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  /* ── selection helpers ── */
  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  /* ── batch actions ── */
  const batchAction = async (label: string, action: () => Promise<void>) => {
    if (selected.size === 0) return;
    if (!confirm(`${label} ${selected.size} sản phẩm?`)) return;
    setBusy(true);
    try {
      await action();
      await Promise.all([loadFirst(), loadStats()]);
    } catch (e) {
      alert("Lỗi: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => batchAction("Xóa", () => deleteProducts([...selected]));
  const handleFlashOn = () => batchAction("Bật Flash Sale", () => updateProductsBatch([...selected], { flash: true }));
  const handleFlashOff = () => batchAction("Tắt Flash Sale", () => updateProductsBatch([...selected], { flash: false }));
  const handlePopularOn = () => batchAction("Bật Nổi bật", () => updateProductsBatch([...selected], { is_popular: true }));
  const handlePopularOff = () => batchAction("Tắt Nổi bật", () => updateProductsBatch([...selected], { is_popular: false }));

  /* ── helpers ── */
  const getImage = (p: Product) => {
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      const src = typeof p.images[0] === "string" ? p.images[0] : p.images[0]?.src;
      return src || "";
    }
    return "";
  };

  const statCards = [
    { label: "Tổng SP", value: stats.total, color: "#2563eb" },
    { label: "Còn hàng", value: stats.inStock, color: "#10b981" },
    { label: "Hết hàng", value: stats.outOfStock, color: "#ef4444" },
    { label: "Flash Sale", value: stats.flash, color: "#f59e0b" },
  ];

  return (
    <div className="admin-page">
      <h2 className="admin-page__title">Sản phẩm</h2>

      {/* Stats */}
      <div className="stat-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card" style={{ borderColor: s.color }}>
            <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="Tìm sản phẩm..."
          className="toolbar__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="toolbar__filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="instock">Còn hàng</option>
          <option value="outofstock">Hết hàng</option>
          <option value="flash">Flash Sale</option>
          <option value="popular">Phổ biến</option>
        </select>
      </div>

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="batch-bar">
          <span>Đã chọn <strong>{selected.size}</strong> sản phẩm</span>
          <div className="batch-bar__actions">
            <button className="btn-batch btn-batch--flash" onClick={handleFlashOn} disabled={busy}>
              ⚡ Bật Flash
            </button>
            <button className="btn-batch" onClick={handleFlashOff} disabled={busy}>
              Tắt Flash
            </button>
            <button className="btn-batch btn-batch--popular" onClick={handlePopularOn} disabled={busy}>
              🔥 Bật Nổi bật
            </button>
            <button className="btn-batch" onClick={handlePopularOff} disabled={busy}>
              Tắt Nổi bật
            </button>
            <button className="btn-batch btn-batch--danger" onClick={handleDelete} disabled={busy}>
              🗑 Xóa
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="loading-text">Đang tải...</p>
      ) : products.length === 0 ? (
        <p className="empty-text">Không có sản phẩm nào.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={toggleAll} /></th>
                  <th>Ảnh</th>
                  <th>Tên</th>
                  <th>Giá</th>
                  <th>Tình trạng</th>
                  <th>Tags</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={selected.has(p.id) ? "row-selected" : ""}>
                    <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} /></td>
                    <td>
                      {getImage(p) ? <img src={getImage(p)} alt={p.name} className="product-thumb" /> : <div className="product-thumb-empty" />}
                    </td>
                    <td>{p.name}</td>
                    <td>
                      {p.sale_price ? (
                        <><span className="price-sale">{currencyFormatter.format(p.sale_price)}</span><span className="price-regular">{currencyFormatter.format(p.regular_price)}</span></>
                      ) : currencyFormatter.format(p.regular_price)}
                    </td>
                    <td><span className={`stock-badge stock--${p.stock_status === "outofstock" ? "out" : "in"}`}>{p.stock_status === "outofstock" ? "Hết hàng" : "Còn hàng"}</span></td>
                    <td>
                      {p.flash && <span className="tag tag--flash">Flash</span>}
                      {p.is_popular && <span className="tag tag--popular">Hot</span>}
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="btn-detail" title={p.flash ? "Tắt Flash Sale" : "Bật Flash Sale"} onClick={async () => { await updateProductsBatch([p.id], { flash: !p.flash }); await Promise.all([loadFirst(), loadStats()]); }}>
                          {p.flash ? "⚡ Off" : "⚡ On"}
                        </button>
                        <button className="btn-detail" title={p.is_popular ? "Tắt Nổi bật" : "Bật Nổi bật"} onClick={async () => { await updateProductsBatch([p.id], { is_popular: !p.is_popular }); await Promise.all([loadFirst(), loadStats()]); }}>
                          {p.is_popular ? "🔥 Off" : "🔥 On"}
                        </button>
                        <button className="btn-danger" title="Xóa" onClick={async () => { if (!confirm(`Xóa "${p.name}"?`)) return; await deleteProducts([p.id]); await Promise.all([loadFirst(), loadStats()]); }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-cards">
            {products.map((p) => (
              <div key={p.id} className={`mobile-card ${selected.has(p.id) ? "row-selected" : ""}`}>
                <div className="mobile-card__header">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} />
                  {getImage(p) && <img src={getImage(p)} alt={p.name} className="product-thumb" />}
                  <strong style={{ flex: 1 }}>{p.name}</strong>
                </div>
                <div className="mobile-card__body">
                  <div>{p.sale_price ? currencyFormatter.format(p.sale_price) : currencyFormatter.format(p.regular_price)}</div>
                  <span className={`stock-badge stock--${p.stock_status === "outofstock" ? "out" : "in"}`}>{p.stock_status === "outofstock" ? "Hết hàng" : "Còn hàng"}</span>
                  {p.flash && <span className="tag tag--flash">Flash</span>}
                  {p.is_popular && <span className="tag tag--popular">Hot</span>}
                </div>
                <div className="mobile-card__actions">
                  <button className="btn-detail" onClick={async () => { await updateProductsBatch([p.id], { flash: !p.flash }); await Promise.all([loadFirst(), loadStats()]); }}>{p.flash ? "⚡ Off" : "⚡ On"}</button>
                  <button className="btn-detail" onClick={async () => { await updateProductsBatch([p.id], { is_popular: !p.is_popular }); await Promise.all([loadFirst(), loadStats()]); }}>{p.is_popular ? "🔥 Off" : "🔥 On"}</button>
                  <button className="btn-danger" onClick={async () => { if (!confirm(`Xóa "${p.name}"?`)) return; await deleteProducts([p.id]); await Promise.all([loadFirst(), loadStats()]); }}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} style={{ height: 1 }}>
              {loadingMore && <p className="loading-text">Đang tải thêm...</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
