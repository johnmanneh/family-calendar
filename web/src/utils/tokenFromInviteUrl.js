/**
 * Extract a family invite token from a scanned QR payload.
 * Only https://its4us.app/join/<token> (and www) is accepted.
 */
export function tokenFromInviteUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  let url;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (host !== 'its4us.app') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'join' || !parts[1]) return null;
  try {
    return decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
}
