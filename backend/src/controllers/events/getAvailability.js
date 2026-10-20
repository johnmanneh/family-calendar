const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { eventAccess, canEditEvent } = require('../../utils/access');

/**
 * POST /api/events/availability
 * { start, end, user_ids: [..], family_id?, exclude_event_id?, tz? }
 * → { busy: [userId, ..], not_shared: [userId, ..], availability: [{ user_id, status }] }
 *
 * Who already has something in this time slot? Used by "Who's attending?" to
 * warn about conflicts, never prevent invitations. Only reports a person's
 * availability status — never source events, event IDs or source families.
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
function addStep(d, freq, tz, count = 1) {
  const wall = new Date(d.getTime() + tzOffsetMs(d, tz));   // local clock time, as UTC fields
  if (freq === 'daily') wall.setUTCDate(wall.getUTCDate() + count);
  else if (freq === 'weekly') wall.setUTCDate(wall.getUTCDate() + 7 * count);
  else if (freq === 'monthly') wall.setUTCMonth(wall.getUTCMonth() + count);
  else if (freq === 'yearly') wall.setUTCFullYear(wall.getUTCFullYear() + count);
  else return null;
  const guess = new Date(wall.getTime() - tzOffsetMs(wall, tz));
  return new Date(wall.getTime() - tzOffsetMs(guess, tz));
}

// Does any occurrence of this event overlap [winStart, winEnd)?
function overlaps(ev, winStart, winEnd, tz) {
  let start, end;
  let allDayDays = null;
  if (ev.is_all_day) {
    const firstDay = dateOnly(ev.start_date);
    start = localMidnight(firstDay, tz);
    const lastDay = ev.end_date ? dateOnly(ev.end_date) : dateOnly(ev.start_date);
    allDayDays = Math.max(1, Math.round((new Date(lastDay) - new Date(firstDay)) / DAY) + 1);
    const nextDay = new Date(lastDay);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    end = localMidnight(dateOnly(nextDay), tz);
  } else {
    start = new Date(ev.start_date);
    end = ev.end_date ? new Date(ev.end_date) : new Date(start.getTime() + 3600000);
  }
  const dur = Math.max(0, end - start);
  const untilDay = ev.recurrence_end_date ? new Date(dateOnly(ev.recurrence_end_date)) : null;
  if (untilDay) untilDay.setUTCDate(untilDay.getUTCDate() + 1);
  const until = untilDay ? localMidnight(dateOnly(untilDay), tz) : null;

  let cur = start;
  // Jump close to the window: old daily/weekly series must not become
  // apparently conflict-free after the iteration cap. Leave slack for DST.
  if (ev.recurrence === 'daily' || ev.recurrence === 'weekly') {
    const stepDays = ev.recurrence === 'daily' ? 1 : 7;
    const skip = Math.max(0, Math.floor((winStart - start - dur) / (stepDays * DAY)) - 2);
    if (skip) cur = addStep(start, ev.recurrence, tz, skip);
  }
  for (let i = 0; i < 2000 && cur && cur < winEnd; i++) {
    if (until && cur >= until) break;
    let occurrenceEnd = cur.getTime() + dur;
    if (allDayDays !== null) {
      const last = new Date(cur.getTime() + tzOffsetMs(cur, tz));
      last.setUTCDate(last.getUTCDate() + allDayDays);
      occurrenceEnd = localMidnight(dateOnly(last), tz).getTime();
    }
    if (cur < winEnd && occurrenceEnd > winStart.getTime()) return true;
    if (!ev.recurrence) break;
    cur = addStep(cur, ev.recurrence, tz);
  }
  return false;
}

const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;

const getAvailability = async (req, res) => {
  const viewerId = Number(req.user.id);
  const { start, end, user_ids, exclude_event_id, family_id } = req.body;
  const explicitFamily = family_id !== undefined && family_id !== null;
  let tz = req.body.tz || 'Europe/Zurich';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'Europe/Zurich'; }
  const winStart = new Date(start);
  const winEnd = new Date(end);
  if (!start || !end || isNaN(winStart) || isNaN(winEnd) || winEnd <= winStart || winEnd - winStart > 366 * DAY) {
    return errorResponse(res, 400, 'Provide a valid time window of at most 366 days');
  }
  if (!Array.isArray(user_ids) || user_ids.length > 100 || user_ids.some(id => !validId(id)) ||
      (explicitFamily && !validId(family_id))) {
    return errorResponse(res, 400, 'Provide valid family and user IDs (at most 100 people)');
  }
  const ids = [...new Set(user_ids.map(Number))];

  try {
    // Scope is the receiving family, not every family/group the viewer shares.
    // Legacy clients may omit family_id, but cannot receive cross-family data.
    const family = await pool.query(
      `SELECT fm.family_id FROM family_members fm
       WHERE fm.user_id = $1 AND ($2::int IS NULL OR fm.family_id = $2)
       ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
      [viewerId, explicitFamily ? Number(family_id) : null]
    );
    if (!family.rows.length) return errorResponse(res, 404, 'Family not found');
    const receivingFamilyId = Number(family.rows[0].family_id);
    const members = await pool.query(
      `SELECT fm.user_id, fm.share_availability, u.is_managed
       FROM family_members fm JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = $1 AND fm.user_id = ANY($2::int[])`,
      [receivingFamilyId, ids]
    );
    const allowedIds = members.rows.map(m => Number(m.user_id));
    const sharedIds = members.rows.filter(m => explicitFamily && m.share_availability === true && !m.is_managed)
      .map(m => Number(m.user_id));

    // Only an event the viewer can edit in this receiving family may be excluded.
    // Guessing a foreign event ID must produce exactly the result of omitting it.
    let excludedId = null;
    if (validId(exclude_event_id)) {
      const access = await eventAccess(viewerId, Number(exclude_event_id));
      if (access.event && Number(access.event.family_id) === receivingFamilyId && access.level === 'full' &&
          await canEditEvent(viewerId, access.event)) excludedId = Number(exclude_event_id);
    }

    const candidates = allowedIds.length ? await pool.query(
      `SELECT DISTINCT ON (e.id, p.user_id)
              p.user_id, e.id, e.family_id, e.created_by, e.owner_id, e.is_private,
              e.hide_cross_family_availability, e.start_date, e.end_date, e.is_all_day,
              e.recurrence, e.recurrence_end_date
       FROM events e
       JOIN (
         SELECT id AS event_id, COALESCE(owner_id, created_by) AS user_id FROM events
         UNION
         SELECT event_id, user_id FROM event_attendees WHERE status = 'accepted'
       ) p ON p.event_id = e.id
       WHERE p.user_id = ANY($1::int[])
         AND ($4::int IS NULL OR e.id <> $4)
         AND (e.family_id = $5 OR p.user_id = $6 OR p.user_id = ANY($7::int[]))
         AND COALESCE(e.status, 'confirmed') <> 'cancelled'
         AND e.start_date < $3::timestamp + interval '1 day'
         AND (e.recurrence IS NOT NULL
                AND (e.recurrence_end_date IS NULL OR e.recurrence_end_date >= $2::timestamp - interval '1 day')
              OR e.recurrence IS NULL
                AND COALESCE(e.end_date, e.start_date) >= $2::timestamp - interval '1 day')`,
      [allowedIds, winStart.toISOString(), winEnd.toISOString(), excludedId, receivingFamilyId, viewerId, sharedIds]
    ) : { rows: [] };

    const busy = new Set();
    for (const ev of candidates.rows) {
      const subjectId = Number(ev.user_id);
      if (busy.has(subjectId)) continue;
      if (subjectId !== viewerId) {
        if (Number(ev.family_id) === receivingFamilyId) {
          if ((await eventAccess(viewerId, ev)).level === 'none') continue;
        } else if (!sharedIds.includes(subjectId) || ev.hide_cross_family_availability) continue;
      }
      if (overlaps(ev, winStart, winEnd, tz)) busy.add(subjectId);
    }
    const availability = ids.map(user_id => ({ user_id,
      status: busy.has(user_id) ? 'busy' : allowedIds.includes(user_id) &&
        (user_id === viewerId || sharedIds.includes(user_id)) ? 'no_known_conflict' : 'not_shared' }));
    res.setHeader?.('Cache-Control', 'no-store');
    return successResponse(res, 200, 'Availability', {
      busy: availability.filter(a => a.status === 'busy').map(a => a.user_id),
      not_shared: availability.filter(a => a.status === 'not_shared').map(a => a.user_id),
      availability,
    });
  } catch (error) {
    console.error('getAvailability error:', error.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getAvailability;
