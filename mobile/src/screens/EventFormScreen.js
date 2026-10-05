import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../api/axios';
import { useFamily } from '../context/FamilyContext';
import styles from '../styles/EventFormScreen.styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Family',  color: '#56e39f', icon: '🏠' },
  { name: 'School',  color: '#4facfe', icon: '🏫' },
  { name: 'Sports',  color: '#c8f400', icon: '⚽' },
  { name: 'Health',  color: '#f48c06', icon: '🏥' },
  { name: 'Travel',  color: '#9747ff', icon: '✈️' },
  { name: 'Social',  color: '#ffd60a', icon: '🎉' },
  { name: 'Faith',   color: '#1a8fa8', icon: '⛪' },
  { name: 'Work',    color: '#6e6e73', icon: '💼' },
];

const RECURRENCE_OPTIONS = [
  { label: 'Does not repeat', value: '' },
  { label: 'Daily',           value: 'daily' },
  { label: 'Weekly',          value: 'weekly' },
  { label: 'Monthly',         value: 'monthly' },
  { label: 'Yearly',          value: 'yearly' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const POSITION_OPTIONS = ['full', 'start', 'end'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns a JS Date rounded to the current hour
function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

// Returns start + 1 hour
function defaultEnd(start) {
  const d = new Date(start);
  d.setHours(d.getHours() + 1);
  return d;
}

// Formats a Date object to "YYYY-MM-DDTHH:mm" for the API
function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Formats a Date to "YYYY-MM-DD" for all-day events
function toDateOnly(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Human-readable label shown on the date/time row buttons
function formatDisplay(date, allDay) {
  if (allDay) {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  return date.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── DatePicker row ───────────────────────────────────────────────────────────
// On iOS the picker shows inline; on Android it opens a dialog.
// We keep a piece of state for which picker is open (null / 'start' / 'end' / 'recurrenceEnd').

function DateRow({ label, date, allDay, pickerKey, openPicker, setOpenPicker, onChange }) {
  const isOpen = openPicker === pickerKey;

  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setOpenPicker(isOpen ? null : pickerKey)}
      >
        <Text style={styles.dateBtnText}>{formatDisplay(date, allDay)}</Text>
        <Ionicons name="chevron-down" size={14} color="#888" />
      </TouchableOpacity>

      {isOpen && (
        <DateTimePicker
          value={date}
          mode={allDay ? 'date' : 'datetime'}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, selected) => {
            // Android fires onChange and immediately closes; iOS stays open
            if (Platform.OS === 'android') setOpenPicker(null);
            if (selected) onChange(selected);
          }}
          style={styles.picker}
        />
      )}
    </View>
  );
}

// ─── EventFormScreen ──────────────────────────────────────────────────────────

export default function EventFormScreen({ route, navigation }) {
  // event is passed when editing; undefined when creating
  const { event } = route.params || {};
  const isEdit = !!event;

  const { members } = useFamily();

  // ── Form state ────────────────────────────────────────────────────────────
  const start = isEdit ? new Date(event.start_date) : defaultStart();
  const [formData, setFormData] = useState({
    title:                isEdit ? event.title           || '' : '',
    description:          isEdit ? event.description     || '' : '',
    location:             isEdit ? event.location        || '' : '',
    notes:                isEdit ? event.notes           || '' : '',
    video_call_link:      isEdit ? event.video_call_link || '' : '',
    priority:             isEdit ? event.priority        || 'medium' : 'medium',
    category:             isEdit ? event.category        || '' : '',
    color:                isEdit ? event.color           || '#1a8fa8' : '#1a8fa8',
    recurrence:           isEdit ? event.recurrence      || '' : '',
    is_all_day:           isEdit ? !!event.is_all_day : false,
    is_private:           isEdit ? !!event.is_private : false,
  });

  const [startDate, setStartDate]   = useState(start);
  const [endDate, setEndDate]       = useState(isEdit ? new Date(event.end_date) : defaultEnd(start));
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    isEdit && event.recurrence_end_date ? new Date(event.recurrence_end_date) : new Date()
  );

  // Which date picker is currently visible
  const [openPicker, setOpenPicker] = useState(null);

  // ── Attendees ─────────────────────────────────────────────────────────────
  // Initialise from event.attendees when editing
  const [selectedAttendees, setSelectedAttendees] = useState(
    isEdit && event.attendees ? event.attendees.map(a => Number(a.user_id)) : []
  );

  const toggleAttendee = (id) => {
    const numId = Number(id);
    setSelectedAttendees(prev =>
      prev.includes(numId)
        ? prev.filter(a => a !== numId)
        : [...prev, numId]
    );
    // If removing an attendee, clear their task assignments
    if (selectedAttendees.includes(numId)) {
      setTasks(prev => prev.map(t =>
        Number(t.assigned_to) === numId ? { ...t, assigned_to: '' } : t
      ));
    }
  };

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState(
    isEdit && event.tasks
      ? event.tasks.map(t => ({ title: t.title, assigned_to: String(t.assigned_to || ''), position: t.position || 'full' }))
      : []
  );

  const addTask    = () => setTasks(p => [...p, { title: '', assigned_to: '', position: 'full' }]);
  const removeTask = i  => setTasks(p => p.filter((_, idx) => idx !== i));
  const updateTask = (i, field, val) => setTasks(p => {
    const next = [...p];
    next[i] = { ...next[i], [field]: val };
    return next;
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const eventPayload = {
        ...formData,
        start_date: formData.is_all_day ? toDateOnly(startDate) : toISOLocal(startDate),
        end_date:   formData.is_all_day ? toDateOnly(endDate)   : toISOLocal(endDate),
        recurrence_end_date: formData.recurrence ? toDateOnly(recurrenceEnd) : null,
      };

      // Only require a title — assigned_to can be null ("Anyone")
      const validTasks = tasks.filter(t => t.title.trim());

      if (isEdit) {
        // ── Update event ──────────────────────────────────────────────────
        await API.put(`/events/${event.id}`, eventPayload);

        // Sync attendees: figure out who was there before vs now
        const previousAttendeeIds = (event.attendees || []).map(a => Number(a.user_id));
        const toAdd    = selectedAttendees.filter(id => !previousAttendeeIds.includes(id));
        const toRemove = previousAttendeeIds.filter(id => !selectedAttendees.includes(id));

        await Promise.all([
          ...toRemove.map(id => API.delete(`/events/${event.id}/attendees/${id}`)),
          ...toAdd.map(id    => API.post(`/events/${event.id}/attendees`, { user_id: id })),
        ]);

        // Add any new tasks (web doesn't delete existing tasks on edit, only adds new ones)
        if (validTasks.length > 0) {
          await Promise.all(
            validTasks.map(t => API.post(`/events/${event.id}/tasks`, {
              ...t,
              assigned_to: t.assigned_to || null,
            }))
          );
        }
      } else {
        // ── Create event ──────────────────────────────────────────────────
        const res = await API.post('/events/create', eventPayload);
        const newId = res.data.event.id;

        // Add attendees one-by-one
        if (selectedAttendees.length > 0) {
          await Promise.all(
            selectedAttendees.map(id => API.post(`/events/${newId}/attendees`, { user_id: id }))
          );
        }

        // Add tasks one-by-one
        if (validTasks.length > 0) {
          await Promise.all(
            validTasks.map(t => API.post(`/events/${newId}/tasks`, {
              ...t,
              assigned_to: t.assigned_to || null,
            }))
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const handleAllDayToggle = (val) => {
    set('is_all_day', val);
    // Keep the same date, just strip or restore time
    if (val) {
      setStartDate(d => { const n = new Date(d); n.setHours(0,0,0,0); return n; });
      setEndDate(d => { const n = new Date(d); n.setHours(0,0,0,0); return n; });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Event' : 'New Event'}</Text>
        {/* Save button on the right */}
        <TouchableOpacity
          style={[styles.saveHeaderBtn, loading && styles.saveHeaderBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#1a8fa8" />
            : <Text style={styles.saveHeaderBtnText}>Save</Text>
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
          placeholder="Event title"
          placeholderTextColor="#aaa"
          value={formData.title}
          onChangeText={v => set('title', v)}
          autoFocus={!isEdit}
        />

        {/* ── Toggles ── */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>All Day</Text>
            <Switch
              value={formData.is_all_day}
              onValueChange={handleAllDayToggle}
              trackColor={{ true: '#1a8fa8' }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: '#f2f2f7' }]}>
            <Text style={styles.toggleLabel}>🔒 Private</Text>
            <Switch
              value={formData.is_private}
              onValueChange={v => set('is_private', v)}
              trackColor={{ true: '#1a8fa8' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Dates ── */}
        <View style={styles.card}>
          <DateRow
            label="Start"
            date={startDate}
            allDay={formData.is_all_day}
            pickerKey="start"
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            onChange={setStartDate}
          />
          <View style={styles.cardDivider} />
          <DateRow
            label="End"
            date={endDate}
            allDay={formData.is_all_day}
            pickerKey="end"
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            onChange={setEndDate}
          />
        </View>

        {/* ── Repeat ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Repeat</Text>
          <View style={styles.segmentRow}>
            {RECURRENCE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.segment, formData.recurrence === opt.value && styles.segmentActive]}
                onPress={() => set('recurrence', opt.value)}
              >
                <Text style={[styles.segmentText, formData.recurrence === opt.value && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.recurrence ? (
            <>
              <View style={styles.cardDivider} />
              <DateRow
                label="Repeat Until"
                date={recurrenceEnd}
                allDay={true}
                pickerKey="recurrenceEnd"
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
                onChange={setRecurrenceEnd}
              />
            </>
          ) : null}
        </View>

        {/* ── Category ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryChip,
                  formData.category === cat.name && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                onPress={() => {
                  // Selecting a category also sets the colour to match
                  set('category', formData.category === cat.name ? '' : cat.name);
                  if (formData.category !== cat.name) set('color', cat.color);
                }}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryLabel,
                  formData.category === cat.name && { color: '#fff' },
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Who's attending ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Who's attending?</Text>
          <View style={styles.attendeeRow}>
            {members.map(m => {
              const initials = [m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase();
              const color = m.color || '#1a8fa8';
              const isSelected = selectedAttendees.includes(Number(m.id));
              return (
                <TouchableOpacity
                  key={m.id}
                  style={styles.attendeeBubble}
                  onPress={() => toggleAttendee(m.id)}
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

        {/* ── Tasks ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Tasks</Text>
          {tasks.map((task, i) => (
            <View key={i} style={styles.taskRow}>
              {/* Task title input */}
              <TextInput
                style={styles.taskTitleInput}
                placeholder="Task title"
                placeholderTextColor="#aaa"
                value={task.title}
                onChangeText={v => updateTask(i, 'title', v)}
              />

              {/* Assign to — all family members, not just event attendees */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskAssignRow}>
                <TouchableOpacity
                  style={[styles.assignChip, task.assigned_to === '' && styles.assignChipActive]}
                  onPress={() => updateTask(i, 'assigned_to', '')}
                >
                  <Text style={[styles.assignChipText, task.assigned_to === '' && styles.assignChipTextActive]}>
                    Anyone
                  </Text>
                </TouchableOpacity>
                {members.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.assignChip, task.assigned_to === String(m.id) && styles.assignChipActive]}
                    onPress={() => updateTask(i, 'assigned_to', String(m.id))}
                  >
                    <Text style={[styles.assignChipText, task.assigned_to === String(m.id) && styles.assignChipTextActive]}>
                      {m.first_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Position */}
              <View style={styles.taskPositionRow}>
                {POSITION_OPTIONS.map(pos => (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.posChip, task.position === pos && styles.posChipActive]}
                    onPress={() => updateTask(i, 'position', pos)}
                  >
                    <Text style={[styles.posChipText, task.position === pos && styles.posChipTextActive]}>
                      {pos}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.taskRemoveBtn} onPress={() => removeTask(i)}>
                  <Ionicons name="close-circle" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addTaskBtn} onPress={addTask}>
            <Ionicons name="add-circle-outline" size={18} color="#1a8fa8" />
            <Text style={styles.addTaskText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* ── Location ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Add location"
            placeholderTextColor="#aaa"
            value={formData.location}
            onChangeText={v => set('location', v)}
          />
        </View>

        {/* ── Priority ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.segmentRow}>
            {PRIORITY_OPTIONS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.segment, styles.segmentFlex, formData.priority === p && styles.segmentActive]}
                onPress={() => set('priority', p)}
              >
                <Text style={[styles.segmentText, formData.priority === p && styles.segmentTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Colour ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Colour</Text>
          <View style={styles.colorRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.colorDot,
                  { backgroundColor: cat.color },
                  formData.color === cat.color && styles.colorDotSelected,
                ]}
                onPress={() => set('color', cat.color)}
              >
                {formData.color === cat.color && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add notes"
            placeholderTextColor="#aaa"
            value={formData.notes}
            onChangeText={v => set('notes', v)}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* ── Video Call Link ── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Video Call Link</Text>
          <TextInput
            style={styles.textInput}
            placeholder="https://meet.google.com/..."
            placeholderTextColor="#aaa"
            value={formData.video_call_link}
            onChangeText={v => set('video_call_link', v)}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* ── Bottom save button ── */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>{isEdit ? 'Update Event' : 'Add Event'}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
