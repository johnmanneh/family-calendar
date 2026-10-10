import React, { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import rrulePlugin from "@fullcalendar/rrule";
import { useEvents } from "../../../context/EventContext";
import { useUI } from "../../../context/UIContext";
import CalendarToolbar from "./CalendarToolbar";
import { useGroups } from "../../../context/GroupContext";
import { useAuth } from "../../../context/AuthContext";
import Icon from "../../common/Icon/Icon";
import useIsPhone from "../../../hooks/useIsPhone";
import PhoneCalendar from "./PhoneCalendar";
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

const CalendarView = ({ showSearch = true, autoFocusSearch = false }) => {
  const { openNewEvent, openEditEvent, selectedMember, searchQuery, selectedCategory } = useUI();
  const { events, fetchEvents, selectEvent } = useEvents();
  const { groups } = useGroups();
  const isPhone = useIsPhone();
  const { user } = useAuth();

  // Scope: 'all' (family + groups) · 'family' · <groupId>  — same as the mobile chips
  const [scope, setScope] = useState('all');
  useEffect(() => {
    if (typeof scope === 'number' && !groups.some(g => Number(g.id) === scope)) setScope('all');
  }, [groups]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const scopeFiltered =
    scope === 'all'    ? events :
    scope === 'family' ? events.filter(e => !e.from_group) :
    events.filter(e => (e.group_ids || []).map(Number).includes(Number(scope)));

  const memberFiltered = selectedMember
    ? scopeFiltered.filter(event => {
        const isCreator = Number(event.created_by) === Number(selectedMember.id);
        const isAttendee = (event.attendees || []).some(
          a => Number(a.id) === Number(selectedMember.id)
        );
        return isCreator || isAttendee;
      })
    : scopeFiltered;

  const q = searchQuery.trim().toLowerCase();
  const visibleEvents = memberFiltered.filter(event => {
    if (selectedCategory && event.category !== selectedCategory) return false;
    if (q) {
      const inTitle    = (event.title    || '').toLowerCase().includes(q);
      const inLocation = (event.location || '').toLowerCase().includes(q);
      const inNotes    = (event.notes    || '').toLowerCase().includes(q);
      if (!inTitle && !inLocation && !inNotes) return false;
    }
    return true;
  });

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
        attendees: event.attendees || [],
        group_ids: event.group_ids || [],
        from_group: !!event.from_group
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
            <span className="fc-event-title-custom"><Icon name="lock" size={11} /> Busy</span>
          </div>
        </div>
      );
    }

    return (
      <div className="fc-event-custom">
        <div className="fc-event-main-row">
          {timeText && <span className="fc-event-time-custom">{timeText}</span>}
          <span className="fc-event-title-custom">
            {event.extendedProps.is_private && <><Icon name="lock" size={11} /> </>}
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

  const lastClick = useRef({ id: null, time: 0 });

  const handleEventClick = clickInfo => {
    clickInfo.jsEvent.stopPropagation();
    if (clickInfo.event.extendedProps.is_busy) return;

    const now = Date.now();
    const isSame = lastClick.current.id === clickInfo.event.id;
    const isDouble = isSame && (now - lastClick.current.time) < 350;

    selectEvent(clickInfo.event);

    const isMine = Number(clickInfo.event.extendedProps.created_by) === Number(user?.id);
    if (isDouble && isMine) {          // only the creator can edit
      openEditEvent();
      lastClick.current = { id: null, time: 0 };
    } else {
      lastClick.current = { id: clickInfo.event.id, time: now };
    }
  };

  const handleDateClick = (info) => {
    // Don't open new event modal if the click was on an existing event
    if (info.jsEvent.target.closest('.fc-event')) return;

    let localDate = info.dateStr.substring(0, 16);
    if (localDate.length === 10) {
      // Day click — default to current time
      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      localDate = `${localDate}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    openNewEvent(localDate);
  };

  // Phone: month grid + day cards. Builds the same object FullCalendar hands to
  // eventClick, so the details sheet works unchanged.
  const openFromPhone = (event, start, end) => {
    const fc = calendarEvents.find(c => c.id === String(event.id));
    if (!fc) return;
    selectEvent({ ...fc, start, end, allDay: !!event.is_all_day });
  };

  if (isPhone) {
    return (
      <div className="calendar-view calendar-view--phone">
        <CalendarToolbar scope={scope} setScope={setScope} groups={groups} showSearch={showSearch} autoFocusSearch={autoFocusSearch} />
        <PhoneCalendar events={visibleEvents} onOpen={openFromPhone} onAdd={openNewEvent} />
      </div>
    );
  }

  return (
    <div className="calendar-view">
      <CalendarToolbar scope={scope} setScope={setScope} groups={groups} showSearch={showSearch} autoFocusSearch={autoFocusSearch} />
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
        eventSources={[{ events: calendarEvents }]}
        // Phones start on a list of the week — a month grid is too cramped
        key={isPhone ? "phone" : "desktop"}
        initialView={isPhone ? "listWeek" : "dayGridMonth"}
        headerToolbar={isPhone ? {
          left: "prev,next",
          center: "title",
          right: "listWeek,dayGridMonth"
        } : {
          left: "prev,next today",
          center: "title",
          right: "timeGridDay,timeGridWeek,dayGridMonth,listYear"
        }}
        buttonText={isPhone ? { listWeek: "List", dayGridMonth: "Month" } : undefined}
        height="100%"
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
      />
    </div>
  );
};

export default CalendarView;
