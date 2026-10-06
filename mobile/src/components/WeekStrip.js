import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH    = Math.floor(SCREEN_WIDTH / 7);
const MAX_CHIPS    = 3; // max event chips shown per day before "+N more"
const DAY_LETTERS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Converts "#1a8fa8" + alpha (0–1) → "rgba(26,143,168,0.12)"
// Used for chip backgrounds so each event takes its own colour
function hexToRgba(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(26,143,168,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  // Monday = day 1; for Sunday (0) go back 6 days
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// Reads YYYY-MM-DD from the stored ISO string directly — avoids timezone
// shifts that can push the date one day forward or back.
function onSameDay(dateStr, day) {
  if (!dateStr) return false;
  const s = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return (
    y === day.getFullYear() &&
    (m - 1) === day.getMonth() &&
    d === day.getDate()
  );
}

function shortTime(event) {
  if (event.is_all_day) return 'All day';
  const d = new Date(event.start_date);
  // "7pm", "8am", "12pm" — no minutes if on the hour
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2,'0')}${ampm}`;
}

function monthLabel(weekStart) {
  // If the week spans two months show both e.g. "Sep / Oct 2026"
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', year: 'numeric' };
  if (weekStart.getMonth() !== end.getMonth()) {
    return (
      weekStart.toLocaleDateString('en-GB', { month: 'short' }) +
      ' / ' +
      end.toLocaleDateString('en-GB', opts)
    );
  }
  return weekStart.toLocaleDateString('en-GB', opts);
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────

export default function WeekStrip({ events, selectedDate, onSelectDate, onLongPressDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState(() => getMonday(selectedDate || today));

  // Build the 7 days of this week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // ── Swipe left/right to change week ──────────────────────────────────────
  const panRef = useRef(null);
  const swipePan = useRef(
    PanResponder.create({
      // Only claim the gesture if horizontal movement dominates
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          // Swipe left → next week
          setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
        } else if (g.dx > 40) {
          // Swipe right → previous week
          setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
        }
      },
    })
  ).current;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container} {...swipePan.panHandlers}>

      {/* ── Month nav row ── */}
      <View style={styles.monthRow}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
        >
          <Text style={styles.monthArrowText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthLabel}>{monthLabel(weekStart)}</Text>

        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
        >
          <Text style={styles.monthArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Day columns ── */}
      <View style={styles.daysRow}>
        {weekDays.map((day, i) => {
          const isToday    = sameDay(day, today);
          const isSelected = sameDay(day, selectedDate || today);
          const dayEvents  = events.filter(e => onSameDay(e.start_date, day));
          const visible    = dayEvents.slice(0, MAX_CHIPS);
          const overflow   = dayEvents.length - visible.length;

          return (
            <TouchableOpacity
              key={i}
              style={styles.dayCol}
              onPress={() => onSelectDate(day)}
              onLongPress={() => onLongPressDate?.(day)}
              delayLongPress={400}
              activeOpacity={0.7}
            >
              {/* Day letter */}
              <Text style={[styles.dayLetter, isToday && styles.dayLetterToday]}>
                {DAY_LETTERS[day.getDay()][0]}
              </Text>

              {/* Date circle */}
              <View style={[
                styles.dateCircle,
                isSelected && styles.dateCircleSelected,
                isToday && !isSelected && styles.dateCircleToday,
              ]}>
                <Text style={[
                  styles.dateNum,
                  isSelected && styles.dateNumSelected,
                  isToday && !isSelected && styles.dateNumToday,
                ]}>
                  {day.getDate()}
                </Text>
              </View>

              {/* Event chips */}
              <View style={styles.chipsCol}>
                {visible.map((ev, j) => {
                  const evColor = ev.color || '#1a8fa8';
                  return (
                    <View
                      key={j}
                      style={[styles.chip, { backgroundColor: hexToRgba(evColor, 0.15) }]}
                    >
                      <View style={[styles.chipStripe, { backgroundColor: evColor }]} />
                      <View style={styles.chipText}>
                        <Text style={styles.chipTitle} numberOfLines={1}>{ev.title}</Text>
                        <Text style={[styles.chipTime, { color: evColor }]}>{shortTime(ev)}</Text>
                      </View>
                    </View>
                  );
                })}
                {overflow > 0 && (
                  <Text style={styles.overflow}>+{overflow}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    paddingBottom: 8,
  },

  // Month + arrows
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  monthArrow: {
    padding: 8,
  },
  monthArrowText: {
    fontSize: 22,
    color: '#1a8fa8',
    fontWeight: '300',
    lineHeight: 24,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d1d1f',
    letterSpacing: -0.2,
  },

  // Day columns
  daysRow: {
    flexDirection: 'row',
  },
  dayCol: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 2,
  },

  // Day letter (M T W T F S S)
  dayLetter: {
    fontSize: 11,
    fontWeight: '500',
    color: '#aeaeb2',
    marginBottom: 4,
  },
  dayLetterToday: {
    color: '#1a8fa8',
    fontWeight: '700',
  },

  // Date number circle
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dateCircleSelected: {
    backgroundColor: '#1a8fa8',
  },
  dateCircleToday: {
    backgroundColor: 'rgba(26,143,168,0.12)',
  },
  dateNum: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1d1d1f',
  },
  dateNumSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dateNumToday: {
    color: '#1a8fa8',
    fontWeight: '700',
  },

  // Event chips stacked in each day column
  chipsCol: {
    width: '100%',
    gap: 2,
  },
  chip: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    height: 32,
  },
  chipStripe: {
    width: 4,
  },
  chipText: {
    flex: 1,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  chipTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d1d1f',
    lineHeight: 13,
  },
  chipTime: {
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
  overflow: {
    fontSize: 9,
    color: '#1a8fa8',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
};
