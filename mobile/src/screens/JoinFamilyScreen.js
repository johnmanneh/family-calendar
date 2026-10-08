import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useFamily } from '../context/FamilyContext';

export default function JoinFamilyScreen({ navigation }) {
  const { fetchFamily } = useFamily();
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter an invite code'); return; }
    setError('');
    setLoading(true);
    try {
      await API.post('/family/join', { invite_code: trimmed });
      await fetchFamily();
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
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
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Family</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Enter the family invite code</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 21118AE1"
          placeholderTextColor="#aaa"
          value={code}
          onChangeText={t => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleJoin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Join Family</Text>
          }
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e5ea',
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  backBtnText: { color: '#1a8fa8', fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1d1d1f' },

  body: { padding: 24 },

  label: {
    fontSize: 14, color: '#555', fontWeight: '500', marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 22, fontWeight: '700', color: '#1d1d1f', letterSpacing: 4,
    borderWidth: 1, borderColor: '#e5e5ea',
    textAlign: 'center', marginBottom: 12,
  },
  error: {
    color: '#ff3b30', fontSize: 13, textAlign: 'center', marginBottom: 12,
  },
  btn: {
    backgroundColor: '#1a8fa8', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
