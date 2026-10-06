import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  safeArea: {
    flex: 1,
  },

  // FAB — circular teal button, bottom right corner
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a8fa8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  // Header
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
  // Title sits absolutely centred so left/right icon groups don't push it off
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#1d1d1f',
    letterSpacing: -1,
    // pointerEvents none so taps pass through to buttons behind it
    pointerEvents: 'none',
  },
  hamburger: {
    gap: 5,
    justifyContent: 'center',
    padding: 8,
  },
  hamburgerLine: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // Left edge swipe zone — 20px wide, sits above everything, invisible
  edgeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 999,
  },

  // Member bubbles row — outer View enforces height, ScrollView fills it
  membersRowWrapper: {
    height: 76,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    flexShrink: 0,
  },
  membersRow: {
    flex: 1,
  },
  membersContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  bubble: {
    alignItems: 'center',
    width: 46,
    marginRight: 10,
  },
  // Wrapper that carries the glow shadow when the bubble is selected.
  // Needs a background + borderRadius matching the circle so iOS renders
  // the shadow correctly.
  bubbleGlow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  bubbleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  bubbleName: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
    maxWidth: 46,
    textAlign: 'center',
  },
  bubbleRelationship: {
    fontSize: 9,
    color: '#aeaeb2',
    maxWidth: 56,
    textAlign: 'center',
    marginTop: 1,
  },

  // Events list
  spinner: {
    marginTop: 60,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // Day label at the very top of the list ("Today", "Tomorrow", date)
  dayLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1d1d1f',
    marginTop: 16,
    marginBottom: 4,
  },

  // Section headers within the list ("Events", "Tasks")
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
  },

  // Inline tasks listed under an event card
  inlineTasksList: {
    borderLeftWidth: 3,
    marginLeft: 4,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 10,
    gap: 5,
    backgroundColor: '#fafafa',
  },
  inlineTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineTaskTitle: {
    flex: 1,
    fontSize: 13,
    color: '#1d1d1f',
    fontWeight: '500',
  },
  inlineTaskAssignee: {
    fontSize: 11,
    color: '#8e8e93',
  },
  inlineTaskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inlineTaskBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // Task row extras
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  taskIcon: {
    flexShrink: 0,
  },
  // Swipe actions revealed when swiping left on a task row
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  swipeAction: {
    width: 76,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  // iOS only — round the right edge of the last button to match the card
  swipeActionFirst: {},
  swipeActionLast: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'center',
    marginRight: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  // Outer wrapper — holds the event tap row + inline tasks below it
  eventCard: {
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
  eventRow: {
    flexDirection: 'row',
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
  eventTime: {
    fontSize: 13,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 60,
    fontSize: 15,
  },

  // Arrival time row inside task card
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  arrivalText: {
    fontSize: 12,
    color: '#1a8fa8',
    fontWeight: '500',
  },
  arrivalPlaceholder: {
    color: '#aeaeb2',
    fontWeight: '400',
  },

  // Arrival time picker bottom sheet
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#8e8e93',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a8fa8',
  },
});

export default styles;
