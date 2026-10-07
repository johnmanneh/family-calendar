/**
 * VoiceCapture.js
 *
 * Voice-to-event overlay. Records speech, shows live transcript, then
 * parses the result and navigates to EventForm pre-filled.
 *
 * Speech recognition uses expo-speech-recognition.
 * NOTE: expo-speech-recognition requires a custom Expo dev build (EAS build)
 * to work on device — it will NOT work in Expo Go. In Expo Go the component
 * falls back to a manual TextInput so the rest of the flow can still be tested.
 *
 * Props:
 *   visible    — bool
 *   onClose    — fn
 *   navigation — React Navigation navigation prop
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import parseVoiceInput from '../utils/parseVoiceInput';

// ── Try to load expo-speech-recognition ─────────────────────────────────────
// If it's unavailable (Expo Go), we fall back to a manual text input.
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent   = null;
let STT_AVAILABLE = false;

try {
  const stt = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = stt.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent   = stt.useSpeechRecognitionEvent;
  STT_AVAILABLE = true;
} catch (_) {
  // Running in Expo Go or package not linked — use manual fallback
  STT_AVAILABLE = false;
}

// ── Pulse animation hook ─────────────────────────────────────────────────────
function usePulse(active) {
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.22, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulse.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [active]);

  return pulse;
}

// ── VoiceCapture (with STT) ──────────────────────────────────────────────────

function VoiceCaptureWithSTT({ visible, onClose, navigation }) {
  const [status,     setStatus]     = useState('idle');   // idle | listening | processing | done
  const [transcript, setTranscript] = useState('');

  const pulse = usePulse(status === 'listening');

  // ── Speech recognition event listeners ────────────────────────────────────
  useSpeechRecognitionEvent('start',  () => setStatus('listening'));
  useSpeechRecognitionEvent('end',    () => {
    if (status === 'listening') setStatus('processing');
  });
  useSpeechRecognitionEvent('error',  (e) => {
    console.warn('SpeechRecognition error:', e.error);
    setStatus('idle');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const best = e.results?.[0]?.transcript ?? '';
    setTranscript(best);
    if (e.isFinal) {
      setStatus('processing');
      handleFinalTranscript(best);
    }
  });

  // Start listening when the modal opens
  useEffect(() => {
    if (!visible) {
      try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
      setStatus('idle');
      setTranscript('');
      return;
    }
    setStatus('idle');
    setTranscript('');
    // Small delay so the modal finishes animating before the mic starts
    const t = setTimeout(async () => {
      try {
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
        setStatus('idle');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [visible]);

  function handleFinalTranscript(text) {
    if (!text.trim()) { setStatus('idle'); return; }
    const parsed = parseVoiceInput(text);
    setStatus('done');
    setTimeout(() => {
      onClose();
      navigation.navigate('EventForm', { prefill: parsed });
    }, 400);
  }

  const statusLabel = {
    idle:       'Tap the mic to start',
    listening:  'Listening…',
    processing: 'Processing…',
    done:       'Opening form…',
  }[status];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Mic button — pulsing ring while listening */}
        <TouchableOpacity
          style={styles.micWrap}
          activeOpacity={0.8}
          onPress={() => {
            if (status === 'idle') {
              ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
            } else {
              ExpoSpeechRecognitionModule.stop();
            }
          }}
        >
          <Animated.View style={[styles.micRing, { transform: [{ scale: pulse }] }]} />
          <View style={styles.micCircle}>
            <Ionicons
              name={status === 'listening' ? 'mic' : 'mic-outline'}
              size={42}
              color="#fff"
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.statusText}>{statusLabel}</Text>

        {/* Live transcript */}
        {transcript ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        ) : null}

        <Text style={styles.hintText}>
          Try: "Dinner with John tomorrow at 7pm at Mario's"
        </Text>
      </View>
    </Modal>
  );
}

// ── VoiceCapture fallback (Expo Go / no STT) ─────────────────────────────────
// Shows a TextInput so the voice-to-event flow can be tested without a dev build.

function VoiceCaptureFallback({ visible, onClose, navigation }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!visible) setText('');
  }, [visible]);

  function handleSubmit() {
    if (!text.trim()) { onClose(); return; }
    const parsed = parseVoiceInput(text);
    onClose();
    navigation.navigate('EventForm', { prefill: parsed });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.micCircle}>
          <Ionicons name="mic-outline" size={42} color="#fff" />
        </View>

        <Text style={styles.statusText}>Voice Input</Text>
        <Text style={[styles.hintText, { marginBottom: 20 }]}>
          {/* STT not available in Expo Go — use a custom dev build for real voice input. */}
          Type what you'd say aloud:
        </Text>

        <View style={styles.fallbackInputRow}>
          <TextInput
            style={styles.fallbackInput}
            value={text}
            onChangeText={setText}
            placeholder="e.g. Dinner tomorrow at 7pm"
            placeholderTextColor="#8e8e93"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus
          />
          <TouchableOpacity style={styles.fallbackGo} onPress={handleSubmit}>
            <Ionicons name="arrow-forward-circle" size={36} color="#1a8fa8" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.hintText, { marginTop: 8, fontSize: 11, opacity: 0.5 }]}>
          Real voice input requires an EAS custom dev build.
        </Text>
      </View>
    </Modal>
  );
}

// ── Export the right component ───────────────────────────────────────────────

export default function VoiceCapture(props) {
  if (STT_AVAILABLE) {
    return <VoiceCaptureWithSTT {...props} />;
  }
  return <VoiceCaptureFallback {...props} />;
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
