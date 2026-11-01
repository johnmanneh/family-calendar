const pool = require('../config/db');
const notifyUser = require('../utils/notifyUser');

/**
 * Sends task reminders that are due: "Buy bread is due in 30 min".
 *
 * A task gets one reminder at (due_date - remind_minutes) for its assignee,
 * only while it is still open (not done, not declined). Claiming rows with
 * UPDATE ... RETURNING means two servers never send the same reminder twice.
 * Reminders more than an hour overdue (server was down) are dropped silently.
 */
function dueText(minutes) {
  if (!minutes) return 'is due now';
  if (minutes < 60) return `is due in ${minutes} min`;
  if (minutes < 1440) return `is due in ${Math.round(minutes / 60)} h`;
  return 'is due tomorrow';
}

// tasks.due_date is a UTC time stored without a zone (migration 030), so "now"
// is compared as UTC too.
async function runTaskReminders() {
  const claimed = await pool.query(
    `UPDATE tasks t SET reminder_sent_at = NOW()
     WHERE t.reminder_sent_at IS NULL
       AND t.completed = false
       AND t.status IN ('pending', 'accepted', 'countered')
       AND t.assigned_to IS NOT NULL
       AND t.due_date IS NOT NULL
       AND t.remind_minutes IS NOT NULL
       AND t.due_date - make_interval(mins => t.remind_minutes) <= (NOW() AT TIME ZONE 'UTC')
       AND t.due_date - make_interval(mins => t.remind_minutes) > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
     RETURNING t.id, t.title, t.assigned_to, t.created_by, t.remind_minutes`
  );
  for (const t of claimed.rows) {
    let from = '';
    if (t.created_by && Number(t.created_by) !== Number(t.assigned_to)) {
      const who = await pool.query('SELECT first_name FROM users WHERE id = $1', [t.created_by]);
      if (who.rows[0]?.first_name) from = ` (from ${who.rows[0].first_name})`;
    }
    await notifyUser(t.assigned_to, 'task_reminder', 'Reminder',
      `${t.title} ${dueText(t.remind_minutes)}${from}`, { taskId: t.id });
  }
  return claimed.rows.length;
}

// Runs every minute. Errors are logged, never thrown (must not crash the API).
function startTaskReminders(intervalMs = 60 * 1000) {
  const tick = () => runTaskReminders().catch(err => console.error('taskReminders error:', err.message));
  tick();
  return setInterval(tick, intervalMs);
}

module.exports = { runTaskReminders, startTaskReminders, dueText };
