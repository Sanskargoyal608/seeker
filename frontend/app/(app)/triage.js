import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { startTriage, respondTriage, getActiveTriage } from '../../api/core';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export default function TriageScreen() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const flatListRef = useRef();

  useEffect(() => {
    initTriage();
  }, []);

  const initTriage = async () => {
    try {
      setLoading(true);
      let data = await getActiveTriage();
      
      if (!data) {
        data = await startTriage();
      }
      
      setSessionId(data.id);
      
      // Load initial messages
      const formattedMessages = data.messages.map((msg, index) => ({
        id: index.toString(),
        text: msg.content,
        sender: msg.role === 'model' ? 'system' : 'user',
      }));
      setMessages(formattedMessages);
      
      if (data.status === 'WAITING' || data.status === 'ROUTING' || data.is_complete) {
        setCompleted(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || completed) return;
    
    const userText = input.trim();
    setInput('');
    
    // Add user message locally
    const userMsg = { id: Date.now().toString(), text: userText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await respondTriage(sessionId, userText);
      
      // Update with full message history from server
      const formattedMessages = data.messages.map((msg, index) => ({
        id: index.toString(),
        text: msg.content,
        sender: msg.role === 'model' ? 'system' : 'user',
      }));
      setMessages(formattedMessages);
      
      if (data.status === 'WAITING' || data.status === 'ROUTING' || data.is_complete) {
        setCompleted(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.messageUser : styles.messageSystem]}>
        <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextSystem]}>
          {item.text}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Connecting to counselor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/(app)/dashboard')} style={styles.backBtn}>
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Intake Chat</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {completed ? (
          <View style={styles.completedBox}>
            <Text style={styles.completedText}>
              Thank you for sharing. We are now routing your case to the best available counselor.
            </Text>
            <Pressable style={styles.returnBtn} onPress={() => router.replace('/(app)/dashboard')}>
              <Text style={styles.returnBtnText}>Return to Dashboard</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your response..."
              placeholderTextColor={COLORS.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <Pressable 
              style={({ pressed }) => [styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled, pressed && { opacity: 0.8 }]} 
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.sendText}>Send</Text>}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.sm },
  backText: { color: COLORS.primary, fontSize: FONTS.sizes.body },
  headerTitle: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text },
  chatList: { padding: SPACING.md, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  messageUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  messageSystem: {
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: { fontSize: FONTS.sizes.body, lineHeight: 22 },
  messageTextUser: { color: COLORS.white },
  messageTextSystem: { color: COLORS.text },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    paddingTop: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    maxHeight: 120,
    minHeight: 45,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    height: 45,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  completedBox: {
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  completedText: { color: COLORS.text, fontSize: FONTS.sizes.body, textAlign: 'center', marginBottom: SPACING.lg },
  returnBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  returnBtnText: { color: COLORS.white, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.body },
});
