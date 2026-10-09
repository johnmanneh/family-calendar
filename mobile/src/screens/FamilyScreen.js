import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import API, { SERVER_URL } from '../api/axios';
import { useStyles } from '../styles/FamilyScreen.styles';

import TopCard from '../components/ui/TopCard';
// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SERVER_URL}${path}`;
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, isMe, navigation }) {
  const { t } = useTranslation();
  const styles   = useStyles();
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
          <Text style={styles.ownerBadgeText}>{t('common.owner')}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
    </TouchableOpacity>
  );
}

// ─── FamilyScreen ─────────────────────────────────────────────────────────────

export default function FamilyScreen({ navigation }) {
  const { t } = useTranslation();
  const styles = useStyles();
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
        t('family.cannot_leave_title'),
        t('family.cannot_leave_message'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    Alert.alert(
      t('family.leave_title'),
      t('family.leave_confirm', { name: family?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.leave'),
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await API.delete('/family/leave');
              await fetchFamily();
            } catch (err) {
              Alert.alert(t('common.error'), err.response?.data?.message || t('family.could_not_leave'));
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
      <TopCard>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </TopCard>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Family info card */}
        {family && (
          <>
            <Text style={styles.sectionHeader}>{t('family.your_family')}</Text>
            <View style={styles.card}>
              <Text style={styles.familyName}>{family.name}</Text>
              <Text style={styles.inviteLabel}>{t('family.invite_label')}</Text>
              <View style={styles.inviteRow}>
                <Text style={styles.inviteCode}>{family.invite_code}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                  <Ionicons
                    name={codeCopied ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={codeCopied ? '#34c759' : '#1a8fa8'}
                  />
                  <Text style={[styles.copyBtnText, codeCopied && { color: '#34c759' }]}>
                    {codeCopied ? t('common.copied') : t('common.copy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Members */}
        <Text style={styles.sectionHeader}>{t('family.members_count', { count: members.length })}</Text>
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

        {/* Danger zone — switching family takes you out of this one, so it lives here */}
        {family && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 32 }]}>{t('common.danger_zone')}</Text>
            <View style={styles.card}>
              <Text style={styles.leaveDescription}>
                {t('family.switch_hint', { name: family.name })}
              </Text>
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => navigation.navigate('JoinFamily')}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="#1a8fa8" />
                <Text style={styles.switchBtnText}>{t('family.switch_family')}</Text>
              </TouchableOpacity>

              {/* Leave family — only for non-owners */}
              {!isOwner && (
                <>
                  <View style={[styles.divider, { marginVertical: 14 }]} />
                  <Text style={styles.leaveDescription}>
                    {t('family.leave_description', { name: family.name })}
                  </Text>
                  <TouchableOpacity
                    style={[styles.leaveBtn, leaving && { opacity: 0.5 }]}
                    onPress={handleLeave}
                    disabled={leaving}
                  >
                    <Ionicons name="exit-outline" size={16} color="#ff3b30" />
                    <Text style={styles.leaveBtnText}>{t('family.leave_btn')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

