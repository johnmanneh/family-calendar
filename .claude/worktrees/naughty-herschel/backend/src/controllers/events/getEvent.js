const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // Get user's family
    const familyMember = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [userId]
    );

    if (familyMember.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    const familyId = familyMember.rows[0].family_id;

    // Get the event
    const event = await pool.query(
      `SELECT e.*, u.first_name, u.last_name 
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.id = $1 AND e.family_id = $2`,
      [id, familyId]
    );

    if (event.rows.length === 0) {
      return errorResponse(res, 404, 'Event not found');
    }

    return successResponse(res, 200, 'Event retrieved successfully', {
      event: event.rows[0],
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getEvent;