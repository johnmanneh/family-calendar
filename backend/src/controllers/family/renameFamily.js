const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/** PUT /api/family/name { name } — the family admin renames the family */
const renameFamily = async (req, res) => {
  const name = (req.body.name || '').trim();
  const userId = req.user.id;
  if (!name) return errorResponse(res, 400, 'Family name is required');
  if (name.length > 60) return errorResponse(res, 400, 'Family name is too long');

  try {
    const fam = await pool.query(
      `SELECT f.id, fm.role, f.is_personal
       FROM families f JOIN family_members fm ON fm.family_id = f.id
       WHERE fm.user_id = $1
       ORDER BY (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) DESC LIMIT 1`,
      [userId]
    );
    if (!fam.rows.length) return errorResponse(res, 404, 'You are not in a family');
    const { id, role, is_personal } = fam.rows[0];
    if (is_personal) return errorResponse(res, 400, 'Create a family first');
    if (role !== 'admin' && role !== 'owner') return errorResponse(res, 403, 'Only the family admin can rename it');

    const updated = await pool.query(
      'UPDATE families SET name = $1 WHERE id = $2 RETURNING id, name, invite_code, is_personal',
      [name, id]
    );
    return successResponse(res, 200, 'Family renamed', { family: updated.rows[0] });
  } catch (error) {
    console.error('renameFamily error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = renameFamily;
