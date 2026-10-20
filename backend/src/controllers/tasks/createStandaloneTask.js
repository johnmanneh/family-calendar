const pool = require('../../config/db');
const sharedFamilies = require('../../utils/sharedFamilies');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const notifyUser = require('../../utils/notifyUser');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const createStandaloneTask = async (req, res) => {
  const userId = req.user.id;
  const { title, assigned_to, due_date, position } = req.body;

  if (!title || !assigned_to) {
    return errorResponse(res, 400, 'Title and assigned_to are required');
  }

  try {
    const familyResult = await pool.query(
      `SELECT fm.family_id FROM family_members fm WHERE fm.user_id = $1
       ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
      [userId]
    );
    const familyId = familyResult.rows[0]?.family_id;
    if (familyId == null) return errorResponse(res, 404, 'Not a family member');

    // The assignee must belong to this task's family, not just some other
    // family shared with the creator.
    const common = await sharedFamilies(userId, assigned_to);
    if (!common.includes(Number(familyId))) {
      return errorResponse(res, 403, 'You can only assign tasks within your active family');
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, assigned_to, due_date, position, is_standalone, created_by, family_id)
       VALUES ($1, $2, $3, $4, true, $5, $6)
       RETURNING *`,
      [title, assigned_to, due_date || null, position || 'full', userId, familyId]
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