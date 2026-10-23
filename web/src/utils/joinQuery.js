import { tokenFromInviteUrl } from './tokenFromInviteUrl';

export function joinTokenFromSearch(search) {
  const raw = new URLSearchParams(search || '').get('join');
  return raw ? String(raw) : '';
}

export function pathWithJoin(path, token) {
  if (!token) return path;
  return `${path}?join=${encodeURIComponent(token)}`;
}

export { tokenFromInviteUrl };
