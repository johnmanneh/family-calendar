// ─── parseDateMentions ────────────────────────────────────────────────────────
// Scans a chat message body and splits it into plain-text and date segments.
//
// Recognised patterns (case-insensitive):
//   "25 Dec"  "25th December"  "December 25"  "Dec 25th"
//   Any of the above optionally followed by a 4-digit year
//   Any of the above optionally followed by "at 3pm" / "at 3:30pm" / "at 15:00"
//
// Returns: Array<{ type: 'text', value: string }
//               | { type: 'date', value: string, date: Date }>
//
// Dates in the past (without an explicit year) are bumped to the next year
// so tapping always pre-fills a future event.

const MONTHS = {
  jan:0, january:0, feb:1, february:1, mar:2, march:2,
  apr:3, april:3, may:4, jun:5, june:5, jul:6, july:6,
  aug:7, august:7, sep:8, september:8, oct:9, october:9,
  nov:10, november:10, dec:11, december:11,
};

const M  = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORD  = '(?:st|nd|rd|th)?';
const YR   = '(?:\\s+(\\d{4}))?';
const TIME = '(?:\\s+at\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?)?';

// Two alternations:
//   A: "25 Dec [2024] [at 3pm]"   — groups 1=day  2=month 3=year 4=h 5=m 6=ampm
//   B: "Dec 25 [2024] [at 3pm]"   — groups 7=month 8=day  9=year 10=h 11=m 12=ampm
const PATTERN = new RegExp(
  `\\b(\\d{1,2})${ORD}\\s+${M}${YR}${TIME}|${M}\\s+(\\d{1,2})${ORD}${YR}${TIME}`,
  'gi'
);

function buildDate(day, monthStr, yearStr, hourStr, minStr, ampm, hadExplicitYear) {
  const month = MONTHS[monthStr.toLowerCase()];
  if (month === undefined) return null;

  const d   = parseInt(day,     10);
  let   h   = hourStr ? parseInt(hourStr, 10) : 9;   // default 9am
  const m   = minStr  ? parseInt(minStr,  10) : 0;
  const yr  = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  if (ampm) {
    const ap = ampm.toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  }

  if (d < 1 || d > 31 || h > 23 || m > 59) return null;

  const date = new Date(yr, month, d, h, m, 0, 0);

  // Bump to next year if the date is in the past and no explicit year was given
  if (!hadExplicitYear && date < new Date()) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}

export function parseDateMentions(text) {
  const segments = [];
  let lastIndex  = 0;

  // Fresh regex instance so lastIndex starts at 0
  const re = new RegExp(PATTERN.source, 'gi');
  let match;

  while ((match = re.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const [, day1, mon1, yr1, h1, m1, ap1, mon2, day2, yr2, h2, m2, ap2] = match;
    const isA = !!day1;

    const date = isA
      ? buildDate(day1, mon1, yr1, h1, m1, ap1, !!yr1)
      : buildDate(day2, mon2, yr2, h2, m2, ap2, !!yr2);

    if (date) {
      segments.push({ type: 'date', value: match[0], date });
    } else {
      segments.push({ type: 'text', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
