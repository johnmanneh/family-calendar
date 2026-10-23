import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './PublicEventPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function PublicJoinPage() {
  const { token } = useParams();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch(`${API_BASE}/public/join/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 200 && data.family?.name) {
          setName(data.family.name);
          setStatus('ok');
        } else {
          setStatus('not_found');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="pe-page">
      <div className="pe-brand">it's for us</div>

      {status === 'loading' && <div className="pe-state">Loading…</div>}

      {status === 'not_found' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Invite not found</p>
          <p className="pe-state-sub">This join link is invalid or has been replaced.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="pe-state pe-state--warn">
          <p className="pe-state-title">Something went wrong</p>
          <p className="pe-state-sub">Could not load this invite. Try again later.</p>
        </div>
      )}

      {status === 'ok' && (
        <div className="pe-card">
          <h1 className="pe-title">Join {name}?</h1>
          <p className="pe-organiser">You'll join this family after you log in or register.</p>
          <div className="pe-divider" />
          <p>
            <Link className="pe-footer-link" to={`/login?join=${encodeURIComponent(token)}`}>
              Continue
            </Link>
          </p>
        </div>
      )}

      <p className="pe-footer">
        Shared via <a href="https://its4us.app" className="pe-footer-link">it's for us</a>
      </p>
    </div>
  );
}
