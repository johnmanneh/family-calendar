import { StyleSheet } from 'react-native';

// Must stay in sync with RadialMenu.js constants
const FAB_RIGHT  = 24;
const FAB_BOTTOM = 32;
const FAB_SIZE   = 48;
const OUTER_R    = 158;
const INNER_R    =  56;
const CONTAINER_W = OUTER_R + 22;   // 180
const CONTAINER_H = OUTER_R + 22;   // 180

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  // Bottom-right corner of this container = FAB centre
  wheel: {
    position: 'absolute',
    right:    FAB_RIGHT  + FAB_SIZE / 2,   // right edge at FAB centre X
    bottom:   FAB_BOTTOM + FAB_SIZE / 2,   // bottom edge at FAB centre Y
    width:    CONTAINER_W,
    height:   CONTAINER_H,
  },

  // ☀️ sun hub — centred on FAB position (= container bottom-right corner)
  sunHub: {
    position:        'absolute',
    right:           -(INNER_R - 2),     // centre the circle on the right edge
    bottom:          -(INNER_R - 2),     // centre on the bottom edge
    width:           (INNER_R - 2) * 2,
    height:          (INNER_R - 2) * 2,
    borderRadius:    INNER_R - 2,
    alignItems:      'center',
    justifyContent:  'center',
  },

  sunEmoji: {
    fontSize: 28,
    // subtle shadow so ☀️ pops off the dark circle
    textShadowColor:  'rgba(0,0,0,0.5)',
    textShadowRadius:  4,
    textShadowOffset:  { width: 0, height: 1 },
  },

  // Tap zone — positioned absolutely at the slice centre
  hit: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Rotated content block (emoji + label together)
  sliceContent: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize:    26,
    marginBottom: 4,
    textShadowColor:  'rgba(0,0,0,0.55)',
    textShadowRadius:  5,
    textShadowOffset:  { width: 0, height: 2 },
  },

  emojiActive: {
    fontSize: 30,   // grows slightly on hover
  },

  label: {
    color:         'rgba(255,255,255,0.88)',
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing:  0.2,
    textAlign:     'center',
    textShadowColor:  'rgba(0,0,0,0.7)',
    textShadowRadius:  4,
    textShadowOffset:  { width: 0, height: 1 },
  },

  labelActive: {
    color:    '#ffffff',
    fontSize: 11.5,
  },
});

export default styles;
