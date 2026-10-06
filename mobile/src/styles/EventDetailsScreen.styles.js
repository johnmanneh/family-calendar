import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },

  // ── Back header ──────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#1a8fa8',
    fontWeight: '500',
  },

  spinner: {
    marginTop: 60,
  },
  errorText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 15,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // ── Title header — left stripe + title, matches web ─────────────────────
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#f2f2f7',
  },
  titleStripe: {
    width: 4,
    minHeight: 28,
    borderRadius: 2,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  titleText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.4,
    lineHeight: 26,
  },

  // ── Cards ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 0,
    marginBottom: 12,
  },

  // ── Info rows — icon + content, matches web .event-details-row ──────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  infoIcon: {
    fontSize: 15,
    width: 20,
    textAlign: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1d1d1f',
    fontWeight: '500',
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  infoTime: {
    fontSize: 13,
    color: '#6e6e73',
    marginTop: 2,
  },
  infoLink: {
    fontSize: 14,
    color: '#1a8fa8',
    fontWeight: '500',
  },

  // ── Attendees ────────────────────────────────────────────────────────────
  attendeesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attendeeItem: {
    alignItems: 'center',
    gap: 4,
  },
  attendeeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitials: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  attendeeName: {
    fontSize: 10,
    color: '#6e6e73',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Task rows ────────────────────────────────────────────────────────────
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  taskAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d1d1f',
  },

  // Status badges — pending / declined / countered
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  // Negotiation bubble (countered state)
  negotiationBubble: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#e8f4fd',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
  },
  negotiationWho: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007aff',
  },
  negotiationText: {
    fontSize: 11,
    color: '#1d1d1f',
    fontStyle: 'italic',
  },
  declinedText: {
    fontSize: 11,
    color: '#ff3b30',
    marginTop: 2,
  },
  taskMeta: {
    fontSize: 11,
    color: '#aeaeb2',
    textTransform: 'capitalize',
    marginTop: 2,
  },

  // Sub-tasks
  subTasks: {
    marginTop: 4,
    gap: 2,
  },
  subTaskText: {
    fontSize: 11,
    color: '#aeaeb2',
  },

  // ── Edit / Delete actions ────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff3b30',
  },

  // ── Subtask add UI ────────────────────────────────────────────────────────
  addSubTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  addSubTaskText: {
    fontSize: 12,
    color: '#1a8fa8',
    fontWeight: '500',
  },
  subTaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  subTaskInput: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1d1d1f',
  },
  subTaskAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a8fa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTaskCancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },

});

export default styles;
