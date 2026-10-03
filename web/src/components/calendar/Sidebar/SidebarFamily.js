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
    </div>
  );
};

export default SidebarFamily;