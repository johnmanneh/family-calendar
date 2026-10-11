import React, { useMemo, useRef, useState } from "react";
import Icon from "../../common/Icon/Icon";
import "./PhoneCalendar.css";

// ─── Phone calendar ──────────────────────────────────────────────────────────
// Same idea as the native app: a compact month grid with a coloured dot per
// event, and the selected day's events as cards underneath.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAY_MS = 86400000;

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// All-day events are stored as a date: read the date part as a local day
const parseStart = e =>
  e.is_all_day && e.start_date ? new Date(`${e.start_date.slice(0, 10)}T00:00:00`) : new Date(e.start_date);
const parseEnd = (e, start) => {
  if (!e.end_date) return e.is_all_day ? new Date(start.getTime() + DAY_MS - 1) : start;
  if (e.is_all_day) return new Date(new Date(`${e.end_date.slice(0, 10)}T00:00:00`).getTime() + DAY_MS - 1);
  return new Date(e.end_date);
};

// Every occurrence of an event that touches [from, to)
const occurrences = (e, from, to) => {
  const start = parseStart(e);
  if (isNaN(start)) return [];
  const end = parseEnd(e, start);
  const dur = Math.max(0, end - start);
  const until = e.recurrence_end_date
    ? new Date(new Date(`${e.recurrence_end_date.slice(0, 10)}T23:59:59`))
    : null;

  if (!e.recurrence) return end >= from && start < to ? [{ start, end }] : [];

  const out = [];
  const cur = new Date(start);
  for (let i = 0; i < 1000 && cur < to; i++) {
    if (until && cur > until) break;
    const oEnd = new Date(cur.getTime() + dur);
    if (oEnd >= from) out.push({ start: new Date(cur), end: oEnd });
    if (e.recurrence === "daily") cur.setDate(cur.getDate() + 1);
    else if (e.recurrence === "weekly") cur.setDate(cur.getDate() + 7);
    else if (e.recurrence === "monthly") cur.setMonth(cur.getMonth() + 1);
    else if (e.recurrence === "yearly") cur.setFullYear(cur.getFullYear() + 1);
    else break;
  }
  return out;
};

const fmtTime = d => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const PhoneCalendar = ({ events, onOpen, onAdd }) => {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  // 6 weeks, Monday first
  const gridStart = useMemo(() => {
    const offset = (month.getDay() + 6) % 7;
    return new Date(month.getFullYear(), month.getMonth(), 1 - offset);
  }, [month]);
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) =>
      new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)),
    [gridStart]
  );

  // Occurrences per day for the visible grid
  const byDay = useMemo(() => {
    const from = days[0];
    const to = new Date(days[41].getTime() + DAY_MS);
    const map = {};
    events.forEach(e => {
      occurrences(e, from, to).forEach(o => {
        // put a multi-day event on every day it covers
        let d = startOfDay(o.start < from ? from : o.start);
        const last = o.end > o.start ? new Date(o.end.getTime() - 1) : o.end;
        while (d <= last || sameDay(d, o.start)) {
          (map[dayKey(d)] = map[dayKey(d)] || []).push({ e, ...o });
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
          if (d >= to) break;
        }
      });
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) => (b.e.is_all_day ? 1 : 0) - (a.e.is_all_day ? 1 : 0) || a.start - b.start));
    return map;
  }, [events, days]);

  const dayList = byDay[dayKey(selected)] || [];

  const go = delta => setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const goToday = () => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today); };
  const pick = d => {
    setSelected(d);
    if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Swipe the grid left/right to change month
  const touch = useRef(null);
  const onTouchStart = ev => { touch.current = ev.touches[0].clientX; };
  const onTouchEnd = ev => {
    if (touch.current == null) return;
    const dx = ev.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  const addOnSelected = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    onAdd(`${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}T${pad(now.getHours())}:00`);
  };

  return (
    <div className="pcal">
      {/* ── Month card ── */}
      <div className="pcal-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="pcal-head">
          <button className="pcal-nav" onClick={() => go(-1)} aria-label="Previous month">‹</button>
          <div className="pcal-title">
            {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <button className="pcal-nav" onClick={() => go(1)} aria-label="Next month">›</button>
          {!sameDay(selected, today) || month.getMonth() !== today.getMonth() ? (
            <button className="pcal-today" onClick={goToday}>Today</button>
          ) : null}
        </div>

        <div className="pcal-weekdays">
          {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
        </div>

        <div className="pcal-grid">
          {days.map(d => {
            const list = byDay[dayKey(d)] || [];
            const colors = [...new Set(list.map(x => (x.e.is_busy ? "#b0b0b8" : x.e.color || "#1a8fa8")))].slice(0, 3);
            const cls = [
              "pcal-day",
              d.getMonth() !== month.getMonth() && "is-out",
              sameDay(d, today) && "is-today",
              sameDay(d, selected) && "is-selected",
            ].filter(Boolean).join(" ");
            return (
              <button key={dayKey(d)} className={cls} onClick={() => pick(d)}>
                <span className="pcal-num">{d.getDate()}</span>
                <span className="pcal-dots">
                  {colors.map(c => <i key={c} style={{ background: c }} />)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected day ── */}
      <div className="pcal-dayhead">
        <span>
          {sameDay(selected, today) ? "Today · " : ""}
          {selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <div className="pcal-list">
        {dayList.length === 0 ? (
          <button className="pcal-empty" onClick={addOnSelected}>
            <Icon name="calendar" size={18} />
            <span>Nothing planned — tap to add</span>
          </button>
        ) : (
          dayList.map(({ e, start, end }) => {
            const color = e.is_busy ? "#b0b0b8" : e.color || "#1a8fa8";
            const multiDay = !sameDay(start, end) && !e.is_all_day;
            const time = e.is_all_day
              ? "All day"
              : multiDay
                ? (sameDay(start, selected) ? `from ${fmtTime(start)}` : sameDay(end, selected) ? `until ${fmtTime(end)}` : "All day")
                : `${fmtTime(start)}${end > start ? ` – ${fmtTime(end)}` : ""}`;
            const attendees = e.attendees || [];
            return (
              <button
                key={`${e.id}-${start.getTime()}`}
                className={`pcal-event${e.is_busy ? " is-busy" : ""}`}
                style={{ "--ev": color }}
                onClick={() => !e.is_busy && onOpen(e, start, end)}
              >
                <span className="pcal-bar" />
                <span className="pcal-ev-body">
                  <span className="pcal-ev-time">{time}</span>
                  <span className="pcal-ev-title">
                    {(e.is_private || e.is_busy) && <Icon name="lock" size={12} />}
                    {e.is_busy ? (e.title || "Busy") : e.title}
                  </span>
                  {!e.is_busy && (e.location || e.from_group || (e.group_ids || []).length > 0) && (
                    <span className="pcal-ev-meta">
                      {e.location && <><Icon name="mapPin" size={11} /> {e.location}</>}
                      {(e.group_ids || []).length > 0 && <><Icon name="users" size={11} /> Group</>}
                    </span>
                  )}
                </span>
                {!e.is_busy && attendees.length > 0 && (
                  <span className="pcal-avatars">
                    {attendees.slice(0, 3).map(a => (
                      <span key={a.id} className="pcal-avatar" style={{ background: a.color || "#1a8fa8" }}>
                        {(a.first_name || "?")[0]}{(a.last_name || "")[0] || ""}
                      </span>
                    ))}
                    {attendees.length > 3 && <span className="pcal-avatar more">+{attendees.length - 3}</span>}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PhoneCalendar;
