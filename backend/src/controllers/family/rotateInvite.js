const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const {
  generateLongCode,
  generateShortCode,
  storedShortCode,
} = require('../../utils/inviteCodes');
const { loadActiveFamily, isAdmin, payload } = require('./getInvite');

const rotateInvite = async (req, res) => {
  try {
    const row = await loadActiveFamily(req.user.id);
    if (!row) return errorResponse(res, 404, 'You are not a member of any family');
    if (!isAdmin(row.role)) return errorResponse(res, 403, 'Only family admins can replace invites');

    for (let i = 0; i < 8; i++) {
      const invite_code = generateLongCode();
      const short_invite_code = storedShortCode(generateShortCode());
      try {
        const updated = await pool.query(
          `UPDATE families SET invite_code = $1, short_invite_code = $2
           WHERE id = $3
           RETURNING id, invite_code, short_invite_code`,
          [invite_code, short_invite_code, row.id]
        );
        const next = updated.rows[0];
        return successResponse(
          res,
          200,
          'Invite replaced',
          payload({ ...row, invite_code: next.invite_code }, next.short_invite_code)
        );
      } catch (err) {
        if (err.code !== '23505') throw err;
      }
    }
    return errorResponse(res, 500, 'Could not replace invite');
  } catch (error) {
    console.error('rotateInvite error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = rotateInvite;
