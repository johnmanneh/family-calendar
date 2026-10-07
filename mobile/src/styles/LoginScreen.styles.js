import { StyleSheet, useColorScheme } from 'react-native';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({

  // ── Page background ──────────────────────────────────────────────────────
  page: { flex: 1, backgroundColor: c.bg },
  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, paddingHorizontal: 20,
  },

  // ── White card ───────────────────────────────────────────────────────────
  card: {
    width: '100%', maxWidth: 460, backgroundColor: c.surface,
    borderRadius: 24, paddingHorizontal: 32, paddingVertical: 40,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },

  // ── Logo ─────────────────────────────────────────────────────────────────
  logoWrapper: { marginBottom: 28 },

  // ── Headings ─────────────────────────────────────────────────────────────
  heading: {
    fontSize: 24, fontWeight: '700', color: c.text,
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: c.textSub, textAlign: 'center', marginBottom: 24 },

  // ── Error box ────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(232,93,4,0.05)', borderWidth: 1,
    borderColor: 'rgba(232,93,4,0.2)', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#e85d04', fontSize: 13, textAlign: 'center' },

  // ── Inputs ───────────────────────────────────────────────────────────────
  label: { fontSize: 13, fontWeight: '500', color: c.text, marginBottom: 6 },
  input: {
    backgroundColor: c.surface2, borderRadius: 12, padding: 14,
    fontSize: 15, color: c.text, marginBottom: 16,
  },

  // ── Button ───────────────────────────────────────────────────────────────
  button: { backgroundColor: '#1a8fa8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // ── Name row (register only) ─────────────────────────────────────────────
  nameRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  nameField: { flex: 1 },

  // ── Footer ───────────────────────────────────────────────────────────────
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { fontSize: 13, color: c.textSub },
  switchLink: { fontSize: 13, fontWeight: '600', color: '#1a8fa8' },

});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
