import { useState, useEffect, type FormEvent } from "react";
import {
  fetchVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from "../lib/api";
import {
  TYPE_LABELS,
  currencyFormatter,
  formatDt,
  getDiscountDisplay,
} from "../lib/constants";
import type { Voucher } from "../types";

const emptyForm = {
  code: "",
  discount_type: "fixed_amount",
  discount_value: 0,
  is_active: true,
};

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setVouchers(await fetchVouchers());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = vouchers.filter((v) => {
    if (filter === "active" && !v.is_active) return false;
    if (filter === "inactive" && v.is_active) return false;
    if (search && !v.code.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (v: Voucher) => {
    setEditId(v.id);
    setForm({
      code: v.code,
      discount_type: v.discount_type || "fixed_amount",
      discount_value: v.discount_value ?? v.discount_amount ?? 0,
      is_active: v.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const handleDelete = async (v: Voucher) => {
    if (!v.id || !confirm(`Xóa mã "${v.code}"?`)) return;
    try {
      await deleteVoucher(v.id);
      load();
    } catch {
      alert("Xóa thất bại");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      is_active: form.is_active,
    };
    try {
      if (editId) {
        await updateVoucher(editId, payload);
      } else {
        await createVoucher(payload);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Có lỗi xảy ra";
      if (msg.includes("duplicate") || msg.includes("23505")) {
        setError("Mã giảm giá đã tồn tại!");
      } else if (msg.includes("RLS") || msg.includes("policy")) {
        setError("Không có quyền thực hiện thao tác này.");
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const totalActive = vouchers.filter((v) => v.is_active).length;

  return (
    <div className="admin-page">
      <h2 className="admin-page__title">
        Mã giảm giá
        <button className="btn-primary" onClick={openCreate}>
          + Thêm mã
        </button>
      </h2>

      <div className="stat-grid">
        <div className="stat-card" style={{ borderColor: "#2563eb" }}>
          <div className="stat-card__value" style={{ color: "#2563eb" }}>
            {vouchers.length}
          </div>
          <div className="stat-card__label">Tổng mã</div>
        </div>
        <div className="stat-card" style={{ borderColor: "#10b981" }}>
          <div className="stat-card__value" style={{ color: "#10b981" }}>
            {totalActive}
          </div>
          <div className="stat-card__label">Đang hoạt động</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Tìm mã..."
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
          <option value="active">Hoạt động</option>
          <option value="inactive">Tắt</option>
        </select>
      </div>

      {loading ? (
        <p className="loading-text">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="empty-text">Không có mã giảm giá nào.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Loại</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <code className="voucher-code">{v.code}</code>
                    </td>
                    <td>{TYPE_LABELS[v.discount_type || ""] || "--"}</td>
                    <td>{getDiscountDisplay(v)}</td>
                    <td>
                      <span
                        className={`status-badge status--${v.is_active ? "completed" : "cancelled"}`}
                      >
                        {v.is_active ? "Hoạt động" : "Tắt"}
                      </span>
                    </td>
                    <td>{formatDt(v.created_at)}</td>
                    <td className="action-cell">
                      <button
                        className="btn-detail"
                        onClick={() => openEdit(v)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(v)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-cards">
            {filtered.map((v) => (
              <div key={v.id} className="mobile-card">
                <div className="mobile-card__header">
                  <code className="voucher-code">{v.code}</code>
                  <span
                    className={`status-badge status--${v.is_active ? "completed" : "cancelled"}`}
                  >
                    {v.is_active ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
                <div className="mobile-card__body">
                  <div>
                    {TYPE_LABELS[v.discount_type || ""] || "--"} —{" "}
                    {getDiscountDisplay(v)}
                  </div>
                  <div className="mobile-card__actions">
                    <button className="btn-detail" onClick={() => openEdit(v)}>
                      Sửa
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(v)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
            <h3>{editId ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}</h3>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleSubmit} className="voucher-form">
              <label className="login-label">
                <span>Mã</span>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="VD: SALE50"
                />
              </label>
              <label className="login-label">
                <span>Loại giảm giá</span>
                <select
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm({ ...form, discount_type: e.target.value })
                  }
                >
                  <option value="fixed_amount">Tiền mặt</option>
                  <option value="percentage">Phần trăm</option>
                  <option value="free_shipping">Miễn phí Ship</option>
                </select>
              </label>
              {form.discount_type !== "free_shipping" && (
                <label className="login-label">
                  <span>Giá trị</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.discount_value}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_value: Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
              <label className="login-label checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <span>Hoạt động</span>
              </label>
              <button type="submit" className="login-submit" disabled={saving}>
                {saving ? "Đang lưu..." : editId ? "Cập nhật" : "Tạo mới"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
