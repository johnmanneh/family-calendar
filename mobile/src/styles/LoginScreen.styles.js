import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({

  // ── Page background ──────────────────────────────────────────────────────
  page: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  // ── White card ───────────────────────────────────────────────────────────
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 40,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    // Android shadow
    elevation: 8,
  },

  // ── Logo ─────────────────────────────────────────────────────────────────
  // Styles live in WhenLogo.js — only the wrapper margin needed here
  logoWrapper: {
    marginBottom: 28,
  },

  // ── Headings ─────────────────────────────────────────────────────────────
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6e6e73',
    textAlign: 'center',
    marginBottom: 24,
  },

  // ── Error box ────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(232,93,4,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(232,93,4,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#e85d04',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Inputs ───────────────────────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1d1d1f',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1d1d1f',
    marginBottom: 16,
  },

  // ── Button ───────────────────────────────────────────────────────────────
  button: {
    backgroundColor: '#1a8fa8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Name row (register only) ─────────────────────────────────────────────
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  nameField: {
    flex: 1,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    fontSize: 13,
    color: '#6e6e73',
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a8fa8',
  },

});

export default styles;
