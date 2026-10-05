const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// Returns all non-completed tasks for the family:
//   - Event-linked tasks  → identified by events.family_id
//   - Standalone tasks    → identified by the creator being in the family
// Each row includes the assigned user's name + colour so the mobile
// home screen can display and filter by member.
const getFamilyTasks = async (req, res) => {
  const userId = req.user.id;

  try {
    const familyResult = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [userId]
    );

    if (familyResult.rows.length === 0) {
      return errorResponse(res, 404, 'Not a family member');
    }

    const familyId = familyResult.rows[0].family_id;

    const result = await pool.query(
      `SELECT
         t.id, t.title, t.status, t.position, t.is_standalone,
         t.due_date, t.created_by, t.assigned_to, t.completed,
         e.id        AS event_id,
         e.title     AS event_title,
         e.start_date,
         e.color,
         u.first_name  AS assigned_first_name,
         u.last_name   AS assigned_last_name,
         fm.color      AS assigned_color,
         uc.first_name AS created_by_name
       FROM tasks t
       LEFT JOIN events          e  ON t.event_id    = e.id
       LEFT JOIN users           u  ON t.assigned_to = u.id
       LEFT JOIN family_members  fm ON t.assigned_to = fm.user_id AND fm.family_id = $1
       LEFT JOIN users           uc ON t.created_by  = uc.id
       WHERE t.completed = false
         AND (
           -- Event-linked task whose event belongs to this family
           (t.is_standalone = false AND e.family_id = $1)
           OR
           -- Standalone task created by a member of this family
           (t.is_standalone = true AND EXISTS (
             SELECT 1 FROM family_members fmc
             WHERE fmc.user_id = t.created_by AND fmc.family_id = $1
           ))
         )
       ORDER BY COALESCE(e.start_date, t.due_date) ASC NULLS LAST`,
      [familyId]
    );

    return successResponse(res, 200, 'Family tasks fetched', { tasks: result.rows });
  } catch (error) {
    console.error('getFamilyTasks error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getFamilyTasks;
