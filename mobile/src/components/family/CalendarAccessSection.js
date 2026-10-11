import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import API from '../../api/axios';
import { useFamilyStyles } from './familyStyles';

// "Who can add to my calendar" — create / edit / delete on YOUR calendar.
// Never lets anyone see more of your events than your privacy circle allows.
const CAPS = [
  { key: 'can_create', label: 'access.add' },
  { key: 'can_edit', label: 'access.edit' },
  { key: 'can_delete', label: 'access.delete' },
];

export default function CalendarAccessSection({ members, meId }) {
  const { t } = useTranslation();
  const s = useFamilyStyles();
  const [grants, setGrants] = useState({});
  const [saving, setSaving] = useState(null);
  const adults = members.filter(m => !m.is_managed && Number(m.id) !== Number(meId));

  useEffect(() => {
    API.get('/family/permissions')
      .then(res => {
        const g = {};
        (res.data.granted || []).forEach(p => { g[p.user_id] = p; });
        setGrants(g);
      })
      .catch(() => {});
  }, []);

  const toggle = async (person, key) => {
    const cur = grants[person.id] || { can_create: false, can_edit: false, can_delete: false };
    const next = { ...cur, [key]: !cur[key] };
    setSaving(person.id);
    try {
      await API.put('/family/permissions', { delegate_user_id: person.id, ...next });
      setGrants(g => ({ ...g, [person.id]: next }));
    } catch { /* keep previous state */ }
    finally { setSaving(null); }
  };

  if (adults.length === 0) return null;

  return (
    <>
      <Text style={s.header}>{t('access.title')}</Text>
      <View style={s.card}>
        <Text style={s.hint}>{t('access.hint')}</Text>
        {adults.map(p => {
          const g = grants[p.id] || {};
          const initials = [p.first_name?.[0], p.last_name?.[0]].filter(Boolean).join('').toUpperCase();
          return (
            <View key={p.id} style={s.row}>
              <View style={[s.avatar, { backgroundColor: p.color || '#1a8fa8' }]}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <Text style={s.name} numberOfLines={1}>{p.first_name}</Text>
              <View style={s.chips}>
                {CAPS.map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[s.chip, g[c.key] && s.chipOn]}
                    disabled={saving === p.id}
                    onPress={() => toggle(p, c.key)}
                  >
                    <Text style={[s.chipText, g[c.key] && s.chipTextOn]}>{t(c.label)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}
