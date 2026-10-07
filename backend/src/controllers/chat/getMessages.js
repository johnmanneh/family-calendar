const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// GET /api/chat — last 50 messages for the user's family, oldest-first for display
const getMessages = async (req, res) => {
  const userId = req.user.id;

  try {
    // Resolve the user's family_id
    const familyRes = await pool.query(
      `SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!familyRes.rows.length) {
      return successResponse(res, 200, 'Messages fetched', { messages: [] });
    }
    const familyId = familyRes.rows[0].family_id;

    const result = await pool.query(
      `SELECT
         m.id,
         m.body,
         m.created_at,
         u.id          AS user_id,
         u.first_name,
         u.last_name,
         u.avatar_url,
         fm.color
       FROM messages m
       JOIN users         u  ON u.id  = m.user_id
       LEFT JOIN family_members fm ON fm.user_id = m.user_id AND fm.family_id = m.family_id
       WHERE m.family_id = $1
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [familyId]
    );

    // Reverse so the oldest is first — easier to render top-to-bottom
    const messages = result.rows.reverse();
    return successResponse(res, 200, 'Messages fetched', { messages });
  } catch (err) {
    console.error('getMessages error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getMessages;
