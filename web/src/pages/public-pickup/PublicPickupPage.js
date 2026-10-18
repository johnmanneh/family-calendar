import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './PublicPickupPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Date-only strings ("YYYY-MM-DD") must be treated as local midnight
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? (() => { const [y, m, day] = dateStr.split('-').map(Number); return new Date(y, m - 1, day); })()
    : new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
}

// Human-readable label for each action button
const ACTION_LABELS = {
  accept:     "I'll be there",
  decline:    "I can't make it",
  picked_up:  "I've picked them up",
  cancel:     "I can't make it anymore",
};

// Primary (filled) actions vs outline
const PRIMARY_ACTIONS = new Set(['accept', 'picked_up']);

// Status display labels
const STATUS_LABELS = {
  asked:      'Waiting for response',
  going:      'Confirmed',
  picked_up:  'Picked up',
  declined:   'Declined',
  cancelled:  'Cancelled',
};

// Confirmation messages shown after an action
const DONE_MESSAGES = {
  going:      { icon: '✅', title: "You're confirmed!", sub: "The family has been notified." },
  declined:   { icon: '👋', title: "Got it",            sub: "The family has been notified so they can make other arrangements." },
  picked_up:  { icon: '🎉', title: "Great!",            sub: "The family has been notified that the child has been picked up." },
  cancelled:  { icon: '😔', title: "Understood",        sub: "The family has been notified so they can make other arrangements." },
};

// ── PublicPickupPage ──────────────────────────────────────────────────────────

export default function PublicPickupPage() {
  const { token } = useParams();

  const [pickup,  setPickup]  = useState(null);
  const [status,  setStatus]  = useState('loading'); // loading | ok | done | expired | not_found | error
  const [doneStatus, setDoneStatus] = useState(null); // the newStatus after an action
  const [busy,    setBusy]    = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/public/pickups/${token}`)
      .then(async res => {
        const data = await res.json();
        if (res.status === 200) {
          setPickup(data.data?.pickup || data.pickup);
          setStatus('ok');
        } else if (res.status === 410) {
          setStatus('expired');
        } else {
          setStatus('not_found');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  // ── Respond ───────────────────────────────────────────────────────────────
  const handleAction = async (action) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/public/pickups/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setDoneStatus(data.data?.status || data.status);
        setStatus('done');
      } else {
        alert(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Could not connect. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pe-page">
      <div className="pe-brand">it's for us</div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="pe-state">Loading…</div>
      )}

      {/* Expired / revoked */}
      {status === 'expired' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Link no longer active</p>
          <p className="pe-state-sub">This pickup link has expired or been cancelled.</p>
        </div>
      )}

      {/* Not found */}
      {status === 'not_found' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Link not found</p>
          <p className="pe-state-sub">Check that the link was copied correctly.</p>
        </div>
      )}

      {/* Network / server error */}
      {status === 'error' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Something went wrong</p>
          <p className="pe-state-sub">Could not load the pickup details. Try again later.</p>
        </div>
      )}

      {/* Action confirmed */}
      {status === 'done' && (() => {
        const msg = DONE_MESSAGES[doneStatus] || { icon: '✅', title: 'Done', sub: '' };
        return (
          <div className="pe-card">
            <div className="pp-done">
              <div className="pp-done-icon">{msg.icon}</div>
              <p className="pp-done-title">{msg.title}</p>
              <p className="pp-done-sub">{msg.sub}</p>
            </div>
          </div>
        );
      })()}

      {/* Main pickup card */}
      {status === 'ok' && pickup && (
        <div className="pe-card">

          {/* Who asked + for whom */}
          <p className="pp-intro">{pickup.asked_by} asked you to pick up</p>
          <h1 className="pp-child">{pickup.child_name}</h1>
          <p className="pp-askedby">You are: {pickup.person_name}</p>

          {/* Current status chip */}
          <div className={`pp-status pp-status--${pickup.status}`}>
            {STATUS_LABELS[pickup.status] || pickup.status}
          </div>

          <div className="pe-divider" />

          {/* Event date */}
          <div className="pe-row">
            <span className="pe-label">When</span>
            <span className="pe-value">
              {pickup.is_all_day
                ? formatDate(pickup.start_date)
                : `${formatDate(pickup.start_date)} · ${formatTime(pickup.start_date)}${pickup.end_date ? ` → ${formatTime(pickup.end_date)}` : ''}`
              }
            </span>
          </div>

          {/* Location */}
          {pickup.location && (
            <div className="pe-row">
              <span className="pe-label">Where</span>
              <span className="pe-value">{pickup.location}</span>
            </div>
          )}

          {/* Action buttons — only shown when there are actions available */}
          {pickup.available_actions?.length > 0 && (
            <div className="pp-actions">
              {pickup.available_actions.map(action => (
                <button
                  key={action}
                  className={`pp-btn ${PRIMARY_ACTIONS.has(action) ? 'pp-btn--primary' : 'pp-btn--outline'}`}
                  onClick={() => handleAction(action)}
                  disabled={busy}
                >
                  {ACTION_LABELS[action] || action}
                </button>
              ))}
            </div>
          )}

          {/* Terminal state — no buttons left */}
          {pickup.available_actions?.length === 0 && (
            <p style={{ marginTop: 16, fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>
              No further action needed.
            </p>
          )}
        </div>
      )}

      <p className="pe-footer">
        Shared via <a href="https://its4us.app" className="pe-footer-link">it's for us</a>
      </p>
    </div>
  );
}
