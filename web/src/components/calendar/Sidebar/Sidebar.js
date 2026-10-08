import React, {useState} from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import SidebarTasks from "./SidebarTasks";
import SidebarFamily from "./SidebarFamily";
import SidebarMembers from "./SidebarMembers";
import SidebarGroups from "./SidebarGroups";
import SidebarPending from "./SidebarPending";
import SidebarNotifications from "./SidebarNotifications";
import SidebarChat from "./SidebarChat";
import { useUI } from "../../../context/UIContext";

import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { selectedMember } = useUI();
  const isViewingOther = selectedMember && Number(selectedMember.id) !== Number(user?.id);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="sidebar">
      <SidebarFamily />
      <SidebarMembers/>
      <div className="sidebar-divider" />
      <SidebarPending />
      
      {!isViewingOther && (
        <>
          <SidebarTasks />
          <div className="sidebar-divider" />
        </>
      )}
      <SidebarGroups />
      <div className="sidebar-divider" />
      <SidebarNotifications />
      <div className="sidebar-divider" />
      <SidebarChat />
      <div className="sidebar-divider" />
      <div className="sidebar-bottom">
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
