import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({

  container: { flex: 1, backgroundColor: c.bg },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    // background comes from TopCard (floating card like home)
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  headerSpacer: { width: 40 },

  // ── Profile card ─────────────────────────────────────────────────────────
  profileCard: {
    alignItems: 'center',
    paddingTop: 4, paddingBottom: 14, paddingHorizontal: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },

  // ── Avatar component ──────────────────────────────────────────────────────
  avatarWrap: { overflow: 'hidden', marginBottom: 12 },
  avatarInitials: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#1a8fa8',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: c.surface,
  },
  memberName: { fontSize: 20, fontWeight: '700', color: c.text, letterSpacing: -0.3, marginBottom: 4 },
  memberRelationship: { fontSize: 13, color: '#1a8fa8', fontWeight: '500', marginBottom: 2 },
  memberEmail: { fontSize: 13, color: c.textMuted },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  // Segmented tabs inside the top card
  tabBar: {
    flexDirection: 'row', backgroundColor: c.surface2,
    marginHorizontal: 12, marginBottom: 12, padding: 3, borderRadius: 12,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: {
    backgroundColor: c.surface,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  tabLabel: { fontSize: 14, fontWeight: '500', color: c.textMuted },
  tabLabelActive: { color: '#1a8fa8', fontWeight: '600' },

  // ── Scroll content ───────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  listContent: { paddingHorizontal: 16 },
  spinner: { marginTop: 60 },

  // ── Section header ───────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },

  // ── Event row ────────────────────────────────────────────────────────────
  eventRow: {
    flexDirection: 'row', backgroundColor: c.surface,
    borderRadius: 10, marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  eventStripe: { width: 4 },
  eventBody: { flex: 1, padding: 12 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 2 },
  eventMeta: { fontSize: 13, color: c.textSub },

  // ── Task row ─────────────────────────────────────────────────────────────
  taskRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderRadius: 10, marginBottom: 8, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  taskDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 2 },
  taskMeta: { fontSize: 12, color: c.textSub },
  taskStatus: { fontSize: 11, fontWeight: '600', color: c.textMuted, textTransform: 'capitalize', marginLeft: 8 },

  // ── Empty / placeholder ──────────────────────────────────────────────────
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingVertical: 16 },

  // ── Settings tab ─────────────────────────────────────────────────────────
  settingsSectionHeader: {
    fontSize: 13, fontWeight: '600', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },

  // ── Family invite code ────────────────────────────────────────────────────
  familyName: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 6 },
  familyLabel: { fontSize: 12, color: c.textMuted, marginBottom: 10 },
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

  // ── Colour picker ─────────────────────────────────────────────────────────
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: {
    transform: [{ scale: 1.15 }], shadowColor: '#000',
    shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  colorToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.separator,
  },
  colorToggleText: { fontSize: 13, color: '#1a8fa8', fontWeight: '500' },
  savingText: { marginTop: 10, fontSize: 12, color: c.textMuted, textAlign: 'center' },

  // ── Profile info form ──────────────────────────────────────────────────────
  nameRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  nameField: { flex: 1 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: c.text, marginBottom: 6, marginTop: 4 },
  settingsInput: {
    backgroundColor: c.surface2, borderRadius: 10, padding: 12,
    fontSize: 15, color: c.text, marginBottom: 12,
  },
  errorText: { color: '#ff3b30', fontSize: 13, marginBottom: 8 },
  successText: { color: '#34c759', fontSize: 13, marginBottom: 8 },
  saveBtn: { backgroundColor: '#1a8fa8', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── Admin circle control ──────────────────────────────────────────────────
  circleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  circleRowBorder: { borderBottomWidth: 1, borderBottomColor: c.separator },
  circleRowSelected: {},
  circleRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#1a8fa8', alignItems: 'center', justifyContent: 'center',
  },
  circleRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a8fa8' },
  circleLabel: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 1 },
  circleDescription: { fontSize: 12, color: c.icon },

  // ── Danger zone ───────────────────────────────────────────────────────────
  dangerDescription: { fontSize: 13, color: c.textSub, marginBottom: 14, lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#ff3b30', borderRadius: 10, padding: 12, justifyContent: 'center',
  },
  deleteBtnText: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },

});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
