const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const {
  generateShortCode,
  formatShortCode,
  storedShortCode,
} = require('../../utils/inviteCodes');

const JOIN_URL_BASE = 'https://its4us.app/join/';

async function loadActiveFamily(userId) {
  const family = await pool.query(
    `SELECT f.id, f.name, f.invite_code, f.short_invite_code, fm.role
     FROM families f
     JOIN family_members fm ON f.id = fm.family_id
     WHERE fm.user_id = $1
     ORDER BY ${ACTIVE_FAMILY_ORDER}
     LIMIT 1`,
    [userId]
  );
  return family.rows[0] || null;
}

function isAdmin(role) {
  return role === 'admin' || role === 'owner';
}

async function ensureShortCode(row) {
  if (row.short_invite_code) return storedShortCode(row.short_invite_code);
  for (let i = 0; i < 8; i++) {
    const short = storedShortCode(generateShortCode());
    try {
      const updated = await pool.query(
        `UPDATE families SET short_invite_code = $1
         WHERE id = $2 AND short_invite_code IS NULL
         RETURNING short_invite_code`,
        [short, row.id]
      );
      if (updated.rows.length > 0) return updated.rows[0].short_invite_code;
      const again = await pool.query(
        'SELECT short_invite_code FROM families WHERE id = $1',
        [row.id]
      );
      if (again.rows[0]?.short_invite_code) return again.rows[0].short_invite_code;
    } catch (err) {
      if (err.code !== '23505') throw err;
    }
  }
  throw new Error('Could not allocate short invite code');
}

function payload(row, short) {
  return {
    invite_code: row.invite_code,
    short_code: formatShortCode(short),
    join_url: `${JOIN_URL_BASE}${row.invite_code}`,
  };
}

const getInvite = async (req, res) => {
  try {
    const row = await loadActiveFamily(req.user.id);
    if (!row) return errorResponse(res, 404, 'You are not a member of any family');
    if (!isAdmin(row.role)) return errorResponse(res, 403, 'Only family admins can share invites');
    const short = await ensureShortCode(row);
    return successResponse(res, 200, 'Invite retrieved', payload(row, short));
  } catch (error) {
    console.error('getInvite error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getInvite;
module.exports.loadActiveFamily = loadActiveFamily;
module.exports.isAdmin = isAdmin;
module.exports.payload = payload;
module.exports.JOIN_URL_BASE = JOIN_URL_BASE;
