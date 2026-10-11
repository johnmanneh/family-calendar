import { StyleSheet } from 'react-native';
import { useColorScheme } from '../../context/ThemeContext';
import { LIGHT, DARK } from '../../theme';

// Shared styles for the child-profile and calendar-access sections
const make = c => StyleSheet.create({
  header: {
    fontSize: 13, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 24, marginBottom: 8, marginHorizontal: 4,
  },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 16 },
  hint: { fontSize: 13, color: c.textSub, lineHeight: 18, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 },
  chipOn: { backgroundColor: '#1a8fa8', borderColor: '#1a8fa8' },
  chipText: { fontSize: 12, fontWeight: '600', color: c.textSub },
  chipTextOn: { color: '#fff' },
  input: {
    backgroundColor: c.surface2, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14,
    fontSize: 16, color: c.text, marginBottom: 10,
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  dot: { width: 30, height: 30, borderRadius: 15 },
  dotOn: { borderWidth: 3, borderColor: c.text },
  primary: { backgroundColor: '#1a8fa8', borderRadius: 10, padding: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  danger: { borderWidth: 1, borderColor: '#ff3b30', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  dangerText: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },
  msg: { fontSize: 13, marginBottom: 8 },
});
const light = make(LIGHT), dark = make(DARK);
export const useFamilyStyles = () => (useColorScheme() === 'dark' ? dark : light);
export const CHILD_COLORS = ['#f48c06', '#ffd60a', '#56e39f', '#4facfe', '#9747ff', '#f857a6', '#ff6b6b', '#00c896'];
