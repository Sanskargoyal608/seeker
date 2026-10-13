import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/authSlice';
import apiClient from '../../../api/axios';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { PageContainer } from '../../../components/PageContainer';
import { useResponsive } from '../../../hooks/useResponsive';

export default function MentorshipChatScreen() {
  const { id } = useLocalSearchParams(); // request ID
  const router = useRouter();
  const user = useSelector(selectUser);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const flatListRef = useRef(null);

  const fetchChat = async () => {
    try {
      const { data } = await apiClient.get(`/api/core/mentorship/${id}/chat/`);
      setMessages(data);
    } catch (e) {
      console.log('Failed to fetch mentorship chat:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async () => {
    try {
      // Find the request details from the mentorship list
      const { data } = await apiClient.get('/api/core/mentorship/');
      const req = data.find(r => r.id.toString() === id.toString());
      if (req) setRequestData(req);
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchChat();
    fetchDetails();
  }, [id]));

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    setSending(true);
    try {
      const { data } = await apiClient.post(`/api/core/mentorship/${id}/chat/`, { text: inputText.trim() });
      setMessages(prev => [...prev, data]);
      setInputText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log('Failed to send:', e);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleRight : styles.msgBubbleLeft]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>{item.text}</Text>
        </View>
        <Text style={styles.msgTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageContainer>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurfaceVariant} />
          </Pressable>
          <View style={styles.headerInfo}>
             <Text style={styles.headerTitle}>
                {requestData?.therapist_name || 'Mentor'} (Mentor)
             </Text>
             <Text style={styles.headerSub}>Mentorship Chat</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.empty}>No messages yet.</Text>}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Message your mentor..."
              placeholderTextColor={COLORS.outline}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
            />
            <Pressable style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
              {sending ? <ActivityIndicator size="small" color={COLORS.onPrimary} /> : <Ionicons name="send" size={20} color={COLORS.onPrimary} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontFamily: FONTS.family.headline, fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  headerSub: { fontFamily: FONTS.family.body, fontSize: 12, color: COLORS.outline },
  chatContainer: { padding: 16, flexGrow: 1 },
  empty: { textAlign: 'center', color: COLORS.outline, marginTop: 40 },
  msgWrapper: { marginBottom: 16 },
  msgWrapperLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgWrapperRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgBubble: { maxWidth: '85%', padding: 16, borderRadius: RADIUS.xl },
  msgBubbleLeft: { backgroundColor: 'rgba(186, 235, 245, 0.1)', borderWidth: 1, borderColor: 'rgba(54, 101, 110, 0.1)', borderTopLeftRadius: 4 },
  msgBubbleRight: { backgroundColor: COLORS.primary, ...SHADOWS.sm, borderTopRightRadius: 4 },
  msgText: { fontFamily: FONTS.family.body, fontSize: FONTS.sizes.bodyMd, lineHeight: 24 },
  msgTextLeft: { color: COLORS.onSurface },
  msgTextRight: { color: COLORS.onPrimary },
  msgTime: { fontFamily: FONTS.family.body, fontSize: FONTS.sizes.caption, color: COLORS.outline, paddingHorizontal: 8, marginTop: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 12 },
  input: { flex: 1, backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 12, color: COLORS.onSurface },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});
