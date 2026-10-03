const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const addTask = async (req, res) => {
  const { id } = req.params; // event_id
  const { assigned_to, title, position } = req.body;

  if (!title || !assigned_to) {
    return errorResponse(res, 400, 'Title and assigned_to are required');
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (event_id, assigned_to, title, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, assigned_to, title, position || 'full']
    );
    return successResponse(res, 201, 'Task added successfully', {
      task: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = addTask;