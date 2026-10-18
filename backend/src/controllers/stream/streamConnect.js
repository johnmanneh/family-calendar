const pool = require('../../config/db');
const { addClient, removeClient, addUserClient, removeUserClient } = require('../../utils/sseClients');

const streamConnect = async (req, res) => {
  const userId = req.user.id;

  // JWT only carries user id — look up ALL the user's families. With several
  // families, live updates must arrive for each of them (not just the largest),
  // and switching the active family then needs no reconnect.
  const memberRes = await pool.query(
    'SELECT family_id FROM family_members WHERE user_id = $1',
    [userId]
  );
  if (memberRes.rowCount === 0) {
    return res.status(403).end();
  }
  const familyIds = memberRes.rows.map(r => r.family_id);

  // SSE headers — keep connection open, disable buffering
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register this connection
  familyIds.forEach(id => addClient(id, res));
  addUserClient(userId, res);

  // Send a heartbeat every 30s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up when the client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    familyIds.forEach(id => removeClient(id, res));
    removeUserClient(userId, res);
  });
};

module.exports = streamConnect;
