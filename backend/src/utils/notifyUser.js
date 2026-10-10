const pool = require('../config/db');
const insertNotification = require('./insertNotification');
const sendPush = require('./sendPush');
const { sendToUser } = require('./sseClients');

/**
 * notifyUser — one call for everything a user should get when something
 * happens to them: an inbox row, a phone push, and a live "notification"
 * ping so open apps refresh their bell straight away.
 *
 * Never throws — a failed notification must not break the request.
 */
async function notifyUser(userId, type, title, body = '', data = {}) {
  try {
    await insertNotification(userId, type, title, body, data);
    sendToUser(userId, 'notification', { type, ...data });

    const tok = await pool.query('SELECT push_token FROM users WHERE id = $1', [userId]);
    const token = tok.rows[0]?.push_token;
    if (token) sendPush(token, title, body, { type, ...data });
  } catch (err) {
    console.error('notifyUser error:', err.message);
  }
}

module.exports = notifyUser;
