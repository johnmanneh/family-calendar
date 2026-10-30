const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { withFreshAvatar } = require('../../utils/avatarStore');

// The user's active family (see utils/activeFamily.js)
async function myFamily(userId) {
  const r = await pool.query(
    `SELECT f.id, f.is_personal, fm.role
     FROM family_members fm
     JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = $1
     ORDER BY ${ACTIVE_FAMILY_ORDER}
     LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

// GET /api/pickup-people
// Returns the family's saved list of pickup people, newest tiebreaker.
const listPickupPeople = async (req, res) => {
  const userId = Number(req.user.id);

  try {
    const fam = await myFamily(userId);
    if (!fam) return errorResponse(res, 403, 'No family found');

    const result = await pool.query(
      `SELECT pp.id, pp.user_id, pp.name, pp.phone, pp.sort_order,
              u.first_name AS member_first_name, u.last_name AS member_last_name,
              u.avatar_url AS member_avatar_url, u.color AS member_color
       FROM pickup_people pp
       LEFT JOIN users u ON u.id = pp.user_id
       WHERE pp.family_id = $1
       ORDER BY pp.sort_order ASC, pp.created_at ASC`,
      [fam.id]
    );

    return successResponse(res, 200, 'Pickup people', {
      people: result.rows.map((row) => withFreshAvatar(row, 'member_avatar_url', 'user_id')),
    });
  } catch (err) {
    console.error('listPickupPeople error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

// POST /api/pickup-people
// Add a person to the list. Body must have either user_id (in-app) or name (outside).
const addPickupPerson = async (req, res) => {
  const userId = Number(req.user.id);
  const { user_id, name, phone } = req.body || {};

  // Exactly one of user_id or name must be provided — mirrors the DB CHECK constraint
  const hasUser = user_id != null;
  const hasName = typeof name === 'string' && name.trim().length > 0;

  if (hasUser === hasName) {
    return errorResponse(res, 400, 'Provide either a user_id or a name, not both');
  }

  try {
    const fam = await myFamily(userId);
    if (!fam) return errorResponse(res, 403, 'No family found');

    // In-app person must actually be in this family
    if (hasUser) {
      const check = await pool.query(
        'SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2',
        [fam.id, user_id]
      );
      if (check.rows.length === 0) {
        return errorResponse(res, 400, 'That person is not in your family');
      }
    }

    const result = await pool.query(
      `INSERT INTO pickup_people (family_id, user_id, name, phone, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, name, phone, sort_order`,
      [fam.id, hasUser ? Number(user_id) : null, hasName ? name.trim() : null, phone?.trim() || null, userId]
    );

    return successResponse(res, 201, 'Person added', { person: result.rows[0] });
  } catch (err) {
    console.error('addPickupPerson error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

// PATCH /api/pickup-people/:id
// Edit name, phone, or sort_order. In-app users cannot be renamed here.
const updatePickupPerson = async (req, res) => {
  const userId = Number(req.user.id);
  const { id } = req.params;
  const { name, phone, sort_order } = req.body || {};

  try {
    const fam = await myFamily(userId);
    if (!fam) return errorResponse(res, 403, 'No family found');

    // Confirm this record belongs to the user's family
    const existing = await pool.query(
      'SELECT id, user_id FROM pickup_people WHERE id = $1 AND family_id = $2',
      [id, fam.id]
    );
    if (existing.rows.length === 0) return errorResponse(res, 404, 'Person not found');

    // In-app users get their name from their user profile — not editable here
    const isInApp = existing.rows[0].user_id != null;
    if (isInApp && name !== undefined) {
      return errorResponse(res, 400, 'Cannot rename an in-app user here');
    }

    await pool.query(
      `UPDATE pickup_people SET
         name       = COALESCE($1, name),
         phone      = COALESCE($2, phone),
         sort_order = COALESCE($3, sort_order)
       WHERE id = $4`,
      [name?.trim() || null, phone?.trim() || null, sort_order ?? null, id]
    );

    return successResponse(res, 200, 'Person updated');
  } catch (err) {
    console.error('updatePickupPerson error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

// DELETE /api/pickup-people/:id
// Remove from the list. RETURNING id tells us if anything was actually deleted.
const removePickupPerson = async (req, res) => {
  const userId = Number(req.user.id);
  const { id } = req.params;

  try {
    const fam = await myFamily(userId);
    if (!fam) return errorResponse(res, 403, 'No family found');

    const result = await pool.query(
      'DELETE FROM pickup_people WHERE id = $1 AND family_id = $2 RETURNING id',
      [id, fam.id]
    );

    if (result.rows.length === 0) return errorResponse(res, 404, 'Person not found');

    return successResponse(res, 200, 'Person removed');
  } catch (err) {
    console.error('removePickupPerson error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = { listPickupPeople, addPickupPerson, updatePickupPerson, removePickupPerson };
