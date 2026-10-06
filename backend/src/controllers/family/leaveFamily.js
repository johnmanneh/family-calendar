const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const leaveFamily = async (req, res) => {
  const userId = req.user.id;

  try {
    // Confirm the user is actually in a family
    const membership = await pool.query(
      'SELECT fm.family_id, fm.role FROM family_members fm WHERE fm.user_id = $1',
      [userId]
    );

    if (membership.rows.length === 0) {
      return errorResponse(res, 400, 'You are not a member of any family');
    }

    const { family_id, role } = membership.rows[0];

    // Owners cannot leave — they would need to delete the family or transfer ownership
    if (role === 'owner') {
      return errorResponse(res, 400, 'Family owners cannot leave. Delete the family instead.');
    }

    await pool.query(
      'DELETE FROM family_members WHERE user_id = $1 AND family_id = $2',
      [userId, family_id]
    );

    return successResponse(res, 200, 'You have left the family');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = leaveFamily;
