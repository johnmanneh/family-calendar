import { StyleSheet, useColorScheme } from 'react-native';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  safeArea:  { flex: 1 },

  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1a8fa8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  // Slightly smaller FAB used with the radial menu (48×48)
  fabSmall: {
    width: 48, height: 48, borderRadius: 24,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    // background + border now come from topCard (one-piece header)
  },
  headerTitle: {
    position: 'absolute', left: 0, right: 0,
    textAlign: 'center', fontSize: 20, fontWeight: '900',
    color: c.text, letterSpacing: -1, pointerEvents: 'none',
  },
  // Full-header overlay that centres the title but never receives touches
  headerTitleWrap: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 20, fontWeight: '900', color: c.text, letterSpacing: -1,
  },
  hamburger: { gap: 5, justifyContent: 'center', padding: 8 },
  hamburgerLine: { width: 22, height: 2.5, borderRadius: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { position: 'relative', padding: 8 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#ff3b30', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // One big rounded card holding header, member bubbles, search and the
  // calendar — sits close to the screen edges like a chat input box.
  topCard: {
    marginHorizontal: 8, marginTop: 4, marginBottom: 4,
    backgroundColor: c.surface, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  edgeZone: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 999,
  },

  membersRowWrapper: {
    height: 76, flexShrink: 0,   // background comes from topCard
  },
  membersRow: { flex: 1 },
  membersContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  bubble: { alignItems: 'center', width: 46, marginRight: 10 },
  bubbleHaloWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bubbleHalo: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  bubbleCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bubbleInitials: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bubbleName: { fontSize: 10, color: c.textSub, marginTop: 2, maxWidth: 46, textAlign: 'center' },
  bubbleRelationship: { fontSize: 9, color: c.textMuted, maxWidth: 56, textAlign: 'center', marginTop: 1 },

  spinner: { marginTop: 60 },
  // Bottom padding is set by TreadmillList (FAB_LINE + ROLL_ZONE) so the
  // last row can always scroll up past the FAB to full size.
  listContent: { paddingHorizontal: 16 },
  dayLabel: { fontSize: 17, fontWeight: '700', color: c.text, marginTop: 16, marginBottom: 4 },
  sectionHeader: {
    fontSize: 12, fontWeight: '600', color: c.icon,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 6,
  },

  inlineTasksList: {
    borderLeftWidth: 3, marginLeft: 4,
    paddingVertical: 4, paddingLeft: 10, paddingRight: 10,
    gap: 5, backgroundColor: c.surface2,
  },
  inlineTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineTaskTitle: { flex: 1, fontSize: 13, color: c.text, fontWeight: '500' },
  inlineTaskAssignee: { fontSize: 11, color: c.icon },
  inlineTaskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  inlineTaskBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  taskIcon: { flexShrink: 0 },

  swipeActions: { flexDirection: 'row', marginBottom: 8 },
  swipeAction: { width: 76, justifyContent: 'center', alignItems: 'center', gap: 4 },
  swipeActionFirst: {},
  swipeActionLast: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  swipeActionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    alignSelf: 'center', marginRight: 12,
  },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  eventCard: {
    backgroundColor: c.surface, borderRadius: 10, marginBottom: 8,
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  eventRow: { flexDirection: 'row' },
  eventStripe: { width: 4 },
  eventBody: { flex: 1, padding: 12 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: c.text, marginBottom: 2 },
  eventTime: { fontSize: 13, color: c.textSub },
  emptyText: { textAlign: 'center', color: c.textMuted, marginTop: 60, fontSize: 15 },

  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  arrivalText: { fontSize: 12, color: '#1a8fa8', fontWeight: '500' },
  arrivalPlaceholder: { color: c.textMuted, fontWeight: '400' },

  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { backgroundColor: c.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 34 },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.separator,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: c.text },
  pickerCancel: { fontSize: 16, color: c.icon },
  pickerDone: { fontSize: 16, fontWeight: '600', color: '#1a8fa8' },

  // ── Voice pill bubble — floats just above the FAB while recording ──────────
  voicePill: {
    position: 'absolute',
    bottom: 96,           // sits above the FAB (FAB bottom=32, height=48 → 32+48+16=96)
    right: 16,
    backgroundColor: 'rgba(26,143,168,0.93)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // shadow
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 8,
  },
  voicePillDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff',
  },
  voicePillText: {
    color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.2,
  },
  voicePillTranscript: {
    color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2,
    maxWidth: 200,
  },

  // ── Success toast pill — floats above FAB after a voice-created event ───────
  successPill: {
    position: 'absolute',
    bottom: 96,           // same vertical anchor as voicePill
    right: 16,
    backgroundColor: 'rgba(52,199,89,0.93)',  // green, matches iOS system green
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000', shadowOpacity: 0.20, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 8,
  },
  successPillText: {
    color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.2,
  },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#636366', paddingVertical: 6, paddingHorizontal: 14,
  },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  searchPanel: {
    paddingHorizontal: 12, paddingVertical: 8, gap: 8, zIndex: 10,
  },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface2, borderRadius: 10, paddingHorizontal: 10, height: 36,
  },
  searchInputIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: c.text, paddingVertical: 0 },
  searchClearBtn: { padding: 2, marginLeft: 4 },
  chipsRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.surface2,
  },
  chipActive: { backgroundColor: '#1a8fa8', borderColor: '#1a8fa8' },
  chipText: { fontSize: 12, color: c.textSub },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
