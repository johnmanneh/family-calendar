import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email'); return; }
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
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

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
          </TouchableOpacity>

          <Text style={styles.title}>Forgot password</Text>

          {sent ? (
            <>
              <Text style={styles.subtitle}>
                If <Text style={styles.bold}>{email}</Text> is registered, a reset link is on its way.{'\n'}
                Check your inbox (and spam folder).
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.buttonText}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Send reset link</Text>
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
  bold:   { fontWeight: '600', color: '#1d1d1f' },
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
