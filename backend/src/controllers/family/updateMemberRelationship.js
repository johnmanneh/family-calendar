const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const updateMemberRelationship = async (req, res) => {
  const adminId = req.user.id;
  const { user_id, relationship } = req.body;

  if (!user_id) {
    return errorResponse(res, 400, 'user_id is required');
  }

  try {
    // Verify the requesting user is a family admin
    const adminCheck = await pool.query(
      `SELECT fm.family_id FROM family_members fm
       WHERE fm.user_id = $1 AND fm.role = 'admin'`,
      [adminId]
    );

    if (adminCheck.rows.length === 0) {
      return errorResponse(res, 403, 'Only family admins can set relationship labels');
    }

    const familyId = adminCheck.rows[0].family_id;

    const result = await pool.query(
      `UPDATE family_members
       SET relationship = $1
       WHERE user_id = $2 AND family_id = $3
       RETURNING *`,
      [relationship || null, user_id, familyId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'Member not found in your family');
    }

    return successResponse(res, 200, 'Relationship updated', {
      member: result.rows[0]
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateMemberRelationship;
