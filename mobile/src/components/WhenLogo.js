import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../styles/WhenLogo.styles';

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

