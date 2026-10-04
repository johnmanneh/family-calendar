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
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  saveHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#1a8fa8',
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveHeaderBtnDisabled: {
    opacity: 0.6,
  },
  saveHeaderBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // ── Error ────────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Title input ──────────────────────────────────────────────────────────
  // Large, prominent — first thing the user sees
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // ── White card (groups related fields) ───────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f2f2f7',
    marginVertical: 10,
  },

  // ── Toggle row ────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#1d1d1f',
    fontWeight: '500',
  },

  // ── Date picker row ───────────────────────────────────────────────────────
  dateRow: {
    paddingVertical: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    padding: 12,
  },
  dateBtnText: {
    fontSize: 15,
    color: '#1d1d1f',
    fontWeight: '500',
  },
  picker: {
    marginTop: 8,
  },

  // ── Field label ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // ── Segment control (repeat / priority) ──────────────────────────────────
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
  },
  segmentFlex: {
    flex: 1,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#1a8fa8',
  },
  segmentText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Category grid ─────────────────────────────────────────────────────────
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },

  // ── Attendees ─────────────────────────────────────────────────────────────
  attendeeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attendeeBubble: {
    alignItems: 'center',
    width: 52,
  },
  attendeeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  attendeeCircleSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  attendeeInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Small tick badge on the bottom-right of selected attendee
  attendeeTick: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#34c759',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  attendeeName: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    maxWidth: 52,
    textAlign: 'center',
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  taskRow: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  taskTitleInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1d1d1f',
    marginBottom: 8,
  },
  taskAssignRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  taskPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assignChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
    marginRight: 6,
  },
  assignChipActive: {
    backgroundColor: '#1a8fa8',
  },
  assignChipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  assignChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  posChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
  },
  posChipActive: {
    backgroundColor: '#1a8fa8',
  },
  posChipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  posChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  taskRemoveBtn: {
    marginLeft: 'auto',
    padding: 2,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
  },
  addTaskText: {
    fontSize: 14,
    color: '#1a8fa8',
    fontWeight: '600',
  },

  // ── Text inputs ───────────────────────────────────────────────────────────
  textInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1d1d1f',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // ── Colour picker ─────────────────────────────────────────────────────────
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.2 }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  // ── Submit button ─────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: '#1a8fa8',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

});

export default styles;
