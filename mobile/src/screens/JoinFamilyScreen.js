import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import API from '../api/axios';
import { useFamily } from '../context/FamilyContext';
import { useThemeColors } from '../theme';
import { tokenFromInviteUrl } from '../utils/tokenFromInviteUrl';
import storage from '../utils/storage';
import { hasExpoCamera, loadExpoCamera } from '../utils/expoCameraSafe';

export default function JoinFamilyScreen({ navigation, route }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { fetchFamily } = useFamily();
  const cameraMod = hasExpoCamera() ? loadExpoCamera() : null;
  const CameraView = cameraMod?.CameraView;
  const Camera = cameraMod?.Camera;

  const [code, setCode]       = useState(route?.params?.code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [scanning, setScanning] = useState(false);
  // Ref, not state: onBarcodeScanned fires per frame, so a state lock can let
  // several frames through before the re-render commits.
  const scannedLock = useRef(false);

  useEffect(() => {
    if (route?.params?.code) setCode(route.params.code);
  }, [route?.params?.code]);

  useEffect(() => {
    storage.getItem('pendingJoin').then((pending) => {
      if (pending) {
        setCode(pending);
        storage.deleteItem('pendingJoin');
      }
    }).catch(() => {});
  }, []);

  const joinWith = async (raw) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) { setError(t('join.enter_code')); return; }
    setError('');
    setLoading(true);
    try {
      let familyName;
      try {
        const preview = await API.get(`/public/join/${encodeURIComponent(trimmed)}`);
        familyName = preview.data?.family?.name;
      } catch {
        familyName = null;
      }

      if (familyName) {
        const confirmed = await new Promise((resolve) => {
          Alert.alert(
            t('join.title'),
            t('join.confirm_family', { name: familyName }),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('join.button'), onPress: () => resolve(true) },
            ]
          );
        });
        if (!confirmed) return;
      }

      const res = await API.post('/join', { code: trimmed });
      const data = res.data || {};

      if (data.type === 'group' || data.group) {
        Alert.alert(t('join.title'), t('join.joined_group', { name: data.group?.name || '' }));
        navigation.navigate('Groups');
        return;
      }

      await fetchFamily();
      Alert.alert(t('join.title'), t('join.joined_family', { name: data.family?.name || familyName || '' }));
      navigation.popToTop();
    } catch (err) {
      const body = err.response?.data;
      const status = err.response?.status;
      setError(body?.message || (status ? `${t('common.error')} (${status})` : t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const applyScanned = (payload) => {
    const token = tokenFromInviteUrl(payload);
    if (!token) {
      scannedLock.current = false;
      Alert.alert(t('join.title'), t('join.invalid_qr'));
      return;
    }
    setScanning(false);
    setCode(token);
    joinWith(token);
  };

  const needNativeBuild = () => {
    Alert.alert(t('join.title'), t('join.need_native_build'));
  };

  const openCamera = async () => {
    if (!CameraView || !Camera) {
      needNativeBuild();
      return;
    }
    const perm = await Camera.requestCameraPermissionsAsync();
    if (!perm?.granted) {
      Alert.alert(t('common.permission_needed'), t('join.allow_camera'));
      return;
    }
    scannedLock.current = false;
    setScanning(true);
  };

  const scanFromImage = async () => {
    if (!Camera?.scanFromURLAsync) {
      needNativeBuild();
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.permission_needed'), t('join.allow_photos'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled) return;
    try {
      const hits = await Camera.scanFromURLAsync(res.assets[0].uri, ['qr']);
      const data = hits?.[0]?.data;
      if (!data) {
        Alert.alert(t('join.title'), t('join.no_qr_in_image'));
        return;
      }
      applyScanned(data);
    } catch {
      Alert.alert(t('join.title'), t('join.no_qr_in_image'));
    }
  };

  if (scanning) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setScanning(false)}>
            <Ionicons name="chevron-back" size={22} color="#1a8fa8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('join.scan_qr')}</Text>
          <View style={{ width: 60 }} />
        </View>
        {CameraView ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (scannedLock.current) return;
              scannedLock.current = true;
              applyScanned(data);
            }}
          />
        ) : (
          <View style={styles.body}>
            <Text style={styles.error}>{t('join.need_native_build')}</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#1a8fa8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('join.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>{t('join.label')}</Text>

        <TextInput
          style={styles.input}
          placeholder="K7QM-4XPR-9TWD"
          placeholderTextColor={c.textMuted}
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={() => joinWith(code)}
          returnKeyType="go"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={() => joinWith(code)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{t('join.button')}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={openCamera} disabled={loading}>
          <Ionicons name="qr-code-outline" size={18} color="#1a8fa8" />
          <Text style={styles.secondaryText}>{t('join.scan_qr')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={scanFromImage} disabled={loading}>
          <Ionicons name="image-outline" size={18} color="#1a8fa8" />
          <Text style={styles.secondaryText}>{t('join.from_image')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = c => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text },

  body: { padding: 24 },

  label: { fontSize: 14, color: c.textSub, fontWeight: '500', marginBottom: 10, textAlign: 'center' },
  input: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: 2,
    borderWidth: 1, borderColor: c.border,
    textAlign: 'center', marginBottom: 12,
  },
  error: { color: '#ff3b30', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#1a8fa8', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, padding: 12,
  },
  secondaryText: { color: '#1a8fa8', fontSize: 15, fontWeight: '600' },
});
