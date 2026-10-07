const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    const result = await pool.query(
      `SELECT id, type, title, body, data, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const unreadCount = result.rows.filter(n => !n.is_read).length;

    return successResponse(res, 200, 'Notifications fetched', {
      notifications: result.rows,
      unread_count:  unreadCount,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getNotifications;
