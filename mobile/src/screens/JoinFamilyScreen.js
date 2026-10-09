import React, { useMemo, useState } from 'react';
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
import API from '../api/axios';
import { useFamily } from '../context/FamilyContext';
import { useThemeColors } from '../theme';

// One Join box for families AND groups.
// The server (POST /join) works out which one the code belongs to, so users never
// have to guess whether they were given a "family code" or a "group code".
export default function JoinFamilyScreen({ navigation }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { fetchFamily } = useFamily();

  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const join = async (leaveCurrent = false) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError(t('join.enter_code')); return; }
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/join', { code: trimmed, leave_current: leaveCurrent });
      const data = res.data || {};

      if (data.type === 'group' || data.group) {
        Alert.alert(t('join.title'), t('join.joined_group', { name: data.group?.name || '' }));
        navigation.navigate('Groups');
        return;
      }

      // Family: the home screen, chat and members all depend on it — reload everything
      await fetchFamily();
      Alert.alert(t('join.title'), t('join.joined_family', { name: data.family?.name || '' }));
      navigation.popToTop();
    } catch (err) {
      const body = err.response?.data;
      if (err.response?.status === 409 && body?.code === 'IN_OTHER_FAMILY') {
        // Already in a family with other people → ask before moving them out
        Alert.alert(
          t('join.switch_title'),
          `${body.message}\n\n${t('join.stay_connected_hint')}`,
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('join.leave_and_join'), style: 'destructive', onPress: () => join(true) },
          ]
        );
        return;
      }
      // Show the HTTP status when the server sends no message (e.g. 404 = endpoint not deployed yet)
      const status = err.response?.status;
      setError(body?.message || (status ? `${t('common.error')} (${status})` : t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
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
          placeholder="A3F2B1C4"
          placeholderTextColor={c.textMuted}
          value={code}
          onChangeText={v => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={() => join(false)}
          returnKeyType="go"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={() => join(false)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{t('join.button')}</Text>
          }
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
    fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: 4,
    borderWidth: 1, borderColor: c.border,
    textAlign: 'center', marginBottom: 12,
  },
  error: { color: '#ff3b30', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#1a8fa8', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
