const pool = require('../../config/db');
const { revokeUser } = require('../../utils/sseClients');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Managed children: do NOT delete them ─────────────────────────────────
    // Children (is_managed=true, managed_by=userId) belong to the family, not
    // to the deleting account.  Clear the link so they become unmanaged.
    await client.query(
      'UPDATE users SET managed_by = NULL WHERE managed_by = $1',
      [userId]
    );

    // ── Remove the user from relational tables ────────────────────────────────
    await client.query('DELETE FROM event_attendees  WHERE user_id = $1', [userId]);
    await client.query(
      'DELETE FROM group_invitations WHERE user_id = $1 OR invited_by = $1',
      [userId]
    );
    await client.query('DELETE FROM group_members    WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM family_members   WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM notifications    WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM messages         WHERE user_id = $1', [userId]);

    // ── Orphan events / tasks they created ────────────────────────────────────
    // Keep family content on the calendar; just clear the creator reference.
    await client.query('UPDATE events   SET created_by = NULL WHERE created_by = $1', [userId]);
    await client.query('UPDATE events   SET updated_by = NULL WHERE updated_by = $1', [userId]);
    await client.query('UPDATE families SET created_by = NULL WHERE created_by = $1', [userId]);
    await client.query('UPDATE groups   SET created_by = NULL WHERE created_by = $1', [userId]);
    await client.query('UPDATE tasks    SET created_by = NULL WHERE created_by = $1', [userId]);
    await client.query('UPDATE tasks    SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
    await client.query(
      'UPDATE tasks SET last_counter_by = NULL WHERE last_counter_by = $1',
      [userId]
    );

    // ── Delete the user account ───────────────────────────────────────────────
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    // Revoke SSE after the transaction succeeds (outside the transaction —
    // this is an in-process side effect, not a DB write)
    revokeUser(userId);

    return successResponse(res, 200, 'Account deleted');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('deleteAccount error:', error.message);
    return errorResponse(res, 500, 'Server error');
  } finally {
    client.release();
  }
};

module.exports = deleteAccount;
