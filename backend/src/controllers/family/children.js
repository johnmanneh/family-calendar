const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { managesChild } = require('../../utils/access');
const { broadcast } = require('../../utils/sseClients');
const { receiveAvatar, storeAvatar, deleteAvatar } = require('../../utils/avatarStore');
const { recolorEvents, currentColors } = require('../../utils/recolorEvents');

/**
 * Child profiles — family members without a login (managed by parents).
 * They can own events and tasks; they can never sign in.
 *
 *   POST   /api/family/children        { first_name, last_name?, color? }
 *   PUT    /api/family/children/:id    { first_name?, last_name?, color? }
 *   DELETE /api/family/children/:id    → removes the profile and the events it owns
 *   POST   /api/family/children/:id/avatar  (multipart field `avatar`) → photo
 */

const COLOR = /^#[0-9a-fA-F]{6}$/;

async function myFamily(userId) {
  const r = await pool.query(
    `SELECT f.id, f.is_personal, fm.role, u.is_managed
     FROM family_members fm JOIN families f ON f.id = fm.family_id JOIN users u ON u.id = fm.user_id
     WHERE fm.user_id = $1
     ORDER BY (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) DESC LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

const createChild = async (req, res) => {
  const userId = req.user.id;
  const first = (req.body.first_name || '').trim();
  const last = (req.body.last_name || '').trim() || null;
  const color = COLOR.test(req.body.color || '') ? req.body.color : '#f48c06';
  if (!first) return errorResponse(res, 400, 'First name is required');
  if (first.length > 100 || (last && last.length > 100)) return errorResponse(res, 400, 'Name is too long');

  const client = await pool.connect();
  try {
    const fam = await myFamily(userId);
    if (!fam || fam.is_managed) return errorResponse(res, 403, 'Not allowed');
    if (fam.is_personal) return errorResponse(res, 400, 'Create a family first, then add your children');

    await client.query('BEGIN');
    const u = await client.query(
      `INSERT INTO users (first_name, last_name, is_managed, managed_by, color)
       VALUES ($1, $2, true, $3, $4) RETURNING id, first_name, last_name, is_managed, managed_by`,
      [first, last, userId, color]
    );
    await client.query(
      `INSERT INTO family_members (family_id, user_id, role, color, circle_type)
       VALUES ($1, $2, 'member', $3, 'inner')`,
      [fam.id, u.rows[0].id, color]
    );
    await client.query('COMMIT');
    broadcast(fam.id, 'event_update', {});
    return successResponse(res, 201, 'Child added', { child: { ...u.rows[0], color } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('createChild error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

const updateChild = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    if (!(await managesChild(userId, id))) return errorResponse(res, 404, 'Child not found');
    const first = req.body.first_name !== undefined ? String(req.body.first_name).trim() : undefined;
    const last = req.body.last_name !== undefined ? (String(req.body.last_name).trim() || null) : undefined;
    if (first === '') return errorResponse(res, 400, 'First name is required');
    if (req.body.color !== undefined && !COLOR.test(req.body.color)) return errorResponse(res, 400, 'Invalid colour');

    await pool.query(
      `UPDATE users SET first_name = COALESCE($1, first_name),
                        last_name  = CASE WHEN $2::boolean THEN $3 ELSE last_name END
       WHERE id = $4 AND is_managed`,
      [first ?? null, last !== undefined, last ?? null, id]
    );
    if (req.body.color) {
      const before = await currentColors(id);
      await pool.query('UPDATE family_members SET color = $1 WHERE user_id = $2', [req.body.color, id]);
      await pool.query('UPDATE users SET color = $1 WHERE id = $2 AND is_managed', [req.body.color, id]);
      await recolorEvents(id, before, req.body.color);   // the child's events follow the new colour
    }
    return successResponse(res, 200, 'Child updated');
  } catch (error) {
    console.error('updateChild error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

const removeChild = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const client = await pool.connect();
  try {
    if (!(await managesChild(userId, id))) return errorResponse(res, 404, 'Child not found');
    const fam = await myFamily(userId);

    await client.query('BEGIN');
    // Product rule: removing a child profile deletes the events it owns
    const owned = await client.query('SELECT id FROM events WHERE owner_id = $1', [id]);
    const ids = owned.rows.map(r => r.id);
    if (ids.length) {
      await client.query('DELETE FROM tasks WHERE event_id = ANY($1::int[])', [ids]);
      await client.query('DELETE FROM events WHERE id = ANY($1::int[])', [ids]);
    }
    await client.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [id]);
    await client.query('DELETE FROM event_attendees WHERE user_id = $1', [id]);
    await client.query('DELETE FROM family_members WHERE user_id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1 AND is_managed', [id]);
    await client.query('COMMIT');
    if (fam) broadcast(fam.id, 'event_update', {});
    deleteAvatar(id);
    return successResponse(res, 200, 'Child removed', { deleted_events: ids.length });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('removeChild error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

// Photo for a child profile — only its managers (creator / family admins)
const uploadChildAvatar = [
  async (req, res, next) => {
    // Check permission before reading the file
    try {
      if (!/^\d+$/.test(req.params.id) || !(await managesChild(req.user.id, req.params.id))) {
        return errorResponse(res, 404, 'Child not found');
      }
      next();
    } catch (error) {
      console.error('uploadChildAvatar check error:', error.message);
      return errorResponse(res, 500, 'Server error');
    }
  },
  receiveAvatar,
  async (req, res) => {
    if (!req.file) return errorResponse(res, 400, 'No file uploaded');
    const { id } = req.params;
    try {
      const avatarUrl = await storeAvatar(id, req.file.buffer);
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2 AND is_managed', [avatarUrl, id]);
      const fam = await myFamily(req.user.id);
      if (fam) broadcast(fam.id, 'event_update', {});
      return successResponse(res, 200, 'Photo updated', { avatar_url: avatarUrl });
    } catch (error) {
      console.error('uploadChildAvatar error:', error.message);
      return errorResponse(res, 500, 'Failed to save photo');
    }
  },
];

module.exports = { createChild, updateChild, removeChild, uploadChildAvatar };
