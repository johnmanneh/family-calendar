const crypto = require('crypto');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * DELETE /api/family/leave
 * Leaves the shared family. Events you created stay with that family (shared
 * history). You get a fresh personal space so the app keeps working, and the
 * family is never left without an admin.
 */
const leaveFamily = async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    const membership = await client.query(
      `SELECT fm.family_id, fm.role, f.is_personal,
              (SELECT COUNT(*)::int FROM family_members WHERE family_id = fm.family_id) AS member_count
       FROM family_members fm JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1
       ORDER BY member_count DESC LIMIT 1`,
      [userId]
    );
    if (membership.rows.length === 0) return errorResponse(res, 400, 'You are not a member of any family');

    const { family_id, role, is_personal, member_count } = membership.rows[0];
    if (is_personal || member_count === 1) {
      return errorResponse(res, 400, "You're not in a shared family");
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM family_members WHERE user_id = $1 AND family_id = $2', [userId, family_id]);

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

    // Fresh personal space
    const u = await client.query('SELECT first_name FROM users WHERE id = $1', [userId]);
    const fam = await client.query(
      `INSERT INTO families (name, invite_code, created_by, is_personal)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [`${u.rows[0]?.first_name || 'My'}'s calendar`, crypto.randomBytes(4).toString('hex').toUpperCase(), userId]
    );
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role, color) VALUES ($1, $2, 'admin', '#1a8fa8')`,
      [fam.rows[0].id, userId]
    );

    await client.query('COMMIT');
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
