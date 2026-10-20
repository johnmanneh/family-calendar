const crypto = require('crypto');
const pool = require('../../config/db');
const { revokeFamily } = require('../../utils/sseClients');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * DELETE /api/family/leave  { family_id }
 * Leaves a specific family. Events you created stay with that family.
 * If other families remain, the largest one becomes active.
 * A personal space is only created if this was the user's last family.
 * The family is never left without an admin.
 */
const leaveFamily = async (req, res) => {
  const userId = req.user.id;
  const { family_id } = req.body;

  if (!family_id) {
    return errorResponse(res, 400, 'family_id is required');
  }

  const client = await pool.connect();

  try {
    const membership = await client.query(
      `SELECT fm.family_id, fm.role, f.is_personal,
              (SELECT COUNT(*)::int FROM family_members WHERE family_id = fm.family_id) AS member_count
       FROM family_members fm JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1 AND fm.family_id = $2`,
      [userId, family_id]
    );

    if (membership.rows.length === 0) {
      return errorResponse(res, 400, 'You are not a member of this family');
    }

    const { role, is_personal, member_count } = membership.rows[0];

    if (is_personal || member_count === 1) {
      return errorResponse(res, 400, "You can't leave a personal family");
    }

    await client.query('BEGIN');

    // Remove user from the family
    await client.query(
      'DELETE FROM family_members WHERE user_id = $1 AND family_id = $2',
      [userId, family_id]
    );

    // Never leave a family without an admin
    if (role === 'admin' || role === 'owner') {
      const admins = await client.query(
        `SELECT 1 FROM family_members WHERE family_id = $1 AND role IN ('admin','owner') LIMIT 1`,
        [family_id]
      );
      if (admins.rows.length === 0) {
        await client.query(
          `UPDATE family_members SET role = 'admin'
           WHERE id = (SELECT id FROM family_members WHERE family_id = $1 ORDER BY joined_at ASC, id ASC LIMIT 1)`,
          [family_id]
        );
      }
    }

    // Check remaining families
    const remaining = await client.query(
      `SELECT fm.family_id, f.is_personal,
              (SELECT COUNT(*)::int FROM family_members WHERE family_id = fm.family_id) AS member_count
       FROM family_members fm JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1
       ORDER BY member_count DESC`,
      [userId]
    );

    if (remaining.rows.length === 0) {
      // No families left — create a fresh personal space
      const u = await client.query('SELECT first_name FROM users WHERE id = $1', [userId]);
      const newFam = await client.query(
        `INSERT INTO families (name, invite_code, created_by, is_personal)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [`${u.rows[0]?.first_name || 'My'}'s calendar`, crypto.randomBytes(4).toString('hex').toUpperCase(), userId]
      );
      await client.query(
        `INSERT INTO family_members (family_id, user_id, role, color, is_active)
         VALUES ($1, $2, 'admin', '#1a8fa8', true)`,
        [newFam.rows[0].id, userId]
      );
    } else {
      // Set the largest remaining family as active
      const nextFamily = remaining.rows[0].family_id;
      await client.query(
        'UPDATE family_members SET is_active = false WHERE user_id = $1',
        [userId]
      );
      await client.query(
        'UPDATE family_members SET is_active = true WHERE user_id = $1 AND family_id = $2',
        [userId, nextFamily]
      );
    }

    await client.query('COMMIT');
    revokeFamily(userId, family_id);
    return successResponse(res, 200, 'You have left the family');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('leaveFamily error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

module.exports = leaveFamily;
