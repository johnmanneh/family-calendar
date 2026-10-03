const pool = require('../../config/db');
const { addClient, removeClient } = require('../../utils/sseClients');

const streamConnect = async (req, res) => {
  const userId = req.user.id;

  // JWT only carries user id — look up family membership
  const memberRes = await pool.query(
    'SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (memberRes.rowCount === 0) {
    return res.status(403).end();
  }
  const familyId = memberRes.rows[0].family_id;

  // SSE headers — keep connection open, disable buffering
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register this connection
  addClient(familyId, res);

  // Send a heartbeat every 30s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up when the client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(familyId, res);
  });
};

module.exports = streamConnect;
