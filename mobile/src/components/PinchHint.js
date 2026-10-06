import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

// Animates two finger dots spreading apart then pinching together,
// so the user understands pinch-to-zoom without reading instructions.
export default function PinchHint({ visible }) {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const spread           = useRef(new Animated.Value(0)).current; // 0 = close, 1 = spread

  useEffect(() => {
    if (!visible) {
      Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      return;
    }

    // Fade in the whole hint
    Animated.timing(containerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Loop: spread out → hold → pinch in → hold → repeat (3 times then fade)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spread, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(spread, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.delay(300),
      ]),
      { iterations: 3 }
    );

    loop.start(() => {
      // Fade out after 3 cycles
      Animated.timing(containerOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    });

    return () => loop.stop();
  }, [visible]);

  // Left finger moves left, right finger moves right
  const TRAVEL = 28;
  const leftX  = spread.interpolate({ inputRange: [0, 1], outputRange: [0, -TRAVEL] });
  const rightX = spread.interpolate({ inputRange: [0, 1], outputRange: [0,  TRAVEL] });
  // Fingers also move slightly up when spreading (natural pinch arc)
  const fingersY = spread.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View style={[s.wrap, { opacity: containerOpacity }]} pointerEvents="none">
      {/* Two animated finger dots */}
      <View style={s.fingersRow}>
        <Animated.View style={[s.finger, { transform: [{ translateX: leftX }, { translateY: fingersY }] }]}>
          <View style={s.fingerDot} />
          <View style={s.fingerTip} />
        </Animated.View>
        <Animated.View style={[s.finger, { transform: [{ translateX: rightX }, { translateY: fingersY }] }]}>
          <View style={s.fingerDot} />
          <View style={s.fingerTip} />
        </Animated.View>
      </View>
      <Text style={s.label}>Pinch to switch  month · week · day</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  fingersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 6,
  },
  finger: {
    alignItems: 'center',
    gap: 2,
  },
  fingerTip: {
    width: 14,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#1a8fa8',
    opacity: 0.7,
  },
  fingerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a8fa8',
    opacity: 0.4,
  },
  label: {
    fontSize: 11,
    color: '#aeaeb2',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
