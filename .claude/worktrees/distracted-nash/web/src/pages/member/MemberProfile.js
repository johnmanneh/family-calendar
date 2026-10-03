import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamily } from "../../context/FamilyContext";
import API from "../../api/axios";
import { formatDate } from "../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import { MEMBER_COLORS } from "./MemberColors";
import Button from "../../components/common/Button/Button";

import "./MemberProfile.css";

const MemberProfile = () => {
  const { user } = useAuth();
  const { userId } = useParams();
  const { members, fetchFamily } = useFamily();
  const navigate = useNavigate();

  const [selectedColor, setSelectedColor] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState({
    age: "",
    address: "",
    occupation: ""
  });
  const [colorLoading, setColorLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [circleLoading, setCircleLoading] = useState(false);
  const member = members.find(m => Number(m.id) === parseInt(userId));
  const isOwnProfile = Number(user?.id) === parseInt(userId);
  const currentUser = members.find(m => Number(m.id) === Number(user?.id));
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, tasksRes] = await Promise.all([
          API.get(`/family/members/${userId}/events`),
          API.get(`/family/members/${userId}/tasks`)
        ]);
        setEvents(eventsRes.data.events);
        setTasks(tasksRes.data.tasks);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchFamily();
  }, [userId]);

  const handleColorSave = async () => {
    setLoading(true);

    try {
      await API.put("/family/member/color", { color: selectedColor }); // send color to db
      await fetchFamily(); // refresh the members in db.
    } catch (err) {
      setError(err.response?.data?.message || "fetching events went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCircleToggle = async () => {
    console.log("handleCircleToggle fired", { isAdmin, member: member?.id, circle_type: member?.circle_type });
    if (!isAdmin) {
      console.warn("Not admin — button should not be visible");
      return;
    }
    const newCircle = member.circle_type === 'inner' ? 'outer' : 'inner';
    setCircleLoading(true);
    try {
      await API.put("/family/member/circle", { user_id: member.id, circle_type: newCircle });
      await fetchFamily();
    } catch (err) {
      console.error("Circle update failed", err.response?.data);
      setError(err.response?.data?.message || "Could not update circle type");
    } finally {
      setCircleLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    // Only send fields that have values
    const fieldsToUpdate = {};
    if (profileData.age) fieldsToUpdate.age = profileData.age;
    if (profileData.address) fieldsToUpdate.address = profileData.address;
    if (profileData.occupation) fieldsToUpdate.occupation = profileData.occupation;

    try {
      await API.put("/auth/profile", fieldsToUpdate);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setProfileLoading(false);
    }
  };
  if (!member) return null;

  return (
    <div className="member-page">
      {/* Header */}
      <div className="member-header">
        <button className="member-back" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
        <div className="member-hero">
          <div
            className="member-hero-avatar"
            style={{ background: member.color || "#1a8fa8" }}
          >
            {member.first_name[0]}
            {member.last_name[0]}
          </div>
          <div className="member-hero-info">
            <h1>
              {member.first_name} {member.last_name}
            </h1>
            <p>{member.role}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="member-tabs">
          <button
            className={`member-tab ${activeTab === "personal" ? "active" : ""}`}
            onClick={() => setActiveTab("personal")}
          >
            Personal View
          </button>
          {(isOwnProfile || isAdmin) && (
            <button
              className={`member-tab ${
                activeTab === "settings" ? "active" : ""
              }`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="member-content">
        {loading ? (
          <p className="member-loading">Loading...</p>
        ) : activeTab === "personal" ? (
          <div className="member-personal">
            {/* Events */}
            <div className="member-card">
              <h3 className="member-card-title">📅 Events</h3>
              {events.length === 0 ? (
                <p className="member-empty">No events yet</p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="member-event">
                    <div
                      className="member-event-color"
                      style={{ background: event.color || "#1a8fa8" }}
                    />
                    <div className="member-event-info">
                      <p className="member-event-title">{event.title}</p>
                      <p className="member-event-date">
                        {formatDate(new Date(event.start_date))}
                      </p>
                      {event.location && (
                        <p className="member-event-location">
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                    <span className={`member-event-priority ${event.priority}`}>
                      {event.priority}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Tasks */}
            <div className="member-card">
              <h3 className="member-card-title">✅ Tasks</h3>
              {tasks.length === 0 ? (
                <p className="member-empty">No tasks yet</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="member-task">
                    <div
                      className="member-task-dot"
                      style={{ background: task.color || "#1a8fa8" }}
                    />
                    <div className="member-task-info">
                      <p className="member-task-title">{task.title}</p>
                      <p className="member-task-event">{task.event_title}</p>
                      <p className="member-task-date">
                        {formatDate(new Date(task.start_date))}
                      </p>
                    </div>
                    <span className="member-task-position">
                      {task.position}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="member-settings">
            {/* Color Card — own profile only */}
            {isOwnProfile && <div className="member-card">
              <h3 className="member-card-title">🎨 Your Color</h3>
              <p className="member-settings-hint">
                This color shows on your avatar and events
              </p>
              <div className="member-colors">
                {MEMBER_COLORS.map(({ color }) => (
                  <div
                    key={color}
                    className={`member-color-dot ${
                      selectedColor === color ? "selected" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              {error && <p className="member-error">{error}</p>}
              <Button
                text="Save Color"
                onClick={handleColorSave}
                loading={colorLoading}
              />
            </div>}

            {/* Circle Type Card */}
            <div className="member-card">
              <h3 className="member-card-title">🔒 Privacy Circle</h3>
              <p className="member-settings-hint">
                Inner circle members see all family events. Outer circle members see only events they are part of.
              </p>
              <div className="member-circle-row">
                <span className={`member-circle-badge ${member.circle_type === 'inner' ? 'inner' : 'outer'}`}>
                  {member.circle_type === 'inner' ? '⭕ Inner Circle' : '🔵 Outer Circle'}
                </span>
                {isAdmin && !isOwnProfile && (
                  <Button
                    text={circleLoading ? "Saving..." : `Move to ${member.circle_type === 'inner' ? 'Outer' : 'Inner'}`}
                    onClick={handleCircleToggle}
                    loading={circleLoading}
                  />
                )}
              </div>
              {error && <p className="member-error">{error}</p>}
            </div>

            {/* Profile Info Card — own profile only */}
            {isOwnProfile && <div className="member-card">
              <h3 className="member-card-title">👤 Profile Info</h3>
              <p className="member-settings-hint">
                All fields are optional — update only what you want
              </p>

              <div className="member-settings-field">
                <label>Age</label>
                <input
                  type="number"
                  placeholder="Your age"
                  value={profileData.age}
                  onChange={e =>
                    setProfileData({ ...profileData, age: e.target.value })
                  }
                />
              </div>

              <div className="member-settings-field">
                <label>Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Teacher, Engineer..."
                  value={profileData.occupation}
                  onChange={e =>
                    setProfileData({
                      ...profileData,
                      occupation: e.target.value
                    })
                  }
                />
              </div>

              <div className="member-settings-field">
                <label>Address</label>
                <input
                  type="text"
                  placeholder="Your address"
                  value={profileData.address}
                  onChange={e =>
                    setProfileData({ ...profileData, address: e.target.value })
                  }
                />
              </div>

              {error && <p className="member-error">{error}</p>}
              <Button
                text="Save Profile"
                onClick={handleProfileSave}
                loading={profileLoading}
              />
            </div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
