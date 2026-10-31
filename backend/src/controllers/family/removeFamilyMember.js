const crypto = require('crypto');
const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { revokeFamily, broadcast } = require('../../utils/sseClients');
const notifyUser = require('../../utils/notifyUser');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * DELETE /api/family/members/:userId   { family_id? }  (defaults to your active family)
 *
 * A family admin removes another adult from the family.
 *  - Only admins/owners of that family may do it.
 *  - Not yourself (use Leave), not a child (use the child's Remove), never the
 *    last admin.
 *  - The removed person loses access straight away (live updates revoked),
 *    switches to another of their families (or a fresh personal calendar),
 *    and gets a notification. Their own events stay with the family.
 *  - They can rejoin with the invite code unless the admin makes a new code.
 */
const removeFamilyMember = async (req, res) => {
  const adminId = Number(req.user.id);
  const targetId = Number(req.params.userId);
  if (!Number.isInteger(targetId) || targetId <= 0) return errorResponse(res, 400, 'Invalid member');
  if (targetId === adminId) return errorResponse(res, 400, 'Use "Leave family" to remove yourself');

  const client = await pool.connect();
  try {
    // Which family: the one given, or the admin's active family
    let familyId = Number(req.body?.family_id) || null;
    const mine = await client.query(
      `SELECT fm.family_id, fm.role, f.name, f.is_personal
       FROM family_members fm JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1 ${familyId ? 'AND fm.family_id = $2' : ''}
       ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
      familyId ? [adminId, familyId] : [adminId]
    );
    if (mine.rows.length === 0) return errorResponse(res, 403, 'You are not a member of this family');
    const { role: myRole, name: familyName, is_personal } = mine.rows[0];
    familyId = mine.rows[0].family_id;
    if (myRole !== 'admin' && myRole !== 'owner') return errorResponse(res, 403, 'Only a family admin can remove members');
    if (is_personal) return errorResponse(res, 400, 'This is a personal calendar');

    const target = await client.query(
      `SELECT fm.role, u.is_managed, u.first_name
       FROM family_members fm JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = $1 AND fm.user_id = $2`,
      [familyId, targetId]
    );
    if (target.rows.length === 0) return errorResponse(res, 404, 'This person is not in the family');
    if (target.rows[0].is_managed) return errorResponse(res, 400, 'Remove a child from their profile instead');

    await client.query('BEGIN');
    await client.query('DELETE FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, targetId]);

    // Never leave the family without an admin (the remover is one, so this is a safety net)
    const admins = await client.query(
      `SELECT 1 FROM family_members WHERE family_id = $1 AND role IN ('admin','owner') LIMIT 1`, [familyId]);
    if (admins.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 400, 'A family needs at least one admin');
    }

    // The removed person: switch to another family, or create a personal calendar
    const remaining = await client.query(
      `SELECT fm.family_id, fm.is_active,
              (SELECT COUNT(*)::int FROM family_members c WHERE c.family_id = fm.family_id) AS member_count
       FROM family_members fm WHERE fm.user_id = $1
       ORDER BY fm.is_active DESC, member_count DESC`,
      [targetId]
    );
    if (remaining.rows.length === 0) {
      const u = await client.query('SELECT first_name FROM users WHERE id = $1', [targetId]);
      const fam = await client.query(
        `INSERT INTO families (name, invite_code, created_by, is_personal) VALUES ($1, $2, $3, true) RETURNING id`,
        [`${u.rows[0]?.first_name || 'My'}'s calendar`, crypto.randomBytes(4).toString('hex').toUpperCase(), targetId]
      );
      await client.query(
        `INSERT INTO family_members (family_id, user_id, role, color, is_active) VALUES ($1, $2, 'admin', '#1a8fa8', true)`,
        [fam.rows[0].id, targetId]
      );
    } else if (!remaining.rows.some(r => r.is_active)) {
      await client.query('UPDATE family_members SET is_active = false WHERE user_id = $1', [targetId]);
      await client.query('UPDATE family_members SET is_active = true WHERE user_id = $1 AND family_id = $2',
        [targetId, remaining.rows[0].family_id]);
    }

    await client.query('COMMIT');

    revokeFamily(targetId, familyId);
    broadcast(familyId, 'event_update', {});
    await notifyUser(targetId, 'family_removed', 'Removed from family', `You were removed from ${familyName}`, { family_id: familyId });

    return successResponse(res, 200, 'Member removed', { family_id: familyId, user_id: targetId });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('removeFamilyMember error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

module.exports = removeFamilyMember;
