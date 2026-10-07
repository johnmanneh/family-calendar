/**
 * RadialMenu.js
 *
 * Spider-Man PS5 gadget-wheel style radial pie menu.
 * Opens as an animated circular overlay with three pie slices:
 *   • New Event  (top-left,  teal)
 *   • New Task   (top-right, purple)
 *   • Cancel     (bottom,    gray)
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
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Geometry constants ───────────────────────────────────────────────────────
const CX         = SW / 2;   // centre X of SVG
const CY         = SH / 2;   // centre Y of SVG
const INNER_R    = 62;        // inner donut radius (dead zone)
const OUTER_R    = 148;       // outer edge of pie slices
const GAP        = 5;         // gap in degrees between slices

// ── Sector definitions ───────────────────────────────────────────────────────
// Angles are in standard SVG/Math convention (0° = right, clockwise positive).
// We arrange the three 120° slices so:
//   Sector 0 (New Event):  270° – 30°  → top-left arc
//   Sector 1 (New Task):    30° – 150° → top-right arc
//   Sector 2 (Cancel):     150° – 270° → bottom arc
const SECTORS = [
  {
    id:         'event',
    label:      'New Event',
    icon:       'calendar-outline',
    color:      '#1a8fa8',
    colorBright:'#22b5d0',
    startAngle: 270,
    endAngle:   390,   // = 30° mod 360, but keep > startAngle for arc math
  },
  {
    id:         'task',
    label:      'New Task',
    icon:       'checkmark-circle-outline',
    color:      '#af52de',
    colorBright:'#ce7df9',
    startAngle: 30,
    endAngle:   150,
  },
  {
    id:         'cancel',
    label:      'Cancel',
    icon:       'close-circle-outline',
    color:      '#48484a',
    colorBright:'#636366',
    startAngle: 150,
    endAngle:   270,
  },
];

// ── SVG arc path helper ──────────────────────────────────────────────────────
function toRad(deg) { return (deg * Math.PI) / 180; }

function sectorPath(cx, cy, innerR, outerR, startAngle, endAngle) {
  // Add gap padding
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

// ── Icon position helper ─────────────────────────────────────────────────────
function iconPosition(sector) {
  const midAngle = (sector.startAngle + sector.endAngle) / 2;
  const iconR    = (INNER_R + OUTER_R) / 2;
  return {
    x: CX + iconR * Math.cos(toRad(midAngle)),
    y: CY + iconR * Math.sin(toRad(midAngle)),
  };
}

// ── RadialMenu ───────────────────────────────────────────────────────────────

export default function RadialMenu({ visible, onClose, onNewEvent, onNewTask }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(null);   // which sector is highlighted

  // Spring open when visible changes to true
  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Snap closed immediately (close is always triggered by an action)
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      setPressed(null);
    }
  }, [visible]);

  const handlePress = (sector) => {
    setPressed(sector.id);
    // Small delay so the highlight is visible before the modal closes
    setTimeout(() => {
      onClose();
      if (sector.id === 'event')  { onNewEvent(); }
      if (sector.id === 'task')   { onNewTask();  }
      if (sector.id === 'cancel') { /* just close */ }
    }, 120);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop — tapping outside also closes */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: opacityAnim }]}
          pointerEvents="none"
        />
      </Pressable>

      {/* Animated pie wheel */}
      <Animated.View
        style={[
          styles.wheelContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* SVG pie slices */}
        <Svg
          width={SW}
          height={SH}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          {SECTORS.map(sector => (
            <Path
              key={sector.id}
              d={sectorPath(CX, CY, INNER_R, OUTER_R, sector.startAngle, sector.endAngle)}
              fill={pressed === sector.id ? sector.colorBright : sector.color}
              opacity={0.93}
            />
          ))}
        </Svg>

        {/* Pressable hit areas + icons/labels — absolutely positioned Views */}
        {SECTORS.map(sector => {
          const pos = iconPosition(sector);
          // Tap zone is a generous square centred on the icon position
          return (
            <Pressable
              key={sector.id}
              onPress={() => handlePress(sector)}
              onPressIn={() => setPressed(sector.id)}
              onPressOut={() => setPressed(null)}
              style={[
                styles.sectorHit,
                {
                  left:  pos.x - 44,
                  top:   pos.y - 44,
                },
              ]}
            >
              {/* Icon + label stacked vertically */}
              <View style={styles.sectorContent}>
                <Ionicons
                  name={sector.icon}
                  size={26}
                  color="#fff"
                  style={styles.sectorIcon}
                />
                <Text style={styles.sectorLabel}>{sector.label}</Text>
              </View>
            </Pressable>
          );
        })}

        {/* Centre dot — the small circle between the slices */}
        <View style={styles.centreDot} pointerEvents="none" />
      </Animated.View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  wheelContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  sectorHit: {
    position:       'absolute',
    width:          88,
    height:         88,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sectorContent: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  sectorIcon: {
    marginBottom: 4,
    // Subtle drop shadow on iOS
    shadowColor:  '#000',
    shadowOpacity: 0.35,
    shadowRadius:  4,
    shadowOffset:  { width: 0, height: 2 },
  },
  sectorLabel: {
    color:      '#fff',
    fontSize:   12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign:  'center',
    textShadowColor:  'rgba(0,0,0,0.5)',
    textShadowRadius:  3,
    textShadowOffset:  { width: 0, height: 1 },
  },
  centreDot: {
    position:        'absolute',
    left:            CX - 18,
    top:             CY - 18,
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: '#1c1c1e',
    borderWidth:     2,
    borderColor:     'rgba(255,255,255,0.15)',
  },
});
