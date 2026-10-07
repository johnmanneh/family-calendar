import { StyleSheet, Dimensions } from 'react-native';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

const styles = StyleSheet.create({

  // Full-screen dark background, flex row
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Drawer occupies the left 75%
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 60,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },

  // Remaining 25% — tap to dismiss
  closeArea: {
    flex: 1,
  },

  // User section
  userSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: '#aeaeb2',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#f2f2f7',
    marginHorizontal: 24,
    marginBottom: 8,
  },

  // Nav
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  navLabel: {
    fontSize: 16,
    color: '#1d1d1f',
    fontWeight: '500',
    flex: 1,
  },
  // Wrapper so the icon + small dot badge sit together
  navIconWrap: {
    position: 'relative',
    width: 20,
    height: 20,
  },
  // Small dot on the icon corner
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  // Pill on the right edge of the row
  navBadgePill: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '500',
  },
});

export default styles;
export { DRAWER_WIDTH };
