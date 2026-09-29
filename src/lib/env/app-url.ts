/** Public site origin for metadata, redirects, and auth callbacks. */
export function getAppUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "http://localhost:3000";
}
