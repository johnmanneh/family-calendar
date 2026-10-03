import React, { useState } from "react";
import { useGroups } from "../../../context/GroupContext";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

const SidebarGroups = () => {
  const { groups, createGroup, joinGroup, invitations, respondToInvitation, deleteGroup } = useGroups();
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // 'create' | 'join' | null
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleRespond = async (invitationId, response) => {
    setRespondingId(invitationId);
    try {
      await respondToInvitation(invitationId, response);
    } catch {
      // silent
    } finally {
      setRespondingId(null);
    }
  };

  const handleDelete = async (groupId) => {
    setDeleteLoading(true);
    try {
      await deleteGroup(groupId);
      setConfirmDeleteId(null);
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "create") {
        await createGroup(input.trim());
      } else {
        await joinGroup(input.trim());
      }
      setInput("");
      setMode(null);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-section">
      <p className="sidebar-label">GROUPS</p>

      {invitations.length > 0 && (
        <div className="sidebar-group-invites">
          {invitations.map(inv => (
            <div key={inv.id} className="sidebar-group-invite">
              <div className="sidebar-group-invite-info">
                <span className="sidebar-group-invite-name">{inv.group_name}</span>
                <span className="sidebar-group-invite-from">from {inv.invited_by_name}</span>
              </div>
              <div className="sidebar-group-invite-actions">
                <button
                  className="sidebar-group-invite-accept"
                  disabled={respondingId === inv.id}
                  onClick={() => handleRespond(inv.id, 'accepted')}
                >✓</button>
                <button
                  className="sidebar-group-invite-deny"
                  disabled={respondingId === inv.id}
                  onClick={() => handleRespond(inv.id, 'denied')}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 && !mode && (
        <p className="sidebar-groups-empty">No groups yet</p>
      )}

      {groups.map(group => (
        <div key={group.id}>
          <div
            className="sidebar-group-row"
            onClick={() => { if (confirmDeleteId !== group.id) navigate(`/group/${group.id}`); }}
          >
            <div className="sidebar-group-icon">
              {group.name[0].toUpperCase()}
            </div>
            <div className="sidebar-group-info">
              <span className="sidebar-group-name">{group.name}</span>
              <span className="sidebar-group-meta">
                {group.member_count} member{group.member_count !== '1' ? 's' : ''} · {group.event_count} event{group.event_count !== '1' ? 's' : ''}
              </span>
            </div>
            {group.role === 'admin' && (
              <>
                <span className="sidebar-group-admin-badge">admin</span>
                <button
                  className="sidebar-group-delete-btn"
                  title="Delete group"
                  onClick={e => { e.stopPropagation(); setConfirmDeleteId(group.id); }}
                >🗑</button>
              </>
            )}
          </div>

          {confirmDeleteId === group.id && (
            <div className="sidebar-group-delete-confirm">
              <p className="sidebar-group-delete-text">Delete "{group.name}"?</p>
              <div className="sidebar-group-form-row">
                <button
                  className="sidebar-group-btn-danger"
                  disabled={deleteLoading}
                  onClick={() => handleDelete(group.id)}
                >
                  {deleteLoading ? '...' : 'Delete'}
                </button>
                <button
                  className="sidebar-group-btn-cancel"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {mode && (
        <form className="sidebar-group-form" onSubmit={handleSubmit}>
          <input
            autoFocus
            className="sidebar-group-input"
            placeholder={mode === "create" ? "Group name" : "Invite code"}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          {error && <p className="sidebar-group-error">{error}</p>}
          <div className="sidebar-group-form-row">
            <button type="submit" className="sidebar-group-btn-confirm" disabled={loading}>
              {loading ? "..." : mode === "create" ? "Create" : "Join"}
            </button>
            <button type="button" className="sidebar-group-btn-cancel" onClick={() => { setMode(null); setInput(""); setError(""); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!mode && (
        <div className="sidebar-group-actions">
          <button className="sidebar-group-action-btn" onClick={() => setMode("create")}>Create</button>
          <button className="sidebar-group-action-btn" onClick={() => setMode("join")}>Join</button>
        </div>
      )}
    </div>
  );
};

export default SidebarGroups;
