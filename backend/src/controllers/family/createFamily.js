const crypto = require('crypto');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * POST /api/family/create { name }
 * Turns the user's personal space into a real, named family with a code to
 * share. Their events come along (same family row, just renamed and visible).
 */
const createFamily = async (req, res) => {
  const name = (req.body.name || '').trim();
  const userId = req.user.id;

  if (!name) return errorResponse(res, 400, 'Family name is required');
  if (name.length > 60) return errorResponse(res, 400, 'Family name is too long');

  try {
    const current = await pool.query(
      `SELECT f.id, f.name, f.is_personal,
              (SELECT COUNT(*)::int FROM family_members WHERE family_id = f.id) AS member_count
       FROM families f JOIN family_members fm ON fm.family_id = f.id
       WHERE fm.user_id = $1
       ORDER BY member_count DESC LIMIT 1`,
      [userId]
    );

    // Already in a real family → leave/switch first
    if (current.rows.length && !current.rows[0].is_personal && current.rows[0].member_count > 1) {
      return errorResponse(res, 409, `You're already in ${current.rows[0].name}. Leave it first to create a new family.`);
    }

    let family;
    if (current.rows.length) {
      // Personal space (or a family you're alone in) → name it and make it real
      family = (await pool.query(
        `UPDATE families SET name = $1, is_personal = false WHERE id = $2
         RETURNING id, name, invite_code, is_personal`,
        [name, current.rows[0].id]
      )).rows[0];
      await pool.query(
        `UPDATE family_members SET role = 'admin' WHERE family_id = $1 AND user_id = $2`,
        [family.id, userId]
      );
    } else {
      const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      family = (await pool.query(
        `INSERT INTO families (name, invite_code, created_by, is_personal)
         VALUES ($1, $2, $3, false) RETURNING id, name, invite_code, is_personal`,
        [name, inviteCode, userId]
      )).rows[0];
      await pool.query(
        `INSERT INTO family_members (family_id, user_id, role, color) VALUES ($1, $2, 'admin', '#1a8fa8')`,
        [family.id, userId]
      );
    }

    return successResponse(res, 201, 'Family created successfully', { family });
  } catch (error) {
    console.error('createFamily error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createFamily;
