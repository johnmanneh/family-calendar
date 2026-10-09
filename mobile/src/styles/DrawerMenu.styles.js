import { StyleSheet, Dimensions } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

const make = c => StyleSheet.create({

  // Floating panel — same card language as the home screen's top card
  drawer: {
    position: 'absolute',
    left: 8,
    width: DRAWER_WIDTH,
    transformOrigin: 'left center',   // hinge for the drum roll
    backgroundColor: c.bg,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 4, height: 8 },
    elevation: 16,
  },
  // Clip scrolling content to the rounded corners (shadow stays on the parent)
  scroll: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  scrollContent: { padding: 12, paddingTop: 16, paddingBottom: 24 },

  // User card
  userSection: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, borderRadius: 18,
    padding: 14, marginBottom: 6,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userName: { fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  userEmail: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  // Section heading + rounded group of rows
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: c.textSub,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 14, marginBottom: 6, marginLeft: 12,
  },
  sectionCard: {
    backgroundColor: c.surface, borderRadius: 18, overflow: 'hidden',
  },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  navItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  navLabel: { fontSize: 15, color: c.text, fontWeight: '500', flex: 1 },

  navIconWrap: { width: 22, alignItems: 'center' },
  navBadge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#ff3b30', borderRadius: 6,
    minWidth: 12, height: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  navBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  navBadgePill: {
    backgroundColor: '#ff3b30', borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  navBadgePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  toggleTrack: {
    width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },

  signOutText: { fontSize: 15, color: '#ff3b30', fontWeight: '500', flex: 1 },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}

export default lightStyles;
export { DRAWER_WIDTH };
