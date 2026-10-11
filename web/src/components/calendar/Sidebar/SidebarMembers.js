import React, { useState } from "react";
import API from "../../../api/axios";
import { useFamily } from "../../../context/FamilyContext";
import { useAuth } from "../../../context/AuthContext";
import { formatDate } from "../../../utils/dateUtils";
import { useUI } from "../../../context/UIContext";
import { useEvents } from "../../../context/EventContext";
import Avatar from "../../common/Avatar/Avatar";
import { useNavigate } from "react-router-dom";

import "./Sidebar.css";

const SidebarMembers = () => {
  const { members, fetchFamily } = useFamily();
  // Add a child profile (no login) — inline, right under the members
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childError, setChildError] = useState("");
  const addChild = async e => {
    e.preventDefault();
    if (!childName.trim()) return;
    setChildError("");
    try {
      await API.post("/family/children", { first_name: childName.trim() });
      await fetchFamily();
      setChildName("");
      setAddingChild(false);
    } catch (err) {
      setChildError(err.response?.data?.message || "Could not add child");
    }
  };
  const { user } = useAuth();
  const { getMemberTask } = useEvents();
  const navigate = useNavigate();
  const {
    loading,
    isTaskModalOpen,
    openTaskModal,
    closeTaskModal,
    selectedMember,

    memberTasks,
    toggleMember
  } = useUI();

  // Nobody is pre-selected: the calendar starts with everyone's events, like the
  // app. (Auto-selecting yourself silently hid events you don't attend.)

  const handleMemberClick = member => {
    toggleMember(member);
    getMemberTask(member);
  };

  const handleMemberSettings = (e, member) => {
    e.stopPropagation();
    navigate(`/profile/${member.id}`);
  };

  return (
    <>
      <div className="sidebar-section">
        <p className="sidebar-label">MEMBERS</p>
        <div className="sidebar-members-row">
          {members.map(member => (
            <div
              key={member.id}
              className={`sidebar-member-bubble ${
                selectedMember?.id === member.id ? "active" : ""
              } ${Number(member.id) === Number(user?.id) ? "is-me" : ""}`}
              onClick={() => handleMemberClick(member)}
            >
              <Avatar
                member={member}
                size={40}
                className="sidebar-member-avatar"
                style={
                  selectedMember?.id === member.id && member.color
                    ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${member.color}` }
                    : undefined
                }
              />
              <div className="sidebar-member-bubble-footer">
                <span className="sidebar-member-bubble-name">
                  {member.first_name}
                </span>
                {member.is_managed && <span className="sidebar-member-child">Child</span>}
                {member.relationship && (
                  <span className="sidebar-member-relationship">{member.relationship}</span>
                )}
                <button
                  className="sidebar-member-settings-btn"
                  onClick={e => handleMemberSettings(e, member)}
                  title={`${member.first_name}'s profile`}
                >
                  {Number(member.id) === Number(user?.id) ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        {addingChild ? (
          <form className="sidebar-group-form" onSubmit={addChild}>
            <input
              autoFocus
              className="sidebar-group-input"
              placeholder="Child's first name"
              value={childName}
              maxLength={100}
              onChange={e => setChildName(e.target.value)}
            />
            {childError && <p className="sidebar-group-error">{childError}</p>}
            <div className="sidebar-group-form-row">
              <button type="submit" className="sidebar-group-btn-confirm">Add</button>
              <button type="button" className="sidebar-group-btn-cancel" onClick={() => { setAddingChild(false); setChildName(""); setChildError(""); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button className="sidebar-add-child" onClick={() => setAddingChild(true)}>+ Add child</button>
        )}
      </div>

      {/* Member tasks — only shown when viewing someone else */}
      {selectedMember && Number(selectedMember.id) !== Number(user?.id) && (
        <>
          <div className="sidebar-divider" />
          <div className="sidebar-section">
            <p className="sidebar-label">
              {selectedMember.first_name.toUpperCase()}'S TASKS
            </p>
            <div className="sidebar-member-tasks">
              {loading ? (
                <p className="sidebar-tasks-empty">Loading...</p>
              ) : memberTasks.length === 0 ? (
                <p className="sidebar-tasks-empty">No tasks yet 🎉</p>
              ) : (
                memberTasks.map(task => (
                  <div key={task.id} className="sidebar-task-card">
                    <div
                      className="sidebar-task-accent"
                      style={{ background: selectedMember.color || "#1a8fa8" }}
                    />
                    <div className="sidebar-task-body">
                      <p className="sidebar-task-title">{task.title}</p>
                      <p className="sidebar-task-sub">
                        {task.is_standalone
                          ? `From ${task.created_by_name || "You"}`
                          : task.event_title}
                      </p>
                      <span className="sidebar-task-date">
                        {task.is_standalone
                          ? task.due_date
                            ? formatDate(new Date(task.due_date))
                            : "No due date"
                          : task.start_date
                          ? formatDate(new Date(task.start_date))
                          : "No date"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SidebarMembers;
