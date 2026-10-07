/**
 * RadialMenu.js  — WHEN seasonal gadget wheel
 *
 * Two slices fan upper-left from the FAB. Sun = cancel (tap it to close).
 * Emoji sits in the inner zone; label is always visible in the outer zone.
 * No text rotation — labels read horizontally.
 *
 *   🍂 New Event  — autumn orange   186°–229°
 *   ❄️ New Task   — winter blue     232°–274°
 *   ☀️ Sun centre — tap to cancel
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

// ── FAB constants (must match HomeScreen.styles.js) ──────────────────────────
const FAB_RIGHT  = 24;
const FAB_BOTTOM = 32;
const FAB_SIZE   = 48;

// ── Pie geometry ─────────────────────────────────────────────────────────────
const OUTER_R  = 162;
const INNER_R  =  58;
const SUN_R    =  72;   // larger than INNER_R → covers FAB + fills inner gap
const EMOJI_R  =  94;   // inner zone — emoji anchor
const LABEL_R  = 135;   // outer zone — label anchor (always visible)
const GAP_DEG  =   2.5;

// Two sectors only — sun is the cancel
const SECTORS = [
  {
    id:          'event',
    label:       'New\nEvent',
    emoji:       '🍂',
    color:       'rgba(244,140,6,0.9)',
    colorBright: '#f7b32b',
    startAngle:  186,
    endAngle:    229,
  },
  {
    id:          'task',
    label:       'New\nTask',
    emoji:       '❄️',
    color:       'rgba(79,172,254,0.9)',
    colorBright: '#7fd5ff',
    startAngle:  232,
    endAngle:    274,
  },
];

// ── Container: FAB centre lives at (CX_IN, CY_IN) inside the container ───────
// Left/above FAB: need OUTER_R + padding for slices
// Right/below FAB: need SUN_R + padding for sun overhang
const PAD   = 18;
const CX_IN = OUTER_R + PAD;   // 180
const CY_IN = OUTER_R + PAD;   // 180
const C_W   = CX_IN + SUN_R + PAD;   // 270 — right side needs sun overhang
const C_H   = CY_IN + SUN_R + PAD;   // 270

// ── Helpers ───────────────────────────────────────────────────────────────────
function toRad(d) { return (d * Math.PI) / 180; }

function sectorPath(s0, e0) {
  const s = s0 + GAP_DEG, e = e0 - GAP_DEG;
  const or = OUTER_R, ir = INNER_R;
  const ox1 = CX_IN + or * Math.cos(toRad(s)), oy1 = CY_IN + or * Math.sin(toRad(s));
  const ox2 = CX_IN + or * Math.cos(toRad(e)), oy2 = CY_IN + or * Math.sin(toRad(e));
  const ix2 = CX_IN + ir * Math.cos(toRad(e)), iy2 = CY_IN + ir * Math.sin(toRad(e));
  const ix1 = CX_IN + ir * Math.cos(toRad(s)), iy1 = CY_IN + ir * Math.sin(toRad(s));
  return `M ${ox1} ${oy1} A ${or} ${or} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${ir} ${ir} 0 0 0 ${ix1} ${iy1} Z`;
}

function radialPt(sector, radius) {
  const mid = (sector.startAngle + sector.endAngle) / 2;
  return { x: CX_IN + radius * Math.cos(toRad(mid)), y: CY_IN + radius * Math.sin(toRad(mid)) };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RadialMenu({ visible, onClose, onNewEvent, onNewTask }) {
  const { width: SW, height: SH } = Dimensions.get('window');
  const fabCX = SW - FAB_RIGHT  - FAB_SIZE / 2;
  const fabCY = SH - FAB_BOTTOM - FAB_SIZE / 2;

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0); opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, { toValue: 0, duration: 80, useNativeDriver: true }).start();
      opacityAnim.setValue(0);
      setHovered(null);
    }
  }, [visible]);

  const handlePress = (sector) => {
    setTimeout(() => {
      onClose();
      if (sector.id === 'event') onNewEvent();
      if (sector.id === 'task')  onNewTask();
    }, 100);
  };

  // Scale from FAB centre (CX_IN, CY_IN) — not from container centre
  const shiftX = CX_IN - C_W / 2;
  const shiftY = CY_IN - C_H / 2;
  const transform = [
    { translateX:  shiftX }, { translateY:  shiftY },
    { scale: scaleAnim },
    { translateX: -shiftX }, { translateY: -shiftY },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>

      {/* Dim backdrop */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: opacityAnim }]} pointerEvents="none" />
      </Pressable>

      {/* Wheel — positioned so (CX_IN, CY_IN) lands on FAB centre */}
      <Animated.View
        style={[s.wheel, { left: fabCX - CX_IN, top: fabCY - CY_IN, width: C_W, height: C_H, transform, opacity: opacityAnim }]}
        pointerEvents="box-none"
      >
        {/* SVG slices */}
        <Svg width={C_W} height={C_H} style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {SECTORS.map(sec => {
            const active = hovered === sec.id;
            const dim    = hovered !== null && !active;
            return (
              <Path key={sec.id}
                d={sectorPath(sec.startAngle, sec.endAngle)}
                fill={active ? sec.colorBright : sec.color}
                opacity={dim ? 0.22 : active ? 1.0 : 0.92}
              />
            );
          })}
          {/* Golden ring at inner edge */}
          <Circle cx={CX_IN} cy={CY_IN} r={INNER_R + 2}
            fill="none" stroke="rgba(255,210,60,0.6)" strokeWidth={3} />
        </Svg>

        {/* ☀️ Sun hub — covers FAB button + inner donut gap. Tap = cancel. */}
        <Pressable
          onPress={onClose}
          style={[s.sunHub, { left: CX_IN - SUN_R, top: CY_IN - SUN_R, width: SUN_R * 2, height: SUN_R * 2, borderRadius: SUN_R }]}
        >
          <Text style={s.sunEmoji}>☀️</Text>
        </Pressable>

        {/* Slice content: emoji (inner) + label (outer, always visible) */}
        {SECTORS.map(sec => {
          const active = hovered === sec.id;
          const dim    = hovered !== null && !active;
          const ep     = radialPt(sec, EMOJI_R);
          const lp     = radialPt(sec, LABEL_R);
          const EH     = 58;
          const LW     = 88, LH = 44;

          return (
            <View key={sec.id} pointerEvents="box-none">
              {/* Emoji */}
              <Pressable
                onPressIn={() => setHovered(sec.id)}
                onPressOut={() => setHovered(null)}
                onPress={() => handlePress(sec)}
                style={[s.hit, { left: ep.x - EH/2, top: ep.y - EH/2, width: EH, height: EH }]}
              >
                <Text style={[s.emoji, active && s.emojiActive, dim && s.dimmed]}>
                  {sec.emoji}
                </Text>
              </Pressable>

              {/* Label — always visible, outer zone */}
              <View pointerEvents="none"
                style={[s.labelBox, { left: lp.x - LW/2, top: lp.y - LH/2, width: LW, height: LH }]}
              >
                <Text style={[s.label, active && s.labelActive, dim && s.dimmed]} numberOfLines={2}>
                  {sec.label}
                </Text>
              </View>
            </View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  wheel: {
    position: 'absolute',
  },
  sunHub: {
    position:        'absolute',
    backgroundColor: 'rgba(28,18,4,0.82)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     3,
    borderColor:     'rgba(255,210,60,0.65)',
    shadowColor:     '#f7b731',
    shadowOpacity:   0.6,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: 0 },
    elevation:       10,
  },
  sunEmoji: {
    fontSize:         56,
    textShadowColor:  'rgba(255,210,50,0.7)',
    textShadowRadius:  10,
    textShadowOffset:  { width: 0, height: 0 },
  },
  hit: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize:         30,
    textShadowColor:  'rgba(0,0,0,0.55)',
    textShadowRadius:  5,
    textShadowOffset:  { width: 0, height: 2 },
  },
  emojiActive: { fontSize: 36 },
  dimmed:      { opacity: 0.28 },
  labelBox: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    color:           'rgba(255,255,255,0.90)',
    fontSize:        13,
    fontWeight:      '800',
    textAlign:       'center',
    letterSpacing:    0.2,
    lineHeight:       17,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius:  6,
    textShadowOffset:  { width: 0, height: 1 },
  },
  labelActive: { color: '#ffffff', fontSize: 14 },
});
