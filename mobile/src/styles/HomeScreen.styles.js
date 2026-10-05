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
    height: 106,
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
    paddingTop: 10,
    paddingBottom: 14,
  },
  bubble: {
    alignItems: 'center',
    width: 56,
    marginRight: 12,
  },
  bubbleSelected: {},
  bubbleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bubbleCircleSelected: {
    borderColor: '#1a8fa8',
  },
  bubbleInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  bubbleName: {
    fontSize: 11,
    color: '#555',
    marginTop: 3,
    maxWidth: 56,
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 6,
  },
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
});

export default styles;
