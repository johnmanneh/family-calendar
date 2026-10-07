const pool = require('../config/db');

/**
 * insertNotification — writes one row to the notifications table.
 *
 * @param {number} userId  - recipient
 * @param {string} type    - task_assigned | task_accepted | task_declined |
 *                           task_countered | counter_accepted | event_invited
 * @param {string} title   - short heading shown in the inbox
 * @param {string} body    - one-line detail text
 * @param {object} data    - { taskId?, eventId? } for deep-linking
 */
async function insertNotification(userId, type, title, body = '', data = {}) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, JSON.stringify(data)]
    );
  } catch (err) {
    // Never crash the calling controller over a notification write failure
    console.error('insertNotification error:', err.message);
  }
}

module.exports = insertNotification;
