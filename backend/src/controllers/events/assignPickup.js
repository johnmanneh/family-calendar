const crypto = require('crypto');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { managesChild } = require('../../utils/access');

// POST /api/events/:id/pickup   { child_id, person_id }
// Assigns a pickup person to an event for a child.
// Only the child's manager (parent or family admin) can do this.
// Any existing active pickup for this event is revoked first.
const assignPickup = async (req, res) => {
  const userId  = Number(req.user.id);
  const eventId = Number(req.params.id);
  const { child_id, person_id } = req.body || {};

  if (!child_id || !person_id) {
    return errorResponse(res, 400, 'child_id and person_id are required');
  }

  try {
    // 1. Caller must manage this child
    if (!(await managesChild(userId, child_id))) {
      return errorResponse(res, 403, 'You do not manage this child');
    }

    // 2. Event must exist
    const eventResult = await pool.query(
      'SELECT id, family_id, owner_id, start_date, end_date FROM events WHERE id = $1',
      [eventId]
    );
    if (eventResult.rows.length === 0) {
      return errorResponse(res, 404, 'Event not found');
    }
    const event = eventResult.rows[0];

    // 2b. The child must belong to this event (owner or participant) —
    //     pickup is only for children's events
    const childInEvent = Number(event.owner_id) === Number(child_id) || (await pool.query(
      'SELECT 1 FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [eventId, child_id]
    )).rows.length > 0;
    if (!childInEvent) {
      return errorResponse(res, 400, 'This child is not part of this event');
    }

    // 3. Pickup person must belong to this family
    const personResult = await pool.query(
      'SELECT id FROM pickup_people WHERE id = $1 AND family_id = $2',
      [person_id, event.family_id]
    );
    if (personResult.rows.length === 0) {
      return errorResponse(res, 404, 'Pickup person not found');
    }

    // 4. Revoke any existing active pickup — one active pickup per event
    // Soft delete: keep the history row, just mark it revoked
    await pool.query(
      `UPDATE pickups SET revoked_at = NOW()
       WHERE event_id = $1
         AND revoked_at IS NULL
         AND status NOT IN ('cancelled', 'declined')`,
      [eventId]
    );

    // 5. Token — 64 hex chars (32 random bytes), same pattern as event sharing
    const token = crypto.randomBytes(32).toString('hex');

    // 6. Link works until the end of the pickup day (the event's day), so it
    //    can't be reused afterwards. Never earlier than the end of today.
    //    (Was "end of today": a pickup planned a week ahead expired the same night.)
    const expiresAt = new Date(event.end_date || event.start_date);
    expiresAt.setHours(23, 59, 59, 999);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    if (!(expiresAt > endOfToday)) expiresAt.setTime(endOfToday.getTime());

    // 7. Insert the new pickup record
    const insertResult = await pool.query(
      `INSERT INTO pickups
         (event_id, child_id, person_id, token, status, expires_at, created_by)
       VALUES ($1, $2, $3, $4, 'asked', $5, $6)
       RETURNING id, token, status, expires_at`,
      [eventId, child_id, person_id, token, expiresAt, userId]
    );

    const pickup = insertResult.rows[0];

    return successResponse(res, 201, 'Pickup assigned', {
      pickup: {
        ...pickup,
        url: `https://its4us.app/p/${pickup.token}`,
      },
    });

  } catch (err) {
    console.error('assignPickup error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

// DELETE /api/events/:id/pickup
// Cancels the active pickup for this event.
// Only the child's manager can cancel.
const cancelPickup = async (req, res) => {
  const userId  = Number(req.user.id);
  const eventId = Number(req.params.id);

  try {
    // Find the active pickup for this event
    const existing = await pool.query(
      `SELECT id, child_id FROM pickups
       WHERE event_id = $1
         AND revoked_at IS NULL
         AND status NOT IN ('cancelled', 'declined')`,
      [eventId]
    );

    if (existing.rows.length === 0) {
      return errorResponse(res, 404, 'No active pickup found');
    }

    const pickup = existing.rows[0];

    // Only the child's manager can cancel
    if (!(await managesChild(userId, pickup.child_id))) {
      return errorResponse(res, 403, 'Not allowed');
    }

    await pool.query(
      `UPDATE pickups
       SET status = 'cancelled', status_at = NOW(), revoked_at = NOW()
       WHERE id = $1`,
      [pickup.id]
    );

    return successResponse(res, 200, 'Pickup cancelled');
  } catch (err) {
    console.error('cancelPickup error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = { assignPickup, cancelPickup };
