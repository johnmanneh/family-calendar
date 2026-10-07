/**
 * RadialMenu.js
 *
 * Spider-Man PS5 gadget-wheel using the WHEN app's season design language.
 *   🍂  New Event  — Autumn leaf,  #f48c06 orange
 *   🌸  New Task   — Spring flower, #f857a6 pink
 *   ❄️  Cancel     — Winter ice,   #4facfe blue
 *   ☀️  Centre     — Summer sun  (the crescent origin all slices emerge from)
 *
 * Labels are rotated along each slice's radial axis so they read
 * "inside" their own sector — not horizontal across the whole page.
 *
 * Props:  visible, onClose, onNewEvent, onNewTask
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import styles from '../styles/RadialMenu.styles';

// ── FAB constants (must match HomeScreen.styles.js) ──────────────────────────
const FAB_RIGHT  = 24;
const FAB_BOTTOM = 32;
const FAB_SIZE   = 48;

// ── Pie geometry ─────────────────────────────────────────────────────────────
const OUTER_R = 158;
const INNER_R =  56;
const GAP_DEG =   2.5;   // visual breathing room on each side of a slice

// ── Sector definitions — WHEN season design language ─────────────────────────
// Fan: 181° (pointing left) → 280° (pointing nearly straight up).
// Three 32°-wide sectors with visual 5° gaps between them.
//   Event   181°–212°  mid 196.5°  → upper-left   🍂
//   Task    215°–246°  mid 230.5°  → diagonal      🌸
//   Cancel  249°–280°  mid 264.5°  → nearly up     ❄️
const SECTORS = [
  {
    id:          'event',
    label:       'New Event',
    emoji:       '🍂',
    color:       'rgba(244,140,6,0.85)',    // autumn orange
    colorBright: '#f4a830',
    startAngle:  181,
    endAngle:    212,
  },
  {
    id:          'task',
    label:       'New Task',
    emoji:       '❄️',                     // winter ice → task
    color:       'rgba(79,172,254,0.85)',   // winter blue
    colorBright: '#7fcfff',
    startAngle:  215,
    endAngle:    246,
  },
  {
    id:          'cancel',
    label:       'Cancel',
    emoji:       '🌸',                     // spring flower → cancel
    color:       'rgba(248,87,166,0.85)',   // spring pink
    colorBright: '#ff8fd1',
    startAngle:  249,
    endAngle:    280,
  },
];

// ── Container geometry ────────────────────────────────────────────────────────
// Bottom-right corner of this container = FAB centre.
// Sectors only fan leftward + upward, so nothing clips off-screen.
const CONTAINER_W = OUTER_R + 22;
const CONTAINER_H = OUTER_R + 22;
const CX = CONTAINER_W;   // FAB centre in SVG coords
const CY = CONTAINER_H;

// ── Helpers ───────────────────────────────────────────────────────────────────
function toRad(deg) { return (deg * Math.PI) / 180; }

function sectorPath(startAngle, endAngle) {
  const s  = startAngle + GAP_DEG;
  const e  = endAngle   - GAP_DEG;
  const ox1 = CX + OUTER_R * Math.cos(toRad(s));
  const oy1 = CY + OUTER_R * Math.sin(toRad(s));
  const ox2 = CX + OUTER_R * Math.cos(toRad(e));
  const oy2 = CY + OUTER_R * Math.sin(toRad(e));
  const ix2 = CX + INNER_R * Math.cos(toRad(e));
  const iy2 = CY + INNER_R * Math.sin(toRad(e));
  const ix1 = CX + INNER_R * Math.cos(toRad(s));
  const iy1 = CY + INNER_R * Math.sin(toRad(s));
  const large = (e - s) > 180 ? 1 : 0;
  return (
    `M ${ox1} ${oy1} ` +
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${ox2} ${oy2} ` +
    `L ${ix2} ${iy2} ` +
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${ix1} ${iy1} Z`
  );
}

/** Screen-space centre of a sector (icon + label anchor point). */
function sliceCentre(sector) {
  const mid = (sector.startAngle + sector.endAngle) / 2;
  const r   = (INNER_R + OUTER_R) / 2;
  return {
    x:   CX + r * Math.cos(toRad(mid)),
    y:   CY + r * Math.sin(toRad(mid)),
    mid,                          // mid-angle (degrees)
    rot: mid - 270,               // rotation so content reads radially outward
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RadialMenu({ visible, onClose, onNewEvent, onNewTask }) {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, friction: 6, tension: 140, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 120, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0, duration: 80, useNativeDriver: true,
      }).start();
      opacityAnim.setValue(0);
      setHovered(null);
    }
  }, [visible]);

  const handlePress = (sector) => {
    setTimeout(() => {
      onClose();
      if (sector.id === 'event')  onNewEvent();
      if (sector.id === 'task')   onNewTask();
    }, 100);
  };

  // Scale from container's bottom-right corner (= FAB centre).
  // React Native has no transformOrigin — use translate → scale → un-translate.
  const hw = CONTAINER_W / 2;
  const hh = CONTAINER_H / 2;
  const transform = [
    { translateX:  hw },
    { translateY:  hh },
    { scale: scaleAnim },
    { translateX: -hw },
    { translateY: -hh },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: opacityAnim }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* Pie wheel — bottom-right corner anchored at FAB centre */}
      <Animated.View
        style={[styles.wheel, { transform, opacity: opacityAnim }]}
        pointerEvents="box-none"
      >
        {/* SVG — slice shapes */}
        <Svg
          width={CONTAINER_W}
          height={CONTAINER_H}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {SECTORS.map(sector => {
            const active = hovered === sector.id;
            const dim    = hovered !== null && !active;
            return (
              <Path
                key={sector.id}
                d={sectorPath(sector.startAngle, sector.endAngle)}
                fill={active ? sector.colorBright : sector.color}
                opacity={dim ? 0.22 : active ? 1.0 : 0.9}
              />
            );
          })}

          {/* Warm glow ring only — no dark fill so the FAB shows through */}
          <Circle
            cx={CX} cy={CY} r={INNER_R + 4}
            fill="none" stroke="rgba(247,183,49,0.4)" strokeWidth={4}
          />
        </Svg>

        {/* ☀️ Sun emoji — the crescent origin where all slices radiate from */}
        <View style={styles.sunHub} pointerEvents="none">
          <Text style={styles.sunEmoji}>☀️</Text>
        </View>

        {/* Pressable hit zones — one per slice */}
        {SECTORS.map(sector => {
          const { x, y, rot } = sliceCentre(sector);
          const active = hovered === sector.id;
          const HIT    = 80;

          return (
            <Pressable
              key={sector.id}
              onPressIn={() => setHovered(sector.id)}
              onPressOut={() => setHovered(null)}
              onPress={() => handlePress(sector)}
              style={[styles.hit, { left: x - HIT / 2, top: y - HIT / 2, width: HIT, height: HIT }]}
            >
              {/*
                Rotate the entire content block so the emoji + label
                read along the sector's radial axis, not flat across the page.
                rot = midAngle - 270  →  0° when sector points straight up.
              */}
              <View style={[styles.sliceContent, { transform: [{ rotate: `${rot}deg` }] }]}>
                <Text style={[styles.emoji, active && styles.emojiActive]}>
                  {sector.emoji}
                </Text>
                <Text
                  style={[styles.label, active && styles.labelActive]}
                  numberOfLines={2}
                >
                  {sector.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </Modal>
  );
}
