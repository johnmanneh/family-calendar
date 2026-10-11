import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import API from '../api/axios';
import { useStyles } from '../styles/DayViewScreen.styles';

import TopCard from '../components/ui/TopCard';
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
  if (typeof dateStr !== 'string') {   // Date objects are local — compare local parts
    const dt = new Date(dateStr);
    return dt.getFullYear() === day.getFullYear() && dt.getMonth() === day.getMonth() && dt.getDate() === day.getDate();
  }
  const s = dateStr;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return y === day.getFullYear() && (m - 1) === day.getMonth() && d === day.getDate();
}

function formatHour(h) {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function dateLabel(date) {
  return date.toLocaleDateString(undefined, {
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
  const { t } = useTranslation();
  const styles = useStyles();
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

  // Re-fetch when returning from EventForm (after creating/editing an event)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchEvents);
    return unsubscribe;
  }, [navigation, fetchEvents]);

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
        <TopCard>
          <View style={styles.header}>
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
            </TouchableOpacity>
            <Text style={styles.title}>{dateLabel(date)}</Text>
            <View style={styles.back} />
          </View>
        </TopCard>

        {loading ? (
          <ActivityIndicator size="large" color="#1a8fa8" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* ── All-day strip ── */}
            {allDay.length > 0 && (
              <View style={styles.allDayRow}>
                <Text style={styles.allDayLabel}>{t('common.all_day')}</Text>
                <View style={styles.allDayEvents}>
                  {allDay.map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.allDayChip, { backgroundColor: ev.color || '#1a8fa8' }]}
                      onPress={ev.is_busy ? undefined : () => navigation.navigate('EventDetails', { eventId: ev.id })}
                      disabled={!!ev.is_busy}
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

                {/* Hour rows — long-press a slot to create an event at that time */}
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={styles.hourRow}
                    activeOpacity={1}
                    delayLongPress={400}
                    onLongPress={() => {
                      const d = new Date(date);
                      d.setHours(h, 0, 0, 0);
                      navigation.navigate('EventForm', { date: d.toISOString() });
                    }}
                  >
                    <Text style={styles.hourLabel}>{formatHour(h)}</Text>
                    <View style={styles.hourLine} />
                  </TouchableOpacity>
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
                      onPress={ev.is_busy ? undefined : () => navigation.navigate('EventDetails', { eventId: ev.id })}
                      disabled={!!ev.is_busy}
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
                  <Text style={styles.empty}>{t('dayview.no_events')}</Text>
                )}

              </View>
            </ScrollView>
          </>
        )}

      </SafeAreaView>
    </View>
  );
}

