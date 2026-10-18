import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Clipboard,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RollInGroup } from '../components/RollIn';
import AddChildSection from '../components/family/AddChildSection';
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
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || '?';

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

      {/* Name */}
      <View style={styles.memberBody}>
        <Text style={styles.memberName}>
          {name}{isMe ? '  (You)' : ''}
        </Text>
        {member.is_managed ? <Text style={{ fontSize: 11, color: '#f48c06', fontWeight: '700', marginTop: 2 }}>{t('child.badge')}</Text> : null}
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
  const { family, families, members, fetchFamily, switchFamily } = useFamily();

  const [codeCopied, setCodeCopied] = useState(false);
  const [leaving,    setLeaving]    = useState(false);
  // Create a family (personal space) / rename it (admin)
  const [nameInput, setNameInput] = useState('');
  const [renaming,  setRenaming]  = useState(false);
  const [busy,      setBusy]      = useState(false);
  const personal = !!family?.is_personal;

  const saveName = async (kind) => {
    const name = nameInput.trim();
    if (!name) return;
    setBusy(true);
    try {
      if (kind === 'create') await API.post('/family/create', { name });
      else await API.put('/family/name', { name });
      await fetchFamily();
      setRenaming(false);
      setNameInput('');
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setBusy(false);
    }
  };

  const myMembership = members.find(m => Number(m.id) === Number(user?.id));
  const isOwner = myMembership?.role === 'admin';

  const handleCopyCode = () => {
    Clipboard.setString(family?.invite_code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleLeave = (targetFamily, targetIsOwner) => {
    if (targetIsOwner) {
      Alert.alert(
        t('family.cannot_leave_title'),
        t('family.cannot_leave_message'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    Alert.alert(
      t('family.leave_title'),
      t('family.leave_confirm', { name: targetFamily?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.leave'),
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await API.delete('/family/leave', { data: { family_id: targetFamily.id } });
              await fetchFamily();
            } catch (err) {
              Alert.alert(t('common.error'), err.response?.data?.message || t('family.could_not_leave'));
            } finally {
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
            <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('family.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </TopCard>

      <ScrollView contentContainerStyle={styles.content}>

        {/* On your own: create a family or join one */}
        {personal && (
          <>
            <Text style={styles.sectionHeader}>{t('family.title')}</Text>
            <View style={styles.card}>
              <Text style={styles.familyName}>{t('family.personal_title')}</Text>
              <Text style={styles.leaveDescription}>{t('family.personal_hint')}</Text>
              <TextInput
                style={styles.nameInput}
                placeholder={t('family.name_placeholder')}
                placeholderTextColor="#aeaeb2"
                value={nameInput}
                onChangeText={setNameInput}
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={() => saveName('create')}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, !nameInput.trim() && { opacity: 0.5 }]}
                disabled={!nameInput.trim() || busy}
                onPress={() => saveName('create')}
              >
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="people-outline" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>{t('family.create')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.switchBtn, { marginTop: 10 }]} onPress={() => navigation.navigate('JoinFamily')}>
                <Ionicons name="enter-outline" size={16} color="#1a8fa8" />
                <Text style={styles.switchBtnText}>{t('family.join_with_code')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Family info card */}
        {family && !personal && (
          <>
            <Text style={styles.sectionHeader}>{t('family.your_family')}</Text>
            <View style={styles.card}>
              {renaming ? (
                <View style={styles.renameRow}>
                  <TextInput
                    style={[styles.nameInput, { flex: 1, marginBottom: 0 }]}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    maxLength={60}
                    onSubmitEditing={() => saveName('rename')}
                  />
                  <TouchableOpacity style={styles.renameSave} onPress={() => saveName('rename')} disabled={busy}>
                    <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setRenaming(false); setNameInput(''); }}>
                    <Ionicons name="close" size={20} color="#8e8e93" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.renameRow}>
                  <Text style={[styles.familyName, { flex: 1 }]}>{family.name}</Text>
                  {isOwner && (
                    <TouchableOpacity onPress={() => { setNameInput(family.name); setRenaming(true); }} hitSlop={10}>
                      <Ionicons name="create-outline" size={20} color="#8e8e93" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
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

        {!personal && (<>
        {/* Members */}
        <Text style={styles.sectionHeader}>{t('family.members_count', { count: members.length })}</Text>
        <View style={styles.card}>
          <RollInGroup>
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
          </RollInGroup>
        </View>

        {/* Children without their own login */}
        <AddChildSection onAdded={fetchFamily} />

        {/* Pickup people */}
        <Text style={styles.sectionHeader}>{t('pickup_people.title')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.memberRow}
            onPress={() => navigation.navigate('PickupPeople')}
            activeOpacity={0.7}
          >
            <View style={[styles.memberAvatar, styles.memberAvatarInitials, { backgroundColor: '#1a8fa8' }]}>
              <Text style={styles.memberAvatarText}>P</Text>
            </View>
            <View style={styles.memberBody}>
              <Text style={styles.memberName}>{t('pickup_people.title')}</Text>
              <Text style={styles.memberEmail}>{t('pickup_people.subtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
          </TouchableOpacity>
        </View>

        {/* My Families — all families the user belongs to */}
        {families.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 32 }]}>My Families</Text>
            {families.map(f => {
              const isActive = Number(f.id) === Number(family?.id);
              const memberInFamily = members.find(m => Number(m.id) === Number(user?.id));
              const isFamilyOwner = isActive
                ? myMembership?.role === 'admin'
                : f.role === 'admin';

              return (
                <View key={f.id} style={[styles.card, { marginBottom: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.familyName, { flex: 1 }]}>{f.name}</Text>
                    {isActive && (
                      <View style={{ backgroundColor: '#1a8fa8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Active</Text>
                      </View>
                    )}
                  </View>

                  {!isActive && (
                    <TouchableOpacity
                      style={styles.switchBtn}
                      onPress={async () => { await switchFamily(f.id); await fetchFamily(); }}
                    >
                      <Ionicons name="swap-horizontal-outline" size={16} color="#1a8fa8" />
                      <Text style={styles.switchBtnText}>Switch to {f.name}</Text>
                    </TouchableOpacity>
                  )}

                  {!f.is_personal && (
                    <>
                      {!isActive && <View style={[styles.divider, { marginVertical: 10 }]} />}
                      <TouchableOpacity
                        style={[styles.leaveBtn, leaving && { opacity: 0.5 }]}
                        onPress={() => handleLeave(f, isFamilyOwner)}
                        disabled={leaving}
                      >
                        <Ionicons name="exit-outline" size={16} color="#ff3b30" />
                        <Text style={styles.leaveBtnText}>Leave {f.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Join or create another family */}
        <View style={[styles.card, { marginTop: 10 }]}>
          <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('JoinFamily')}>
            <Ionicons name="enter-outline" size={16} color="#1a8fa8" />
            <Text style={styles.switchBtnText}>{t('family.join_with_code')}</Text>
          </TouchableOpacity>
        </View>

        </>)}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

