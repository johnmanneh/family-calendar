import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onSameDay } from '../utils/eventDates';
import { eventInvolvesPerson } from '../utils/eventPeople';
import { useTranslation } from 'react-i18next';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TextInput,
  Animated,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
  Alert,
  Platform,
  Modal,
  StyleSheet,
  Image,
  AppState,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DrawerMenu, { useDrawerController, homeRollStyle } from '../components/DrawerMenu';
import FamilyFilterBar from '../components/FamilyFilterBar';
import WeekStrip from '../components/WeekStrip';
import MonthCalendar from '../components/MonthCalendar';
import RadialMenu from '../components/RadialMenu';
import TreadmillList from '../components/TreadmillList';
import AppIconButton from '../components/AppIconButton';

// Home header look. 'logo' = app icon top-left (opens the menu), no title.
// 'classic' = gradient menu bars + "it's for us" title in the middle.
// Change this one word to switch back.
const HEADER_STYLE = 'logo';

// Header icons (search, chat, bell): with the 'logo' header they use the same
// dark text colour as the logo so the whole top row matches; 'classic' keeps grey.
function useHeaderIconColor() {
  const dark = useColorScheme() === 'dark';
  if (HEADER_STYLE !== 'logo') return '#8e8e93';
  return dark ? '#ffffff' : '#1d1d1f';
}
import { useStyles } from '../styles/HomeScreen.styles';
import { useColorScheme } from '../context/ThemeContext';
import parseVoiceInput from '../utils/parseVoiceInput';
import API, { SERVER_URL } from '../api/axios';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useSSE } from '../context/SSEContext';
import { saveCache, loadCache, savedAtLabel } from '../utils/cache';

// ── Try to load expo-speech-recognition ─────────────────────────────────────
// Falls back gracefully in Expo Go where the native module isn't linked.
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent   = null;
// STT only works on native iOS/Android — not on web or bare Expo Go
let STT_AVAILABLE = false;
if (Platform.OS !== 'web') {
  try {
    const stt = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = stt.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent   = stt.useSpeechRecognitionEvent;
    STT_AVAILABLE = true;
  } catch (_) {
    STT_AVAILABLE = false;
  }
}
// No-op hook so we can call useSpeechRecognitionEvent unconditionally
// in HomeScreen regardless of whether STT is available.
const useSTTEvent = useSpeechRecognitionEvent || (() => {});

// ─── Helpers ────────────────────────────────────────────────────────────────

// Formats a datetime string to "9:00 AM" — returns "All day" for all-day events
function formatTime(event) {
  if (event.is_all_day) return null; // caller uses t('common.all_day')
  const d = new Date(event.start_date);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}


// ─── Avatar bubble ───────────────────────────────────────────────────────────

// Shows a coloured circle with the member's initials.
// `selected` adds a teal ring so the user knows which filter is active.
function MemberBubble({ member, selected, onPress, onLongPress }) {
  const styles = useStyles();
  const fullName = member.name
    || [member.first_name, member.last_name].filter(Boolean).join(' ')
    || '?';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberColor = member.color || '#1a8fa8';
  const photoUri = member.avatar_url
    ? (member.avatar_url.startsWith('http') ? member.avatar_url : `${SERVER_URL}${member.avatar_url}`)
    : null;
  const [photoFailed, setPhotoFailed] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.bubble}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      {/* Halo container — slightly larger than the circle, centred.
          When selected: a faded circle of the member's colour sits behind
          the avatar. Works on iOS and Android without shadow API quirks. */}
      <View style={styles.bubbleHaloWrap}>
        {selected && (
          <View style={[
            styles.bubbleHalo,
            { backgroundColor: memberColor, opacity: 0.25 },
          ]} />
        )}
        {photoUri && !photoFailed ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.bubbleCircle}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <View style={[styles.bubbleCircle, { backgroundColor: memberColor }]}>
            <Text style={styles.bubbleInitials}>{initials}</Text>
          </View>
        )}
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

// Group bubble — same shape as MemberBubble, with a people icon.
// `selected` adds a teal halo so the user knows which filter is active.
function GroupBubble({ group, selected, onPress }) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={styles.bubble}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.bubbleHaloWrap}>
        {selected && (
          <View style={[styles.bubbleHalo, { backgroundColor: '#1a8fa8', opacity: 0.25 }]} />
        )}
        <View style={[styles.bubbleCircle, { backgroundColor: '#1a8fa8' }]}>
          <Ionicons name="people-circle-outline" size={20} color="#fff" />
        </View>
      </View>
      <Text style={[styles.bubbleName, selected && { color: '#1a8fa8', fontWeight: '700' }]} numberOfLines={1}>
        {group.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Event row ───────────────────────────────────────────────────────────────
// `eventTasks` are the tasks linked to this event — shown inline below it.

function EventRow({ event, navigation, eventTasks, showDate, onDelete }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const color = event.color || '#1a8fa8';

  const dateLabel = showDate
    ? new Date(event.start_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : null;

  const timeDisplay = formatTime(event) ?? t('common.all_day');

  const openDetails = () => navigation.navigate('EventDetails', { eventId: event.id });

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity style={styles.swipeAction} onPress={openDetails} activeOpacity={0.85}>
        <View style={[styles.swipeCircle, { backgroundColor: '#636366' }]}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
        </View>
        <Text style={styles.swipeActionText}>{t('common.more')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.swipeAction} onPress={() => onDelete(event.id)} activeOpacity={0.85}>
        <View style={[styles.swipeCircle, { backgroundColor: '#ff3b30' }]}>
          <Ionicons name="trash" size={18} color="#fff" />
        </View>
        <Text style={styles.swipeActionText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  const card = (
    // collapsable={false}: keep this view on Android so the swipe transform
    // has a real native view to move (otherwise the card can render blank).
    <View style={styles.eventCard} collapsable={false}>
      {/* Main event tap target */}
      <TouchableOpacity
        style={[styles.eventRow, event.is_busy && { opacity: 0.6 }]}
        // Busy blocks (someone else's booked time) only show when — not what
        onPress={event.is_busy ? undefined : openDetails}
        activeOpacity={event.is_busy ? 1 : 0.75}
        disabled={event.is_busy}
      >
        <View style={[styles.eventStripe, { backgroundColor: color }]} />
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.is_busy ? <Ionicons name="lock-closed-outline" size={13} /> : null}
            {event.is_busy ? ' ' : ''}{event.title}
          </Text>
          <Text style={styles.eventTime}>
            {dateLabel ? `${dateLabel} · ` : ''}{timeDisplay}
          </Text>
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
                <Text style={styles.inlineTaskBadgeText}>{STATUS_KEY[t.status] ? t(STATUS_KEY[t.status]) : t.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (event.is_busy) return card;

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      childrenContainerStyle={styles.swipeChild}
    >
      {card}
    </Swipeable>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

const STATUS_COLOR = { pending: '#ff9500', accepted: '#34c759', countered: '#ff3b30' };
const STATUS_KEY   = { pending: 'common.pending', accepted: 'home.ongoing', countered: 'home.counter' };

function TaskRow({ task, navigation, onComplete, onDelete, onAccept, onSetArrivalTime, currentUserId }) {
  const { t } = useTranslation();
  const styles = useStyles();
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
    ? new Date(task.due_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : t('home.set_arrival_time');

  // Pending → Accept, anything else → Done
  const isPending = task.status === 'pending';

  const primaryColor  = isPending ? '#1a8fa8' : '#34c759';
  const primaryIcon   = isPending ? 'checkmark-done' : 'checkmark';
  const primaryLabel  = isPending ? t('common.accept') : t('common.done');
  const primaryAction = isPending ? () => onAccept(task.id) : () => onComplete(task.id);

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity style={styles.swipeAction} onPress={primaryAction} activeOpacity={0.85}>
        <View style={[styles.swipeCircle, { backgroundColor: primaryColor }]}>
          <Ionicons name={primaryIcon} size={20} color="#fff" />
        </View>
        <Text style={styles.swipeActionText}>{primaryLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.swipeAction} onPress={() => onDelete(task.id)} activeOpacity={0.85}>
        <View style={[styles.swipeCircle, { backgroundColor: '#ff3b30' }]}>
          <Ionicons name="trash" size={18} color="#fff" />
        </View>
        <Text style={styles.swipeActionText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  const handleRowPress = () => {
    if (task.event_id) {
      navigation.navigate('EventDetails', { eventId: task.event_id });
    } else {
      navigation.navigate('TaskForm', { task });
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
        friction={2}
        rightThreshold={40}
        childrenContainerStyle={styles.swipeChild}
        onSwipeableWillOpen={() => Animated.timing(badgeOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start()}
        onSwipeableWillClose={() => Animated.timing(badgeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()}
      >
        <TouchableOpacity style={[styles.eventCard, styles.eventRow]} onPress={handleRowPress} activeOpacity={0.75}>
          <View style={[styles.eventStripe, { backgroundColor: color }]} />
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle} numberOfLines={1}>{task.title}</Text>
            {task.event_title ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="calendar-outline" size={13} color="#8e8e93" />
                <Text style={styles.eventTime}>{task.event_title}</Text>
              </View>
            ) : task.due_date ? (
              <Text style={styles.eventTime}>
                Due {new Date(task.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </Text>
            ) : (
              <Text style={styles.eventTime}>{t('home.no_due_date')}</Text>
            )}
            {/* Arrival time row — only for accepted tasks assigned to me by someone else */}
            {isMyAccepted && (
              <TouchableOpacity
                style={styles.arrivalRow}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    DateTimePickerAndroid.open({
                      value: pickerTime,
                      mode: 'time',
                      onChange: (_, selected) => {
                        if (selected) {
                          setPickerTime(selected);
                          onSetArrivalTime(task.id, selected);
                        }
                      },
                    });
                  } else {
                    setShowPicker(true);
                  }
                }}
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
            <Text style={styles.statusBadgeText}>{STATUS_KEY[task.status] ? t(STATUS_KEY[task.status]) : task.status}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Swipeable>

      {/* ── Arrival time picker modal — iOS only (Android uses imperative API) ── */}
      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>{t('home.arrival_time_title')}</Text>
                <TouchableOpacity onPress={handlePickerDone}>
                  <Text style={styles.pickerDone}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
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
      )}
    </>
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Family',  color: '#56e39f', icon: '🏠' },
  { name: 'School',  color: '#4facfe', icon: '🏫' },
  { name: 'Sports',  color: '#c8f400', icon: '⚽' },
  { name: 'Health',  color: '#f48c06', icon: '🏥' },
  { name: 'Travel',  color: '#9747ff', icon: '✈️' },
  { name: 'Social',  color: '#ffd60a', icon: '🎉' },
  { name: 'Faith',   color: '#1a8fa8', icon: '⛪' },
  { name: 'Work',    color: '#6e6e73', icon: '💼' },
];

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation, route }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const headerIconColor = useHeaderIconColor();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const { members, families, family, switchFamily } = useFamily();
  const activeScope = user?.id != null && family?.id != null
    ? JSON.stringify([user.id, family.id]) : null;
  const familyIdRef = useRef(null);
  familyIdRef.current = activeScope;
  const dataScope = useRef(activeScope);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);
  const { eventTick, taskTick, notifTick, lastChatMsg } = useSSE();

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
  // One active bubble filter: type null = All, 'person' = person bubble, 'group' = group bubble
  const [selectedFilter, setSelectedFilter] = useState({ type: null, id: null });
  const clearFilter = () => setSelectedFilter({ type: null, id: null });
  // "See all <name>'s events" on a profile → open home filtered to that person
  useEffect(() => {
    const id = route?.params?.focusMemberId;
    if (id != null) {
      setSelectedFilter({ type: 'person', id });
      navigation.setParams({ focusMemberId: undefined });
    }
  }, [route?.params?.focusMemberId]);

  // Groups the user belongs to (loaded with the events; used for group badges)
  const [myGroups, setMyGroups] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifUnread,  setNotifUnread]  = useState(0);
  const [chatUnread,   setChatUnread]   = useState(0);
  // Drawer lives under this screen; opening it rolls this screen away (see DrawerMenu)
  const drawer = useDrawerController();
  const [isOffline,     setIsOffline]     = useState(false);
  const [radialVisible,  setRadialVisible]  = useState(false);

  // ── Inline voice capture state ───────────────────────────────────────────
  // isRecording: true while the user is holding the FAB
  // voiceStatus: 'idle' | 'listening' | 'processing'
  // voiceTranscript: live partial transcript shown in the pill
  // fabPulse: animated scale value for the FAB glow ring while recording
  const [isRecording,      setIsRecording]      = useState(false);
  const [voiceStatus,      setVoiceStatus]      = useState('idle');
  const [voiceTranscript,  setVoiceTranscript]  = useState('');
  const fabPulse = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);
  const fabRef    = useRef(null);
  const [fabCenter, setFabCenter] = useState({ x: 0, y: 0 });

  // ── Success toast — shown after a voice-created event ───────────────────
  // null = hidden, string = message to show
  const [successToast, setSuccessToast] = useState(null);
  const successTimerRef = useRef(null);

  const showSuccessToast = useCallback((msg) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessToast(msg);
    successTimerRef.current = setTimeout(() => setSuccessToast(null), 2500);
  }, []);

  // Stable ref so STT event callbacks always read the latest handler
  // without needing to be listed in hook deps.
  const handleFinalTranscriptRef = useRef(null);

  // Refs so the 'end' event callback always reads fresh values without
  // stale closures — state setters alone are not enough here because
  // the 'end' callback is registered once and never re-registered.
  const isRecordingRef    = useRef(false);
  const lastTranscriptRef = useRef('');

  // VOICE-001: persisted recording (Android 13+) for server-side Whisper.
  const audioUriRef        = useRef(null);
  const persistAudioRef    = useRef(false); // true when this session asked to persist
  const audioEndedRef      = useRef(false); // 'audioend' seen → file is complete
  const audioEndWaiterRef  = useRef(null);  // resolves a pending wait for 'audioend'
  const autoStopTimerRef   = useRef(null);
  const recordingTimerRef  = useRef(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const clearRecordingTimers = useCallback(() => {
    if (autoStopTimerRef.current)  clearTimeout(autoStopTimerRef.current);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    autoStopTimerRef.current  = null;
    recordingTimerRef.current = null;
    setRecordingSeconds(0);
  }, []);

  useEffect(() => clearRecordingTimers, [clearRecordingTimers]);

  // ── STT event listeners (called unconditionally — hooks rule) ─────────────
  // useSTTEvent is a no-op when expo-speech-recognition isn't available.
  useSTTEvent('result', (e) => {
    const best = e.results?.[0]?.transcript ?? '';
    if (e.results?.[0]?.audioUri) audioUriRef.current = e.results[0].audioUri;
    setVoiceTranscript(best);
    // Store every non-empty partial so 'end' can use it if isFinal never fires.
    if (best) lastTranscriptRef.current = best;
    if (e.isFinal && handleFinalTranscriptRef.current) {
      handleFinalTranscriptRef.current(best);
    }
  });

  // 'end' fires after stop() on both iOS and Android, even when the engine
  // never emits a 'result' with isFinal=true.  Use it as the guaranteed
  // trigger so the user always reaches EventForm.
  useSTTEvent('end', () => {
    if (isRecordingRef.current) {
      // Use whatever partial transcript we captured; empty string is fine —
      // handleFinalTranscript will open EventForm with a blank prefill.
      handleFinalTranscriptRef.current?.(lastTranscriptRef.current);
    }
  });

  // The persisted file's URI arrives on 'audioend' (not on 'result'). On
  // Android it fires after the final result, so handleFinalTranscript waits for it.
  useSTTEvent('audioend', (e) => {
    if (e?.uri) audioUriRef.current = e.uri;
    audioEndedRef.current = true;
    audioEndWaiterRef.current?.();
    audioEndWaiterRef.current = null;
  });

  useSTTEvent('error', (e) => {
    console.warn('SpeechRecognition error:', e.error);
    setIsRecording(false);
    setVoiceStatus('idle');
    setVoiceTranscript('');
    if (pulseLoop.current) { pulseLoop.current.stop(); fabPulse.setValue(1); }
  });

  const closeSearch = useCallback(() => {
    setSearchVisible(false);
    setSearchQuery('');
    setSelectedCategory('');
  }, []);
  const [cacheLabel, setCacheLabel] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Selected day in the week strip — defaults to today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(todayStart);

  // ── Back to today after a long break ─────────────────────────────────────
  // Short trips (open an event, a profile, the menu, or switch apps for a bit)
  // keep the week you were on. After more than 30 minutes in the background,
  // or on a new day, Home shows today again with search and filters cleared.
  // A fresh app start always begins on today (nothing is restored from storage).
  const LONG_BREAK_MS = 30 * 60 * 1000;
  const [resetSignal, setResetSignal] = useState(0);
  const backgroundAt = useRef(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        if (!backgroundAt.current) backgroundAt.current = Date.now();
        return;
      }
      if (state !== 'active' || !backgroundAt.current) return;
      const since = backgroundAt.current;
      backgroundAt.current = null;
      const newDay = new Date(since).toDateString() !== new Date().toDateString();
      if (Date.now() - since < LONG_BREAK_MS && !newDay) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
      setResetSignal(n => n + 1);          // WeekStrip / MonthCalendar jump back
      closeSearch();                       // search text + category filter
      clearFilter();                       // person/group filter (bubble row)
    });
    return () => sub.remove();
  }, [closeSearch]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // A dedicated 20px strip on the left edge pulls the drawer out from under
  // the screen (drawer.edgePan follows the finger).

  // ── Fetch events + tasks together ────────────────────────────────────────
  // Use allSettled so a 404 (new user with no family) doesn't crash the other request.
  const fetchEvents = useCallback(async () => {
    const request = ++requestId.current;
    const familyId = familyIdRef.current;
    // A failed request may retain data only within the same account/family.
    // Reset synchronously before starting any requests for the new scope.
    const switched = dataScope.current !== familyId;
    if (switched) {
      dataScope.current = familyId;
      setEvents([]);
      setTasks([]);
      setMyGroups([]);
      clearFilter();
      setPendingCount(0);
      setNotifUnread(0);
      setChatUnread(0);
      setCacheLabel(null);
      setIsOffline(false);
      setLoading(Boolean(familyId));
      setRefreshing(false);
    }
    if (!familyId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const isCurrent = () => request === requestId.current && familyId === familyIdRef.current;
    let settled = false;
    if (switched) {
      loadCache(familyId).then(cached => {
        if (settled || !isCurrent() || !cached.savedAt) return;
        setEvents(cached.events);
        setTasks(cached.tasks);
        setCacheLabel(savedAtLabel(cached.savedAt));
        setLoading(false);
      });
    }
    try {
      const [eventsRes, tasksRes, groupsRes] = await Promise.allSettled([
        API.get('/events'),
        API.get('/tasks/family'),
        API.get('/groups'),
      ]);
      settled = true;
      if (!isCurrent()) return;

      if (groupsRes.status === 'fulfilled') {
        setMyGroups(groupsRes.value.data.groups || []);
      }

      const eventsOK = eventsRes.status === 'fulfilled';
      const tasksOK = tasksRes.status === 'fulfilled';
      const newEvents = eventsOK ? (eventsRes.value.data.events || []) : null;
      const newTasks = tasksOK ? (tasksRes.value.data.tasks || []) : null;
      if (eventsOK) setEvents(newEvents);
      if (tasksOK) setTasks(newTasks);
      const complete = eventsOK && tasksOK && groupsRes.status === 'fulfilled';
      setIsOffline(!complete);
      if (complete) {
        setCacheLabel(null);
        saveCache(newEvents, newTasks, familyId);
      } else {
        // allSettled never throws on network failures. Keep the failed dataset
        // in memory, fall back to disk only if empty, and never replace a good
        // persisted snapshot with a partial response.
        const cached = await loadCache(familyId);
        if (!isCurrent()) return;
        if (!eventsOK) setEvents(prev => prev.length ? prev : cached.events);
        if (!tasksOK) setTasks(prev => prev.length ? prev : cached.tasks);
        setCacheLabel(savedAtLabel(cached.savedAt));
      }
    } catch (err) {
      // No err.response means a network failure (no connection)
      if (!isCurrent()) return;
      if (!err.response) {
        const cached = await loadCache(familyId);
        if (!isCurrent()) return;
        if (cached.events.length > 0 || cached.tasks.length > 0) {
          setEvents(cached.events);
          setTasks(cached.tasks);
          setCacheLabel(savedAtLabel(cached.savedAt));
        }
        setIsOffline(true);
      } else {
        console.error('fetchEvents error:', err.message);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // ── Fetch notifications unread count ─────────────────────────────────────
  const fetchNotifUnread = useCallback(async () => {
    const familyId = familyIdRef.current;
    const request = requestId.current;
    if (!familyId) return;
    try {
      const res = await API.get('/notifications');
      if (familyId !== familyIdRef.current || request !== requestId.current) return;
      setNotifUnread(res.data.unread_count || 0);
    } catch { /* silent */ }
  }, []);

  // ── Fetch pending count for the badge ────────────────────────────────────
  // Adds up pending tasks + notifications + event invitations
  const fetchPendingCount = useCallback(async () => {
    const familyId = familyIdRef.current;
    const request = requestId.current;
    if (!familyId) return;
    const [pendingRes, notifs, invites, assigneeNotifs] = await Promise.allSettled([
      API.get('/tasks/pending'),
      API.get('/tasks/notifications'),
      API.get('/events/invitations'),
      API.get('/tasks/assignee-notifications'),
    ]);
    if (familyId !== familyIdRef.current || request !== requestId.current) return;
    const get = (r, key) => r.status === 'fulfilled' ? (r.value.data[key]?.length || 0) : 0;
    setPendingCount(
      get(pendingRes,      'tasks') +
      get(notifs,          'notifications') +
      get(invites,         'invitations') +
      get(assigneeNotifs,  'notifications')
    );
  }, []);

  // ── Voice capture helpers ─────────────────────────────────────────────────

  // Keep the stable refs up to date after each render so STT callbacks
  // always read the latest values without stale closures.
  // (These effects run synchronously after render, before the next event.)
  useEffect(() => {
    handleFinalTranscriptRef.current = handleFinalTranscript;
  });
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Animate the FAB pulse ring on/off
  const startFabPulse = useCallback(() => {
    fabPulse.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(fabPulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [fabPulse]);

  const stopFabPulse = useCallback(() => {
    pulseLoop.current?.stop();
    fabPulse.setValue(1);
  }, [fabPulse]);

  // Called when the final transcript arrives (or 'end' fires after stop()).
  // NEVER opens EventForm — always creates in background.
  const hasNavigatedRef = useRef(false);
  const handleFinalTranscript = useCallback(async (text) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    isRecordingRef.current  = false;

    const trimmed = text.trim();

    // Stop the FAB pulse and recording indicator
    setIsRecording(false);
    stopFabPulse();
    clearRecordingTimers();

    // A final 'result' can arrive before 'audioend' — wait briefly so the
    // persisted file is complete and its URI is known.
    if (persistAudioRef.current && !audioEndedRef.current) {
      await new Promise((resolve) => {
        audioEndWaiterRef.current = resolve;
        setTimeout(resolve, 1500);
      });
      audioEndWaiterRef.current = null;
    }

    // Nothing captured → let the user know and reset quietly
    if (!trimmed && !audioUriRef.current) {
      setVoiceStatus('idle');
      setVoiceTranscript('');
      hasNavigatedRef.current = false;
      showSuccessToast("Couldn't hear you — try again");
      return;
    }

    // Show "Creating…" pill while we work
    setVoiceStatus('creating');
    setVoiceTranscript('');

    // ── Whisper (server) first, when we have a recording ──────────────────
    const uri = audioUriRef.current;
    audioUriRef.current = null; // consume immediately
    if (uri) {
      try {
        const formData = new FormData();
        // expo-speech-recognition persists 16 kHz PCM WAV on Android and iOS
        formData.append('audio', { uri, type: 'audio/wav', name: 'voice.wav' });
        formData.append('tz', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich');
        const response = await API.post('/voice', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 20000,
        });
        if (response.status === 201 || response.status === 200) {
          const title = response.data?.data?.event?.title || 'Event';
          setVoiceStatus('idle');
          hasNavigatedRef.current = false;
          fetchEvents();
          showSuccessToast(`✓ "${title}" created`);
          return;
        }
      } catch (_err) {
        // Groq failed or server error → fall through to local path
      }
    }

    // ── Fallback: local parseVoiceInput path ──────────────────────────────
    if (!trimmed) {
      setVoiceStatus('idle');
      hasNavigatedRef.current = false;
      showSuccessToast("Couldn't hear you — try again");
      return;
    }

    // Parse — if no title found use the full raw transcript as the title
    const parsed = parseVoiceInput(trimmed);
    if (!parsed.title) parsed.title = trimmed;

    // ── Shared date helpers ───────────────────────────────────────────────
    const pad = n => String(n).padStart(2, '0');
    const toISOLocal = d => d.toISOString(); // exact moment (UTC), shown in local time everywhere
    const toDateOnly = d =>
      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    // ── Task intent ───────────────────────────────────────────────────────
    if (parsed.intent === 'task') {
      // Try to match assigneeName against family members
      let assignedTo = user.id; // default: self
      if (parsed.assigneeName) {
        const nameLower = parsed.assigneeName.toLowerCase();
        const match = members.find(
          m => m.first_name?.toLowerCase() === nameLower ||
               m.last_name?.toLowerCase()  === nameLower
        );
        if (match) assignedTo = match.id;
      }

      const dueDate = parsed.date
        ? new Date(`${parsed.date}T${parsed.time || '09:00'}:00`)
        : null;

      try {
        await API.post('/tasks/standalone', {
          title:       parsed.title,
          assigned_to: assignedTo,
          due_date:    dueDate ? toISOLocal(dueDate) : null,
          position:    'full',
        });
        setVoiceStatus('idle');
        hasNavigatedRef.current = false;
        const toastName = parsed.assigneeName || 'You';
        showSuccessToast(`✓ Task "${parsed.title}" → ${toastName}`);
      } catch (_err) {
        setVoiceStatus('idle');
        hasNavigatedRef.current = false;
        showSuccessToast('Could not create task — try again');
      }
      return;
    }

    // ── Event intent (default) ────────────────────────────────────────────
    const startDate = (() => {
      const base = parsed.date ? new Date(`${parsed.date}T00:00:00`) : new Date();
      if (parsed.time) {
        const [h, m] = parsed.time.split(':').map(Number);
        base.setHours(h, m, 0, 0);
      } else {
        const now = new Date();
        base.setHours(now.getHours() + 1, 0, 0, 0);
      }
      return base;
    })();
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    const isAllDay = !parsed.time && !parsed.date;

    const payload = {
      title:               parsed.title,
      description:         '',
      location:            parsed.location || '',
      notes:               '',
      video_call_link:     '',
      priority:            'medium',
      category:            '',
      color:               '#1a8fa8',
      recurrence:          parsed.recurrence || '',
      is_all_day:          isAllDay,
      is_private:          false,
      start_date:          isAllDay ? toDateOnly(startDate) : toISOLocal(startDate),
      end_date:            isAllDay ? toDateOnly(endDate)   : toISOLocal(endDate),
      recurrence_end_date: null,
    };

    try {
      await API.post('/events/create', payload);
      setSelectedDate(startDate);
      fetchEvents();
      setVoiceStatus('idle');
      hasNavigatedRef.current = false;
      showSuccessToast(`✓ "${parsed.title}" created`);
    } catch (_err) {
      setVoiceStatus('idle');
      hasNavigatedRef.current = false;
      showSuccessToast('Could not create event — try again');
    }
  }, [stopFabPulse, clearRecordingTimers, fetchEvents, showSuccessToast, members, user]);

  // Long-press on FAB → start recording
  const handleFabLongPress = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);
    isRecordingRef.current  = true;   // update ref immediately (state is async)
    lastTranscriptRef.current = '';   // clear leftovers from any previous session
    audioUriRef.current       = null;
    audioEndedRef.current     = false;
    persistAudioRef.current   = false;
    setVoiceStatus('listening');
    setVoiceTranscript('');
    startFabPulse();

    if (STT_AVAILABLE) {
      try {
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
          setIsRecording(false);
          isRecordingRef.current = false;
          setVoiceStatus('idle');
          stopFabPulse();
          showSuccessToast('Microphone permission denied');
          return;
        }
        // Guard: user may have released the FAB while the permission dialog was showing
        if (!isRecordingRef.current) {
          stopFabPulse();
          return;
        }
        // Persist audio for Whisper only on Android 13+ (API 33); elsewhere
        // keep the on-device transcript path.
        persistAudioRef.current = Platform.OS === 'android' && Platform.Version >= 33;
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US', interimResults: true, continuous: false,
          ...(persistAudioRef.current && { recordingOptions: { persist: true } }),
        });
        // 30 s max, with a seconds counter in the pill
        clearRecordingTimers();
        autoStopTimerRef.current  = setTimeout(() => { handleFabRelease(); }, 30000);
        recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
        setIsRecording(false);
        isRecordingRef.current = false;
        setVoiceStatus('idle');
        stopFabPulse();
        showSuccessToast('Voice not available — try again');
      }
    } else {
      // No STT module — show a clear message instead of silently failing
      setIsRecording(false);
      isRecordingRef.current = false;
      setVoiceStatus('idle');
      stopFabPulse();
      showSuccessToast('Voice requires a dev build');
    }
    // In Expo Go (no STT): pill shows "Listening…" and releasing triggers the
    // fallback path via handleFabRelease → handleFinalTranscript('').
  // handleFabRelease is declared below; the auto-stop callback reads it at fire time.
  }, [isRecording, startFabPulse, stopFabPulse, clearRecordingTimers]);

  // PressOut on FAB → stop recording.
  // Use isRecordingRef (not state) — state update from onLongPress is async
  // and may not have committed by the time onPressOut fires.
  const handleFabRelease = useCallback(() => {
    clearRecordingTimers(); // before the guard: STT may have ended on its own
    if (!isRecordingRef.current) return;
    if (STT_AVAILABLE) {
      try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
      // The STT 'end' event is the guaranteed trigger for handleFinalTranscript
      // (works on both iOS and Android, even when isFinal is never set).
    }
    // No STT: handleFabLongPress already reset state and showed the toast
  }, [clearRecordingTimers]);

  // Refresh on mount and every account/family resolution or change. Cache
  // fallback happens inside this guarded refresh, never an unscoped seed.
  useEffect(() => {
    fetchEvents();
    fetchPendingCount();
    fetchNotifUnread();
  }, [activeScope, fetchEvents, fetchPendingCount, fetchNotifUnread]);

  // Re-fetch when this screen comes back into focus (returning from other screens)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
      fetchPendingCount();
      fetchNotifUnread();
    });
    return unsubscribe;
  }, [navigation, fetchEvents, fetchPendingCount, fetchNotifUnread]);

  // SSE — live updates while the app is in the foreground.
  // eventTick increments whenever the server fires event_update.
  // taskTick  increments whenever the server fires task_update.
  // Skip the very first render (tick = 0) since mount already fetches.
  useEffect(() => { if (eventTick > 0) fetchEvents(); },                                    [eventTick]);
  useEffect(() => { if (taskTick  > 0) { fetchEvents(); fetchPendingCount(); fetchNotifUnread(); } }, [taskTick]);
  useEffect(() => { if (notifTick > 0) { fetchPendingCount(); fetchNotifUnread(); } }, [notifTick]);

  // Re-fetch tasks when returning from TaskFormScreen or any other screen
  useFocusEffect(useCallback(() => { fetchEvents(); fetchPendingCount(); }, [fetchEvents, fetchPendingCount]));

  // Increment chat badge for messages from other family members
  useEffect(() => {
    if (!lastChatMsg) return;
    if (Number(lastChatMsg.user_id) === Number(user?.id)) return;
    if (lastChatMsg.family_id && family?.id && Number(lastChatMsg.family_id) !== Number(family.id)) return;
    setChatUnread(prev => prev + 1);
  }, [lastChatMsg]);

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

  // One bubble filter: a person bubble shows events that person owns,
  // created or attends; a group bubble shows events shared with that group;
  // no selection (the "All" bubble) shows everything.
  const memberFiltered = (() => {
    if (selectedFilter.type === 'person') {
      return events.filter((e) => eventInvolvesPerson(e, selectedFilter.id));
    }
    if (selectedFilter.type === 'group') {
      return events.filter((e) => Array.isArray(e.group_ids) && e.group_ids.map(Number).includes(Number(selectedFilter.id)));
    }
    return events;
  })();

  const q = searchQuery.trim().toLowerCase();
  const isSearchActive = q.length > 0 || selectedCategory !== '';

  // When search or category is active → search ALL events across all dates.
  // When inactive → only show events for the selected day (normal calendar mode).
  const dayEvents = isSearchActive
    ? memberFiltered
        .filter(e => {
          if (selectedCategory && e.category !== selectedCategory) return false;
          if (q) {
            const inTitle    = (e.title    || '').toLowerCase().includes(q);
            const inLocation = (e.location || '').toLowerCase().includes(q);
            const inNotes    = (e.notes    || '').toLowerCase().includes(q);
            if (!inTitle && !inLocation && !inNotes) return false;
          }
          return true;
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    : memberFiltered.filter(e => onSameDay(e.start_date, selectedDate, e.is_all_day));

  // Tasks filtered by person; tasks have no groups, so a group filter shows all tasks.
  // When search is active also filter by query + category
  const memberFilteredTasks = (() => {
    let list = selectedFilter.type === 'person'
      ? tasks.filter(t => Number(t.assigned_to) === Number(selectedFilter.id))
      : tasks;
    if (isSearchActive) {
      if (selectedCategory) list = list.filter(t => t.category === selectedCategory);
      if (q) list = list.filter(t => (t.title || '').toLowerCase().includes(q));
    }
    return list;
  })();

  // Coming up: the next events for the current person filter (or everyone),
  // so choosing a bubble always shows something useful even when the
  // selected day itself is empty.
  const upcomingEvents = (() => {
    if (isSearchActive) return [];
    const from = new Date(selectedDate); from.setHours(23, 59, 59, 999);
    const until = new Date(from); until.setDate(until.getDate() + 60);
    return memberFiltered
      .filter(e => { const d = new Date(e.start_date); return d > from && d <= until; })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 20);
  })();

  // Combined list:
  //   Events section  → each event card also shows its linked tasks inline
  //   Tasks section   → ALL tasks (event-linked + standalone) so they're always visible
  const listData = [
    ...(dayEvents.length > 0
      ? [{ type: 'sectionHeader', title: t('home.events'), key: 'sh-events' }]
      : []),
    ...dayEvents.map(e => ({
      type: 'event',
      data: e,
      showDate: isSearchActive,  // pass flag so EventRow can show the date
      eventTasks: memberFilteredTasks.filter(t => Number(t.event_id) === Number(e.id)),
      key: `e-${e.id}`,
    })),
    ...(upcomingEvents.length > 0
      ? [{ type: 'sectionHeader', title: t('home.coming_up'), key: 'sh-upcoming' }]
      : []),
    ...upcomingEvents.map(e => ({
      type: 'event',
      data: e,
      showDate: true,
      eventTasks: memberFilteredTasks.filter(t => Number(t.event_id) === Number(e.id)),
      key: `u-${e.id}`,
    })),
    ...(memberFilteredTasks.length > 0
      ? [{ type: 'sectionHeader', title: t('home.tasks'), key: 'sh-tasks' }]
      : []),
    ...memberFilteredTasks.map(t => ({ type: 'task', data: t, key: `t-${t.id}` })),
  ];

  // ── Toggle member filter ──────────────────────────────────────────────────
  const handleMemberPress = (memberId) => {
    setSelectedFilter((prev) => (
      prev.type === 'person' && Number(prev.id) === Number(memberId)
        ? { type: null, id: null }
        : { type: 'person', id: memberId }
    ));
  };

  // ── Complete a task ───────────────────────────────────────────────────────
  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}/complete`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      Alert.alert(t('common.error'), t('tasks.could_not_complete'));
    }
  }, []);

  // ── Delete a task ─────────────────────────────────────────────────────────
  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await API.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      Alert.alert(t('common.error'), t('tasks.could_not_delete'));
    }
  }, []);

  const handleDeleteEvent = useCallback(async (eventId) => {
    try {
      await API.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('events.could_not_delete'));
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
      Alert.alert(t('common.error'), t('tasks.could_not_save_arrival'));
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
      const msg = err.response?.data?.message || err.message || t('common.something_went_wrong');
      console.error('handleAcceptTask error:', msg);
      Alert.alert(t('common.error'), msg);
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
    if (date.getTime() === todayNow.getTime())    return t('home.today');
    if (date.getTime() === tomorrow.getTime())    return t('home.tomorrow');
    if (date.getTime() === yesterday.getTime())   return t('home.yesterday');
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Home layer — stays put and fades back while the drawer is open ── */}
      <Animated.View style={[styles.stage, homeRollStyle(drawer.progress)]}>
      <View style={styles.stageInner}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      {/* Left edge strip — 20px wide, full height, captures swipe-right */}
      <View style={styles.edgeZone} {...drawer.edgePan.panHandlers} />

      {/* ── Dismiss overlay — tapping anywhere outside search closes it ── */}
      {searchVisible && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={closeSearch}
        />
      )}

      {/* ── Top card: header + members + search + calendar as ONE piece ── */}
      <View style={styles.topCard}>

      {/* ── Header ── */}
      <View style={styles.header}>

        {HEADER_STYLE === 'logo' ? (
          <AppIconButton onPress={drawer.open} />
        ) : (<>
        {/* Left — gradient hamburger */}
        <TouchableOpacity style={styles.iconBtn} onPress={drawer.open}>
          <View style={styles.hamburger}>
            <LinearGradient colors={['#56e39f','#4facfe','#f857a6','#f48c06']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.hamburgerLine} />
            <LinearGradient colors={['#56e39f','#4facfe','#f857a6','#f48c06']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.hamburgerLine} />
            <LinearGradient colors={['#56e39f','#4facfe','#f857a6','#f48c06']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>

        {/* Centre — WHEN title. Wrapped in a pointerEvents="none" View: on
            Android the full-width title text was sitting on top of the
            hamburger and swallowing its taps (style.pointerEvents on Text
            isn't honoured there). */}
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitleText}>it's for us</Text>
        </View>
        </>)}

        {/* Right — search + chat + bell */}
        <View style={styles.headerRight}>
          {/* Search toggle */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => searchVisible ? closeSearch() : setSearchVisible(true)}
          >
            <Ionicons
              name={searchVisible ? 'search' : 'search-outline'}
              size={22}
              color={searchVisible ? '#1a8fa8' : headerIconColor}
            />
          </TouchableOpacity>

          {/* Chat icon — family chat, badge shows unread messages */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setChatUnread(0); navigation.navigate('Chat'); }}
          >
            <Ionicons
              name={chatUnread > 0 ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={chatUnread > 0 ? '#1a8fa8' : headerIconColor}
            />
            {chatUnread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {chatUnread > 9 ? '9+' : chatUnread}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Bell — combined pending + unread notifications badge */}
          {(() => {
            const totalCount = pendingCount + notifUnread;
            return (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons
                  name={totalCount > 0 ? 'notifications' : 'notifications-outline'}
                  size={22}
                  color={totalCount > 0 ? '#1a8fa8' : headerIconColor}
                />
                {totalCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalCount > 9 ? '9+' : totalCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}
        </View>

      </View>

      {/* ── Offline banner ── */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
          <Text style={styles.offlineBannerText}>
            {t('home.offline')}{cacheLabel ? ` · ${t('home.last_updated')} ${cacheLabel}` : ` · ${t('home.showing_cached')}`}
          </Text>
        </View>
      )}

      {/* ── Family filter — only shown when user belongs to 2+ families ── */}
      <FamilyFilterBar
        families={families}
        activeFamilyId={family?.id}
        onSelect={(id) => { switchFamily(id); }}
      />

      {/* ── Member + group bubbles — hidden when there is nothing to show ── */}
      {(sortedMembers.length > 0 || myGroups.length > 0) && (
        <View style={styles.membersRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.membersRow}
            contentContainerStyle={styles.membersContent}
          >
            {/* "All" first — clears the person/group filter. Only useful when there is something to filter. */}
            {(sortedMembers.length > 1 || myGroups.length > 0) && (
              <TouchableOpacity
                style={styles.bubble}
                onPress={clearFilter}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedFilter.type === null }}
              >
                <View style={styles.bubbleHaloWrap}>
                  {selectedFilter.type === null && (
                    <View style={[styles.bubbleHalo, { backgroundColor: '#1a8fa8', opacity: 0.25 }]} />
                  )}
                  <View style={[styles.bubbleCircle, styles.bubbleAllCircle]}>
                    <Ionicons name="people" size={18} color="#1a8fa8" />
                  </View>
                </View>
                <Text style={[styles.bubbleName, selectedFilter.type === null && { color: '#1a8fa8', fontWeight: '700' }]} numberOfLines={1}>
                  {t('home.filter_all')}
                </Text>
              </TouchableOpacity>
            )}
            {sortedMembers.map((member) => (
              <MemberBubble
                key={member.id}
                member={member}
                selected={selectedFilter.type === 'person' && Number(selectedFilter.id) === Number(member.id)}
                onPress={() => handleMemberPress(member.id)}
                onLongPress={() => navigation.navigate('MemberProfile', { memberId: member.id })}
              />
            ))}
            {myGroups.map((group) => (
              <GroupBubble
                key={`g-${group.id}`}
                group={group}
                selected={selectedFilter.type === 'group' && Number(selectedFilter.id) === Number(group.id)}
                onPress={() => setSelectedFilter((prev) => (
                  prev.type === 'group' && Number(prev.id) === Number(group.id)
                    ? { type: null, id: null }
                    : { type: 'group', id: group.id }
                ))}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Search panel — slides in below member bubbles ── */}
      {searchVisible && (
        <View style={styles.searchPanel}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={15} color="#8e8e93" style={styles.searchInputIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('home.search_placeholder')}
              placeholderTextColor="#aeaeb2"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={16} color="#aeaeb2" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <TouchableOpacity
              style={[styles.chip, !selectedCategory && styles.chipActive]}
              onPress={() => setSelectedCategory('')}
            >
              <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>{t('common.all')}</Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.chip,
                  selectedCategory === cat.name && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                onPress={() => setSelectedCategory(selectedCategory === cat.name ? '' : cat.name)}
              >
                <Text style={[
                  styles.chipText,
                  selectedCategory === cat.name && styles.chipTextActive,
                ]}>
                  {cat.icon} {cat.name}
                </Text>
              </TouchableOpacity>
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
                  resetSignal={resetSignal}
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
                  resetSignal={resetSignal}
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
      </View>
      {/* ── end top card ── */}

      {/* ── Day events list ── */}
      {loading ? (
        <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
      ) : (
        <Animated.View style={{ flex: 1, opacity: listAlpha, transform: [{ translateY: listTranslateY }] }}>
        <TreadmillList
          // New list whenever the filter, chip, day or search changes: the roll
          // effect measures row positions and content height, and stale numbers
          // from the previous (longer) list made a short list tilt its last row
          // under the + button. A fresh list measures from scratch.
          key={`${selectedFilter.type ?? ''}:${selectedFilter.id ?? ''}|${selectedDate.toDateString()}|${isSearchActive ? 's' : ''}|${selectedCategory}`}
          bottomInset={insets.bottom}
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'sectionHeader') {
              return <Text style={styles.sectionHeader}>{item.title}</Text>;
            }
            if (item.type === 'event') {
              return <EventRow event={item.data} navigation={navigation} eventTasks={item.eventTasks} showDate={item.showDate} onDelete={handleDeleteEvent} />;
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
            isSearchActive
              ? <Text style={styles.dayLabel}>
                  {t('home.result', { count: dayEvents.length })}
                  {selectedCategory ? ` · ${selectedCategory}` : ''}
                </Text>
              : <Text style={styles.dayLabel}>{dayHeader(selectedDate)}</Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {isSearchActive ? t('home.no_matching') : t('home.no_events_tasks')}
            </Text>
          }
        />
        </Animated.View>
      )}
    </SafeAreaView>

      {/* ── Voice status pill — floats above the FAB while recording ── */}
      {(isRecording || voiceStatus === 'creating') && (
        <View style={[styles.voicePill, { bottom: 96 + insets.bottom }]}>
          <Animated.View style={[styles.voicePillDot, { opacity: fabPulse.interpolate({ inputRange: [1, 1.5], outputRange: [1, 0.3] }) }]} />
          <View>
            <Text style={styles.voicePillText}>
              {voiceStatus === 'creating'    ? 'Creating…'
               : voiceStatus === 'processing' ? 'Processing…'
               : 'Listening… (' + recordingSeconds + 's)'}
            </Text>
            {voiceTranscript ? (
              <Text style={styles.voicePillTranscript} numberOfLines={2}>{voiceTranscript}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Success toast — brief green pill above FAB after voice create ── */}
      {successToast && (
        <View style={[styles.successPill, { bottom: 96 + insets.bottom }]}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.successPillText}>{successToast}</Text>
        </View>
      )}

      {/* ── FAB — floating action button, bottom right ── */}
      {/* Short press → opens radial pie menu.            */}
      {/* Long press (hold) → FAB becomes mic, records.   */}
      {/* Lift finger (pressOut) → stops recording.       */}
      <View style={[styles.fab, styles.fabSmall, { alignItems: 'center', justifyContent: 'center', bottom: 32 + insets.bottom }]}
        pointerEvents="box-none"
      >
        {/* Pulse ring — expands outward while recording */}
        {isRecording && (
          <Animated.View
            style={{
              position: 'absolute',
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(26,143,168,0.35)',
              transform: [{ scale: fabPulse }],
            }}
          />
        )}
        <Pressable
          ref={fabRef}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isRecording ? '#0e6d82' : '#1a8fa8', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => {
            if (!isRecording) {
              fabRef.current?.measure((_x, _y, w, h, px, py) => {
                setFabCenter({ x: px + w / 2, y: py + h / 2 });
                setRadialVisible(true);
              });
            }
          }}
          onLongPress={handleFabLongPress}
          onPressOut={handleFabRelease}
          delayLongPress={400}
        >
          <Ionicons name={isRecording ? 'mic' : 'add'} size={26} color="#fff" />
        </Pressable>
      </View>

      {/* While the drawer is out: tap the faded home screen to close it */}
      {drawer.active && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.stageDim, { opacity: drawer.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}
          {...drawer.closePan.panHandlers}
        />
      )}
      </View>
      </Animated.View>

      {/* Drawer rolls in OVER the faded home screen */}
      <DrawerMenu controller={drawer} navigation={navigation} pendingCount={pendingCount} notifCount={notifUnread} />

      {/* ── Radial pie menu ── */}
      <RadialMenu
        visible={radialVisible}
        fabCenter={fabCenter}
        onClose={() => setRadialVisible(false)}
        onNewEvent={() => navigation.navigate('EventForm')}
        onNewTask={() => navigation.navigate('TaskForm')}
        onScan={() => navigation.navigate('Scan')}
      />

    </View>
  );
}

