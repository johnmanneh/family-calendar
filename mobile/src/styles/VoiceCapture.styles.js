import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  backdrop: {
    flex:           1,
    backgroundColor:'rgba(0,0,0,0.82)',
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  closeBtn: {
    position: 'absolute',
    top:      56,
    right:    24,
    padding:  8,
  },
  micWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   28,
  },
  micRing: {
    position:     'absolute',
    width:        100,
    height:       100,
    borderRadius: 50,
    backgroundColor: 'rgba(26,143,168,0.28)',
  },
  micCircle: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: '#1a8fa8',
    alignItems:      'center',
    justifyContent:  'center',
    // iOS shadow
    shadowColor:     '#1a8fa8',
    shadowOpacity:   0.6,
    shadowRadius:    18,
    shadowOffset:    { width: 0, height: 6 },
    // Android
    elevation:       8,
  },
  statusText: {
    color:        '#fff',
    fontSize:     18,
    fontWeight:   '600',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  transcriptBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius:    12,
    paddingHorizontal: 20,
    paddingVertical:   14,
    marginBottom:    20,
    width:           '100%',
  },
  transcriptText: {
    color:      '#fff',
    fontSize:   16,
    lineHeight: 22,
    textAlign:  'center',
  },
  hintText: {
    color:      'rgba(255,255,255,0.45)',
    fontSize:   13,
    textAlign:  'center',
    lineHeight: 18,
  },
  fallbackInputRow: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor:'rgba(255,255,255,0.1)',
    borderRadius:   12,
    paddingHorizontal: 14,
    width:          '100%',
  },
  fallbackInput: {
    flex:       1,
    color:      '#fff',
    fontSize:   16,
    paddingVertical: 14,
  },
  fallbackGo: {
    marginLeft: 8,
  },
});

export default styles;
