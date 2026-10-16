/**
 * AppIconButton — the "it's / for / us." app icon as a small tile.
 * Used top-left on Home as the menu button (replaces the gradient hamburger
 * when HEADER_STYLE is 'logo' in HomeScreen).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const BRAND_DOT = '#005CFD';   // the blue dot from the app icon

// Same look as the other header icons (search, chat, bell): thin grey
// outline frame, grey text, no fill, no shadow. Only the brand dot is blue.
const ICON_GREY = '#8e8e93';

export default function AppIconButton({ onPress, size = 42 }) {
  const fs  = size * 0.31;     // text fills the tile, like the app icon
  const lh  = fs * 1.15;       // full line height, so letter tops aren't clipped (iOS)
  const pull = -fs * 0.36;     // …then overlap the lines to keep them tight
  const dot = fs * 0.36;       // clearly visible blue dot
  const textColor = ICON_GREY;
  const word = { fontSize: fs, lineHeight: lh, color: textColor };
  const next = { marginTop: pull };
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Menu"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
      <View style={[styles.tile, {
        width: size, height: size, borderRadius: size * 0.24,
        borderColor: ICON_GREY,
      }]}>
        <Text style={[styles.word, word]}>it{'\u2019'}s</Text>
        <Text style={[styles.word, word, next]}>for</Text>
        <View style={[styles.lastLine, next]}>
          <Text style={[styles.word, word]}>us</Text>
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: BRAND_DOT,
            marginLeft: dot * 0.25, marginBottom: lh * 0.24 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'flex-start', justifyContent: 'center',
    paddingLeft: '14%', borderWidth: 1.6, backgroundColor: 'transparent',
  },
  word: { fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false },
  lastLine: { flexDirection: 'row', alignItems: 'flex-end' },
});
