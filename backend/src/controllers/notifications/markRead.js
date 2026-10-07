const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// PATCH /api/notifications/read-all — marks every unread notification as read
const markAllRead = async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

// PATCH /api/notifications/:id/read — marks a single notification as read
const markOneRead = async (req, res) => {
  const userId = req.user.id;
  const { id }  = req.params;
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return successResponse(res, 200, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = { markAllRead, markOneRead };
