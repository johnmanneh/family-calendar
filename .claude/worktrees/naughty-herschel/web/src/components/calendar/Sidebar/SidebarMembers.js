import React, { useState } from "react";
import { useFamily } from "../../../context/FamilyContext";
import { useAuth } from "../../../context/AuthContext";
import { formatDate } from "../../../utils/dateUtils";
import StandaloneTaskModal from "../EventModal/StandaloneTaskModal";
import { useUI } from "../../../context/UIContext";
import { useEvents } from "../../../context/EventContext";

import "./Sidebar.css";

const SidebarMembers = () => {
  const { members } = useFamily();
  const { user } = useAuth();
  const { getMemberTask } = useEvents();
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

  const handleMemberClick = member => {
    toggleMember(member);
    getMemberTask(member);
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
              }`}
              onClick={() => handleMemberClick(member)}
            >
              <div
                className="sidebar-member-avatar"
                style={{ background: member.color || "#1a8fa8" }}
              >
                {member.first_name[0]}
                {member.last_name[0]}
              </div>
              <span className="sidebar-member-bubble-name">
                {member.first_name}
              </span>
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
