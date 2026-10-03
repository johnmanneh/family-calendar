const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteGroup = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Only the group admin can delete
    const memberCheck = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (memberCheck.rowCount === 0 || memberCheck.rows[0].role !== 'admin') {
      return errorResponse(res, 403, 'Only the group admin can delete this group');
    }

    await pool.query('DELETE FROM group_invitations WHERE group_id = $1', [id]);
    await pool.query('DELETE FROM event_groups WHERE group_id = $1', [id]);
    await pool.query('DELETE FROM group_members WHERE group_id = $1', [id]);
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);

    return successResponse(res, 200, 'Group deleted');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteGroup;
