const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    // Remove from all relational tables first
    await pool.query('DELETE FROM event_attendees WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM group_invitations WHERE user_id = $1 OR invited_by = $1', [userId]);
    await pool.query('DELETE FROM group_members WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM family_members WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM messages WHERE user_id = $1', [userId]);

    // Orphan events/tasks they created — keep them on the family calendar, just clear the creator
    await pool.query('UPDATE events SET created_by = NULL WHERE created_by = $1', [userId]);
    await pool.query('UPDATE events SET updated_by = NULL WHERE updated_by = $1', [userId]);
    await pool.query('UPDATE families SET created_by = NULL WHERE created_by = $1', [userId]);
    await pool.query('UPDATE groups SET created_by = NULL WHERE created_by = $1', [userId]);
    await pool.query('UPDATE tasks SET created_by = NULL WHERE created_by = $1', [userId]);
    await pool.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
    await pool.query('UPDATE tasks SET last_counter_by = NULL WHERE last_counter_by = $1', [userId]);

    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return successResponse(res, 200, 'Account deleted');
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteAccount;
