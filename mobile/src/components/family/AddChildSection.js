import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import API from '../../api/axios';
import { useFamilyStyles, CHILD_COLORS } from './familyStyles';

// Add a child profile — a family member without a login
export default function AddChildSection({ onAdded }) {
  const { t } = useTranslation();
  const s = useFamilyStyles();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CHILD_COLORS[0]);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await API.post('/family/children', { first_name: name.trim(), color });
      setName(''); setOpen(false);
      onAdded?.();
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong'));
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <TouchableOpacity style={[s.card, { alignItems: 'center', marginBottom: 16 }]} onPress={() => setOpen(true)}>
        <Text style={{ color: '#1a8fa8', fontWeight: '600', fontSize: 15 }}>+ {t('child.add')}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[s.card, { marginBottom: 16 }]}>
      <Text style={s.hint}>{t('child.add_hint')}</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder={t('child.first_name')} placeholderTextColor="#aeaeb2" autoFocus maxLength={100} />
      <View style={s.colors}>
        {CHILD_COLORS.map(c => (
          <TouchableOpacity key={c} onPress={() => setColor(c)} style={[s.dot, { backgroundColor: c }, color === c && s.dotOn]} />
        ))}
      </View>
      <TouchableOpacity style={[s.primary, (!name.trim() || busy) && { opacity: 0.5 }]} disabled={!name.trim() || busy} onPress={add}>
        <Text style={s.primaryText}>{t('child.add')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { setOpen(false); setName(''); }} style={{ alignItems: 'center', paddingTop: 12 }}>
        <Text style={{ color: '#8e8e93' }}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}
