const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const notifyUser = require('../../utils/notifyUser');

/**
 * "Who can add to my calendar" — delegated calendar permissions.
 *
 *   GET /api/family/permissions
 *       → { granted: [...people I let act on my calendar],
 *           received: [...people whose calendar I may act on] }
 *   PUT /api/family/permissions { delegate_user_id, can_create, can_edit, can_delete }
 *       → grant/update; all false = revoke. Only for your OWN calendar.
 *
 * These are management rights only — they never let anyone see more of your
 * events than your privacy circle already allows.
 */

const getPermissions = async (req, res) => {
  const userId = req.user.id;
  try {
    const q = (sql) => pool.query(sql, [userId]);
    const granted = await q(
      `SELECT cp.delegate_user_id AS user_id, u.first_name, u.last_name,
              cp.can_create, cp.can_edit, cp.can_delete
       FROM calendar_permissions cp JOIN users u ON u.id = cp.delegate_user_id
       WHERE cp.owner_user_id = $1 ORDER BY u.first_name`
    );
    const received = await q(
      `SELECT cp.owner_user_id AS user_id, u.first_name, u.last_name,
              cp.can_create, cp.can_edit, cp.can_delete
       FROM calendar_permissions cp JOIN users u ON u.id = cp.owner_user_id
       WHERE cp.delegate_user_id = $1 ORDER BY u.first_name`
    );
    return successResponse(res, 200, 'Permissions', { granted: granted.rows, received: received.rows });
  } catch (error) {
    console.error('getPermissions error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

const setPermission = async (req, res) => {
  const ownerId = req.user.id;                      // always your own calendar
  const delegateId = Number(req.body.delegate_user_id);
  const caps = {
    can_create: req.body.can_create === true,
    can_edit: req.body.can_edit === true,
    can_delete: req.body.can_delete === true,
  };
  if (!delegateId || delegateId === Number(ownerId)) return errorResponse(res, 400, 'Choose someone else');

  try {
    // Both must be people with a login in the same family
    const fam = await pool.query(
      `SELECT a.family_id, o.first_name AS owner_name
       FROM family_members a
       JOIN family_members b ON b.family_id = a.family_id AND b.user_id = $2
       JOIN users o ON o.id = a.user_id
       JOIN users d ON d.id = b.user_id
       WHERE a.user_id = $1 AND NOT o.is_managed AND NOT d.is_managed
       LIMIT 1`,
      [ownerId, delegateId]
    );
    if (!fam.rows.length) return errorResponse(res, 404, 'Person not found in your family');
    const { family_id, owner_name } = fam.rows[0];

    if (!caps.can_create && !caps.can_edit && !caps.can_delete) {
      await pool.query(
        'DELETE FROM calendar_permissions WHERE owner_user_id = $1 AND delegate_user_id = $2',
        [ownerId, delegateId]
      );
      return successResponse(res, 200, 'Access removed', { permission: null });
    }

    const prev = await pool.query(
      'SELECT 1 FROM calendar_permissions WHERE owner_user_id = $1 AND delegate_user_id = $2',
      [ownerId, delegateId]
    );
    const r = await pool.query(
      `INSERT INTO calendar_permissions (family_id, owner_user_id, delegate_user_id, can_create, can_edit, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (family_id, owner_user_id, delegate_user_id)
       DO UPDATE SET can_create = EXCLUDED.can_create, can_edit = EXCLUDED.can_edit,
                     can_delete = EXCLUDED.can_delete, updated_at = NOW()
       RETURNING delegate_user_id AS user_id, can_create, can_edit, can_delete`,
      [family_id, ownerId, delegateId, caps.can_create, caps.can_edit, caps.can_delete]
    );
    if (!prev.rows.length) {
      notifyUser(delegateId, 'calendar_access', 'Calendar access', `${owner_name} lets you add events to their calendar`, {});
    }
    return successResponse(res, 200, 'Access saved', { permission: r.rows[0] });
  } catch (error) {
    console.error('setPermission error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = { getPermissions, setPermission };
