import React from "react";
import { useEvents } from "../../../context/EventContext";
import EventDetailsEmpty from "./EventDetailsEmpty";
import EventDetailsView from "./EventDetailsView";
import "./EventDetails.css";

const EventDetails = () => {
  const {selectedEvent} = useEvents();
  if (!selectedEvent) {
    return <EventDetailsEmpty />;
  }
  return <EventDetailsView />;
};

export default EventDetails;
