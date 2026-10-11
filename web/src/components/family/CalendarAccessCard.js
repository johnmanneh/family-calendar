import React, { useEffect, useState } from "react";
import API from "../../api/axios";
import Avatar from "../common/Avatar/Avatar";
import Icon from "../common/Icon/Icon";

// "Who can add to my calendar" — let family members create / edit / delete
// events on YOUR calendar. Never lets them see more of your events.
const CAPS = [
  { key: "can_create", label: "Add" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
];

const CalendarAccessCard = ({ members, meId }) => {
  const [grants, setGrants] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");

  const adults = members.filter(m => !m.is_managed && Number(m.id) !== Number(meId));

  useEffect(() => {
    API.get("/family/permissions")
      .then(res => {
        const g = {};
        (res.data.granted || []).forEach(p => { g[p.user_id] = p; });
        setGrants(g);
      })
      .catch(() => {});
  }, []);

  const toggle = async (person, key) => {
    const cur = grants[person.id] || { can_create: false, can_edit: false, can_delete: false };
    const next = { ...cur, [key]: !cur[key] };
    setSaving(person.id);
    setError("");
    try {
      await API.put("/family/permissions", { delegate_user_id: person.id, ...next });
      setGrants(g => ({ ...g, [person.id]: next }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not save");
    } finally {
      setSaving(null);
    }
  };

  if (adults.length === 0) return null;

  return (
    <div className="member-card">
      <h3 className="member-card-title"><Icon name="calendar" size={15} /> Who can add to my calendar</h3>
      <p className="member-settings-hint">
        Let someone add, change or remove events on your calendar. This never lets them see
        your private events — that stays with your privacy circle.
      </p>
      <div className="access-list">
        {adults.map(p => {
          const g = grants[p.id] || {};
          return (
            <div key={p.id} className="access-row">
              <Avatar member={p} size={32} />
              <span className="access-name">{p.first_name}</span>
              <div className="access-toggles">
                {CAPS.map(c => (
                  <button
                    key={c.key}
                    className={`access-chip${g[c.key] ? " on" : ""}`}
                    disabled={saving === p.id}
                    onClick={() => toggle(p, c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="member-error">{error}</p>}
    </div>
  );
};

export default CalendarAccessCard;
