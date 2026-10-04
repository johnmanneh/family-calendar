import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    position: 'relative',
    padding: 6,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
  },
  logoutText: {
    fontSize: 14,
    color: '#888',
  },

  // Member bubbles row
  membersRow: {
    height: 106,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
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
