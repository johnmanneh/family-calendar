import React from "react";
import { CATEGORIES } from "./Categories";
import "./Sidebar.css";

const SidebarCategories = () => {
  return (
    <div className="sidebar-section">
      <p className="sidebar-label">CALENDARS</p>
      {CATEGORIES.map(cat => (
        <div key={cat.name} className="sidebar-category">
          <div
            className="sidebar-checkbox"
            style={{ backgroundColor: cat.color, borderColor: cat.color }}
          />
          <span className="sidebar-category-icon">{cat.icon}</span>
          <span className="sidebar-category-name">{cat.name}</span>
        </div>
      ))}
    </div>
  );
};

export default SidebarCategories;
