import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API from '../api/axios';
import styles from '../styles/PendingScreen.styles';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ─── Colour stripe ───────────────────────────────────────────────────────────
// Thin left strip — same as the web .sidebar-pending-color

function ColorStripe({ color }) {
  return <View style={[styles.stripe, { backgroundColor: color || '#1a8fa8' }]} />;
}

// ─── Action buttons ──────────────────────────────────────────────────────────
// ✓ accept  ✕ decline  ↩ counter — matches web button row

function ActionButtons({ onAccept, onDecline, onCounter, loading }) {
  return (
    <View style={styles.actionBtns}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.acceptBtn]}
        onPress={onAccept}
        disabled={loading}
      >
        <Text style={styles.acceptBtnText}>✓</Text>
      </TouchableOpacity>

      {onDecline && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.declineBtn]}
          onPress={onDecline}
          disabled={loading}
        >
          <Text style={styles.declineBtnText}>✕</Text>
        </TouchableOpacity>
      )}

      {onCounter && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.counterBtn]}
          onPress={onCounter}
          disabled={loading}
        >
          <Text style={styles.counterBtnText}>↩</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Counter input ───────────────────────────────────────────────────────────
// Shown when the user taps ↩ — matches the web's inline counter input

function CounterInput({ value, onChange, onSend, onCancel, loading }) {
  return (
    <View style={styles.counterBox}>
      <TextInput
        style={styles.counterInput}
        placeholder="I'll bring…"
        placeholderTextColor="#aaa"
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSend}
        autoFocus
        returnKeyType="send"
      />
      <View style={styles.counterActions}>
        <TouchableOpacity
          style={[styles.counterSendBtn, (!value.trim() || loading) && styles.btnDisabled]}
          onPress={onSend}
          disabled={!value.trim() || loading}
        >
          <Text style={styles.counterSendText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.counterCancelBtn} onPress={onCancel}>
          <Text style={styles.counterCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── PendingScreen ───────────────────────────────────────────────────────────

export default function PendingScreen({ navigation }) {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [pendingTasks, setPendingTasks] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [taskNotifications, setTaskNotifications] = useState([]);
  const [assigneeNotifications, setAssigneeNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Responding state — tracks which item is mid-request ──────────────────
  const [respondingTaskId, setRespondingTaskId] = useState(null);
  const [respondingEventId, setRespondingEventId] = useState(null);
  const [respondingNotifId, setRespondingNotifId] = useState(null);

  // ── Counter input state ───────────────────────────────────────────────────
  const [counteringTaskId, setCounteringTaskId] = useState(null);
  const [counterText, setCounterText] = useState('');
  const [counteringNotifId, setCounteringNotifId] = useState(null);
  const [counterNotifText, setCounterNotifText] = useState('');

  // ── Fetch all four data sources in parallel ───────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [tasks, notifs, invites, assigneeNotifs] = await Promise.all([
        API.get('/tasks/pending'),
        API.get('/tasks/notifications'),
        API.get('/events/invitations'),
        API.get('/tasks/assignee-notifications'),
      ]);
      setPendingTasks(tasks.data.tasks || []);
      setTaskNotifications(notifs.data.notifications || []);
      setInvitations(invites.data.invitations || []);
      setAssigneeNotifications(assigneeNotifs.data.notifications || []);
    } catch (err) {
      console.error('PendingScreen fetchAll error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Task actions ──────────────────────────────────────────────────────────

  const handleTaskRespond = async (taskId, response, counterOffer = null) => {
    setRespondingTaskId(taskId);
    try {
      await API.patch(`/tasks/${taskId}/respond`, { response, counter_offer: counterOffer });
      await fetchAll();
    } finally {
      setRespondingTaskId(null);
      setCounteringTaskId(null);
      setCounterText('');
    }
  };

  const handleCounterSubmit = (taskId) => {
    if (!counterText.trim()) return;
    handleTaskRespond(taskId, 'countered', counterText.trim());
  };

  // ── Event invitation actions ──────────────────────────────────────────────

  const handleEventRespond = async (eventId, response) => {
    setRespondingEventId(eventId);
    try {
      await API.put(`/events/invitations/${eventId}`, { response });
      await fetchAll();
    } finally {
      setRespondingEventId(null);
    }
  };

  // ── Creator responds to counter ───────────────────────────────────────────

  const handleCreatorRespond = async (taskId, response, counterOffer = null) => {
    setRespondingNotifId(taskId);
    try {
      await API.patch(`/tasks/${taskId}/respond`, { response, counter_offer: counterOffer });
      await fetchAll();
    } finally {
      setRespondingNotifId(null);
      setCounteringNotifId(null);
      setCounterNotifText('');
    }
  };

  const handleCreatorCounterSubmit = (taskId) => {
    if (!counterNotifText.trim()) return;
    handleCreatorRespond(taskId, 'countered', counterNotifText.trim());
  };

  // ── Acknowledge actions ───────────────────────────────────────────────────

  const handleAcknowledgeTask = async (taskId) => {
    setRespondingNotifId(taskId);
    try {
      await API.patch(`/tasks/${taskId}/acknowledge`);
      await fetchAll();
    } finally {
      setRespondingNotifId(null);
    }
  };

  const handleAcknowledgeAssignee = async (taskId) => {
    setRespondingNotifId(taskId);
    try {
      await API.patch(`/tasks/${taskId}/assignee-acknowledge`);
      await fetchAll();
    } finally {
      setRespondingNotifId(null);
    }
  };

  // ── Derived lists (same logic as web SidebarPending) ─────────────────────

  // Build a map of eventId → invitation so we can group tasks under events
  const invitationByEventId = {};
  invitations.forEach(inv => { invitationByEventId[inv.id] = inv; });

  // Filter accepted tasks out of pending (they appear as assigneeNotifications)
  const acceptedTaskIds = new Set((assigneeNotifications || []).map(n => n.id));
  const activePendingTasks = pendingTasks.filter(t => !acceptedTaskIds.has(t.id));

  // Group pending tasks by event_id
  const tasksByEventId = {};
  activePendingTasks.forEach(task => {
    if (!tasksByEventId[task.event_id]) tasksByEventId[task.event_id] = [];
    tasksByEventId[task.event_id].push(task);
  });

  // Orphan tasks — no matching invitation
  const orphanTasks = activePendingTasks.filter(t => !invitationByEventId[t.event_id]);

  const hasAnything =
    invitations.length > 0 ||
    orphanTasks.length > 0 ||
    taskNotifications.length > 0 ||
    assigneeNotifications.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a8fa8" />
          }
        >
          {!hasAnything ? (
            // Empty state — matches web's "nothing pending" feel
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyText}>Nothing pending</Text>
            </View>
          ) : (
            <>
              {/* ── 1. Event invitations + cascading tasks ── */}
              {invitations.map(inv => {
                const cascadedTasks = tasksByEventId[inv.id] || [];
                const isResponding = respondingEventId === inv.id;

                return (
                  <View key={`inv-${inv.id}`} style={styles.group}>

                    {/* Event card */}
                    <View style={styles.item}>
                      <ColorStripe color={inv.color} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{inv.title}</Text>
                        <Text style={styles.itemMeta}>{formatDate(inv.start_date)}</Text>
                        <Text style={styles.itemFrom}>
                          from {inv.created_by_name} {inv.created_by_last_name}
                        </Text>
                      </View>
                      <ActionButtons
                        onAccept={() => handleEventRespond(inv.id, 'accepted')}
                        onDecline={() => handleEventRespond(inv.id, 'denied')}
                        loading={isResponding}
                      />
                    </View>

                    {/* Tasks cascade under the event */}
                    {cascadedTasks.map(task => {
                      const isTaskResponding = respondingTaskId === task.id;
                      const isCountering = counteringTaskId === task.id;

                      return (
                        <View key={`ctask-${task.id}`} style={styles.cascadeTask}>
                          <View style={styles.item}>
                            <ColorStripe color={task.color} />
                            <View style={styles.itemInfo}>
                              <Text style={styles.taskLabel}>TASK</Text>
                              <Text style={styles.itemTitle}>{task.title}</Text>

                              {task.status === 'countered' && task.counter_offer && (
                                <Text style={styles.counterOffer}>↩ "{task.counter_offer}"</Text>
                              )}

                              {task.sub_tasks?.length > 0 && (
                                <View style={styles.subTasks}>
                                  {task.sub_tasks.map((sub, i) => (
                                    <Text key={sub.id} style={styles.subTaskText}>
                                      {i === task.sub_tasks.length - 1 ? '└' : '├'} {sub.title}
                                    </Text>
                                  ))}
                                </View>
                              )}

                              {task.created_by_first_name && (
                                <Text style={styles.itemFrom}>
                                  from {task.created_by_first_name} {task.created_by_last_name}
                                </Text>
                              )}

                              {isCountering && (
                                <CounterInput
                                  value={counterText}
                                  onChange={setCounterText}
                                  onSend={() => handleCounterSubmit(task.id)}
                                  onCancel={() => { setCounteringTaskId(null); setCounterText(''); }}
                                  loading={isTaskResponding}
                                />
                              )}
                            </View>

                            {!isCountering && (
                              <ActionButtons
                                onAccept={() => handleTaskRespond(task.id, 'accepted')}
                                onDecline={() => handleTaskRespond(task.id, 'declined')}
                                onCounter={() => { setCounteringTaskId(task.id); setCounterText(''); }}
                                loading={isTaskResponding}
                              />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {/* ── 2. Orphan tasks — no matching event invitation ── */}
              {orphanTasks.map(task => {
                const isTaskResponding = respondingTaskId === task.id;
                const isCountering = counteringTaskId === task.id;

                return (
                  <View key={`otask-${task.id}`} style={styles.group}>
                    <View style={styles.item}>
                      <ColorStripe color={task.color} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.taskLabel}>TASK</Text>
                        <Text style={styles.itemTitle}>{task.title}</Text>

                        {task.status === 'countered' && task.counter_offer && (
                          <Text style={styles.counterOffer}>↩ "{task.counter_offer}"</Text>
                        )}

                        {task.sub_tasks?.length > 0 && (
                          <View style={styles.subTasks}>
                            {task.sub_tasks.map((sub, i) => (
                              <Text key={sub.id} style={styles.subTaskText}>
                                {i === task.sub_tasks.length - 1 ? '└' : '├'} {sub.title}
                              </Text>
                            ))}
                          </View>
                        )}

                        {task.created_by_first_name && (
                          <Text style={styles.itemFrom}>
                            from {task.created_by_first_name} {task.created_by_last_name}
                          </Text>
                        )}

                        {isCountering && (
                          <CounterInput
                            value={counterText}
                            onChange={setCounterText}
                            onSend={() => handleCounterSubmit(task.id)}
                            onCancel={() => { setCounteringTaskId(null); setCounterText(''); }}
                            loading={isTaskResponding}
                          />
                        )}
                      </View>

                      {!isCountering && (
                        <ActionButtons
                          onAccept={() => handleTaskRespond(task.id, 'accepted')}
                          onDecline={() => handleTaskRespond(task.id, 'declined')}
                          onCounter={() => { setCounteringTaskId(task.id); setCounterText(''); }}
                          loading={isTaskResponding}
                        />
                      )}
                    </View>
                  </View>
                );
              })}

              {/* ── 3. Task response notifications (creator view) ── */}
              {/* Shown when someone declined or countered your task */}
              {taskNotifications.map(notif => {
                const isResponding = respondingNotifId === notif.id;
                const isCountering = counteringNotifId === notif.id;

                return (
                  <View key={`notif-${notif.id}`} style={styles.group}>
                    <View style={styles.item}>
                      {/* Orange stripe — matches web's #ff9f0a colour for notifications */}
                      <ColorStripe color="#ff9f0a" />
                      <View style={styles.itemInfo}>
                        <Text style={styles.taskLabel}>TASK RESPONSE</Text>
                        <Text style={styles.itemTitle}>
                          {notif.assigned_first_name}{' '}
                          {notif.status === 'declined' ? 'declined' : 'countered'}{' '}
                          "{notif.title}"
                        </Text>
                        {notif.counter_offer && (
                          <Text style={styles.counterOffer}>"{notif.counter_offer}"</Text>
                        )}
                        <Text style={styles.itemMeta}>{notif.event_title}</Text>

                        {isCountering && (
                          <CounterInput
                            value={counterNotifText}
                            onChange={setCounterNotifText}
                            onSend={() => handleCreatorCounterSubmit(notif.id)}
                            onCancel={() => { setCounteringNotifId(null); setCounterNotifText(''); }}
                            loading={isResponding}
                          />
                        )}
                      </View>

                      {/* Creator can accept counter or counter back */}
                      {!isCountering && notif.status === 'countered' && (
                        <ActionButtons
                          onAccept={() => handleCreatorRespond(notif.id, 'accepted')}
                          onCounter={() => { setCounteringNotifId(notif.id); setCounterNotifText(''); }}
                          loading={isResponding}
                        />
                      )}

                      {/* Creator can only dismiss a declined task */}
                      {!isCountering && notif.status === 'declined' && (
                        <ActionButtons
                          onAccept={() => handleAcknowledgeTask(notif.id)}
                          loading={isResponding}
                        />
                      )}
                    </View>
                  </View>
                );
              })}

              {/* ── 4. Assignee notifications — your counter was accepted ── */}
              {assigneeNotifications.map(notif => {
                const isResponding = respondingNotifId === notif.id;

                return (
                  <View key={`anotif-${notif.id}`} style={styles.group}>
                    <View style={styles.item}>
                      {/* Green stripe — accepted */}
                      <ColorStripe color="#34c759" />
                      <View style={styles.itemInfo}>
                        <Text style={[styles.taskLabel, styles.acceptedLabel]}>ACCEPTED</Text>
                        <Text style={styles.itemTitle}>{notif.title}</Text>
                        <Text style={styles.itemMeta}>{notif.event_title}</Text>
                        {notif.created_by_first_name && (
                          <Text style={styles.itemFrom}>
                            {notif.created_by_first_name} {notif.created_by_last_name} accepted your counter
                          </Text>
                        )}
                      </View>
                      <ActionButtons
                        onAccept={() => handleAcknowledgeAssignee(notif.id)}
                        loading={isResponding}
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
