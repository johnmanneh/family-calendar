import React, { useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { useEvents } from "../../../context/EventContext";
import {useUI} from "../../../context/UIContext";
import "./CalendarView.css";


const CalendarView = () => {
  const { openNewEvent} = useUI();
  const { events, fetchEvents, selectEvent } = useEvents();

  useEffect(() => {
    fetchEvents();
  }, []);

  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start_date,
    end: event.end_date,
    backgroundColor: event.color || "#1a8fa8",
    borderColor: event.color || "#1a8fa8",
    extendedProps: {
      location: event.location,
      category: event.category,
      priority: event.priority,
      notes: event.notes,
      video_call_link: event.video_call_link,
      updated_by_name: event.updated_by_name,
      updated_at: event.updated_at,
      attendees: event.attendees || []
    }
  }));

  const renderEventContent = (eventInfo) => {
    const { event, timeText } = eventInfo;
    const attendees = event.extendedProps.attendees || [];

    return (
      <div className="fc-event-custom">
        <div className="fc-event-main-row">
          {timeText && <span className="fc-event-time-custom">{timeText}</span>}
          <span className="fc-event-title-custom">{event.title}</span>
        </div>
        {attendees.length > 0 && (
          <div className="fc-event-avatars">
            {attendees.slice(0, 4).map(a => (
              <div
                key={a.id}
                className="fc-event-avatar"
                style={{ background: a.color || "#1a8fa8" }}
                title={`${a.first_name} ${a.last_name}`}
              >
                {a.first_name[0]}{a.last_name[0]}
              </div>
            ))}
            {attendees.length > 4 && (
              <div className="fc-event-avatar fc-event-avatar-more">
                +{attendees.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleEventClick = clickInfo => {
    selectEvent(clickInfo.event);
  };

  const handleDateClick = (info) => {
    let localDate = info.dateStr.substring(0, 16);
    if (localDate.length === 10) localDate = localDate + 'T00:00';
    openNewEvent(localDate);
  };

  return (
    <div className="calendar-view">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        eventSources={[{ events: calendarEvents }]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridDay,timeGridWeek,dayGridMonth,listYear"
        }}
        height="100%"
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
      />
    </div>
  );
};

export default CalendarView;
