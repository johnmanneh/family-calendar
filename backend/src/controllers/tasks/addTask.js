const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const access = require('../../utils/access');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');
const sendPush = require('../../utils/sendPush');
const insertNotification = require('../../utils/insertNotification');

const addTask = async (req, res) => {
  const { id } = req.params; // event_id
  const { assigned_to, title, position } = req.body;
  const created_by = req.user.id;

  if (!title) {
    return errorResponse(res, 400, 'Title is required');
  }

  // Self-assigned or unassigned ("Anyone") tasks are immediately accepted
  const status = (!assigned_to || Number(assigned_to) === Number(created_by)) ? 'accepted' : 'pending';

  try {

    // F-03: tasks are added by the event's creator, to people on the event or in its family
    const event = await access.loadEvent(id);
    if (!event || !(await access.canEditEvent(created_by, event))) {
      return errorResponse(res, 404, 'Event not found');
    }
    if (!(await access.canAssignOnEvent(event, assigned_to))) {
      return errorResponse(res, 403, 'You can only assign people on this event or in its family');
    }

    const result = await pool.query(
      `INSERT INTO tasks (event_id, assigned_to, title, position, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, assigned_to, title, position || 'full', created_by, status]
    );
    const memberRes = await pool.query(
      `SELECT fm.family_id FROM family_members fm WHERE fm.user_id = $1 ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
      [created_by]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId: result.rows[0].id });
    }

    // Push notification to assignee when a task is pending (assigned to someone else)
    if (status === 'pending' && assigned_to) {
      const creatorRes = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [created_by]
      );
      const assigneeRes = await pool.query(
        'SELECT push_token FROM users WHERE id = $1',
        [assigned_to]
      );
      const creator = creatorRes.rows[0];
      const creatorName = creator
        ? [creator.first_name, creator.last_name].filter(Boolean).join(' ') || 'Someone'
        : 'Someone';
      if (assigneeRes.rows[0]?.push_token) {
        sendPush(
          assigneeRes.rows[0].push_token,
          'New task assigned',
          `${creatorName}: ${title}`,
          { type: 'task', taskId: result.rows[0].id }
        );
      }
      insertNotification(
        assigned_to,
        'task_assigned',
        'New task assigned',
        `${creatorName}: ${title}`,
        { taskId: result.rows[0].id }
      );
    }

    return successResponse(res, 201, 'Task added successfully', {
      task: result.rows[0]
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = addTask;