const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');

const addTask = async (req, res) => {
  const { id } = req.params; // event_id
  const { assigned_to, title, position } = req.body;
  const created_by = req.user.id;

  if (!title) {
    return errorResponse(res, 400, 'Title is required');
  }

  // Self-assigned or unassigned ("Anyone") tasks are immediately accepted
  const status = (!assigned_to || Number(assigned_to) === Number(created_by)) ? 'accepted' : 'pending';

  try {
    const result = await pool.query(
      `INSERT INTO tasks (event_id, assigned_to, title, position, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, assigned_to, title, position || 'full', created_by, status]
    );
    const memberRes = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1',
      [created_by]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId: result.rows[0].id });
    }

    return successResponse(res, 201, 'Task added successfully', {
      task: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = addTask;