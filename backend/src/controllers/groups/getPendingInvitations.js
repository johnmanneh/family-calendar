const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getPendingInvitations = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT gi.id, gi.group_id, gi.invited_by, gi.created_at,
              g.name as group_name, g.invite_code,
              u.first_name as invited_by_name
       FROM group_invitations gi
       JOIN groups g ON gi.group_id = g.id
       JOIN users u ON gi.invited_by = u.id
       WHERE gi.user_id = $1 AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [userId]
    );

    return successResponse(res, 200, 'Invitations retrieved', { invitations: result.rows });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getPendingInvitations;
