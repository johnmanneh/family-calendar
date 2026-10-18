const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// PATCH /api/family/active  { family_id }
// Sets the user's active family. Returns updated family + members.
const setActiveFamily = async (req, res) => {
  const userId = req.user.id;
  const { family_id } = req.body;

  if (!family_id) {
    return errorResponse(res, 400, 'family_id is required');
  }

  try {
    // Verify the user is actually a member of this family
    const membership = await pool.query(
      'SELECT 1 FROM family_members WHERE user_id = $1 AND family_id = $2',
      [userId, family_id]
    );

    if (membership.rows.length === 0) {
      return errorResponse(res, 403, 'You are not a member of this family');
    }

    // Clear all active flags for this user, then set the requested one
    await pool.query(
      'UPDATE family_members SET is_active = false WHERE user_id = $1',
      [userId]
    );
    await pool.query(
      'UPDATE family_members SET is_active = true WHERE user_id = $1 AND family_id = $2',
      [userId, family_id]
    );

    // Return the new active family + its members
    const family = await pool.query(
      'SELECT id, name, invite_code, is_personal FROM families WHERE id = $1',
      [family_id]
    );

    const members = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.is_managed, u.managed_by,
              fm.role, fm.color, fm.circle_type, fm.relationship
       FROM users u
       JOIN family_members fm ON u.id = fm.user_id
       WHERE fm.family_id = $1`,
      [family_id]
    );

    return successResponse(res, 200, 'Active family updated', {
      family: family.rows[0],
      members: members.rows,
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = setActiveFamily;
