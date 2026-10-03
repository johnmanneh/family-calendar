import React, { useEffect } from "react";
import { useEvents } from "../../../context/EventContext";
import { formatDate } from "../../../utils/dateUtils";
import { useAuth } from "../../../context/AuthContext";
import { useUI } from "../../../context/UIContext";
import { useFamily } from "../../../context/FamilyContext";
import TimeRoller from "../../common/TimeRoller/TimeRoller";

import StandaloneTaskModal from "../EventModal/StandaloneTaskModal";
import "./Sidebar.css";

const SidebarTasks = () => {
  const { isTaskModalOpen, openTaskModal, closeTaskModal } = useUI();
  const { members } = useFamily();
  const { myTasks, fetchMyTasks, completeTask, updateTaskDueDate } = useEvents();
  const { user } = useAuth();

  const currentMember = members.find(m => m.id === user?.id);
  const accentColor = currentMember?.color || "#1a8fa8";

  useEffect(() => {
    fetchMyTasks();
  }, []);

  return (
    <div className="sidebar-section">
      <p className="sidebar-label">{user?.first_name?.toUpperCase()}'S TASKS</p>

      {myTasks.length === 0 ? (
        <p className="sidebar-tasks-empty">All clear — no upcoming tasks.</p>
      ) : (
        <div className="sidebar-task-list">
          {myTasks.map(task => {
            const isUndated = task.is_standalone && !task.due_date;
            const dateLabel = isUndated
              ? null
              : task.is_standalone
                ? formatDate(new Date(task.due_date))
                : formatDate(new Date(task.start_date));

            // Show arrival time roller on tasks assigned by someone else
            const isAssignedByOther = task.created_by && Number(task.created_by) !== Number(user?.id);

            return (
              <div key={task.id} className="sidebar-task-card">
                <div
                  className="sidebar-task-accent"
                  style={{ background: accentColor }}
                />
                <div className="sidebar-task-body">
                  <p className="sidebar-task-title">{task.title}</p>
                  <p className="sidebar-task-sub">
                    {task.is_standalone
                      ? task.created_by_name && isAssignedByOther
                        ? `From ${task.created_by_name}`
                        : "Personal task"
                      : task.event_title}
                  </p>
                  {isUndated ? (
                    <span className="sidebar-task-badge-pending">Pending</span>
                  ) : (
                    <span className="sidebar-task-date">{dateLabel}</span>
                  )}

                  {isAssignedByOther && (
                    <div className="sidebar-task-timeslot">
                      <span className="sidebar-task-timeslot-label">Arrival time</span>
                      <TimeRoller
                        value={
                          task.due_date
                            ? new Date(task.due_date).toTimeString().substring(0, 5)
                            : task.start_date
                              ? new Date(task.start_date).toTimeString().substring(0, 5)
                              : "08:00"
                        }
                        onChange={time => {
                          const base = task.due_date
                            ? new Date(task.due_date).toISOString().substring(0, 10)
                            : task.start_date
                              ? new Date(task.start_date).toISOString().substring(0, 10)
                              : new Date().toISOString().substring(0, 10);
                          updateTaskDueDate(task.id, `${base}T${time}`);
                        }}
                      />
                    </div>
                  )}
                </div>
                <button
                  className="sidebar-task-complete"
                  title="Mark as done"
                  onClick={() => completeTask(task.id)}
                  style={{ '--accent': accentColor }}
                />
              </div>
            );
          })}
        </div>
      )}

      <button className="sidebar-task-add" onClick={openTaskModal}>
        + New Task
      </button>
      <StandaloneTaskModal isOpen={isTaskModalOpen} onClose={closeTaskModal} />
    </div>
  );
};

export default SidebarTasks;
