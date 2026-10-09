import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  page: { flex: 1, backgroundColor: c.bg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    
    // background comes from TopCard (floating card like home)
  },
  back:  { width: 40, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: c.text, flex: 1, textAlign: 'center' },

  allDayRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderBottomWidth: 1, borderBottomColor: c.border,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  allDayLabel:  { fontSize: 11, color: c.icon, width: 32 },
  allDayEvents: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  allDayChip:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  allDayChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  grid: { position: 'relative', backgroundColor: c.surface, marginTop: 4 },

  hourRow:  { height: 64, flexDirection: 'row', alignItems: 'flex-start', paddingTop: 0 },
  hourLabel: { width: 44, fontSize: 11, color: c.icon, textAlign: 'right', paddingRight: 8, marginTop: -6 },
  hourLine:  { flex: 1, height: 1, backgroundColor: c.border, marginTop: 0 },

  nowLine: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', zIndex: 10,
  },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30', marginLeft: 40 },
  nowBar: { flex: 1, height: 1.5, backgroundColor: '#ff3b30' },

  eventBlock: {
    position: 'absolute', borderLeftWidth: 3, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 4, overflow: 'hidden',
  },
  eventTitle: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  eventTime:  { fontSize: 10, fontWeight: '500', lineHeight: 14, marginTop: 1 },

  empty: {
    textAlign: 'center', color: c.textMuted, fontSize: 14, marginTop: 80,
    position: 'absolute', left: 0, right: 0,
  },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
