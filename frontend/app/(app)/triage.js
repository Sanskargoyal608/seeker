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
  Alert,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { startTriage, respondTriage, getActiveTriage } from '../../api/core';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import PanicButton from '../../components/PanicButton';

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
    Keyboard.dismiss();
    
    const userMsg = { id: Date.now().toString(), text: userText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await respondTriage(sessionId, userText);
      
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
    
    if (isUser) {
      return (
        <View style={styles.userMsgContainer}>
          <View style={styles.userMsgBody}>
            <View style={styles.userBubble}>
              <Text style={styles.userMsgText}>{item.text}</Text>
            </View>
            <Text style={styles.msgTimeRight}>Just now</Text>
          </View>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={18} color={COLORS.onPrimaryContainer} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sysMsgContainer}>
        <View style={styles.sysAvatar}>
          <MaterialIcons name="smart-toy" size={18} color={COLORS.onSecondaryContainer} />
        </View>
        <View style={styles.sysMsgBody}>
          <Text style={styles.sysName}>Buddy AI</Text>
          <View style={styles.sysBubble}>
            <Text style={styles.sysMsgText}>{item.text}</Text>
          </View>
          <Text style={styles.msgTimeLeft}>Just now</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.replace('/(app)/dashboard')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <View style={styles.headerLogo}>
            <Ionicons name="pulse" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Buddy Wellness</Text>
        </View>
        <PanicButton variant="outline" />
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress Stepper */}
        <View style={styles.stepperContainer}>
          <View style={[styles.stepLine, styles.stepActive]} />
          <View style={[styles.stepLine, styles.stepInactive]} />
          <View style={[styles.stepLine, styles.stepInactive]} />
          <View style={[styles.stepLine, styles.stepInactive]} />
          <Text style={styles.stepText}>Step 1 of 4</Text>
        </View>

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
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Share what's on your mind..."
                placeholderTextColor="rgba(65, 72, 76, 0.5)"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
              />
              <Pressable 
                style={({ pressed }) => [styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled, pressed && { transform: [{ scale: 0.95 }] }]} 
                onPress={handleSend}
                disabled={!input.trim() || sending}
              >
                {sending ? <ActivityIndicator color={COLORS.onPrimary} size="small" /> : <Ionicons name="arrow-up" size={24} color={COLORS.onPrimary} />}
              </Pressable>
            </View>
            <View style={styles.footerHints}>
              <View style={styles.secureHint}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.onSurfaceVariant} />
                <Text style={styles.secureHintText}>Private & Secure</Text>
              </View>
              <Text style={styles.disclaimerText}>Buddy AI is here to listen, not to diagnose medical emergencies.</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginRight: 4,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.marginMobile,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  stepLine: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepActive: {
    backgroundColor: COLORS.primaryContainer,
  },
  stepInactive: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  stepText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    marginLeft: 8,
  },
  chatList: { 
    padding: SPACING.marginMobile, 
    flexGrow: 1, 
    paddingBottom: 24,
  },
  sysMsgContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    maxWidth: '85%',
  },
  sysAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  sysMsgBody: {
    flex: 1,
  },
  sysName: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    marginBottom: 4,
    marginLeft: 4,
  },
  sysBubble: {
    backgroundColor: 'rgba(186, 235, 245, 0.3)', // secondary-container/30
    borderWidth: 1,
    borderColor: 'rgba(186, 235, 245, 0.5)',
    padding: 16,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    borderBottomLeftRadius: 4,
  },
  sysMsgText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSecondaryContainer,
    lineHeight: 24,
  },
  msgTimeLeft: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    color: COLORS.outline,
    marginLeft: 4,
    marginTop: 4,
  },
  userMsgContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    maxWidth: '85%',
    alignSelf: 'flex-end',
  },
  userMsgBody: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: 4,
  },
  userMsgText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onPrimary,
    lineHeight: 24,
  },
  msgTimeRight: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    color: COLORS.outline,
    marginRight: 4,
    marginTop: 4,
  },
  inputSection: {
    paddingHorizontal: SPACING.marginMobile,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
    backgroundColor: 'rgba(251, 249, 248, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
    padding: 8,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.text,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  footerHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  secureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureHintText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  disclaimerText: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    color: COLORS.outline,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  completedBox: {
    margin: SPACING.marginMobile,
    padding: SPACING.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  returnBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  returnBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
});
