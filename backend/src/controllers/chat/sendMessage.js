const pool = require('../../config/db');
const { broadcast } = require('../../utils/sseClients');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/chat — insert a message and broadcast to the family via SSE
const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const { body } = req.body;

  if (!body || !body.trim()) {
    return errorResponse(res, 400, 'Message body is required');
  }

  try {
    // Resolve family
    const familyRes = await pool.query(
      `SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!familyRes.rows.length) {
      return errorResponse(res, 403, 'Not in a family');
    }
    const familyId = familyRes.rows[0].family_id;

    // Insert
    const result = await pool.query(
      `INSERT INTO messages (family_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [familyId, userId, body.trim()]
    );
    const msg = result.rows[0];

    // Fetch sender details for the broadcast payload
    const userRes = await pool.query(
      `SELECT u.first_name, u.last_name, u.avatar_url, fm.color
       FROM users u
       LEFT JOIN family_members fm ON fm.user_id = u.id AND fm.family_id = $2
       WHERE u.id = $1`,
      [userId, familyId]
    );
    const sender = userRes.rows[0] || {};

    const payload = {
      id:         msg.id,
      body:       msg.body,
      created_at: msg.created_at,
      user_id:    userId,
      first_name: sender.first_name,
      last_name:  sender.last_name,
      avatar_url: sender.avatar_url,
      color:      sender.color,
    };

    broadcast(familyId, 'chat_message', payload);

    return successResponse(res, 201, 'Message sent', { message: payload });
  } catch (err) {
    console.error('sendMessage error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = sendMessage;
