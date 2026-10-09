import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn:     { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text, flex: 1 },
  subtitle: {
    fontSize: 13, color: c.textMuted,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: c.separator,
  },
  rowLast:  { borderBottomWidth: 0 },
  langInfo: { flex: 1 },
  nativeName:  { fontSize: 15, fontWeight: '600', color: c.text },
  englishName: { fontSize: 13, color: c.textSub, marginTop: 1 },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
