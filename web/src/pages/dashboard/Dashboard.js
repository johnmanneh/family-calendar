import React, { useEffect, useState } from "react";
import useIsPhone from "../../hooks/useIsPhone";
import Icon from "../../components/common/Icon/Icon";
import SidebarNotifications from "../../components/calendar/Sidebar/SidebarNotifications";
import SidebarChat from "../../components/calendar/Sidebar/SidebarChat";
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
  const { setSelectedMember, openNewEvent, setSearchQuery, setSelectedCategory } = useUI();
  const { fetchNotifications } = useEvents();

  // ── Phone layout ──────────────────────────────────────────────────────────
  // Below 768px: header bar + full-width calendar, sidebar as a slide-in drawer,
  // event details as a full-screen sheet, and a floating + button.
  const isPhone = useIsPhone();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Header icons, like the app: 🔍 shows search + category chips, 💬 / 🔔 open full sheets
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheet, setSheet] = useState(null);          // 'notifications' | 'chat' | null
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchNotifications().then(d => setUnread(d.unread_count || 0)).catch(() => {});
  }, [sheet]);

  const toggleSearch = () => {
    if (searchOpen) { setSearchQuery(''); setSelectedCategory(''); }   // closing clears the filter
    setSearchOpen(o => !o);
  };
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
          <div className="dashboard-phone-actions">
            <button className={`dashboard-phone-icon${searchOpen ? " active" : ""}`} onClick={toggleSearch} aria-label="Search">
              <Icon name="search" size={21} />
            </button>
            <button className="dashboard-phone-icon" onClick={() => setSheet("chat")} aria-label="Family chat">
              <Icon name="chat" size={21} />
            </button>
            <button className="dashboard-phone-icon" onClick={() => setSheet("notifications")} aria-label="Notifications">
              <Icon name="bell" size={21} />
              {unread > 0 && <span className="dashboard-phone-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
          </div>
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
        <CalendarView showSearch={!isPhone || searchOpen} autoFocusSearch={isPhone && searchOpen} />
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

      {/* Phone: notifications / chat as full-screen sheets */}
      {isPhone && sheet && (
        <div className="dashboard-sheet">
          <div className="dashboard-sheet-header">
            <button className="dashboard-details-back" onClick={() => setSheet(null)}>← Back</button>
            <span className="dashboard-sheet-title">{sheet === "chat" ? "Family Chat" : "Notifications"}</span>
            <span style={{ width: 60 }} />
          </div>
          <div className="dashboard-sheet-body" onClick={e => {
            // Opening an event from a notification closes the sheet
            if (sheet === "notifications" && e.target.closest(".sidebar-notif-item")) setTimeout(() => setSheet(null), 0);
          }}>
            {sheet === "chat"
              ? <SidebarChat startOpen />
              : <SidebarNotifications startOpen onUnreadChange={setUnread} />}
          </div>
        </div>
      )}

      {/* Phone: floating + for a new event */}
      {isPhone && !selectedEvent && !sheet && (
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
