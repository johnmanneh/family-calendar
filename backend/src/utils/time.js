// Small timezone helpers (no extra dependencies)

function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'Europe/Zurich'; }
}

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

// "2026-10-20" + "08:00" in `tz` → exact UTC moment
function localToUtc(dateStr, timeStr, tz) {
  const guess = new Date(`${dateStr}T${timeStr || '00:00'}:00Z`);
  const first = new Date(guess.getTime() - tzOffsetMs(guess, tz));
  return new Date(guess.getTime() - tzOffsetMs(first, tz));
}

// Today's date (YYYY-MM-DD) in `tz`
function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

module.exports = { validTz, tzOffsetMs, localToUtc, todayIn };
