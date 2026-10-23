/**
 * validateUrl — allow only http: and https: schemes for user-supplied URLs.
 *
 * Blocks javascript:, intent:, file:, data:, vbscript:, etc.
 * Empty / null / undefined values return true (field is optional at the call
 * site; presence check is the caller's responsibility).
 *
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
function validateUrl(value) {
  if (value === null || value === undefined || value === '') return true;
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    // Malformed URL — not safe
    return false;
  }
}

module.exports = validateUrl;
