import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme';

/**
 * ListCard — the home-list card used everywhere:
 * white rounded card, coloured stripe on the left, title + subtitle,
 * optional status pill (badge) or any element on the right.
 */
export default function ListCard({ stripe = '#1a8fa8', title, subtitle, badge, right, onPress, style }) {
  const c = useThemeColors();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[s.card, { backgroundColor: c.surface }, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[s.stripe, { backgroundColor: stripe }]} />
      <View style={s.body}>
        <Text style={[s.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[s.subtitle, { color: c.textSub }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[s.badge, { backgroundColor: badge.color }]}>
          <Text style={s.badgeText}>{badge.label}</Text>
        </View>
      ) : right || null}
    </Wrapper>
  );
}

export function SectionHeader({ children, style }) {
  const c = useThemeColors();
  return <Text style={[s.section, { color: c.icon }, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  stripe: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  subtitle: { fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  section: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: 16, marginBottom: 6,
  },
});
