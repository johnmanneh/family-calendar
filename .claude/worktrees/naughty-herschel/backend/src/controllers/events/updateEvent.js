const pool = require("../../config/db");
const {
  successResponse,
  errorResponse
} = require("../../utils/response/responseHandlers");

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
    status
  } = req.body;

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

    const updatedEvent = await pool.query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        location = COALESCE($5, location),
        is_all_day = COALESCE($6, is_all_day),
        recurrence = COALESCE($7, recurrence),
        recurrence_end_date = COALESCE($8, recurrence_end_date),
        reminder = COALESCE($9, reminder),
        second_reminder = COALESCE($10, second_reminder),
        color = COALESCE($11, color),
        category = COALESCE($12, category),
        priority = COALESCE($13, priority),
        url = COALESCE($14, url),
        notes = COALESCE($15, notes),
        travel_time = COALESCE($16, travel_time),
        video_call_link = COALESCE($17, video_call_link),
        status = COALESCE($18, status),
        updated_by = $19,
        updated_at = NOW()
      WHERE id = $20
      RETURNING *`,
      [
        title, description, start_date, end_date, location, is_all_day,
        recurrence, recurrence_end_date, reminder, second_reminder, color,
        category, priority, url, notes, travel_time, video_call_link, status,
        userId, id
      ]
    );

    return successResponse(res, 200, "Event updated successfully", {
      event: updatedEvent.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, "Server error");
  }
};

module.exports = updateEvent;
