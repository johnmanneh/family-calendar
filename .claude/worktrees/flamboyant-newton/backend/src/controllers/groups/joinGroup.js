const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const joinGroup = async (req, res) => {
  const userId = req.user.id;
  const { invite_code } = req.body;

  if (!invite_code) return errorResponse(res, 400, 'Invite code is required');

  try {
    const group = await pool.query(
      'SELECT * FROM groups WHERE invite_code = $1',
      [invite_code.toUpperCase()]
    );
    if (group.rows.length === 0) return errorResponse(res, 404, 'Invalid invite code');

    const groupId = group.rows[0].id;

    const existing = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (existing.rows.length > 0) return errorResponse(res, 409, 'You are already in this group');

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
      [groupId, userId]
    );

    return successResponse(res, 200, 'Joined group', { group: group.rows[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = joinGroup;
