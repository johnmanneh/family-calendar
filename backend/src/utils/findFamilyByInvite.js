const pool = require('../config/db');
const { isShortCodeShape, storedShortCode } = require('./inviteCodes');

async function findFamilyByInvite(code, query = pool.query.bind(pool)) {
  const trimmed = String(code || '').trim();
  if (!trimmed) return null;
  if (isShortCodeShape(trimmed)) {
    const r = await query(
      'SELECT id, name, invite_code, short_invite_code FROM families WHERE short_invite_code = $1',
      [storedShortCode(trimmed)]
    );
    return r.rows[0] || null;
  }
  const r = await query(
    'SELECT id, name, invite_code, short_invite_code FROM families WHERE invite_code = $1',
    [trimmed]
  );
  return r.rows[0] || null;
}

module.exports = { findFamilyByInvite };
