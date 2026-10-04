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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    gap: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#1a8fa8',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.3,
  },

  spinner: {
    marginTop: 60,
  },

  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 40,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 14,
    color: '#aeaeb2',
  },

  // ── Group (event + cascaded tasks) ───────────────────────────────────────
  group: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // ── Item row (event card or task card) ───────────────────────────────────
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
    gap: 10,
  },

  // Left colour stripe — matches web .sidebar-pending-color
  stripe: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: 2,
    marginLeft: 10,
  },

  // Info block
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d1d1f',
    lineHeight: 18,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6e6e73',
  },
  itemFrom: {
    fontSize: 11,
    color: '#aeaeb2',
  },

  // Label above title (TASK / TASK RESPONSE / ACCEPTED)
  taskLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#aeaeb2',
    textTransform: 'uppercase',
  },
  acceptedLabel: {
    color: '#34c759',
  },

  // Counter offer shown under title
  counterOffer: {
    fontSize: 12,
    color: '#007aff',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Cascaded task indented below its event
  cascadeTask: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    paddingLeft: 12,
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

  // ── Action buttons ✓ ✕ ↩ ────────────────────────────────────────────────
  actionBtns: {
    flexDirection: 'column',
    gap: 4,
    alignSelf: 'center',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: 'rgba(52,199,89,0.12)',
  },
  acceptBtnText: {
    fontSize: 14,
    color: '#34c759',
    fontWeight: '700',
  },
  declineBtn: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  declineBtnText: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '700',
  },
  counterBtn: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  counterBtnText: {
    fontSize: 14,
    color: '#007aff',
    fontWeight: '700',
  },

  // ── Counter input ────────────────────────────────────────────────────────
  counterBox: {
    marginTop: 8,
    gap: 6,
  },
  counterInput: {
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1d1d1f',
    borderWidth: 1,
    borderColor: '#e0e0e5',
  },
  counterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  counterSendBtn: {
    backgroundColor: '#1a8fa8',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  counterSendText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  counterCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  counterCancelText: {
    color: '#aeaeb2',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.4,
  },

});

export default styles;
