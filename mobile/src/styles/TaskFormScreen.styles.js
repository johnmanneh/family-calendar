import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },

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
  backBtn: {
    padding: 4,
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  saveHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#1a8fa8',
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveHeaderBtnDisabled: { opacity: 0.6 },
  saveHeaderBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
  },

  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Attendee bubbles — same as EventFormScreen
  attendeeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attendeeBubble: {
    alignItems: 'center',
    width: 52,
  },
  attendeeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  attendeeCircleSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  attendeeInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  attendeeTick: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#34c759',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  attendeeName: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    maxWidth: 52,
    textAlign: 'center',
  },

  // Segment control for position
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#1a8fa8',
  },
  segmentText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Due date
  dueDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dueDateToggle: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
  },
  dueDateToggleActive: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  dueDateToggleText: {
    fontSize: 13,
    color: '#1a8fa8',
    fontWeight: '600',
  },
  dueDateToggleTextActive: {
    color: '#ff3b30',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  dateBtnText: {
    fontSize: 15,
    color: '#1d1d1f',
    fontWeight: '500',
  },

  submitBtn: {
    backgroundColor: '#1a8fa8',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

});

export default styles;
