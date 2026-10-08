import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

export default function ResetPasswordScreen({ route, navigation }) {
  // Token can come from deep-link params or manual entry
  const [token, setToken]         = useState(route.params?.token || '');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async () => {
    if (!token.trim())            { setError('Please enter the reset token from your email'); return; }
    if (password.length < 6)      { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm)     { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token: token.trim(), password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
          </TouchableOpacity>

          <Text style={styles.title}>Set new password</Text>

          {done ? (
            <>
              <Text style={styles.subtitle}>
                Your password has been reset. You can now sign in with your new password.
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.buttonText}>Sign in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Paste the reset token from your email, then choose a new password.
              </Text>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Text style={styles.label}>Reset token</Text>
              <TextInput
                style={styles.input}
                placeholder="Paste token from email"
                placeholderTextColor="#aaa"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor="#aaa"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Reset password</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  safe:   { flex: 1, backgroundColor: '#f5f5f7' },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 16 },
  backBtn:{ marginBottom: 24, alignSelf: 'flex-start' },
  title:  { fontSize: 26, fontWeight: '700', color: '#1d1d1f', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#6e6e73', lineHeight: 22, marginBottom: 28 },
  label:  { fontSize: 13, fontWeight: '600', color: '#1d1d1f', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d1d6', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1d1d1f',
    backgroundColor: '#fff', marginBottom: 20,
  },
  button: {
    backgroundColor: '#1a8fa8', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: {
    color: '#e85d04', fontSize: 13, marginBottom: 16,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(232,93,4,0.06)',
  },
};
