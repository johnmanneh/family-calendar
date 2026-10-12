import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import API from '../api/axios';
import TopCard from '../components/ui/TopCard';
import { RollInGroup } from '../components/RollIn';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

// ─── Scan a schedule (scan frame in the sun menu, or "Scan schedule" on a child's profile)
// 1. photo  →  2. the server reads it (nothing saved)  →  3. you review, pick
// whose calendar, and tap Add. Only then are events created.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SPRING, SPRING_DARK } from '../components/icons/scanColors';
const GREEN = SPRING_DARK;   // buttons, ticks, text
const TINT = SPRING;        // soft backgrounds

function fmt(e) {
  if (e.all_day) {
    const s = new Date(`${e.start_date}T00:00:00`);
    const label = s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    if (e.end_date && e.end_date !== e.start_date) {
      const en = new Date(`${e.end_date}T00:00:00`);
      return `${label} – ${en.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
    }
    return label;
  }
  const s = new Date(e.start_date), en = new Date(e.end_date);
  const t = d => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${t(s)}–${t(en)}`;
}

export default function ScanScreen({ navigation, route }) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? DARK : LIGHT;
  const s = makeStyles(c);

  const [stage, setStage] = useState('pick');    // pick | reading | review | saving
  const [photo, setPhoto] = useState(null);
  const [items, setItems] = useState([]);        // { ...event, on: true }
  const [targets, setTargets] = useState([]);
  const [ownerId, setOwnerId] = useState(route.params?.ownerId ? Number(route.params.ownerId) : null);
  const [label, setLabel] = useState('');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    API.get('/events/targets').then(r => {
      const list = r.data.targets || [];
      setTargets(list);
      if (!route.params?.ownerId) setOwnerId(list.find(x => x.is_self)?.id || null);
    }).catch(() => {});
  }, []);

  const pick = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('common.permission_needed'), t('scan.allow_photos')); return; }
    const opts = { mediaTypes: ['images'], quality: 0.6 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    setPhoto(asset.uri);
    read(asset);
  };

  const read = async (asset) => {
    setStage('reading');
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const form = new FormData();
    form.append('image', { uri: asset.uri, name: `schedule.${ext}`, type });
    form.append('tz', tz);
    if (ownerId) form.append('owner_id', String(ownerId));
    try {
      const r = await API.post('/scan', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
      const evs = (r.data.events || []).map((e, i) => ({ ...e, key: String(i), on: true }));
      if (!evs.length) { Alert.alert(t('scan.title'), t('scan.nothing_found')); setStage('pick'); return; }
      setItems(evs);
      setStage('review');
    } catch (err) {
      Alert.alert(t('scan.title'), err.response?.data?.message || t('common.something_went_wrong'));
      setStage('pick');
    }
  };

  const save = async () => {
    const chosen = items.filter(i => i.on);
    if (!chosen.length) return;
    setStage('saving');
    try {
      const r = await API.post('/scan/import', {
        owner_id: ownerId, tz, category: label || null,
        events: chosen.map(({ title, all_day, start_date, end_date, notes }) => ({ title, all_day, start_date, end_date, notes })),
      });
      Alert.alert(t('scan.title'), t('scan.added', { count: r.data.created }) + (r.data.skipped ? ` ${t('scan.skipped', { count: r.data.skipped })}` : ''));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('scan.title'), err.response?.data?.message || t('common.something_went_wrong'));
      setStage('review');
    }
  };

  const update = (key, patch) => setItems(list => list.map(i => (i.key === key ? { ...i, ...patch } : i)));
  const count = items.filter(i => i.on).length;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <TopCard>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('scan.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </TopCard>

      {stage === 'pick' && (
        <View style={s.center}>
          <View style={s.flower}><MaterialCommunityIcons name="line-scan" size={44} color={c.spring} /></View>
          <Text style={s.lead}>{t('scan.lead')}</Text>
          <TouchableOpacity style={s.primary} onPress={() => pick('camera')}>
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={s.primaryText}>{t('scan.take_photo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondary} onPress={() => pick('library')}>
            <Ionicons name="images-outline" size={18} color={c.spring} />
            <Text style={[s.secondaryText, { color: c.spring }]}>{t('scan.choose_photo')}</Text>
          </TouchableOpacity>
          <Text style={s.small}>{t('scan.privacy')}</Text>
        </View>
      )}

      {(stage === 'reading' || stage === 'saving') && (
        <View style={s.center}>
          {photo ? <Image source={{ uri: photo }} style={s.preview} /> : null}
          <ActivityIndicator color={c.spring} size="large" style={{ marginTop: 20 }} />
          <Text style={s.lead}>{stage === 'reading' ? t('scan.reading') : t('scan.saving')}</Text>
        </View>
      )}

      {stage === 'review' && (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            {/* Whose calendar */}
            {targets.length > 1 && (
              <>
                <Text style={s.section}>{t('scan.add_to')}</Text>
                <View style={s.chips}>
                  {targets.map(tg => {
                    const on = Number(ownerId) === Number(tg.id);
                    const col = tg.color || '#1a8fa8';
                    return (
                      <TouchableOpacity key={tg.id} onPress={() => setOwnerId(tg.id)}
                        style={[s.chip, on && { borderColor: col, backgroundColor: col + '22' }]}>
                        <View style={[s.dot, { backgroundColor: col }]} />
                        <Text style={s.chipText}>{tg.is_self ? t('events.my_calendar') : tg.first_name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* One label for the whole sheet — easy to filter later */}
            <Text style={s.section}>{t('scan.label')}</Text>
            <View style={s.chips}>
              {['Kindergarten', 'School', ''].map(l => (
                <TouchableOpacity key={l || 'none'} onPress={() => setLabel(l)}
                  style={[s.chip, label === l && { borderColor: GREEN, backgroundColor: TINT + '26' }]}>
                  <Text style={s.chipText}>{l ? t(`scan.label_${l.toLowerCase()}`) : t('scan.label_none')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.section}>{t('scan.found', { count: items.length })}</Text>
            <RollInGroup>
              {items.map(it => (
                <View key={it.key} style={[s.card, !it.on && { opacity: 0.45 }]}>
                  <TouchableOpacity onPress={() => update(it.key, { on: !it.on })} style={s.check}>
                    <Ionicons name={it.on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={it.on ? c.spring : c.textMuted} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <TextInput style={s.title} value={it.title} onChangeText={v => update(it.key, { title: v })} maxLength={120} />
                    <Text style={[s.when, { color: c.spring }]}>{fmt(it)}</Text>
                    {it.notes ? <Text style={s.notes} numberOfLines={2}>{it.notes}</Text> : null}
                    {it.ambiguous ? (
                      <Text style={s.warn}><Ionicons name="alert-circle-outline" size={12} /> {t('scan.check_date')}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </RollInGroup>
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={[s.primary, { flex: 1 }, !count && { opacity: 0.5 }]} disabled={!count} onPress={save}>
              <Text style={s.primaryText}>{t('scan.add_n', { count })}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const makeStyles = c => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  back: { width: 40, padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  flower: { width: 88, height: 88, borderRadius: 26, backgroundColor: TINT + '24', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lead: { fontSize: 15, color: c.textSub, textAlign: 'center', marginVertical: 14, lineHeight: 21 },
  small: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 18, lineHeight: 17 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22, alignSelf: 'stretch' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderColor: GREEN, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, alignSelf: 'stretch', marginTop: 10 },
  secondaryText: { color: GREEN, fontSize: 16, fontWeight: '600' },
  preview: { width: 160, height: 120, borderRadius: 12 },
  section: { fontSize: 13, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: '600', color: c.text },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: { flexDirection: 'row', gap: 10, backgroundColor: c.surface, borderRadius: 14, padding: 12, marginBottom: 8 },
  check: { paddingTop: 2 },
  title: { fontSize: 15, fontWeight: '600', color: c.text, padding: 0 },
  when: { fontSize: 13, color: GREEN, fontWeight: '600', marginTop: 3 },
  notes: { fontSize: 12, color: c.textSub, marginTop: 3 },
  warn: { fontSize: 12, color: '#ff9500', marginTop: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, flexDirection: 'row', backgroundColor: c.bg },
});
