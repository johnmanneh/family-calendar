/**
 * TreadmillList.js — FlatList where rows "roll under" the FAB.
 *
 * Like the iOS number picker: rows are full size in the middle of the list,
 * and as they approach the bottom they tilt back, shrink and fade — as if the
 * list were a treadmill belt disappearing under the + button.
 *
 *   ┌──────────────────────┐
 *   │  rows tilt + fade     │  ← TOP_ZONE (only once the list is scrolled)
 *   │  normal rows          │
 *   │                       │  ← ZONE starts (ROLL_ZONE above the FAB line)
 *   │  rows tilt + fade     │
 *   │ ─ ─ ─ ─ ─ ─ ─ ─ ( + ) │  ← FAB line: rows are almost gone here
 *   └──────────────────────┘
 *
 * At both ends the row's outer edge tips AWAY from the viewer, like a
 * treadmill belt going round its roller:
 *   top    — pivot on the row's bottom edge, top edge recedes   (+rotateX)
 *   bottom — pivot on the row's top edge,   bottom edge recedes (−rotateX)
 *
 * Drop-in replacement for FlatList. Extra bottom padding is added so the last
 * row can always be scrolled up to full size.
 */

import React, { createContext, useContext, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';

// Rows start tilting when they reach the TOP of the + button and are almost
// gone near the bottom of the list. FAB sits 32pt above the list bottom and is
// 48pt tall, so its top edge is 80pt up.
//   FAB_LINE  — distance from list bottom where rows are fully "under" (16)
//   ROLL_ZONE — band above that where they tilt; 16 + 64 = 80 = FAB top edge
export const FAB_LINE  = 16;
export const ROLL_ZONE = 64;
// Height of the band at the top of the list where rows roll away upward.
// Only engages after the list has scrolled TOP_ZONE points, so nothing is
// tilted when the list is at rest.
export const TOP_ZONE  = 48;

// iOS and Android apply rotateX in opposite directions. The angles below were
// tuned on Android; on iOS we flip them so both platforms tip rows AWAY.
export const TILT_DIR = Platform.OS === 'ios' ? -1 : 1;
const BOTTOM_TILT = `${-60 * TILT_DIR}deg`;   // bottom edge recedes
const TOP_TILT    = `${ 60 * TILT_DIR}deg`;   // top edge recedes

const TreadmillContext = createContext(null);

// Each FlatList cell. FlatList passes `onLayout` and `style`; we must forward
// them. layout.y is the row's offset inside the scroll content.
function TreadmillCell({ children, style, onLayout, ...rest }) {
  const ctx = useContext(TreadmillContext);
  const [layout, setLayout] = useState(null);

  let topStyle = null;      // outer view: rolls away at the TOP edge
  let bottomStyle = null;   // inner view: rolls under the FAB at the BOTTOM
  if (ctx && layout && ctx.viewportH > 0) {
    const { y, height: h } = layout;

    // ── Bottom: row rolls under the FAB ────────────────────────────────────
    const zoneEnd   = ctx.viewportH - FAB_LINE - ctx.bottomInset;   // row top here → gone
    const zoneStart = zoneEnd - ROLL_ZONE;        // row bottom here → normal
    const bottom = ctx.scrollY.interpolate({
      inputRange:  [y - zoneEnd, y + h - zoneStart],
      outputRange: [0, 1],                        // 0 = under, 1 = normal
      extrapolate: 'clamp',
    });
    bottomStyle = {
      opacity: bottom.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] }),
      transformOrigin: 'top',
      transform: [
        { perspective: 700 },
        { rotateX: bottom.interpolate({ inputRange: [0, 1], outputRange: [BOTTOM_TILT, '0deg'] }) },
        { scale:   bottom.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
      ],
    };

    // ── Top: row rolls away over the top edge ──────────────────────────────
    // 0 = normal (row top at or below TOP_ZONE), 1 = gone (row bottom at 0)
    const topRaw = ctx.scrollY.interpolate({
      inputRange:  [y - TOP_ZONE, y + h],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    // Fade the top effect in over the first TOP_ZONE points of scrolling
    const engage = ctx.scrollY.interpolate({
      inputRange:  [0, TOP_ZONE],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const top = Animated.multiply(topRaw, engage);
    topStyle = {
      opacity: top.interpolate({ inputRange: [0, 1], outputRange: [1, 0.08] }),
      transformOrigin: 'bottom',
      transform: [
        { perspective: 700 },
        { rotateX: top.interpolate({ inputRange: [0, 1], outputRange: ['0deg', TOP_TILT] }) },
        { scale:   top.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
      ],
    };
  }

  return (
    <Animated.View
      {...rest}
      style={[style, topStyle]}
      onLayout={(e) => {
        onLayout?.(e);
        const { y, height } = e.nativeEvent.layout;
        setLayout((prev) => (prev && prev.y === y && prev.height === height ? prev : { y, height }));
      }}
    >
      <Animated.View style={bottomStyle}>{children}</Animated.View>
    </Animated.View>
  );
}

// bottomInset: pass the safe-area bottom inset when the list runs under the
// system nav bar (full-screen), so the roll zone still lines up with the FAB.
export default function TreadmillList({ contentContainerStyle, onScroll, onLayout, bottomInset = 0, ...props }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [viewportH, setViewportH] = useState(0);

  return (
    <TreadmillContext.Provider value={{ scrollY, viewportH, bottomInset }}>
      <Animated.FlatList
        {...props}
        CellRendererComponent={TreadmillCell}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: FAB_LINE + ROLL_ZONE + bottomInset }]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: onScroll },
        )}
        onLayout={(e) => {
          onLayout?.(e);
          setViewportH(e.nativeEvent.layout.height);
        }}
      />
    </TreadmillContext.Provider>
  );
}
