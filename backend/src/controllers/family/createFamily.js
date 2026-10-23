const crypto = require('crypto');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * POST /api/family/create { name }
 * Creates a new family.
 *
 * - If the user only has a personal space, it gets renamed and made real
 *   (events come along, no data lost).
 * - If the user is already in shared families, a brand new family is created
 *   and set as active. Users can now belong to multiple families.
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
       ORDER BY member_count DESC`,
      [userId]
    );

    const sharedFamilies = current.rows.filter(r => !r.is_personal && r.member_count > 1);
    const personalFamily = current.rows.find(r => r.is_personal || r.member_count === 1);

    let family;

    if (sharedFamilies.length > 0) {
      // User is already in real families — create a fresh new one
      const inviteCode = crypto.randomBytes(24).toString('base64url');
      family = (await pool.query(
        `INSERT INTO families (name, invite_code, created_by, is_personal)
         VALUES ($1, $2, $3, false) RETURNING id, name, invite_code, is_personal`,
        [name, inviteCode, userId]
      )).rows[0];
      await pool.query(
        `INSERT INTO family_members (family_id, user_id, role, color) VALUES ($1, $2, 'admin', '#1a8fa8')`,
        [family.id, userId]
      );
    } else if (personalFamily) {
      // Only a personal space exists — rename it and make it real
      family = (await pool.query(
        `UPDATE families SET name = $1, is_personal = false WHERE id = $2
         RETURNING id, name, invite_code, is_personal`,
        [name, personalFamily.id]
      )).rows[0];
      await pool.query(
        `UPDATE family_members SET role = 'admin' WHERE family_id = $1 AND user_id = $2`,
        [family.id, userId]
      );
    } else {
      // No family at all — create one
      const inviteCode = crypto.randomBytes(24).toString('base64url');
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

    // Set the new family as active
    await pool.query(
      'UPDATE family_members SET is_active = false WHERE user_id = $1',
      [userId]
    );
    await pool.query(
      'UPDATE family_members SET is_active = true WHERE user_id = $1 AND family_id = $2',
      [userId, family.id]
    );

    return successResponse(res, 201, 'Family created successfully', { family });
  } catch (error) {
    console.error('createFamily error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createFamily;
