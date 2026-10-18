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
import { Animated, Platform, View } from 'react-native';

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

// Neutral style with the same transform shape as the rolling styles, so switching
// between them always overwrites every value on the native view.
const FLAT = {
  opacity: 1,
  transform: [{ perspective: 700 }, { rotateX: '0deg' }, { scale: 1 }],
};

// Each FlatList cell. FlatList passes `onLayout` and `style`; we must forward
// them. layout.y is the row's offset inside the scroll content.
function TreadmillCell({ children, style, onLayout, ...rest }) {
  const ctx = useContext(TreadmillContext);
  const [layout, setLayout] = useState(null);

  // Start flat and fully visible. These are explicit values, never null: once a
  // native-driven tilt has been applied, dropping the style does NOT reset the
  // view on the phone — it keeps the last tilt. That's why short lists stayed
  // tilted even though they weren't scrollable (they were, for a split second,
  // while the list was still measuring itself at start-up).
  let topStyle = FLAT;      // outer view: rolls away at the TOP edge
  let bottomStyle = FLAT;   // inner view: rolls under the FAB at the BOTTOM
  // Only roll when the list really scrolls. If everything fits on screen there's
  // nothing to roll under the FAB — and a stale/tiny viewport measurement (e.g.
  // after filters change the list, or the keyboard was up) can't tip rows flat.
  // contentH includes the extra bottom padding we add for the FAB; leave it out,
  // otherwise a short list (e.g. one event + one task) counts as "scrollable" and
  // its last row tilts under the + even though the list isn't full.
  const realContentH = ctx ? ctx.contentH - (FAB_LINE + ROLL_ZONE + ctx.bottomInset) : 0;
  // Rolling only starts once the user has dragged the list. At a cold start the
  // calendar shows the month view first, so the list is briefly much shorter
  // (e.g. 223 instead of 413) and a short list counted as scrollable; the tilt
  // applied in that moment stayed on the phone. No drag yet → always flat.
  const scrollable = ctx && ctx.dragged && ctx.viewportH >= 120 && realContentH > ctx.viewportH + 1;
  if (ctx && layout && scrollable) {
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
    // key: when a row switches between "may roll" and "flat", React builds a
    // brand-new native view, so no tilt from the rolling state can survive on
    // the phone (a native-driven transform isn't reliably undone otherwise).
    <Animated.View
      key={scrollable ? 'roll' : 'flat'}
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
export default function TreadmillList({ contentContainerStyle, onScroll, onScrollBeginDrag, onLayout, onContentSizeChange, bottomInset = 0, ...props }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastY   = useRef(0);          // last scroll offset we know of
  const viewH   = useRef(0);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH]   = useState(0);
  const [dragged, setDragged]     = useState(false);   // see `scrollable` in TreadmillCell

  // When the list gets SHORTER (e.g. a new day is selected after a voice create),
  // the list snaps back but Android doesn't always send a scroll event. scrollY
  // then keeps the old, too-large offset and every row thinks it has rolled away
  // over the top — the list shows as flat grey bars. Clamp it to what's possible.
  const clampToContent = (contentH) => {
    const maxY = Math.max(0, contentH - viewH.current);
    if (lastY.current > maxY) {
      lastY.current = maxY;
      scrollY.setValue(maxY);
    }
  };

  return (
    <TreadmillContext.Provider value={{ scrollY, viewportH, contentH, bottomInset, dragged }}>
      {/* The visible height is measured on this plain wrapper View. FlatList's own
          onLayout didn't always fire again when the list grew (e.g. the top card
          switching from month to week view at start-up), so viewportH stayed too
          small and a short list thought its rows were under the + button. */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          viewH.current = h;
          setViewportH(h);
        }}
      >
      <Animated.FlatList
        {...props}
        CellRendererComponent={TreadmillCell}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: FAB_LINE + ROLL_ZONE + bottomInset }]}
        scrollEventThrottle={16}
        onScrollBeginDrag={(e) => {
          if (!dragged) setDragged(true);
          onScrollBeginDrag?.(e);
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (e) => {
              lastY.current = e.nativeEvent.contentOffset.y;
              onScroll?.(e);
            },
          },
        )}
        onContentSizeChange={(w, h) => {
          onContentSizeChange?.(w, h);
          setContentH(h);
          clampToContent(h);
        }}
        onLayout={onLayout}
      />
      </View>
    </TreadmillContext.Provider>
  );
}
