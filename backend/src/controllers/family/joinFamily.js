const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// A person belongs to exactly ONE family. Joining a new family therefore means
// moving out of the current one:
//
//  - Current family has only you in it (e.g. the "<Name>'s Family" made at sign-up)
//    → you move over automatically: your events and groups come with you and the
//      empty family is removed.
//  - Current family has other people in it
//    → 409 IN_OTHER_FAMILY, so the app can ask "Leave X to join Y?".
//      The app then retries with leave_current: true.
//
// To stay connected to the old family, people use a group instead.
const joinFamily = async (req, res) => {
  const { invite_code, leave_current } = req.body;
  const userId = req.user.id;

  if (!invite_code) {
    return errorResponse(res, 400, 'Invite code is required');
  }

  const client = await pool.connect();
  try {
    const family = await client.query(
      'SELECT id, name FROM families WHERE invite_code = $1',
      [invite_code.trim().toUpperCase()]
    );
    if (family.rows.length === 0) {
      return errorResponse(res, 404, 'Family not found');
    }
    const target = family.rows[0];

    // Every family the user is in right now, with its member count
    const current = await client.query(
      `SELECT fm.family_id, fm.role, f.name,
              (SELECT COUNT(*) FROM family_members x WHERE x.family_id = fm.family_id)::int AS member_count
       FROM family_members fm
       JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1`,
      [userId]
    );

    if (current.rows.some(r => Number(r.family_id) === Number(target.id))) {
      return errorResponse(res, 400, 'You are already a member of this family');
    }

    const shared = current.rows.filter(r => r.member_count > 1);
    if (shared.length > 0 && !leave_current) {
      return res.status(409).json({
        success: false,
        code: 'IN_OTHER_FAMILY',
        message: `You are already in ${shared[0].name}. Leave it to join ${target.name}?`,
        current_family: { id: shared[0].family_id, name: shared[0].name },
        target_family: { id: target.id, name: target.name },
      });
    }

    await client.query('BEGIN');

    for (const fam of current.rows) {
      if (fam.member_count === 1) {
        // Solo family → bring the user's stuff along, then remove it
        await client.query('UPDATE events SET family_id = $1 WHERE family_id = $2', [target.id, fam.family_id]);
        await client.query('UPDATE groups SET family_id = $1 WHERE family_id = $2', [target.id, fam.family_id]);
        await client.query('DELETE FROM messages WHERE family_id = $1', [fam.family_id]);
        await client.query('DELETE FROM family_members WHERE family_id = $1', [fam.family_id]);
        await client.query('DELETE FROM families WHERE id = $1', [fam.family_id]);
      } else {
        // Shared family → leave it. Events they created stay with that family.
        await client.query(
          'DELETE FROM family_members WHERE family_id = $1 AND user_id = $2',
          [fam.family_id, userId]
        );
        // Never leave a family without an admin: promote the longest-standing member
        if (fam.role === 'admin' || fam.role === 'owner') {
          const admins = await client.query(
            `SELECT 1 FROM family_members WHERE family_id = $1 AND role IN ('admin','owner') LIMIT 1`,
            [fam.family_id]
          );
          if (admins.rows.length === 0) {
            await client.query(
              `UPDATE family_members SET role = 'admin'
               WHERE id = (SELECT id FROM family_members WHERE family_id = $1 ORDER BY joined_at ASC, id ASC LIMIT 1)`,
              [fam.family_id]
            );
          }
        }
      }
    }

    await client.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [target.id, userId, 'member']
    );

    await client.query('COMMIT');

    return successResponse(res, 200, 'Joined family successfully', {
      type: 'family',
      family: { id: target.id, name: target.name },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('joinFamily error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

module.exports = joinFamily;
