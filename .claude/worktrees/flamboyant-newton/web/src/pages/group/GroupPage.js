import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroups } from "../../context/GroupContext";
import { formatDate, formatTime } from "../../utils/dateUtils";
import "./GroupPage.css";

const GroupPage = () => {
  const { groupId } = useParams();
  const { groups, fetchGroupEvents } = useGroups();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const group = groups.find(g => Number(g.id) === parseInt(groupId));

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchGroupEvents(groupId);
        setEvents(data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load group events");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  if (!group) {
    return (
      <div className="group-page">
        <div className="group-header">
          <button className="group-back" onClick={() => navigate("/dashboard")}>← Back</button>
          <div className="group-hero">
            <div className="group-hero-icon group-hero-icon--skeleton" />
            <div className="group-hero-info">
              <div className="group-skeleton group-skeleton--name" />
              <div className="group-skeleton group-skeleton--meta" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group-page">
      <div className="group-header">
        <button className="group-back" onClick={() => navigate("/dashboard")}>← Back</button>
        <div className="group-hero">
          <div className="group-hero-icon">{group.name[0].toUpperCase()}</div>
          <div className="group-hero-info">
            <h1>{group.name}</h1>
            <p>
              Invite code: <strong>{group.invite_code}</strong>
              &nbsp;·&nbsp;{group.member_count} member{group.member_count !== '1' ? 's' : ''}
              {group.role === 'admin' && <span className="group-admin-badge">admin</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="group-content">
        {loading ? (
          <p className="group-loading">Loading...</p>
        ) : error ? (
          <p className="group-error">{error}</p>
        ) : events.length === 0 ? (
          <div className="group-empty">
            <p>No events shared with this group yet.</p>
            <p className="group-empty-hint">Share an event by selecting this group in the event modal.</p>
          </div>
        ) : (
          <div className="group-events">
            {events.map(event => (
              <div key={event.id} className="group-event">
                <div className="group-event-color" style={{ background: event.color || "#1a8fa8" }} />
                <div className="group-event-info">
                  <p className="group-event-title">{event.title}</p>
                  <p className="group-event-date">
                    {formatDate(new Date(event.start_date))}
                    {!event.is_all_day && ` · ${formatTime(new Date(event.start_date))}`}
                  </p>
                  {event.location && (
                    <p className="group-event-location">📍 {event.location}</p>
                  )}
                  {event.description && (
                    <p className="group-event-desc">{event.description}</p>
                  )}
                </div>
                <span className={`group-event-priority ${event.priority}`}>{event.priority}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPage;
