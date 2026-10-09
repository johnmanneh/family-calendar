import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  headerSpacer: { width: 40 },

  content: { paddingHorizontal: 16, paddingTop: 20 },

  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },

  card: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },

  // Family info
  familyName: { fontSize: 20, fontWeight: '700', color: c.text, letterSpacing: -0.3, marginBottom: 6 },
  inviteLabel: { fontSize: 12, color: c.textMuted, marginBottom: 10 },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, gap: 12,
  },
  inviteCode: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: c.surface, borderRadius: 8, borderWidth: 1, borderColor: c.border,
  },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: '#1a8fa8' },

  // Member row
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
  memberAvatarInitials: { alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  memberBody: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: c.text },
  memberEmail: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  ownerBadge: {
    backgroundColor: 'rgba(26,143,168,0.12)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8, marginRight: 4,
  },
  ownerBadgeText: { fontSize: 11, color: '#1a8fa8', fontWeight: '600' },
  divider: { height: 1, backgroundColor: c.separator, marginVertical: 2 },

  // Leave family
  leaveDescription: { fontSize: 13, color: c.textSub, marginBottom: 14, lineHeight: 18 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#ff3b30', borderRadius: 10, padding: 12, justifyContent: 'center',
  },
  leaveBtnText: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },

  joinFamilyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.surface, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#1a8fa8',
  },
  joinFamilyBtnText: { color: '#1a8fa8', fontSize: 15, fontWeight: '600' },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
