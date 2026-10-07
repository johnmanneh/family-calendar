import { StyleSheet } from 'react-native';

// ── FAB constants (must match HomeScreen.styles.js) ──────────────────────────
const FAB_RIGHT  = 24;   // px from screen right edge
const FAB_BOTTOM = 32;   // px from screen bottom edge
const FAB_SIZE   = 48;   // diameter (fabSmall)

// ── Container geometry ────────────────────────────────────────────────────────
const OUTER_R      = 155;
const CONTAINER_W  = OUTER_R + 20;   // 175
const CONTAINER_H  = OUTER_R + 20;   // 175

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  // Container: bottom-right corner anchored at FAB centre
  wheel: {
    position: 'absolute',
    right:    FAB_RIGHT  + FAB_SIZE / 2,   // right edge at FAB centre x
    bottom:   FAB_BOTTOM + FAB_SIZE / 2,   // bottom edge at FAB centre y
    width:    CONTAINER_W,
    height:   CONTAINER_H,
  },

  hit: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },

  sliceContent: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  sliceIcon: {
    marginBottom: 4,
    textShadowColor:  'rgba(0,0,0,0.6)',
    textShadowRadius:  5,
    textShadowOffset:  { width: 0, height: 2 },
  },

  sliceLabel: {
    color:       'rgba(255,255,255,0.82)',
    fontSize:    10,
    fontWeight:  '700',
    letterSpacing: 0.15,
    textAlign:   'center',
    textShadowColor:  'rgba(0,0,0,0.7)',
    textShadowRadius:  4,
    textShadowOffset:  { width: 0, height: 1 },
  },

  sliceLabelActive: {
    color:     '#ffffff',
    fontSize:  11,
  },
});

export default styles;
