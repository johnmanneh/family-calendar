const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

/**
 * POST /api/events/availability
 * { start, end, user_ids: [..], exclude_event_id?, tz? }  →  { busy: [userId, ..] }
 *
 * Who already has something in this time slot? Used by "Who's attending?" to
 * grey people out as Busy. Only says busy/free — never what the event is.
 * Counts events a person created or accepted (pending invitations don't block),
 * including recurring and all-day events.
 */

const DAY = 86400000;

// Offset of an IANA timezone from UTC at a given moment, in ms
function tzOffsetMs(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const g = t => Number(parts.find(p => p.type === t).value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - date.getTime();
}

// "2026-10-17" in the viewer's timezone → that day's midnight as a UTC moment
function localMidnight(dateStr, tz) {
  const guess = new Date(`${dateStr}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(guess, tz));
}

const dateOnly = d => new Date(d).toISOString().slice(0, 10);

// Next occurrence, stepped in the viewer's local time so a 07:00 weekly event
// stays at 07:00 across daylight-saving changes (same as the calendar shows it)
function addStep(d, freq, tz) {
  const wall = new Date(d.getTime() + tzOffsetMs(d, tz));   // local clock time, as UTC fields
  if (freq === 'daily') wall.setUTCDate(wall.getUTCDate() + 1);
  else if (freq === 'weekly') wall.setUTCDate(wall.getUTCDate() + 7);
  else if (freq === 'monthly') wall.setUTCMonth(wall.getUTCMonth() + 1);
  else if (freq === 'yearly') wall.setUTCFullYear(wall.getUTCFullYear() + 1);
  else return null;
  const guess = new Date(wall.getTime() - tzOffsetMs(wall, tz));
  return new Date(wall.getTime() - tzOffsetMs(guess, tz));
}

// Does any occurrence of this event overlap [winStart, winEnd)?
function overlaps(ev, winStart, winEnd, tz) {
  let start, end;
  if (ev.is_all_day) {
    start = localMidnight(dateOnly(ev.start_date), tz);
    const lastDay = ev.end_date ? dateOnly(ev.end_date) : dateOnly(ev.start_date);
    end = new Date(localMidnight(lastDay, tz).getTime() + DAY);
  } else {
    start = new Date(ev.start_date);
    end = ev.end_date ? new Date(ev.end_date) : new Date(start.getTime() + 3600000);
  }
  const dur = Math.max(0, end - start);
  const until = ev.recurrence_end_date
    ? new Date(localMidnight(dateOnly(ev.recurrence_end_date), tz).getTime() + DAY)
    : null;

  let cur = start;
  for (let i = 0; i < 2000 && cur && cur < winEnd; i++) {
    if (until && cur >= until) break;
    if (cur < winEnd && cur.getTime() + dur > winStart.getTime()) return true;
    if (!ev.recurrence) break;
    cur = addStep(cur, ev.recurrence, tz);
  }
  return false;
}

const getAvailability = async (req, res) => {
  const userId = req.user.id;
  const { start, end, user_ids, exclude_event_id } = req.body;
  let tz = req.body.tz || 'Europe/Zurich';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'Europe/Zurich'; }

  const winStart = new Date(start);
  const winEnd = new Date(end || start);
  if (isNaN(winStart) || isNaN(winEnd)) return errorResponse(res, 400, 'start and end are required');
  if (winEnd <= winStart) winEnd.setTime(winStart.getTime() + 60000);
  const ids = [...new Set((user_ids || []).map(Number).filter(Boolean))].slice(0, 100);
  if (ids.length === 0) return successResponse(res, 200, 'Availability', { busy: [] });

  try {
    // Only people you share a family or a group with (or yourself)
    const allowed = await pool.query(
      `SELECT u FROM unnest($2::int[]) AS u
       WHERE u = $1
          OR EXISTS (SELECT 1 FROM family_members a JOIN family_members b ON b.family_id = a.family_id
                     WHERE a.user_id = $1 AND b.user_id = u)
          OR EXISTS (SELECT 1 FROM group_members a JOIN group_members b ON b.group_id = a.group_id
                     WHERE a.user_id = $1 AND b.user_id = u)`,
      [userId, ids]
    );
    const allowedIds = allowed.rows.map(r => Number(r.u));
    if (allowedIds.length === 0) return successResponse(res, 200, 'Availability', { busy: [] });

    // Candidate events (a day of slack each side for all-day/timezone edges)
    const rows = await pool.query(
      `SELECT DISTINCT ON (e.id, p.user_id)
              p.user_id, e.id, e.start_date, e.end_date, e.is_all_day, e.recurrence, e.recurrence_end_date
       FROM events e
       JOIN (
         SELECT id AS event_id, created_by AS user_id FROM events
         UNION
         SELECT event_id, user_id FROM event_attendees WHERE status = 'accepted'
       ) p ON p.event_id = e.id
       WHERE p.user_id = ANY($1::int[])
         AND ($4::int IS NULL OR e.id <> $4::int)
         AND COALESCE(e.status, 'confirmed') <> 'cancelled'
         AND e.start_date < $3::timestamp + interval '1 day'
         AND (
           e.recurrence IS NOT NULL
             AND (e.recurrence_end_date IS NULL OR e.recurrence_end_date >= $2::timestamp - interval '1 day')
           OR e.recurrence IS NULL
             AND COALESCE(e.end_date, e.start_date) >= $2::timestamp - interval '1 day'
         )`,
      [allowedIds, winStart.toISOString(), winEnd.toISOString(), exclude_event_id ? Number(exclude_event_id) : null]
    );

    const busy = new Set();
    for (const ev of rows.rows) {
      if (busy.has(Number(ev.user_id))) continue;
      if (overlaps(ev, winStart, winEnd, tz)) busy.add(Number(ev.user_id));
    }
    return successResponse(res, 200, 'Availability', { busy: [...busy] });
  } catch (error) {
    console.error('getAvailability error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getAvailability;
