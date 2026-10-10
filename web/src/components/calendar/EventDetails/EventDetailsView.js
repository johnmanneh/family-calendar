import React, { useEffect } from "react";
import { useEvents } from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../utils/dateUtils";
import { useUI } from "../../../context/UIContext";
import { useAuth } from "../../../context/AuthContext";

import StdIcon from "../../common/Icon/Icon";
import "./EventDetails.css";

const Icon = ({ children }) => (
  <span className="event-details-icon">{children}</span>
);

const EventDetailsView = () => {
  const { user } = useAuth();
  const {
    selectedEvent,
    attendees,
    tasks,
    deleteEvent,
    deleteTask,
    fetchTasks,
    addSubTask, deleteSubTask,
    respondToEventInvitation, openEventById, setSelectedEvent
  } = useEvents();

  const {
    isViewModalOpen,
    openEditEvent,
    subTaskInputs,
    updateSubTaskInput,
    clearSubTaskInput
  } = useUI();

  // SSE in EventContext handles live task updates — no polling needed here

  const hideActions = isViewModalOpen;
  const start = new Date(selectedEvent.start);
  const end = new Date(selectedEvent.end);

  // Only the person who created the event can edit or delete it
  const isMine = Number(selectedEvent.extendedProps?.created_by) === Number(user?.id);
  // Invitation not answered yet (opened from a notification)
  const invitePending = !!selectedEvent.extendedProps?.invite_pending;
  const [responding, setResponding] = React.useState(false);

  const respond = async (response) => {
    setResponding(true);
    try {
      await respondToEventInvitation(selectedEvent.id, response);
      if (response === 'accepted') await openEventById(selectedEvent.id);   // now in the calendar
      else setSelectedEvent(null);                                          // declined → gone
    } finally {
      setResponding(false);
    }
  };

  const priorityColor = (p) => {
    const v = String(p || '').toLowerCase();
    return v === 'high' ? '#ff3b30' : v === 'medium' ? '#f48c06' : '#8e8e93';
  };

  const handleDelete = async () => { await deleteEvent(selectedEvent.id); };
  const handleEdit = () => openEditEvent();

  const handleAddSubTask = async taskId => {
    const title = subTaskInputs[taskId];
    if (!title?.trim()) return;
    await addSubTask(taskId, title);
    clearSubTaskInput(taskId);
  };

  return (
    <div className="event-details-panel">

      {/* Header */}
      <div className="event-details-header">
        <div
          className="event-details-color"
          style={{ backgroundColor: selectedEvent.backgroundColor || "#1a8fa8" }}
        />
        <h2 className="event-details-title">{selectedEvent.title}</h2>
      </div>

      {/* Invitation not answered yet → who invited you */}
      {invitePending && (
        <div className="event-details-invite-from">
          <StdIcon name="mail" size={14} color="#f48c06" />
          <span>{selectedEvent.extendedProps.created_by_name || 'Someone'} invited you</span>
        </div>
      )}

      {/* Tasks card */}
      {tasks.length > 0 && (
        <div className="event-details-card">
          <div className="event-details-tasks">
            {tasks.map(task => (
              <div key={task.id} className="event-details-task">
                <div
                  className="event-details-task-avatar"
                  style={{ background: task.color || "#1a8fa8" }}
                >
                  {task.first_name[0]}{task.last_name[0]}
                </div>
                <div className="event-details-task-info">
                  <div className="event-details-task-title-row">
                    <p className="event-details-task-title">{task.title}</p>
                    {task.status === 'pending' && (
                      <span className="event-details-task-badge pending">Pending</span>
                    )}
                    {task.status === 'declined' && (
                      <span className="event-details-task-badge declined">Declined</span>
                    )}
                    {task.status === 'countered' && (
                      <span className="event-details-task-badge countered">Countered</span>
                    )}
                  </div>
                  {task.status === 'countered' && task.counter_offer && (
                    <div className="event-details-task-negotiation">
                      <div className="event-details-task-negotiation-bubble">
                        <span className="event-details-task-negotiation-who">
                          {Number(task.last_counter_by) === Number(task.user_id)
                            ? task.first_name
                            : 'You'}
                          :
                        </span>
                        <span className="event-details-task-negotiation-text">
                          "{task.counter_offer}"
                        </span>
                      </div>
                      <p className="event-details-task-negotiation-turn">
                        {Number(task.last_counter_by) === Number(task.user_id)
                          ? 'Waiting for your response'
                          : `Waiting for ${task.first_name}`}
                      </p>
                    </div>
                  )}
                  {task.status === 'declined' && (
                    <p className="event-details-task-counter declined">
                      {task.first_name} declined this task
                    </p>
                  )}
                  <p className="event-details-task-meta">
                    {task.first_name} · {task.position}
                    {task.status === 'accepted' && (
                      <>
                        {" · arrival "}
                        <span style={{ fontVariantNumeric: "tabular-nums", color: task.due_date ? "#1d1d1f" : "#c7c7cc", fontStyle: task.due_date ? "normal" : "italic" }}>
                          {task.due_date
                            ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "not set"}
                        </span>
                      </>
                    )}
                  </p>
                  {task.sub_tasks?.length > 0 && (
                    <div className="event-details-subtasks">
                      {task.sub_tasks.map(sub => (
                        <div key={sub.id} className="event-details-subtask">
                          <span>└ {sub.title}</span>
                          {!hideActions && (
                            <button
                              className="event-details-subtask-delete"
                              onClick={() => deleteSubTask(task.id, sub.id)}
                            >✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!hideActions && (
                    <div className="event-details-subtask-add">
                      <input
                        type="text"
                        placeholder="+ Add subtask"
                        value={subTaskInputs[task.id] || ""}
                        onChange={e => updateSubTaskInput(task.id, e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddSubTask(task.id)}
                      />
                    </div>
                  )}
                </div>
                {!hideActions && (
                  <button
                    className="event-details-task-delete"
                    onClick={() => deleteTask(task.id)}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="event-details-card">

        {selectedEvent.extendedProps.updated_by_name && (
          <div className="event-details-row">
            <Icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </Icon>
            <span className="event-details-value">
              Updated by {selectedEvent.extendedProps.updated_by_name}
            </span>
          </div>
        )}

        {selectedEvent.extendedProps?.category && (
          <div className="event-details-row">
            <Icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </Icon>
            <span className="event-details-value">
              {selectedEvent.extendedProps.category}
            </span>
          </div>
        )}

        {attendees.length > 0 && (
          <div className="event-details-row">
            <Icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </Icon>
            <div className="event-details-attendees">
              {attendees.map(attendee => (
                <div key={attendee.id} className="event-details-attendee">
                  <div
                    className="event-details-attendee-avatar"
                    style={{
                      background: attendee.color || "#1a8fa8",
                      ...(attendee.status === 'accepted' && attendee.color
                        ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${attendee.color}` }
                        : {})
                    }}
                  >
                    {attendee.first_name[0]}{attendee.last_name[0]}
                  </div>
                  <span className="event-details-attendee-name">
                    {attendee.first_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="event-details-row">
          <Icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </Icon>
          <div>
            <p className="event-details-value">{formatDate(start)}</p>
            <p className="event-details-time">
              {formatTime(start)} → {formatTime(end)}
            </p>
          </div>
        </div>

        {selectedEvent.extendedProps.location && (
          <div className="event-details-row">
            <Icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </Icon>
            <span className="event-details-value">
              {selectedEvent.extendedProps.location}
            </span>
          </div>
        )}

        {selectedEvent.extendedProps.video_call_link && (
          <div className="event-details-row">
            <Icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </Icon>
            <a
              href={selectedEvent.extendedProps.video_call_link}
              target="_blank"
              rel="noreferrer"
              className="event-details-link"
            >
              Join Video Call
            </a>
          </div>
        )}

        {selectedEvent.extendedProps.priority && (
          <div className="event-details-row">
            <Icon>
              <StdIcon name="flag" size={16} color={priorityColor(selectedEvent.extendedProps.priority)} strokeWidth={2.5} />
            </Icon>
            <span className="event-details-value" style={{ textTransform: "capitalize" }}>
              {selectedEvent.extendedProps.priority} Priority
            </span>
          </div>
        )}

        {selectedEvent.extendedProps.notes && (
          <div className="event-details-row">
            <Icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
            </Icon>
            <span className="event-details-value">
              {selectedEvent.extendedProps.notes}
            </span>
          </div>
        )}

      </div>

      {/* Actions
          Invitation: Decline · Accept
          Creator:    Edit · Delete
          Others:     view only */}
      {invitePending ? (
        <div className="event-details-invite">
          <p className="event-details-invite-question">Add it to your calendar?</p>
          <div className="event-details-actions">
            <button className="event-action-btn delete" disabled={responding} onClick={() => respond('denied')}>Decline</button>
            <button className="event-action-btn accept" disabled={responding} onClick={() => respond('accepted')}>Accept</button>
          </div>
        </div>
      ) : isMine && !hideActions && (
        <div className="event-details-actions">
          <button className="event-action-btn edit" onClick={handleEdit}>Edit</button>
          <button className="event-action-btn delete" onClick={handleDelete}>Delete</button>
        </div>
      )}

    </div>
  );
};

export default EventDetailsView;
