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
//   In a family                  → family name (admin can rename), code, switch
const SidebarFamily = () => {
  const { family, members, fetchFamily } = useFamily();
  const { joinWithCode } = useGroups();
  const { user } = useAuth();

  const [mode, setMode] = useState(null); // null | 'create' | 'join' | 'rename'
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const me = members.find(m => Number(m.id) === Number(user?.id)) || user;
  const isAdmin = ["admin", "owner"].includes(me?.role);
  const personal = !!family?.is_personal;

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
        if (res === null) return; // cancelled the move-over
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

  // ── In a family ──
  return (
    <div className="sidebar-family">
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

      {mode === "join" ? form("Code of the other family", "Switch", true) : mode !== "rename" && (
        <button className="sidebar-family-switch" onClick={() => open("join")}>
          <Icon name="swap" size={13} /> Switch to another family
        </button>
      )}
    </div>
  );
};

export default SidebarFamily;
