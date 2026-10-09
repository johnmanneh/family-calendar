import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme';

/**
 * TopCard — the floating, rounded card every screen starts with
 * (same as the home screen's header + calendar card).
 *
 * Put the screen's header row inside it (and anything that belongs to the
 * header, like a profile summary or tabs). The content below then scrolls
 * as list cards on the page background.
 */
export default function TopCard({ children, style }) {
  const c = useThemeColors();
  return (
    <View style={[s.card, { backgroundColor: c.surface }, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 8, marginTop: 4, marginBottom: 8,
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
});
