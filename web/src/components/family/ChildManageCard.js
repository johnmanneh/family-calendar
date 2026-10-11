import React, { useState } from "react";
import API from "../../api/axios";
import Icon from "../common/Icon/Icon";
import { MEMBER_COLORS } from "../../pages/member/MemberColors";
import ScanModal from "../scan/ScanModal";

// Manage a child profile (no login): name, colour, remove.
const ChildManageCard = ({ child, onSaved, onRemoved }) => {
  const [first, setFirst] = useState(child.first_name || "");
  const [last, setLast] = useState(child.last_name || "");
  const [color, setColor] = useState(child.color || "#f48c06");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const save = async () => {
    if (!first.trim()) return;
    setSaving(true);
    setMsg("");
    try {
      await API.put(`/family/children/${child.id}`, { first_name: first, last_name: last, color });
      setMsg("Saved");
      onSaved?.();
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await API.delete(`/family/children/${child.id}`);
      onRemoved?.();
    } catch (err) {
      setMsg(err.response?.data?.message || "Could not remove");
    }
  };

  return (
    <>
      <button className="child-scan" onClick={() => setScanOpen(true)}>🌸 Scan schedule for {child.first_name}</button>
      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} ownerId={child.id} />
      <div className="member-card">
        <h3 className="member-card-title"><Icon name="user" size={15} /> Child profile</h3>
        <p className="member-settings-hint">
          {child.first_name} doesn't sign in — you and the family admins manage this calendar.
        </p>
        <div className="member-settings-field">
          <label>First name</label>
          <input value={first} maxLength={100} onChange={e => setFirst(e.target.value)} />
        </div>
        <div className="member-settings-field">
          <label>Last name</label>
          <input value={last} maxLength={100} onChange={e => setLast(e.target.value)} />
        </div>
        <div className="member-colors">
          {MEMBER_COLORS.map(({ color: c }) => (
            <div
              key={c}
              className={`member-color-dot ${color === c ? "selected" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        {msg && <p className={msg === "Saved" ? "member-saved" : "member-error"}>{msg}</p>}
        <button className="child-save" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>

      <div className="member-card">
        <h3 className="member-card-title"><Icon name="alert" size={15} /> Remove {child.first_name}</h3>
        <p className="member-settings-hint">
          Removes the profile and the events on {child.first_name}'s calendar. This can't be undone.
        </p>
        {confirm ? (
          <div className="child-confirm">
            <button className="child-remove" onClick={remove}>Yes, remove</button>
            <button className="child-cancel" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        ) : (
          <button className="child-remove-outline" onClick={() => setConfirm(true)}>Remove profile</button>
        )}
      </div>
    </>
  );
};

export default ChildManageCard;
