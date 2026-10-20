const { canEditEvent } = require('../../utils/access');
const pool = require("../../config/db");
const {
  successResponse,
  errorResponse
} = require("../../utils/response/responseHandlers");
const { broadcast } = require('../../utils/sseClients');

const updateEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const {
    title,
    description,
    start_date,
    end_date,
    location,
    is_all_day,
    is_private,
    hide_cross_family_availability,
    recurrence,
    recurrence_end_date,
    reminder,
    second_reminder,
    color,
    category,
    priority,
    url,
    notes,
    travel_time,
    video_call_link,
    status,
    updated_at: clientVersion,
  } = req.body;

  if (hide_cross_family_availability !== undefined && typeof hide_cross_family_availability !== 'boolean') {
    return errorResponse(res, 400, 'hide_cross_family_availability must be a boolean');
  }

  try {
    // Check event exists and belongs to user
    // ❌ too strict — only creator can update
    //'SELECT * FROM events WHERE id = $1 AND created_by = $2'
    const event = await pool.query("SELECT * FROM events WHERE id = $1", [id]);

    if (event.rows.length === 0) {
      return errorResponse(
        res,
        404,
        "Event not found or you are not authorized to update it"
      );
    }

    // F-01: knowing an event's id is not permission — owner, creator on own calendar,
    // child manager or a delegate with edit permission (utils/access.js).
    // Same 404 as "not found" so ids can't be probed.
    if (!(await canEditEvent(userId, event.rows[0]))) {
      return errorResponse(res, 404, "Event not found or you are not authorized to update it");
    }

    // F-16: optimistic concurrency — if the client sends the version it last saw,
    // reject the update if someone else saved in the meantime.
    if (clientVersion) {
      const dbVersion = event.rows[0].updated_at;
      const clientMs  = new Date(clientVersion).getTime();
      const dbMs      = dbVersion ? new Date(dbVersion).getTime() : null;
      if (dbMs !== null && clientMs !== dbMs) {
        return errorResponse(res, 409, 'This event was updated by someone else. Please reload and try again.');
      }
    }

    const updatedEvent = await pool.query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        location = COALESCE($5, location),
        is_all_day = COALESCE($6, is_all_day),
        is_private = COALESCE($7, is_private),
        recurrence = COALESCE($8, recurrence),
        recurrence_end_date = COALESCE($9, recurrence_end_date),
        reminder = COALESCE($10, reminder),
        second_reminder = COALESCE($11, second_reminder),
        color = COALESCE($12, color),
        category = COALESCE($13, category),
        priority = COALESCE($14, priority),
        url = COALESCE($15, url),
        notes = COALESCE($16, notes),
        travel_time = COALESCE($17, travel_time),
        video_call_link = COALESCE($18, video_call_link),
        status = COALESCE($19, status),
        updated_by = $20,
        updated_at = NOW(),
        hide_cross_family_availability = COALESCE($22, hide_cross_family_availability)
      WHERE id = $21
      RETURNING *`,
      [
        title, description, start_date, end_date, location, is_all_day,
        is_private ?? null,
        recurrence, recurrence_end_date, reminder, second_reminder, color,
        category, priority, url, notes, travel_time, video_call_link, status,
        userId, id, hide_cross_family_availability ?? null
      ]
    );

    broadcast(event.rows[0].family_id, 'event_update', { eventId: id });

    return successResponse(res, 200, "Event updated successfully", {
      event: updatedEvent.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, "Server error");
  }
};

module.exports = updateEvent;
