import React from "react";
import { useFamily } from "../../../context/FamilyContext";
import { useAuth } from "../../../context/AuthContext";
import "./Sidebar.css";

const SidebarFamily = () => {
  const { family, members } = useFamily();
  const { user } = useAuth();

  const currentMember = members.find(m => m.id === user?.id);

  return (
    <div className="sidebar-family">
      <p className="sidebar-label">FAMILY</p>
      <h3 className="sidebar-family-name">{family?.name}</h3>
      <p className="sidebar-invite">
        Invite Code: <strong>{family?.invite_code}</strong>
      </p>
      {/* Current user avatar — later becomes profile image */}
      <div className="sidebar-current-user">
        <div
          className="sidebar-current-user-avatar"
          style={{ background: currentMember?.color || '#1a8fa8' }}
        >
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div className="sidebar-current-user-info">
          <p className="sidebar-current-user-role">{currentMember?.role}</p>
        </div>
      </div>
    </div>
  );
};

export default SidebarFamily;