import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { useTranslation } from 'react-i18next';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useStyles } from '../styles/EventDetailsScreen.styles';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
}

// ─── Info row ────────────────────────────────────────────────────────────────
// Matches the web's icon + value row layout. `icon` is an emoji standing in
// for the SVG icons used on web — same information, same position.

function InfoRow({ icon, children }) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>{children}</View>
    </View>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────────
// Matches .event-details-task-badge on web: small pill with colour per status

const BADGE = {
  pending:  { bg: '#fff3cd', color: '#856404' },
  declined: { bg: '#ffeeed', color: '#ff3b30' },
  countered:{ bg: '#e8f4fd', color: '#007aff' },
};

function StatusBadge({ status }) {
  const styles = useStyles();
  const s = BADGE[status];
  if (!s) return null;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Attendee avatar ─────────────────────────────────────────────────────────

function AttendeeAvatar({ attendee }) {
  const styles   = useStyles();
  const initials = [attendee.first_name?.[0], attendee.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  const color = attendee.color || '#1a8fa8';
  const accepted = attendee.status === 'accepted';

  return (
    <View style={styles.attendeeItem}>
      <View style={[
        styles.attendeeCircle,
        { backgroundColor: color },
        // When accepted, ring in the member's own colour — matches web box-shadow
        accepted && { borderWidth: 2, borderColor: color, padding: 2 },
      ]}>
        <Text style={styles.attendeeInitials}>{initials}</Text>
      </View>
      <Text style={styles.attendeeName} numberOfLines={1}>
        {attendee.first_name || '?'}
      </Text>
    </View>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────
// `eventId` and `onRefresh` are needed for the add-subtask flow.
// `currentUserId` restricts the add button to the creator or assignee.

function TaskRow({ task, eventId, onRefresh, currentUserId }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [showInput, setShowInput]   = useState(false);
  const [subTaskText, setSubTaskText] = useState('');
  const [adding, setAdding]         = useState(false);

  const initials = [task.first_name?.[0], task.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  // Only creator or assignee may add subtasks
  const canAddSubTask =
    Number(currentUserId) === Number(task.created_by) ||
    Number(currentUserId) === Number(task.user_id);

  const handleAddSubTask = async () => {
    if (!subTaskText.trim()) return;
    setAdding(true);
    try {
      await API.post(`/events/${eventId}/tasks/${task.id}/subtasks`, {
        title: subTaskText.trim(),
      });
      setSubTaskText('');
      setShowInput(false);
      onRefresh();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('events.could_not_add_subtask'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.taskRow}>
      {/* Avatar */}
      <View style={[styles.taskAvatar, { backgroundColor: task.color || '#1a8fa8' }]}>
        <Text style={styles.taskAvatarText}>{initials}</Text>
      </View>

      <View style={styles.taskInfo}>
        {/* Title + badge */}
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
          <StatusBadge status={task.status} />
        </View>

        {/* Negotiation bubble — only shown when status is countered */}
        {task.status === 'countered' && task.counter_offer && (
          <View style={styles.negotiationBubble}>
            <Text style={styles.negotiationWho}>
              {Number(task.last_counter_by) === Number(task.user_id)
                ? task.first_name : 'You'}:
            </Text>
            <Text style={styles.negotiationText}>"{task.counter_offer}"</Text>
          </View>
        )}

        {/* Declined message */}
        {task.status === 'declined' && (
          <Text style={styles.declinedText}>{t('events.declined_task', { name: task.first_name })}</Text>
        )}

        {/* Meta: name · role · arrival time */}
        <Text style={styles.taskMeta}>
          {task.first_name} · {task.position}
          {task.status === 'accepted' && (
            task.due_date
              ? ` · ${t('events.arrival', { time: new Date(task.due_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) })}`
              : ` · ${t('events.arrival_not_set')}`
          )}
        </Text>

        {/* Sub-tasks */}
        {task.sub_tasks?.length > 0 && (
          <View style={styles.subTasks}>
            {task.sub_tasks.map(sub => (
              <Text key={sub.id} style={styles.subTaskText}>└ {sub.title}</Text>
            ))}
          </View>
        )}

        {/* Add subtask — inline input or trigger button */}
        {canAddSubTask && (
          showInput ? (
            <View style={styles.subTaskInputRow}>
              <TextInput
                style={styles.subTaskInput}
                placeholder={t('events.add_subtask_placeholder')}
                placeholderTextColor="#aaa"
                value={subTaskText}
                onChangeText={setSubTaskText}
                onSubmitEditing={handleAddSubTask}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.subTaskAddBtn, (!subTaskText.trim() || adding) && { opacity: 0.4 }]}
                onPress={handleAddSubTask}
                disabled={!subTaskText.trim() || adding}
              >
                {adding
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark" size={14} color="#fff" />
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.subTaskCancelBtn}
                onPress={() => { setShowInput(false); setSubTaskText(''); }}
              >
                <Ionicons name="close" size={14} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addSubTaskBtn}
              onPress={() => setShowInput(true)}
            >
              <Ionicons name="add" size={13} color="#1a8fa8" />
              <Text style={styles.addSubTaskText}>{t('events.add_subtask')}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

// ─── EventDetailsScreen ──────────────────────────────────────────────────────

export default function EventDetailsScreen({ route, navigation }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { eventId } = route.params;
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvent = useCallback(async () => {
    try {
      const res = await API.get(`/events/${eventId}`);
      setEvent(res.data.event || res.data);
    } catch {
      setError(t('events.could_not_load'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleDelete = () => {
    Alert.alert(
      t('events.delete_title'),
      t('events.delete_confirm', { title: event?.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/events/${eventId}`);
              navigation.goBack();
            } catch (err) {
              Alert.alert(t('common.error'), err.response?.data?.message || t('events.could_not_delete'));
            }
          },
        },
      ]
    );
  };

  const handleExportToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permission_needed'), t('events.calendar_permission'));
        return;
      }

      // Find a writable calendar — prefer the device default
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const target =
        calendars.find(c => c.isPrimary && c.allowsModifications) ||
        calendars.find(c => c.allowsModifications);

      if (!target) {
        Alert.alert(t('events.no_calendar'), t('events.no_calendar_detail'));
        return;
      }

      await Calendar.createEventAsync(target.id, {
        title:       event.title,
        startDate:   new Date(event.start_date),
        endDate:     event.end_date ? new Date(event.end_date) : new Date(event.start_date),
        allDay:      !!event.is_all_day,
        location:    event.location || undefined,
        notes:       event.notes    || undefined,
      });

      Alert.alert(t('events.added_to_calendar'), t('events.added_to_calendar_detail', { title: event.title }));
    } catch (err) {
      Alert.alert(t('common.error'), t('events.could_not_add_to_calendar'));
    }
  };

  // Re-fetch when returning from EventFormScreen so edits show immediately
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchEvent);
    return unsubscribe;
  }, [navigation, fetchEvent]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>{error || t('events.not_found')}</Text>
      </SafeAreaView>
    );
  }

  const color = event.color || '#1a8fa8';
  const attendees = event.attendees || [];
  const tasks = event.tasks || [];

  const timeStr = event.is_all_day
    ? t('common.all_day')
    : `${formatTime(event.start_date)} → ${event.end_date ? formatTime(event.end_date) : ''}`;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Back button ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Title header — matches web: left colour stripe + title ── */}
        <View style={styles.titleHeader}>
          <View style={[styles.titleStripe, { backgroundColor: color }]} />
          <Text style={styles.titleText}>{event.title}</Text>
        </View>

        {/* ── Tasks card — shown above info, same order as web ── */}
        {tasks.length > 0 && (
          <View style={styles.card}>
            {tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                eventId={eventId}
                currentUserId={user?.id}
                onRefresh={fetchEvent}
              />
            ))}
          </View>
        )}

        {/* ── Info card ── */}
        <View style={styles.card}>

          {event.updated_by_name && (
            <InfoRow icon="✏️">
              <Text style={styles.infoValue}>{t('events.updated_by', { name: event.updated_by_name })}</Text>
            </InfoRow>
          )}

          {event.category && (
            <InfoRow icon="🏷️">
              <Text style={styles.infoValue}>{event.category}</Text>
            </InfoRow>
          )}

          {attendees.length > 0 && (
            <InfoRow icon="👥">
              <View style={styles.attendeesRow}>
                {attendees.map(a => (
                  <AttendeeAvatar key={a.id || a.user_id} attendee={a} />
                ))}
              </View>
            </InfoRow>
          )}

          <InfoRow icon="📅">
            <Text style={styles.infoValue}>{formatDate(event.start_date)}</Text>
            <Text style={styles.infoTime}>{timeStr}</Text>
          </InfoRow>

          {event.recurrence && (
            <InfoRow icon="🔁">
              <Text style={styles.infoValue}>
                {event.recurrence_end_date
                  ? t('events.repeats_until', { freq: event.recurrence, date: formatDate(event.recurrence_end_date) })
                  : t('events.repeats', { freq: event.recurrence })}
              </Text>
            </InfoRow>
          )}

          {event.location && (
            <InfoRow icon="📍">
              <Text style={styles.infoValue}>{event.location}</Text>
            </InfoRow>
          )}

          {event.video_call_link && (
            <InfoRow icon="📹">
              <TouchableOpacity onPress={() => Linking.openURL(event.video_call_link)}>
                <Text style={styles.infoLink}>{t('events.join_video_call')}</Text>
              </TouchableOpacity>
            </InfoRow>
          )}

          {event.priority && (
            <InfoRow icon="⚡">
              <Text style={styles.infoValue}>{t('events.priority', { level: event.priority })}</Text>
            </InfoRow>
          )}

          {event.notes && (
            <InfoRow icon="📝">
              <Text style={styles.infoValue}>{event.notes}</Text>
            </InfoRow>
          )}

        </View>

        {/* ── Actions — Edit + Export + Delete ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EventForm', { event })}
          >
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportToCalendar}>
            <Text style={styles.exportBtnText}>{t('events.add_to_calendar')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
