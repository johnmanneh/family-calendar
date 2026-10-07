/**
 * parseVoiceInput.js
 *
 * Pure JS, no API calls. Parses natural-language phrases in English and German.
 *
 * English examples:
 *   "Dinner with John tomorrow at 7pm at Mario's restaurant"
 *   "Tell James to buy bread when coming home"
 *   "Create a task buy milk"
 *
 * German examples:
 *   "Erstelle einen Football Termin für freitags"
 *   "Sag James er soll Brot kaufen"
 *   "Morgen um 9 Uhr Arzttermin"
 *
 * Returns: { intent, title, date, time, location, assigneeName }
 *   intent      → 'event' | 'task' | 'unknown'
 *   date        → "YYYY-MM-DD" or null
 *   time        → "HH:MM" (24h) or null
 *   location    → string or null
 *   assigneeName → string (from "Tell James to…") or null
 */

// ── Day names ─────────────────────────────────────────────────────────────────
const WEEKDAYS       = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const WEEKDAYS_DE    = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
const MONTHS         = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTHS_SHORT   = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// German recurring day suffix: "freitags" → every Friday (index 5)
const DE_RECURRING_DAYS = {
  sonntags: 0, montags: 1, dienstags: 2, mittwochs: 3,
  donnerstags: 4, freitags: 5, samstags: 6,
};

// ── Intent keywords ───────────────────────────────────────────────────────────
const EVENT_KEYWORDS = [
  // English
  'appointment','meeting','event','schedule','conference','session','call','sync',
  // German
  'termin','besprechung','treffen','verabredung','sitzung','konferenz',
];

const TASK_KEYWORDS = [
  // English
  'task','todo','to-do','remind','reminder','buy','get','pick up','call back',
  'email','send','finish','complete','check','fix','clean','wash','pay',
  // German
  'aufgabe','erinnerung','erledigen','kaufen','kaufe','besorgen','besorge',
  'schick','ruf an','bezahl','reinige','mach',
];

// "Tell/Ask/Remind [Name] to [action]"
const TELL_PATTERN_EN = /\b(?:tell|ask|remind)\s+(\w+)\s+to\s+(.+)/i;
// "Sag/Bitte/Erinnere [Name] (er/sie soll/dass/zu) [action]"
const TELL_PATTERN_DE = /\b(?:sag|bitte|erinnere)\s+(\w+)\s+(?:er soll|sie soll|dass|er|sie|zu)\s+(.+)/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextWeekday(targetDay) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = ((targetDay - now.getDay()) + 7) % 7 || 7;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return result;
}

function nextDayOfMonth(dayNum) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const candidate = new Date(now.getFullYear(), now.getMonth(), dayNum);
  if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(text) {
  const lower = text.toLowerCase();

  // "Tell/Sag [Name] to/er soll" → always a task
  if (TELL_PATTERN_EN.test(text) || TELL_PATTERN_DE.test(text)) return 'task';

  // Explicit task keywords
  for (const kw of TASK_KEYWORDS) {
    if (lower.includes(kw)) return 'task';
  }

  // Explicit event keywords
  for (const kw of EVENT_KEYWORDS) {
    if (lower.includes(kw)) return 'event';
  }

  return 'unknown';
}

// ── Assignee extraction ───────────────────────────────────────────────────────

/**
 * Extracts assignee name and task action from "Tell James to buy bread"
 * or "Sag James er soll Brot kaufen"
 * Returns { assigneeName, taskBody } or null
 */
function extractAssignee(text) {
  const enMatch = TELL_PATTERN_EN.exec(text);
  if (enMatch) return { assigneeName: enMatch[1], taskBody: enMatch[2].trim() };

  const deMatch = TELL_PATTERN_DE.exec(text);
  if (deMatch) return { assigneeName: deMatch[1], taskBody: deMatch[2].trim() };

  return null;
}

// ── Time resolution ───────────────────────────────────────────────────────────

const TIME_WORDS = {
  morning:   '09:00',
  afternoon: '14:00',
  evening:   '19:00',
  tonight:   '19:00',
  night:     '21:00',
  noon:      '12:00',
  midday:    '12:00',
  midnight:  '00:00',
  // German
  morgens:   '09:00',
  mittags:   '12:00',
  abends:    '19:00',
  nachts:    '21:00',
};

function extractTime(text) {
  // "um 9 Uhr" / "um 9:30 Uhr" (German)
  const uhrRe = /\bum\s+(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?\b/i;
  const uhrMatch = uhrRe.exec(text);
  if (uhrMatch) {
    const h = parseInt(uhrMatch[1], 10);
    const m = uhrMatch[2] ? parseInt(uhrMatch[2], 10) : 0;
    if (h >= 0 && h <= 23) return { time: `${pad(h)}:${pad(m)}`, removeStr: uhrMatch[0] };
  }

  // Numeric: 7pm, 7:30pm, 7:30 AM, 14:30
  const numericRe = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi;
  let match;
  while ((match = numericRe.exec(text)) !== null) {
    const hourRaw = parseInt(match[1], 10);
    const mins    = match[2] ? parseInt(match[2], 10) : 0;
    const ampm    = match[3]?.toLowerCase();
    let hour = hourRaw;
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    if (!ampm && hour <= 6 && hour >= 1) hour += 12;
    if (hour >= 0 && hour <= 23 && mins >= 0 && mins <= 59) {
      return { time: `${pad(hour)}:${pad(mins)}`, removeStr: match[0] };
    }
  }

  // Word-based
  for (const [word, value] of Object.entries(TIME_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      return { time: value, removeStr: word };
    }
  }

  return null;
}

// ── Date resolution ───────────────────────────────────────────────────────────

function extractDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // English relative
  if (/\btoday\b/.test(lower))    return { date: toISODate(now), removeStr: 'today', recurrence: null };
  if (/\btomorrow\b/.test(lower)) {
    const t = new Date(now); t.setDate(now.getDate() + 1);
    return { date: toISODate(t), removeStr: 'tomorrow', recurrence: null };
  }
  if (/\byesterday\b/.test(lower)) {
    const t = new Date(now); t.setDate(now.getDate() - 1);
    return { date: toISODate(t), removeStr: 'yesterday', recurrence: null };
  }

  // German relative
  if (/\bheute\b/.test(lower))    return { date: toISODate(now), removeStr: 'heute', recurrence: null };
  if (/\bmorgen\b/.test(lower)) {
    const t = new Date(now); t.setDate(now.getDate() + 1);
    return { date: toISODate(t), removeStr: 'morgen', recurrence: null };
  }
  if (/\bübermorgen\b/.test(lower)) {
    const t = new Date(now); t.setDate(now.getDate() + 2);
    return { date: toISODate(t), removeStr: 'übermorgen', recurrence: null };
  }
  if (/\bgestern\b/.test(lower)) {
    const t = new Date(now); t.setDate(now.getDate() - 1);
    return { date: toISODate(t), removeStr: 'gestern', recurrence: null };
  }

  // German recurring: "freitags", "montags" etc. → next occurrence + recurrence
  for (const [word, dayIdx] of Object.entries(DE_RECURRING_DAYS)) {
    if (lower.includes(word)) {
      return {
        date: toISODate(nextWeekday(dayIdx)),
        removeStr: word,
        recurrence: `FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][dayIdx]}`,
      };
    }
  }

  // English/German weekday: "next Monday" / "nächsten Montag" / "am Freitag"
  const nextDayRe = /\b(?:next\s+|nächsten?\s+|am\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag)\b/i;
  const ndMatch = nextDayRe.exec(lower);
  if (ndMatch) {
    const dayName = ndMatch[1].toLowerCase();
    const dayIdx = WEEKDAYS.indexOf(dayName) !== -1
      ? WEEKDAYS.indexOf(dayName)
      : WEEKDAYS_DE.indexOf(dayName);
    if (dayIdx !== -1) {
      return { date: toISODate(nextWeekday(dayIdx)), removeStr: ndMatch[0], recurrence: null };
    }
  }

  // "on the 15th" / "the 5th" / "15th"
  const ordinalRe = /\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i;
  const ordMatch = ordinalRe.exec(lower);
  if (ordMatch) {
    const day = parseInt(ordMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return { date: toISODate(nextDayOfMonth(day)), removeStr: ordMatch[0], recurrence: null };
    }
  }

  // "Jan 5" / "January 5" / "5th January"
  const allMonths = [...MONTHS, ...MONTHS_SHORT];
  for (let i = 0; i < allMonths.length; i++) {
    const mName = allMonths[i];
    const mIdx  = i % 12;
    const re1 = new RegExp(`\\b${mName}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i');
    const re2 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${mName}\\b`, 'i');
    const m = re1.exec(lower) || re2.exec(lower);
    if (m) {
      const day = parseInt(m[1], 10);
      let year  = now.getFullYear();
      if (new Date(year, mIdx, day) < now) year++;
      return { date: toISODate(new Date(year, mIdx, day)), removeStr: m[0], recurrence: null };
    }
  }

  return null;
}

// ── Location extraction ───────────────────────────────────────────────────────

function extractLocation(text, alreadyRemoved) {
  let working = text;
  for (const r of alreadyRemoved) {
    working = working.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  const atRe = /\b(?:at|in|bei|im|in der|in dem)\s+([A-Z][^\.,!?]*)/g;
  let match, best = null;
  while ((match = atRe.exec(working)) !== null) {
    best = { location: match[1].trim(), removeStr: match[0] };
  }
  return best;
}

// ── Title extraction ──────────────────────────────────────────────────────────

const STRIP_WORDS = [
  // command words to strip
  'create','add','new','make','erstelle','erstell','neuen','neues','einen','eine','ein',
  'schedule','set up','plan',
  // connectors
  'at','in','on','the','next','this','from','with','a','an','and','for','fur','für',
  'um','am','mir','me','please','bitte',
  ...WEEKDAYS, ...WEEKDAYS_DE, ...MONTHS, ...MONTHS_SHORT,
  'today','tomorrow','yesterday','heute','morgen','gestern','übermorgen',
  'morning','afternoon','evening','tonight','night','noon','midday','midnight',
  'morgens','mittags','abends','nachts',
  'st','nd','rd','th','uhr',
];

function extractTitle(original, removedTokens) {
  let working = original;
  for (const r of removedTokens) {
    working = working.replace(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // Strip leading command words
  const stripRe = new RegExp(`^\\s*(${STRIP_WORDS.join('|')})\\s+`, 'gi');
  let prev;
  do { prev = working; working = working.replace(stripRe, ' '); } while (working !== prev);

  working = working.replace(/\s{2,}/g, ' ').trim().replace(/[,\.!?]+$/, '');
  return working || original.split(' ').slice(0, 3).join(' ');
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * parseVoiceInput(text)
 * Returns { intent, title, date, time, location, recurrence, assigneeName }
 */
export default function parseVoiceInput(text) {
  if (!text || typeof text !== 'string') {
    return { intent: 'unknown', title: '', date: null, time: null, location: null, recurrence: null, assigneeName: null };
  }

  const intent = detectIntent(text);
  const removed = [];

  // "Tell James to buy bread" — extract assignee and use taskBody as title source
  const assigneeResult = extractAssignee(text);
  let workingText = text;
  let assigneeName = null;
  if (assigneeResult) {
    assigneeName = assigneeResult.assigneeName;
    workingText  = assigneeResult.taskBody; // parse title/date/time from the action part
  }

  const dateResult = extractDate(workingText);
  if (dateResult) removed.push(dateResult.removeStr);

  const timeResult = extractTime(workingText);
  if (timeResult) removed.push(timeResult.removeStr);

  const locationResult = extractLocation(workingText, removed);
  if (locationResult) removed.push(locationResult.removeStr);

  const title = extractTitle(workingText, removed);

  return {
    intent,
    title:       title || '',
    date:        dateResult     ? dateResult.date        : null,
    time:        timeResult     ? timeResult.time        : null,
    location:    locationResult ? locationResult.location : null,
    recurrence:  dateResult     ? dateResult.recurrence  : null,
    assigneeName,
  };
}
