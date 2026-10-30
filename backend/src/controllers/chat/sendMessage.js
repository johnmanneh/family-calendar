const pool = require('../../config/db');
const sendPush = require('../../utils/sendPush');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { broadcast } = require('../../utils/sseClients');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { withFreshAvatar } = require('../../utils/avatarStore');

// POST /api/chat — insert a message and broadcast to the family via SSE
// Inner circle only (security pass-1). Outer circle users receive 403.
const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const { body } = req.body;

  if (!body || !body.trim()) {
    return errorResponse(res, 400, 'Message body is required');
  }

  try {
    // Resolve family and circle_type together
    const familyRes = await pool.query(
      `SELECT fm.family_id, fm.circle_type
       FROM family_members fm
       WHERE fm.user_id = $1
       ORDER BY ${ACTIVE_FAMILY_ORDER}
       LIMIT 1`,
      [userId]
    );
    if (!familyRes.rows.length) {
      return errorResponse(res, 403, 'Not in a family');
    }

    const { family_id: familyId, circle_type } = familyRes.rows[0];

    // Chat is inner-circle only.
    if (circle_type === 'outer') {
      return errorResponse(res, 403, 'Chat is available to inner circle members only');
    }

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
      avatar_url: withFreshAvatar({ id: userId, avatar_url: sender.avatar_url }).avatar_url,
      color:      sender.color,
      family_id:  familyId,
    };

    broadcast(familyId, 'chat_message', payload);

    // Phone push to everyone else in this family
    const others = await pool.query(
      `SELECT u.push_token, f.name AS family_name
       FROM family_members fm JOIN users u ON u.id = fm.user_id JOIN families f ON f.id = fm.family_id
       WHERE fm.family_id = $1 AND fm.user_id <> $2 AND u.push_token IS NOT NULL`,
      [familyId, userId]
    );
    if (others.rows.length) {
      const text = body.trim();
      sendPush(others.rows.map(r => r.push_token), others.rows[0].family_name || 'Family chat',
        `${sender.first_name || 'Someone'}: ${text.length > 120 ? text.slice(0, 117) + '…' : text}`,
        { type: 'chat', familyId });
    }

    return successResponse(res, 201, 'Message sent', { message: payload });
  } catch (err) {
    console.error('sendMessage error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = sendMessage;
