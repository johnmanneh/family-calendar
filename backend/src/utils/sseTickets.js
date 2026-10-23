/**
 * sseTickets — in-memory single-use SSE ticket store.
 *
 * Flow:
 *   1. POST /api/stream/ticket  (verifyToken guard)
 *      → issueTicket() generates 32 random bytes, stores SHA-256 digest + userId + expiry
 *      → returns the raw ticket to the client (only time it is ever visible)
 *   2. GET /api/stream?ticket=<raw>
 *      → consumeTicket(rawTicket) hashes the value, looks it up, validates expiry,
 *        marks it used (atomically deletes) and returns userId
 *
 * ⚠ MULTI-INSTANCE NOTE:
 *   This Map is process-local. A second Railway replica will not see tickets issued
 *   by the first. Use a shared Redis TTL store (e.g. SET NX EX 60) before scaling
 *   beyond a single instance.
 *
 * Tickets expire after 60 seconds whether consumed or not — a periodic sweep
 * prevents unbounded memory growth under heavy load.
 */

const crypto = require('crypto');

// digest(hex) → { userId, expiresAt }
const _store = new Map();

// Sweep stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _store) {
    if (v.expiresAt <= now) _store.delete(k);
  }
}, 5 * 60 * 1000).unref(); // .unref() so the timer doesn't keep the process alive in tests

function _digest(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a new 60-second single-use ticket for userId.
 * @param {number|string} userId
 * @returns {string} raw ticket (opaque random string, base64url)
 */
function issueTicket(userId) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const digest = _digest(raw);
  _store.set(digest, { userId: Number(userId), expiresAt: Date.now() + 60_000 });
  return raw;
}

/**
 * Consume a raw ticket.  Single-use: the entry is deleted on first valid call.
 * @param {string} raw
 * @returns {{ userId: number }|null}  null if invalid, expired, or already used
 */
function consumeTicket(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const digest = _digest(raw);
  const entry = _store.get(digest);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    _store.delete(digest);
    return null;
  }
  _store.delete(digest); // consume — single use
  return { userId: entry.userId };
}

module.exports = { issueTicket, consumeTicket };
