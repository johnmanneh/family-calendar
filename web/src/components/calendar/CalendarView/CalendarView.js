import React, { useEffect, useState } from "react";
import { useEvents } from "../../../context/EventContext";
import { useUI } from "../../../context/UIContext";
import CalendarToolbar from "./CalendarToolbar";
import { useGroups } from "../../../context/GroupContext";
import { useFamily } from "../../../context/FamilyContext";
import PhoneCalendar from "./PhoneCalendar";
import "./CalendarView.css";

const CalendarView = ({ showSearch = true, autoFocusSearch = false }) => {
  const { openNewEvent, selectedMember, searchQuery, selectedCategory } = useUI();
  const { events, fetchEvents, selectEvent, setSelectedEvent } = useEvents();
  const { groups } = useGroups();
  const { members = [] } = useFamily();
  const kids = members.filter(m => m.is_managed);

  // Scope: 'all' · 'kid:<id>' · 'family' · <groupId>
  const [scope, setScope] = useState('all');
  useEffect(() => {
    if (typeof scope === 'number' && !groups.some(g => Number(g.id) === scope)) setScope('all');
    if (typeof scope === 'string' && scope.startsWith('kid:') && !kids.some(k => `kid:${k.id}` === scope)) setScope('all');
  }, [groups, members]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const scopeFiltered =
    scope === 'all'    ? events :
    scope === 'family' ? events.filter(e => !e.from_group) :
    String(scope).startsWith('kid:') ? events.filter(e => {
      const kid = Number(String(scope).slice(4));
      return Number(e.owner_id) === kid ||
        (e.attendees || []).some(a => Number(a.id ?? a.user_id) === kid);
    }) :
    events.filter(e => (e.group_ids || []).map(Number).includes(Number(scope)));

  const memberFiltered = selectedMember
    ? scopeFiltered.filter(event => {
        const isCreator = Number(event.created_by) === Number(selectedMember.id) ||
          Number(event.owner_id) === Number(selectedMember.id);
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

  // Build an object that EventDetails understands: id, title, start, end, extendedProps
  const openFromPhone = (event, start, end) => {
    selectEvent({
      id: String(event.id),
      title: event.title,
      start,
      end,
      allDay: !!event.is_all_day,
      extendedProps: { ...event },
    });
  };

  return (
    <div className="calendar-view calendar-view--phone">
      <CalendarToolbar
        scope={scope}
        setScope={setScope}
        groups={groups}
        kids={kids}
        showSearch={showSearch}
        autoFocusSearch={autoFocusSearch}
      />
      <PhoneCalendar
        events={visibleEvents}
        onOpen={openFromPhone}
        onAdd={openNewEvent}
        onDayPick={() => setSelectedEvent(null)}
        scope={scope}
        setScope={setScope}
        groups={groups}
        kids={kids}
      />
    </div>
  );
};

export default CalendarView;
