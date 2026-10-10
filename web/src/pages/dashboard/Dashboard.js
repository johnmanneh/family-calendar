import React, { useEffect, useState } from "react";
import useIsPhone from "../../hooks/useIsPhone";
import { useLocation, useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/AuthContext";
import { useFamily } from "../../context/FamilyContext";
import { useEvents } from "../../context/EventContext";
import Sidebar from "../../components/calendar/Sidebar/Sidebar";
import CalendarView from "../../components/calendar/CalendarView/CalendarView";
import EventDetails from "../../components/calendar/EventDetails/EventDetails";
import EventModal from "../../components/calendar/EventModal/EventModal";
import StandaloneTaskModal from "../../components/calendar/EventModal/StandaloneTaskModal";

import "./Dashboard.css";

const Dashboard = () => {
  const { fetchFamily, members } = useFamily();
  const { fetchEvents, selectedEvent, setSelectedEvent } = useEvents();
  const { setSelectedMember, openNewEvent } = useUI();

  // ── Phone layout ──────────────────────────────────────────────────────────
  // Below 768px: header bar + full-width calendar, sidebar as a slide-in drawer,
  // event details as a full-screen sheet, and a floating + button.
  const isPhone = useIsPhone();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Opening an event (e.g. from a notification in the drawer) closes the drawer
  useEffect(() => { if (selectedEvent) setDrawerOpen(false); }, [selectedEvent]);
  const location = useLocation();
  const navigate = useNavigate();

  // "See all <name>'s events" on a profile → open the calendar filtered to them
  useEffect(() => {
    const id = location.state?.focusMemberId;
    if (id == null || members.length === 0) return;
    const m = members.find(x => Number(x.id) === Number(id));
    if (m) setSelectedMember(m);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, members]);

  useEffect(() => {
    fetchFamily();
    fetchEvents();
  }, []);

  return (
    <div className={`dashboard${isPhone ? " dashboard--phone" : ""}`}>
      {/* Phone header: ☰ · WHEN */}
      {isPhone && (
        <header className="dashboard-phone-header">
          <button className="dashboard-phone-menu" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="dashboard-phone-title">WHEN</span>
          <span style={{ width: 40 }} />
        </header>
      )}

      {/* Sidebar — a column on desktop, a slide-in drawer on phones */}
      <div className={`dashboard-sidebar${drawerOpen ? " open" : ""}`}>
        <Sidebar />
      </div>
      {isPhone && drawerOpen && (
        <div className="dashboard-backdrop" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="calendar-container">
        <CalendarView />
      </div>

      {/* Event details — right column on desktop, full-screen sheet on phones */}
      <div className={`dashboard-details${selectedEvent ? " has-event" : ""}`}>
        {isPhone && selectedEvent && (
          <button className="dashboard-details-back" onClick={() => setSelectedEvent(null)}>
            ← Back
          </button>
        )}
        <EventDetails />
      </div>

      {/* Phone: floating + for a new event */}
      {isPhone && !selectedEvent && (
        <button className="dashboard-fab" onClick={() => openNewEvent()} aria-label="New event">
          +
        </button>
      )}

      <EventModal />
      <StandaloneTaskModal />
    </div>
  );
};

export default Dashboard;
