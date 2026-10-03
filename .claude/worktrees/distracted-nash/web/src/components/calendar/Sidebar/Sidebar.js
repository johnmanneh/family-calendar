import React, {useState} from "react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import SidebarTasks from "./SidebarTasks";
import SidebarFamily from "./SidebarFamily";
import SidebarMembers from "./SidebarMembers";
import { useUI } from "../../../context/UIContext";

import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const {selectedMember} = useUI();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <SidebarFamily />
      <div className="sidebar-divider" />

      <SidebarMembers/>
      <div className="sidebar-divider" />
      
      {!selectedMember && (
        <>
          <SidebarTasks />
          <div className="sidebar-divider" />
        </>
      )}
      <div className="sidebar-bottom">
        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
        <button
          className="sidebar-gear"
          onClick={() => navigate(`/profile/${selectedMember ? selectedMember.id : user.id}`)}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
