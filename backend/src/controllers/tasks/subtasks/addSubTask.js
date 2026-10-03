const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');


const addSubTask = async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  if (!title) {
    return errorResponse(res, 400, 'Title is required');
  }

  const userId = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO sub_tasks (task_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [taskId, title]
    );

    // If the parent task is accepted and assigned to someone else,
    // reset it to pending so the assignee gets a notification
    await pool.query(
      `UPDATE tasks
       SET status = 'pending',
           counter_offer = NULL,
           last_counter_by = NULL
       WHERE id = $1
       AND status != 'pending'
       AND assigned_to != $2`,
      [taskId, userId]
    );

    return successResponse(res, 201, 'SubTask added successfully', {
      subTask: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = addSubTask;