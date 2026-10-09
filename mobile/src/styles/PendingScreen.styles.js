import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    gap: 12,
    // background comes from TopCard (floating card like home)
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: '#1a8fa8', fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  spinner: { marginTop: 60 },
  scrollContent: { paddingVertical: 16, paddingHorizontal: 16, gap: 10 },

  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40, opacity: 0.4 },
  emptyText: { fontSize: 14, color: c.textMuted },

  group: {
    borderRadius: 12, overflow: 'hidden', backgroundColor: c.surface, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 12, gap: 10 },
  stripe: { width: 4, alignSelf: 'stretch', minHeight: 40, borderRadius: 2, marginLeft: 10 },
  itemInfo: { flex: 1, minWidth: 0, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 18 },
  itemMeta: { fontSize: 12, color: c.textSub },
  itemFrom: { fontSize: 11, color: c.textMuted },

  taskLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: c.textMuted, textTransform: 'uppercase' },
  acceptedLabel: { color: '#34c759' },
  counterOffer: { fontSize: 12, color: '#007aff', fontStyle: 'italic', marginTop: 2 },
  cascadeTask: { borderTopWidth: 1, borderTopColor: c.separator, paddingLeft: 12 },

  subTasks: { marginTop: 4, gap: 2 },
  subTaskText: { fontSize: 11, color: c.textMuted },

  actionBtns: { flexDirection: 'column', gap: 4, alignSelf: 'center' },
  actionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: 'rgba(52,199,89,0.12)' },
  acceptBtnText: { fontSize: 14, color: '#34c759', fontWeight: '700' },
  declineBtn: { backgroundColor: 'rgba(255,59,48,0.1)' },
  declineBtnText: { fontSize: 14, color: '#ff3b30', fontWeight: '700' },
  counterBtn: { backgroundColor: 'rgba(0,122,255,0.1)' },
  counterBtnText: { fontSize: 14, color: '#007aff', fontWeight: '700' },

  counterBox: { marginTop: 8, gap: 6 },
  counterInput: {
    backgroundColor: c.surface2, borderRadius: 8, padding: 10,
    fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.border,
  },
  counterActions: { flexDirection: 'row', gap: 8 },
  counterSendBtn: { backgroundColor: '#1a8fa8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  counterSendText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  counterCancelBtn: { paddingHorizontal: 10, paddingVertical: 7 },
  counterCancelText: { color: c.textMuted, fontSize: 13 },
  btnDisabled: { opacity: 0.4 },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
