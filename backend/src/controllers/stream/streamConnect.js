const pool = require('../../config/db');
const { consumeTicket } = require('../../utils/sseTickets');
const { addClient, removeClient, addUserClient, removeUserClient, beginSubscription, finishSubscription } = require('../../utils/sseClients');

// GET /api/stream?ticket=<opaque-ticket>
//
// The ticket is validated and atomically consumed here (single-use, 60s window).
// The session JWT must NEVER be accepted on this endpoint — pass it via the
// POST /api/stream/ticket handshake only.
const streamConnect = async (req, res) => {
  const rawTicket = req.query?.ticket;

  if (!rawTicket) {
    return res.status(401).json({ error: 'Missing stream ticket' });
  }

  const claim = consumeTicket(rawTicket);
  if (!claim) {
    return res.status(401).json({ error: 'Invalid or expired stream ticket' });
  }

  const userId = claim.userId;

  // JWT in query string is explicitly rejected even if someone passes one
  if (req.query.token) {
    return res.status(401).json({ error: 'JWT in query string is not accepted; use ticket' });
  }

  // Load the user's family memberships
  const snapshot = beginSubscription(userId);
  let memberRes;
  try {
    memberRes = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [userId]
    );
  } catch {
    finishSubscription(userId, snapshot);
    return res.status(403).end();
  }
  finishSubscription(userId, snapshot);

  const familyIds = (memberRes?.rows || [])
    .map(r => r.family_id)
    .filter(id => !snapshot.revokedFamilies.has(String(id)));

  if (snapshot.revoked || !familyIds.length) {
    return res.status(403).end();
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  familyIds.forEach(id => addClient(id, res, userId));
  addUserClient(userId, res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  const cleanup = () => {
    clearInterval(heartbeat);
    familyIds.forEach(id => removeClient(id, res, userId));
    removeUserClient(userId, res);
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
};

module.exports = streamConnect;
