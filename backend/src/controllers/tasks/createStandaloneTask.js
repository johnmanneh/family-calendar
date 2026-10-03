const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const createStandaloneTask = async (req, res) => {
  const userId = req.user.id;
  const { title, assigned_to, due_date, position } = req.body;

  if (!title || !assigned_to) {
    return errorResponse(res, 400, 'Title and assigned_to are required');
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, assigned_to, due_date, position, is_standalone, created_by)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [title, assigned_to, due_date || null, position || 'full', userId]
    );
    return successResponse(res, 201, 'Standalone task created', {
      task: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createStandaloneTask;