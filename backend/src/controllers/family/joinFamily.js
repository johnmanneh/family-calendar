const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/family/join  { invite_code }
// Joins a family. Users can now belong to multiple families simultaneously.
// The newly joined family becomes the active one.
//
// Special case: if the user only has a solo/personal family, its events and
// groups are migrated to the new family before the personal space is removed.
const joinFamily = async (req, res) => {
  const { invite_code } = req.body;
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

    // Every family the user is currently in
    const current = await client.query(
      `SELECT fm.family_id, fm.role, f.is_personal,
              (SELECT COUNT(*) FROM family_members x WHERE x.family_id = fm.family_id)::int AS member_count
       FROM family_members fm
       JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = $1`,
      [userId]
    );

    // Already a member
    if (current.rows.some(r => Number(r.family_id) === Number(target.id))) {
      return errorResponse(res, 400, 'You are already a member of this family');
    }

    await client.query('BEGIN');

    // If the user's only family is a solo/personal space, migrate its content
    // and remove it — this is the first-time onboarding case.
    const soloFamilies = current.rows.filter(r => r.member_count === 1);
    const sharedFamilies = current.rows.filter(r => r.member_count > 1);

    if (soloFamilies.length > 0 && sharedFamilies.length === 0) {
      for (const fam of soloFamilies) {
        await client.query('UPDATE events SET family_id = $1 WHERE family_id = $2', [target.id, fam.family_id]);
        await client.query('UPDATE groups SET family_id = $1 WHERE family_id = $2', [target.id, fam.family_id]);
        // Move explicitly scoped tasks before the old family's FK cascade.
        // Unknown legacy scope stays unresolved rather than being guessed.
        await client.query('UPDATE tasks SET family_id = $1 WHERE family_id = $2', [target.id, fam.family_id]);
        await client.query('DELETE FROM messages WHERE family_id = $1', [fam.family_id]);
        await client.query('DELETE FROM family_members WHERE family_id = $1', [fam.family_id]);
        await client.query('DELETE FROM families WHERE id = $1', [fam.family_id]);
      }
    }

    // Add user to the new family
    await client.query(
      'INSERT INTO family_members (family_id, user_id, role) VALUES ($1, $2, $3)',
      [target.id, userId, 'member']
    );

    // Set new family as active, clear active on all others
    await client.query(
      'UPDATE family_members SET is_active = false WHERE user_id = $1',
      [userId]
    );
    await client.query(
      'UPDATE family_members SET is_active = true WHERE user_id = $1 AND family_id = $2',
      [userId, target.id]
    );

    // Someone joined → it's a real family now
    await client.query('UPDATE families SET is_personal = false WHERE id = $1', [target.id]);

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
