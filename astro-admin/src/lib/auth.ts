const SESSION_KEY = "astro-shop-admin-session";

interface AdminSessionRecord {
  token: string;
  expiresAt: number;
}

export function createAdminSession(token: string, ttlSeconds: number) {
  const record: AdminSessionRecord = {
    token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(record));
}

export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAdminSessionValid(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const record: AdminSessionRecord = JSON.parse(raw);
    return record.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function getAdminSessionToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const record: AdminSessionRecord = JSON.parse(raw);
    if (record.expiresAt <= Date.now()) return null;
    return record.token;
  } catch {
    return null;
  }
}
