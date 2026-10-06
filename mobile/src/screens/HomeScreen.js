import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  View,
  Text,
  Animated,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DrawerMenu from '../components/DrawerMenu';
import WeekStrip from '../components/WeekStrip';
import MonthCalendar from '../components/MonthCalendar';
import styles from '../styles/HomeScreen.styles';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useSSE } from '../context/SSEContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Formats a datetime string to "9:00 AM" — returns "All day" for all-day events
function formatTime(event) {
  if (event.is_all_day) return 'All day';
  const d = new Date(event.start_date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Timezone-safe day match: reads the YYYY-MM-DD portion of the ISO string
// directly so timezone offsets never shift the displayed date.
function onSameDay(dateStr, selectedDate) {
  if (!dateStr) return false;
  const s = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return (
    y === selectedDate.getFullYear() &&
    (m - 1) === selectedDate.getMonth() &&
    d === selectedDate.getDate()
  );
}

// ─── Avatar bubble ───────────────────────────────────────────────────────────

// Shows a coloured circle with the member's initials.
// `selected` adds a teal ring so the user knows which filter is active.
function MemberBubble({ member, selected, onPress, onLongPress }) {
  const fullName = member.name
    || [member.first_name, member.last_name].filter(Boolean).join(' ')
    || member.email
    || '?';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberColor = member.color || '#1a8fa8';

  return (
    <TouchableOpacity
      style={[styles.bubble, selected && { transform: [{ scale: 1.12 }] }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      {/*
        Two-layer ring — iOS-style selection indicator:
        outer ring (member colour) → white gap (padding) → coloured avatar
        When not selected both borders are transparent so it looks identical.
      */}
      <View style={[
        styles.bubbleRing,
        selected && { borderColor: memberColor },
      ]}>
        <View style={[styles.bubbleCircle, { backgroundColor: memberColor }]}>
          <Text style={styles.bubbleInitials}>{initials}</Text>
        </View>
      </View>

      <Text style={[
        styles.bubbleName,
        selected && { color: memberColor, fontWeight: '700' },
      ]} numberOfLines={1}>
        {member.first_name || fullName.split(' ')[0]}
      </Text>
      {member.relationship ? (
        <Text style={styles.bubbleRelationship} numberOfLines={1}>
          {member.relationship}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Event row ───────────────────────────────────────────────────────────────
// `eventTasks` are the tasks linked to this event — shown inline below it.

function EventRow({ event, navigation, eventTasks }) {
  const color = event.color || '#1a8fa8';

  return (
    <View style={styles.eventCard}>
      {/* Main event tap target */}
      <TouchableOpacity
        style={styles.eventRow}
        onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
        activeOpacity={0.75}
      >
        <View style={[styles.eventStripe, { backgroundColor: color }]} />
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.eventTime}>{formatTime(event)}</Text>
        </View>
      </TouchableOpacity>

      {/* Inline tasks for this event */}
      {eventTasks?.length > 0 && (
        <View style={[styles.inlineTasksList, { borderLeftColor: color }]}>
          {eventTasks.map(t => (
            <View key={t.id} style={styles.inlineTaskRow}>
              <Ionicons name="checkmark-circle-outline" size={13} color={STATUS_COLOR[t.status] || '#aeaeb2'} />
              <Text style={styles.inlineTaskTitle} numberOfLines={1}>{t.title}</Text>
              {t.assigned_first_name && (
                <Text style={styles.inlineTaskAssignee}>{t.assigned_first_name}</Text>
              )}
              <View style={[styles.inlineTaskBadge, { backgroundColor: STATUS_COLOR[t.status] || '#aeaeb2' }]}>
                <Text style={styles.inlineTaskBadgeText}>{STATUS_LABEL[t.status] || t.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

const STATUS_COLOR = { pending: '#ff9500', accepted: '#34c759', countered: '#ff3b30' };
const STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', countered: 'Counter' };

function TaskRow({ task, navigation, onComplete, onDelete, onAccept, onSetArrivalTime, currentUserId }) {
  const color = task.color || task.assigned_color || '#1a8fa8';
  const badge = STATUS_COLOR[task.status] || '#aeaeb2';
  const badgeOpacity = useRef(new Animated.Value(1)).current;

  // Arrival time picker state
  const [showPicker, setShowPicker]   = useState(false);
  // Initialise from task.due_date if already set, otherwise null
  const [pickerTime, setPickerTime]   = useState(
    task.due_date ? new Date(task.due_date) : new Date()
  );

  // Show arrival time row when:
  //   - task is accepted
  //   - current user is the assignee
  //   - someone else created the task (not self-assigned)
  const isMyAccepted =
    task.status === 'accepted' &&
    Number(task.assigned_to) === Number(currentUserId) &&
    Number(task.created_by)  !== Number(currentUserId);

  const arrivalLabel = task.due_date
    ? new Date(task.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Set arrival time';

  // Pending → Accept, anything else → Done
  const isPending = task.status === 'pending';

  const primaryColor  = isPending ? '#1a8fa8' : '#34c759';
  const primaryIcon   = isPending ? 'checkmark-done' : 'checkmark';
  const primaryLabel  = isPending ? 'Accept' : 'Done';
  const primaryAction = isPending ? () => onAccept(task.id) : () => onComplete(task.id);

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: primaryColor }]}
        onPress={primaryAction}
        activeOpacity={0.85}
      >
        <Ionicons name={primaryIcon} size={22} color="#fff" />
        <Text style={styles.swipeActionText}>{primaryLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeActionLast, { backgroundColor: '#ff3b30' }]}
        onPress={() => onDelete(task.id)}
        activeOpacity={0.85}
      >
        <Ionicons name="trash" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const handleRowPress = () => {
    if (task.event_id) {
      navigation.navigate('EventDetails', { eventId: task.event_id });
    }
  };

  const handlePickerDone = () => {
    setShowPicker(false);
    onSetArrivalTime(task.id, pickerTime);
  };

  return (
    <>
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        onSwipeableWillOpen={() => Animated.timing(badgeOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start()}
        onSwipeableWillClose={() => Animated.timing(badgeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()}
      >
        <TouchableOpacity style={styles.eventRow} onPress={handleRowPress} activeOpacity={0.75}>
          <View style={[styles.eventStripe, { backgroundColor: color }]} />
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle} numberOfLines={1}>{task.title}</Text>
            {task.event_title ? (
              <Text style={styles.eventTime}>📅 {task.event_title}</Text>
            ) : task.due_date ? (
              <Text style={styles.eventTime}>
                Due {new Date(task.due_date.replace(/Z$/, '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
            ) : (
              <Text style={styles.eventTime}>No due date</Text>
            )}
            {/* Arrival time row — only for accepted tasks assigned to me by someone else */}
            {isMyAccepted && (
              <TouchableOpacity
                style={styles.arrivalRow}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={12} color="#1a8fa8" />
                <Text style={[styles.arrivalText, !task.due_date && styles.arrivalPlaceholder]}>
                  {arrivalLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Animated.View style={[styles.statusBadge, { backgroundColor: badge, opacity: badgeOpacity }]}>
            <Text style={styles.statusBadgeText}>{STATUS_LABEL[task.status] || task.status}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Swipeable>

      {/* ── Arrival time picker modal ── */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            {/* Header */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Arrival Time</Text>
              <TouchableOpacity onPress={handlePickerDone}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {/* iOS drum-roller time picker */}
            <DateTimePicker
              value={pickerTime}
              mode="time"
              display="spinner"
              onChange={(_, date) => { if (date) setPickerTime(date); }}
              style={{ width: '100%' }}
              textColor="#1d1d1f"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { logout, user } = useAuth();
  const { members } = useFamily();
  const { eventTick, taskTick } = useSSE();

  // Put the logged-in user first, everyone else follows in original order
  const sortedMembers = user
    ? [
        ...members.filter(m => Number(m.id) === Number(user.id)),
        ...members.filter(m => Number(m.id) !== Number(user.id)),
      ]
    : members;

  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Selected day in the week strip — defaults to today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(todayStart);

  // Calendar view mode — 'week' or 'month'
  // Starts as month so new users always see the full calendar on first load.
  // Switches to week once the user has data (members or events).
  const [viewMode, setViewMode] = useState('month');

  // Mirror mutable state into refs so gesture callbacks always read the latest value.
  const viewModeRef     = useRef(viewMode);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { viewModeRef.current = viewMode; },     [viewMode]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // ── Animated values for Apple-Calendar-style pinch ───────────────────────
  // liveScale:     live pinch feedback on the calendar.
  // viewAlpha:     calendar fade during view switch.
  // listAlpha:     task list fade during view switch.
  // listTranslateY: task list slides up on exit, floats in from below on enter.
  const liveScale      = useRef(new Animated.Value(1)).current;
  const viewAlpha      = useRef(new Animated.Value(1)).current;
  const listAlpha      = useRef(new Animated.Value(1)).current;
  const listTranslateY = useRef(new Animated.Value(0)).current;

  const switchCalendarView = useCallback((newMode) => {
    // Phase 1 — slide list up + fade everything out
    Animated.parallel([
      Animated.timing(viewAlpha,      { toValue: 0,  duration: 180, useNativeDriver: true }),
      Animated.timing(listAlpha,      { toValue: 0,  duration: 180, useNativeDriver: true }),
      Animated.timing(listTranslateY, { toValue: -12, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      // Swap content while invisible
      setViewMode(newMode);
      viewModeRef.current = newMode;
      liveScale.setValue(1);
      // Reset list to start below, ready to float up into view
      listTranslateY.setValue(16);
      // Phase 2 — float list in from below + fade everything back in
      Animated.parallel([
        Animated.timing(viewAlpha,      { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(listAlpha,      { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(listTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, [liveScale, viewAlpha, listAlpha, listTranslateY]);

  // Pinch gesture — runOnJS(true) means NO reanimated needed.
  // onUpdate: apply live scale so user sees the calendar responding immediately.
  // onEnd:    commit the view change or spring back if threshold wasn't crossed.
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onUpdate((e) => {
      liveScale.setValue(e.scale);
    })
    .onEnd((e) => {
      if (e.scale > 1.15) {
        // Fingers apart → week view
        switchCalendarView('week');
      } else if (e.scale < 0.85) {
        // Fingers together → month view
        switchCalendarView('month');
      } else {
        // Didn't cross threshold — spring back to original size
        Animated.spring(liveScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
      }
    });

  // ── Edge swipe to open drawer ─────────────────────────────────────────────
  // A dedicated 20px strip on the left edge captures the gesture so it never
  // conflicts with the member bubbles ScrollView or the event FlatList.
  const edgePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,   // claim the touch immediately
      onPanResponderMove: (_, g) => {
        if (g.dx > 30) setDrawerOpen(true);
      },
    })
  ).current;

  // ── Fetch events + tasks together ────────────────────────────────────────
  // Use allSettled so a 404 (new user with no family) doesn't crash the other request.
  const fetchEvents = useCallback(async () => {
    try {
      const [eventsRes, tasksRes] = await Promise.allSettled([
        API.get('/events'),
        API.get('/tasks/family'),
      ]);
      setEvents(eventsRes.status === 'fulfilled' ? (eventsRes.value.data.events || []) : []);
      setTasks(tasksRes.status === 'fulfilled'   ? (tasksRes.value.data.tasks   || []) : []);
    } catch (err) {
      console.error('fetchEvents error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch pending count for the badge ────────────────────────────────────
  // Adds up pending tasks + notifications + event invitations
  const fetchPendingCount = useCallback(async () => {
    const [pendingRes, notifs, invites, assigneeNotifs] = await Promise.allSettled([
      API.get('/tasks/pending'),
      API.get('/tasks/notifications'),
      API.get('/events/invitations'),
      API.get('/tasks/assignee-notifications'),
    ]);
    const get = (r, key) => r.status === 'fulfilled' ? (r.value.data[key]?.length || 0) : 0;
    setPendingCount(
      get(pendingRes,      'tasks') +
      get(notifs,          'notifications') +
      get(invites,         'invitations') +
      get(assigneeNotifs,  'notifications')
    );
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchEvents();
    fetchPendingCount();
  }, [fetchEvents, fetchPendingCount]);

  // Re-fetch when this screen comes back into focus (returning from other screens)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
      fetchPendingCount();
    });
    return unsubscribe;
  }, [navigation, fetchEvents, fetchPendingCount]);

  // SSE — live updates while the app is in the foreground.
  // eventTick increments whenever the server fires event_update.
  // taskTick  increments whenever the server fires task_update.
  // Skip the very first render (tick = 0) since mount already fetches.
  useEffect(() => { if (eventTick > 0) fetchEvents(); },       [eventTick]);
  useEffect(() => { if (taskTick  > 0) fetchPendingCount(); }, [taskTick]);

  // Switch to week view only when there's actual content to show.
  // Stay in month when there are no events and no tasks.
  useEffect(() => {
    if (!loading) {
      if (events.length > 0 || tasks.length > 0) {
        setViewMode('week');
      } else {
        setViewMode('month');
      }
    }
  }, [loading, events.length, tasks.length]);

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // ── Filter ───────────────────────────────────────────────────────────────

  const memberFiltered = selectedMember
    ? events.filter(
        (e) =>
          Number(e.created_by) === Number(selectedMember) ||
          (e.attendees && e.attendees.some((a) => Number(a.user_id) === Number(selectedMember)))
      )
    : events;

  // Events for the selected day
  const dayEvents = memberFiltered.filter(e => onSameDay(e.start_date, selectedDate));

  // Tasks filtered by member only
  const memberFilteredTasks = selectedMember
    ? tasks.filter(t => Number(t.assigned_to) === Number(selectedMember))
    : tasks;

  // Combined list:
  //   Events section  → each event card also shows its linked tasks inline
  //   Tasks section   → ALL tasks (event-linked + standalone) so they're always visible
  const listData = [
    ...(dayEvents.length > 0
      ? [{ type: 'sectionHeader', title: 'Events', key: 'sh-events' }]
      : []),
    ...dayEvents.map(e => ({
      type: 'event',
      data: e,
      eventTasks: memberFilteredTasks.filter(t => Number(t.event_id) === Number(e.id)),
      key: `e-${e.id}`,
    })),
    ...(memberFilteredTasks.length > 0
      ? [{ type: 'sectionHeader', title: 'Tasks', key: 'sh-tasks' }]
      : []),
    ...memberFilteredTasks.map(t => ({ type: 'task', data: t, key: `t-${t.id}` })),
  ];

  // ── Toggle member filter ──────────────────────────────────────────────────
  const handleMemberPress = (memberId) => {
    setSelectedMember((prev) => (Number(prev) === Number(memberId) ? null : memberId));
  };

  // ── Complete a task ───────────────────────────────────────────────────────
  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}/complete`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      Alert.alert('Error', 'Could not mark task complete');
    }
  }, []);

  // ── Delete a task ─────────────────────────────────────────────────────────
  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await API.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      Alert.alert('Error', 'Could not delete task');
    }
  }, []);

  // ── Set arrival time on an accepted task ─────────────────────────────────
  const handleSetArrivalTime = useCallback(async (taskId, date) => {
    try {
      await API.patch(`/tasks/${taskId}/due-date`, { due_date: date.toISOString() });
      // Update local state so the row shows the new time immediately
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, due_date: date.toISOString() } : t
      ));
    } catch {
      Alert.alert('Error', 'Could not save arrival time');
    }
  }, []);

  // ── Accept a pending task (swipe right, no remarks) ───────────────────────
  const handleAcceptTask = useCallback(async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}/respond`, { response: 'accepted' });
      // Update status in local state so badge changes immediately
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'accepted' } : t
      ));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not accept task';
      console.error('handleAcceptTask error:', msg);
      Alert.alert('Error', msg);
    }
  }, []);

  // ── Day label for the events section ─────────────────────────────────────
  const todayNow = new Date();
  todayNow.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayNow);
  tomorrow.setDate(todayNow.getDate() + 1);
  const yesterday = new Date(todayNow);
  yesterday.setDate(todayNow.getDate() - 1);

  function dayHeader(date) {
    if (date.getTime() === todayNow.getTime())    return 'Today';
    if (date.getTime() === tomorrow.getTime())    return 'Tomorrow';
    if (date.getTime() === yesterday.getTime())   return 'Yesterday';
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}><SafeAreaView style={styles.safeArea}>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} pendingCount={pendingCount} />

      {/* Left edge strip — 20px wide, full height, captures swipe-right */}
      <View style={styles.edgeZone} {...edgePan.panHandlers} />

      {/* ── Header ── */}
      <View style={styles.header}>

        {/* Left — gradient hamburger */}
        <TouchableOpacity style={styles.iconBtn} onPress={() => setDrawerOpen(true)}>
          <View style={styles.hamburger}>
            <LinearGradient colors={['#56e39f','#4facfe','#f857a6','#f48c06']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.hamburgerLine} />
            <LinearGradient colors={['#56e39f','#4facfe','#f857a6','#f48c06']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.hamburgerLine} />
            <LinearGradient colors={['#56e39f','#4facfe','#f857a6','#f48c06']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>

        {/* Centre — WHEN title */}
        <Text style={styles.headerTitle}>WHEN</Text>

        {/* Right — message + bell */}
        <View style={styles.headerRight}>
          {/* Message icon — placeholder until DM feature is built */}
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="chatbubble-outline" size={22} color="#8e8e93" />
          </TouchableOpacity>

          {/* Bell — navigates to PendingScreen, red badge when items exist */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Pending')}
          >
            <Ionicons
              name={pendingCount > 0 ? 'notifications' : 'notifications-outline'}
              size={22}
              color={pendingCount > 0 ? '#1a8fa8' : '#8e8e93'}
            />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      </View>

      {/* ── Member bubbles — hidden when no members ── */}
      {sortedMembers.length > 0 && (
        <View style={styles.membersRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.membersRow}
            contentContainerStyle={styles.membersContent}
          >
            {sortedMembers.map((member) => (
              <MemberBubble
                key={member.id}
                member={member}
                selected={Number(selectedMember) === Number(member.id)}
                onPress={() => handleMemberPress(member.id)}
                onLongPress={() => navigation.navigate('MemberProfile', { memberId: member.id })}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Calendar: pinch out = month, pinch in = week/day ── */}
      {!loading && (
        <>
          <GestureDetector gesture={pinchGesture}>
            {/* scale: live pinch feedback · opacity: cross-fade when view switches */}
            <Animated.View style={{ transform: [{ scale: liveScale }], opacity: viewAlpha }}>
              {(events.length === 0 && tasks.length === 0) || viewMode === 'month' ? (
                <MonthCalendar
                  events={memberFiltered}
                  selectedDate={selectedDate}
                  onSelectDate={(day) => setSelectedDate(day)}
                  onLongPressDate={(day) => {
                    setSelectedDate(day);
                    navigation.navigate('DayView', { dateStr: day.toISOString() });
                  }}
                />
              ) : (
                <WeekStrip
                  events={memberFiltered}
                  selectedDate={selectedDate}
                  onSelectDate={(day) => setSelectedDate(day)}
                  onLongPressDate={(day) => {
                    setSelectedDate(day);
                    navigation.navigate('DayView', { dateStr: day.toISOString() });
                  }}
                />
              )}
            </Animated.View>
          </GestureDetector>
        </>
      )}

      {/* ── Day events list ── */}
      {loading ? (
        <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
      ) : (
        <Animated.View style={{ flex: 1, opacity: listAlpha, transform: [{ translateY: listTranslateY }] }}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'sectionHeader') {
              return <Text style={styles.sectionHeader}>{item.title}</Text>;
            }
            if (item.type === 'event') {
              return <EventRow event={item.data} navigation={navigation} eventTasks={item.eventTasks} />;
            }
            if (item.type === 'task') {
              return (
                <TaskRow
                  task={item.data}
                  navigation={navigation}
                  onComplete={handleCompleteTask}
                  onDelete={handleDeleteTask}
                  onAccept={handleAcceptTask}
                  onSetArrivalTime={handleSetArrivalTime}
                  currentUserId={user?.id}
                />
              );
            }
            return null;
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a8fa8" />
          }
          ListHeaderComponent={
            <Text style={styles.dayLabel}>{dayHeader(selectedDate)}</Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No events or tasks</Text>
          }
        />
        </Animated.View>
      )}
    </SafeAreaView>

      {/* ── FAB — floating + button, bottom right ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          Alert.alert('Create', 'What would you like to add?', [
            { text: 'New Event', onPress: () => navigation.navigate('EventForm') },
            { text: 'New Task',  onPress: () => navigation.navigate('TaskForm') },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

    </View>
  );
}

