import React, { useEffect } from "react";
import { useFamily } from "../../../context/FamilyContext";
import { useAuth } from "../../../context/AuthContext";
import { formatDate } from "../../../utils/dateUtils";
import StandaloneTaskModal from "../EventModal/StandaloneTaskModal";
import { useUI } from "../../../context/UIContext";
import { useEvents } from "../../../context/EventContext";
import Avatar from "../../common/Avatar/Avatar";
import { useNavigate } from "react-router-dom";

import "./Sidebar.css";

const SidebarMembers = () => {
  const { members } = useFamily();
  const { user } = useAuth();
  const { getMemberTask } = useEvents();
  const navigate = useNavigate();
  const {
    loading,
    isTaskModalOpen,
    openTaskModal,
    closeTaskModal,
    selectedMember,
    setSelectedMember,
    memberTasks,
    toggleMember
  } = useUI();

  // Auto-select current user on first load
  useEffect(() => {
    if (members.length && user) {
      const me = members.find(m => Number(m.id) === Number(user.id));
      if (me) {
        setSelectedMember(me);
        getMemberTask(me);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

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
      </div>

      {/* Member tasks — shown as its own section with divider */}
      {selectedMember && 
       (
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
                  <div key={task.id} className="sidebar-task">
                    <div
                      className="sidebar-task-dot"
                      style={{ background: selectedMember.color || "#1a8fa8" }}
                    />
                    <div className="sidebar-task-info">
                      <p className="sidebar-task-title">{task.title}</p>
                      <p className="sidebar-task-event">
                        {task.is_standalone
                          ? `📋 From ${task.created_by_name || "You"}`
                          : task.event_title}
                      </p>
                      <p className="sidebar-task-date">
                        {task.is_standalone
                          ? task.due_date
                            ? formatDate(new Date(task.due_date))
                            : "No due date"
                          : task.start_date
                          ? formatDate(new Date(task.start_date))
                          : "No date"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {Number(user?.id) === Number(selectedMember?.id) ? (
              <>
                <button className="sidebar-task-add" onClick={openTaskModal}>
                  + Add Task
                </button>
                <StandaloneTaskModal
                  isOpen={isTaskModalOpen}
                  onClose={closeTaskModal}
                />
              </>
            ) : (
              <></>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default SidebarMembers;
