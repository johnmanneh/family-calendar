import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import API, { SERVER_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { parseDateMentions } from '../utils/parseDateMentions';
import { useStyles } from '../styles/ChatScreen.styles';

import TopCard from '../components/ui/TopCard';
// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function initials(msg) {
  return [msg.first_name?.[0], msg.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageRow({ msg, isMe, navigation }) {
  const { t } = useTranslation();
  const styles   = useStyles();
  const segments = parseDateMentions(msg.body);
  const hasDate  = segments.some(s => s.type === 'date');

  const photoUri = msg.avatar_url
    ? (msg.avatar_url.startsWith('http') ? msg.avatar_url : `${SERVER_URL}${msg.avatar_url}`)
    : null;

  return (
    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
      {!isMe && (
        photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: msg.color || '#1a8fa8' }]}>
            <Text style={styles.avatarText}>{initials(msg)}</Text>
          </View>
        )
      )}
      <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
        {!isMe && (
          <Text style={styles.senderName}>
            {msg.first_name} {msg.last_name}
          </Text>
        )}
        <View style={[styles.bubble, isMe && styles.bubbleMe]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
            {segments.map((seg, i) =>
              seg.type === 'date' ? (
                <Text
                  key={i}
                  style={[styles.dateLink, isMe && styles.dateLinkMe]}
                  onPress={() =>
                    navigation.navigate('EventForm', { date: seg.date.toISOString() })
                  }
                >
                  {seg.value}
                </Text>
              ) : (
                <Text key={i}>{seg.value}</Text>
              )
            )}
          </Text>
          {hasDate && (
            <Text style={[styles.dateLinkHint, isMe && styles.dateLinkHintMe]}>
              {t('chat.date_hint')}
            </Text>
          )}
        </View>
        <Text style={styles.msgTime}>{timeLabel(msg.created_at)}</Text>
      </View>
    </View>
  );
}

// ─── ChatScreen ───────────────────────────────────────────────────────────────

export default function ChatScreen({ navigation }) {
  const { t }           = useTranslation();
  const styles          = useStyles();
  const { user }        = useAuth();
  const { lastChatMsg } = useSSE();

  const [messages, setMessages] = useState([]);
  const [draft,    setDraft]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await API.get('/chat');
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates via SSE — append incoming message, dedup by id
  useEffect(() => {
    if (!lastChatMsg) return;
    setMessages(prev => {
      if (prev.some(m => m.id === lastChatMsg.id)) return prev;
      return [...prev, lastChatMsg];
    });
  }, [lastChatMsg]);

  // Scroll to end when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const res = await API.post('/chat', { body });
      const sent = res.data.message;
      if (sent) {
        // Append immediately — don't wait for SSE to bounce it back
        setMessages(prev =>
          prev.some(m => m.id === sent.id) ? prev : [...prev, sent]
        );
      }
    } catch { /* silent */ }
    setSending(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>

      {/* ── Header ── */}
      <TopCard>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1a8fa8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('chat.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </TopCard>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Message list ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a8fa8" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <MessageRow
                msg={item}
                isMe={Number(item.user_id) === Number(user?.id)}
                navigation={navigation}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>{t('chat.empty')}</Text>
              </View>
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* ── Input bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor="#aeaeb2"
            value={draft}
            onChangeText={setDraft}
            multiline
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            activeOpacity={0.75}
          >
            <Ionicons name="paper-plane" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
