import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithEmail } from "../lib/api";
import { createAdminSession, isAdminSessionValid } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  if (isAdminSessionValid()) {
    navigate("/orders", { replace: true });
    return null;
  }

  const ttlMinutes = Number(
    import.meta.env.VITE_ADMIN_SESSION_TTL_MINUTES || "480"
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginWithEmail(email, password);
      createAdminSession(data.access_token, ttlMinutes * 60);
      navigate("/orders", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__header">
          <div className="login-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1>Đông Admin</h1>
          <p>Đăng nhập để quản lý cửa hàng</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <label className="login-label">
          <span>Email</span>
          <input
            type="email"
            required
            autoFocus
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="login-label">
          <span>Mật khẩu</span>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
