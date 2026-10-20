const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// PATCH /api/family/availability — only your OWN preference in a receiving family.
// Being an admin or a calendar delegate never grants control of someone else's opt-in.
const setAvailabilitySharing = async (req, res) => {
  const body = req.body || {};
  const { family_id, share_availability } = body;
  const familyId = Number(family_id);
  if (!/^\d+$/.test(String(family_id)) || !Number.isSafeInteger(familyId) || familyId < 1 || familyId > 2147483647 ||
      typeof share_availability !== 'boolean' ||
      Object.keys(body).some(key => !['family_id', 'share_availability'].includes(key))) {
    return errorResponse(res, 400, 'Provide family_id and a boolean share_availability for your own account');
  }
  try {
    // One conditional write: no separate authorisation check can race a membership change.
    // Managed child profiles cannot opt in through this adult self-service endpoint.
    const result = await pool.query(
      `UPDATE family_members fm SET share_availability = $3
       FROM users u
       WHERE fm.user_id = $1 AND fm.family_id = $2
         AND u.id = fm.user_id AND NOT COALESCE(u.is_managed, false)
       RETURNING fm.family_id, fm.share_availability`,
      [Number(req.user.id), familyId, share_availability]
    );
    if (!result.rows.length) return errorResponse(res, 404, 'Family not found');
    res.setHeader('Cache-Control', 'no-store');
    return successResponse(res, 200, 'Availability sharing saved', { setting: result.rows[0] });
  } catch (error) {
    console.error('setAvailabilitySharing error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = setAvailabilitySharing;
