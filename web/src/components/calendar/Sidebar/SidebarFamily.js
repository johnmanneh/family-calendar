import React, { useState } from "react";
import { useFamily } from "../../../context/FamilyContext";
import { useGroups } from "../../../context/GroupContext";
import { runJoinFlow } from "../../../utils/joinFlow";
import Icon from "../../common/Icon/Icon";
import "./Sidebar.css";

const SidebarFamily = () => {
  const { family, fetchFamily } = useFamily();
  const { joinWithCode } = useGroups();

  const [switching, setSwitching] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSwitch = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await runJoinFlow(code, joinWithCode, fetchFamily);
      if (res !== null) { setCode(""); setSwitching(false); }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-family">
      <p className="sidebar-label">FAMILY</p>
      <h3 className="sidebar-family-name">{family?.name}</h3>
      <p className="sidebar-invite">
        Share this code to add people: <strong>{family?.invite_code}</strong>
      </p>

      {switching ? (
        <form className="sidebar-group-form" onSubmit={handleSwitch}>
          <input
            autoFocus
            className="sidebar-group-input"
            placeholder="Code of the other family"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
          />
          {error && <p className="sidebar-group-error">{error}</p>}
          <div className="sidebar-group-form-row">
            <button type="submit" className="sidebar-group-btn-confirm" disabled={loading}>
              {loading ? "..." : "Switch"}
            </button>
            <button type="button" className="sidebar-group-btn-cancel" onClick={() => { setSwitching(false); setCode(""); setError(""); }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="sidebar-family-switch" onClick={() => setSwitching(true)}>
          <Icon name="swap" size={13} /> Switch to another family
        </button>
      )}
    </div>
  );
};

export default SidebarFamily;
