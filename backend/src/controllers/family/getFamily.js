const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getFamily = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get the family and the requesting user's role at the same time
    const family = await pool.query(
      `SELECT f.id, f.name, f.invite_code, f.is_personal, fm.role
       FROM families f
       JOIN family_members fm ON f.id = fm.family_id
       WHERE fm.user_id = $1
       ORDER BY ${ACTIVE_FAMILY_ORDER}
       LIMIT 1`,
      [userId]
    );

    if (family.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    const { role, ...familyData } = family.rows[0];

    // invite_code is only for admins and owners — members must not see it
    // so they cannot inadvertently leak the join link (security pass-1).
    if (role !== 'admin' && role !== 'owner') {
      delete familyData.invite_code;
      delete familyData.short_invite_code;
    }

    // Get all members of the family
    const members = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.is_managed, u.managed_by,
              fm.role, fm.color, fm.circle_type, fm.relationship
       FROM users u
       JOIN family_members fm ON u.id = fm.user_id
       WHERE fm.family_id = $1`,
      [familyData.id]
    );

    return successResponse(res, 200, 'Family retrieved successfully', {
      family: familyData,
      members: members.rows,
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getFamily;
