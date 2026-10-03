import React from "react";
import { useEvents } from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../utils/dateUtils";
import { useUI } from "../../../context/UIContext";

import "./EventDetails.css";

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

  const handleDelete = async () => {
    await deleteEvent(selectedEvent.id);
  };

  const handleEdit = () => openEditEvent();
  //
  const handleAddSubTask = async taskId => {
    const title = subTaskInputs[taskId];
    if (!title?.trim()) return;
    await addSubTask(taskId, title);
    clearSubTaskInput(taskId); 
  };
  //
  //
  return (
    <div className="event-details-panel">
      {/* Title */}
      <div className="event-details-header">
        <div
          className="event-details-color"
          style={{
            backgroundColor: selectedEvent.backgroundColor || "#1a8fa8"
          }}
        />
        <h2 className="event-details-title">{selectedEvent.title}</h2>
      </div>
      {/* Tasks */}
      {tasks.length > 0 && (
        <>
          <div className="event-details-divider" />
          <div className="event-details-row">
            <span className="event-details-icon">✅</span>
            <div className="event-details-tasks">
              {tasks.map(task => (
                <div key={task.id} className="event-details-task">
                  <div
                    className="event-details-task-avatar"
                    style={{ background: task.color || "#1a8fa8" }}
                  >
                    {task.first_name[0]}
                    {task.last_name[0]}
                  </div>
                  <div className="event-details-task-info">
                    <p className="event-details-task-title">{task.title}</p>
                    <p className="event-details-task-meta">
                      {task.first_name} · {task.position}
                    </p>

                    {/* SubTasks */}
                    {task.sub_tasks?.length > 0 && (
                      <div className="event-details-subtasks">
                        {task.sub_tasks.map(sub => (
                          <div key={sub.id} className="event-details-subtask">
                            <span>└ {sub.title}</span>
                            {!hideActions && (
                              <button
                                className="event-details-subtask-delete"
                                onClick={() => deleteSubTask(task.id, sub.id)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add SubTask Input */}
                    {!hideActions && (
                      <div className="event-details-subtask-add">
                        <input
                          type="text"
                          placeholder="+ Add subtask"
                          value={subTaskInputs[task.id] || ""}
                          onChange={e => updateSubTaskInput(task.id, e.target.value)}
                          onKeyDown={e =>
                            e.key === "Enter" && handleAddSubTask(task.id)
                          }
                        />
                      </div>
                    )}
                  </div>
                  {!hideActions && (
                    <button
                      className="event-details-task-delete"
                      onClick={() => deleteTask(task.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedEvent.extendedProps.updated_by_name && (
        <>
          <div className="event-details-row">
            <span className="event-details-icon">✏️</span>
            <span className="event-details-value">
              Updated by {selectedEvent.extendedProps.updated_by_name}
            </span>
          </div>
          <div className="event-details-divider" />
        </>
      )}
      {/* Category */}
      {selectedEvent.extendedProps?.category && (
        <div className="event-details-row">
          <span className="event-details-icon">🏷️</span>
          <span className="event-details-value">
            {selectedEvent.extendedProps.category}
          </span>
        </div>
      )}

      {/* Attendees */}
      {attendees.length > 0 && (
        <>
          <div className="event-details-row">
            <span className="event-details-icon">👥</span>
            <div className="event-details-attendees">
              {attendees.map(attendee => (
                <div
                  key={attendee.id}
                  className="event-details-attendee"
                  style={{ background: attendee.color || "#1a8fa8" }}
                  title={`${attendee.first_name} ${attendee.last_name}`}
                >
                  {attendee.first_name[0]}
                  {attendee.last_name[0]}
                </div>
              ))}
            </div>
          </div>
          <div className="event-details-divider" />
        </>
      )}

      <div className="event-details-divider" />

      {/* Date & Time */}
      <div className="event-details-row">
        <span className="event-details-icon">📅</span>
        <div>
          <p className="event-details-value">{formatDate(start)}</p>
          <p className="event-details-time">
            {formatTime(start)} → {formatTime(end)}
          </p>
        </div>
      </div>

      <div className="event-details-divider" />

      {/* Location */}
      {selectedEvent.extendedProps.location && (
        <>
          <div className="event-details-row">
            <span className="event-details-icon">📍</span>
            <span className="event-details-value">
              {selectedEvent.extendedProps.location}
            </span>
          </div>
          <div className="event-details-divider" />
        </>
      )}

      {/* Video Call */}
      {selectedEvent.extendedProps.video_call_link && (
        <>
          <div className="event-details-row">
            <span className="event-details-icon">📹</span>
            <a
              href={selectedEvent.extendedProps.video_call_link}
              target="_blank"
              rel="noreferrer"
              className="event-details-link"
            >
              Join Video Call
            </a>
          </div>
          <div className="event-details-divider" />
        </>
      )}

      {/* Priority */}
      {selectedEvent.extendedProps.priority && (
        <>
          <div className="event-details-row">
            <span className="event-details-icon">⚡</span>
            <span
              className="event-details-value"
              style={{ textTransform: "capitalize" }}
            >
              {selectedEvent.extendedProps.priority} Priority
            </span>
          </div>
          <div className="event-details-divider" />
        </>
      )}

      {/* Notes */}
      {selectedEvent.extendedProps.notes && (
        <>
          <div className="event-details-row">
            <span className="event-details-icon">📝</span>
            <span className="event-details-value">
              {selectedEvent.extendedProps.notes}
            </span>
          </div>
          <div className="event-details-divider" />
        </>
      )}

      {/* Actions */}
      <div className="event-details-actions">
        <button className="event-action-btn edit" onClick={handleEdit}>
          Edit
        </button>
        <button className="event-action-btn delete" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default EventDetailsView;
