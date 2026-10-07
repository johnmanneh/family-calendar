import React from "react";
import "./Avatar.css";

const BACKEND_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:8000';

/**
 * Avatar — shows profile photo if available, otherwise initials.
 * Props:
 *   member: { first_name, last_name, color, avatar_url }
 *   size:   number (px, default 40)
 *   className: extra CSS class
 *   style: extra inline styles
 */
const Avatar = ({ member, size = 40, className = "", style = {} }) => {
  if (!member) return null;

  const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`;
  const photoUrl = member.avatar_url ? `${BACKEND_URL}${member.avatar_url}` : null;

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    ...style,
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={initials}
        className={`avatar-img ${className}`}
        style={baseStyle}
      />
    );
  }

  return (
    <div
      className={`avatar-initials ${className}`}
      style={{
        ...baseStyle,
        background: member.color || "#1a8fa8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
