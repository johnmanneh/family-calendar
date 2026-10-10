import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamily } from "../../context/FamilyContext";
import API from "../../api/axios";
import { formatDate } from "../../utils/dateUtils";
import { useAuth } from "../../context/AuthContext";
import { MEMBER_COLORS } from "./MemberColors";
import Button from "../../components/common/Button/Button";
import Avatar from "../../components/common/Avatar/Avatar";
import Icon from "../../components/common/Icon/Icon";

import "./MemberProfile.css";

const MemberProfile = () => {
  const { user, logout } = useAuth();
  const { userId } = useParams();
  const { members, fetchFamily } = useFamily();
  const navigate = useNavigate();

  const [selectedColor, setSelectedColor] = useState("");
  const [activeTab, setActiveTab] = useState("personal");   // corrected below once we know whose profile it is
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorError, setColorError] = useState("");
  const [circleError, setCircleError] = useState("");
  const [relationshipError, setRelationshipError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    age: "",
    address: "",
    occupation: ""
  });
  // Short "Saved" confirmations per card
  const [saved, setSaved] = useState({});
  const flashSaved = (key) => {
    setSaved(s => ({ ...s, [key]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000);
  };
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

  // Own profile opens straight on Settings; someone else's on "Coming up"
  useEffect(() => { setActiveTab(isOwnProfile ? "settings" : "personal"); }, [isOwnProfile]);

  // Start the colour picker on the member's current colour
  useEffect(() => { if (member?.color) setSelectedColor(member.color); }, [member?.color]);

  // Fill the profile form with what's saved
  useEffect(() => {
    if (!isOwnProfile) return;
    API.get("/auth/me")
      .then(res => {
        const u = res.data.user || {};
        setProfileData({
          first_name: u.first_name || "",
          last_name:  u.last_name  || "",
          age:        u.age ?? "",
          address:    u.address    || "",
          occupation: u.occupation || "",
        });
      })
      .catch(() => {});
  }, [isOwnProfile]);

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

  // Tap a colour → saved straight away (same as the app)
  const handleColorPick = async (color) => {
    if (color === selectedColor || colorLoading) return;
    const previous = selectedColor;
    setSelectedColor(color);
    setColorError("");
    setColorLoading(true);
    try {
      await API.put("/family/member/color", { color });
      await fetchFamily();
      flashSaved("color");
    } catch (err) {
      setSelectedColor(previous);
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
    setProfileError("");
    if (!profileData.first_name.trim()) {
      setProfileError("First name can't be empty");
      return;
    }
    const age = String(profileData.age ?? "").trim();
    if (age && !/^\d{1,3}$/.test(age)) {
      setProfileError("Age must be a number");
      return;
    }
    setProfileLoading(true);
    // Empty optional fields are cleared (null) — '' would break the integer age column
    const fieldsToUpdate = {
      first_name: profileData.first_name.trim(),
      last_name:  profileData.last_name.trim()  || null,
      age:        age ? Number(age) : null,
      address:    profileData.address.trim()    || null,
      occupation: profileData.occupation.trim() || null,
    };

    try {
      await API.put("/auth/profile", fieldsToUpdate);
      await fetchFamily(); // name changes show everywhere
      flashSaved("profile");
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
      await logout();
      navigate("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete account");
      setDeleteLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image");
      return;
    }
    setAvatarError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Phone photos are often several MB — shrink to a 512px JPEG before upload
  const shrinkImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        blob => resolve(blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    setAvatarError("");
    try {
      const small = await shrinkImage(avatarFile);
      const formData = new FormData();
      formData.append("avatar", small);
      // No manual Content-Type — the browser adds the multipart boundary itself
      await API.post("/auth/avatar", formData);
      await fetchFamily();
      setAvatarFile(null);
      setAvatarPreview(null);
      flashSaved("photo");
    } catch (err) {
      setAvatarError(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setAvatarLoading(false);
    }
  };

  const upcoming = [
    ...events.map(ev => ({ kind: 'event', key: `e-${ev.id}`, when: ev.start_date, ev })),
    ...tasks.map(tk => ({ kind: 'task', key: `t-${tk.id}`, when: tk.start_date || tk.due_date, tk })),
  ]
    .sort((a, b) => (!a.when ? 1 : !b.when ? -1 : new Date(a.when) - new Date(b.when)))
    .slice(0, 3);

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

        {/* Tabs — only when there's a choice: an admin looking at someone else */}
        {!isOwnProfile && isAdmin && (
          <div className="member-tabs">
            <button
              className={`member-tab ${activeTab === "personal" ? "active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              Coming up
            </button>
            <button
              className={`member-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="member-content">
        {loading ? (
          <p className="member-loading">Loading...</p>
        ) : activeTab === "personal" ? (
          <div className="member-personal">
            {/* Coming up: their next 3 events/tasks — the full view is the calendar */}
            <div className="member-card">
              <h3 className="member-card-title"><Icon name="calendar" size={15} /> Coming up</h3>
              {upcoming.length === 0 ? (
                <p className="member-empty">Nothing coming up</p>
              ) : upcoming.map(item => item.kind === 'event' ? (
                <div key={item.key} className="member-event">
                  <div className="member-event-color" style={{ background: item.ev.color || "#1a8fa8" }} />
                  <div className="member-event-info">
                    <p className="member-event-title">{item.ev.title}</p>
                    <p className="member-event-date">{formatDate(new Date(item.ev.start_date))}</p>
                    {item.ev.location && (
                      <p className="member-event-location"><Icon name="mapPin" size={12} /> {item.ev.location}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div key={item.key} className="member-event">
                  <div className="member-event-color" style={{ background: member.color || "#1a8fa8" }} />
                  <div className="member-event-info">
                    <p className="member-event-title">{item.tk.title}</p>
                    <p className="member-event-date">
                      {item.tk.event_title || (item.tk.due_date ? formatDate(new Date(item.tk.due_date)) : "No due date")}
                    </p>
                  </div>
                </div>
              ))}

              <button
                className="member-see-all"
                onClick={() => navigate("/dashboard", { state: { focusMemberId: member.id } })}
              >
                See all {member.first_name}'s events ›
              </button>
            </div>
          </div>
        ) : (
          <div className="member-settings">
            {/* Photo Card — own profile only */}
            {isOwnProfile && (
              <div className="member-card">
                <h3 className="member-card-title"><Icon name="camera" size={15} /> Profile Photo</h3>
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
                {saved.photo && <p className="member-saved">Saved</p>}
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
              <h3 className="member-card-title"><Icon name="palette" size={15} /> Your Color</h3>
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
                    onClick={() => handleColorPick(color)}
                  />
                ))}
              </div>
              {colorError && <p className="member-error">{colorError}</p>}
              {saved.color && <p className="member-saved">Saved</p>}
            </div>}

            {/* Circle Type Card */}
            <div className="member-card">
              <h3 className="member-card-title"><Icon name="lock" size={15} /> Privacy Circle</h3>
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
                <h3 className="member-card-title"><Icon name="tag" size={15} /> Relationship Label</h3>
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
                <h3 className="member-card-title"><Icon name="alert" size={15} /> Danger Zone</h3>
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
              <h3 className="member-card-title"><Icon name="user" size={15} /> Profile Info</h3>
              <p className="member-settings-hint">
                All fields are optional — update only what you want
              </p>

              <div className="member-settings-field">
                <label>First name</label>
                <input
                  type="text"
                  placeholder="First name"
                  value={profileData.first_name}
                  onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
                />
              </div>

              <div className="member-settings-field">
                <label>Last name</label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={profileData.last_name}
                  onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
                />
              </div>

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
              {saved.profile && <p className="member-saved">Saved</p>}
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
