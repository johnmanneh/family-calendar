import { StyleSheet, Dimensions } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

const make = c => StyleSheet.create({

  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: c.surface,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },

  closeArea: { flex: 1 },

  userSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  userEmail: { fontSize: 13, color: c.textMuted, marginTop: 2 },

  divider: {
    height: 1, backgroundColor: c.separator,
    marginHorizontal: 24, marginBottom: 8,
  },

  nav: { flex: 1, paddingTop: 8 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 24,
  },
  navLabel: { fontSize: 16, color: c.text, fontWeight: '500', flex: 1 },

  navIconWrap: { position: 'relative', width: 20, height: 20 },
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

  // Dark mode toggle row
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 24,
  },
  toggleLabel: { fontSize: 16, color: c.text, fontWeight: '500', flex: 1 },
  toggleTrack: {
    width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 20, paddingHorizontal: 24,
    borderTopWidth: 1, borderTopColor: c.separator, marginBottom: 20,
  },
  signOutText: { fontSize: 16, color: '#ff3b30', fontWeight: '500' },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}

export default lightStyles;
export { DRAWER_WIDTH };
