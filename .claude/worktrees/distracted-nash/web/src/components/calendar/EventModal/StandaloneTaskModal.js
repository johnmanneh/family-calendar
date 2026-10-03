import React, { useState, useEffect } from "react";
import { useEvents } from "../../../context/EventContext";
import { useFamily } from "../../../context/FamilyContext";
import Button from "../../common/Button/Button";
import "./EventModal.css"; // reuse same CSS
import { useAuth } from "../../../context/AuthContext";
import {useUI} from "../../../context/UIContext";

const StandaloneTaskModal = () => {
  const { isTaskModalOpen, closeTaskModal } = useUI();
  //
  const { user } = useAuth();
  //
  const { createStandaloneTask } = useEvents();
  //
  const { members } = useFamily();
  //

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    assigned_to: user?.id || "",
    due_date: "",
    position: "full"
  });

  useEffect(() => {
    if (!isTaskModalOpen) {
      setFormData({
        title: "",
        assigned_to: user?.id || "",
        due_date: "",
        position: "full"
      });
      setError("");
    }
  }, [isTaskModalOpen]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await createStandaloneTask(formData);
      closeTaskModal();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isTaskModalOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeTaskModal}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Task</h2>
          <button className="modal-close" onClick={closeTaskModal}>
            ✕
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label>Task Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="modal-field">
            <label>Assign To</label>
            <select
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              required
            >
              <option value="">Select member</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label>Due Date (optional)</label>
            <input
              type="datetime-local"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
            />
          </div>

          <div className="modal-field">
            <label>Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
            >
              <option value="full">Full</option>
              <option value="start">Start</option>
              <option value="end">End</option>
            </select>
          </div>

          <Button type="submit" text="Add Task" loading={loading} />
        </form>
      </div>
    </div>
  );
};

export default StandaloneTaskModal;
