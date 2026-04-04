export function hashPayload(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildAdminCredentialHash(username: string, password: string): string {
  const normalizedUser = username.trim();
  return hashPayload(`${normalizedUser}:${password}`);
}
