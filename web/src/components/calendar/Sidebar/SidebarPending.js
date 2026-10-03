import React, { useState, useEffect } from "react";
import { useUI } from "../../../context/UIContext";
import { useEvents } from "../../../context/EventContext";
import { formatDate } from "../../../utils/dateUtils";
import TimeRoller from "../../common/TimeRoller/TimeRoller";
import "./Sidebar.css";

const SidebarPending = () => {
  const { pendingInvitations, pendingTasks, taskNotifications, assigneeNotifications } = useUI();
  const { respondToEventInvitation, respondToTask, acknowledgeTaskResponse, respondToCounter, acknowledgeAssigneeNotification, updateTaskDueDate, fetchPendingTasks, fetchTaskNotifications, fetchAssigneeNotifications } = useEvents();

  const [respondingEventId, setRespondingEventId] = useState(null);
  const [respondingTaskId, setRespondingTaskId] = useState(null);
  const [counteringTaskId, setCounteringTaskId] = useState(null);
  const [counterText, setCounterText] = useState("");
  const [counteringNotifId, setCounteringNotifId] = useState(null);
  const [counterNotifText, setCounterNotifText] = useState("");
  const [respondingNotifId, setRespondingNotifId] = useState(null);

  // Fetch on mount — SSE in EventContext handles live updates from here on
  useEffect(() => {
    fetchPendingTasks();
    fetchTaskNotifications();
    fetchAssigneeNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAnything =
    pendingInvitations?.length > 0 ||
    pendingTasks?.length > 0 ||
    taskNotifications?.length > 0 ||
    assigneeNotifications?.length > 0;

  if (!hasAnything) return null;

  const handleEventRespond = async (eventId, response) => {
    setRespondingEventId(eventId);
    try {
      await respondToEventInvitation(eventId, response);
    } finally {
      setRespondingEventId(null);
    }
  };

  const handleTaskRespond = async (taskId, response) => {
    setRespondingTaskId(taskId);
    try {
      await respondToTask(taskId, response);
    } finally {
      setRespondingTaskId(null);
      setCounteringTaskId(null);
      setCounterText("");
    }
  };

  const handleCreatorRespond = async (taskId, response) => {
    setRespondingNotifId(taskId);
    try {
      await respondToCounter(taskId, response);
    } finally {
      setRespondingNotifId(null);
      setCounteringNotifId(null);
      setCounterNotifText("");
    }
  };

  const handleCreatorCounterSubmit = async taskId => {
    if (!counterNotifText.trim()) return;
    setRespondingNotifId(taskId);
    try {
      await respondToCounter(taskId, 'countered', counterNotifText.trim());
    } finally {
      setRespondingNotifId(null);
      setCounteringNotifId(null);
      setCounterNotifText("");
    }
  };

  const handleCounterSubmit = async taskId => {
    if (!counterText.trim()) return;
    setRespondingTaskId(taskId);
    try {
      await respondToTask(taskId, 'countered', counterText.trim());
    } finally {
      setRespondingTaskId(null);
      setCounteringTaskId(null);
      setCounterText("");
    }
  };

  // Build a map of eventId → pending invitation
  const invitationByEventId = {};
  pendingInvitations.forEach(inv => { invitationByEventId[inv.id] = inv; });

  // Filter out tasks that have already been accepted (appear in assigneeNotifications)
  const acceptedTaskIds = new Set((assigneeNotifications || []).map(n => n.id));
  const activePendingTasks = (pendingTasks || []).filter(t => !acceptedTaskIds.has(t.id));

  // Group pending tasks that have a matching invitation by event_id
  const tasksByEventId = {};
  activePendingTasks.forEach(task => {
    if (!tasksByEventId[task.event_id]) tasksByEventId[task.event_id] = [];
    tasksByEventId[task.event_id].push(task);
  });

  // Tasks with no matching pending invitation — show as plain task cards
  const orphanTasks = activePendingTasks.filter(t => !invitationByEventId[t.event_id]);

  return (
    <>
      <div className="sidebar-section">
        <p className="sidebar-label">PENDING</p>
        <div className="sidebar-pending-list">

          {/* Grouped: event invitation + its tasks cascading below */}
          {pendingInvitations.map(inv => {
            const tasks = tasksByEventId[inv.id] || [];

            return (
              <div key={`group-${inv.id}`} className="sidebar-pending-group">

                {/* Event card */}
                <div className="sidebar-pending-item">
                  <div
                    className="sidebar-pending-color"
                    style={{ background: inv.color || "#1a8fa8" }}
                  />
                  <div className="sidebar-pending-info">
                    <p className="sidebar-pending-title">{inv.title}</p>
                    <p className="sidebar-pending-meta">
                      {formatDate(new Date(inv.start_date))}
                    </p>
                    <p className="sidebar-pending-from">
                      from {inv.created_by_name} {inv.created_by_last_name}
                    </p>
                  </div>
                  <div className="sidebar-pending-actions">
                    <button
                      className="sidebar-pending-accept"
                      disabled={respondingEventId === inv.id}
                      onClick={() => handleEventRespond(inv.id, 'accepted')}
                      title="Accept"
                    >✓</button>
                    <button
                      className="sidebar-pending-deny"
                      disabled={respondingEventId === inv.id}
                      onClick={() => handleEventRespond(inv.id, 'denied')}
                      title="Decline"
                    >✕</button>
                  </div>
                </div>

                {/* Tasks cascade under the event */}
                {tasks.map(task => (
                  <div key={`task-${task.id}`} className="sidebar-pending-task-cascade">
                    <div className="sidebar-pending-item sidebar-pending-task">
                      <div className="sidebar-pending-color" style={{ background: task.color || "#1a8fa8" }} />
                      <div className="sidebar-pending-info">
                        <p className="sidebar-pending-task-label">TASK</p>
                        <p className="sidebar-pending-title">{task.title}</p>

                        {/* Show counter offer from the other party */}
                        {task.status === 'countered' && task.counter_offer && (
                          <p className="sidebar-pending-counter-offer">
                            ↩ "{task.counter_offer}"
                          </p>
                        )}

                        {task.sub_tasks?.length > 0 && (
                          <div className="sidebar-pending-subtasks">
                            {task.sub_tasks.map((sub, i) => (
                              <div key={sub.id} className="sidebar-pending-subtask">
                                <span className="sidebar-pending-subtask-line">
                                  {i === task.sub_tasks.length - 1 ? '└' : '├'}
                                </span>
                                <span className="sidebar-pending-subtask-title">{sub.title}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="sidebar-pending-from">
                          {task.created_by_first_name
                            ? `from ${task.created_by_first_name} ${task.created_by_last_name}`
                            : ''}
                        </p>

                        {counteringTaskId === task.id && (
                          <div className="sidebar-pending-counter">
                            <input
                              type="text"
                              placeholder="I'll bring…"
                              value={counterText}
                              onChange={e => setCounterText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleCounterSubmit(task.id)}
                              autoFocus
                            />
                            <div className="sidebar-pending-counter-actions">
                              <button
                                className="sidebar-pending-counter-send"
                                disabled={respondingTaskId === task.id || !counterText.trim()}
                                onClick={() => handleCounterSubmit(task.id)}
                              >Send</button>
                              <button
                                className="sidebar-pending-counter-cancel"
                                onClick={() => { setCounteringTaskId(null); setCounterText(""); }}
                              >Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {counteringTaskId !== task.id && (
                        <div className="sidebar-pending-actions sidebar-pending-task-actions">
                          <button
                            className="sidebar-pending-accept"
                            disabled={respondingTaskId === task.id}
                            onClick={() => handleTaskRespond(task.id, 'accepted')}
                            title="Accept"
                          >✓</button>
                          <button
                            className="sidebar-pending-deny"
                            disabled={respondingTaskId === task.id}
                            onClick={() => handleTaskRespond(task.id, 'declined')}
                            title="Decline"
                          >✕</button>
                          <button
                            className="sidebar-pending-counter-btn"
                            disabled={respondingTaskId === task.id}
                            onClick={() => { setCounteringTaskId(task.id); setCounterText(""); }}
                            title="Counter"
                          >↩</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              </div>
            );
          })}

          {/* Orphan tasks — no matching pending event invitation, shown as plain task cards */}
          {orphanTasks.map(task => (
            <div key={`task-${task.id}`} className="sidebar-pending-task-cascade" style={{ marginTop: 0, paddingLeft: 0 }}>
              <div className="sidebar-pending-item sidebar-pending-task" style={{ borderRadius: 8 }}>
                <div className="sidebar-pending-color" style={{ background: task.color || "#1a8fa8" }} />
                <div className="sidebar-pending-info">
                  <p className="sidebar-pending-task-label">TASK</p>
                  <p className="sidebar-pending-title">{task.title}</p>

                  {task.status === 'countered' && task.counter_offer && (
                    <p className="sidebar-pending-counter-offer">
                      ↩ "{task.counter_offer}"
                    </p>
                  )}

                  {task.sub_tasks?.length > 0 && (
                    <div className="sidebar-pending-subtasks">
                      {task.sub_tasks.map((sub, i) => (
                        <div key={sub.id} className="sidebar-pending-subtask">
                          <span className="sidebar-pending-subtask-line">
                            {i === task.sub_tasks.length - 1 ? '└' : '├'}
                          </span>
                          <span className="sidebar-pending-subtask-title">{sub.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.created_by_first_name && (
                    <p className="sidebar-pending-from">
                      from {task.created_by_first_name} {task.created_by_last_name}
                    </p>
                  )}
                  {counteringTaskId === task.id && (
                    <div className="sidebar-pending-counter">
                      <input
                        type="text"
                        placeholder="I'll bring…"
                        value={counterText}
                        onChange={e => setCounterText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCounterSubmit(task.id)}
                        autoFocus
                      />
                      <div className="sidebar-pending-counter-actions">
                        <button
                          className="sidebar-pending-counter-send"
                          disabled={respondingTaskId === task.id || !counterText.trim()}
                          onClick={() => handleCounterSubmit(task.id)}
                        >Send</button>
                        <button
                          className="sidebar-pending-counter-cancel"
                          onClick={() => { setCounteringTaskId(null); setCounterText(""); }}
                        >Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                {counteringTaskId !== task.id && (
                  <div className="sidebar-pending-actions sidebar-pending-task-actions">
                    <button
                      className="sidebar-pending-accept"
                      disabled={respondingTaskId === task.id}
                      onClick={() => handleTaskRespond(task.id, 'accepted')}
                      title="Accept"
                    >✓</button>
                    <button
                      className="sidebar-pending-deny"
                      disabled={respondingTaskId === task.id}
                      onClick={() => handleTaskRespond(task.id, 'declined')}
                      title="Decline"
                    >✕</button>
                    <button
                      className="sidebar-pending-counter-btn"
                      disabled={respondingTaskId === task.id}
                      onClick={() => { setCounteringTaskId(task.id); setCounterText(""); }}
                      title="Counter"
                    >↩</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Task response notifications for the creator */}
          {taskNotifications.map(notif => (
            <div key={`notif-${notif.id}`} className="sidebar-pending-item sidebar-pending-notif">
              <div className="sidebar-pending-color" style={{ background: "#ff9f0a" }} />
              <div className="sidebar-pending-info">
                <p className="sidebar-pending-task-label">TASK RESPONSE</p>
                <p className="sidebar-pending-title">
                  {notif.assigned_first_name}{' '}
                  {notif.status === 'declined' ? 'declined' : 'countered'}
                  {' '}"{notif.title}"
                </p>
                {notif.counter_offer && (
                  <p className="sidebar-pending-counter-offer">"{notif.counter_offer}"</p>
                )}
                <p className="sidebar-pending-meta">{notif.event_title}</p>

                {/* Creator counter input */}
                {counteringNotifId === notif.id && (
                  <div className="sidebar-pending-counter">
                    <input
                      type="text"
                      placeholder="Your counter…"
                      value={counterNotifText}
                      onChange={e => setCounterNotifText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreatorCounterSubmit(notif.id)}
                      autoFocus
                    />
                    <div className="sidebar-pending-counter-actions">
                      <button
                        className="sidebar-pending-counter-send"
                        disabled={respondingNotifId === notif.id || !counterNotifText.trim()}
                        onClick={() => handleCreatorCounterSubmit(notif.id)}
                      >Send</button>
                      <button
                        className="sidebar-pending-counter-cancel"
                        onClick={() => { setCounteringNotifId(null); setCounterNotifText(""); }}
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {counteringNotifId !== notif.id && notif.status === 'countered' && (
                <div className="sidebar-pending-actions sidebar-pending-task-actions">
                  <button
                    className="sidebar-pending-accept"
                    disabled={respondingNotifId === notif.id}
                    onClick={() => handleCreatorRespond(notif.id, 'accepted')}
                    title="Accept counter"
                  >✓</button>
                  <button
                    className="sidebar-pending-counter-btn"
                    disabled={respondingNotifId === notif.id}
                    onClick={() => { setCounteringNotifId(notif.id); setCounterNotifText(""); }}
                    title="Counter back"
                  >↩</button>
                </div>
              )}

              {counteringNotifId !== notif.id && notif.status === 'declined' && (
                <div className="sidebar-pending-actions">
                  <button
                    className="sidebar-pending-accept"
                    disabled={respondingNotifId === notif.id}
                    onClick={() => acknowledgeTaskResponse(notif.id)}
                    title="Dismiss"
                  >✓</button>
                </div>
              )}
            </div>
          ))}

          {/* Assignee notifications — task accepted, set delivery time */}
          {assigneeNotifications.map(notif => (
            <div key={`anotif-${notif.id}`} className="sidebar-pending-item sidebar-pending-accepted">
              <div className="sidebar-pending-color" style={{ background: "#34c759" }} />
              <div className="sidebar-pending-info">
                <p className="sidebar-pending-task-label accepted">ACCEPTED</p>
                <p className="sidebar-pending-title">{notif.title}</p>
                <p className="sidebar-pending-meta">{notif.event_title}</p>
                <p className="sidebar-pending-from">
                  {notif.created_by_first_name
                    ? `${notif.created_by_first_name} ${notif.created_by_last_name} accepted your counter`
                    : 'Your counter was accepted'}
                </p>
                <div className="sidebar-task-timeslot" style={{ marginTop: 8 }}>
                  <span className="sidebar-task-timeslot-label">Arrival time</span>
                  <TimeRoller
                    value={
                      notif.due_date
                        ? new Date(notif.due_date).toTimeString().substring(0, 5)
                        : "08:00"
                    }
                    onChange={time => {
                      const base = notif.due_date
                        ? new Date(notif.due_date).toISOString().substring(0, 10)
                        : new Date().toISOString().substring(0, 10);
                      updateTaskDueDate(notif.id, `${base}T${time}`);
                    }}
                  />
                </div>
              </div>
              <div className="sidebar-pending-actions">
                <button
                  className="sidebar-pending-accept"
                  onClick={() => acknowledgeAssigneeNotification(notif.id)}
                  title="Got it"
                >✓</button>
              </div>
            </div>
          ))}

        </div>
      </div>
    </>
  );
};

export default SidebarPending;
