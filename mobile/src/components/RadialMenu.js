/**
 * RadialMenu.js
 *
 * Spider-Man PS5 gadget-wheel — 3 pie slices fan upward + leftward from the FAB.
 * Selected slice glows bright; others dim to 30% — just like the PS5 reference.
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
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/RadialMenu.styles';

// ── FAB constants (must match HomeScreen.styles.js) ──────────────────────────
const FAB_RIGHT  = 24;   // px from screen right edge
const FAB_BOTTOM = 32;   // px from screen bottom edge
const FAB_SIZE   = 48;   // diameter (fabSmall)

// ── Pie geometry ─────────────────────────────────────────────────────────────
const OUTER_R  = 155;    // outer radius
const INNER_R  =  58;    // inner donut hole
const GAP_DEG  =   2;    // degrees clipped from each side of every slice (visual gap)

// ── Fan layout ────────────────────────────────────────────────────────────────
// Fan sweeps from 181° (left) → 283° (almost straight up).
// Three equal 32° sectors separated by visual gaps.
//   Sector 0  Event   181°-212°  midpoint 196.5°  → upper-left
//   Sector 1  Task    215°-246°  midpoint 230.5°  → diag up-left
//   Sector 2  Cancel  249°-280°  midpoint 264.5°  → nearly straight up
const SECTORS = [
  {
    id:          'event',
    label:       'New Event',
    icon:        'calendar-outline',
    color:       '#1a8fa8',
    colorBright: '#3dd6f5',
    startAngle:  181,
    endAngle:    212,
  },
  {
    id:          'task',
    label:       'New Task',
    icon:        'checkmark-circle-outline',
    color:       '#9b30d9',
    colorBright: '#d07cf9',
    startAngle:  215,
    endAngle:    246,
  },
  {
    id:          'cancel',
    label:       'Cancel',
    icon:        'close-circle-outline',
    color:       '#3a3a3c',
    colorBright: '#636366',
    startAngle:  249,
    endAngle:    280,
  },
];

// ── Container geometry ────────────────────────────────────────────────────────
// The container's bottom-right corner sits at the FAB centre.
// All sector geometry is drawn relative to (CX, CY) = bottom-right of container.
// Fan only goes leftward/upward so nothing clips off-screen.
const CONTAINER_W = OUTER_R + 20;   // 175 — just enough past the leftmost sector
const CONTAINER_H = OUTER_R + 20;   // 175 — just enough past the topmost sector
const CX = CONTAINER_W;             // FAB centre inside SVG coords
const CY = CONTAINER_H;

// ── SVG helpers ───────────────────────────────────────────────────────────────
function toRad(deg) { return (deg * Math.PI) / 180; }

/** Donut sector path, with GAP_DEG visual breathing room on each edge. */
function sectorPath(startAngle, endAngle) {
  const s  = startAngle + GAP_DEG;
  const e  = endAngle   - GAP_DEG;
  const sr = toRad(s);
  const er = toRad(e);
  const ox1 = CX + OUTER_R * Math.cos(sr);
  const oy1 = CY + OUTER_R * Math.sin(sr);
  const ox2 = CX + OUTER_R * Math.cos(er);
  const oy2 = CY + OUTER_R * Math.sin(er);
  const ix2 = CX + INNER_R * Math.cos(er);
  const iy2 = CY + INNER_R * Math.sin(er);
  const ix1 = CX + INNER_R * Math.cos(sr);
  const iy1 = CY + INNER_R * Math.sin(sr);
  const large = (e - s) > 180 ? 1 : 0;
  return (
    `M ${ox1} ${oy1} ` +
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${ox2} ${oy2} ` +
    `L ${ix2} ${iy2} ` +
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${ix1} ${iy1} Z`
  );
}

/** Position of the icon/label centre inside the slice. */
function iconPos(sector) {
  const mid = (sector.startAngle + sector.endAngle) / 2;
  const r   = (INNER_R + OUTER_R) / 2;            // halfway between rings
  return {
    x: CX + r * Math.cos(toRad(mid)),
    y: CY + r * Math.sin(toRad(mid)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RadialMenu({ visible, onClose, onNewEvent, onNewTask }) {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(null);   // currently highlighted sector id

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, friction: 6, tension: 140, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 130, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0, duration: 90, useNativeDriver: true,
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

  // ── Scale from the FAB centre (= container bottom-right corner).
  // React Native has no transformOrigin, so we shift → scale → shift back.
  // The shift moves the scale origin from the container centre to its
  // bottom-right corner (where CX,CY lives = FAB centre).
  const halfW = CONTAINER_W / 2;
  const halfH = CONTAINER_H / 2;
  const shiftX = CONTAINER_W - halfW;   // = halfW  — distance from centre to right edge
  const shiftY = CONTAINER_H - halfH;   // = halfH

  const transform = [
    { translateX:  shiftX },
    { translateY:  shiftY },
    { scale: scaleAnim },
    { translateX: -shiftX },
    { translateY: -shiftY },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dark backdrop — tap anywhere outside to close */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: opacityAnim }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* ── Pie wheel — anchored to FAB bottom-right corner ── */}
      <Animated.View
        style={[styles.wheel, { transform, opacity: opacityAnim }]}
        pointerEvents="box-none"
      >
        {/* SVG layer — all slice geometry */}
        <Svg
          width={CONTAINER_W}
          height={CONTAINER_H}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {/* Pie slices */}
          {SECTORS.map(sector => {
            const isHovered = hovered === sector.id;
            const otherHovered = hovered !== null && !isHovered;
            return (
              <Path
                key={sector.id}
                d={sectorPath(sector.startAngle, sector.endAngle)}
                fill={isHovered ? sector.colorBright : sector.color}
                opacity={otherHovered ? 0.28 : isHovered ? 1.0 : 0.88}
              />
            );
          })}

          {/* Centre donut cap — sits over the pie origin (FAB centre) */}
          <Circle
            cx={CX}
            cy={CY}
            r={INNER_R - 2}
            fill="#1c1c1e"
            opacity={0.9}
          />
          {/* Glow ring around centre cap */}
          <Circle
            cx={CX}
            cy={CY}
            r={INNER_R - 2}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={2}
          />
        </Svg>

        {/* Pressable hit areas centred on each slice's midpoint */}
        {SECTORS.map(sector => {
          const pos = iconPos(sector);
          const isHovered = hovered === sector.id;
          const HIT = 78;   // tap zone size

          return (
            <Pressable
              key={sector.id}
              onPressIn={() => setHovered(sector.id)}
              onPressOut={() => setHovered(null)}
              onPress={() => handlePress(sector)}
              style={[
                styles.hit,
                {
                  left: pos.x - HIT / 2,
                  top:  pos.y - HIT / 2,
                  width:  HIT,
                  height: HIT,
                },
              ]}
            >
              <View style={styles.sliceContent}>
                <Ionicons
                  name={sector.icon}
                  size={isHovered ? 27 : 23}
                  color={isHovered ? '#ffffff' : 'rgba(255,255,255,0.82)'}
                  style={styles.sliceIcon}
                />
                <Text
                  style={[
                    styles.sliceLabel,
                    isHovered && styles.sliceLabelActive,
                  ]}
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

