import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate, formatTime } from '../../utils/dateUtils';
import './PublicEventPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function PublicEventPage() {
  const { token } = useParams();
  const [event, setEvent]   = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | not_found | expired | error

  useEffect(() => {
    fetch(`${API_BASE}/public/events/${token}`)
      .then(async res => {
        const data = await res.json();
        if (res.status === 200) {
          setEvent(data.event);
          setStatus('ok');
        } else if (res.status === 410) {
          setStatus('expired');
        } else {
          setStatus('not_found');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="pe-page">
      <div className="pe-brand">it's for us</div>

      {status === 'loading' && (
        <div className="pe-state">Loading…</div>
      )}

      {status === 'expired' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Link no longer active</p>
          <p className="pe-state-sub">This share link has expired or been revoked.</p>
        </div>
      )}

      {status === 'not_found' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Link not found</p>
          <p className="pe-state-sub">Check that the link was copied correctly.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Something went wrong</p>
          <p className="pe-state-sub">Could not load the event. Try again later.</p>
        </div>
      )}

      {status === 'ok' && event && (
        <div className="pe-card">
          <h1 className="pe-title">{event.title}</h1>

          {event.organiser && (
            <p className="pe-organiser">by {event.organiser}</p>
          )}

          <div className="pe-divider" />

          <div className="pe-row">
            <span className="pe-label">When</span>
            <span className="pe-value">
              {event.is_all_day
                ? formatDate(new Date(event.start_date))
                : `${formatDate(new Date(event.start_date))} · ${formatTime(new Date(event.start_date))} → ${formatTime(new Date(event.end_date))}`
              }
            </span>
          </div>

          {event.location && (
            <div className="pe-row">
              <span className="pe-label">Where</span>
              <span className="pe-value">{event.location}</span>
            </div>
          )}

          {event.category && (
            <div className="pe-row">
              <span className="pe-label">Category</span>
              <span className="pe-value">{event.category}</span>
            </div>
          )}

          {event.notes && (
            <div className="pe-row pe-row--notes">
              <span className="pe-label">Notes</span>
              <span className="pe-value">{event.notes}</span>
            </div>
          )}
        </div>
      )}

      <p className="pe-footer">
        Shared via <a href="https://its4us.app" className="pe-footer-link">it's for us</a>
      </p>
    </div>
  );
}
