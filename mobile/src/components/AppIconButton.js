/**
 * AppIconButton — the "it's / for / us." app icon as a small tile.
 * Used top-left on Home as the menu button (replaces the gradient hamburger
 * when HEADER_STYLE is 'logo' in HomeScreen).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';

const BRAND_DOT = '#005CFD';   // the blue dot from the app icon

export default function AppIconButton({ onPress, size = 36 }) {
  const dark = useColorScheme() === 'dark';
  const fs  = size * 0.34;     // text fills the tile, like the app icon
  const lh  = fs * 0.86;       // lines sit close together
  const dot = fs * 0.36;       // clearly visible blue dot
  const textColor = dark ? '#fff' : '#111';
  const word = { fontSize: fs, lineHeight: lh, color: textColor };
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Menu"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
      <View style={[styles.tile, {
        width: size, height: size, borderRadius: size * 0.24,
        backgroundColor: dark ? '#2c2c2e' : '#fff',
        borderColor: dark ? '#3a3a3c' : 'rgba(0,0,0,0.06)',
      }]}>
        <Text style={[styles.word, word]}>it{'\u2019'}s</Text>
        <Text style={[styles.word, word]}>for</Text>
        <View style={styles.lastLine}>
          <Text style={[styles.word, word]}>us</Text>
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: BRAND_DOT,
            marginLeft: dot * 0.25, marginBottom: lh * 0.14 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'flex-start', justifyContent: 'center',
    paddingLeft: '13%', borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  word: { fontWeight: '900', letterSpacing: -0.5, includeFontPadding: false },
  lastLine: { flexDirection: 'row', alignItems: 'flex-end' },
});
