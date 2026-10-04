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
import styles from '../styles/HomeScreen.styles';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Returns "Today", "Tomorrow", or a formatted date string like "Mon 5 Jan"
function dateLabel(dateStr) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const d = new Date(dateStr);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, tomorrow)) return 'Tomorrow';

  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Formats a datetime string to "9:00 AM" — returns "All day" for all-day events
function formatTime(event) {
  if (event.is_all_day) return 'All day';
  const d = new Date(event.start_date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Groups a flat events array into sections: [{ title, data }]
// FlatList's SectionList needs this shape — we build it ourselves so we can
// use a regular FlatList and render section headers inline
function groupByDate(events) {
  const sections = [];
  const seen = {};                            // tracks which date labels we've added

  events.forEach((event) => {
    const label = dateLabel(event.start_date);
    if (!seen[label]) {
      seen[label] = true;
      sections.push({ type: 'header', label, key: `header-${label}` });
    }
    sections.push({ type: 'event', event, key: `event-${event.id}` });
  });

  return sections;
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

function EventRow({ event, navigation }) {
  const color = event.color || '#1a8fa8';

  return (
    // TouchableOpacity makes the whole card pressable
    <TouchableOpacity
      style={styles.eventRow}
      onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
      activeOpacity={0.75}
    >
      {/* Coloured left stripe — same visual as the web calendar dots */}
      <View style={[styles.eventStripe, { backgroundColor: color }]} />

      <View style={styles.eventBody}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventTime}>{formatTime(event)}</Text>
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const res = await API.get('/events');
      setEvents(res.data.events || []);
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
      const [tasks, notifs, invites, assigneeNotifs] = await Promise.all([
        API.get('/tasks/pending'),
        API.get('/tasks/notifications'),
        API.get('/events/invitations'),
        API.get('/tasks/assignee-notifications'),
      ]);
      const count =
        (tasks.data.tasks?.length || 0) +
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

  // ── Filter + group ────────────────────────────────────────────────────────

  // If a member bubble is selected, only show events that include that member
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const memberFiltered = selectedMember
    ? events.filter(
        (e) =>
          Number(e.created_by) === Number(selectedMember) ||
          (e.attendees && e.attendees.some((a) => Number(a.user_id) === Number(selectedMember)))
      )
    : events;

  // Split into upcoming (today+) and past, so upcoming always appears first
  const upcomingEvents = memberFiltered.filter(e => new Date(e.start_date) >= today);
  const pastEvents     = memberFiltered.filter(e => new Date(e.start_date) <  today)
                                       .reverse(); // most recent past first

  // Build list: upcoming grouped by date, then a Past divider, then past events grouped
  const listItems = [
    ...groupByDate(upcomingEvents),
    ...(pastEvents.length > 0
      ? [{ type: 'header', label: 'Past Events', key: 'header-past' }, ...groupByDate(pastEvents)]
      : []),
  ];

  // ── Toggle member filter ──────────────────────────────────────────────────
  const handleMemberPress = (memberId) => {
    // Tap same member again → clear the filter
    setSelectedMember((prev) => (Number(prev) === Number(memberId) ? null : memberId));
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  // FlatList calls this for every item in listItems
  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }
    return <EventRow event={item.event} navigation={navigation} />;
  };

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
      <ScrollView
        horizontal                         // side-scrolling row
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

      {/* ── Events list ── */}
      {loading ? (
        <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            // Pull-to-refresh — teal spinner matches the app colour
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1a8fa8"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No upcoming events</Text>
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

