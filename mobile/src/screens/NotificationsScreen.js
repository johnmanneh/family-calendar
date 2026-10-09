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
import API from '../api/axios';
import { useStyles } from '../styles/NotificationsScreen.styles';

// ─── Type config ─────────────────────────────────────────────────────────────
// Mirrors TYPE_CONFIG in the web SidebarNotifications component.

const TYPE_CONFIG = {
  task_assigned:    { icon: '📋', color: '#f48c06' },
  task_accepted:    { icon: '✅', color: '#34c759' },
  task_declined:    { icon: '❌', color: '#ff3b30' },
  task_countered:   { icon: '↩️', color: '#007aff' },
  counter_accepted: { icon: '🤝', color: '#34c759' },
  event_invited:    { icon: '📅', color: '#1a8fa8' },
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

function NotifRow({ item, onMarkRead, onOpen }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const cfg = TYPE_CONFIG[item.type] || { icon: '🔔', color: '#8e8e93' };
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
      <Text style={styles.rowIcon}>{cfg.icon}</Text>

      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, item.is_read && styles.rowTitleRead]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={styles.rowText} numberOfLines={2}>{item.body}</Text>
        ) : null}
        <Text style={styles.rowTime}>{timeStr}</Text>
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

  const load = useCallback(async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count   || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      setUnreadCount(prev => Math.max(0, prev - 1));
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

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
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

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a8fa8" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <NotifRow item={item} onMarkRead={handleMarkRead} onOpen={handleOpen} />
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
