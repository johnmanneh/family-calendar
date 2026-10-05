import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;    // px per hour
const START_HOUR  = 6;     // grid starts at 6am
const END_HOUR    = 23;    // grid ends at 11pm
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TIME_COL    = 44;    // width of the hour label column
const SCREEN_W    = Dimensions.get('window').width;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function onSameDay(dateStr, day) {
  if (!dateStr) return false;
  const s = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return y === day.getFullYear() && (m - 1) === day.getMonth() && d === day.getDate();
}

function formatHour(h) {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function dateLabel(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// Convert an event to top + height within the grid
function eventGeometry(event) {
  const start = new Date(event.start_date);
  const end   = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 60 * 60 * 1000);

  const startH = start.getHours() + start.getMinutes() / 60;
  const endH   = end.getHours()   + end.getMinutes()   / 60;

  const top    = Math.max(0, startH - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max(HOUR_HEIGHT * 0.5, (endH - startH) * HOUR_HEIGHT);

  return { top, height };
}

// ─── DayViewScreen ───────────────────────────────────────────────────────────

export default function DayViewScreen({ route, navigation }) {
  const { dateStr } = route.params;
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await API.get('/events');
      const all = res.data.events || [];
      setEvents(all.filter(e => onSameDay(e.start_date, date) || e.is_all_day && onSameDay(e.start_date, date)));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Scroll to current hour (or 8am) after load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const now = new Date();
      const scrollTo = onSameDay(now.toISOString(), date)
        ? Math.max(0, (now.getHours() - 1 - START_HOUR) * HOUR_HEIGHT)
        : (8 - START_HOUR) * HOUR_HEIGHT;
      setTimeout(() => scrollRef.current?.scrollTo({ y: scrollTo, animated: false }), 100);
    }
  }, [loading]);

  const allDay  = events.filter(e => e.is_all_day);
  const timed   = events.filter(e => !e.is_all_day);
  const gridW   = SCREEN_W - TIME_COL;

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
          </TouchableOpacity>
          <Text style={styles.title}>{dateLabel(date)}</Text>
          <View style={styles.back} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1a8fa8" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* ── All-day strip ── */}
            {allDay.length > 0 && (
              <View style={styles.allDayRow}>
                <Text style={styles.allDayLabel}>All day</Text>
                <View style={styles.allDayEvents}>
                  {allDay.map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.allDayChip, { backgroundColor: ev.color || '#1a8fa8' }]}
                      onPress={() => navigation.navigate('EventDetails', { eventId: ev.id })}
                    >
                      <Text style={styles.allDayChipText} numberOfLines={1}>{ev.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Time grid ── */}
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
              <View style={styles.grid}>

                {/* Hour rows */}
                {HOURS.map(h => (
                  <View key={h} style={styles.hourRow}>
                    <Text style={styles.hourLabel}>{formatHour(h)}</Text>
                    <View style={styles.hourLine} />
                  </View>
                ))}

                {/* Current time indicator */}
                {onSameDay(new Date().toISOString(), date) && (() => {
                  const now = new Date();
                  const y = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT;
                  return (
                    <View style={[styles.nowLine, { top: y }]}>
                      <View style={styles.nowDot} />
                      <View style={styles.nowBar} />
                    </View>
                  );
                })()}

                {/* Event blocks */}
                {timed.map(ev => {
                  const { top, height } = eventGeometry(ev);
                  const color = ev.color || '#1a8fa8';
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.eventBlock, {
                        top,
                        height,
                        left: TIME_COL + 4,
                        width: gridW - 8,
                        backgroundColor: color + '22',
                        borderLeftColor: color,
                      }]}
                      onPress={() => navigation.navigate('EventDetails', { eventId: ev.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.eventTitle, { color }]} numberOfLines={1}>{ev.title}</Text>
                      <Text style={[styles.eventTime, { color }]}>
                        {new Date(ev.start_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {ev.end_date && ` – ${new Date(ev.end_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Empty state */}
                {timed.length === 0 && allDay.length === 0 && (
                  <Text style={styles.empty}>No events</Text>
                )}

              </View>
            </ScrollView>
          </>
        )}

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f2f2f7' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  back:  { width: 40, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#1d1d1f', flex: 1, textAlign: 'center' },

  allDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  allDayLabel:  { fontSize: 11, color: '#8e8e93', width: TIME_COL - 12 },
  allDayEvents: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  allDayChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  allDayChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  grid: {
    position: 'relative',
    backgroundColor: '#fff',
    marginTop: 4,
  },

  hourRow: {
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 0,
  },
  hourLabel: {
    width: TIME_COL,
    fontSize: 11,
    color: '#8e8e93',
    textAlign: 'right',
    paddingRight: 8,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5ea',
    marginTop: 0,
  },

  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    marginLeft: TIME_COL - 4,
  },
  nowBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#ff3b30',
  },

  eventBlock: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  eventTitle: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  eventTime:  { fontSize: 10, fontWeight: '500', lineHeight: 14, marginTop: 1 },

  empty: {
    textAlign: 'center',
    color: '#aeaeb2',
    fontSize: 14,
    marginTop: 80,
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
