const crypto = require('crypto');

const SHORT_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SHORT_LEN = 12;

function generateLongCode() {
  return crypto.randomBytes(24).toString('base64url');
}

function generateShortCode() {
  const bytes = crypto.randomBytes(SHORT_LEN);
  let raw = '';
  for (let i = 0; i < SHORT_LEN; i++) {
    raw += SHORT_CHARSET[bytes[i] % SHORT_CHARSET.length];
  }
  return formatShortCode(raw);
}

function normalizeShortCode(input) {
  return String(input || '')
    .trim()
    .replace(/[-\s]/g, '')
    .toUpperCase();
}

function isShortCodeShape(input) {
  const n = normalizeShortCode(input);
  if (n.length !== SHORT_LEN) return false;
  for (const ch of n) {
    if (!SHORT_CHARSET.includes(ch)) return false;
  }
  return true;
}

function formatShortCode(raw) {
  const n = normalizeShortCode(raw);
  if (n.length !== SHORT_LEN) return n;
  return `${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8, 12)}`;
}

function storedShortCode(input) {
  return normalizeShortCode(input);
}

module.exports = {
  generateLongCode,
  generateShortCode,
  normalizeShortCode,
  isShortCodeShape,
  formatShortCode,
  storedShortCode,
  SHORT_CHARSET,
};
