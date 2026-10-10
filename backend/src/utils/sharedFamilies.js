const pool = require('../config/db');

/**
 * Family ids that BOTH users belong to. Empty array = they share no family,
 * so the viewer must not see anything about that member.
 */
async function sharedFamilies(viewerId, memberId) {
  const r = await pool.query(
    `SELECT a.family_id
     FROM family_members a
     JOIN family_members b ON b.family_id = a.family_id
     WHERE a.user_id = $1 AND b.user_id = $2`,
    [viewerId, memberId]
  );
  return r.rows.map(x => Number(x.family_id));
}

module.exports = sharedFamilies;
