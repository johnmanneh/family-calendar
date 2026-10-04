import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({

  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f2f2f7' },

  // ── Header ───────────────────────────────────────────────────────────────
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
  backBtn: { padding: 4, width: 40 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: { padding: 6 },

  // ── Inline create/join form ───────────────────────────────────────────────
  inlineForm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1d1d1f',
  },
  inlineBtn: {
    backgroundColor: '#1a8fa8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  inlineBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  inlineCancelBtn: { padding: 4 },

  // ── Group list ────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 12,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a8fa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  groupInfo: { flex: 1 },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 2,
  },
  groupMeta: {
    fontSize: 12,
    color: '#aeaeb2',
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ── Group detail ──────────────────────────────────────────────────────────
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  backRowText: {
    fontSize: 15,
    color: '#1a8fa8',
    fontWeight: '500',
  },
  groupHero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  groupHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a8fa8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeroLetter: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  groupHeroName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 2,
  },
  groupHeroMeta: {
    fontSize: 13,
    color: '#aeaeb2',
  },

  // Invite code card
  inviteCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inviteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f7',
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a8fa8',
  },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // Event rows inside group detail
  eventRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  eventStripe: { width: 4 },
  eventBody: { flex: 1, padding: 12 },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 13,
    color: '#888',
  },

});

export default styles;
