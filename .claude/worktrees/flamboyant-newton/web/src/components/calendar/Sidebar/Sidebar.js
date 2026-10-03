import React, {useState} from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import SidebarTasks from "./SidebarTasks";
import SidebarFamily from "./SidebarFamily";
import SidebarMembers from "./SidebarMembers";
import SidebarGroups from "./SidebarGroups";
import SidebarPending from "./SidebarPending";
import { useUI } from "../../../context/UIContext";

import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { selectedMember } = useUI();
  const isViewingOther = selectedMember && selectedMember.id !== user?.id;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <SidebarPending />
      <SidebarFamily />
      <SidebarMembers/>
      <div className="sidebar-divider" />
      
      {!isViewingOther && (
        <>
          <SidebarTasks />
          <div className="sidebar-divider" />
        </>
      )}
      <SidebarGroups />
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
