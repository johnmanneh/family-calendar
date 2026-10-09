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

const SSEContext = createContext({ eventTick: 0, taskTick: 0, lastChatMsg: null });

export const SSEProvider = ({ children }) => {
  const { token, logout } = useAuth();
  const esRef      = useRef(null);   // holds the active EventSource
  const tokenRef   = useRef(token);  // always-current token for AppState handler
  const appState   = useRef(AppState.currentState);

  const [eventTick,   setEventTick]   = useState(0);
  const [taskTick,    setTaskTick]    = useState(0);
  const [lastChatMsg, setLastChatMsg] = useState(null);

  // Keep tokenRef in sync so the AppState callback always uses the latest token.
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Keep logoutRef in sync so the AppState callback can call it without stale closure
  const logoutRef = useRef(logout);
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // ── Open a new SSE connection ─────────────────────────────────────────────
  const connect = (currentToken) => {
    if (!currentToken) return;

    // Close any existing connection first
    if (esRef.current) {
      esRef.current.removeAllEventListeners();
      esRef.current.close();
      esRef.current = null;
    }

    // Token goes in the query string — EventSource cannot set custom headers
    const url = `${BASE_URL}/stream?token=${currentToken}`;
    const es  = new EventSource(url);

    es.addEventListener('event_update', () => {
      setEventTick(t => t + 1);
    });

    es.addEventListener('task_update', () => {
      setTaskTick(t => t + 1);
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

  // ── Close the connection cleanly ──────────────────────────────────────────
  const disconnect = () => {
    if (esRef.current) {
      esRef.current.removeAllEventListeners();
      esRef.current.close();
      esRef.current = null;
    }
  };

  // ── Connect / disconnect when token changes (login / logout) ─────────────
  useEffect(() => {
    if (token) {
      connect(token);
    } else {
      disconnect();
    }
    return disconnect; // cleanup on unmount
  }, [token]);

  // ── Reconnect when the app comes back to the foreground ───────────────────
  // On iOS/Android, the OS can close the TCP connection while the app is
  // backgrounded. We reconnect so updates are instant the moment the user
  // returns to the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const wasBackground = appState.current.match(/inactive|background/);
      const isActive      = nextState === 'active';
      const isBackground  = nextState.match(/inactive|background/);

      if (wasBackground && isActive) {
        // App came to foreground — reconnect
        connect(tokenRef.current);
      } else if (isBackground) {
        // App went to background — disconnect to save battery / connections
        disconnect();
      }

      appState.current = nextState;
    });

    return () => sub.remove();
  }, []); // runs once — uses tokenRef so it always reads the latest token

  return (
    <SSEContext.Provider value={{ eventTick, taskTick, lastChatMsg }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => useContext(SSEContext);
