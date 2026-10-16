/**
 * AppIconButton — the "it's / for / us." app icon as a small tile.
 * Used top-left on Home as the menu button (replaces the gradient hamburger
 * when HEADER_STYLE is 'logo' in HomeScreen).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '../context/ThemeContext';

const BRAND_DOT = '#005CFD';   // the blue dot from the app icon

// Clean wordmark: no frame, no fill — just the text (normal text colour,
// white in dark mode) and the blue brand dot, blending into the header.
export default function AppIconButton({ onPress, size = 36 }) {
  const fs  = size * 0.36;     // three lines fill the header height
  const lh  = fs * 1.15;       // full line height, so letter tops aren't clipped (iOS)
  // …then pull the lines a little closer (not touching). Android adds more
  // space above letters than iOS, so it needs a bigger pull to look the same.
  const pull = -fs * (Platform.OS === 'android' ? 0.42 : 0.26);
  const dot = fs * 0.36;       // clearly visible blue dot
  const { t } = useTranslation();
  const textColor = useColorScheme() === 'dark' ? '#fff' : '#1d1d1f';
  const word = { fontSize: fs, lineHeight: lh, color: textColor };
  const next = { marginTop: pull };
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={t('common.menu')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
      <View style={[styles.tile, { height: size }]}>
        {['it\u2019s', 'for', 'us'].map((w, i) => (
          <View key={w} style={[styles.row, i > 0 && next]}>
            {/* allowFontScaling off: the logo must not grow with the phone's
                large-text setting, or it overflows the header */}
            <Text style={[styles.word, word]} allowFontScaling={false}>{w}</Text>
            {i === 2 && (
              <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: BRAND_DOT,
                marginLeft: dot * 0.25, alignSelf: 'flex-end', marginBottom: lh * 0.24 }} />
            )}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'flex-start', justifyContent: 'center',
  },
  word: { fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false },
  row:  { flexDirection: 'row', alignItems: 'center' },
});
