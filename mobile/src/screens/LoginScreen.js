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
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import API from '../api/axios';
import WhenLogo from '../components/WhenLogo';
import { useAuth } from '../context/AuthContext';
import { useStyles } from '../styles/LoginScreen.styles';


// ─── LoginScreen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { login } = useAuth();
  const navigation = useNavigation();

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
      setError(err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!firstName.trim()) { setError(t('auth.first_name_required')); return; }
    if (!lastName.trim())  { setError(t('auth.last_name_required'));  return; }
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
      setError(err.response?.data?.message || t('common.something_went_wrong'));
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
            {isLogin ? t('auth.welcome_back') : t('auth.create_account_heading')}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? t('auth.sign_in_subtitle')
              : t('auth.register_subtitle')}
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
                <Text style={styles.label}>{t('auth.first_name')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.placeholder_first')}
                  placeholderTextColor="#aaa"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.nameField}>
                <Text style={styles.label}>{t('auth.last_name')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.placeholder_last')}
                  placeholderTextColor="#aaa"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* ── Email ── */}
          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.placeholder_email')}
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* ── Password ── */}
          <Text style={styles.label}>{t('auth.password')}</Text>
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
              : <Text style={styles.buttonText}>{isLogin ? t('auth.sign_in') : t('auth.create_account')}</Text>
            }
          </TouchableOpacity>

          {/* ── Forgot password ── */}
          {isLogin && (
            <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.switchLink}>{t('auth.forgot_password')}</Text>
            </TouchableOpacity>
          )}

          {/* ── Switch mode link ── */}
          {isLogin ? (
            <TouchableOpacity style={styles.switchRow} onPress={() => switchMode('register')}>
              <Text style={styles.switchText}>{t('auth.new_to_when')}</Text>
              <Text style={styles.switchLink}>{t('auth.create_account')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.switchRow} onPress={() => switchMode('login')}>
              <Text style={styles.switchText}>{t('auth.already_have_account')}</Text>
              <Text style={styles.switchLink}>{t('auth.sign_in')}</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
