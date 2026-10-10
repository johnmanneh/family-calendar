import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEvents } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import { useUI } from '../../../context/UIContext';
import { parseDateMentions } from '../../../utils/parseDateMentions';
import './Sidebar.css';

import Icon from '../../common/Icon/Icon';
// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function initials(msg) {
  return [msg.first_name?.[0], msg.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
}

// ─── SidebarChat ──────────────────────────────────────────────────────────────

// startOpen: used by the phone layout, where the chat icon opens this as a full sheet
const SidebarChat = ({ startOpen = false }) => {
  const { fetchMessages, sendMessage, onChatMessage } = useEvents();
  const { user } = useAuth();
  const { openNewEvent } = useUI();

  const [open,        setOpen]       = useState(startOpen);
  const [messages,    setMessages]   = useState([]);
  const [draft,       setDraft]      = useState('');
  const [sending,     setSending]    = useState(false);
  const [chatUnread,  setChatUnread] = useState(0);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Load history when panel opens, clear unread badge
  const load = useCallback(async () => {
    const msgs = await fetchMessages();
    setMessages(msgs);
  }, [fetchMessages]);

  useEffect(() => {
    if (open) {
      load();
      setChatUnread(0);
    }
  }, [open, load]);

  // Register SSE callback — appends incoming messages live
  // Also increments unread badge when panel is closed and message is from someone else
  useEffect(() => {
    onChatMessage((msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!open && Number(msg.user_id) !== Number(user?.id)) {
        setChatUnread(prev => prev + 1);
      }
    });
  }, [onChatMessage, open, user]);

  // Scroll to bottom whenever messages change (and panel is open)
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const sent = await sendMessage(body);
      if (sent) {
        setMessages(prev =>
          prev.some(m => m.id === sent.id) ? prev : [...prev, sent]
        );
      }
    } catch { /* silent */ }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sidebar-chat">

      {/* ── Toggle ── */}
      <button
        className="sidebar-chat-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <span className="sidebar-chat-label">
          <Icon name="chat" size={14} /> Family Chat
          {chatUnread > 0 && (
            <span className="sidebar-notifications-badge">
              {chatUnread > 99 ? '99+' : chatUnread}
            </span>
          )}
        </span>
        <span className="sidebar-notifications-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="sidebar-chat-panel">

          {/* Message list */}
          <div className="sidebar-chat-feed">
            {messages.length === 0 ? (
              <p className="sidebar-chat-empty">No messages yet — say hi 👋</p>
            ) : (
              messages.map(msg => {
                const isMe = Number(msg.user_id) === Number(user?.id);
                return (
                  <div
                    key={msg.id}
                    className={`sidebar-chat-msg${isMe ? ' sidebar-chat-msg-me' : ''}`}
                  >
                    {!isMe && (
                      <div
                        className="sidebar-chat-avatar"
                        style={{ backgroundColor: msg.color || '#1a8fa8' }}
                      >
                        {initials(msg)}
                      </div>
                    )}
                    <div className="sidebar-chat-bubble-wrap">
                      {!isMe && (
                        <span className="sidebar-chat-sender">
                          {msg.first_name} {msg.last_name}
                        </span>
                      )}
                      <div
                        className={`sidebar-chat-bubble${isMe ? ' sidebar-chat-bubble-me' : ''}`}
                      >
                        {(() => {
                          const segments = parseDateMentions(msg.body);
                          const hasDate  = segments.some(s => s.type === 'date');
                          return (
                            <>
                              <span>
                                {segments.map((seg, i) =>
                                  seg.type === 'date' ? (
                                    <button
                                      key={i}
                                      className={`sidebar-chat-date-link${isMe ? ' sidebar-chat-date-link-me' : ''}`}
                                      onClick={() => openNewEvent(seg.date)}
                                      title="Add to calendar"
                                    >
                                      {seg.value}
                                    </button>
                                  ) : (
                                    <span key={i}>{seg.value}</span>
                                  )
                                )}
                              </span>
                              {hasDate && (
                                <div className={`sidebar-chat-date-hint${isMe ? ' sidebar-chat-date-hint-me' : ''}`}>
                                  <Icon name="calendar" size={12} /> Tap a date to add to calendar
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <span className="sidebar-chat-time">{timeLabel(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="sidebar-chat-input-row">
            <textarea
              ref={inputRef}
              className="sidebar-chat-input"
              placeholder="Message…"
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className="sidebar-chat-send"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
            >
              ↑
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default SidebarChat;
