import React, { useEffect, useState } from 'react';
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
  Switch,
  Share,
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

function InviteQrImage({ value, size }) {
  try {
    const mod = require('react-native-qrcode-svg');
    const QRCode = mod.default || mod;
    return <QRCode value={value} size={size} />;
  } catch {
    return null;
  }
}
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
  const [photoFailed, setPhotoFailed] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.memberRow}
      onPress={() => navigation.navigate('MemberProfile', { memberId: member.id })}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      {photo && !photoFailed ? (
        <Image source={{ uri: photo }} style={styles.memberAvatar} onError={() => setPhotoFailed(true)} />
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
  const { family, families, members, fetchFamily, switchFamily, setAvailabilitySharing } = useFamily();
  const [sharingFamilyId, setSharingFamilyId] = useState(null);
  const changeAvailability = async (familyId, value) => {
    setSharingFamilyId(familyId);
    try {
      await setAvailabilitySharing(familyId, value);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || 'Could not save availability sharing. Please try again.');
    } finally {
      setSharingFamilyId(null);
    }
  };

  const [codeCopied, setCodeCopied] = useState(false);
  const [invite, setInvite] = useState(null);
  const [showLongCode, setShowLongCode] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [leaving,    setLeaving]    = useState(false);
  // Create a family (personal space) / rename it (admin)
  const [nameInput, setNameInput] = useState('');
  const [renaming,  setRenaming]  = useState(false);
  const [busy,      setBusy]      = useState(false);
  const [creating,  setCreating]  = useState(false);   // "Create a family" form when already in one
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
      setCreating(false);
      setNameInput('');
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setBusy(false);
    }
  };

  const myMembership = members.find(m => Number(m.id) === Number(user?.id));
  const isOwner = myMembership?.role === 'admin' || myMembership?.role === 'owner';

  useEffect(() => {
    if (!isOwner || personal || !family?.id) {
      setInvite(null);
      return;
    }
    let cancelled = false;
    API.get('/family/invite')
      .then((res) => { if (!cancelled) setInvite(res.data); })
      .catch(() => { if (!cancelled) setInvite(null); });
    return () => { cancelled = true; };
  }, [isOwner, personal, family?.id]);

  const handleCopyCode = () => {
    Clipboard.setString(invite?.short_code || invite?.invite_code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleShareInvite = async () => {
    if (!invite?.join_url) return;
    try {
      await Share.share({
        message: `${invite.join_url}\n${invite.short_code || ''}`,
        url: invite.join_url,
      });
    } catch (_) { /* cancelled */ }
  };

  const handleReplaceInvite = () => {
    Alert.alert(
      t('family.replace_invite'),
      t('family.replace_invite_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('family.replace_invite'),
          style: 'destructive',
          onPress: async () => {
            setReplacing(true);
            try {
              const res = await API.post('/family/invite/rotate');
              setInvite(res.data);
              setShowLongCode(false);
            } catch (err) {
              Alert.alert(t('common.error'), err.response?.data?.message || t('family.could_not_replace_invite'));
            } finally {
              setReplacing(false);
            }
          },
        },
      ]
    );
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
              {isOwner && invite && (
                <>
                  <Text style={styles.inviteLabel}>{t('family.scan_to_join', { name: family.name })}</Text>
                  {invite.join_url ? (
                    <View style={{ alignItems: 'center', marginVertical: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12 }}>
                      <InviteQrImage value={invite.join_url} size={180} />
                    </View>
                  ) : null}
                  <Text style={styles.inviteCode}>{t('family.invite_code_short', { code: invite.short_code })}</Text>
                  {showLongCode && invite.invite_code ? (
                    <Text style={styles.inviteCode}>{invite.invite_code}</Text>
                  ) : null}
                  <View style={styles.inviteRow}>
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
                    <TouchableOpacity style={styles.copyBtn} onPress={handleShareInvite}>
                      <Ionicons name="share-outline" size={16} color="#1a8fa8" />
                      <Text style={styles.copyBtnText}>{t('family.share_invite')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setShowLongCode(v => !v)}>
                    <Text style={styles.copyBtnText}>{showLongCode ? t('family.hide_code') : t('family.show_code')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleReplaceInvite} disabled={replacing}>
                    <Text style={styles.copyBtnText}>{replacing ? '…' : t('family.replace_invite')}</Text>
                  </TouchableOpacity>
                </>
              )}
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

        {/* My families — switch between them (leaving is in the danger zone below) */}
        {families.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 32 }]}>{t('family.my_families')}</Text>
            <Text style={[styles.leaveDescription, { marginBottom: 8 }]}>
              {t('availability.sharing_hint', { defaultValue: 'Optional: let current and future members of a family check your busy times from your other families, including future commitments. No event details or other people\'s calendars are shared. Off by default; turn it off at any time.' })}
            </Text>
            <View style={styles.card}>
              {families.map((f, i) => {
                const isActive = Number(f.id) === Number(family?.id);
                return (
                  <React.Fragment key={f.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                      <Text style={[styles.familyName, { flex: 1, fontSize: 17 }]}>{f.name}</Text>
                      {isActive ? (
                        <View style={{ backgroundColor: '#1a8fa8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{t('family.active')}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={async () => { await switchFamily(f.id); await fetchFamily(); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          hitSlop={8}
                        >
                          <Ionicons name="swap-horizontal-outline" size={16} color="#1a8fa8" />
                          <Text style={styles.switchBtnText}>{t('family.switch')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {!f.is_personal && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                        <Text style={[styles.leaveDescription, { flex: 1, marginBottom: 0 }]}>
                          {t('availability.share_with', { name: f.name, defaultValue: `Share my busy times with ${f.name}` })}
                        </Text>
                        <Switch
                          accessibilityLabel={`Share my busy times with ${f.name}`}
                          value={f.share_availability === true}
                          disabled={sharingFamilyId !== null}
                          onValueChange={value => changeAvailability(f.id, value)}
                          trackColor={{ true: '#1a8fa8' }}
                          thumbColor="#fff"
                        />
                      </View>
                    )}
                    {i < families.length - 1 && <View style={[styles.divider, { marginVertical: 6 }]} />}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        {/* Join or create another family */}
        <View style={[styles.card, { marginTop: 10 }]}>
          <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('JoinFamily')}>
            <Ionicons name="enter-outline" size={16} color="#1a8fa8" />
            <Text style={styles.switchBtnText}>{t('family.join_with_code')}</Text>
          </TouchableOpacity>

          {creating ? (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.leaveDescription, { marginBottom: 8 }]}>{t('family.create_hint')}</Text>
              <TextInput
                style={styles.nameInput}
                placeholder={t('family.name_placeholder')}
                placeholderTextColor="#aeaeb2"
                value={nameInput}
                onChangeText={setNameInput}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => saveName('create')}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }, !nameInput.trim() && { opacity: 0.5 }]}
                  disabled={!nameInput.trim() || busy}
                  onPress={() => saveName('create')}
                >
                  {busy ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.primaryBtnText}>{t('family.create')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchBtn, { flex: 1 }]}
                  onPress={() => { setCreating(false); setNameInput(''); }}
                >
                  <Text style={styles.switchBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.switchBtn, { marginTop: 10 }]} onPress={() => { setRenaming(false); setNameInput(''); setCreating(true); }}>
              <Ionicons name="people-outline" size={16} color="#1a8fa8" />
              <Text style={styles.switchBtnText}>{t('family.create')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danger zone — leaving a family, kept apart at the very bottom */}
        {families.some(f => !f.is_personal) && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 32 }]}>{t('common.danger_zone')}</Text>
            <View style={styles.card}>
              {families.filter(f => !f.is_personal).map((f, i, list) => {
                const isActive = Number(f.id) === Number(family?.id);
                const isFamilyOwner = isActive ? myMembership?.role === 'admin' : f.role === 'admin';
                return (
                  <React.Fragment key={f.id}>
                    <TouchableOpacity
                      style={[styles.leaveBtn, leaving && { opacity: 0.5 }]}
                      onPress={() => handleLeave(f, isFamilyOwner)}
                      disabled={leaving}
                    >
                      <Ionicons name="exit-outline" size={16} color="#ff3b30" />
                      <Text style={styles.leaveBtnText}>{t('family.leave_named', { name: f.name })}</Text>
                    </TouchableOpacity>
                    {i < list.length - 1 && <View style={{ height: 10 }} />}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        </>)}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

