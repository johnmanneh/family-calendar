import React, { useEffect } from "react";
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
  const { fetchFamily } = useFamily();
  const { fetchEvents } = useEvents();

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
