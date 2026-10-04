import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API from '../api/axios';
import styles from '../styles/EventDetailsScreen.styles';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

// ─── Info row ────────────────────────────────────────────────────────────────
// Matches the web's icon + value row layout. `icon` is an emoji standing in
// for the SVG icons used on web — same information, same position.

function InfoRow({ icon, children }) {
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

function TaskRow({ task }) {
  const initials = [task.first_name?.[0], task.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

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
          <Text style={styles.declinedText}>{task.first_name} declined this task</Text>
        )}

        {/* Meta: name · role · arrival time */}
        <Text style={styles.taskMeta}>
          {task.first_name} · {task.position}
          {task.status === 'accepted' && (
            task.due_date
              ? ` · arrival ${new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ' · arrival not set'
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
      </View>
    </View>
  );
}

// ─── EventDetailsScreen ──────────────────────────────────────────────────────

export default function EventDetailsScreen({ route, navigation }) {
  const { eventId } = route.params;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvent = useCallback(async () => {
    try {
      const res = await API.get(`/events/${eventId}`);
      setEvent(res.data.event || res.data);
    } catch {
      setError('Could not load event.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event?.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete(`/events/${eventId}`);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete event');
            }
          },
        },
      ]
    );
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
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>{error || 'Event not found.'}</Text>
      </SafeAreaView>
    );
  }

  const color = event.color || '#1a8fa8';
  const attendees = event.attendees || [];
  const tasks = event.tasks || [];

  const timeStr = event.is_all_day
    ? 'All day'
    : `${formatTime(event.start_date)} → ${event.end_date ? formatTime(event.end_date) : ''}`;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Back button ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
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
            {tasks.map(task => <TaskRow key={task.id} task={task} />)}
          </View>
        )}

        {/* ── Info card ── */}
        <View style={styles.card}>

          {event.updated_by_name && (
            <InfoRow icon="✏️">
              <Text style={styles.infoValue}>Updated by {event.updated_by_name}</Text>
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

          {event.location && (
            <InfoRow icon="📍">
              <Text style={styles.infoValue}>{event.location}</Text>
            </InfoRow>
          )}

          {event.video_call_link && (
            <InfoRow icon="📹">
              <TouchableOpacity onPress={() => Linking.openURL(event.video_call_link)}>
                <Text style={styles.infoLink}>Join Video Call</Text>
              </TouchableOpacity>
            </InfoRow>
          )}

          {event.priority && (
            <InfoRow icon="⚡">
              <Text style={styles.infoValue}>{event.priority} Priority</Text>
            </InfoRow>
          )}

          {event.notes && (
            <InfoRow icon="📝">
              <Text style={styles.infoValue}>{event.notes}</Text>
            </InfoRow>
          )}

        </View>

        {/* ── Actions — Edit + Delete, same as web ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EventForm', { event })}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
