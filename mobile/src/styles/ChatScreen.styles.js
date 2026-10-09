import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    paddingHorizontal: 8, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center', letterSpacing: -0.3 },
  headerSpacer: { width: 40 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 12, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: c.textMuted },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubbleWrap: { maxWidth: '75%', gap: 3 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  senderName: { fontSize: 11, fontWeight: '600', color: c.textMuted, paddingHorizontal: 4 },

  bubble: { backgroundColor: c.bubble, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: '#1a8fa8', borderRadius: 18, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: c.text, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: c.textMuted, paddingHorizontal: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
  },
  input: {
    flex: 1, backgroundColor: c.surface2, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 15,
    color: c.text, maxHeight: 100, lineHeight: 20,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a8fa8',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingLeft: 2,
  },
  sendBtnDisabled: { opacity: 0.35 },

  dateLink: { color: '#007aff', textDecorationLine: 'underline', fontWeight: '600' },
  dateLinkMe: { color: '#a8dce8' },
  dateLinkHint: { fontSize: 11, color: c.icon, marginTop: 5 },
  dateLinkHintMe: { color: 'rgba(255,255,255,0.65)' },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
