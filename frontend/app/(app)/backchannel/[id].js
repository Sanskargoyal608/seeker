import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUser } from '../../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING } from '../../../constants/theme';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export default function BackchannelScreen() {
  const { id } = useLocalSearchParams(); // session_id
  const router = useRouter();
  const token = useSelector(selectAccessToken);
  const user = useSelector(selectUser);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);

  const ws = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!id || !token) return;

    // Connect to Backchannel WebSocket
    const wsUrl = `${WS_BASE_URL}/ws/backchannel/${id}/?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnected(true);
      console.log('Connected to backchannel:', id);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'backchannel.message') {
          // Identify if it's from the current user
          const isMe = data.sender_email === user?.email;
          if (isMe) return; // We render our own messages immediately

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString() + Math.random(),
              text: data.message,
              senderRole: data.sender_role,
              senderEmail: data.sender_email,
              isMe: false
            }
          ]);
        }
      } catch (err) {
        console.error('WS message error', err);
      }
    };

    ws.current.onerror = (error) => {
      console.log('WS error', error.message);
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log('WS closed');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [id, token]);

  const sendMessage = () => {
    if (!inputText.trim() || !connected) return;

    // Render locally immediately
    const myMsg = {
      id: Date.now().toString(),
      text: inputText.trim(),
      senderRole: user?.role,
      senderEmail: user?.email,
      isMe: true
    };
    setMessages((prev) => [...prev, myMsg]);

    ws.current.send(
      JSON.stringify({
        type: 'message',
        message: inputText.trim(),
      })
    );
    setInputText('');
  };

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.msgWrapper, item.isMe ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        {!item.isMe && (
          <Text style={styles.senderInfo}>
            {item.senderRole === 'THERAPIST' ? '🏥 Therapist' : '🎓 Counselor'} ({item.senderEmail})
          </Text>
        )}
        <View style={[styles.msgBubble, item.isMe ? styles.msgBubbleRight : styles.msgBubbleLeft]}>
          <Text style={[styles.msgText, item.isMe ? styles.msgTextRight : styles.msgTextLeft]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>&larr; Back to Chat</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Private Backchannel</Text>
          <Text style={styles.subtitle}>Session #{id}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : COLORS.error }]} />
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          🔒 This chat is private between the Therapist and the Counselor. The client cannot see these messages.
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet.</Text>
            <Text style={styles.emptySubtext}>Messages sent here are not saved after you leave.</Text>
          </View>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a private message..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <Pressable 
            style={[styles.sendBtn, (!inputText.trim() || !connected) && styles.sendBtnDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || !connected}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#1E293B', // Dark theme for private backchannel
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: { padding: SPACING.xs },
  backBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: 'bold' },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: FONTS.sizes.xs, color: '#94A3B8' },
  headerRight: { width: 50, alignItems: 'flex-end', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  
  banner: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 179, 8, 0.2)',
  },
  bannerText: {
    color: '#CA8A04',
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
  },

  chatContainer: { padding: SPACING.md, flexGrow: 1 },
  msgWrapper: { marginBottom: SPACING.md, maxWidth: '85%' },
  msgWrapperLeft: { alignSelf: 'flex-start' },
  msgWrapperRight: { alignSelf: 'flex-end' },
  
  senderInfo: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginLeft: 4,
  },
  
  msgBubble: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  msgBubbleLeft: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  msgBubbleRight: {
    backgroundColor: '#0F172A',
    borderBottomRightRadius: 0,
  },
  msgText: { fontSize: FONTS.sizes.body, lineHeight: 22 },
  msgTextLeft: { color: COLORS.text },
  msgTextRight: { color: COLORS.white },

  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.body,
    maxHeight: 100,
    color: COLORS.text,
  },
  sendBtn: {
    marginLeft: SPACING.md,
    backgroundColor: '#0F172A',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sizes.body },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.xs,
  }
});
