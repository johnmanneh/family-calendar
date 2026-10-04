import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backBtn: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  // Mirrors backBtn width so the title stays centred
  headerSpacer: {
    width: 40,
  },

  // ── Profile card ─────────────────────────────────────────────────────────
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  memberRelationship: {
    fontSize: 13,
    color: '#1a8fa8',
    fontWeight: '500',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#aeaeb2',
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1a8fa8',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#aeaeb2',
  },
  tabLabelActive: {
    color: '#1a8fa8',
    fontWeight: '600',
  },

  // ── Scroll content ───────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  spinner: {
    marginTop: 60,
  },

  // ── Section header ───────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // ── Event row ────────────────────────────────────────────────────────────
  eventRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  eventStripe: {
    width: 4,
  },
  eventBody: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 13,
    color: '#888',
  },

  // ── Task row ─────────────────────────────────────────────────────────────
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  taskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    flexShrink: 0,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  taskMeta: {
    fontSize: 12,
    color: '#888',
  },
  taskStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aeaeb2',
    textTransform: 'capitalize',
    marginLeft: 8,
  },

  // ── Empty / placeholder ──────────────────────────────────────────────────
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 16,
  },

  // ── Settings tab ─────────────────────────────────────────────────────────
  settingsSectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // White card grouping for each settings section
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // ── Colour picker ─────────────────────────────────────────────────────────
  // 7 swatches per row — flex wrap handles it
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scale up + white ring on selected swatch
  colorSwatchSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  savingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#aeaeb2',
    textAlign: 'center',
  },

  // ── Profile info form ──────────────────────────────────────────────────────
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1d1d1f',
    marginBottom: 6,
    marginTop: 4,
  },
  settingsInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1d1d1f',
    marginBottom: 12,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    marginBottom: 8,
  },
  successText: {
    color: '#34c759',
    fontSize: 13,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: '#1a8fa8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Danger zone ───────────────────────────────────────────────────────────
  dangerDescription: {
    fontSize: 13,
    color: '#6e6e73',
    marginBottom: 14,
    lineHeight: 18,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#ff3b30',
    fontSize: 15,
    fontWeight: '600',
  },

});

export default styles;
