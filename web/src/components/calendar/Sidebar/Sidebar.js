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
import { useTheme } from "../../../context/ThemeContext";
import { useFamily } from "../../../context/FamilyContext";
import Icon from "../../common/Icon/Icon";

import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { selectedMember } = useUI();
  const isViewingOther = selectedMember && Number(selectedMember.id) !== Number(user?.id);
  const navigate = useNavigate();
  const { colorScheme, toggleTheme } = useTheme();
  const { family } = useFamily();
  const personal = !!family?.is_personal;
  const isDark = colorScheme === "dark";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="sidebar">
      <SidebarFamily />
      {/* On your own there's nobody else to list or chat with */}
      {!personal && <SidebarMembers/>}
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
      {!personal && (
        <>
          <SidebarChat />
          <div className="sidebar-divider" />
        </>
      )}
      <div className="sidebar-bottom">
        <button className="sidebar-theme" onClick={toggleTheme} aria-label="Toggle dark mode">
          <Icon name={isDark ? "sun" : "moon"} size={15} />
          {isDark ? "Light mode" : "Dark mode"}
        </button>
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
