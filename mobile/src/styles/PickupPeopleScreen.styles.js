import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
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

  divider: { height: 1, backgroundColor: c.separator, marginVertical: 2 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyText: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 4 },
  emptyHint: { fontSize: 13, color: c.textMuted, lineHeight: 18 },

  // ── Person row ────────────────────────────────────────────────────────────
  personRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12,
  },
  personAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  personInitial: { color: '#fff', fontSize: 16, fontWeight: '700' },
  personBody: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '600', color: c.text },
  personPhone: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  familyBadge: {
    backgroundColor: 'rgba(26,143,168,0.12)', paddingHorizontal: 7,
    paddingVertical: 2, borderRadius: 7, alignSelf: 'flex-start', marginTop: 3,
  },
  familyBadgeText: { fontSize: 11, color: '#1a8fa8', fontWeight: '600' },

  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },

  // ── Add form ──────────────────────────────────────────────────────────────
  addToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  addToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
  },
  addToggleBtnActive: {
    borderColor: '#1a8fa8', backgroundColor: 'rgba(26,143,168,0.08)',
  },
  addToggleBtnText: { fontSize: 14, fontWeight: '500', color: c.textMuted },
  addToggleBtnTextActive: { color: '#1a8fa8', fontWeight: '600' },

  // Member picker list inside add form
  memberPickItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  memberPickAvatar: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  memberPickInitial: { color: '#fff', fontSize: 14, fontWeight: '700' },
  memberPickName: { flex: 1, fontSize: 15, color: c.text },
  memberPickCheck: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },

  // Text inputs for external person
  input: {
    backgroundColor: c.surface2, borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 14, fontSize: 15, color: c.text, marginBottom: 10,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1a8fa8', borderRadius: 10, padding: 13, marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  saveBtnDisabled: { opacity: 0.45 },

  // ── Expand / collapse add section ─────────────────────────────────────────
  addHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  addHeaderTitle: { fontSize: 15, fontWeight: '600', color: '#1a8fa8' },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
