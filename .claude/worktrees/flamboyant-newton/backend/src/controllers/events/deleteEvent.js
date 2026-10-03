const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // Check event exists and belongs to user
    const event = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (event.rows.length === 0) {
      return errorResponse(res, 404, 'Event not found or you are not authorized to delete it');
    }

    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    return successResponse(res, 200, 'Event deleted successfully', {});

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteEvent;