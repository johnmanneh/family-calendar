const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');


const addSubTask = async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  if (!title) {
    return errorResponse(res, 400, 'Title is required');
  }

  try {
    const result = await pool.query(
      `INSERT INTO sub_tasks (task_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [taskId, title]
    );
    return successResponse(res, 201, 'SubTask added successfully', {
      subTask: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = addSubTask;