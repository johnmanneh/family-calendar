const pool = require('../../config/db');
const sharedFamilies = require('../../utils/sharedFamilies');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// Upcoming events of one family member, as the VIEWER is allowed to see them:
//  - only if viewer and member share a family
//  - events the member created OR has accepted
//  - nothing in the past
//  - private events the viewer isn't part of show as "Busy" (same rule as home)
const getMemberEvents = async (req, res) => {
  const memberId = Number(req.params.userId);
  const viewerId = Number(req.user.id);

  try {
    const families = await sharedFamilies(viewerId, memberId);
    if (families.length === 0) {
      return errorResponse(res, 403, 'Not in the same family');
    }

    const result = await pool.query(
      `SELECT e.id, e.title, e.start_date, e.end_date, e.is_all_day,
              e.color, e.category, e.location, e.priority, e.status,
              e.is_private, e.created_by,
              EXISTS (SELECT 1 FROM event_attendees v
                      WHERE v.event_id = e.id AND v.user_id = $2 AND v.status = 'accepted') AS viewer_attends
       FROM events e
       WHERE e.family_id = ANY($3::int[])
         AND (
           e.created_by = $1
           OR EXISTS (SELECT 1 FROM event_attendees a
                      WHERE a.event_id = e.id AND a.user_id = $1 AND a.status = 'accepted')
         )
         AND COALESCE(e.end_date, e.start_date) >= CURRENT_DATE
       ORDER BY e.start_date ASC
       LIMIT 20`,
      [memberId, viewerId, families]
    );

    const events = result.rows.map(e => {
      const canSee = !e.is_private || Number(e.created_by) === viewerId || e.viewer_attends;
      const { viewer_attends, ...ev } = e;
      if (canSee) return { ...ev, is_busy: false };
      return {
        id: ev.id, start_date: ev.start_date, end_date: ev.end_date, is_all_day: ev.is_all_day,
        title: 'Busy', color: '#b0b0b8', is_private: true, is_busy: true,
      };
    });

    return successResponse(res, 200, 'Member events fetched', { events });
  } catch (error) {
    console.error('getMemberEvents error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getMemberEvents;
