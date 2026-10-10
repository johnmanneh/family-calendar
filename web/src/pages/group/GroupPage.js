import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroups } from "../../context/GroupContext";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import Avatar from "../../components/common/Avatar/Avatar";
import Icon from "../../components/common/Icon/Icon";
import { formatDate, formatTime } from "../../utils/dateUtils";
import "./GroupPage.css";

// Same layout as the app's group screen: share code · members · events
const GroupPage = () => {
  const { groupId } = useParams();
  const { groups, fetchGroupEvents } = useGroups();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const group = groups.find(g => Number(g.id) === parseInt(groupId));
  const isAdmin = group?.role === "admin";

  const loadMembers = async () => {
    const res = await API.get(`/groups/${groupId}/members`);
    setMembers(res.data.members || []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evs] = await Promise.all([fetchGroupEvents(groupId), loadMembers()]);
        setEvents(evs || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load this group");
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
    } catch {
      // older browsers: select-and-copy fallback
      const t = document.createElement("textarea");
      t.value = group.invite_code;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const removeMember = async (memberId) => {
    try {
      await API.delete(`/groups/${groupId}/members/${memberId}`);
      setConfirmRemove(null);
      await loadMembers();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove member");
    }
  };

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

  const upcoming = events
    .filter(e => new Date(e.end_date || e.start_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <div className="group-page">
      <div className="group-header">
        <button className="group-back" onClick={() => navigate("/dashboard")}>← Back</button>
        <div className="group-hero">
          <div className="group-hero-icon">{group.name[0].toUpperCase()}</div>
          <div className="group-hero-info">
            <h1>{group.name}</h1>
            <p>
              {members.length || group.member_count} member{Number(members.length || group.member_count) !== 1 ? "s" : ""}
              {isAdmin && <span className="group-admin-badge">admin</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="group-content">
        {error && <p className="group-error">{error}</p>}

        {/* ── Share code ── */}
        <div className="group-card group-code-card group-roll" style={{ "--i": 0 }}>
          <p className="group-section-label">Share this code to add people</p>
          <div className="group-code-row">
            <span className="group-code">{group.invite_code}</span>
            <button className="group-copy" onClick={copyCode}>
              <Icon name={copied ? "checkCircle" : "clipboard"} size={15} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* ── Members ── */}
        <p className="group-section-title">Members ({members.length})</p>
        <div className="group-card group-list">
          {loading && members.length === 0 ? (
            <p className="group-loading">Loading...</p>
          ) : (
            members.map((m, i) => {
              const isMe = Number(m.id) === Number(user?.id);
              return (
                <div key={m.id} className="group-member group-roll" style={{ "--i": i + 1 }}>
                  <Avatar member={{ ...m, color: m.color || "#1a8fa8" }} size={44} />
                  <div className="group-member-info">
                    <p className="group-member-name">
                      {m.first_name} {m.last_name}
                      {isMe && <span className="group-you">You</span>}
                    </p>
                    <p className="group-member-email">{m.email}</p>
                  </div>
                  {m.role === "admin" && <span className="group-role">Admin</span>}
                  {isAdmin && !isMe && m.role !== "admin" && (
                    confirmRemove === m.id ? (
                      <span className="group-confirm">
                        <button className="group-confirm-yes" onClick={() => removeMember(m.id)}>Remove</button>
                        <button className="group-confirm-no" onClick={() => setConfirmRemove(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="group-remove" title="Remove from group" onClick={() => setConfirmRemove(m.id)}>
                        <Icon name="trash" size={15} />
                      </button>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Events ── */}
        <p className="group-section-title">Events</p>
        {loading ? (
          <p className="group-loading">Loading...</p>
        ) : upcoming.length === 0 ? (
          <div className="group-card group-empty">
            <p>No upcoming events in this group.</p>
            <p className="group-empty-hint">Tick this group under "Share with Groups" when creating an event — everyone gets an invitation.</p>
          </div>
        ) : (
          <div className="group-card group-list">
            {upcoming.map((event, i) => (
              <div key={event.id} className="group-event group-roll" style={{ "--i": i + members.length + 1 }}>
                <div className="group-event-color" style={{ background: event.color || "#1a8fa8" }} />
                <div className="group-event-info">
                  <p className="group-event-title">{event.title}</p>
                  <p className="group-event-date">
                    {formatDate(new Date(event.start_date))}
                    {!event.is_all_day && ` · ${formatTime(new Date(event.start_date))}`}
                  </p>
                  {event.location && (
                    <p className="group-event-location"><Icon name="mapPin" size={12} /> {event.location}</p>
                  )}
                </div>
                {event.priority && (
                  <span className={`group-event-priority ${event.priority}`}>{event.priority}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPage;
