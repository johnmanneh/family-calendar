const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const updateMemberCircle = async (req, res) => {
  const adminId = req.user.id;
  const { user_id, circle_type } = req.body;

  if (!user_id || !circle_type) {
    return errorResponse(res, 400, 'user_id and circle_type are required');
  }

  if (!['inner', 'extended', 'outer'].includes(circle_type)) {
    return errorResponse(res, 400, 'circle_type must be inner, extended, or outer');
  }

  try {
    // Verify the requesting user is a family admin
    const adminCheck = await pool.query(
      `SELECT fm.family_id FROM family_members fm
       WHERE fm.user_id = $1 AND fm.role = 'admin'`,
      [adminId]
    );

    if (adminCheck.rows.length === 0) {
      return errorResponse(res, 403, 'Only family admins can change circle type');
    }

    const familyId = adminCheck.rows[0].family_id;

    // Update the target member's circle_type (must be in same family)
    const result = await pool.query(
      `UPDATE family_members
       SET circle_type = $1
       WHERE user_id = $2 AND family_id = $3
       RETURNING *`,
      [circle_type, user_id, familyId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'Member not found in your family');
    }

    return successResponse(res, 200, 'Circle type updated', {
      member: result.rows[0]
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateMemberCircle;
