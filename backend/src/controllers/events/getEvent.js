const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const familyMember = await pool.query(
      `SELECT fm.family_id FROM family_members fm
       WHERE fm.user_id = $1
       ORDER BY (SELECT COUNT(*) FROM family_members WHERE family_id = fm.family_id) DESC
       LIMIT 1`,
      [userId]
    );

    if (familyMember.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    const familyId = familyMember.rows[0].family_id;

    // ── Event row ──────────────────────────────────────────────────────────
    const eventResult = await pool.query(
      `SELECT e.*,
              u.first_name  AS created_by_name,
              uu.first_name AS updated_by_name
       FROM events e
       JOIN  users u  ON e.created_by  = u.id
       LEFT JOIN users uu ON e.updated_by = uu.id
       WHERE e.id = $1
         AND (
           e.family_id = $2
           -- or shared into a group this user is in (e.g. grandma seeing the grandkids' events)
           OR EXISTS (
             SELECT 1 FROM event_groups eg
             JOIN group_members gm ON gm.group_id = eg.group_id
             WHERE eg.event_id = e.id AND gm.user_id = $3
           )
         )`,
      [id, familyId, userId]
    );

    if (eventResult.rows.length === 0) {
      return errorResponse(res, 404, 'Event not found');
    }

    const event = eventResult.rows[0];
    const fromGroup = Number(event.family_id) !== Number(familyId);

    // Private events stay private, even when shared into a group
    if (fromGroup && event.is_private && Number(event.created_by) !== Number(userId)) {
      const isAttendee = await pool.query(
        `SELECT 1 FROM event_attendees WHERE event_id = $1 AND user_id = $2 AND status = 'accepted'`,
        [id, userId]
      );
      if (isAttendee.rows.length === 0) {
        return errorResponse(res, 404, 'Event not found');
      }
    }

    // ── Groups this event is shared with (only the ones this user is in) ───
    const groupsResult = await pool.query(
      `SELECT eg.group_id
       FROM event_groups eg
       JOIN group_members gm ON gm.group_id = eg.group_id AND gm.user_id = $2
       WHERE eg.event_id = $1`,
      [id, userId]
    );

    // ── Attendees ──────────────────────────────────────────────────────────
    const attendeesResult = await pool.query(
      `SELECT ea.user_id, ea.status,
              u.first_name, u.last_name,
              fm.color
       FROM event_attendees ea
       JOIN users           u  ON ea.user_id = u.id
       LEFT JOIN family_members fm ON u.id = fm.user_id AND fm.family_id = $2
       WHERE ea.event_id = $1
       ORDER BY u.first_name`,
      [id, familyId]
    );

    // ── Tasks with sub-tasks ───────────────────────────────────────────────
    const tasksResult = await pool.query(
      `SELECT
         t.id, t.title, t.status, t.position, t.due_date,
         t.counter_offer, t.last_counter_by, t.created_by,
         t.assigned_to AS user_id,
         u.first_name, u.last_name,
         fm.color,
         st.id       AS sub_task_id,
         st.title    AS sub_task_title
       FROM tasks t
       JOIN  users           u  ON t.assigned_to = u.id
       LEFT JOIN family_members fm ON u.id = fm.user_id AND fm.family_id = $2
       LEFT JOIN sub_tasks   st ON t.id = st.task_id
       WHERE t.event_id = $1 AND t.completed = false AND t.status != 'declined'
       ORDER BY t.created_at ASC, st.created_at ASC`,
      [id, familyId]
    );

    // Collapse sub-task rows into each task object
    const tasksMap = {};
    tasksResult.rows.forEach(row => {
      if (!tasksMap[row.id]) {
        tasksMap[row.id] = {
          id:              row.id,
          title:           row.title,
          status:          row.status,
          position:        row.position,
          due_date:        row.due_date,
          counter_offer:   row.counter_offer,
          last_counter_by: row.last_counter_by,
          created_by:      row.created_by,
          user_id:         row.user_id,
          first_name:      row.first_name,
          last_name:       row.last_name,
          color:           row.color,
          sub_tasks:       [],
        };
      }
      if (row.sub_task_id) {
        tasksMap[row.id].sub_tasks.push({
          id:    row.sub_task_id,
          title: row.sub_task_title,
        });
      }
    });

    return successResponse(res, 200, 'Event retrieved successfully', {
      event: {
        ...event,
        attendees: attendeesResult.rows,
        tasks:     Object.values(tasksMap),
        group_ids: groupsResult.rows.map(r => Number(r.group_id)),
        from_group: fromGroup,
      },
    });

  } catch (error) {
    console.error('getEvent error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getEvent;
