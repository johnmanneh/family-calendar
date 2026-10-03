const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getPendingTasks = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.counter_offer, t.created_at,
              e.id as event_id, e.title as event_title,
              e.start_date, e.color,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name,
              st.id as sub_task_id, st.title as sub_task_title
       FROM tasks t
       JOIN events e ON t.event_id = e.id
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN sub_tasks st ON t.id = st.task_id
       WHERE t.assigned_to = $1
       AND (
         t.status = 'pending'
         OR (t.status = 'countered' AND t.last_counter_by = t.created_by)
       )
       ORDER BY e.start_date ASC, t.created_at ASC, st.created_at ASC`,
      [userId]
    );

    const tasksMap = {};
    result.rows.forEach(row => {
      if (!tasksMap[row.id]) {
        tasksMap[row.id] = {
          id: row.id,
          title: row.title,
          status: row.status,
          counter_offer: row.counter_offer,
          created_at: row.created_at,
          event_id: row.event_id,
          event_title: row.event_title,
          start_date: row.start_date,
          color: row.color,
          created_by_first_name: row.created_by_first_name,
          created_by_last_name: row.created_by_last_name,
          sub_tasks: []
        };
      }
      if (row.sub_task_id) {
        tasksMap[row.id].sub_tasks.push({
          id: row.sub_task_id,
          title: row.sub_task_title
        });
      }
    });

    return successResponse(res, 200, 'Pending tasks fetched', { tasks: Object.values(tasksMap) });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getPendingTasks;
