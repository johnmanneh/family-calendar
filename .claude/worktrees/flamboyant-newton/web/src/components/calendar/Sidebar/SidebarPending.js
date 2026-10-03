import React, { useState } from "react";
import { useUI } from "../../../context/UIContext";
import { useEvents } from "../../../context/EventContext";
import { formatDate } from "../../../utils/dateUtils";
import "./Sidebar.css";

const SidebarPending = () => {
  const { pendingInvitations } = useUI();
  const { respondToEventInvitation } = useEvents();
  const [respondingId, setRespondingId] = useState(null);

  if (!pendingInvitations || pendingInvitations.length === 0) return null;

  const handleRespond = async (eventId, response) => {
    setRespondingId(eventId);
    try {
      await respondToEventInvitation(eventId, response);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <>
      <div className="sidebar-section">
        <p className="sidebar-label">PENDING</p>
        <div className="sidebar-pending-list">
          {pendingInvitations.map(inv => (
            <div key={inv.id} className="sidebar-pending-item">
              <div
                className="sidebar-pending-color"
                style={{ background: inv.color || "#1a8fa8" }}
              />
              <div className="sidebar-pending-info">
                <p className="sidebar-pending-title">{inv.title}</p>
                <p className="sidebar-pending-meta">
                  {formatDate(new Date(inv.start_date))}
                </p>
                <p className="sidebar-pending-from">
                  from {inv.created_by_name} {inv.created_by_last_name}
                </p>
              </div>
              <div className="sidebar-pending-actions">
                <button
                  className="sidebar-pending-accept"
                  disabled={respondingId === inv.id}
                  onClick={() => handleRespond(inv.id, 'accepted')}
                  title="Accept"
                >✓</button>
                <button
                  className="sidebar-pending-deny"
                  disabled={respondingId === inv.id}
                  onClick={() => handleRespond(inv.id, 'denied')}
                  title="Decline"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-divider" />
    </>
  );
};

export default SidebarPending;
