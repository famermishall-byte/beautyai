/**
 * Basic SSRF guard for admin-supplied API source URLs (src/app/api/admin/import-templates/[id]/sync
 * and the cron route both fetch these server-side) — blocks obvious internal/loopback targets.
 * Not exhaustive (doesn't defend against DNS rebinding), but matches this app's existing trust
 * level for other admin-supplied URLs (e.g. product image links) while closing the easy cases.
 */
export function isSafeExternalUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1") return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;

  return true;
}
