const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteGroup = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Accept either: a group_members row with role='admin', OR the group creator.
    // The app labels the creator as "admin"; if that row is missing or has a
    // different role (e.g. after a partial previous delete cleared group_members
    // via CASCADE), created_by is the authoritative fallback.
    const authCheck = await client.query(
      `SELECT 1
         FROM groups g
        WHERE g.id = $1
          AND (
            g.created_by = $2
            OR EXISTS (
              SELECT 1 FROM group_members
               WHERE group_id = $1 AND user_id = $2 AND role = 'admin'
            )
          )`,
      [id, userId]
    );

    if (authCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 403, 'Only the group admin can delete this group');
    }

    await client.query('DELETE FROM group_invitations WHERE group_id = $1', [id]);
    await client.query('DELETE FROM event_groups WHERE group_id = $1', [id]);
    await client.query('DELETE FROM group_members WHERE group_id = $1', [id]);
    await client.query('DELETE FROM groups WHERE id = $1', [id]);

    await client.query('COMMIT');
    return successResponse(res, 200, 'Group deleted');
  } catch (error) {
    await client.query('ROLLBACK');
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

module.exports = deleteGroup;
