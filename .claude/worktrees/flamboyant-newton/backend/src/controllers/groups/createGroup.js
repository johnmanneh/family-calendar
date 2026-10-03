const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const crypto = require('crypto');

const createGroup = async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;

  if (!name) return errorResponse(res, 400, 'Group name is required');

  try {
    const familyMember = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [userId]
    );
    if (familyMember.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }
    const familyId = familyMember.rows[0].family_id;

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const group = await pool.query(
      `INSERT INTO groups (name, invite_code, family_id, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, inviteCode, familyId, userId]
    );

    // Creator auto-joins as admin
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [group.rows[0].id, userId]
    );

    return successResponse(res, 201, 'Group created', { group: group.rows[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createGroup;
