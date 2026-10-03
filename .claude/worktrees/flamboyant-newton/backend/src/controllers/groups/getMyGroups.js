const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getMyGroups = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT COUNT(*) FROM event_groups WHERE group_id = g.id) as event_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );

    return successResponse(res, 200, 'Groups retrieved', { groups: result.rows });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getMyGroups;
