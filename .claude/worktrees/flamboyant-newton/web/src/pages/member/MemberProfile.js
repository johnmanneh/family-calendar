import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamily } from "../../context/FamilyContext";
import API from "../../api/axios";
import { formatDate } from "../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import { MEMBER_COLORS } from "./MemberColors";
import Button from "../../components/common/Button/Button";
import Avatar from "../../components/common/Avatar/Avatar";

import "./MemberProfile.css";

const MemberProfile = () => {
  const { user, logout } = useAuth();
  const { userId } = useParams();
  const { members, fetchFamily } = useFamily();
  const navigate = useNavigate();

  const [selectedColor, setSelectedColor] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorError, setColorError] = useState("");
  const [circleError, setCircleError] = useState("");
  const [relationshipError, setRelationshipError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [profileData, setProfileData] = useState({
    age: "",
    address: "",
    occupation: ""
  });
  const [colorLoading, setColorLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [circleLoading, setCircleLoading] = useState(false);
  const [relationshipInput, setRelationshipInput] = useState("");
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const avatarInputRef = useRef(null);
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
  }, [userId]);

  const handleColorSave = async () => {
    setColorLoading(true);
    try {
      await API.put("/family/member/color", { color: selectedColor });
      await fetchFamily();
    } catch (err) {
      setColorError(err.response?.data?.message || "Could not save color");
    } finally {
      setColorLoading(false);
    }
  };

  const handleCircleSelect = async (newCircle) => {
    if (!isAdmin || newCircle === member.circle_type) return;
    setCircleLoading(true);
    try {
      await API.put("/family/member/circle", { user_id: member.id, circle_type: newCircle });
      await fetchFamily();
    } catch (err) {
      setCircleError(err.response?.data?.message || "Could not update circle type");
    } finally {
      setCircleLoading(false);
    }
  };

  const handleRelationshipSave = async () => {
    if (!isAdmin) return;
    setRelationshipLoading(true);
    try {
      await API.put("/family/member/relationship", { user_id: member.id, relationship: relationshipInput });
      await fetchFamily();
    } catch (err) {
      setRelationshipError(err.response?.data?.message || "Could not update relationship");
    } finally {
      setRelationshipLoading(false);
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
      setProfileError(err.response?.data?.message || "Something went wrong");
    } finally {
      setProfileLoading(false);
    }
  };
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await API.delete("/auth/account");
      logout();
      navigate("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete account");
      setDeleteLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      await API.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await fetchFamily();
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      setAvatarError(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  if (!member) {
    return (
      <div className="member-page">
        <div className="member-header">
          <button className="member-back" onClick={() => navigate("/dashboard")}>← Back</button>
          <div className="member-hero member-hero--skeleton">
            <div className="member-skeleton member-skeleton--avatar" />
            <div className="member-hero-info">
              <div className="member-skeleton member-skeleton--name" />
              <div className="member-skeleton member-skeleton--role" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="member-page">
      {/* Header */}
      <div className="member-header">
        <button className="member-back" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
        <div className="member-hero">
          <Avatar
            member={member}
            size={64}
            className="member-hero-avatar"
          />
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
            {/* Photo Card — own profile only */}
            {isOwnProfile && (
              <div className="member-card">
                <h3 className="member-card-title">📷 Profile Photo</h3>
                <p className="member-settings-hint">
                  Upload a photo — it shows in the sidebar and your profile
                </p>
                <div className="member-photo-row">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="member-photo-preview"
                    />
                  ) : (
                    <Avatar member={member} size={64} className="member-photo-preview" />
                  )}
                  <button
                    className="member-photo-pick"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {member.avatar_url || avatarPreview ? "Change Photo" : "Choose Photo"}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </div>
                {avatarError && <p className="member-error">{avatarError}</p>}
                {avatarFile && (
                  <Button
                    text="Save Photo"
                    onClick={handleAvatarUpload}
                    loading={avatarLoading}
                  />
                )}
              </div>
            )}

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
              {colorError && <p className="member-error">{colorError}</p>}
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
                Inner — sees all events (private shown as Busy).<br />
                Extended — sees all non-private events.<br />
                Outer — sees only events they are part of.
              </p>
              <div className="member-circle-picker">
                {['inner', 'extended', 'outer'].map(circle => (
                  <button
                    key={circle}
                    className={`member-circle-option ${member.circle_type === circle ? 'active' : ''}`}
                    onClick={() => handleCircleSelect(circle)}
                    disabled={!isAdmin || isOwnProfile || circleLoading}
                  >
                    {circle === 'inner' ? '⭕ Inner' : circle === 'extended' ? '🌐 Extended' : '🔵 Outer'}
                  </button>
                ))}
              </div>
              {circleError && <p className="member-error">{circleError}</p>}
            </div>

            {/* Relationship Label Card — admin only, not own profile */}
            {isAdmin && !isOwnProfile && (
              <div className="member-card">
                <h3 className="member-card-title">🏷️ Relationship Label</h3>
                <p className="member-settings-hint">
                  Label this member's relationship — e.g. Grandma, Uncle Bob, Cousin.
                  {member.relationship && <> Current: <strong>{member.relationship}</strong></>}
                </p>
                <div className="member-settings-field">
                  <input
                    type="text"
                    placeholder={member.relationship || "e.g. Grandma, Uncle Bob..."}
                    value={relationshipInput}
                    onChange={e => setRelationshipInput(e.target.value)}
                  />
                </div>
                {relationshipError && <p className="member-error">{relationshipError}</p>}
                <Button
                  text="Save Label"
                  onClick={handleRelationshipSave}
                  loading={relationshipLoading}
                />
              </div>
            )}

            {/* Danger Zone — own profile only */}
            {isOwnProfile && (
              <div className="member-card member-card--danger">
                <h3 className="member-card-title">⚠️ Danger Zone</h3>
                <p className="member-settings-hint">
                  Permanently delete your account. Your family events will remain but your name will be removed from them. This cannot be undone.
                </p>
                {!deleteConfirm ? (
                  <button className="member-delete-btn" onClick={() => setDeleteConfirm(true)}>
                    Delete My Account
                  </button>
                ) : (
                  <div className="member-delete-confirm">
                    <p className="member-delete-confirm-text">Are you sure? This is permanent.</p>
                    {deleteError && <p className="member-error">{deleteError}</p>}
                    <div className="member-delete-confirm-row">
                      <button className="member-delete-btn" onClick={handleDeleteAccount} disabled={deleteLoading}>
                        {deleteLoading ? "Deleting..." : "Yes, delete my account"}
                      </button>
                      <button className="member-delete-cancel" onClick={() => { setDeleteConfirm(false); setDeleteError(""); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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

              {profileError && <p className="member-error">{profileError}</p>}
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
