import React, { useState, useCallback } from 'react';
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
import API from '../api/axios';
import styles from '../styles/GroupsScreen.styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ─── Group detail view ────────────────────────────────────────────────────────

function GroupDetail({ group, onBack, navigation }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  React.useEffect(() => {
    API.get(`/groups/${group.id}/events`)
      .then(res => setEvents(res.data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group.id]);

  const handleCopy = () => {
    Clipboard.setString(group.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.flex}>
      {/* Back to group list */}
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color="#1a8fa8" />
        <Text style={styles.backRowText}>All Groups</Text>
      </TouchableOpacity>

      {/* Group hero */}
      <View style={styles.groupHero}>
        <View style={styles.groupHeroIcon}>
          <Text style={styles.groupHeroLetter}>{group.name[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupHeroName}>{group.name}</Text>
          <Text style={styles.groupHeroMeta}>
            {group.member_count} member{group.member_count !== '1' ? 's' : ''}
            {group.role === 'admin' ? '  ·  admin' : ''}
          </Text>
        </View>
      </View>

      {/* Invite code */}
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Invite code</Text>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteCode}>{group.invite_code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={copied ? '#34c759' : '#1a8fa8'} />
            <Text style={[styles.copyBtnText, copied && { color: '#34c759' }]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shared events */}
      <Text style={styles.sectionHeader}>Shared Events</Text>
      {loading ? (
        <ActivityIndicator color="#1a8fa8" style={{ marginTop: 20 }} />
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>No events shared with this group yet.</Text>
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
    </View>
  );
}

// ─── GroupsScreen ─────────────────────────────────────────────────────────────

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Create group
  const [showCreate, setShowCreate]   = useState(false);
  const [createName, setCreateName]   = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Join group
  const [showJoin, setShowJoin]       = useState(false);
  const [joinCode, setJoinCode]       = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

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

  React.useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      await API.post('/groups/create', { name: createName.trim() });
      setCreateName('');
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not create group');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    try {
      await API.post('/groups/join', { invite_code: joinCode.trim() });
      setJoinCode('');
      setShowJoin(false);
      fetchGroups();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid invite code');
    } finally {
      setJoinLoading(false);
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
        <Text style={styles.headerTitle}>Groups</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setShowJoin(true); setShowCreate(false); }}>
            <Ionicons name="enter-outline" size={22} color="#1a8fa8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setShowCreate(true); setShowJoin(false); }}>
            <Ionicons name="add" size={24} color="#1a8fa8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Create group inline form ── */}
      {showCreate && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.inlineInput}
            placeholder="Group name"
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
              : <Text style={styles.inlineBtnText}>Create</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setShowCreate(false)}>
            <Ionicons name="close" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Join group inline form ── */}
      {showJoin && (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.inlineInput}
            placeholder="Enter invite code"
            placeholderTextColor="#aaa"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.inlineBtn, joinLoading && { opacity: 0.6 }]}
            onPress={handleJoin}
            disabled={joinLoading}
          >
            {joinLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.inlineBtnText}>Join</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setShowJoin(false)}>
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
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Create a group or join one with an invite code.</Text>
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
                  {item.member_count} member{item.member_count !== '1' ? 's' : ''}
                  {item.role === 'admin' ? '  ·  admin' : ''}
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
