import React from "react";
import { useEvents } from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../utils/dateUtils";
import { useUI } from "../../../context/UIContext";

import "./EventDetails.css";

const Icon = ({ children }) => (
  <span className="event-details-icon">{children}</span>
);

const EventDetailsView = () => {
  const {
    selectedEvent,
    attendees,
    tasks,
    deleteEvent,
    deleteTask,
    addSubTask, deleteSubTask
  } = useEvents();

  const {
    isViewModalOpen,
    openEditEvent,
    subTaskInputs,
    updateSubTaskInput,
    clearSubTaskInput
  } = useUI();

  const hideActions = isViewModalOpen;
  const start = new Date(selectedEvent.start);
  const end = new Date(selectedEvent.end);

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
                  <p className="event-details-task-title">{task.title}</p>
                  <p className="event-details-task-meta">
                    {task.first_name} · {task.position}
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
                    style={{ background: attendee.color || "#1a8fa8" }}
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
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

      {/* Actions */}
      <div className="event-details-actions">
        <button className="event-action-btn edit" onClick={handleEdit}>Edit</button>
        <button className="event-action-btn delete" onClick={handleDelete}>Delete</button>
      </div>

    </div>
  );
};

export default EventDetailsView;
