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
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API, { SERVER_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useStyles } from '../styles/MemberProfileScreen.styles';
import { useTranslation } from 'react-i18next';

// ─── Colour palette ───────────────────────────────────────────────────────────
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
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Build the full URL for an avatar stored as a relative path like /uploads/avatars/...
function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SERVER_URL}${path}`;
}

// ─── Avatar component ────────────────────────────────────────────────────────
// Shows photo if available, coloured initials otherwise.
// `editable` adds a camera-icon overlay (own profile in settings tab).

function Avatar({ member, size = 80, editable = false, onPress }) {
  const styles   = useStyles();
  const color    = member?.color || '#1a8fa8';
  const initials = [member?.first_name?.[0], member?.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  const photo    = avatarUrl(member?.avatar_url);

  return (
    <TouchableOpacity
      style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPress}
      disabled={!editable}
      activeOpacity={editable ? 0.75 : 1}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View style={[styles.avatarInitials, { backgroundColor: color, borderRadius: size / 2 }]}>
          <Text style={[styles.avatarText, { fontSize: size * 0.32 }]}>{initials}</Text>
        </View>
      )}
      {editable && (
        <View style={styles.avatarEditBadge}>
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Event row ───────────────────────────────────────────────────────────────

function EventItem({ event, navigation }) {
  const styles = useStyles();
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
          {formatDate(event.start_date)}{event.location ? `  ·  ${event.location}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  pending: '#f48c06', accepted: '#34c759',
  declined: '#ff3b30', countered: '#af52de',
};

function TaskItem({ task }) {
  const styles = useStyles();
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

function SettingsTab({ member, user, family, fetchFamily, onAvatarChange, navigation }) {
  const styles = useStyles();
  const { t }  = useTranslation();
  const { logout } = useAuth();

  // ── Colour ───────────────────────────────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState(member?.color || '#1a8fa8');
  const [colorSaving, setColorSaving]     = useState(false);
  const [colorExpanded, setColorExpanded] = useState(false);
  const visibleColors = colorExpanded ? MEMBER_COLORS : MEMBER_COLORS.slice(0, 7);

  // ── Profile fields ────────────────────────────────────────────────────────
  const [profileData, setProfileData]     = useState({
    first_name: '', last_name: '', age: '', address: '', occupation: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving]   = useState(false);
  const [profileError, setProfileError]     = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // ── Avatar upload state ───────────────────────────────────────────────────
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    API.get('/auth/me')
      .then(res => {
        const u = res.data.user;
        setProfileData({
          first_name: u.first_name  || '',
          last_name:  u.last_name   || '',
          age:        u.age         || '',
          address:    u.address     || '',
          occupation: u.occupation  || '',
        });
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // ── Colour save ──────────────────────────────────────────────────────────
  const handleColorPress = async (color) => {
    if (color === selectedColor || colorSaving) return;
    setSelectedColor(color);
    setColorSaving(true);
    try {
      await API.put('/family/member/color', { color });
      fetchFamily();
    } catch {
      setSelectedColor(member?.color || '#1a8fa8');
    } finally {
      setColorSaving(false);
    }
  };

  // ── Profile save ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      await API.put('/auth/profile', profileData);
      fetchFamily(); // refresh member list so name updates everywhere
      setProfileSuccess(t('common.saved'));
      setTimeout(() => setProfileSuccess(''), 2000);
    } catch (err) {
      setProfileError(err.response?.data?.message || t('profile.could_not_save'));
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Avatar pick + upload ──────────────────────────────────────────────────
  const pickAndUpload = async (source) => {
    let result;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('common.permission_needed'), t('profile.allow_camera')); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('common.permission_needed'), t('profile.allow_library')); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    }
    if (result.canceled) return;

    const asset = result.assets[0];
    const ext   = asset.uri.split('.').pop().toLowerCase();
    const form  = new FormData();
    form.append('avatar', { uri: asset.uri, name: `avatar.${ext}`, type: `image/${ext}` });

    setAvatarUploading(true);
    try {
      const res = await API.post('/auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAvatarChange(res.data.avatar_url);
      fetchFamily();
    } catch (err) {
      Alert.alert(t('common.error'), t('profile.could_not_upload'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('common.cancel'), t('profile.take_photo'), t('profile.choose_library')], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) pickAndUpload('camera');
          if (idx === 2) pickAndUpload('library');
        }
      );
    } else {
      Alert.alert(t('profile.change_photo_title'), '', [
        { text: t('profile.take_photo'),      onPress: () => pickAndUpload('camera') },
        { text: t('profile.choose_library'),  onPress: () => pickAndUpload('library') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  // ── Family code ──────────────────────────────────────────────────────────
  const [codeCopied, setCodeCopied] = useState(false);
  const handleCopyCode = () => {
    Clipboard.setString(family?.invite_code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Delete account ───────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.delete_account_title'),
      t('profile.delete_account_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            try { await API.delete('/auth/account'); logout(); }
            catch (err) { Alert.alert(t('common.error'), err.response?.data?.message || t('profile.could_not_delete_account')); }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      {/* ── Photo ── */}
      <Text style={styles.settingsSectionHeader}>{t('profile.photo')}</Text>
      <View style={[styles.settingsCard, { alignItems: 'center', paddingVertical: 20 }]}>
        {avatarUploading ? (
          <ActivityIndicator size="large" color="#1a8fa8" style={{ height: 80 }} />
        ) : (
          <Avatar member={member} size={80} editable onPress={handleAvatarPress} />
        )}
        <TouchableOpacity onPress={handleAvatarPress} style={{ marginTop: 10 }}>
          <Text style={{ color: '#1a8fa8', fontSize: 14, fontWeight: '500' }}>{t('profile.change_photo')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Family ── */}
      {family && (
        <>
          <Text style={styles.settingsSectionHeader}>{t('family.your_family')}</Text>
          <View style={styles.settingsCard}>
            <Text style={styles.familyName}>{family.name}</Text>
            <Text style={styles.familyLabel}>{t('profile.invite_label')}</Text>
            <View style={styles.inviteRow}>
              <Text style={styles.inviteCode}>{family.invite_code}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={16}
                  color={codeCopied ? '#34c759' : '#1a8fa8'} />
                <Text style={[styles.copyBtnText, codeCopied && { color: '#34c759' }]}>
                  {codeCopied ? t('common.copied') : t('common.copy')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* ── Colour picker ── */}
      <Text style={styles.settingsSectionHeader}>{t('profile.your_colour')}</Text>
      <View style={styles.settingsCard}>
        <View style={styles.colorGrid}>
          {visibleColors.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorSwatch, { backgroundColor: color },
                selectedColor === color && styles.colorSwatchSelected]}
              onPress={() => handleColorPress(color)}
              activeOpacity={0.8}
            >
              {selectedColor === color && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.colorToggleBtn} onPress={() => setColorExpanded(e => !e)}>
          <Text style={styles.colorToggleText}>
            {colorExpanded ? t('profile.show_less') : t('profile.show_more')}
          </Text>
          <Ionicons name={colorExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#1a8fa8" />
        </TouchableOpacity>
        {colorSaving && <Text style={styles.savingText}>{t('common.saving')}</Text>}
      </View>

      {/* ── App settings ── */}
      <Text style={styles.settingsSectionHeader}>{t('profile.settings')}</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
          onPress={() => navigation.navigate('Language')}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={20} color="#1a8fa8" style={{ marginRight: 12 }} />
          <Text style={{ flex: 1, fontSize: 15, color: '#1a8fa8', fontWeight: '500' }}>{t('settings.language')}</Text>
          <Ionicons name="chevron-forward" size={16} color="#aeaeb2" />
        </TouchableOpacity>
      </View>

      {/* ── Profile info ── */}
      <Text style={styles.settingsSectionHeader}>{t('profile.about_you')}</Text>
      <View style={styles.settingsCard}>
        {profileLoading ? <ActivityIndicator color="#1a8fa8" /> : (
          <>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.inputLabel}>{t('profile.first_name')}</Text>
                <TextInput
                  style={styles.settingsInput}
                  placeholder={t('profile.first_name')}
                  placeholderTextColor="#aaa"
                  value={profileData.first_name}
                  onChangeText={v => setProfileData(p => ({ ...p, first_name: v }))}
                />
              </View>
              <View style={styles.nameField}>
                <Text style={styles.inputLabel}>{t('profile.last_name')}</Text>
                <TextInput
                  style={styles.settingsInput}
                  placeholder={t('profile.last_name')}
                  placeholderTextColor="#aaa"
                  value={profileData.last_name}
                  onChangeText={v => setProfileData(p => ({ ...p, last_name: v }))}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>{t('profile.age')}</Text>
            <TextInput
              style={styles.settingsInput}
              placeholder={t('profile.age_placeholder')}
              placeholderTextColor="#aaa"
              value={profileData.age}
              onChangeText={v => setProfileData(p => ({ ...p, age: v }))}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>{t('profile.occupation')}</Text>
            <TextInput
              style={styles.settingsInput}
              placeholder={t('profile.occupation_placeholder')}
              placeholderTextColor="#aaa"
              value={profileData.occupation}
              onChangeText={v => setProfileData(p => ({ ...p, occupation: v }))}
            />

            <Text style={styles.inputLabel}>{t('profile.address')}</Text>
            <TextInput
              style={styles.settingsInput}
              placeholder={t('profile.address_placeholder')}
              placeholderTextColor="#aaa"
              value={profileData.address}
              onChangeText={v => setProfileData(p => ({ ...p, address: v }))}
            />

            {profileError   ? <Text style={styles.errorText}>{profileError}</Text>   : null}
            {profileSuccess ? <Text style={styles.successText}>{profileSuccess}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, profileSaving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Danger zone ── */}
      <Text style={[styles.settingsSectionHeader, { marginTop: 32 }]}>{t('common.danger_zone')}</Text>
      <View style={styles.settingsCard}>
        <Text style={styles.dangerDescription}>{t('profile.delete_account_description')}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={16} color="#ff3b30" />
          <Text style={styles.deleteBtnText}>{t('profile.delete_account_btn')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Admin circle control ─────────────────────────────────────────────────────
// Shown at the bottom of the Personal tab when an admin views another member.
// Three options: inner / extended / outer — matches web's 3-way circle picker.

const CIRCLE_OPTIONS = [
  { value: 'inner',    labelKey: 'profile.inner',    descKey: 'profile.inner_desc' },
  { value: 'extended', labelKey: 'profile.extended', descKey: 'profile.extended_desc' },
  { value: 'outer',    labelKey: 'profile.outer',    descKey: 'profile.outer_desc' },
];

function AdminCircleControl({ memberId, currentCircle, fetchFamily }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [saving, setSaving]   = useState(false);
  const [selected, setSelected] = useState(currentCircle || 'inner');

  const handleChange = async (value) => {
    if (value === selected || saving) return;
    setSaving(true);
    const prev = selected;
    setSelected(value); // optimistic
    try {
      await API.put('/family/member/circle', { user_id: memberId, circle_type: value });
      fetchFamily();
    } catch (err) {
      setSelected(prev); // rollback
      Alert.alert(t('common.error'), err.response?.data?.message || t('profile.could_not_update_circle'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: 32 }}>
      <Text style={styles.sectionHeader}>{t('profile.circle_type')}</Text>
      <View style={styles.settingsCard}>
        {CIRCLE_OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.circleRow,
              i < CIRCLE_OPTIONS.length - 1 && styles.circleRowBorder,
              selected === opt.value && styles.circleRowSelected,
            ]}
            onPress={() => handleChange(opt.value)}
            activeOpacity={0.7}
          >
            <View style={styles.circleRadio}>
              {selected === opt.value && <View style={styles.circleRadioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.circleLabel}>{t(opt.labelKey)}</Text>
              <Text style={styles.circleDescription}>{t(opt.descKey)}</Text>
            </View>
            {saving && selected === opt.value && (
              <ActivityIndicator size="small" color="#1a8fa8" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── MemberProfileScreen ─────────────────────────────────────────────────────

export default function MemberProfileScreen({ route, navigation }) {
  const styles = useStyles();
  const { t }  = useTranslation();
  const { memberId } = route.params;
  const { user } = useAuth();
  const { family, members, fetchFamily } = useFamily();

  const member      = members.find(m => Number(m.id) === Number(memberId));
  const isOwnProfile = Number(user?.id) === Number(memberId);

  // Current user's membership info — used to determine admin status
  const myMembership = members.find(m => Number(m.id) === Number(user?.id));
  const isAdmin = myMembership?.role === 'admin';

  const memberColor = member?.color || '#1a8fa8';
  const displayName = member
    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
    : 'Member';

  // Local avatar_url so it updates immediately after upload without waiting for FamilyContext refresh
  const [localAvatarUrl, setLocalAvatarUrl] = useState(member?.avatar_url || null);
  useEffect(() => { setLocalAvatarUrl(member?.avatar_url || null); }, [member?.avatar_url]);

  const displayMember = { ...member, avatar_url: localAvatarUrl };

  // ── Tabs ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('personal');

  // ── Personal tab data ────────────────────────────────────────────────────
  const [events,    setEvents]    = useState([]);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [evRes, tkRes] = await Promise.all([
        API.get(`/family/members/${memberId}/events`),
        API.get(`/family/members/${memberId}/tasks`),
      ]);
      setEvents(evRes.data.events || []);
      setTasks(tkRes.data.tasks   || []);
    } catch (err) {
      console.error('MemberProfile fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Profile card ── */}
      <View style={styles.profileCard}>
        <Avatar member={displayMember} size={80} />
        <Text style={styles.memberName}>{displayName}</Text>
        {member?.relationship ? <Text style={styles.memberRelationship}>{member.relationship}</Text> : null}
        {member?.email        ? <Text style={styles.memberEmail}>{member.email}</Text>               : null}
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.tabActive]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabLabel, activeTab === 'personal' && styles.tabLabelActive]}>{t('profile.personal')}</Text>
        </TouchableOpacity>
        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>{t('profile.settings')}</Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a8fa8" />}
          >
            <Text style={styles.sectionHeader}>{t('home.events')}</Text>
            {events.length === 0
              ? <Text style={styles.emptyText}>{t('common.no_events')}</Text>
              : events.map(ev => <EventItem key={ev.id} event={ev} navigation={navigation} />)
            }
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('home.tasks')}</Text>
            {tasks.length === 0
              ? <Text style={styles.emptyText}>{t('common.no_tasks')}</Text>
              : tasks.map(tk => <TaskItem key={tk.id} task={tk} />)
            }

            {/* Circle control — admin only, other member's profile only */}
            {isAdmin && !isOwnProfile && (
              <AdminCircleControl
                memberId={memberId}
                currentCircle={member?.circle_type}
                fetchFamily={fetchFamily}
              />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )
      ) : (
        <SettingsTab
          member={displayMember}
          user={user}
          family={family}
          fetchFamily={fetchFamily}
          onAvatarChange={setLocalAvatarUrl}
          navigation={navigation}
        />
      )}

    </SafeAreaView>
  );
}
