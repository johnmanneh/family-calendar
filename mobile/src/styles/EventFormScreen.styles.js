import { StyleSheet } from 'react-native';
import { useColorScheme } from '../context/ThemeContext';
import { LIGHT, DARK } from '../theme';

const make = c => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    
    // background comes from TopCard (floating card like home)
  },
  backBtn: { padding: 4, width: 44 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  saveHeaderBtn: {
    paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#1a8fa8',
    borderRadius: 20, minWidth: 60, alignItems: 'center',
  },
  saveHeaderBtnDisabled: { opacity: 0.6 },
  saveHeaderBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.08)', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
  },
  errorText: { color: '#ff3b30', fontSize: 13, textAlign: 'center' },

  titleInput: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    fontSize: 20, fontWeight: '600', color: c.text, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },

  card: {
    backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardDivider: { height: 1, backgroundColor: c.separator, marginVertical: 10 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  toggleLabel: { fontSize: 15, color: c.text, fontWeight: '500' },

  dateRow: { paddingVertical: 4 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: c.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surface2, borderRadius: 10, padding: 12,
  },
  dateBtnText: { fontSize: 15, color: c.text, fontWeight: '500' },
  picker: { marginTop: 8 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: c.surface2 },
  segmentFlex: { flex: 1, alignItems: 'center' },
  segmentActive: { backgroundColor: '#1a8fa8' },
  segmentText: { fontSize: 13, color: c.textSub, fontWeight: '500' },
  segmentTextActive: { color: '#fff', fontWeight: '600' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: c.surface2, borderWidth: 1, borderColor: 'transparent',
  },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontSize: 13, color: c.textSub, fontWeight: '500' },

  attendeeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  attendeeBubble: { alignItems: 'center', width: 52 },
  attendeeCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  attendeeCircleSelected: {
    borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  attendeeInitials: { color: '#fff', fontWeight: '700', fontSize: 14 },
  attendeeTick: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#34c759', borderRadius: 8, width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  attendeeName: { fontSize: 11, color: c.textSub, marginTop: 4, maxWidth: 52, textAlign: 'center' },
  attendeeBusy: { opacity: 0.4 },
  busyNote: { fontSize: 12, color: '#ff3b30', marginTop: 8 },
  attendeeGroup: { fontSize: 9, color: c.textSub, opacity: 0.8, maxWidth: 60, textAlign: 'center' },

  taskRow: { borderTopWidth: 1, borderTopColor: c.separator, paddingTop: 10, marginTop: 4, marginBottom: 4 },
  taskTitleInput: {
    backgroundColor: c.surface2, borderRadius: 8, padding: 10,
    fontSize: 14, color: c.text, marginBottom: 8,
  },
  taskAssignRow: { flexDirection: 'row', marginBottom: 8 },
  taskPositionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.surface2, marginRight: 6 },
  assignChipActive: { backgroundColor: '#1a8fa8' },
  assignChipText: { fontSize: 12, color: c.textSub, fontWeight: '500' },
  assignChipTextActive: { color: '#fff', fontWeight: '600' },
  posChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.surface2 },
  posChipActive: { backgroundColor: '#1a8fa8' },
  posChipText: { fontSize: 12, color: c.textSub, fontWeight: '500' },
  posChipTextActive: { color: '#fff', fontWeight: '600' },
  taskRemoveBtn: { marginLeft: 'auto', padding: 2 },
  addTaskBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 6 },
  addTaskText: { fontSize: 14, color: '#1a8fa8', fontWeight: '600' },

  textInput: { backgroundColor: c.surface2, borderRadius: 10, padding: 12, fontSize: 15, color: c.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorDotSelected: {
    transform: [{ scale: 1.2 }], shadowColor: '#000',
    shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  submitBtn: { backgroundColor: '#1a8fa8', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const lightStyles = make(LIGHT);
const darkStyles  = make(DARK);

export function useStyles() {
  return useColorScheme() === 'dark' ? darkStyles : lightStyles;
}
export default lightStyles;
