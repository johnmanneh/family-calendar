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

  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Shared fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Register-only fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');

  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

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

  const handleRegister = async () => {
    setError('');
    if (!firstName.trim()) { setError('First name is required'); return; }
    if (!lastName.trim())  { setError('Last name is required');  return; }
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        email,
        password,
      });
      await login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>

          <View style={styles.logoWrapper}>
            <WhenLogo />
          </View>

          <Text style={styles.heading}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Sign in to your family calendar'
              : 'New to When? Let\'s get you set up'}
          </Text>

          {/* ── Error box ── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Register-only: name row ── */}
          {!isLogin && (
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor="#aaa"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.nameField}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Smith"
                  placeholderTextColor="#aaa"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* ── Email ── */}
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

          {/* ── Password ── */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* ── Submit button ── */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isLogin ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          {/* ── Switch mode link ── */}
          {isLogin ? (
            <TouchableOpacity style={styles.switchRow} onPress={() => switchMode('register')}>
              <Text style={styles.switchText}>New to When? </Text>
              <Text style={styles.switchLink}>Create Account</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.switchRow} onPress={() => switchMode('login')}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
