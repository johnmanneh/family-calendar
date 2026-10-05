import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DrawerMenu from '../components/DrawerMenu';
import WeekStrip from '../components/WeekStrip';
import styles from '../styles/HomeScreen.styles';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';

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

  // When selected, ring uses the member's own colour — same as the web sidebar
  const circleStyle = [
    styles.bubbleCircle,
    { backgroundColor: memberColor },
    selected && {
      borderColor: memberColor,
      shadowColor: memberColor,
      shadowOpacity: 0.5,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
  ];

  return (
    <TouchableOpacity style={styles.bubble} onPress={onPress} onLongPress={onLongPress} delayLongPress={400}>
      <View style={circleStyle}>
        <Text style={styles.bubbleInitials}>{initials}</Text>
      </View>
      <Text style={styles.bubbleName} numberOfLines={1}>
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

function TaskRow({ task, navigation, onComplete }) {
  const color = task.color || task.assigned_color || '#1a8fa8';
  const badge = STATUS_COLOR[task.status] || '#aeaeb2';

  const handlePress = () => {
    if (task.event_id) {
      // Event-linked task → go to the event
      navigation.navigate('EventDetails', { eventId: task.event_id });
    } else {
      // Standalone task → quick action sheet
      Alert.alert(task.title, null, [
        {
          text: '✅ Mark Complete',
          onPress: () => onComplete(task.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <TouchableOpacity style={styles.eventRow} onPress={handlePress} activeOpacity={0.75}>
      <View style={[styles.eventStripe, { backgroundColor: color }]} />
      <View style={styles.eventBody}>
        <View style={styles.taskTitleRow}>
          <Ionicons name="checkmark-circle-outline" size={14} color={color} style={styles.taskIcon} />
          <Text style={styles.eventTitle} numberOfLines={1}>{task.title}</Text>
        </View>
        {task.event_title ? (
          <Text style={styles.eventTime}>📅 {task.event_title}</Text>
        ) : task.due_date ? (
          <Text style={styles.eventTime}>
            Due {new Date(task.due_date.replace(/Z$/, '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </Text>
        ) : (
          <Text style={styles.eventTime}>No due date</Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: badge }]}>
        <Text style={styles.statusBadgeText}>{STATUS_LABEL[task.status] || task.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { logout, user } = useAuth();
  const { members } = useFamily();

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
  const fetchEvents = useCallback(async () => {
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        API.get('/events'),
        API.get('/tasks/family'),
      ]);
      setEvents(eventsRes.data.events || []);
      setTasks(tasksRes.data.tasks || []);
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
    try {
      const [pendingRes, notifs, invites, assigneeNotifs] = await Promise.all([
        API.get('/tasks/pending'),
        API.get('/tasks/notifications'),
        API.get('/events/invitations'),
        API.get('/tasks/assignee-notifications'),
      ]);
      const count =
        (pendingRes.data.tasks?.length || 0) +
        (notifs.data.notifications?.length || 0) +
        (invites.data.invitations?.length || 0) +
        (assigneeNotifs.data.notifications?.length || 0);
      setPendingCount(count);
    } catch {
      // silently ignore — badge just won't show
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchEvents();
    fetchPendingCount();
  }, [fetchEvents, fetchPendingCount]);

  // Re-fetch events and badge whenever this screen comes back into focus
  // This covers: returning from EventForm (create/edit), PendingScreen, etc.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
      fetchPendingCount();
    });
    return unsubscribe;
  }, [navigation, fetchEvents, fetchPendingCount]);

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

  // ── Complete a standalone task ────────────────────────────────────────────
  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}/complete`);
      // Remove from local state immediately so it disappears from the list
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      Alert.alert('Error', 'Could not mark task complete');
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

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />

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

      {/* ── Member bubbles ── */}
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

      {/* ── Week strip ── */}
      {!loading && (
        <WeekStrip
          events={memberFiltered}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* ── Day events list ── */}
      {loading ? (
        <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
      ) : (
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
              return <TaskRow task={item.data} navigation={navigation} onComplete={handleCompleteTask} />;
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

