import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, useColorScheme } from 'react-native';
import { LIGHT, DARK } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Lives inside HomeScreen's topCard (marginHorizontal: 8)
const CELL = Math.floor((SCREEN_WIDTH - 16) / 7);
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Timezone-safe day match
function onSameDay(dateStr, day) {
  if (!dateStr) return false;
  // A Date object is already local — compare its local parts directly.
  // (toISOString() converts to UTC, which shifts midnight to the previous day
  //  in timezones ahead of UTC, e.g. tapping the 9th highlighted the 8th.)
  if (typeof dateStr !== 'string') {
    const dt = new Date(dateStr);
    return dt.getFullYear() === day.getFullYear() && dt.getMonth() === day.getMonth() && dt.getDate() === day.getDate();
  }
  const s = dateStr;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return y === day.getFullYear() && (m - 1) === day.getMonth() && d === day.getDate();
}

export default function MonthCalendar({ events = [], selectedDate, onSelectDate, onLongPressDate }) {
  const s = useColorScheme() === 'dark' ? darkS : lightS;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [display, setDisplay] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });

  const year  = display.getFullYear();
  const month = display.getMonth();

  // Grid starts on the Monday before (or on) the 1st of the month
  const firstDay   = new Date(year, month, 1);
  const startShift = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart  = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - startShift);

  // 6 weeks = 42 cells
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const monthLabel = display.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const prev = () => setDisplay(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setDisplay(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <View style={s.container}>

      {/* ── Month header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={prev} style={s.arrow}>
          <Text style={s.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={next} style={s.arrow}>
          <Text style={s.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Day-letter row ── */}
      <View style={s.letterRow}>
        {DAY_LETTERS.map((l, i) => (
          <View key={i} style={s.cell}>
            <Text style={s.letter}>{l}</Text>
          </View>
        ))}
      </View>

      {/* ── Date grid ── */}
      <View style={s.grid}>
        {days.map((day, i) => {
          const inMonth   = day.getMonth() === month;
          const isToday   = day.getTime() === today.getTime();
          const isSel     = selectedDate && onSameDay(selectedDate, day);
          const dayEvents = events.filter(e => onSameDay(e.start_date, day));
          const dots      = dayEvents.slice(0, 3);

          return (
            <TouchableOpacity
              key={i}
              style={s.cell}
              onPress={() => onSelectDate(day)}
              onLongPress={() => onLongPressDate?.(day)}
              delayLongPress={400}
              activeOpacity={0.7}
            >
              <View style={[
                s.circle,
                isSel   && s.circleSel,
                isToday && !isSel && s.circleToday,
              ]}>
                <Text style={[
                  s.num,
                  !inMonth && s.numFaded,
                  isSel    && s.numSel,
                  isToday && !isSel && s.numToday,
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={s.dots}>
                {dots.map((ev, j) => (
                  <View key={j} style={[s.dot, { backgroundColor: ev.color || '#1a8fa8' }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
}

// Theme-aware: c = LIGHT or DARK palette
const makeS = c => ({
  container: {
    // transparent — background/rounding come from HomeScreen's topCard
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  arrow: { padding: 8 },
  arrowText: { fontSize: 24, color: '#1a8fa8', fontWeight: '300', lineHeight: 26 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  letterRow: { flexDirection: 'row', paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, alignItems: 'center', paddingVertical: 2 },
  letter: { fontSize: 11, fontWeight: '600', color: c.textMuted },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  circleSel:   { backgroundColor: '#1a8fa8' },
  circleToday: { backgroundColor: 'rgba(26,143,168,0.12)' },
  num:       { fontSize: 13, fontWeight: '500', color: c.text },
  numFaded:  { color: c.textMuted },
  numSel:    { color: '#fff', fontWeight: '700' },
  numToday:  { color: '#1a8fa8', fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 1 },
  dot:  { width: 4, height: 4, borderRadius: 2 },
});

const lightS = makeS(LIGHT);
const darkS  = makeS(DARK);
