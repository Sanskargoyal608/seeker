import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/authSlice';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/axios';
import { COLORS, FONTS, RADIUS, SPACING } from '../../../constants/theme';

export default function TherapistMenteesScreen() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null); // mentorship request being chatted
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchRequests = async () => {
    try {
      const { data } = await apiClient.get('/api/core/mentorship/');
      setRequests(data);
    } catch (e) {
      console.log('Failed to fetch mentorship requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const handleRespond = async (requestId, action) => {
    try {
      await apiClient.post(`/api/core/mentorship/${requestId}/respond/`, { action });
      Alert.alert('Done', `Request ${action.toLowerCase()}ed.`);
      fetchRequests();
    } catch (e) {
      Alert.alert('Error', 'Failed to respond.');
    }
  };

  const openChat = async (request) => {
    setActiveChat(request);
    setLoadingChat(true);
    try {
      const { data } = await apiClient.get(`/api/core/mentorship/${request.id}/chat/`);
      setChatMessages(data);
    } catch (e) {
      console.log('Chat fetch error:', e);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async () => {
    if (!chatText.trim() || !activeChat) return;
    setSendingMsg(true);
    try {
      const { data } = await apiClient.post(`/api/core/mentorship/${activeChat.id}/chat/`, { text: chatText.trim() });
      setChatMessages(prev => [...prev, data]);
      setChatText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  if (activeChat) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => { setActiveChat(null); setChatMessages([]); }} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{activeChat.counselor_name}</Text>
            <Text style={styles.headerSub}>Mentorship Chat</Text>
          </View>
        </View>
        
        <View style={styles.sopBanner}>
          <Text style={styles.sopBannerLabel}>Statement of Purpose:</Text>
          <Text style={styles.sopBannerText} numberOfLines={3}>{activeChat.sop_message}</Text>
        </View>

        <FlatList
          data={chatMessages}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.chatContainer}
          ListEmptyComponent={loadingChat ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.emptyChat}>No messages yet. Start the conversation!</Text>}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
                <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
                  <Text style={[styles.msgText, isMe && { color: COLORS.onPrimary }]}>{item.text}</Text>
                </View>
                <Text style={styles.msgTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            );
          }}
        />

        <View style={styles.inputArea}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.outline}
            value={chatText}
            onChangeText={setChatText}
            onSubmitEditing={sendMessage}
          />
          <Pressable style={styles.sendBtn} onPress={sendMessage} disabled={sendingMsg}>
            {sendingMsg ? <ActivityIndicator color={COLORS.onPrimary} size="small" /> : <Ionicons name="send" size={20} color={COLORS.onPrimary} />}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pending = requests.filter(r => r.status === 'PENDING');
  const accepted = requests.filter(r => r.status === 'ACCEPTED');
  const declined = requests.filter(r => r.status === 'DECLINED');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </Pressable>
        <Text style={[styles.headerTitle, { marginLeft: 12 }]}>Mentees</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={64} color={COLORS.outline} />
            <Text style={styles.emptyTitle}>No mentorship requests yet</Text>
            <Text style={styles.emptyText}>When counselors apply for mentorship, their requests will appear here.</Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests ({pending.length})</Text>
                {pending.map(req => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <View style={styles.reqAvatar}>
                        <Text style={styles.reqAvatarText}>{req.counselor_name?.[0] || '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reqName}>{req.counselor_name}</Text>
                        <Text style={styles.reqDate}>{new Date(req.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <Text style={styles.sopLabel}>Statement of Purpose:</Text>
                    <Text style={styles.sopText} numberOfLines={4}>{req.sop_message}</Text>
                    <View style={styles.reqActions}>
                      <Pressable style={styles.declineBtn} onPress={() => handleRespond(req.id, 'DECLINE')}>
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </Pressable>
                      <Pressable style={styles.acceptBtn} onPress={() => handleRespond(req.id, 'ACCEPT')}>
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {accepted.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Mentees ({accepted.length})</Text>
                {accepted.map(req => (
                  <Pressable key={req.id} style={styles.menteeCard} onPress={() => openChat(req)}>
                    <View style={styles.reqAvatar}>
                      <Text style={styles.reqAvatarText}>{req.counselor_name?.[0] || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqName}>{req.counselor_name}</Text>
                      <Text style={styles.reqDate}>Accepted • Tap to chat</Text>
                    </View>
                    <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
                  </Pressable>
                ))}
              </View>
            )}

            {declined.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Declined ({declined.length})</Text>
                {declined.map(req => (
                  <View key={req.id} style={[styles.menteeCard, { opacity: 0.5 }]}>
                    <View style={styles.reqAvatar}><Text style={styles.reqAvatarText}>{req.counselor_name?.[0]}</Text></View>
                    <View style={{ flex: 1 }}><Text style={styles.reqName}>{req.counselor_name}</Text><Text style={styles.reqDate}>Declined</Text></View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B' },
  content: { padding: 20, paddingBottom: 60 },
  emptyWrap: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  requestCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  requestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reqAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryFixed || '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reqAvatarText: { fontSize: 20, fontWeight: '700', color: COLORS.primary || '#0284C7' },
  reqName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  reqDate: { fontSize: 13, color: '#64748B', marginTop: 2 },
  sopLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sopText: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 16 },
  reqActions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  acceptBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.primary },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  menteeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  sopBanner: { backgroundColor: '#F0F9FF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0F2FE' },
  sopBannerLabel: { fontSize: 11, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sopBannerText: { fontSize: 13, color: '#334155', lineHeight: 20 },
  chatContainer: { padding: 16, flexGrow: 1, gap: 12 },
  emptyChat: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginTop: 40 },
  msgRow: { gap: 4 },
  msgRowLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgRowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: 14, borderRadius: 18 },
  msgBubbleMe: { backgroundColor: COLORS.primary, borderTopRightRadius: 4 },
  msgBubbleThem: { backgroundColor: '#F1F5F9', borderTopLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#0F172A', lineHeight: 22 },
  msgTime: { fontSize: 11, color: '#94A3B8', paddingHorizontal: 8 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 12 },
  chatInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
