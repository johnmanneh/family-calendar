const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');

const deleteSubTask = async (req, res) => {
  const { subTaskId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM sub_tasks WHERE id = $1 RETURNING *`,
      [subTaskId]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'SubTask not found');
    }
    return successResponse(res, 200, 'SubTask deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteSubTask;