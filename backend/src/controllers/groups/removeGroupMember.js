const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const removeGroupMember = async (req, res) => {
  const adminId = req.user.id;
  const { id: groupId, userId: targetUserId } = req.params;

  try {
    // Only the group admin can remove members
    const adminCheck = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, adminId]
    );
    if (adminCheck.rowCount === 0 || adminCheck.rows[0].role !== 'admin') {
      return errorResponse(res, 403, 'Only the group admin can remove members');
    }

    // Cannot remove yourself (use delete group instead)
    if (Number(adminId) === Number(targetUserId)) {
      return errorResponse(res, 400, 'You cannot remove yourself — delete the group instead');
    }

    const result = await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, targetUserId]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, 404, 'Member not found in this group');
    }

    return successResponse(res, 200, 'Member removed from group');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = removeGroupMember;
