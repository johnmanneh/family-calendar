const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');
const sendPush = require('../../utils/sendPush');
const insertNotification = require('../../utils/insertNotification');
const { taskAccess } = require('../../utils/access');

const respondToTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { response, counter_offer } = req.body;

  const validResponses = ['accepted', 'declined', 'countered'];
  if (!validResponses.includes(response)) {
    return errorResponse(res, 400, 'Invalid response');
  }

  if (response === 'countered' && !counter_offer?.trim()) {
    return errorResponse(res, 400, 'Counter offer text is required');
  }

  try {
    // Verify the user can see this task (family/event scope check)
    const access = await taskAccess(userId, taskId);
    if (!access.task || !access.canView) {
      return errorResponse(res, 404, 'Task not found');
    }
    const task = access.task;
    const isAssignee = Number(task.assigned_to) === Number(userId);
    const isCreator  = Number(task.created_by)  === Number(userId);

    // Only the assignee can answer a new assignment. Viewing an event (including
    // via a group) is not authority to negotiate somebody else's task.
    // Counter offers remain turn-based between the creator and assignee.
    const canRespondToPending = task.status === 'pending' && isAssignee;

    const assigneeTurn =
      (task.status === 'countered' && isAssignee && Number(task.last_counter_by) === Number(task.created_by));

    const creatorTurn =
      task.status === 'countered' && isCreator && Number(task.last_counter_by) === Number(task.assigned_to);

    if (!canRespondToPending && !assigneeTurn && !creatorTurn) {
      return errorResponse(res, 403, 'Not your turn to respond');
    }

    // Creator cannot decline — only accept or counter
    if (isCreator && response === 'declined') {
      return errorResponse(res, 400, 'Creator can only accept or counter');
    }

    const acceptingCounter = response === 'accepted' && !!task.counter_offer;
    const notifyAssignee = response === 'accepted' && isCreator && !!task.counter_offer;

    // Check if task has sub-tasks — if so, update the latest sub-task title instead of the parent
    const subTaskRes = await pool.query(
      `SELECT id FROM sub_tasks WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [taskId]
    );
    const latestSubTaskId = subTaskRes.rows[0]?.id;

    if (acceptingCounter && latestSubTaskId) {
      // Update the latest sub-task title to the counter offer text
      await pool.query(
        `UPDATE sub_tasks SET title = $1 WHERE id = $2`,
        [task.counter_offer, latestSubTaskId]
      );
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1,
           title = CASE WHEN $2 THEN counter_offer ELSE title END,
           counter_offer = CASE WHEN $3 THEN $4 ELSE null END,
           last_counter_by = $5,
           creator_acknowledged = false,
           assignee_acknowledged = CASE WHEN $6 THEN false ELSE true END
       WHERE id = $7
       RETURNING *`,
      [
        response,
        acceptingCounter && !latestSubTaskId,   // only rename parent task if no sub-tasks
        response === 'countered',
        response === 'countered' ? counter_offer.trim() : null,
        response === 'countered' ? userId : null,
        notifyAssignee,
        taskId,
      ]
    );

    // Notify all family members in real-time
    const memberRes = await pool.query(
      `SELECT fm.family_id FROM family_members fm WHERE fm.user_id = $1 ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
      [userId]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId });
    }

    // Push notification to the other party
    const actorRes = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const actor = actorRes.rows[0];
    const actorName = actor
      ? [actor.first_name, actor.last_name].filter(Boolean).join(' ') || 'Someone'
      : 'Someone';

    const updatedTask = result.rows[0];
    const taskTitle   = updatedTask.title || 'a task';

    // Figure out who to push to: the other party
    const recipientId = isAssignee ? task.created_by : task.assigned_to;
    if (recipientId) {
      const recipientRes = await pool.query(
        'SELECT push_token FROM users WHERE id = $1',
        [recipientId]
      );
      const token = recipientRes.rows[0]?.push_token;
      if (token) {
        let pushTitle, pushBody, notifType;
        if (response === 'accepted') {
          pushTitle = 'Task accepted';
          pushBody  = `${actorName} accepted: ${taskTitle}`;
          notifType = 'task_accepted';
        } else if (response === 'declined') {
          pushTitle = 'Task declined';
          pushBody  = `${actorName} declined: ${taskTitle}`;
          notifType = 'task_declined';
        } else if (response === 'countered') {
          pushTitle = 'Counter offer';
          pushBody  = `${actorName}: ${counter_offer?.trim()}`;
          notifType = isAssignee ? 'task_countered' : 'counter_accepted';
        }
        if (pushTitle) {
          sendPush(token, pushTitle, pushBody, { type: 'task', taskId });
          insertNotification(recipientId, notifType, pushTitle, pushBody, { taskId: Number(taskId) });
        }
      }
    }

    return successResponse(res, 200, 'Task response saved', { task: result.rows[0] });
  } catch (error) {
    console.error('respondToTask error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = respondToTask;
