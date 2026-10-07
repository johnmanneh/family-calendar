/**
 * RadialMenu.js
 *
 * Spider-Man PS5 gadget-wheel style radial pie menu.
 * Anchored to the FAB button (bottom-right), fans upward and leftward.
 * Three 60° pie slices expand from the FAB position:
 *   • New Event  (upper-left,  teal)
 *   • New Task   (straight up, purple)
 *   • Cancel     (upper-right, gray)
 *
 * Props:
 *   visible    — bool
 *   onClose    — fn
 *   onNewEvent — fn
 *   onNewTask  — fn
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
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// ── FAB geometry (must match HomeScreen.styles.js) ───────────────────────────
const FAB_RIGHT  = 24;   // distance from screen right edge
const FAB_BOTTOM = 32;   // distance from screen bottom edge
const FAB_SIZE   = 48;   // FAB diameter (fabSmall)

// ── Wheel geometry ────────────────────────────────────────────────────────────
const OUTER_R = 145;     // outer radius of pie slices
const INNER_R =  52;     // inner donut hole radius
const GAP     =   5;     // gap in degrees between slices

// Container is sized so its bottom-right corner sits exactly on the FAB centre.
// The SVG origin (cx, cy) is at that corner.
const CONTAINER_W = OUTER_R + 24;   // extra 24 px on left so labels aren't clipped
const CONTAINER_H = OUTER_R + 24;   // extra 24 px on top  for same reason
const CX = CONTAINER_W;             // SVG origin X = FAB centre (right edge)
const CY = CONTAINER_H;             // SVG origin Y = FAB centre (bottom edge)

// ── Sector definitions ───────────────────────────────────────────────────────
// The fan spans 195° → 345° (a 150° arc) pointing upper-left to upper-right.
// Three 50° sectors with 5° gaps between them.
//   195°–245°  New Event  → upper-left
//   250°–300°  New Task   → straight up
//   305°–345°  Cancel     → upper-right
const SECTORS = [
  {
    id:         'event',
    label:      'New Event',
    icon:       'calendar-outline',
    color:      '#1a8fa8',
    colorBright:'#22b5d0',
    startAngle: 195,
    endAngle:   245,
  },
  {
    id:         'task',
    label:      'New Task',
    icon:       'checkmark-circle-outline',
    color:      '#af52de',
    colorBright:'#ce7df9',
    startAngle: 250,
    endAngle:   300,
  },
  {
    id:         'cancel',
    label:      'Cancel',
    icon:       'close-circle-outline',
    color:      '#48484a',
    colorBright:'#636366',
    startAngle: 305,
    endAngle:   355,
  },
];

// ── SVG arc path helper ──────────────────────────────────────────────────────
function toRad(deg) { return (deg * Math.PI) / 180; }

function sectorPath(cx, cy, innerR, outerR, startAngle, endAngle) {
  const s = startAngle + GAP;
  const e = endAngle   - GAP;
  const x1 = cx + outerR * Math.cos(toRad(s));
  const y1 = cy + outerR * Math.sin(toRad(s));
  const x2 = cx + outerR * Math.cos(toRad(e));
  const y2 = cy + outerR * Math.sin(toRad(e));
  const x3 = cx + innerR * Math.cos(toRad(e));
  const y3 = cy + innerR * Math.sin(toRad(e));
  const x4 = cx + innerR * Math.cos(toRad(s));
  const y4 = cy + innerR * Math.sin(toRad(s));
  const largeArc = (e - s) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

// ── Icon midpoint helper ─────────────────────────────────────────────────────
function iconPos(sector) {
  const mid = (sector.startAngle + sector.endAngle) / 2;
  const r   = (INNER_R + OUTER_R) / 2;
  return {
    x: CX + r * Math.cos(toRad(mid)),
    y: CY + r * Math.sin(toRad(mid)),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RadialMenu({ visible, onClose, onNewEvent, onNewTask }) {
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, friction: 6, tension: 130, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 140, useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      setPressed(null);
    }
  }, [visible]);

  const handlePress = (sector) => {
    setPressed(sector.id);
    setTimeout(() => {
      onClose();
      if (sector.id === 'event')  onNewEvent();
      if (sector.id === 'task')   onNewTask();
    }, 110);
  };

  // Scale origin is at the FAB centre = bottom-right corner of the container.
  // React Native has no transformOrigin, so use the translate→scale→untranslate trick.
  const anchorTransform = [
    { translateX:  CONTAINER_W / 2 },
    { translateY:  CONTAINER_H / 2 },
    { scale: scaleAnim },
    { translateX: -CONTAINER_W / 2 },
    { translateY: -CONTAINER_H / 2 },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dim backdrop — tap outside to close */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: opacityAnim }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* Wheel container anchored to FAB position */}
      <Animated.View
        style={[
          styles.wheelContainer,
          { transform: anchorTransform, opacity: opacityAnim },
        ]}
        pointerEvents="box-none"
      >
        {/* SVG pie slices */}
        <Svg
          width={CONTAINER_W}
          height={CONTAINER_H}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {SECTORS.map(sector => (
            <Path
              key={sector.id}
              d={sectorPath(CX, CY, INNER_R, OUTER_R, sector.startAngle, sector.endAngle)}
              fill={pressed === sector.id ? sector.colorBright : sector.color}
              opacity={0.95}
            />
          ))}
        </Svg>

        {/* Pressable hit areas */}
        {SECTORS.map(sector => {
          const p = iconPos(sector);
          return (
            <Pressable
              key={sector.id}
              onPress={() => handlePress(sector)}
              onPressIn={() => setPressed(sector.id)}
              onPressOut={() => setPressed(null)}
              style={[styles.sectorHit, { left: p.x - 40, top: p.y - 40 }]}
            >
              <View style={styles.sectorContent}>
                <Ionicons name={sector.icon} size={24} color="#fff" style={styles.icon} />
                <Text style={styles.label}>{sector.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  // Bottom-right corner of this container = FAB centre
  wheelContainer: {
    position: 'absolute',
    right:    FAB_RIGHT  + FAB_SIZE / 2,   // right edge of container at FAB centre X
    bottom:   FAB_BOTTOM + FAB_SIZE / 2,   // bottom edge at FAB centre Y
    width:    CONTAINER_W,
    height:   CONTAINER_H,
  },

  sectorHit: {
    position:       'absolute',
    width:          80,
    height:         80,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sectorContent: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 3,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    color:           '#fff',
    fontSize:        11,
    fontWeight:      '700',
    letterSpacing:   0.2,
    textAlign:       'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius:  3,
    textShadowOffset:  { width: 0, height: 1 },
  },
});
