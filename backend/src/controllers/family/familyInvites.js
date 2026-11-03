const pool = require('../../config/db');
const notifyUser = require('../../utils/notifyUser');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const validId = v => /^\d+$/.test(String(v)) && Number(v) > 0 && Number(v) <= 2147483647;

/**
 * GET /api/family/known-people
 * Everyone you already share a family with (across all your families), so you
 * can pick them when you create a new family. Children only if you manage them.
 */
const knownPeople = async (req, res) => {
  const userId = Number(req.user.id);
  try {
    const r = await pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.avatar_url, u.is_managed
       FROM family_members mine
       JOIN family_members other ON other.family_id = mine.family_id
       JOIN users u ON u.id = other.user_id
       WHERE mine.user_id = $1 AND u.id <> $1
         AND (u.is_managed IS NOT TRUE OR u.managed_by = $1)
       ORDER BY u.first_name`,
      [userId]
    );
    return successResponse(res, 200, 'Known people', { people: r.rows });
  } catch (error) {
    console.error('knownPeople error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

/**
 * Invite people to a family the inviter just created.
 * - Children the inviter manages are added straight away.
 * - Adults get an invitation (Accept / Decline in Notifications).
 * Only people who already share a family with the inviter can be picked.
 * Returns { added, invited } counts. Never throws.
 */
async function inviteKnownPeople(inviterId, family, userIds) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).filter(validId).map(Number))]
    .filter(id => id !== Number(inviterId)).slice(0, 50);
  if (!ids.length) return { added: 0, invited: 0 };
  let added = 0, invited = 0;
  try {
    const known = await pool.query(
      `SELECT DISTINCT u.id, u.is_managed, u.managed_by
       FROM family_members mine
       JOIN family_members other ON other.family_id = mine.family_id
       JOIN users u ON u.id = other.user_id
       WHERE mine.user_id = $1 AND u.id = ANY($2::int[])`,
      [inviterId, ids]
    );
    const who = await pool.query('SELECT first_name FROM users WHERE id = $1', [inviterId]);
    const inviterName = who.rows[0]?.first_name || 'Someone';
    for (const p of known.rows) {
      if (p.is_managed) {
        if (Number(p.managed_by) !== Number(inviterId)) continue;
        const r = await pool.query(
          `INSERT INTO family_members (family_id, user_id, role, circle_type)
           SELECT $1, $2, 'member', 'inner'
           WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2)
           RETURNING id`,
          [family.id, p.id]
        );
        if (r.rowCount) added++;
        continue;
      }
      const inv = await pool.query(
        `INSERT INTO family_invites (family_id, user_id, invited_by)
         VALUES ($1, $2, $3) ON CONFLICT (family_id, user_id) DO NOTHING RETURNING id`,
        [family.id, p.id, inviterId]
      );
      if (!inv.rowCount) continue;
      invited++;
      await notifyUser(p.id, 'family_invite', `Join ${family.name}?`,
        `${inviterName} invited you to the family ${family.name}`,
        { familyId: family.id, inviteId: inv.rows[0].id });
    }
    if (added || invited) {
      await pool.query('UPDATE families SET is_personal = false WHERE id = $1', [family.id]);
    }
  } catch (error) {
    console.error('inviteKnownPeople error:', error.message);
  }
  return { added, invited };
}

/** GET /api/family/invites — my open family invitations */
const myInvites = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT fi.id, fi.family_id, f.name AS family_name, u.first_name AS invited_by_name
       FROM family_invites fi
       JOIN families f ON f.id = fi.family_id
       LEFT JOIN users u ON u.id = fi.invited_by
       WHERE fi.user_id = $1 AND fi.status = 'pending'
       ORDER BY fi.created_at DESC`,
      [req.user.id]
    );
    return successResponse(res, 200, 'Family invites', { invites: r.rows });
  } catch (error) {
    console.error('myInvites error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

/** PUT /api/family/invites/:id { response: 'accepted' | 'declined' } */
const respondInvite = async (req, res) => {
  const userId = Number(req.user.id);
  const { id } = req.params;
  const accept = req.body?.response === 'accepted';
  if (!validId(id) || !['accepted', 'declined'].includes(req.body?.response)) {
    return errorResponse(res, 400, 'Invalid invitation answer');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = await client.query(
      `SELECT fi.id, fi.family_id, fi.invited_by, f.name
       FROM family_invites fi JOIN families f ON f.id = fi.family_id
       WHERE fi.id = $1 AND fi.user_id = $2 AND fi.status = 'pending' FOR UPDATE OF fi`,
      [id, userId]
    );
    if (!inv.rows.length) {
      await client.query('ROLLBACK');
      return errorResponse(res, 404, 'Invitation not found or already answered');
    }
    const { family_id: familyId, invited_by: invitedBy, name } = inv.rows[0];
    await client.query(
      `UPDATE family_invites SET status = $1, answered_at = (NOW() AT TIME ZONE 'UTC') WHERE id = $2`,
      [accept ? 'accepted' : 'declined', id]
    );
    if (accept) {
      // Same as joining with the code: new joiners start in the outer circle
      await client.query(
        `INSERT INTO family_members (family_id, user_id, role, circle_type)
         SELECT $1, $2, 'member', 'outer'
         WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2)`,
        [familyId, userId]
      );
      await client.query('UPDATE family_members SET is_active = false WHERE user_id = $1', [userId]);
      await client.query('UPDATE family_members SET is_active = true WHERE user_id = $1 AND family_id = $2', [userId, familyId]);
      await client.query('UPDATE families SET is_personal = false WHERE id = $1', [familyId]);
    }
    await client.query('COMMIT');

    if (invitedBy) {
      const me = await pool.query('SELECT first_name FROM users WHERE id = $1', [userId]);
      const who = me.rows[0]?.first_name || 'Someone';
      await notifyUser(invitedBy, accept ? 'family_invite_accepted' : 'family_invite_declined',
        accept ? `${who} joined ${name}` : `${who} declined`,
        accept ? `${who} accepted your invitation to ${name}` : `${who} declined your invitation to ${name}`,
        { familyId });
    }
    return successResponse(res, 200, accept ? 'Joined family' : 'Invitation declined', {
      family: accept ? { id: familyId, name } : null,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('respondInvite error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

module.exports = { knownPeople, inviteKnownPeople, myInvites, respondInvite };
