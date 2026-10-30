import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import API, { SERVER_URL } from '../api/axios';
import TopCard from '../components/ui/TopCard';
import { useStyles } from '../styles/PickupPeopleScreen.styles';

// ── Helpers ────────────────────────────────────────────────────────────────────

function avatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SERVER_URL}${path}`;
}

// Returns the display name for a pickup person row
function displayName(person) {
  if (person.user_id) {
    return [person.member_first_name, person.member_last_name].filter(Boolean).join(' ');
  }
  return person.name || '?';
}

// ── PersonRow ─────────────────────────────────────────────────────────────────
// Renders one pickup person. When editingId matches this row the row switches
// to an inline edit form so the user can update name / phone without a modal.

function PersonRow({ person, editingId, editName, editPhone, onEditName, onEditPhone, onSaveEdit, onCancelEdit, onEdit, onRemove, styles, t }) {
  const isEditing = editingId === person.id;
  const isInApp   = !!person.user_id;
  const color     = person.member_color || '#1a8fa8';
  const photo     = avatarUrl(person.member_avatar_url);
  const initials  = isInApp
    ? ([person.member_first_name?.[0], person.member_last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?')
    : (displayName(person)[0] || '?').toUpperCase();
  const [photoFailed, setPhotoFailed] = React.useState(false);

  if (isEditing) {
    // ── Edit mode: replace the row with input fields ──────────────────────
    return (
      <View style={{ paddingVertical: 8 }}>
        {/* Name input — disabled for in-app members */}
        {!isInApp && (
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={onEditName}
            placeholder={t('pickup_people.name_placeholder')}
            placeholderTextColor="#aeaeb2"
            autoFocus
          />
        )}
        <TextInput
          style={styles.input}
          value={editPhone}
          onChangeText={onEditPhone}
          placeholder={t('pickup_people.phone_placeholder')}
          placeholderTextColor="#aeaeb2"
          keyboardType="phone-pad"
          autoFocus={isInApp}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.saveBtn, { flex: 1 }]}
            onPress={onSaveEdit}
          >
            <Text style={styles.saveBtnText}>{t('pickup_people.save')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#8e8e93' }]}
            onPress={onCancelEdit}
          >
            <Text style={[styles.saveBtnText, { color: '#8e8e93' }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Normal display mode ────────────────────────────────────────────────────
  return (
    <View style={styles.personRow}>
      {/* Avatar */}
      {photo && !photoFailed ? (
        <Image source={{ uri: photo }} style={styles.personAvatar} onError={() => setPhotoFailed(true)} />
      ) : (
        <View style={[styles.personAvatar, { backgroundColor: color }]}>
          <Text style={styles.personInitial}>{initials}</Text>
        </View>
      )}

      {/* Name + phone + badge */}
      <View style={styles.personBody}>
        <Text style={styles.personName}>{displayName(person)}</Text>
        {person.phone ? <Text style={styles.personPhone}>{person.phone}</Text> : null}
        {isInApp && (
          <View style={styles.familyBadge}>
            <Text style={styles.familyBadgeText}>{t('pickup_people.family_member_badge')}</Text>
          </View>
        )}
      </View>

      {/* Action icons */}
      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(person)} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color="#8e8e93" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => onRemove(person)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── PickupPeopleScreen ─────────────────────────────────────────────────────────

export default function PickupPeopleScreen({ navigation }) {
  const { t }      = useTranslation();
  const styles     = useStyles();
  const { user }   = useAuth();
  const { members } = useFamily();

  // ── State ──────────────────────────────────────────────────────────────────
  const [people,   setPeople]   = useState([]);
  const scrollRef = useRef(null);
  // After the keyboard opens, scroll so the add form (and its button) is visible
  const scrollToForm = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(false);

  // Add form
  const [showAdd,  setShowAdd]  = useState(false);
  const [addMode,  setAddMode]  = useState('family'); // 'family' | 'external'
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [addName,  setAddName]  = useState('');
  const [addPhone, setAddPhone] = useState('');

  // Inline edit
  const [editingId,   setEditingId]   = useState(null);
  const [editName,    setEditName]    = useState('');
  const [editPhone,   setEditPhone]   = useState('');

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await API.get('/family/pickup-people');
      setPeople(res.data.people || []);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // ── Derived ────────────────────────────────────────────────────────────────
  // Family members available to add: exclude managed children and already-added members
  const addedUserIds = new Set(people.filter(p => p.user_id).map(p => Number(p.user_id)));
  const pickableMembers = members.filter(m => !m.is_managed && !addedUserIds.has(Number(m.id)));

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setBusy(true);
    try {
      if (addMode === 'family') {
        if (!selectedMemberId) return;
        await API.post('/family/pickup-people', { user_id: selectedMemberId });
      } else {
        if (!addName.trim()) {
          Alert.alert(t('common.error'), t('pickup_people.name_placeholder'));
          return;
        }
        await API.post('/family/pickup-people', {
          name:  addName.trim(),
          phone: addPhone.trim() || null,
        });
      }
      // Reset form
      setShowAdd(false);
      setSelectedMemberId(null);
      setAddName('');
      setAddPhone('');
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setBusy(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (person) => {
    setEditingId(person.id);
    setEditName(person.name || '');
    setEditPhone(person.phone || '');
  };

  const handleSaveEdit = async () => {
    setBusy(true);
    try {
      const body = { phone: editPhone.trim() || null };
      // Only send name if it's an external person (no user_id)
      const person = people.find(p => p.id === editingId);
      if (person && !person.user_id) body.name = editName.trim();
      await API.patch(`/family/pickup-people/${editingId}`, body);
      setEditingId(null);
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEdit = () => setEditingId(null);

  // ── Remove ─────────────────────────────────────────────────────────────────
  const handleRemove = (person) => {
    const name = displayName(person);
    Alert.alert(
      t('pickup_people.remove_title'),
      t('pickup_people.remove_confirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text:  t('pickup_people.remove'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await API.delete(`/family/pickup-people/${person.id}`);
              await load();
            } catch (err) {
              Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <TopCard>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pickup_people.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </TopCard>

      {/* Keyboard pushes the form up so the field you type in stays visible */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >

        {/* ── People list ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>{t('pickup_people.title')}</Text>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color="#1a8fa8" style={{ paddingVertical: 16 }} />
          ) : people.length === 0 ? (
            <View style={{ paddingVertical: 8 }}>
              <Text style={styles.emptyText}>{t('pickup_people.empty')}</Text>
              <Text style={styles.emptyHint}>{t('pickup_people.empty_hint')}</Text>
            </View>
          ) : (
            people.map((person, i) => (
              <React.Fragment key={person.id}>
                <PersonRow
                  person={person}
                  editingId={editingId}
                  editName={editName}
                  editPhone={editPhone}
                  onEditName={setEditName}
                  onEditPhone={setEditPhone}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEdit={handleEdit}
                  onRemove={handleRemove}
                  styles={styles}
                  t={t}
                />
                {i < people.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))
          )}
        </View>

        {/* ── Add person card ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Tap header to expand / collapse the form */}
          <TouchableOpacity
            style={styles.addHeader}
            onPress={() => setShowAdd(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.addHeaderTitle}>{t('pickup_people.add_btn')}</Text>
            <Ionicons
              name={showAdd ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#1a8fa8"
            />
          </TouchableOpacity>

          {showAdd && (
            <View style={{ marginTop: 14 }}>

              {/* Tab: Family member | Someone else */}
              <View style={styles.addToggleRow}>
                <TouchableOpacity
                  style={[styles.addToggleBtn, addMode === 'family' && styles.addToggleBtnActive]}
                  onPress={() => setAddMode('family')}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={addMode === 'family' ? '#1a8fa8' : '#8e8e93'}
                  />
                  <Text style={[styles.addToggleBtnText, addMode === 'family' && styles.addToggleBtnTextActive]}>
                    {t('pickup_people.add_family_member')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addToggleBtn, addMode === 'external' && styles.addToggleBtnActive]}
                  onPress={() => setAddMode('external')}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={16}
                    color={addMode === 'external' ? '#1a8fa8' : '#8e8e93'}
                  />
                  <Text style={[styles.addToggleBtnText, addMode === 'external' && styles.addToggleBtnTextActive]}>
                    {t('pickup_people.add_external')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Family member picker ────────────────────────────────── */}
              {addMode === 'family' && (
                <>
                  {pickableMembers.length === 0 ? (
                    <Text style={[styles.emptyHint, { marginBottom: 10 }]}>
                      {t('pickup_people.empty_hint')}
                    </Text>
                  ) : (
                    pickableMembers.map((m, i) => {
                      const color    = m.color || '#1a8fa8';
                      const photo    = avatarUrl(m.avatar_url);
                      const initials = ([m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase()) || '?';
                      const name     = [m.first_name, m.last_name].filter(Boolean).join(' ');
                      const selected = Number(selectedMemberId) === Number(m.id);

                      return (
                        <React.Fragment key={m.id}>
                          <TouchableOpacity
                            style={styles.memberPickItem}
                            onPress={() => setSelectedMemberId(selected ? null : m.id)}
                            activeOpacity={0.7}
                          >
                            {photo ? (
                              <Image source={{ uri: photo }} style={styles.memberPickAvatar} />
                            ) : (
                              <View style={[styles.memberPickAvatar, { backgroundColor: color }]}>
                                <Text style={styles.memberPickInitial}>{initials}</Text>
                              </View>
                            )}
                            <Text style={styles.memberPickName}>{name}</Text>
                            <View style={styles.memberPickCheck}>
                              {selected && <Ionicons name="checkmark-circle" size={22} color="#1a8fa8" />}
                            </View>
                          </TouchableOpacity>
                          {i < pickableMembers.length - 1 && <View style={styles.divider} />}
                        </React.Fragment>
                      );
                    })
                  )}

                  <TouchableOpacity
                    style={[styles.saveBtn, (!selectedMemberId || busy) && styles.saveBtnDisabled, { marginTop: 12 }]}
                    onPress={handleAdd}
                    disabled={!selectedMemberId || busy}
                  >
                    {busy
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.saveBtnText}>{t('pickup_people.save')}</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

              {/* ── External person inputs ──────────────────────────────── */}
              {addMode === 'external' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder={t('pickup_people.name_placeholder')}
                    placeholderTextColor="#aeaeb2"
                    value={addName}
                    onChangeText={setAddName}
                    onFocus={scrollToForm}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t('pickup_people.phone_placeholder')}
                    placeholderTextColor="#aeaeb2"
                    value={addPhone}
                    onChangeText={setAddPhone}
                    keyboardType="phone-pad"
                    onFocus={scrollToForm}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, (!addName.trim() || busy) && styles.saveBtnDisabled]}
                    onPress={handleAdd}
                    disabled={!addName.trim() || busy}
                  >
                    {busy
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.saveBtnText}>{t('pickup_people.save')}</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
