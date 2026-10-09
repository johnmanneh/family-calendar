/**
 * RadialMenu.js — WHEN sun menu
 *
 * Tap the + and it turns into the ☀️ sun. Two buttons roll out of it along a
 * crescent (an arc up-left of the sun). They use the same card form as the
 * event cards in the home list — rounded, white, coloured stripe — so the menu
 * feels like part of the app, not a separate gadget.
 *
 *   New Event — autumn orange stripe   (lower point of the crescent)
 *   New Task  — winter blue stripe     (upper point of the crescent)
 *   ☀️ Sun    — tap to close
 *
 * Opening/closing uses the treadmill roll (rotateX) like the list and drawer.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme';
import { TILT_DIR } from './TreadmillList';

// ── FAB constants (must match HomeScreen.styles.js) ──────────────────────────
const FAB_RIGHT  = 24;
const FAB_BOTTOM = 32;
const FAB_SIZE   = 48;
const SUN_R      = FAB_SIZE / 2;

// ── Crescent geometry ────────────────────────────────────────────────────────
// Angles: 0° = right, 90° = down (screen coordinates). 180°–270° = up-left.
const ARC_R  = 128;      // distance from the sun centre to each card centre
const CARD_W = 158;
const CARD_H = 58;
const ROLL   = 55;       // degrees of treadmill roll while a card comes out
const BACKDROP_FADE = 0.78;  // how much the list behind fades (1 = hidden)

const ITEMS = [
  // Seasons: autumn leaf for events, winter snow for tasks (Ionicons outline,
  // same icon family as the rest of the app)
  { id: 'event', label: 'New Event', icon: 'leaf-outline', stripe: '#f48c06', angle: 196 },
  { id: 'task',  label: 'New Task',  icon: 'snow-outline', stripe: '#4facfe', angle: 246 },
];

const toRad = d => (d * Math.PI) / 180;

export default function RadialMenu({ visible, fabCenter, onClose, onNewEvent, onNewTask }) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { width: SW, height: SH } = Dimensions.get('window');

  // measure() gives screen coordinates; the Modal is translucent (edge-to-edge),
  // so they line up directly.
  const fabCX = fabCenter?.x ?? SW - FAB_RIGHT  - FAB_SIZE / 2;
  const fabCY = fabCenter?.y ?? SH - FAB_BOTTOM - FAB_SIZE / 2 - insets.bottom;

  const backdrop = useRef(new Animated.Value(0)).current;
  const sun      = useRef(new Animated.Value(0)).current;
  const rolls    = useRef(ITEMS.map(() => new Animated.Value(0))).current;
  const [mounted, setMounted] = useState(false);
  const [pressed, setPressed] = useState(null);
  const closing = useRef(false);

  // ── Open: sun pops, cards roll out one after another ──────────────────────
  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    setMounted(true);
    backdrop.setValue(0); sun.setValue(0); rolls.forEach(r => r.setValue(0));
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(sun, { toValue: 1, friction: 6, tension: 160, useNativeDriver: true }),
      Animated.stagger(70, rolls.map(r =>
        Animated.spring(r, { toValue: 1, friction: 8, tension: 110, useNativeDriver: true })
      )),
    ]).start();
  }, [visible]);

  // Safety net: if the parent hides the menu without going through our close
  // animation, drop the (invisible) Modal so it can never sit on top and
  // swallow every tap.
  useEffect(() => {
    if (!visible && mounted && !closing.current) setMounted(false);
  }, [visible, mounted]);

  // ── Close: cards roll back into the sun (last one first), then hide ───────
  const animateClose = (after) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.stagger(50, [...rolls].reverse().map(r =>
        Animated.timing(r, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      )),
      Animated.timing(backdrop, { toValue: 0, duration: 230, useNativeDriver: true }),
      Animated.timing(sun, { toValue: 0, duration: 200, delay: 60, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      setPressed(null);
      onClose();
      after && after();
    });
  };

  const handlePress = (item) => {
    animateClose(() => {
      if (item.id === 'event') onNewEvent();
      if (item.id === 'task')  onNewTask();
    });
  };

  if (!mounted && !visible) return null;

  return (
    <Modal
      visible={mounted || visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => animateClose()}
    >
      {/* Soft dim — tap anywhere to close */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={() => animateClose()}>
        {/* Fades the list behind with the page colour, so only the menu stands out */}
        <Animated.View
          style={[s.backdrop, { backgroundColor: c.bg, opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, BACKDROP_FADE] }) }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* Crescent of cards */}
      {ITEMS.map((item, i) => {
        const r  = rolls[i];
        const dx = ARC_R * Math.cos(toRad(item.angle));
        const dy = ARC_R * Math.sin(toRad(item.angle));
        const isPressed = pressed === item.id;
        return (
          <Animated.View
            key={item.id}
            style={[
              s.cardWrap,
              {
                left: fabCX + dx - CARD_W / 2,
                top:  fabCY + dy - CARD_H / 2,
                opacity: r.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                transform: [
                  // start at the sun, travel out along the crescent
                  { translateX: r.interpolate({ inputRange: [0, 1], outputRange: [-dx, 0] }) },
                  { translateY: r.interpolate({ inputRange: [0, 1], outputRange: [-dy, 0] }) },
                  { perspective: 700 },
                  // treadmill roll: comes up off the drum and settles flat
                  { rotateX: r.interpolate({ inputRange: [0, 1], outputRange: [`${ROLL * TILT_DIR}deg`, '0deg'] }) },
                  { scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.5, isPressed ? 0.96 : 1] }) },
                ],
              },
            ]}
          >
            <Pressable
              onPressIn={() => setPressed(item.id)}
              onPressOut={() => setPressed(null)}
              onPress={() => handlePress(item)}
              style={[s.card, { backgroundColor: c.surface }]}
            >
              {/* light seasonal tint over the white card */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: item.stripe + '14' }]} />
              <View style={[s.stripe, { backgroundColor: item.stripe }]} />
              <View style={[s.iconCircle, { backgroundColor: item.stripe + '22' }]}>
                <Ionicons name={item.icon} size={22} color={item.stripe} />
              </View>
              <Text style={[s.label, { color: c.text }]} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* ☀️ Sun — sits exactly on the + button. Tap = close */}
      <Animated.View
        style={[
          s.sunWrap,
          {
            left: fabCX - SUN_R, top: fabCY - SUN_R,
            transform: [
              { scale: sun.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              { rotate: sun.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
            ],
            opacity: sun,
          },
        ]}
      >
        {/* Sun button: warm gradient disc + clean sun icon (same icon family as the app) */}
        <Pressable onPress={() => animateClose()} style={({ pressed: p }) => [s.sun, p && { transform: [{ scale: 0.92 }] }]}>
          <LinearGradient
            colors={['#ffd60a', '#f7b32b', '#f48c06']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.9, y: 1 }}
            style={s.sunDisc}
          >
            <Ionicons name="sunny" size={26} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  cardWrap: {
    position: 'absolute',
    width: CARD_W, height: CARD_H,
    // shadow lives on the wrapper so it isn't clipped by the card's radius
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 8,
    borderRadius: 18,
  },
  card: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 18, overflow: 'hidden',
    paddingLeft: 14, paddingRight: 14,
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, flexShrink: 1 },

  sunWrap: {
    position: 'absolute',
    width: SUN_R * 2, height: SUN_R * 2,
    borderRadius: SUN_R,
    // warm glow instead of a dark shadow
    shadowColor: '#f48c06', shadowOpacity: 0.55, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 10,
  },
  sun: { flex: 1, borderRadius: SUN_R },
  sunDisc: {
    flex: 1, borderRadius: SUN_R,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)',   // soft rim so it reads as a button
  },
});
