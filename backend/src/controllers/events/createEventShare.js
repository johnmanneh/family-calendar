const crypto = require('crypto');
const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// POST /api/events/:id/share
// Creates a share link for a single event.
// Only the event creator can share it. Private events cannot be shared.

module.exports = async (req, res) => {
  const eventId = Number(req.params.id);
  const userId  = Number(req.user.id);

  const {
    show_notes    = true,
    show_location = true,
    allow_rsvp    = false,
    expires_days  = 7   // default: link expires 7 days after the event
  } = req.body || {};

  try {
    // 1. Load the event — confirm it exists and belongs to this user
    const eventResult = await pool.query(
      'SELECT id, created_by, is_private FROM events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return errorResponse(res, 404, 'Event not found');
    }

    const event = eventResult.rows[0];

    // 2. Only the creator can share
    if (Number(event.created_by) !== userId) {
      return errorResponse(res, 403, 'Only the event creator can share this event');
    }

    // 3. Private events cannot be shared by link
    if (event.is_private) {
      return errorResponse(res, 400, 'Private events cannot be shared');
    }

    // 4. Generate a secure random token (64 hex chars = 32 bytes)
    const token = crypto.randomBytes(32).toString('hex');

    // 5. Calculate expiry: expires_days after NOW (not after the event date)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expires_days));

    // 6. Insert the share record
    const insertResult = await pool.query(
      `INSERT INTO event_shares
         (event_id, token, created_by, expires_at, show_notes, show_location, allow_rsvp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, token, expires_at, show_notes, show_location, allow_rsvp`,
      [eventId, token, userId, expiresAt, show_notes, show_location, allow_rsvp]
    );

    const share = insertResult.rows[0];

    // 7. Build the public URL
    const shareUrl = `https://its4us.app/e/${share.token}`;

    return successResponse(res, 201, 'Share link created', {
      share: {
        id:            share.id,
        token:         share.token,
        url:           shareUrl,
        expires_at:    share.expires_at,
        show_notes:    share.show_notes,
        show_location: share.show_location,
        allow_rsvp:    share.allow_rsvp,
      }
    });

  } catch (err) {
    console.error('createEventShare error:', err);
    return errorResponse(res, 500, 'Failed to create share link');
  }
};
