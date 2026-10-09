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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { useTranslation } from 'react-i18next';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useStyles } from '../styles/EventDetailsScreen.styles';

import TopCard from '../components/ui/TopCard';
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

// ─── Recurrence parser ───────────────────────────────────────────────────────
// Converts an rrule string like "FREQ=WEEKLY;BYDAY=MO,WE" into plain English.
// No external library — parses only the parts the app actually stores.

const DAY_NAMES = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday',
  FR: 'Friday',  SA: 'Saturday', SU: 'Sunday',
};

function parseRecurrence(rrule) {
  if (!rrule) return '';

  // Pull each key=value pair into a plain object
  const parts = {};
  rrule.split(';').forEach(segment => {
    const [key, value] = segment.split('=');
    if (key && value !== undefined) parts[key.toUpperCase()] = value.toUpperCase();
  });

  const freq  = parts.FREQ  || '';
  const byday = parts.BYDAY || '';
  const interval = parseInt(parts.INTERVAL || '1', 10);

  // Map BYDAY abbreviations to full names, e.g. "MO,WE" → "Monday, Wednesday"
  const dayLabel = byday
    ? byday.split(',').map(d => DAY_NAMES[d] || d).join(', ')
    : '';

  // Build a human-readable label
  if (freq === 'DAILY') {
    return interval > 1 ? `Every ${interval} days` : 'Daily';
  }
  if (freq === 'WEEKLY') {
    const base = interval > 1 ? `Every ${interval} weeks` : 'Weekly';
    return dayLabel ? `${base} on ${dayLabel}` : base;
  }
  if (freq === 'MONTHLY') {
    return interval > 1 ? `Every ${interval} months` : 'Monthly';
  }
  if (freq === 'YEARLY') {
    return interval > 1 ? `Every ${interval} years` : 'Yearly';
  }

  // Fallback: return the raw string rather than nothing
  return rrule;
}

// ─── Info row ────────────────────────────────────────────────────────────────
// Matches the web's icon + value row layout. `icon` is an emoji standing in
// for the SVG icons used on web — same information, same position.

// Icons: one standard set (Ionicons outline), same size and soft grey everywhere.
// `color` is only passed when the colour means something (e.g. priority).
const priorityColor = (p) => {
  const v = String(p || '').toLowerCase();
  if (v === 'high')   return '#ff3b30';
  if (v === 'medium') return '#f48c06';
  return '#8e8e93';
};

function InfoRow({ icon, color = '#8e8e93', children }) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
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
  const { members } = useFamily();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Controls whether the "add attendee" member-picker sheet is visible
  const [showAddModal, setShowAddModal] = useState(false);

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

  // ── Invitation: answer right here (e.g. after tapping the notification) ───
  const [responding, setResponding] = useState(false);
  const myInvite = (event?.attendees || []).find(a => Number(a.user_id) === Number(user?.id));
  const isInvitePending = myInvite?.status === 'pending';

  const respondToInvite = async (response) => {
    setResponding(true);
    try {
      await API.put(`/events/invitations/${eventId}`, { response });
      if (response === 'accepted') {
        await fetchEvent();          // stays open, now part of the calendar
      } else {
        navigation.goBack();         // declined → it's gone for you
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setResponding(false);
    }
  };

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

  // ── Invitation view ──────────────────────────────────────────────────────
  // Not accepted yet → one card with everything about the event, and only the
  // two actions that matter: Decline / Accept. No Edit, Export or Delete.
  if (isInvitePending) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* One card from the top edge down: header + event + answer.
              Square top (it IS the header), rounded floating bottom. */}
          <View style={[styles.inviteCard, { paddingTop: insets.top + 8 }]}>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.inviteBack}>
              <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            {/* Who invited you */}
            <View style={styles.inviteFromRow}>
              <Ionicons name="mail-unread-outline" size={15} color="#f48c06" />
              <Text style={styles.inviteFromText}>
                {t('events.invited_by', { name: event.created_by_name || '' })}
              </Text>
            </View>

            {/* Title with the event colour */}
            <View style={styles.inviteTitleRow}>
              <View style={[styles.titleStripe, { backgroundColor: color }]} />
              <Text style={styles.inviteTitle}>{event.title}</Text>
            </View>

            {/* Details */}
            <View style={styles.inviteDetails}>
              <InfoRow icon="calendar-outline">
                <Text style={styles.infoValue}>{formatDate(event.start_date)}</Text>
                <Text style={styles.infoTime}>{timeStr}</Text>
              </InfoRow>
              {event.location && (
                <InfoRow icon="location-outline">
                  <Text style={styles.infoValue}>{event.location}</Text>
                </InfoRow>
              )}
              {attendees.length > 0 && (
                <InfoRow icon="people-outline">
                  <View style={styles.attendeesRow}>
                    {attendees.map(a => <AttendeeAvatar key={a.user_id || a.id} attendee={a} />)}
                  </View>
                </InfoRow>
              )}
              {event.priority && (
                <InfoRow icon="flag-outline" color={priorityColor(event.priority)}>
                  <Text style={styles.infoValue}>{t('events.priority', { level: event.priority })}</Text>
                </InfoRow>
              )}
              {event.notes && (
                <InfoRow icon="document-text-outline">
                  <Text style={styles.infoValue}>{event.notes}</Text>
                </InfoRow>
              )}
            </View>

            {/* Answer */}
            <View style={styles.inviteDivider} />
            <Text style={styles.inviteQuestion}>{t('events.add_to_your_calendar')}</Text>
            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={[styles.inviteBtn, styles.inviteBtnDecline, responding && { opacity: 0.5 }]}
                onPress={() => respondToInvite('denied')}
                disabled={responding}
              >
                <Text style={styles.inviteBtnDeclineText}>{t('common.decline')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inviteBtn, styles.inviteBtnAccept, responding && { opacity: 0.5 }]}
                onPress={() => respondToInvite('accepted')}
                disabled={responding}
              >
                <Text style={styles.inviteBtnAcceptText}>{t('common.accept')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Back button ── */}
      <TopCard>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </TopCard>

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
            <InfoRow icon="create-outline">
              <Text style={styles.infoValue}>{t('events.updated_by', { name: event.updated_by_name })}</Text>
            </InfoRow>
          )}

          {event.category && (
            <InfoRow icon="pricetag-outline">
              <Text style={styles.infoValue}>{event.category}</Text>
            </InfoRow>
          )}

          {/* ── Attendees ── */}
          {/* Always render the row for creators so the "+" button is reachable
              even when the event has no attendees yet.  Non-creators only see
              this row when there are attendees to show. */}
          {(attendees.length > 0 || Number(event.created_by) === Number(user?.id)) && (
            <InfoRow icon="people-outline">
              <View style={styles.attendeesRow}>

                {/* Existing attendees — long-press to remove (creator only) */}
                {attendees.map(a => {
                  const isCreator = Number(event.created_by) === Number(user?.id);
                  const attendeeId = a.user_id || a.id;

                  if (!isCreator) {
                    // Non-creators see avatars without any interaction
                    return <AttendeeAvatar key={attendeeId} attendee={a} />;
                  }

                  // Creators get a long-press handler that confirms removal
                  return (
                    <TouchableOpacity
                      key={attendeeId}
                      onLongPress={() => {
                        const name = `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'this person';
                        Alert.alert(
                          `Remove ${name}?`,
                          'They will no longer be listed as an attendee.',
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await API.delete(`/events/${eventId}/attendees/${attendeeId}`);
                                  fetchEvent();
                                } catch (err) {
                                  Alert.alert(t('common.error'), err.response?.data?.message || 'Could not remove attendee.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      delayLongPress={400}
                    >
                      <AttendeeAvatar attendee={a} />
                    </TouchableOpacity>
                  );
                })}

                {/* "+" bubble — only the creator sees this */}
                {Number(event.created_by) === Number(user?.id) && (
                  <TouchableOpacity
                    style={styles.addAttendeeBubble}
                    onPress={() => setShowAddModal(true)}
                    accessibilityLabel="Add attendee"
                  >
                    <Text style={styles.addAttendeeBubbleText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </InfoRow>
          )}

          {/* ── Add-attendee picker modal ── */}
          {/* Only mounts when the creator taps "+". Shows family members who
              are not already attending. Tapping a row calls the API and
              refreshes the event so the new avatar appears immediately. */}
          <Modal
            visible={showAddModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Add Attendee</Text>

                {/* Build list: family members not already in attendees[] */}
                {(() => {
                  const attendeeIds = new Set(
                    attendees.map(a => Number(a.user_id || a.id))
                  );
                  const available = (members || []).filter(
                    m => !attendeeIds.has(Number(m.id))
                  );

                  if (available.length === 0) {
                    return (
                      <Text style={styles.modalEmptyText}>
                        All family members are already attending.
                      </Text>
                    );
                  }

                  return (
                    <FlatList
                      data={available}
                      keyExtractor={m => String(m.id)}
                      renderItem={({ item: m }) => {
                        const initials = [m.first_name?.[0], m.last_name?.[0]]
                          .filter(Boolean).join('').toUpperCase() || '?';
                        return (
                          <TouchableOpacity
                            style={styles.memberPickerRow}
                            onPress={async () => {
                              try {
                                await API.post(`/events/${eventId}/attendees`, { user_id: m.id });
                                setShowAddModal(false);
                                fetchEvent();
                              } catch (err) {
                                Alert.alert(t('common.error'), err.response?.data?.message || 'Could not add attendee.');
                              }
                            }}
                          >
                            <View style={[styles.memberPickerCircle, { backgroundColor: m.color || '#1a8fa8' }]}>
                              <Text style={styles.memberPickerInitials}>{initials}</Text>
                            </View>
                            <Text style={styles.memberPickerName}>
                              {m.first_name} {m.last_name}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  );
                })()}

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.modalCloseBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <InfoRow icon="calendar-outline">
            <Text style={styles.infoValue}>{formatDate(event.start_date)}</Text>
            <Text style={styles.infoTime}>{timeStr}</Text>
          </InfoRow>

          {event.recurrence && (
            <InfoRow icon="repeat-outline">
              <Text style={styles.infoValue}>
                {parseRecurrence(event.recurrence)}
              </Text>
              {event.recurrence_end_date && (
                <Text style={styles.infoTime}>
                  {t('events.recurrence_end')}: {formatDate(event.recurrence_end_date)}
                </Text>
              )}
            </InfoRow>
          )}

          {event.location && (
            <InfoRow icon="location-outline">
              <Text style={styles.infoValue}>{event.location}</Text>
            </InfoRow>
          )}

          {event.video_call_link && (
            <InfoRow icon="videocam-outline">
              <TouchableOpacity onPress={() => Linking.openURL(event.video_call_link)}>
                <Text style={styles.infoLink}>{t('events.join_video_call')}</Text>
              </TouchableOpacity>
            </InfoRow>
          )}

          {event.priority && (
            <InfoRow icon="flag-outline" color={priorityColor(event.priority)}>
              <Text style={styles.infoValue}>{t('events.priority', { level: event.priority })}</Text>
            </InfoRow>
          )}

          {event.notes && (
            <InfoRow icon="document-text-outline">
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
