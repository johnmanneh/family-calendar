/**
 * RollIn.js — rows tip in one after another when a screen opens.
 *
 * The short-list partner of TreadmillList: lists that don't scroll (a group's
 * members, "Coming up" on a profile, Pending cards) can't roll with the
 * scroll, so they roll in once instead — same tilt direction, same feel.
 *
 *   <RollInGroup>{items.map(i => <Row key={i.id} … />)}</RollInGroup>
 *
 * Every child (arrays are flattened) gets its own staggered entrance.
 */

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { TILT_DIR } from './TreadmillList';

const STAGGER = 55;     // ms between rows
const MAX_DELAY = 440;  // long lists don't make the user wait
const START_TILT = `${-55 * TILT_DIR}deg`;

export function RollIn({ index = 0, style, children }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * STAGGER, MAX_DELAY),
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p,
          transformOrigin: 'top',
          transform: [
            { perspective: 700 },
            { rotateX: p.interpolate({ inputRange: [0, 1], outputRange: [START_TILT, '0deg'] }) },
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function RollInGroup({ children, startIndex = 0 }) {
  let i = startIndex;
  return React.Children.toArray(children).map(child =>
    React.isValidElement(child)
      ? <RollIn key={child.key ?? i} index={i++}>{child}</RollIn>
      : child
  );
}

export default RollIn;
