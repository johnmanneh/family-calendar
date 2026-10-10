import React, { useState, useEffect, useCallback } from 'react';
import { useEvents } from '../../../context/EventContext';
import Icon from '../../common/Icon/Icon';
import './Sidebar.css';

// ─── Type config ──────────────────────────────────────────────────────────────
// Each notification type gets an emoji icon and a label colour.

const TYPE_CONFIG = {
  task_assigned:    { icon: 'clipboard',   color: '#f48c06' },
  task_accepted:    { icon: 'checkCircle', color: '#34c759' },
  task_declined:    { icon: 'xCircle',     color: '#ff3b30' },
  task_countered:   { icon: 'reply',       color: '#007aff' },
  counter_accepted: { icon: 'thumbsUp',    color: '#34c759' },
  event_invited:    { icon: 'calendar',    color: '#1a8fa8' },
  event_shared:     { icon: 'users',       color: '#7b61ff' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── SidebarNotifications ─────────────────────────────────────────────────────

// startOpen: used by the phone layout, where the bell opens this as a full sheet
const SidebarNotifications = ({ startOpen = false, onUnreadChange }) => {
  const { fetchNotifications, markAllNotificationsRead, markNotificationRead, openEventById, notifTick } = useEvents();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(startOpen);
  const [loading,       setLoading]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => { onUnreadChange?.(unreadCount); }, [unreadCount]);

  // Load on mount and whenever the panel opens
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) load(); }, [open]);
  // Live: the server pinged us about a new notification
  useEffect(() => { if (notifTick > 0) load(); }, [notifTick]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleMarkOneRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Click → mark read and open what it's about (event invitation → the event,
  // where it can be accepted or declined)
  const handleOpen = async (n) => {
    if (!n.is_read) handleMarkOneRead(n.id);
    let data = n.data || {};
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
    if (data.eventId) {
      try { await openEventById(data.eventId); } catch { /* event gone */ }
    }
  };

  return (
    <div className="sidebar-notifications">

      {/* ── Header row ── */}
      <button
        className="sidebar-notifications-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <span className="sidebar-notifications-label">
          <Icon name="bell" size={14} /> Notifications
          {unreadCount > 0 && (
            <span className="sidebar-notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </span>
        <span className="sidebar-notifications-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {/* ── Feed ── */}
      {open && (
        <div className="sidebar-notifications-feed">
          {unreadCount > 0 && (
            <button className="sidebar-notifications-markall" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}

          {loading && notifications.length === 0 ? (
            <p className="sidebar-notifications-empty">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="sidebar-notifications-empty">No notifications yet</p>
          ) : (
            notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || { icon: 'bell', color: '#8e8e93' };
              return (
                <div
                  key={n.id}
                  className={`sidebar-notif-item${n.is_read ? ' read' : ' unread'}`}
                  onClick={() => handleOpen(n)}
                >
                  <span className="sidebar-notif-icon" style={{ background: cfg.color + '1f' }}>
                    <Icon name={cfg.icon} size={15} color={cfg.color} />
                  </span>
                  <div className="sidebar-notif-body">
                    <p className="sidebar-notif-title">{n.title}</p>
                    {n.body && <p className="sidebar-notif-text">{n.body}</p>}
                    <p className="sidebar-notif-time">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="sidebar-notif-dot" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarNotifications;
