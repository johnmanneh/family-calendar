const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const me = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'User fetched', {
      user: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = me;