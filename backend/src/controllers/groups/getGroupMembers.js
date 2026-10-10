const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getGroupMembers = async (req, res) => {
  const userId = req.user.id;
  const { id: groupId } = req.params;

  try {
    // Verify user is a member of this group
    const membership = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membership.rows.length === 0) {
      return errorResponse(res, 403, 'You are not a member of this group');
    }

    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.color,
              gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, u.first_name ASC`,
      [groupId]
    );

    return successResponse(res, 200, 'Group members retrieved', { members: result.rows });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getGroupMembers;
