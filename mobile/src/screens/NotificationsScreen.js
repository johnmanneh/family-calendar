import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSSE } from '../context/SSEContext';
import TreadmillList from '../components/TreadmillList';
import API from '../api/axios';
import { setAppBadge } from '../utils/appBadge';
import { useStyles } from '../styles/NotificationsScreen.styles';

import TopCard from '../components/ui/TopCard';
// ─── Type config ─────────────────────────────────────────────────────────────
// Mirrors TYPE_CONFIG in the web SidebarNotifications component.

const TYPE_CONFIG = {
  task_assigned:    { icon: 'clipboard-outline',        color: '#f48c06' },
  task_accepted:    { icon: 'checkmark-circle-outline', color: '#34c759' },
  task_declined:    { icon: 'close-circle-outline',     color: '#ff3b30' },
  task_countered:   { icon: 'return-up-back-outline',   color: '#007aff' },
  counter_accepted: { icon: 'thumbs-up-outline',        color: '#34c759' },
  event_invited:    { icon: 'calendar-outline',         color: '#1a8fa8' },
  event_shared:     { icon: 'people-outline',           color: '#7b61ff' },
  event_added_for_you: { icon: 'calendar-number-outline', color: '#f48c06' },
  calendar_access:  { icon: 'key-outline',              color: '#34c759' },
  task_completed:   { icon: 'checkmark-done-outline',   color: '#34c759' },
  task_reminder:    { icon: 'alarm-outline',            color: '#f48c06' },
  family_removed:   { icon: 'person-remove-outline',    color: '#ff3b30' },
};

// ─── Time ago helper ─────────────────────────────────────────────────────────

function timeAgoKey(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return { key: 'notifications.just_now', count: null };
  if (mins  < 60) return { key: 'notifications.min_ago',   count: mins };
  if (hours < 24) return { key: 'notifications.hours_ago', count: hours };
  if (days  < 7)  return { key: 'notifications.days_ago',  count: days };
  return { key: null, date: new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) };
}

// ─── Notification row ────────────────────────────────────────────────────────

function parseData(item) {
  let data = item.data || {};
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
  return data;
}

function NotifRow({ item, onMarkRead, onOpen, action, onRespond }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const cfg = TYPE_CONFIG[item.type] || { icon: 'notifications-outline', color: '#8e8e93' };
  const ago = timeAgoKey(item.created_at);
  const timeStr = ago.key ? t(ago.key, ago.count != null ? { count: ago.count } : undefined) : ago.date;

  return (
    <TouchableOpacity
      style={[styles.row, item.is_read ? styles.rowRead : styles.rowUnread]}
      onPress={() => {
        if (!item.is_read) onMarkRead(item.id);
        onOpen(item);
      }}
      activeOpacity={0.75}
    >
      {/* Same outline icon set as the rest of the app, in a soft tinted circle */}
      <View style={[styles.rowIconCircle, { backgroundColor: cfg.color + '1f' }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>

      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, item.is_read && styles.rowTitleRead]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={styles.rowText} numberOfLines={2}>{item.body}</Text>
        ) : null}
        <Text style={styles.rowTime}>{timeStr}</Text>

        {/* Still open → answer right here (task assignment or event invitation) */}
        {action ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => onRespond(item, action, false)}
              disabled={action.busy}
              style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#ff3b301f', opacity: action.busy ? 0.5 : 1 }}
            >
              <Text style={{ color: '#ff3b30', fontWeight: '600', fontSize: 14 }}>{t('notifications.decline', { defaultValue: 'Decline' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onRespond(item, action, true)}
              disabled={action.busy}
              style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#1a8fa8', opacity: action.busy ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{t('notifications.accept', { defaultValue: 'Accept' })}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {!item.is_read && <View style={[styles.rowDot, { backgroundColor: cfg.color }]} />}
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen({ navigation }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  // What is still waiting for an answer, so only those rows get Accept / Decline
  const [openTasks,  setOpenTasks]  = useState(new Set());
  const [openEvents, setOpenEvents] = useState(new Set());
  const [busyId,     setBusyId]     = useState(null);

  const load = useCallback(async () => {
    try {
      const [res, pend, inv] = await Promise.all([
        API.get('/notifications'),
        API.get('/tasks/pending').catch(() => null),
        API.get('/events/invitations').catch(() => null),
      ]);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count   || 0);
      setAppBadge(res.data.unread_count || 0);
      setOpenTasks(new Set((pend?.data?.tasks || [])
        .filter(x => x.status === 'pending').map(x => Number(x.id))));
      setOpenEvents(new Set((inv?.data?.invitations || inv?.data?.events || []).map(x => Number(x.id ?? x.event_id))));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const { notifTick } = useSSE();
  useEffect(() => { if (notifTick > 0) load(); }, [notifTick]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleMarkRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => { const n = Math.max(0, prev - 1); setAppBadge(n); return n; });
    } catch { /* silent */ }
  };

  // Tap → go to what the notification is about.
  // Event invitation → the event (accept/decline right there). Tasks → Pending.
  const handleOpen = (item) => {
    let data = item.data || {};
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
    if (data.eventId) navigation.navigate('EventDetails', { eventId: data.eventId });
    else if (data.taskId || String(item.type).startsWith('task') || item.type === 'counter_accepted') navigation.navigate('Pending');
  };

  const actionFor = (item) => {
    const data = parseData(item);
    if (item.type === 'task_assigned' && data.taskId && openTasks.has(Number(data.taskId))) {
      return { kind: 'task', id: Number(data.taskId), busy: busyId === item.id };
    }
    if (item.type === 'event_invited' && data.eventId && openEvents.has(Number(data.eventId))) {
      return { kind: 'event', id: Number(data.eventId), busy: busyId === item.id };
    }
    return null;
  };

  const handleRespond = async (item, action, accept) => {
    setBusyId(item.id);
    try {
      if (action.kind === 'task') {
        await API.patch(`/tasks/${action.id}/respond`, { response: accept ? 'accepted' : 'declined' });
      } else {
        await API.put(`/events/invitations/${action.id}`, { response: accept ? 'accepted' : 'denied' });
      }
      if (!item.is_read) handleMarkRead(item.id);
      await load();
    } catch (err) {
      await load();   // already answered elsewhere → buttons disappear
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setAppBadge(0);
    } catch { /* silent */ }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
      <TopCard>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>

          {unreadCount > 0 ? (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
              <Text style={styles.markAllText}>{t('notifications.mark_all_read')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </TopCard>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a8fa8" />
        </View>
      ) : (
        <TreadmillList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <NotifRow item={item} onMarkRead={handleMarkRead} onOpen={handleOpen}
              action={actionFor(item)} onRespond={handleRespond} />
          )}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1a8fa8"
            />
          }
        />
      )}

    </SafeAreaView>
  );
}
