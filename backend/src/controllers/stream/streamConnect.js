const pool = require('../../config/db');
const { addClient, removeClient, addUserClient, removeUserClient, beginSubscription, finishSubscription } = require('../../utils/sseClients');

const streamConnect = async (req, res) => {
  const userId = req.user.id;

  // JWT only carries user id — look up ALL the user's families. With several
  // families, live updates must arrive for each of them (not just the largest),
  // and switching the active family then needs no reconnect.
  const snapshot = beginSubscription(userId);
  let memberRes;
  try {
    memberRes = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [userId]
    );
  } finally {
    finishSubscription(userId, snapshot);
  }
  const familyIds = memberRes.rows.map(r => r.family_id)
    .filter(id => !snapshot.revokedFamilies.has(String(id)));
  if (snapshot.revoked || !familyIds.length) {
    return res.status(403).end();
  }

  // SSE headers — keep connection open, disable buffering
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register this connection
  familyIds.forEach(id => addClient(id, res, userId));
  addUserClient(userId, res);

  // Send a heartbeat every 30s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up when the client disconnects
  const cleanup = () => {
    clearInterval(heartbeat);
    familyIds.forEach(id => removeClient(id, res, userId));
    removeUserClient(userId, res);
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
};

module.exports = streamConnect;
