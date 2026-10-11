const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { creatableCalendars } = require('../../utils/access');

// GET /api/events/targets — calendars you may add events to (you first).
// Presentation only: createEvent re-checks every request.
const getEventTargets = async (req, res) => {
  try {
    const targets = await creatableCalendars(req.user.id);
    return successResponse(res, 200, 'Targets', { targets });
  } catch (error) {
    console.error('getEventTargets error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getEventTargets;
