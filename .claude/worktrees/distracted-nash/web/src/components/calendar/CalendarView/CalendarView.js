import React, { useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import rrulePlugin from "@fullcalendar/rrule";
import { useEvents } from "../../../context/EventContext";
import { useUI } from "../../../context/UIContext";
import "./CalendarView.css";

// Map recurrence value + start_date to an rrule string
const buildRRule = (recurrence, start_date, recurrence_end_date) => {
  if (!recurrence || !start_date) return null;

  const dtstart = new Date(start_date);
  const pad = n => String(n).padStart(2, "0");
  const dtStr =
    `${dtstart.getUTCFullYear()}${pad(dtstart.getUTCMonth() + 1)}${pad(dtstart.getUTCDate())}` +
    `T${pad(dtstart.getUTCHours())}${pad(dtstart.getUTCMinutes())}00Z`;

  const freqMap = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
    yearly: "YEARLY"
  };

  let rule = `DTSTART:${dtStr}\nRRULE:FREQ=${freqMap[recurrence]}`;

  if (recurrence_end_date) {
    const until = new Date(recurrence_end_date);
    const untilStr =
      `${until.getUTCFullYear()}${pad(until.getUTCMonth() + 1)}${pad(until.getUTCDate())}T235959Z`;
    rule += `;UNTIL=${untilStr}`;
  }

  return rule;
};

const CalendarView = () => {
  const { openNewEvent, selectedMember } = useUI();
  const { events, fetchEvents, selectEvent } = useEvents();

  useEffect(() => {
    fetchEvents();
  }, []);

  const visibleEvents = selectedMember
    ? events.filter(event => {
        const isCreator = Number(event.created_by) === Number(selectedMember.id);
        const isAttendee = (event.attendees || []).some(
          a => Number(a.id) === Number(selectedMember.id)
        );
        return isCreator || isAttendee;
      })
    : events;

  const calendarEvents = visibleEvents.map(event => {
    const rrule = buildRRule(event.recurrence, event.start_date, event.recurrence_end_date);
    const base = {
      id: String(event.id),
      title: event.title,
      backgroundColor: event.color || "#1a8fa8",
      borderColor: event.color || "#1a8fa8",
      allDay: event.is_all_day || false,
      extendedProps: {
        location: event.location,
        category: event.category,
        priority: event.priority,
        notes: event.notes,
        video_call_link: event.video_call_link,
        updated_by_name: event.updated_by_name,
        updated_at: event.updated_at,
        is_all_day: event.is_all_day,
        is_private: event.is_private,
        is_busy: event.is_busy,
        recurrence: event.recurrence,
        recurrence_end_date: event.recurrence_end_date,
        status: event.status,
        created_by: event.created_by,
        attendees: event.attendees || []
      }
    };

    if (rrule) {
      // Recurring event — FullCalendar rrule plugin takes over start/end
      const startDt = new Date(event.start_date);
      const endDt = new Date(event.end_date);
      const durationMs = endDt - startDt;
      const durationHrs = Math.floor(durationMs / 3600000);
      const durationMins = Math.floor((durationMs % 3600000) / 60000);
      return {
        ...base,
        rrule,
        duration: `${String(durationHrs).padStart(2, "0")}:${String(durationMins).padStart(2, "0")}`
      };
    }

    return {
      ...base,
      start: event.start_date,
      end: event.end_date
    };
  });

  const renderEventContent = (eventInfo) => {
    const { event, timeText } = eventInfo;
    const attendees = event.extendedProps.attendees || [];
    const isBusy = event.extendedProps.is_busy;

    if (isBusy) {
      return (
        <div className="fc-event-custom fc-event-busy">
          <div className="fc-event-main-row">
            {timeText && <span className="fc-event-time-custom">{timeText}</span>}
            <span className="fc-event-title-custom">🔒 Busy</span>
          </div>
        </div>
      );
    }

    return (
      <div className="fc-event-custom">
        <div className="fc-event-main-row">
          {timeText && <span className="fc-event-time-custom">{timeText}</span>}
          <span className="fc-event-title-custom">
            {event.extendedProps.is_private && "🔒 "}
            {event.title}
          </span>
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
    if (clickInfo.event.extendedProps.is_busy) return;
    selectEvent(clickInfo.event);
  };

  const handleDateClick = (info) => {
    let localDate = info.dateStr.substring(0, 16);
    if (localDate.length === 10) localDate = localDate + "T00:00";
    openNewEvent(localDate);
  };

  return (
    <div className="calendar-view">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
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
