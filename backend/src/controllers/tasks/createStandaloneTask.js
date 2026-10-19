const pool = require('../../config/db');
const access = require('../../utils/access');
const notifyUser = require('../../utils/notifyUser');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const createStandaloneTask = async (req, res) => {
  const userId = req.user.id;
  const { title, assigned_to, due_date, position } = req.body;

  if (!title || !assigned_to) {
    return errorResponse(res, 400, 'Title and assigned_to are required');
  }

  try {

    // F-03: standalone tasks go to yourself or someone in your family
    if (!(await access.sharesFamily(userId, assigned_to))) {
      return errorResponse(res, 403, 'You can only assign tasks to your family');
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, assigned_to, due_date, position, is_standalone, created_by)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [title, assigned_to, due_date || null, position || 'full', userId]
    );
    // Tell the assignee (inbox + phone push), unless you gave yourself the task
    if (Number(assigned_to) !== Number(userId)) {
      const who = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const name = [who.rows[0]?.first_name, who.rows[0]?.last_name].filter(Boolean).join(' ') || 'Someone';
      notifyUser(assigned_to, 'task_assigned', 'New task assigned', `${name}: ${title}`, { taskId: result.rows[0].id });
    }

    return successResponse(res, 201, 'Standalone task created', {
      task: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createStandaloneTask;