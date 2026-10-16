const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// GET /api/public/events/:token
// No auth required. Returns minimal event data for a valid, active share token.

module.exports = async (req, res) => {
  const { token } = req.params;
  // Tokens are 64 hex characters — reject anything else without a DB lookup
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return errorResponse(res, 404, 'This link is not valid');
  }

  try {
    // 1. Look up the share record — must exist, not revoked, not expired
    const shareResult = await pool.query(
      `SELECT
         s.id,
         s.event_id,
         s.show_notes,
         s.show_location,
         s.allow_rsvp,
         s.expires_at,
         s.revoked_at
       FROM event_shares s
       WHERE s.token = $1`,
      [token]
    );

    if (shareResult.rows.length === 0) {
      return errorResponse(res, 404, 'This link is not valid');
    }

    const share = shareResult.rows[0];

    // 2. Check if revoked
    if (share.revoked_at) {
      return errorResponse(res, 410, 'This link has been revoked');
    }

    // 3. Check if expired
    if (share.expires_at && new Date() > new Date(share.expires_at)) {
      return errorResponse(res, 410, 'This link has expired');
    }

    // 4. Load the event — only the fields we need, no IDs or private data
    const eventResult = await pool.query(
      `SELECT
         e.title,
         e.start_date,
         e.end_date,
         e.is_all_day,
         e.location,
         e.notes,
         e.category,
         e.url,
         e.is_private,
         u.first_name || ' ' || u.last_name AS organiser
       FROM events e
       JOIN users u ON u.id = e.created_by
       WHERE e.id = $1`,
      [share.event_id]
    );

    // An event made private after it was shared must not show any more
    if (eventResult.rows.length === 0 || eventResult.rows[0].is_private) {
      return errorResponse(res, 404, 'This event is no longer available');
    }

    const event = eventResult.rows[0];

    // 5. Build the response — respect show_notes and show_location settings
    const publicEvent = {
      title:      event.title,
      start_date: event.start_date,
      end_date:   event.end_date,
      is_all_day: event.is_all_day,
      organiser:  event.organiser,
      category:   event.category,
      location:   share.show_location ? event.location : null,
      notes:      share.show_notes    ? event.notes    : null,
      url:        event.url,
      allow_rsvp: share.allow_rsvp,
    };

    return successResponse(res, 200, 'Event found', { event: publicEvent });

  } catch (err) {
    console.error('getPublicEvent error:', err);
    return errorResponse(res, 500, 'Failed to load event');
  }
};
