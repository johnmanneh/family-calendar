import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import styles from '../styles/MemberProfileScreen.styles';

// ─── Colour palette ───────────────────────────────────────────────────────────
// Same 21 colours as the web version (MemberColors.js)
const MEMBER_COLORS = [
  '#56e39f', '#00c896', '#a8e063',
  '#4facfe', '#0061ff', '#48c6ef',
  '#f857a6', '#ff416c', '#ff6b6b',
  '#f48c06', '#ffd60a', '#f9a825',
  '#9747ff', '#c471ed', '#7b2ff7',
  '#1a8fa8', '#2d3436', '#6e6e73',
  '#e17055', '#00b894', '#fd79a8',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Event row ───────────────────────────────────────────────────────────────

function EventItem({ event, navigation }) {
  const color = event.color || '#1a8fa8';
  return (
    <TouchableOpacity
      style={styles.eventRow}
      onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
      activeOpacity={0.75}
    >
      <View style={[styles.eventStripe, { backgroundColor: color }]} />
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventMeta}>
          {formatDate(event.start_date)}
          {event.location ? `  ·  ${event.location}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  pending:   '#f48c06',
  accepted:  '#34c759',
  declined:  '#ff3b30',
  countered: '#af52de',
};

function TaskItem({ task }) {
  const dot = STATUS_COLOR[task.status] || '#aeaeb2';
  return (
    <View style={styles.taskRow}>
      <View style={[styles.taskDot, { backgroundColor: dot }]} />
      <View style={styles.taskBody}>
        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
        {task.event_title ? (
          <Text style={styles.taskMeta} numberOfLines={1}>{task.event_title}</Text>
        ) : null}
      </View>
      <Text style={styles.taskStatus}>{task.status}</Text>
    </View>
  );
}

// ─── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab({ member, user, family, fetchFamily }) {
  const { logout } = useAuth();

  // ── Colour state ─────────────────────────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState(member?.color || '#1a8fa8');
  const [colorSaving, setColorSaving] = useState(false);
  const [colorExpanded, setColorExpanded] = useState(false);

  // Show first 7 swatches collapsed (one row), all 21 when expanded
  const visibleColors = colorExpanded ? MEMBER_COLORS : MEMBER_COLORS.slice(0, 7);

  // ── Profile info state ───────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({ age: '', address: '', occupation: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Fetch current age/address/occupation on mount — /auth/me now returns them
  useEffect(() => {
    API.get('/auth/me')
      .then(res => {
        const u = res.data.user;
        setProfileData({
          age:        u.age        || '',
          address:    u.address    || '',
          occupation: u.occupation || '',
        });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // ── Save colour ──────────────────────────────────────────────────────────
  // Called immediately when a swatch is tapped — same UX as web
  const handleColorPress = async (color) => {
    if (color === selectedColor || colorSaving) return;
    setSelectedColor(color);
    setColorSaving(true);
    try {
      await API.put('/family/member/color', { color });
      // Refresh FamilyContext so the bubble in HomeScreen updates too
      fetchFamily();
    } catch {
      // Revert optimistic update on failure
      setSelectedColor(member?.color || '#1a8fa8');
    } finally {
      setColorSaving(false);
    }
  };

  // ── Save profile info ────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      await API.put('/auth/profile', profileData);
      setProfileSuccess('Saved');
      setTimeout(() => setProfileSuccess(''), 2000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not save');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Delete account ───────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently remove your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.delete('/auth/account');
              logout();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete account');
            }
          },
        },
      ]
    );
  };

  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = () => {
    Clipboard.setString(family?.invite_code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      {/* ── Family ── */}
      {family && (
        <>
          <Text style={styles.settingsSectionHeader}>Your Family</Text>
          <View style={styles.settingsCard}>
            <Text style={styles.familyName}>{family.name}</Text>
            <Text style={styles.familyLabel}>Invite code — share this so others can join</Text>
            <View style={styles.inviteRow}>
              <Text style={styles.inviteCode}>{family.invite_code}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                <Ionicons
                  name={codeCopied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={codeCopied ? '#34c759' : '#1a8fa8'}
                />
                <Text style={[styles.copyBtnText, codeCopied && { color: '#34c759' }]}>
                  {codeCopied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* ── Colour picker ── */}
      <Text style={styles.settingsSectionHeader}>Your colour</Text>
      <View style={styles.settingsCard}>
        <View style={styles.colorGrid}>
          {visibleColors.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selectedColor === color && styles.colorSwatchSelected,
              ]}
              onPress={() => handleColorPress(color)}
              activeOpacity={0.8}
            >
              {selectedColor === color && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.colorToggleBtn} onPress={() => setColorExpanded(e => !e)}>
          <Text style={styles.colorToggleText}>
            {colorExpanded ? 'Show less' : 'Show more colours'}
          </Text>
          <Ionicons name={colorExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#1a8fa8" />
        </TouchableOpacity>
        {colorSaving && (
          <Text style={styles.savingText}>Saving…</Text>
        )}
      </View>

      {/* ── Profile info ── */}
      <Text style={styles.settingsSectionHeader}>About you</Text>
      <View style={styles.settingsCard}>
        {profileLoading ? (
          <ActivityIndicator color="#1a8fa8" />
        ) : (
          <>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.settingsInput}
              placeholder="Your age"
              placeholderTextColor="#aaa"
              value={profileData.age}
              onChangeText={v => setProfileData(p => ({ ...p, age: v }))}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Occupation</Text>
            <TextInput
              style={styles.settingsInput}
              placeholder="What do you do?"
              placeholderTextColor="#aaa"
              value={profileData.occupation}
              onChangeText={v => setProfileData(p => ({ ...p, occupation: v }))}
            />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.settingsInput}
              placeholder="Your address"
              placeholderTextColor="#aaa"
              value={profileData.address}
              onChangeText={v => setProfileData(p => ({ ...p, address: v }))}
            />

            {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
            {profileSuccess ? <Text style={styles.successText}>{profileSuccess}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, profileSaving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Danger zone ── */}
      <Text style={[styles.settingsSectionHeader, { marginTop: 32 }]}>Danger zone</Text>
      <View style={styles.settingsCard}>
        <Text style={styles.dangerDescription}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={16} color="#ff3b30" />
          <Text style={styles.deleteBtnText}>Delete my account</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── MemberProfileScreen ─────────────────────────────────────────────────────

export default function MemberProfileScreen({ route, navigation }) {
  const { memberId } = route.params;
  const { user } = useAuth();
  const { family, members, fetchFamily } = useFamily();

  const member = members.find(m => Number(m.id) === Number(memberId));
  const isOwnProfile = Number(user?.id) === Number(memberId);

  // Use live color from context so it updates after colour picker saves
  const memberColor = member?.color || '#1a8fa8';
  const initials = [member?.first_name?.[0], member?.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  const displayName = member
    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
    : 'Member';

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('personal');

  // ── Personal tab data ────────────────────────────────────────────────────
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [evRes, tkRes] = await Promise.all([
        API.get(`/family/members/${memberId}/events`),
        API.get(`/family/members/${memberId}/tasks`),
      ]);
      setEvents(evRes.data.events || []);
      setTasks(tkRes.data.tasks || []);
    } catch (err) {
      console.error('MemberProfile fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Profile card ── */}
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: memberColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.memberName}>{displayName}</Text>
        {member?.relationship ? (
          <Text style={styles.memberRelationship}>{member.relationship}</Text>
        ) : null}
        {member?.email ? (
          <Text style={styles.memberEmail}>{member.email}</Text>
        ) : null}
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.tabActive]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabLabel, activeTab === 'personal' && styles.tabLabelActive]}>
            Personal
          </Text>
        </TouchableOpacity>

        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
              Settings
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tab content ── */}
      {activeTab === 'personal' ? (
        loading ? (
          <ActivityIndicator size="large" color="#1a8fa8" style={styles.spinner} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a8fa8" />
            }
          >
            <Text style={styles.sectionHeader}>Events</Text>
            {events.length === 0 ? (
              <Text style={styles.emptyText}>No events</Text>
            ) : (
              events.map(ev => (
                <EventItem key={ev.id} event={ev} navigation={navigation} />
              ))
            )}

            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Tasks</Text>
            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks</Text>
            ) : (
              tasks.map(tk => (
                <TaskItem key={tk.id} task={tk} />
              ))
            )}
          </ScrollView>
        )
      ) : (
        <SettingsTab member={member} user={user} family={family} fetchFamily={fetchFamily} />
      )}

    </SafeAreaView>
  );
}
