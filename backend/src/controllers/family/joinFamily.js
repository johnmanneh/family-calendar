const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const joinFamily = async (req, res) => {
  const { invite_code } = req.body;
  const userId = req.user.id;

  if (!invite_code) {
    return errorResponse(res, 400, 'Invite code is required');
  }

  try {
    // Find family by invite code
    const family = await pool.query(
      'SELECT * FROM families WHERE invite_code = $1',
      [invite_code]
    );

    if (family.rows.length === 0) {
      return errorResponse(res, 404, 'Family not found');
    }

    // Check if user is already a member
    const alreadyMember = await pool.query(
      'SELECT * FROM family_members WHERE family_id = $1 AND user_id = $2',
      [family.rows[0].id, userId]
    );

    if (alreadyMember.rows.length > 0) {
      return errorResponse(res, 400, 'You are already a member of this family');
    }

    // Add user as member
    await pool.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [family.rows[0].id, userId, 'member']
    );

    return successResponse(res, 200, 'Joined family successfully', {
      family: {
        id: family.rows[0].id,
        name: family.rows[0].name,
      },
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = joinFamily;