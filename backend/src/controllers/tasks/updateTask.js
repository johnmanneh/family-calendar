const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const access = require('../../utils/access');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');

// PATCH /api/tasks/:taskId
// Updates title, assigned_to, position, due_date of a standalone or event task.
const updateTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { title, assigned_to, position, due_date } = req.body;
  // undefined = keep; null = no reminder; number = minutes before due
  const remindGiven = req.body.remind_minutes !== undefined;
  const remind = remindGiven && req.body.remind_minutes !== null
    ? Math.max(0, Math.min(10080, Number(req.body.remind_minutes) || 0)) : null;

  try {
    // Verify the task exists and the user is the creator
    const taskRes = await pool.query(
      `SELECT id, created_by, event_id FROM tasks WHERE id = $1`,
      [taskId]
    );
    if (taskRes.rowCount === 0) return errorResponse(res, 404, 'Task not found');

    const task = taskRes.rows[0];

    // F-03: reassigning keeps the task inside the event / family
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== '') {
      const ok = task.event_id
        ? await access.canAssignOnEvent(await access.loadEvent(task.event_id), assigned_to)
        : await access.sharesFamily(userId, assigned_to);
      if (!ok) return errorResponse(res, 403, 'You can only assign tasks to your family');
    }
    if (Number(task.created_by) !== Number(userId)) {
      return errorResponse(res, 403, 'Only the task creator can edit it');
    }

    // Build update — only set fields that were provided
    const result = await pool.query(
      `UPDATE tasks
       SET title       = COALESCE($1, title),
           assigned_to = COALESCE($2, assigned_to),
           position    = COALESCE($3, position),
           due_date    = $4::timestamp,
           remind_minutes   = CASE WHEN $7::boolean THEN $8::int ELSE remind_minutes END,
           -- New due time or reminder choice → remind again at the new time
           reminder_sent_at = CASE
                                WHEN $4::timestamp IS DISTINCT FROM due_date THEN NULL
                                WHEN $7::boolean AND $8::int IS DISTINCT FROM remind_minutes THEN NULL
                                ELSE reminder_sent_at
                              END,
           -- Reassigned to yourself: already yours (accepted). To someone else: they must accept.
           status      = CASE
                           WHEN $2::int IS NULL OR $2::int = assigned_to THEN status
                           WHEN $2::int = $6::int THEN 'accepted'
                           ELSE 'pending'
                         END
       WHERE id = $5
       RETURNING *`,
      [
        title?.trim() || null,
        assigned_to   || null,
        position      || null,
        due_date      || null,   // explicit null clears it
        taskId,
        userId,
        remindGiven,
        remind,
      ]
    );

    // Broadcast to family
    const memberRes = await pool.query(
      `SELECT fm.family_id FROM family_members fm WHERE fm.user_id = $1 ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
      [userId]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId: Number(taskId) });
    }

    return successResponse(res, 200, 'Task updated', { task: result.rows[0] });
  } catch (err) {
    console.error('updateTask error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateTask;
