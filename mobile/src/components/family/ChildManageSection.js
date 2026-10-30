import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, ActionSheetIOS, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import API from '../../api/axios';
import { useFamilyStyles, CHILD_COLORS } from './familyStyles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SPRING_BUTTON } from '../icons/scanColors';

// Manage a child profile (no login): photo, name, colour, remove
export default function ChildManageSection({ child, onSaved, onRemoved, onScan }) {
  const { t } = useTranslation();
  const s = useFamilyStyles();
  const [first, setFirst] = useState(child.first_name || '');
  const [last, setLast] = useState(child.last_name || '');
  const [color, setColor] = useState(child.color || '#f48c06');
  const [msg, setMsg] = useState('');
  const [photo, setPhoto] = useState(child.avatar_url || null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Photo: camera or library → upload straight away ──
  const pickAndUpload = async (source) => {
    let result;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('common.permission_needed'), t('profile.allow_camera')); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('common.permission_needed'), t('profile.allow_library')); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    }
    if (result.canceled) return;

    const asset = result.assets[0];
    let ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    if (ext === 'jpg') ext = 'jpeg'; // server accepts image/jpeg, not image/jpg
    const form = new FormData();
    form.append('avatar', { uri: asset.uri, name: `avatar.${ext}`, type: asset.mimeType || `image/${ext}` });

    const before = photo;
    setPhoto(asset.uri);
    setUploading(true);
    try {
      const res = await API.post(`/family/children/${child.id}/avatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhoto(res.data.avatar_url || asset.uri);
      onSaved?.();
    } catch (err) {
      setPhoto(before);
      Alert.alert(t('common.error'), err.response?.data?.message || t('profile.could_not_upload'));
    } finally {
      setUploading(false);
    }
  };

  const choosePhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t('common.cancel'), t('profile.take_photo'), t('profile.choose_library')], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickAndUpload('camera'); if (idx === 2) pickAndUpload('library'); }
      );
    } else {
      Alert.alert(t('profile.change_photo_title'), '', [
        { text: t('profile.take_photo'), onPress: () => pickAndUpload('camera') },
        { text: t('profile.choose_library'), onPress: () => pickAndUpload('library') },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const initials = [first?.[0], last?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const save = async () => {
    if (!first.trim()) return;
    try {
      await API.put(`/family/children/${child.id}`, { first_name: first, last_name: last, color });
      setMsg(t('common.saved'));
      onSaved?.();
    } catch (err) {
      setMsg(err.response?.data?.message || t('common.something_went_wrong'));
    }
  };

  const remove = () => {
    Alert.alert(
      t('child.remove_title', { name: child.first_name }),
      t('child.remove_confirm', { name: child.first_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('child.remove'), style: 'destructive',
          onPress: async () => {
            try { await API.delete(`/family/children/${child.id}`); onRemoved?.(); }
            catch (err) { Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong')); }
          },
        },
      ]
    );
  };

  return (
    <>
      {onScan ? (
        <TouchableOpacity style={[s.primary, { backgroundColor: SPRING_BUTTON, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={onScan}>
          <MaterialCommunityIcons name="line-scan" size={20} color="#fff" />
          <Text style={s.primaryText}>{t('scan.scan_for', { name: child.first_name })}</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={s.header}>{t('child.photo')}</Text>
      <View style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={choosePhoto} disabled={uploading} activeOpacity={0.8}>
          {photo && !photoFailed ? (
            <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 32 }} onError={() => setPhotoFailed(true)} />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{initials}</Text>
            </View>
          )}
          {uploading ? (
            <View style={{ position: 'absolute', top: 0, left: 0, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity onPress={choosePhoto} disabled={uploading} style={{ marginLeft: 16, flex: 1 }}>
          <Text style={{ color: '#1a8fa8', fontSize: 15, fontWeight: '600' }}>
            {uploading ? t('child.uploading') : photo ? t('child.change_photo') : t('child.choose_photo')}
          </Text>
          <Text style={[s.hint, { marginTop: 4, marginBottom: 0 }]}>{t('child.photo_hint', { name: child.first_name })}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.header}>{t('child.profile')}</Text>
      <View style={s.card}>
        <Text style={s.hint}>{t('child.managed_hint', { name: child.first_name })}</Text>
        <TextInput style={s.input} value={first} onChangeText={setFirst} placeholder={t('child.first_name')} placeholderTextColor="#aeaeb2" maxLength={100} />
        <TextInput style={s.input} value={last} onChangeText={setLast} placeholder={t('child.last_name')} placeholderTextColor="#aeaeb2" maxLength={100} />
        <View style={s.colors}>
          {CHILD_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[s.dot, { backgroundColor: c }, color === c && s.dotOn]} />
          ))}
        </View>
        {msg ? <Text style={[s.msg, { color: msg === t('common.saved') ? '#34c759' : '#ff3b30' }]}>{msg}</Text> : null}
        <TouchableOpacity style={s.primary} onPress={save}>
          <Text style={s.primaryText}>{t('common.save')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.danger, { marginTop: 12 }]} onPress={remove}>
          <Text style={s.dangerText}>{t('child.remove_profile')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
