import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Clipboard,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import API, { SERVER_URL } from '../api/axios';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SERVER_URL}${path}`;
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, isMe, navigation }) {
  const color    = member.color || '#1a8fa8';
  const photo    = avatarUrl(member.avatar_url);
  const initials = [member.first_name?.[0], member.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email;

  return (
    <TouchableOpacity
      style={styles.memberRow}
      onPress={() => navigation.navigate('MemberProfile', { memberId: member.id })}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      {photo ? (
        <Image source={{ uri: photo }} style={styles.memberAvatar} />
      ) : (
        <View style={[styles.memberAvatar, styles.memberAvatarInitials, { backgroundColor: color }]}>
          <Text style={styles.memberAvatarText}>{initials}</Text>
        </View>
      )}

      {/* Name + email */}
      <View style={styles.memberBody}>
        <Text style={styles.memberName}>
          {name}{isMe ? '  (You)' : ''}
        </Text>
        {member.email ? (
          <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
        ) : null}
      </View>

      {/* Role badge */}
      {member.role === 'admin' && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerBadgeText}>Owner</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
    </TouchableOpacity>
  );
}

// ─── FamilyScreen ─────────────────────────────────────────────────────────────

export default function FamilyScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { family, members, fetchFamily } = useFamily();

  const [codeCopied, setCodeCopied] = useState(false);
  const [leaving,    setLeaving]    = useState(false);

  const myMembership = members.find(m => Number(m.id) === Number(user?.id));
  const isOwner = myMembership?.role === 'admin';

  const handleCopyCode = () => {
    Clipboard.setString(family?.invite_code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleLeave = () => {
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'You are the family owner. You cannot leave your own family.',
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert(
      'Leave Family',
      `Leave ${family?.name}? You will lose access to all shared events and tasks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await API.delete('/family/leave');
              await fetchFamily();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Could not leave family');
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Family info card */}
        {family && (
          <>
            <Text style={styles.sectionHeader}>Your Family</Text>
            <View style={styles.card}>
              <Text style={styles.familyName}>{family.name}</Text>
              <Text style={styles.inviteLabel}>Invite code — share so others can join</Text>
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

        {/* Members */}
        <Text style={styles.sectionHeader}>Members ({members.length})</Text>
        <View style={styles.card}>
          {members.map((m, i) => (
            <React.Fragment key={m.id}>
              <MemberRow
                member={m}
                isMe={Number(m.id) === Number(user?.id)}
                navigation={navigation}
              />
              {i < members.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Leave family — only shown for non-owners */}
        {!isOwner && family && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 32 }]}>Danger zone</Text>
            <View style={styles.card}>
              <Text style={styles.leaveDescription}>
                You will lose access to all shared events and tasks in {family.name}.
              </Text>
              <TouchableOpacity
                style={[styles.leaveBtn, leaving && { opacity: 0.5 }]}
                onPress={handleLeave}
                disabled={leaving}
              >
                <Ionicons name="exit-outline" size={16} color="#ff3b30" />
                <Text style={styles.leaveBtnText}>Leave family</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backBtn: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  headerSpacer: {
    width: 40,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // Family info
  familyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  inviteLabel: {
    fontSize: 12,
    color: '#aeaeb2',
    marginBottom: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  inviteCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a8fa8',
  },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  memberAvatarInitials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberBody: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  memberEmail: {
    fontSize: 12,
    color: '#aeaeb2',
    marginTop: 1,
  },
  ownerBadge: {
    backgroundColor: '#e8f6f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  ownerBadgeText: {
    fontSize: 11,
    color: '#1a8fa8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f2f2f7',
    marginVertical: 2,
  },

  // Leave family
  leaveDescription: {
    fontSize: 13,
    color: '#6e6e73',
    marginBottom: 14,
    lineHeight: 18,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
  },
  leaveBtnText: {
    color: '#ff3b30',
    fontSize: 15,
    fontWeight: '600',
  },
});
