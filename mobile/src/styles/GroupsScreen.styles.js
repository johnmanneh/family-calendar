import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({

  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.bg },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { padding: 6 },

  // ── Inline create/join form ───────────────────────────────────────────────
  inlineForm: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8,
  },
  inlineInput: {
    flex: 1, backgroundColor: c.surface2, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: c.text,
  },
  inlineBtn: {
    backgroundColor: '#1a8fa8', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, minWidth: 64, alignItems: 'center',
  },
  inlineBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  inlineCancelBtn: { padding: 4 },

  // ── Group list ────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1, gap: 12,
  },
  groupIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a8fa8',
    alignItems: 'center', justifyContent: 'center',
  },
  groupIconLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', color: c.text, marginBottom: 2 },
  groupMeta: { fontSize: 12, color: c.textMuted },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.text, marginTop: 8 },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 32 },

  // ── Group detail ──────────────────────────────────────────────────────────
  backRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  backRowText: { fontSize: 15, color: '#1a8fa8', fontWeight: '500' },
  groupHero: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 14,
  },
  groupHeroIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a8fa8',
    alignItems: 'center', justifyContent: 'center',
  },
  groupHeroLetter: { color: '#fff', fontSize: 22, fontWeight: '700' },
  groupHeroName: { fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 2 },
  groupHeroMeta: { fontSize: 13, color: c.textMuted },

  // Invite code card
  inviteCard: {
    backgroundColor: c.surface, marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  inviteLabel: {
    fontSize: 12, fontWeight: '600', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteCode: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: c.surface2, borderRadius: 8,
  },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: '#1a8fa8' },

  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 10,
  },

  // Member rows inside group detail
  membersCard: {
    backgroundColor: c.surface, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14,
    marginBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  memberAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '600', color: c.text },
  memberEmail: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  adminBadge: {
    backgroundColor: 'rgba(26,143,168,0.12)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8,
  },
  adminBadgeText: { fontSize: 11, color: '#1a8fa8', fontWeight: '600' },
  divider: { height: 1, backgroundColor: c.separator, marginVertical: 1 },

  // Event rows inside group detail
  eventRow: {
    flexDirection: 'row', backgroundColor: c.surface,
    borderRadius: 10, marginHorizontal: 16, marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  eventStripe: { width: 4 },
  eventBody: { flex: 1, padding: 12 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 2 },
  eventMeta: { fontSize: 13, color: c.textSub },

});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
