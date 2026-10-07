/**
 * App-wide colour palette — light and dark variants.
 *
 * Usage in a styles file:
 *   import { LIGHT, DARK } from '../theme';
 *   const makeStyles = c => StyleSheet.create({ container: { backgroundColor: c.bg } });
 *   const lightStyles = makeStyles(LIGHT);
 *   const darkStyles  = makeStyles(DARK);
 *   export function useStyles() {
 *     return useColorScheme() === 'dark' ? darkStyles : lightStyles;
 *   }
 *
 * Usage in a screen:
 *   import { useStyles } from '../styles/MyScreen.styles';
 *   const styles = useStyles();
 */

import { useColorScheme } from 'react-native';

export const LIGHT = {
  bg:        '#f2f2f7',   // page background
  surface:   '#ffffff',   // cards, headers, modals
  surface2:  '#f5f5f7',   // inputs, inactive chips, secondary backgrounds
  border:    '#e5e5ea',   // dividers, card outlines
  separator: '#f2f2f7',   // inner-card dividers
  text:      '#1d1d1f',   // primary text
  textSub:   '#6e6e73',   // secondary text
  textMuted: '#aeaeb2',   // placeholder, muted labels
  icon:      '#8e8e93',   // inactive icons
  bubble:    '#e9e9eb',   // incoming chat bubble
};

export const DARK = {
  bg:        '#000000',
  surface:   '#1c1c1e',
  surface2:  '#2c2c2e',
  border:    '#3a3a3c',
  separator: '#3a3a3c',
  text:      '#ffffff',
  textSub:   '#aeaeb2',
  textMuted: '#636366',
  icon:      '#636366',
  bubble:    '#3a3a3c',
};

/** Hook — returns the correct palette for the current system theme. */
export function useThemeColors() {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}
