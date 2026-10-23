const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { findFamilyByInvite } = require('../../utils/findFamilyByInvite');

// GET /api/public/join/:token — family name only. Does not join.
const previewJoin = async (req, res) => {
  const token = req.params.token;
  if (!token || !String(token).trim()) {
    return errorResponse(res, 404, 'This link is not valid');
  }
  try {
    const family = await findFamilyByInvite(token);
    if (!family) return errorResponse(res, 404, 'This link is not valid');
    return successResponse(res, 200, 'Invite found', {
      type: 'family',
      family: { name: family.name },
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = previewJoin;
