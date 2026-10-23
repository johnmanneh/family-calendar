const pool = require('../../config/db');
const { errorResponse } = require('../../utils/response/responseHandlers');
const joinFamily = require('../family/joinFamily');
const joinGroup = require('../groups/joinGroup');
const { findFamilyByInvite } = require('../../utils/findFamilyByInvite');
const { isShortCodeShape } = require('../../utils/inviteCodes');

// One Join box for everything. Family and group codes look alike, so the user
// shouldn't have to know which one they got — the server checks both tables
// and hands off to the right controller.
//
// Response: { type: 'family', family } or { type: 'group', group }
const joinByCode = async (req, res) => {
  const raw = req.body.code || req.body.invite_code;
  if (!raw || !String(raw).trim()) {
    return errorResponse(res, 400, 'Invite code is required');
  }
  // Long tokens are base64url (case-sensitive). Short family codes are
  // case-insensitive. Never uppercase a long token.
  const code = String(raw).trim();
  req.body.invite_code = code;

  try {
    const fam = await findFamilyByInvite(code);
    if (fam) return joinFamily(req, res);

    if (isShortCodeShape(code)) {
      return errorResponse(res, 404, 'No family or group found with this code');
    }

    const grp = await pool.query('SELECT 1 FROM groups WHERE invite_code = $1', [code]);
    if (grp.rows.length > 0) return joinGroup(req, res);

    return errorResponse(res, 404, 'No family or group found with this code');
  } catch (error) {
    console.error('joinByCode error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = joinByCode;
