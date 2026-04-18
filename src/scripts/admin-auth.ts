const ADMIN_SESSION_KEY = "astro-shop-admin-session";

interface AdminSessionRecord {
  token: string;
  expiresAt: number;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeTtlMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 480;
  }

  return Math.max(5, Math.floor(value));
}

function readSessionRecord(): AdminSessionRecord | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Partial<AdminSessionRecord>;
    if (typeof record.token !== "string" || typeof record.expiresAt !== "number") {
      return null;
    }

    return {
      token: record.token,
      expiresAt: record.expiresAt
    };
  } catch {
    return null;
  }
}

export function getAdminSessionToken(): string | null {
  const record = readSessionRecord();
  if (!record || record.expiresAt <= Date.now()) {
    return null;
  }
  return record.token;
}

export function createAdminSession(token: string, ttlSeconds: number): void {
  if (!canUseStorage()) {
    return;
  }

  const record: AdminSessionRecord = {
    token,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  };

  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(record));
}

export function clearAdminSession(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminSessionValid(): boolean {
  const record = readSessionRecord();

  if (!record) {
    return false;
  }

  const isExpired = record.expiresAt <= Date.now();

  if (isExpired) {
    clearAdminSession();
    return false;
  }

  return true;
}
