const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getFamily = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get family the user belongs to
    const family = await pool.query(
      `SELECT f.id, f.name, f.invite_code 
       FROM families f
       JOIN family_members fm ON f.id = fm.family_id
       WHERE fm.user_id = $1`,
      [userId]
    );

    if (family.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    // Get all members of the family
    const members = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, fm.role, fm.color, fm.circle_type, fm.relationship
       FROM users u
       JOIN family_members fm ON u.id = fm.user_id
       WHERE fm.family_id = $1`,
      [family.rows[0].id]
    );

    return successResponse(res, 200, 'Family retrieved successfully', {
      family: family.rows[0],
      members: members.rows,
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getFamily;