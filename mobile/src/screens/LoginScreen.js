import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import API from '../api/axios';
import WhenLogo from '../components/WhenLogo';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/LoginScreen.styles';


// ─── LoginScreen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      await login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    // KeyboardAvoidingView pushes the card up when the keyboard opens on iOS
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ScrollView so the card is reachable on small screens with keyboard open */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── White card ── */}
        <View style={styles.card}>

          <View style={styles.logoWrapper}>
            <WhenLogo />
          </View>

          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your family calendar</Text>

          {/* ── Error box ── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Email input ── */}
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* ── Password input ── */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* ── Sign in button ── */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* ── Family tag ── */}
          <Text style={styles.tag}>Exclusively for your family ♥</Text>

          {/* ── OR divider ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
