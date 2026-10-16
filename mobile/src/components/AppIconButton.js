/**
 * AppIconButton — the "it's / for / us." app icon as a small tile.
 * Used top-left on Home as the menu button (replaces the gradient hamburger
 * when HEADER_STYLE is 'logo' in HomeScreen).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';

const BRAND_DOT = '#005CFD';   // the blue dot from the app icon

export default function AppIconButton({ onPress, size = 40 }) {
  const dark = useColorScheme() === 'dark';
  const fs = size * 0.27;      // font size scales with the tile
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Menu"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ padding: 2 }}>
      <View style={[styles.tile, {
        width: size, height: size, borderRadius: size * 0.24,
        backgroundColor: dark ? '#2c2c2e' : '#fff',
        borderColor: dark ? '#3a3a3c' : 'rgba(0,0,0,0.06)',
      }]}>
        {['it’s', 'for', 'us'].map((w, i) => (
          <Text key={w} style={[styles.word, { fontSize: fs, lineHeight: fs * 0.95, color: dark ? '#fff' : '#111' }]}>
            {w}{i === 2 ? <Text style={{ color: BRAND_DOT }}>.</Text> : null}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'flex-start', justifyContent: 'center',
    paddingLeft: '18%', borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  word: { fontWeight: '900', letterSpacing: -0.4, includeFontPadding: false },
});
