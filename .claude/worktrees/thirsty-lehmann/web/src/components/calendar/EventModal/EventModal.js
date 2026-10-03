import React, { useEffect, useState } from "react";
import { useEvents } from "../../../context/EventContext";
import { CATEGORIES } from "../Sidebar/Categories";
import { formatDateTime } from "../../../utils/dateUtils";
import { useFamily } from "../../../context/FamilyContext";
import API from "../../../api/axios";
import { mapEventToForm, emptyForm } from "../../../utils/dataUtils";
import Button from "../../common/Button/Button";
import { useUI } from "../../../context/UIContext";
import "./EventModal.css";

const EventModal = () => {
  const {
    isEventModalOpen,
    isEditMode,
    selectedDate,
    closeEventModal,selectedAttendees,setSelectedAttendees, toggleAttendee, modalTasks, setModalTasks
  } = useUI();
  //
  const { createEvent, attendees } = useEvents();
  //
  const { members } = useFamily();
  //
  const { selectedEvent, updateEvent } = useEvents();
  //

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: selectedDate || "",
    end_date: selectedDate || "",
    location: "",
    is_all_day: false,
    color: "#1a8fa8",
    category: "",
    priority: "medium",
    notes: "",
    video_call_link: "",
    reminder: "",
    status: "confirmed"
  });

  const addTask = () => {
    setModalTasks([...modalTasks, { title: "", assigned_to: "", position: "full" }]);
  };

  const updateTask = (index, field, value) => {
    const updated = [...modalTasks];
    updated[index][field] = value;
    setModalTasks(updated);
  };

  const removeTask = index => {
    setModalTasks(modalTasks.filter((_, i) => i !== index));
  };

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      const fixedFormData = {
        ...formData,
        start_date: formatDateTime(formData.start_date),
        end_date: formatDateTime(formData.end_date)
      };
      //
      //updateEvent
      if (isEditMode) {
        await updateEvent(selectedEvent.id, fixedFormData);
      } else {
        //Add Event
        await createEvent(fixedFormData);
        //
      }
      //
      //
      closeEventModal();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setError("");
    if (isEditMode && selectedEvent) {
      setFormData(mapEventToForm(selectedEvent));
      const attendeeIds = attendees.map(a => a.id);
      setSelectedAttendees(attendeeIds);
    } else {
      // Default start to selected date or now, end to start + 1 hour
      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      const defaultStart = selectedDate && selectedDate.length >= 16
        ? selectedDate
        : selectedDate
          ? `${selectedDate}T${pad(now.getHours())}:${pad(now.getMinutes())}`
          : `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
      const baseDate = defaultStart.substring(0, 10);
      const defaultEnd = `${baseDate}T${pad(now.getHours() + 1)}:00`;
      setFormData({
        ...emptyForm,
        start_date: defaultStart,
        end_date: defaultEnd
      });
      setSelectedAttendees([]);
      setModalTasks([]);
    }
  }, [isEditMode, isEventModalOpen]);

  if (!isEventModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeEventModal}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{isEditMode && selectedEvent ? "Edit Event" : "New Event"}</h2>
          <button className="modal-close" onClick={closeEventModal}>
            ✕
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Title */}
          <div className="modal-field">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleChange}
              placeholder="Event title"
              required
            />
          </div>

          {/* All Day + Private — toggle row */}
          <div className="modal-toggles-row">
            <label className="modal-toggle-item">
              <span className="modal-toggle-label">All Day</span>
              <span className="modal-toggle-switch">
                <input
                  type="checkbox"
                  name="is_all_day"
                  checked={formData.is_all_day || false}
                  onChange={e => {
                    const allDay = e.target.checked;
                    const today = new Date();
                    const pad = n => String(n).padStart(2, "0");
                    const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
                    if (allDay) {
                      // Strip time — keep only date portion
                      const start = (formData.start_date || todayStr).substring(0, 10) || todayStr;
                      const end = (formData.end_date || todayStr).substring(0, 10) || todayStr;
                      setFormData({ ...formData, is_all_day: true, start_date: start, end_date: end });
                    } else {
                      // Restore time — append current hour
                      const hour = `${pad(today.getHours())}:00`;
                      const start = `${(formData.start_date || todayStr).substring(0, 10)}T${hour}`;
                      const end = `${(formData.end_date || todayStr).substring(0, 10)}T${pad(today.getHours() + 1)}:00`;
                      setFormData({ ...formData, is_all_day: false, start_date: start, end_date: end });
                    }
                  }}
                />
                <span className="modal-toggle-slider" />
              </span>
            </label>
            <label className="modal-toggle-item">
              <span className="modal-toggle-label">🔒 Private</span>
              <span className="modal-toggle-switch">
                <input
                  type="checkbox"
                  name="is_private"
                  checked={formData.is_private || false}
                  onChange={e => setFormData({ ...formData, is_private: e.target.checked })}
                />
                <span className="modal-toggle-slider" />
              </span>
            </label>
          </div>

          {/* Date & Time */}
          <div className="modal-row">
            <div className="modal-field">
              <label>Start</label>
              <input
                type={formData.is_all_day ? "date" : "datetime-local"}
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="modal-field">
              <label>End</label>
              <input
                type={formData.is_all_day ? "date" : "datetime-local"}
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="modal-field">
            <label>Repeat</label>
            <select
              name="recurrence"
              value={formData.recurrence || ""}
              onChange={handleChange}
            >
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {formData.recurrence && (
            <div className="modal-field">
              <label>Repeat Until</label>
              <input
                type="date"
                name="recurrence_end_date"
                value={formData.recurrence_end_date || ""}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Category */}
          <div className="modal-field">
            <label>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          {/* Who's attending */}
          <div className="modal-field">
            <label>Who's attending?</label>
            <div className="modal-attendees">
              {members.map(member => (
                <div
                  key={member.id}
                  className={`modal-attendee ${
                    selectedAttendees.includes(member.id) ? "selected" : ""
                  }`}
                  onClick={() => toggleAttendee(member.id)}
                  style={{
                    "--member-color": member.color || "#1a8fa8"
                  }}
                >
                  <div
                    className="modal-attendee-avatar"
                    style={{ background: member.color || "#1a8fa8" }}
                  >
                    {member.first_name[0]}
                    {member.last_name[0]}
                  </div>
                  <span className="modal-attendee-name">
                    {member.first_name}
                  </span>
                  {selectedAttendees.includes(member.id) && (
                    <div className="modal-attendee-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Tasks */}
          <div className="modal-field">
            <label>Tasks</label>
            {modalTasks.map((task, index) => (
              <div key={index} className="modal-task-row">
                <input
                  type="text"
                  placeholder="Task title"
                  value={task.title}
                  onChange={e => updateTask(index, "title", e.target.value)}
                  className="modal-task-input"
                />
                <select
                  value={task.assigned_to}
                  onChange={e =>
                    updateTask(index, "assigned_to", e.target.value)
                  }
                  className="modal-task-select"
                >
                  <option value="">Who?</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.first_name}
                    </option>
                  ))}
                </select>
                <select
                  value={task.position}
                  onChange={e => updateTask(index, "position", e.target.value)}
                  className="modal-task-select"
                >
                  <option value="full">Full</option>
                  <option value="start">Start</option>
                  <option value="end">End</option>
                </select>
                <button
                  type="button"
                  className="modal-task-remove"
                  onClick={() => removeTask(index)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="modal-task-add" onClick={addTask}>
              + Add Task
            </button>
          </div>
          {/* Location */}
          <div className="modal-field">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location ||  ''}
              onChange={handleChange}
              placeholder="Add location"
            />
          </div>

          {/* Priority */}
          <div className="modal-field">
            <label>Priority</label>
            <select
              name="priority"
              value={formData.priority ||''}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Color */}
          <div className="modal-field">
            <label>Color</label>
            <div className="modal-colors">
              {CATEGORIES.map(cat => (
                <div
                  key={cat.name}
                  className={`modal-color-dot ${
                    formData.color === cat.color ? "selected" : ""
                  }`}
                  style={{ backgroundColor: cat.color }}
                  onClick={() => setFormData({ ...formData, color: cat.color })}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="modal-field">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Add notes"
              rows={3}
            />
          </div>

          {/* Video Call */}
          <div className="modal-field">
            <label>Video Call Link</label>
            <input
              type="url"
              name="video_call_link"
              value={formData.video_call_link ||''}
              onChange={handleChange}
              placeholder="https://meet.google.com/..."
            />
          </div>

          {/* Submit */}
          <Button type="submit" text={isEditMode ? "Update Event" : "Add Event"} loading={loading} />
        </form>
      </div>
    </div>
  );
};

export default EventModal;
