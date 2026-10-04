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
import { LinearGradient } from 'expo-linear-gradient';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/LoginScreen.styles';

// ─── Logo ────────────────────────────────────────────────────────────────────
// Recreates the web SVG logo using React Native primitives + LinearGradient.
// Structure: gradient bar → WHEN → gradient bar → hanging strings → season emojis

const GRADIENT_COLORS = ['#56e39f', '#4facfe', '#f857a6', '#f48c06'];

// The four season emojis hang below the bottom gradient bar, evenly spaced
const SEASONS = ['🌸', '☀️', '🍂', '❄️'];

function WhenLogo() {
  return (
    <View style={styles.logoWrapper}>

      {/* Top gradient bar */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBar}
      />

      {/* WHEN title */}
      <Text style={styles.logoText}>WHEN</Text>

      {/* Bottom gradient bar */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBar}
      />

      {/* Hanging strings + emojis */}
      <View style={styles.seasonsRow}>
        {SEASONS.map((emoji, i) => (
          <View key={i} style={styles.seasonItem}>
            {/* The thin vertical "string" */}
            <View style={styles.string} />
            <Text style={styles.seasonEmoji}>{emoji}</Text>
          </View>
        ))}
      </View>

      {/* Scripture tag */}
      <Text style={styles.scripture}>To every season, a time · Eccl. 3:1</Text>
    </View>
  );
}

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

          <WhenLogo />

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
