import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LIGHT, DARK } from '../theme';
import { SUPPORTED_LANGUAGES, setAppLanguage } from '../i18n';

// ─── Styles ───────────────────────────────────────────────────────────────────

const make = c => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn:     { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text, flex: 1 },
  subtitle: {
    fontSize: 13, color: c.textMuted,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: c.separator,
  },
  rowLast:  { borderBottomWidth: 0 },
  langInfo: { flex: 1 },
  nativeName:  { fontSize: 15, fontWeight: '600', color: c.text },
  englishName: { fontSize: 13, color: c.textSub, marginTop: 1 },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);
function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}

// ─── LanguageScreen ───────────────────────────────────────────────────────────

export default function LanguageScreen({ navigation }) {
  const styles       = useStyles();
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(i18n.language || 'en');
  const [saving,   setSaving]   = useState(false);

  const handleSelect = async (code) => {
    if (code === selected || saving) return;
    setSaving(true);
    try {
      await setAppLanguage(code);
      setSelected(code);
    } catch {
      Alert.alert(t('common.error'), t('common.something_went_wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.language')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{t('settings.language_subtitle')}</Text>

        <View style={styles.card}>
          {SUPPORTED_LANGUAGES.map((lang, index) => {
            const isSelected = lang.code === selected;
            const isLast     = index === SUPPORTED_LANGUAGES.length - 1;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, isLast && styles.rowLast]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.7}
                disabled={saving}
              >
                <View style={styles.langInfo}>
                  <Text style={styles.nativeName}>{lang.nativeName}</Text>
                  <Text style={styles.englishName}>{lang.name}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color="#1a8fa8" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
