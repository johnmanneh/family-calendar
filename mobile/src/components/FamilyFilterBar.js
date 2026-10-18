import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme';

// Shown only when the user belongs to 2+ families.
// Renders a horizontal row of family name chips; the active one is highlighted.
export default function FamilyFilterBar({ families, activeFamilyId, onSelect }) {
  const c = useThemeColors();

  if (!families || families.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {families.map(f => {
        const active = Number(f.id) === Number(activeFamilyId);
        return (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.chip,
              { borderColor: active ? '#1a8fa8' : c.border, backgroundColor: active ? '#1a8fa8' : c.surface },
            ]}
            onPress={() => !active && onSelect(f.id)}
            activeOpacity={active ? 1 : 0.7}
          >
            <Text style={[styles.chipText, { color: active ? '#fff' : c.textSub }]} numberOfLines={1}>
              {f.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:     { flexGrow: 0 },
  content: { paddingHorizontal: 14, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
