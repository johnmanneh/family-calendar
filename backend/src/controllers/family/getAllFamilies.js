const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// GET /api/family/all
// Returns every family the user belongs to, with member count and active flag.
const getAllFamilies = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT f.id, f.name, f.invite_code, f.is_personal,
              fm.role, fm.is_active, fm.share_availability,
              (SELECT COUNT(*) FROM family_members WHERE family_id = f.id)::int AS member_count
       FROM families f
       JOIN family_members fm ON fm.family_id = f.id
       WHERE fm.user_id = $1
       ORDER BY fm.is_active DESC, member_count DESC`,
      [userId]
    );

    const families = result.rows.map((row) => {
      if (row.role === 'admin' || row.role === 'owner') return row;
      const { invite_code, short_invite_code, ...rest } = row;
      return rest;
    });

    return successResponse(res, 200, 'Families retrieved successfully', {
      families,
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getAllFamilies;
