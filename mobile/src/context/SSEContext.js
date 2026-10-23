import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import { useAuth } from './AuthContext';
import { BASE_URL } from '../api/axios';

// ─── Context ─────────────────────────────────────────────────────────────────
// Exposes tick counters. Any screen can watch these with useEffect to know
// when to re-fetch — no custom event bus, no polling needed.
//
//   eventTick   — increments on every event_update from the server
//   taskTick    — increments on every task_update from the server
//   lastChatMsg — the most recent chat_message payload (null until first message)

const SSEContext = createContext({ eventTick: 0, taskTick: 0, notifTick: 0, lastChatMsg: null });

export const SSEProvider = ({ children }) => {
  const { token, logout } = useAuth();
  const esRef      = useRef(null);   // holds the active EventSource
  const tokenRef   = useRef(token);  // always-current token for AppState handler
  const appState   = useRef(AppState.currentState);

  const [eventTick,   setEventTick]   = useState(0);
  const [taskTick,    setTaskTick]    = useState(0);
  const [notifTick,   setNotifTick]   = useState(0);
  const [lastChatMsg, setLastChatMsg] = useState(null);

  // Keep tokenRef in sync so the AppState callback always uses the latest token.
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Keep logoutRef in sync so the AppState callback can call it without stale closure
  const logoutRef = useRef(logout);
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // ── Close the connection cleanly ──────────────────────────────────────────
  const disconnect = () => {
    if (esRef.current) {
      esRef.current.removeAllEventListeners();
      esRef.current.close();
      esRef.current = null;
    }
  };

  // ── Fetch a one-time SSE ticket from the server ───────────────────────────
  // The JWT is sent only in the Authorization header here — never in a URL.
  // Returns the ticket string, or null if the request fails.
  const fetchTicket = async (currentToken) => {
    try {
      const res = await fetch(`${BASE_URL}/stream/ticket`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.status === 401) {
        // Token is no longer valid — log the user out
        logoutRef.current?.();
        return null;
      }
      if (!res.ok) return null;
      const body = await res.json();
      return body.ticket || null;
    } catch {
      return null;
    }
  };

  // ── Open a new SSE connection ─────────────────────────────────────────────
  const connect = async (currentToken) => {
    if (!currentToken) return;

    // Close any existing connection first
    disconnect();

    const ticket = await fetchTicket(currentToken);
    if (!ticket) return;

    // pollingInterval: 0 disables react-native-sse's built-in auto-reconnect —
    // we manage reconnects manually (foreground restore, error handler).
    const es = new EventSource(`${BASE_URL}/stream?ticket=${ticket}`, {
      pollingInterval: 0,
    });

    es.addEventListener('event_update', () => {
      setEventTick(t => t + 1);
    });

    es.addEventListener('task_update', () => {
      setTaskTick(t => t + 1);
    });

    // Personal: a new notification landed for this user (invite, group share…)
    es.addEventListener('notification', () => {
      setNotifTick(t => t + 1);
    });

    es.addEventListener('chat_message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        setLastChatMsg(msg);
      } catch { /* silent */ }
    });

    es.addEventListener('error', (e) => {
      console.log('[SSE] error:', JSON.stringify(e));
      // 401 = token invalid or account deleted → log out.
      // 403 = signed in but not in a family yet → just stop live updates
      //       (logging out here locked family-less users out of the app).
      if (e?.xhrStatus === 401 && tokenRef.current) {
        disconnect();
        logoutRef.current?.();
      } else if (e?.xhrStatus === 403) {
        disconnect();
      }
    });

    esRef.current = es;
  };

  // ── Connect / disconnect when token changes (login / logout) ─────────────
  useEffect(() => {
    if (token) {
      connect(token);
    } else {
      disconnect();
    }
    return disconnect; // cleanup on unmount
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reconnect when the app comes back to the foreground ───────────────────
  // On iOS/Android, the OS can close the TCP connection while the app is
  // backgrounded. We reconnect so updates are instant the moment the user
  // returns to the app.  Each reconnect fetches a fresh ticket — the old one
  // was single-use and is already consumed.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const wasBackground = appState.current.match(/inactive|background/);
      const isActive      = nextState === 'active';
      const isBackground  = nextState.match(/inactive|background/);

      if (wasBackground && isActive) {
        // App came to foreground — reconnect with a new ticket
        connect(tokenRef.current);
      } else if (isBackground) {
        // App went to background — disconnect to save battery / connections
        disconnect();
      }

      appState.current = nextState;
    });

    return () => sub.remove();
  }, []); // runs once — uses tokenRef/logoutRef so it always reads the latest values

  return (
    <SSEContext.Provider value={{ eventTick, taskTick, notifTick, lastChatMsg }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => useContext(SSEContext);
