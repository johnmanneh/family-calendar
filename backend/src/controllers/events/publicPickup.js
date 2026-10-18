const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const insertNotification = require('../../utils/insertNotification');
const sendPush = require('../../utils/sendPush');

// Same transition rules as respondToPickup.js — token is the auth here.
const TRANSITIONS = {
  asked: { accept: 'going',       decline:    'declined'  },
  going: { picked_up: 'picked_up', cancel:    'cancelled' },
};

// GET /api/public/pickups/:token
// No auth — the token is the proof of identity.
// Returns minimal event info + current status + available actions.
// Private data (notes, other family members, full address) is never included.
const getPublicPickup = async (req, res) => {
  const { token } = req.params;

  try {
    // One query joins pickup → child → event → parent → pickup_people
    const result = await pool.query(
      `SELECT
         pk.id,
         pk.status,
         pk.revoked_at,
         pk.expires_at,
         ch.first_name                AS child_name,
         e.start_date,
         e.end_date,
         e.is_all_day,
         e.location,
         parent.first_name            AS asked_by,
         pp.name                      AS person_name,
         pp.user_id                   AS person_user_id
       FROM pickups        pk
       JOIN users          ch     ON ch.id     = pk.child_id
       JOIN events         e      ON e.id      = pk.event_id
       JOIN users          parent ON parent.id = pk.created_by
       JOIN pickup_people  pp     ON pp.id     = pk.person_id
       WHERE pk.token = $1`,
      [token]
    );

    if (result.rows.length === 0) return errorResponse(res, 404, 'Link not found');
    const pk = result.rows[0];

    if (pk.revoked_at) return errorResponse(res, 410, 'This pickup has been cancelled');
    if (pk.expires_at && new Date() > new Date(pk.expires_at)) {
      return errorResponse(res, 410, 'This link has expired');
    }

    // Tell the frontend which buttons to show based on current status.
    // status='asked'     → ['accept', 'decline']
    // status='going'     → ['picked_up', 'cancel']
    // status='picked_up' → []  (nothing left to do)
    const availableActions = Object.keys(TRANSITIONS[pk.status] || {});

    return successResponse(res, 200, 'Pickup', {
      pickup: {
        id:               pk.id,
        status:           pk.status,
        child_name:       pk.child_name,
        start_date:       pk.start_date,
        end_date:         pk.end_date,
        is_all_day:       pk.is_all_day,
        location:         pk.location || null,
        asked_by:         pk.asked_by,
        person_name:      pk.person_name,
        available_actions: availableActions,
      },
    });

  } catch (err) {
    console.error('getPublicPickup error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

// POST /api/public/pickups/:token   { action }
// Outside person (no account) responds to a pickup request.
// Token proves identity — no Bearer token needed.
const respondToPublicPickup = async (req, res) => {
  const { token } = req.params;
  const { action } = req.body || {};

  if (!action) return errorResponse(res, 400, 'action is required');

  try {
    const result = await pool.query(
      `SELECT pk.id, pk.status, pk.revoked_at, pk.expires_at
       FROM pickups pk WHERE pk.token = $1`,
      [token]
    );

    if (result.rows.length === 0) return errorResponse(res, 404, 'Link not found');
    const pk = result.rows[0];

    if (pk.revoked_at) return errorResponse(res, 410, 'This pickup has been cancelled');
    if (pk.expires_at && new Date() > new Date(pk.expires_at)) {
      return errorResponse(res, 410, 'This link has expired');
    }

    const newStatus = TRANSITIONS[pk.status]?.[action];
    if (!newStatus) {
      return errorResponse(res, 400, `Cannot '${action}' a pickup with status '${pk.status}'`);
    }

    await pool.query(
      'UPDATE pickups SET status = $1, status_at = NOW() WHERE id = $2',
      [newStatus, pk.id]
    );

    // Fetch person name + child name for the notification message
    const infoRes = await pool.query(
      `SELECT
         COALESCE(pp.name, u.first_name) AS person_name,
         ch.first_name                   AS child_name
       FROM pickups pk
       JOIN pickup_people pp ON pp.id = pk.person_id
       LEFT JOIN users u     ON u.id  = pp.user_id
       JOIN users ch         ON ch.id = pk.child_id
       WHERE pk.id = $1`,
      [pk.id]
    );
    const { person_name, child_name } = infoRes.rows[0] || {};

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

    // Notify all family admins/owners + creator (no logged-in user to exclude)
    if (pushTitle) {
      const managersRes = await pool.query(
        `SELECT DISTINCT u.id, u.push_token
         FROM pickups pkn
         JOIN users u ON (
           u.id = pkn.created_by
           OR EXISTS (
             SELECT 1 FROM family_members fm
             WHERE fm.user_id = u.id
               AND fm.role IN ('admin', 'owner')
               AND fm.family_id = (
                 SELECT family_id FROM family_members
                 WHERE user_id = pkn.child_id LIMIT 1
               )
           )
         )
         WHERE pkn.id = $1`,
        [pk.id]
      );

      for (const parent of managersRes.rows) {
        insertNotification(parent.id, notifType, pushTitle, pushBody, { pickupId: pk.id });
        if (parent.push_token) {
          sendPush(parent.push_token, pushTitle, pushBody, { type: 'pickup', pickupId: pk.id });
        }
      }
    }

    return successResponse(res, 200, 'Pickup updated', { status: newStatus });

  } catch (err) {
    console.error('respondToPublicPickup error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = { getPublicPickup, respondToPublicPickup };
