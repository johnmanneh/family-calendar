import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12,
    
    // background comes from TopCard (floating card like home)
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center', letterSpacing: -0.3 },
  markAllBtn: { width: 90, alignItems: 'flex-end', paddingRight: 8 },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#1a8fa8' },
  headerSpacer: { width: 90 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1 },
  listContent: { paddingVertical: 8 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 15, color: c.textMuted, fontWeight: '500' },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.border, gap: 12,
  },
  rowUnread: { backgroundColor: 'rgba(26,143,168,0.06)' },
  rowRead: { backgroundColor: c.surface },
  rowIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: c.text },
  rowTitleRead: { fontWeight: '500', color: c.textSub },
  rowText: { fontSize: 13, color: c.textSub, lineHeight: 18 },
  rowTime: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  rowDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8, flexShrink: 0 },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
