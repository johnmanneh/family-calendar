import React, { useState } from "react";
import { useFamily } from "../../../context/FamilyContext";
import { useGroups } from "../../../context/GroupContext";
import { useAuth } from "../../../context/AuthContext";
import { runJoinFlow } from "../../../utils/joinFlow";
import API from "../../../api/axios";
import Avatar from "../../common/Avatar/Avatar";
import Icon from "../../common/Icon/Icon";
import "./Sidebar.css";

// Top of the sidebar.
//   On your own (personal space) → just you, with "Create a family" / "Join with code"
//   In one family                → family name (admin can rename), code, join/leave
//   In multiple families         → family chips at top, then active family details
const SidebarFamily = () => {
  const { family, families, members, fetchFamily, switchFamily, setAvailabilitySharing } = useFamily();
  const { joinWithCode } = useGroups();
  const { user } = useAuth();

  const [mode, setMode] = useState(null); // null | 'create' | 'join' | 'rename'
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sharingPending, setSharingPending] = useState({});
  const [sharingErrors, setSharingErrors] = useState({});

  const changeSharing = async (familyId, shared) => {
    if (sharingPending[familyId]) return;
    setSharingPending(prev => ({ ...prev, [familyId]: true }));
    setSharingErrors(prev => ({ ...prev, [familyId]: "" }));
    try {
      await setAvailabilitySharing(familyId, shared);
    } catch (err) {
      setSharingErrors(prev => ({ ...prev, [familyId]:
        err.response?.data?.message || "Could not update availability sharing. Please try again." }));
    } finally {
      setSharingPending(prev => ({ ...prev, [familyId]: false }));
    }
  };

  const me = members.find(m => Number(m.id) === Number(user?.id)) || user;
  const isAdmin = ["admin", "owner"].includes(me?.role);
  const personal = !!family?.is_personal;
  const multiFamily = families.filter(f => !f.is_personal).length > 1;
  const receivingFamilies = families.filter(f => !f.is_personal);

  const open = (m, initial = "") => { setMode(m); setValue(initial); setError(""); };
  const close = () => { setMode(null); setValue(""); setError(""); };

  const submit = async e => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "join") {
        const res = await runJoinFlow(v, joinWithCode, fetchFamily);
        if (res === null) return;
      } else if (mode === "create") {
        await API.post("/family/create", { name: v });
        await fetchFamily();
      } else if (mode === "rename") {
        await API.put("/family/name", { name: v });
        await fetchFamily();
      }
      close();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (targetFamily) => {
    const targetIsAdmin = targetFamily.role === "admin";
    if (targetIsAdmin) {
      alert("You're the admin. Transfer ownership before leaving.");
      return;
    }
    if (!window.confirm(`Leave ${targetFamily.name}?`)) return;
    setLeaving(true);
    try {
      await API.delete("/family/leave", { data: { family_id: targetFamily.id } });
      await fetchFamily();
    } catch (err) {
      alert(err.response?.data?.message || "Could not leave family");
    } finally {
      setLeaving(false);
    }
  };

  const form = (placeholder, submitLabel, upper = false) => (
    <form className="sidebar-group-form" onSubmit={submit}>
      <input
        autoFocus
        className="sidebar-group-input"
        placeholder={placeholder}
        value={value}
        maxLength={60}
        onChange={e => setValue(upper ? e.target.value.toUpperCase() : e.target.value)}
      />
      {error && <p className="sidebar-group-error">{error}</p>}
      <div className="sidebar-group-form-row">
        <button type="submit" className="sidebar-group-btn-confirm" disabled={loading}>
          {loading ? "..." : submitLabel}
        </button>
        <button type="button" className="sidebar-group-btn-cancel" onClick={close}>Cancel</button>
      </div>
    </form>
  );

  const availabilityControls = receivingFamilies.length > 0 && (
    <div className="sidebar-availability">
      <p className="sidebar-label">AVAILABILITY SHARING</p>
      <p className="sidebar-availability-copy">
        Opt in per family to share busy only for cross-family busy checks, including future commitments.
        In these checks, they never see event details, only whether you are busy.
        This applies to current and future members of that family. Ordinary event visibility is unchanged.
        Only you control this; a family admin cannot change it for another adult.
      </p>
      {receivingFamilies.map(f => (
        <React.Fragment key={f.id}>
          <label className="sidebar-availability-row">
            <input
              type="checkbox"
              checked={!!f.share_availability}
              disabled={!!sharingPending[f.id]}
              aria-describedby={sharingErrors[f.id] ? `sharing-error-${f.id}` : undefined}
              onChange={e => changeSharing(f.id, e.target.checked)}
            />
            <span>Share my busy times with {f.name}</span>
          </label>
          {sharingPending[f.id] && <span role="status">Saving…</span>}
          {sharingErrors[f.id] && (
            <p id={`sharing-error-${f.id}`} role="alert" className="sidebar-group-error">
              {sharingErrors[f.id]}
            </p>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  if (!family) return <div className="sidebar-family" />;

  // ── On your own ──
  if (personal) {
    return (
      <div className="sidebar-family">
        <div className="sidebar-me">
          <Avatar member={{ ...me, color: me?.color || "#1a8fa8" }} size={44} />
          <div className="sidebar-me-info">
            <h3 className="sidebar-family-name">{[me?.first_name, me?.last_name].filter(Boolean).join(" ")}</h3>
            <p className="sidebar-invite">Not in a family yet</p>
          </div>
        </div>
        {mode === "create" ? form("Family name, e.g. Manneh Family", "Create")
          : mode === "join" ? form("Family or group code", "Join", true)
          : (
            <div className="sidebar-me-actions">
              <button className="sidebar-me-btn primary" onClick={() => open("create")}>
                <Icon name="users" size={14} /> Create a family
              </button>
              <button className="sidebar-me-btn" onClick={() => open("join")}>
                <Icon name="logIn" size={14} /> Join with code
              </button>
            </div>
          )}
      </div>
    );
  }

  // ── In a family (one or more) ──
  return (
    <div className="sidebar-family">

      {/* Family chips — only shown when user is in 2+ real families */}
      {multiFamily && (
        <div className="sidebar-family-chips">
          {families.filter(f => !f.is_personal).map(f => (
            <button
              key={f.id}
              className={`sidebar-family-chip${Number(f.id) === Number(family?.id) ? " active" : ""}`}
              onClick={() => Number(f.id) !== Number(family?.id) && switchFamily(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <p className="sidebar-label">FAMILY</p>
      {mode === "rename" ? form("Family name", "Save") : (
        <h3 className="sidebar-family-name">
          {family.name}
          {isAdmin && (
            <button className="sidebar-family-edit" title="Rename family" onClick={() => open("rename", family.name)}>
              <Icon name="edit" size={13} />
            </button>
          )}
        </h3>
      )}
      <p className="sidebar-invite">
        Share this code to add people: <strong>{family.invite_code}</strong>
      </p>

      {availabilityControls}

      {/* Join or create another family */}
      {mode === "join" ? form("Family or group code", "Join", true)
        : mode === "create" ? form("Family name, e.g. Grandparents", "Create")
        : mode !== "rename" && (
          <>
            <button className="sidebar-family-switch" onClick={() => open("join")}>
              <Icon name="logIn" size={13} /> Join another family
            </button>
            <button className="sidebar-family-switch" onClick={() => open("create")}>
              <Icon name="users" size={13} /> Create another family
            </button>
          </>
        )}

      {/* Leave — shown for all non-admin members */}
      {!isAdmin && mode === null && (
        <button
          className="sidebar-family-leave"
          onClick={() => handleLeave(family)}
          disabled={leaving}
        >
          <Icon name="logOut" size={13} /> {leaving ? "Leaving…" : `Leave ${family.name}`}
        </button>
      )}
    </div>
  );
};

export default SidebarFamily;
