/**
 * parseVoiceInput.js
 *
 * Pure JS, no API calls. Parses natural-language phrases like:
 *   "Dinner with John tomorrow at 7pm at Mario's restaurant"
 *   "Meeting Friday 3pm"
 *   "Doctor's appointment next Tuesday morning"
 *
 * Returns: { title, date, time, location }
 *   date → ISO string "YYYY-MM-DD" or null
 *   time → "HH:MM" (24h) or null
 */

// ── Day names ────────────────────────────────────────────────────────────────
const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const MONTHS   = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTHS_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Returns the next occurrence of a weekday (0=Sun…6=Sat) from today.
// If today IS that weekday, returns next week's occurrence.
function nextWeekday(targetDay) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = ((targetDay - now.getDay()) + 7) % 7 || 7;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return result;
}

// Next occurrence of a day-of-month (e.g. "the 15th")
function nextDayOfMonth(dayNum) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const candidate = new Date(now.getFullYear(), now.getMonth(), dayNum);
  if (candidate <= now) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

// ── Time resolution ──────────────────────────────────────────────────────────

// Maps word tokens → "HH:MM"
const TIME_WORDS = {
  morning:  '09:00',
  afternoon:'14:00',
  evening:  '19:00',
  tonight:  '19:00',
  night:    '21:00',
  noon:     '12:00',
  midday:   '12:00',
  midnight: '00:00',
};

/**
 * Tries to find a time in the input string.
 * Handles: 7pm, 7:30pm, 7:30am, 2:30, morning, afternoon …
 * Returns { time: "HH:MM", removeStr } or null.
 */
function extractTime(text) {
  // Numeric time: 7pm, 7:30pm, 7:30 AM, 14:30
  const numericRe = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi;
  let match;
  while ((match = numericRe.exec(text)) !== null) {
    const hourRaw = parseInt(match[1], 10);
    const mins    = match[2] ? parseInt(match[2], 10) : 0;
    const ampm    = match[3]?.toLowerCase();

    let hour = hourRaw;
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    // Heuristic: bare numbers like "2" without am/pm → assume pm if ≤ 6
    if (!ampm && hour <= 6 && hour >= 1) hour += 12;

    if (hour >= 0 && hour <= 23 && mins >= 0 && mins <= 59) {
      return { time: `${pad(hour)}:${pad(mins)}`, removeStr: match[0] };
    }
  }

  // Word-based times
  for (const [word, value] of Object.entries(TIME_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(text)) {
      return { time: value, removeStr: word };
    }
  }

  return null;
}

// ── Date resolution ──────────────────────────────────────────────────────────

/**
 * Tries to find a date expression in the input string.
 * Returns { date: "YYYY-MM-DD", removeStr } or null.
 */
function extractDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // today / tomorrow / yesterday
  if (/\btoday\b/.test(lower))     return { date: toISODate(now), removeStr: 'today' };
  if (/\btomorrow\b/.test(lower))  {
    const t = new Date(now); t.setDate(now.getDate() + 1);
    return { date: toISODate(t), removeStr: 'tomorrow' };
  }
  if (/\byesterday\b/.test(lower)) {
    const t = new Date(now); t.setDate(now.getDate() - 1);
    return { date: toISODate(t), removeStr: 'yesterday' };
  }

  // "next Monday" or bare "Monday"
  const nextDayRe = /\b(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const ndMatch = nextDayRe.exec(lower);
  if (ndMatch) {
    const dayIdx = WEEKDAYS.indexOf(ndMatch[1].toLowerCase());
    return { date: toISODate(nextWeekday(dayIdx)), removeStr: ndMatch[0] };
  }

  // "on the 15th" / "the 5th" / "15th"
  const ordinalRe = /\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i;
  const ordMatch = ordinalRe.exec(lower);
  if (ordMatch) {
    const day = parseInt(ordMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return { date: toISODate(nextDayOfMonth(day)), removeStr: ordMatch[0] };
    }
  }

  // "Jan 5" / "January 5" / "5th January" / "5 Jan"
  const allMonths = [...MONTHS, ...MONTHS_SHORT];
  for (let i = 0; i < allMonths.length; i++) {
    const mName = allMonths[i];
    const mIdx  = i % 12; // MONTHS has 12, MONTHS_SHORT has 12
    const re1 = new RegExp(`\\b${mName}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i');
    const re2 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${mName}\\b`, 'i');
    let m = re1.exec(lower) || re2.exec(lower);
    if (m) {
      const day = parseInt(m[1], 10);
      let year  = now.getFullYear();
      const candidate = new Date(year, mIdx, day);
      if (candidate < now) year++;
      return { date: toISODate(new Date(year, mIdx, day)), removeStr: m[0] };
    }
  }

  return null;
}

// ── Location extraction ──────────────────────────────────────────────────────

/**
 * Strips known date/time tokens from text first, then looks for
 * "at <place>" or "in <place>" where <place> looks like a proper noun
 * (starts with capital or is a multi-word phrase after the preposition).
 *
 * We work on the original-case text so we can detect capitals.
 * Returns { location: string, removeStr } or null.
 */
function extractLocation(text, alreadyRemoved) {
  // Remove already-extracted pieces so we don't confuse e.g. "at 7pm" with a location
  let working = text;
  for (const r of alreadyRemoved) {
    working = working.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }

  // "at <location>" — greedy up to end of string (location is usually last)
  const atRe = /\b(?:at|in)\s+([A-Z][^\.,!?]*)/g;
  let match;
  let best = null;
  while ((match = atRe.exec(working)) !== null) {
    // Prefer the last "at/in" match — usually the place, not the time
    best = { location: match[1].trim(), removeStr: match[0] };
  }
  return best;
}

// ── Title extraction ─────────────────────────────────────────────────────────

// Keywords that are not part of the title
const STRIP_WORDS = [
  'at','in','on','the','next','this','from','with','a','an','and',
  ...WEEKDAYS, ...MONTHS, ...MONTHS_SHORT,
  'today','tomorrow','yesterday','morning','afternoon','evening','tonight','night','noon','midday','midnight',
  'st','nd','rd','th',
];

function extractTitle(original, removedTokens) {
  let working = original;
  for (const r of removedTokens) {
    working = working.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // Collapse whitespace, trim punctuation
  working = working.replace(/\s{2,}/g, ' ').trim().replace(/[,\.!?]+$/, '');
  return working || original.split(' ').slice(0, 3).join(' ');
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * parseVoiceInput(text)
 * Returns { title, date, time, location }
 */
export default function parseVoiceInput(text) {
  if (!text || typeof text !== 'string') {
    return { title: '', date: null, time: null, location: null };
  }

  const removed = [];

  const dateResult = extractDate(text);
  if (dateResult) removed.push(dateResult.removeStr);

  const timeResult = extractTime(text);
  if (timeResult) removed.push(timeResult.removeStr);

  const locationResult = extractLocation(text, removed);
  if (locationResult) removed.push(locationResult.removeStr);

  const title = extractTitle(text, removed);

  return {
    title:    title    || '',
    date:     dateResult    ? dateResult.date       : null,
    time:     timeResult    ? timeResult.time       : null,
    location: locationResult ? locationResult.location : null,
  };
}
