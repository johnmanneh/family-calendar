const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const insertNotification = require('../../utils/insertNotification');
const sendPush = require('../../utils/sendPush');

// Valid status transitions for in-app pickup person responses.
// TRANSITIONS[currentStatus][action] = newStatus
// If the combination is missing → invalid action for that status → 400.
const TRANSITIONS = {
  asked: { accept: 'going',      decline:    'declined'  },
  going: { picked_up: 'picked_up', cancel:   'cancelled' },
};

// POST /api/pickups/:id/respond   { action }
// The in-app pickup person responds to a pickup request.
// Outside people (no account) use the public endpoint (33.5).
//
// Actions:
//   asked  → accept     (I'll go)
//   asked  → decline    (Can't)
//   going  → picked_up  (Child is with me)
//   going  → cancel     (Can't make it anymore)
const respondToPickup = async (req, res) => {
  const userId   = Number(req.user.id);
  const pickupId = Number(req.params.id);
  const { action } = req.body || {};

  if (!action) return errorResponse(res, 400, 'action is required');

  try {
    // 1. Load pickup + the user_id of the assigned pickup person
    const result = await pool.query(
      `SELECT pk.id, pk.status, pk.child_id, pk.revoked_at, pk.expires_at,
              pp.user_id AS person_user_id
       FROM pickups pk
       JOIN pickup_people pp ON pp.id = pk.person_id
       WHERE pk.id = $1`,
      [pickupId]
    );

    if (result.rows.length === 0) return errorResponse(res, 404, 'Pickup not found');
    const pickup = result.rows[0];

    // 2. Must not be revoked or expired
    if (pickup.revoked_at) {
      return errorResponse(res, 410, 'This pickup has been cancelled');
    }
    if (pickup.expires_at && new Date() > new Date(pickup.expires_at)) {
      return errorResponse(res, 410, 'This pickup link has expired');
    }

    // 3. Only the assigned in-app person can respond here
    if (Number(pickup.person_user_id) !== userId) {
      return errorResponse(res, 403, 'Not allowed');
    }

    // 4. Validate the transition — one line replaces a long if/else chain
    const newStatus = TRANSITIONS[pickup.status]?.[action];
    if (!newStatus) {
      return errorResponse(res, 400, `Cannot '${action}' a pickup with status '${pickup.status}'`);
    }

    // 5. Apply it
    await pool.query(
      'UPDATE pickups SET status = $1, status_at = NOW() WHERE id = $2',
      [newStatus, pickupId]
    );

    // 6. Fetch person name + child name for the notification message
    const infoRes = await pool.query(
      `SELECT
         COALESCE(pp.name, u.first_name) AS person_name,
         ch.first_name                   AS child_name
       FROM pickups pk
       JOIN pickup_people pp ON pp.id = pk.person_id
       LEFT JOIN users u     ON u.id  = pp.user_id
       JOIN users ch         ON ch.id = pk.child_id
       WHERE pk.id = $1`,
      [pickupId]
    );
    const { person_name, child_name } = infoRes.rows[0] || {};

    // 7. Build the message based on the new status
    let pushTitle, pushBody, notifType;
    if (newStatus === 'going') {
      pushTitle = 'Pickup confirmed';
      pushBody  = `${person_name} is going to pick up ${child_name}`;
      notifType = 'pickup_going';
    } else if (newStatus === 'declined' || newStatus === 'cancelled') {
      pushTitle = 'Pickup needed';
      pushBody  = `${person_name} can't pick up ${child_name}`;
      notifType = 'pickup_needed';
    } else if (newStatus === 'picked_up') {
      pushTitle = 'Picked up';
      pushBody  = `${child_name} has been picked up by ${person_name}`;
      notifType = 'pickup_done';
    }

    // 8. Notify all family admins/owners + the creator — everyone except the responder
    if (pushTitle) {
      const managersRes = await pool.query(
        `SELECT DISTINCT u.id, u.push_token
         FROM pickups pk
         JOIN users u ON (
           u.id = pk.created_by
           OR EXISTS (
             SELECT 1 FROM family_members fm
             WHERE fm.user_id = u.id
               AND fm.role IN ('admin', 'owner')
               AND fm.family_id = (
                 SELECT family_id FROM family_members
                 WHERE user_id = pk.child_id LIMIT 1
               )
           )
         )
         WHERE pk.id = $1 AND u.id != $2`,
        [pickupId, userId]
      );

      for (const parent of managersRes.rows) {
        insertNotification(parent.id, notifType, pushTitle, pushBody, { pickupId });
        if (parent.push_token) {
          sendPush(parent.push_token, pushTitle, pushBody, { type: 'pickup', pickupId }, { urgent: notifType === 'pickup_needed' });
        }
      }
    }

    return successResponse(res, 200, 'Pickup updated', { status: newStatus });

  } catch (err) {
    console.error('respondToPickup error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = { respondToPickup };
