const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getEvents = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user's family and circle_type
    const familyMember = await pool.query(
      'SELECT family_id, circle_type FROM family_members WHERE user_id = $1',
      [userId]
    );

    if (familyMember.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    const familyId = familyMember.rows[0].family_id;
    const circleType = familyMember.rows[0].circle_type || 'inner';

    // Base attendee aggregation — only accepted attendees count
    const attendeeAgg = `
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', att_u.id,
            'first_name', att_u.first_name,
            'last_name', att_u.last_name,
            'color', fm2.color
          )
        ) FILTER (WHERE att_u.id IS NOT NULL AND ea_all.status = 'accepted'),
        '[]'::json
      ) as attendees
    `;

    let events;

    if (circleType === 'inner') {
      // Inner circle: sees ALL family events EXCEPT ones they've been specifically
      // invited to but not yet accepted — those stay in pending until accepted
      events = await pool.query(
        `SELECT e.*,
          u.first_name as created_by_name,
          uu.first_name as updated_by_name,
          ${attendeeAgg}
         FROM events e
         JOIN users u ON e.created_by = u.id
         LEFT JOIN users uu ON e.updated_by = uu.id
         LEFT JOIN event_attendees ea_all ON e.id = ea_all.event_id
         LEFT JOIN users att_u ON ea_all.user_id = att_u.id
         LEFT JOIN family_members fm2 ON att_u.id = fm2.user_id AND fm2.family_id = $1
         WHERE e.family_id = $1
         AND e.created_by != $2
         AND NOT EXISTS (
           SELECT 1 FROM event_attendees ea_pending
           WHERE ea_pending.event_id = e.id
             AND ea_pending.user_id = $2
             AND ea_pending.status = 'pending'
         )
         GROUP BY e.id, u.first_name, uu.first_name
         UNION ALL
         SELECT e.*,
          u.first_name as created_by_name,
          uu.first_name as updated_by_name,
          ${attendeeAgg}
         FROM events e
         JOIN users u ON e.created_by = u.id
         LEFT JOIN users uu ON e.updated_by = uu.id
         LEFT JOIN event_attendees ea_all ON e.id = ea_all.event_id
         LEFT JOIN users att_u ON ea_all.user_id = att_u.id
         LEFT JOIN family_members fm2 ON att_u.id = fm2.user_id AND fm2.family_id = $1
         WHERE e.family_id = $1
         AND e.created_by = $2
         GROUP BY e.id, u.first_name, uu.first_name
         ORDER BY start_date ASC`,
        [familyId, userId]
      );
    } else if (circleType === 'extended') {
      // Extended circle: sees all non-private events except ones pending their acceptance
      events = await pool.query(
        `SELECT e.*,
          u.first_name as created_by_name,
          uu.first_name as updated_by_name,
          ${attendeeAgg}
         FROM events e
         JOIN users u ON e.created_by = u.id
         LEFT JOIN users uu ON e.updated_by = uu.id
         LEFT JOIN event_attendees ea_filter ON e.id = ea_filter.event_id AND ea_filter.user_id = $2 AND ea_filter.status = 'accepted'
         LEFT JOIN event_attendees ea_all ON e.id = ea_all.event_id
         LEFT JOIN users att_u ON ea_all.user_id = att_u.id
         LEFT JOIN family_members fm2 ON att_u.id = fm2.user_id AND fm2.family_id = $1
         WHERE e.family_id = $1
         AND (e.is_private = false OR e.created_by = $2 OR ea_filter.event_id IS NOT NULL)
         AND NOT EXISTS (
           SELECT 1 FROM event_attendees ea_pending
           WHERE ea_pending.event_id = e.id
             AND ea_pending.user_id = $2
             AND ea_pending.status = 'pending'
         )
         GROUP BY e.id, u.first_name, uu.first_name
         ORDER BY e.start_date ASC`,
        [familyId, userId]
      );
    } else {
      // Outer circle: sees only events they created or are an accepted attendee of
      events = await pool.query(
        `SELECT e.*,
          u.first_name as created_by_name,
          uu.first_name as updated_by_name,
          ${attendeeAgg}
         FROM events e
         JOIN users u ON e.created_by = u.id
         LEFT JOIN users uu ON e.updated_by = uu.id
         LEFT JOIN event_attendees ea_filter ON e.id = ea_filter.event_id AND ea_filter.user_id = $2 AND ea_filter.status = 'accepted'
         LEFT JOIN event_attendees ea_all ON e.id = ea_all.event_id
         LEFT JOIN users att_u ON ea_all.user_id = att_u.id
         LEFT JOIN family_members fm2 ON att_u.id = fm2.user_id AND fm2.family_id = $1
         WHERE e.family_id = $1
         AND (e.created_by = $2 OR ea_filter.event_id IS NOT NULL)
         GROUP BY e.id, u.first_name, uu.first_name
         ORDER BY e.start_date ASC`,
        [familyId, userId]
      );
    }

    // Mask private events the user is not part of (inner only — extended/outer never see them)
    const processedEvents = events.rows.map(event => {
      const isCreator = Number(event.created_by) === Number(userId);
      const isAttendee = (event.attendees || []).some(a => Number(a.id) === Number(userId));
      const isMember = isCreator || isAttendee;

      if (event.is_private && !isMember) {
        return {
          id: event.id,
          family_id: event.family_id,
          created_by: event.created_by,
          start_date: event.start_date,
          end_date: event.end_date,
          is_all_day: event.is_all_day,
          recurrence: event.recurrence,
          recurrence_end_date: event.recurrence_end_date,
          title: 'Busy',
          color: '#b0b0b8',
          is_private: true,
          is_busy: true,
          attendees: (event.attendees || []).map(a => ({ id: a.id }))
        };
      }

      return { ...event, is_busy: false };
    });

    return successResponse(res, 200, 'Events retrieved successfully', {
      events: processedEvents,
    });

  } catch (error) {
    console.error('getEvents error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = getEvents;
