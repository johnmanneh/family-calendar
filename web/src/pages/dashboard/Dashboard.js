import React, { useEffect } from "react";
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
  const { fetchEvents } = useEvents();
  const { setSelectedMember } = useUI();
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
    <div className="dashboard">
      <Sidebar />
      <div className="calendar-container">
        <CalendarView />
      </div>
      <EventDetails />
      <EventModal />
      <StandaloneTaskModal />
    </div>
  );
};

export default Dashboard;
