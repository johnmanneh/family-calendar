import React, { useState, useEffect, useCallback } from 'react';
import { useEvents } from '../../../context/EventContext';
import './Sidebar.css';

// ─── Type config ──────────────────────────────────────────────────────────────
// Each notification type gets an emoji icon and a label colour.

const TYPE_CONFIG = {
  task_assigned:   { icon: '📋', color: '#f48c06' },
  task_accepted:   { icon: '✅', color: '#34c759' },
  task_declined:   { icon: '❌', color: '#ff3b30' },
  task_countered:  { icon: '↩️', color: '#007aff' },
  counter_accepted:{ icon: '🤝', color: '#34c759' },
  event_invited:   { icon: '📅', color: '#1a8fa8' },
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

const SidebarNotifications = () => {
  const { fetchNotifications, markAllNotificationsRead, markNotificationRead } = useEvents();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(false);
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

  // Load on mount and whenever the panel opens
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) load(); }, [open]);

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

  return (
    <div className="sidebar-notifications">

      {/* ── Header row ── */}
      <button
        className="sidebar-notifications-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <span className="sidebar-notifications-label">
          🔔 Notifications
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
              const cfg = TYPE_CONFIG[n.type] || { icon: '🔔', color: '#8e8e93' };
              return (
                <div
                  key={n.id}
                  className={`sidebar-notif-item${n.is_read ? ' read' : ' unread'}`}
                  onClick={() => !n.is_read && handleMarkOneRead(n.id)}
                >
                  <span className="sidebar-notif-icon" style={{ color: cfg.color }}>
                    {cfg.icon}
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
