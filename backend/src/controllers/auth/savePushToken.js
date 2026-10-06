const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const savePushToken = async (req, res) => {
  const userId = req.user.id;
  const { push_token } = req.body;

  if (!push_token) {
    return errorResponse(res, 400, 'push_token is required');
  }

  try {
    await pool.query(
      'UPDATE users SET push_token = $1 WHERE id = $2',
      [push_token, userId]
    );
    return successResponse(res, 200, 'Push token saved');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = savePushToken;
