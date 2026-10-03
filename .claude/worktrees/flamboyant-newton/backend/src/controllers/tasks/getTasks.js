const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getTasks = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.position, t.created_at,
              u.id as user_id, u.first_name, u.last_name,
              fm.color,
              st.id as sub_task_id, st.title as sub_task_title
       FROM tasks t
       JOIN users u ON t.assigned_to = u.id
       JOIN family_members fm ON u.id = fm.user_id
       LEFT JOIN sub_tasks st ON t.id = st.task_id
       WHERE t.event_id = $1
       ORDER BY t.created_at ASC, st.created_at ASC`,
      [id]
    );

    // Group subtasks under their parent task
    const tasksMap = {};
    result.rows.forEach(row => {
      if (!tasksMap[row.id]) {
        tasksMap[row.id] = {
          id: row.id,
          title: row.title,
          position: row.position,
          created_at: row.created_at,
          user_id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          color: row.color,
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

    return successResponse(res, 200, 'Tasks fetched', {
      tasks: Object.values(tasksMap)
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getTasks;