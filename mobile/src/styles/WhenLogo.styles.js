import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },

  // Full size (login screen)
  bar: {
    width: '80%',
    height: 3,
    borderRadius: 2,
  },
  text: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1d1d1f',
    letterSpacing: -2,
    marginVertical: 6,
  },

  // Compact (header)
  barCompact: {
    width: 80,
    height: 2,
    borderRadius: 2,
  },
  textCompact: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1d1d1f',
    letterSpacing: -1,
    marginVertical: 3,
  },

  // Seasons (full only)
  seasonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 2,
  },
  seasonItem: {
    alignItems: 'center',
  },
  string: {
    width: 1.5,
    height: 14,
    backgroundColor: '#d2d2d7',
  },
  emoji: {
    fontSize: 18,
    marginTop: 2,
  },
  scripture: {
    fontSize: 11,
    color: '#aeaeb2',
    fontStyle: 'italic',
    marginTop: 10,
    letterSpacing: 0.3,
  },
});

export default styles;
