/** Pure date helpers for the event form pickers (unit-tested, no React Native). */

/** Day from `day`, hour/minute from `time` — the Android time step can't drop the picked day. */
export function mergeDateAndTime(day, time) {
  const merged = new Date(day);
  merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return merged;
}

/**
 * New end date after the start moved. If the old end is no longer after the new
 * start, keep the event's previous length (1 hour fallback for timed events).
 * All-day events may start and end on the same day.
 */
export function endAfterStartChange(oldStart, oldEnd, newStart, allDay = false) {
  const stillValid = allDay ? oldEnd >= newStart : oldEnd > newStart;
  if (stillValid) return oldEnd;
  const length = oldEnd - oldStart;
  const fallback = allDay ? 0 : 3600000;
  return new Date(newStart.getTime() + (length > 0 ? length : fallback));
}
