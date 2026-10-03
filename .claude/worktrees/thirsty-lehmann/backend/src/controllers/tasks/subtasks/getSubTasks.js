const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');
const getSubTasks = async (req, res) => {
    const { taskId } = req.params;
  
    try {
      const result = await pool.query(
        `SELECT * FROM sub_tasks WHERE task_id = $1 ORDER BY created_at ASC`,
        [taskId]
      );
      return successResponse(res, 200, 'SubTasks fetched', {
        subTasks: result.rows
      });
    } catch (error) {
      return errorResponse(res, 500, 'Server error');
    }
  };
  
  module.exports = getSubTasks;
 