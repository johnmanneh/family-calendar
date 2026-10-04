import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GRADIENT_COLORS = ['#56e39f', '#4facfe', '#f857a6', '#f48c06'];
const SEASONS = ['🌸', '☀️', '🍂', '❄️'];

// compact=true  → just gradient bar + WHEN + gradient bar (for header use)
// compact=false → full logo with strings, emojis, scripture (for login)

export default function WhenLogo({ compact = false }) {
  return (
    <View style={styles.wrapper}>

      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={compact ? styles.barCompact : styles.bar}
      />

      <Text style={compact ? styles.textCompact : styles.text}>WHEN</Text>

      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={compact ? styles.barCompact : styles.bar}
      />

      {/* Full logo only — hanging strings + season emojis */}
      {!compact && (
        <>
          <View style={styles.seasonsRow}>
            {SEASONS.map((emoji, i) => (
              <View key={i} style={styles.seasonItem}>
                <View style={styles.string} />
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.scripture}>To every season, a time · Eccl. 3:1</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },

  // Full size (login screen)
  bar: {
    width: '80%',
    height: 3,
    borderRadius: 2,
  },
  text: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1d1d1f',
    letterSpacing: -2,
    marginVertical: 6,
  },

  // Compact (header)
  barCompact: {
    width: 80,
    height: 2,
    borderRadius: 2,
  },
  textCompact: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1d1d1f',
    letterSpacing: -1,
    marginVertical: 3,
  },

  // Seasons (full only)
  seasonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 2,
  },
  seasonItem: {
    alignItems: 'center',
  },
  string: {
    width: 1.5,
    height: 14,
    backgroundColor: '#d2d2d7',
  },
  emoji: {
    fontSize: 18,
    marginTop: 2,
  },
  scripture: {
    fontSize: 11,
    color: '#aeaeb2',
    fontStyle: 'italic',
    marginTop: 10,
    letterSpacing: 0.3,
  },
});
