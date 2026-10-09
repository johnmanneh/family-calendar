import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import API from '../api/axios';
import { useStyles } from '../styles/GroupsScreen.styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ─── Group detail view ────────────────────────────────────────────────────────

function MemberItem({ member, styles }) {
  const color    = member.color || '#1a8fa8';
  const initials = [member.first_name?.[0], member.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email;

  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: color }]}>
        <Text style={styles.memberAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{name}</Text>
        {member.email ? <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text> : null}
      </View>
      {member.role === 'admin' && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      )}
    </View>
  );
}

function GroupDetail({ group, onBack, navigation }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [events,  setEvents]  = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  const fetchGroupData = useCallback(() => {
    setLoading(true);
    Promise.all([
      API.get(`/groups/${group.id}/events`),
      API.get(`/groups/${group.id}/members`),
    ]).then(([evRes, memRes]) => {
      setEvents(evRes.data.events || []);
      setMembers(memRes.data.members || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [group.id]);

  useFocusEffect(useCallback(() => { fetchGroupData(); }, [fetchGroupData]));

  const [deleting, setDeleting] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(group.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    Alert.alert(
      t('groups.delete_group_title'),
      t('groups.delete_group_confirm', { name: group.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await API.delete(`/groups/${group.id}`);
              onBack();
            } catch (err) {
              Alert.alert(t('common.error'), err.response?.data?.message || t('groups.could_not_delete'));
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.flex}>
      {/* Back to group list */}
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color="#1a8fa8" />
        <Text style={styles.backRowText}>{t('groups.all_groups')}</Text>
      </TouchableOpacity>

      {/* Group hero */}
      <View style={styles.groupHero}>
        <View style={styles.groupHeroIcon}>
          <Text style={styles.groupHeroLetter}>{group.name[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupHeroName}>{group.name}</Text>
          <Text style={styles.groupHeroMeta}>
            {t('groups.members_count', { count: Number(group.member_count) })}
            {group.role === 'admin' ? `  ·  ${t('groups.admin')}` : ''}
          </Text>
        </View>
      </View>

      {/* Invite code */}
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>{t('groups.invite_label')}</Text>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteCode}>{group.invite_code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={copied ? '#34c759' : '#1a8fa8'} />
            <Text style={[styles.copyBtnText, copied && { color: '#34c759' }]}>
              {copied ? t('common.copied') : t('common.copy')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Members */}
      <Text style={styles.sectionHeader}>{t('family.members_count', { count: members.length })}</Text>
      {loading ? (
        <ActivityIndicator color="#1a8fa8" style={{ marginTop: 12 }} />
      ) : (
        <View style={styles.membersCard}>
          {members.map((m, i) => (
            <React.Fragment key={m.id}>
              <MemberItem member={m} styles={styles} />
              {i < members.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Shared events */}
      <Text style={[styles.sectionHeader, { marginTop: 16 }]}>{t('home.events')}</Text>
      {loading ? null : events.length === 0 ? (
        <Text style={styles.emptyText}>{t('groups.no_events')}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {events.map(ev => (
            <TouchableOpacity
              key={ev.id}
              style={styles.eventRow}
              onPress={() => navigation.navigate('EventDetails', { eventId: ev.id })}
              activeOpacity={0.75}
            >
              <View style={[styles.eventStripe, { backgroundColor: ev.color || '#1a8fa8' }]} />
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.eventMeta}>
                  {formatDate(ev.start_date)}
                  {ev.location ? `  ·  ${ev.location}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Delete group — admin only */}
      {group.role === 'admin' && (
        <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 32 }}>
          <Text style={styles.sectionHeader}>{t('common.danger_zone')}</Text>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={16} color="#ff3b30" />
            <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── GroupsScreen ─────────────────────────────────────────────────────────────

export default function GroupsScreen({ navigation }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [groups, setGroups]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Create group
  const [showCreate, setShowCreate]   = useState(false);
  const [createName, setCreateName]   = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await API.get('/groups');
      setGroups(res.data.groups || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch whenever the screen comes back into view (e.g. after joining with a code)
  useFocusEffect(useCallback(() => { fetchGroups(); }, [fetchGroups]));

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      await API.post('/groups/create', { name: createName.trim() });
      setCreateName('');
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('groups.could_not_create'));
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('groups.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setShowCreate(false); navigation.navigate('JoinFamily'); }}>
            <Ionicons name="enter-outline" size={22} color="#1a8fa8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={24} color="#1a8fa8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Create group inline form ── */}
      {showCreate && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.inlineInput}
            placeholder={t('groups.group_name_placeholder')}
            placeholderTextColor="#aaa"
            value={createName}
            onChangeText={setCreateName}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.inlineBtn, createLoading && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={createLoading}
          >
            {createLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.inlineBtnText}>{t('groups.create')}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setShowCreate(false)}>
            <Ionicons name="close" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Group detail or list ── */}
      {selectedGroup ? (
        <GroupDetail
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
          navigation={navigation}
        />
      ) : loading ? (
        <ActivityIndicator size="large" color="#1a8fa8" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => String(g.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(); }} tintColor="#1a8fa8" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>{t('groups.empty')}</Text>
              <Text style={styles.emptyText}>{t('groups.empty_hint')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => setSelectedGroup(item)}
              activeOpacity={0.75}
            >
              <View style={styles.groupIcon}>
                <Text style={styles.groupIconLetter}>{item.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMeta}>
                  {t('groups.members_count', { count: Number(item.member_count) })}
                  {item.role === 'admin' ? `  ·  ${t('groups.admin')}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#c7c7cc" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
