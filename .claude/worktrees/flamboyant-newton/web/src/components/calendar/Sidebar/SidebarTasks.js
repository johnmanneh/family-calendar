import React, { useEffect, useState } from "react";
import { useEvents } from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../utils/dateUtils";
import { useAuth } from "../../../context/AuthContext";
import { useUI } from "../../../context/UIContext";
import { useFamily } from "../../../context/FamilyContext";

import StandaloneTaskModal from "../EventModal/StandaloneTaskModal";
import "./Sidebar.css";

const SidebarTasks = () => {
  const { isTaskModalOpen, openTaskModal, closeTaskModal } = useUI();
  const { members } = useFamily();

  //
  const { myTasks, fetchMyTasks, completeTask } = useEvents();
  const { user } = useAuth();

  const currentMember = members.find(m => m.id === user?.id);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  return (
    <div className="sidebar-section">
      <p className="sidebar-label">{user?.first_name?.toUpperCase()}'S TASKS</p>
      {myTasks.length === 0 ? (
        <p className="sidebar-tasks-empty">No tasks this week 🎉</p>
      ) : (
        myTasks.map(task => {
          const isUndated = task.is_standalone && !task.due_date;
          return (
            <div key={task.id} className="sidebar-task">
              <div
                className="sidebar-task-dot"
                style={{ background: currentMember?.color || "#1a8fa8" }}
              />
              <div className="sidebar-task-info">
                <p className="sidebar-task-title">{task.title}</p>
                <p className="sidebar-task-event">
                  {task.is_standalone
                    ? `📋 From ${task.created_by_name || "You"}`
                    : task.event_title}
                </p>
                <p className="sidebar-task-date">
                  {isUndated
                    ? <span className="sidebar-task-pending">Pending</span>
                    : task.is_standalone
                      ? formatDate(new Date(task.due_date))
                      : formatDate(new Date(task.start_date))}
                </p>
              </div>
              <button
                className="sidebar-task-done"
                title="Mark as done"
                onClick={() => completeTask(task.id)}
              >✓</button>
            </div>
          );
        })
      )}
      <button className="sidebar-task-add" onClick={openTaskModal}>
        + Add Task
      </button>
      <StandaloneTaskModal isOpen={isTaskModalOpen} onClose={closeTaskModal} />
    </div>
  );
};

export default SidebarTasks;
