import { StyleSheet } from 'react-native';

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  fingersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 6,
  },
  finger: {
    alignItems: 'center',
    gap: 2,
  },
  fingerTip: {
    width: 14,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#1a8fa8',
    opacity: 0.7,
  },
  fingerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a8fa8',
    opacity: 0.4,
  },
  label: {
    fontSize: 11,
    color: '#aeaeb2',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});

export default s;
