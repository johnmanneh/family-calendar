const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { inviteNewGroupMember } = require('../../utils/inviteToEvent');

const respondToInvitation = async (req, res) => {
  const userId = req.user.id;
  const { id: invitationId } = req.params;
  const { response } = req.body; // 'accepted' | 'denied'

  if (!['accepted', 'denied'].includes(response)) {
    return errorResponse(res, 400, 'response must be accepted or denied');
  }

  try {
    const invitation = await pool.query(
      `SELECT * FROM group_invitations WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [invitationId, userId]
    );

    if (invitation.rows.length === 0) {
      return errorResponse(res, 404, 'Invitation not found');
    }

    const { group_id } = invitation.rows[0];

    await pool.query(
      `UPDATE group_invitations SET status = $1 WHERE id = $2`,
      [response, invitationId]
    );

    if (response === 'accepted') {
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
        [group_id, userId]
      );
      inviteNewGroupMember(group_id, userId);
    }

    return successResponse(res, 200, `Invitation ${response}`);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = respondToInvitation;
