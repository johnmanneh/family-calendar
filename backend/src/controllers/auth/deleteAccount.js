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

    // Orphan events they created — keep them on the family calendar, just clear the creator
    await pool.query('UPDATE events SET created_by = NULL WHERE created_by = $1', [userId]);

    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return successResponse(res, 200, 'Account deleted');
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteAccount;
