import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useStyles } from '../styles/TaskFormScreen.styles';

const POSITION_OPTIONS = ['full', 'start', 'end'];

// Formats a Date to "YYYY-MM-DDTHH:mm" for the API
function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(date) {
  return date.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TaskFormScreen({ route, navigation }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { user } = useAuth();
  const { members } = useFamily();

  const [title, setTitle]             = useState('');
  const [assignedTo, setAssignedTo]   = useState(String(user?.id || ''));
  const [position, setPosition]       = useState('full');
  const [hasDueDate, setHasDueDate]   = useState(false);
  const [dueDate, setDueDate]         = useState(new Date());
  const [showPicker, setShowPicker]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) { setError(t('tasks.title_required')); return; }
    if (!assignedTo)   { setError(t('tasks.select_assignee')); return; }
    setError('');
    setLoading(true);
    try {
      await API.post('/tasks/standalone', {
        title: title.trim(),
        assigned_to: assignedTo,
        position,
        due_date: hasDueDate ? toISOLocal(dueDate) : null,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tasks.new_task')}</Text>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, loading && styles.saveHeaderBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#1a8fa8" />
            : <Text style={styles.saveHeaderBtnText}>{t('common.save')}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Title ── */}
        <TextInput
          style={styles.titleInput}
          placeholder={t('tasks.title_placeholder')}
          placeholderTextColor="#aaa"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* ── Assign to ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('tasks.assign_to')}</Text>
          <View style={styles.attendeeRow}>
            {members.map(m => {
              const initials = [m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase();
              const color = m.color || '#1a8fa8';
              const isSelected = assignedTo === String(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={styles.attendeeBubble}
                  onPress={() => setAssignedTo(String(m.id))}
                >
                  <View style={[
                    styles.attendeeCircle,
                    { backgroundColor: color },
                    isSelected && styles.attendeeCircleSelected,
                  ]}>
                    <Text style={styles.attendeeInitials}>{initials}</Text>
                    {isSelected && (
                      <View style={styles.attendeeTick}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.attendeeName} numberOfLines={1}>{m.first_name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Position ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('tasks.position')}</Text>
          <View style={styles.segmentRow}>
            {POSITION_OPTIONS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.segment, position === p && styles.segmentActive]}
                onPress={() => setPosition(p)}
              >
                <Text style={[styles.segmentText, position === p && styles.segmentTextActive]}>
                  {t(`tasks.${p}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Due date ── */}
        <View style={styles.card}>
          <View style={styles.dueDateHeader}>
            <Text style={styles.fieldLabel}>{t('tasks.due_date')}</Text>
            <TouchableOpacity
              style={[styles.dueDateToggle, hasDueDate && styles.dueDateToggleActive]}
              onPress={() => { setHasDueDate(v => !v); setShowPicker(false); }}
            >
              <Text style={[styles.dueDateToggleText, hasDueDate && styles.dueDateToggleTextActive]}>
                {hasDueDate ? t('common.cancel') : t('common.ok')}
              </Text>
            </TouchableOpacity>
          </View>

          {hasDueDate && (
            <>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowPicker(v => !v)}
              >
                <Text style={styles.dateBtnText}>{formatDisplay(dueDate)}</Text>
                <Ionicons name="chevron-down" size={14} color="#888" />
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') setShowPicker(false);
                    if (selected) setDueDate(selected);
                  }}
                  style={{ marginTop: 8 }}
                />
              )}
            </>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>{t('tasks.new_task')}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
