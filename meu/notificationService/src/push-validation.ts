export function validPushEndpoint(endpoint: string): boolean {
  try {
    if (endpoint.length > 4096) return false;
    const url = new URL(endpoint);
    const host = url.hostname;
    const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" || host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
    return allowed && url.protocol === "https:" && (!url.port || url.port === "443") && !url.username && !url.password && !url.hash;
  } catch { return false; }
}
export function validPushKeys(keys: { p256dh?: unknown; auth?: unknown }): boolean {
  function decoded(value: unknown, size: number): Buffer | undefined {
    if (typeof value !== "string" || value.length > 128 || !/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return;
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length !== size || bytes.toString("base64url") !== value.replace(/=+$/, "")) return;
    return bytes;
  }
  const point = decoded(keys.p256dh, 65);
  return point?.[0] === 4 && !!decoded(keys.auth, 16);
}
