import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import API from '../../api/axios';
import { useFamilyStyles, CHILD_COLORS } from './familyStyles';

// Manage a child profile (no login): name, colour, remove
export default function ChildManageSection({ child, onSaved, onRemoved, onScan }) {
  const { t } = useTranslation();
  const s = useFamilyStyles();
  const [first, setFirst] = useState(child.first_name || '');
  const [last, setLast] = useState(child.last_name || '');
  const [color, setColor] = useState(child.color || '#f48c06');
  const [msg, setMsg] = useState('');

  const save = async () => {
    if (!first.trim()) return;
    try {
      await API.put(`/family/children/${child.id}`, { first_name: first, last_name: last, color });
      setMsg(t('common.saved'));
      onSaved?.();
    } catch (err) {
      setMsg(err.response?.data?.message || t('common.something_went_wrong'));
    }
  };

  const remove = () => {
    Alert.alert(
      t('child.remove_title', { name: child.first_name }),
      t('child.remove_confirm', { name: child.first_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('child.remove'), style: 'destructive',
          onPress: async () => {
            try { await API.delete(`/family/children/${child.id}`); onRemoved?.(); }
            catch (err) { Alert.alert(t('common.error'), err.response?.data?.message || t('common.something_went_wrong')); }
          },
        },
      ]
    );
  };

  return (
    <>
      {onScan ? (
        <TouchableOpacity style={[s.primary, { backgroundColor: '#e8618c', marginTop: 20 }]} onPress={onScan}>
          <Text style={s.primaryText}>🌸  {t('scan.scan_for', { name: child.first_name })}</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={s.header}>{t('child.profile')}</Text>
      <View style={s.card}>
        <Text style={s.hint}>{t('child.managed_hint', { name: child.first_name })}</Text>
        <TextInput style={s.input} value={first} onChangeText={setFirst} placeholder={t('child.first_name')} placeholderTextColor="#aeaeb2" maxLength={100} />
        <TextInput style={s.input} value={last} onChangeText={setLast} placeholder={t('child.last_name')} placeholderTextColor="#aeaeb2" maxLength={100} />
        <View style={s.colors}>
          {CHILD_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setColor(c)} style={[s.dot, { backgroundColor: c }, color === c && s.dotOn]} />
          ))}
        </View>
        {msg ? <Text style={[s.msg, { color: msg === t('common.saved') ? '#34c759' : '#ff3b30' }]}>{msg}</Text> : null}
        <TouchableOpacity style={s.primary} onPress={save}>
          <Text style={s.primaryText}>{t('common.save')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.danger, { marginTop: 12 }]} onPress={remove}>
          <Text style={s.dangerText}>{t('child.remove_profile')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
