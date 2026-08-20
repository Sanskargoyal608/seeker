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
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectUser } from '../../../store/authSlice';
import apiClient from '../../../api/axios';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../../constants/theme';
import Constants from 'expo-constants';
import { Ionicons, MaterialSymbols } from '@expo/vector-icons';
import { endSession, submitFeedback, getTherapistsForEscalation, createEscalationRequest, getSession } from '../../../api/core';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // session_id
  const router = useRouter();
  const token = useSelector(selectAccessToken);
  const user = useSelector(selectUser);
  const isCounselor = user?.role === 'COUNSELOR';
  const isProvider = user?.role === 'COUNSELOR' || user?.role === 'THERAPIST';

  const [sessionData, setSessionData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [timer, setTimer] = useState(null);
  const [connected, setConnected] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sessionNotes, setSessionNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const { data } = await apiClient.get(`/api/core/sessions/${id}/notes/`);
      setSessionNotes(data);
    } catch (err) {
      console.log('Failed to fetch notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (noteModalVisible && isProvider) {
      fetchNotes();
    }
  }, [noteModalVisible]);

  // Escalation States
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);
  const [escalateTherapists, setEscalateTherapists] = useState([]);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateUrgency, setEscalateUrgency] = useState('MEDIUM');
  const [selectedTherapistId, setSelectedTherapistId] = useState(null);
  const [escalating, setEscalating] = useState(false);

  // Payment State
  const [paymentRequiredData, setPaymentRequiredData] = useState(null);

  const ws = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!id || !token) return;

    const fetchSessionInfo = async () => {
      try {
        const session = await getSession(id);
        setSessionData(session);
      } catch (err) {
        console.log('Failed to fetch session info:', err);
      }
    };
    fetchSessionInfo();

    // Fetch message history
    const fetchHistory = async () => {
      try {
        const { data } = await apiClient.get(`/api/core/sessions/${id}/messages/`);
        const formatted = data.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender_id == user?.id ? 'Me' : (msg.sender_role === 'System' ? 'System' : 'Other'),
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formatted);
      } catch (err) {
        console.log('Failed to fetch history:', err);
      }
    };
    fetchHistory();

    // Connect to WebSocket
    const wsUrl = `${WS_BASE_URL}/ws/chat/${id}/?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnected(true);
      console.log('Connected to chat:', id);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat.message') {
          if (data.sender_id == user?.id) return;
          setMessages((prev) => [...prev, { 
            id: Date.now().toString(), 
            text: data.message, 
            sender: 'Other',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else if (data.type === 'timer.update') {
          setTimer(data.time_remaining_seconds);
        } else if (data.type === 'payment.required') {
          if (isProvider) {
            Alert.alert('System', 'The user needs to make a payment to continue the session.');
          } else {
            setPaymentRequiredData(data.message);
          }
        } else if (data.type === 'system.alert') {
          Alert.alert('System', data.message);
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

  const handlePayment = async () => {
    try {
      await apiClient.post(`/api/core/sessions/${id}/verify-payment/`);
      setPaymentRequiredData(null);
      Alert.alert('Success', 'Payment successful! Chat resumed.');
    } catch (err) {
      Alert.alert('Error', 'Payment failed.');
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      await apiClient.post(`/api/core/sessions/${id}/notes/`, {
        note_text: noteText.trim(),
        is_private: true
      });
      setNoteText('');
      fetchNotes(); // refetch notes
    } catch (err) {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !connected) return;

    const myMsg = { 
      id: Date.now().toString(), 
      text: inputText.trim(), 
      sender: 'Me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  const handleEscalate = async () => {
    setEscalateModalVisible(true);
    try {
      const therapists = await getTherapistsForEscalation();
      setEscalateTherapists(therapists);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch therapists for escalation.');
    }
  };

  const handleEscalateSubmit = async () => {
    if (!selectedTherapistId || !escalateReason.trim()) {
      Alert.alert('Error', 'Please select a therapist and provide a reason.');
      return;
    }
    setEscalating(true);
    try {
      await createEscalationRequest(id, selectedTherapistId, escalateUrgency, escalateReason.trim());
      setEscalateModalVisible(false);
      Alert.alert('Escalated', 'The session has been escalated to the therapist.', [
        { text: 'OK', onPress: () => router.replace('/(app)/dashboard') }
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to escalate session.');
    } finally {
      setEscalating(false);
    }
  };

  const handleEndSession = () => {
    Alert.alert('End Session', 'Are you sure you want to end this session?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'End', 
        style: 'destructive',
        onPress: async () => {
          try {
            await endSession(id);
            if (!isProvider) {
              router.replace(`/(app)/feedback/${id}`);
            } else {
              router.replace('/(app)/dashboard');
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to end session.');
          }
        }
      }
    ]);
  };



  const renderItem = ({ item }) => {
    if (item.sender === 'System') {
      return (
        <View style={styles.systemMsgWrap}>
           <View style={styles.systemMsgContainer}>
             <Text style={styles.systemMsgText}>{item.text}</Text>
           </View>
        </View>
      );
    }

    const isMe = item.sender === 'Me';
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleRight : styles.msgBubbleLeft]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>{item.text}</Text>
        </View>
        <Text style={styles.msgTime}>{item.timestamp || 'Just now'}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurfaceVariant} />
          </Pressable>
          <View style={styles.headerProviderInfo}>
             <View style={styles.avatarWrap}>
                <View style={styles.avatarPlaceholder}>
                   <Text style={{ fontFamily: FONTS.family.headline, color: COLORS.onSurfaceVariant, fontSize: 16 }}>{sessionData?.provider_name?.[0] || 'Dr'}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.statusAvailable : COLORS.error }]} />
             </View>
             <View>
                <Text style={styles.providerName}>{sessionData?.provider_name || 'Provider'}</Text>
                <Text style={styles.providerTitle}>Session #{id}</Text>
             </View>
          </View>
        </View>
        <View style={styles.headerRight}>
           <Pressable onPress={handleEndSession} style={styles.endBtn}>
              <Text style={styles.endBtnText}>End Session</Text>
           </Pressable>
        </View>
      </View>

      {/* Timer Bar */}
      {timer !== null && (
         <View style={styles.timerBar}>
            <Ionicons name="timer-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.timerBarText}>
               {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </Text>
         </View>
      )}

      {/* Provider Tools */}
      {isProvider && (
        <View style={styles.counselorTools}>
          <Pressable style={styles.toolBtn} onPress={() => setNoteModalVisible(true)}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.text} />
            <Text style={styles.toolBtnText}>Note</Text>
          </Pressable>
          {isCounselor && (
            <Pressable style={[styles.toolBtn, styles.toolBtnDanger]} onPress={handleEscalate}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.toolBtnDangerText}>Escalate</Text>
            </Pressable>
          )}
          {sessionData?.has_escalation && (
            <Pressable style={[styles.toolBtn, { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]} onPress={() => router.push(`/(app)/backchannel/${id}`)}>
              <Ionicons name="chatbubbles-outline" size={16} color="#0284C7" />
              <Text style={[styles.toolBtnText, { color: '#0284C7' }]}>Backchannel</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* AI Emotion Analysis Mock */}
      {isCounselor && (
        <View style={styles.aiSupportBox}>
           <Ionicons name="sparkles" size={16} color="#0284C7" style={{ marginRight: 6 }} />
           <Text style={styles.aiSupportText}>AI Support: Emotional intensity rising (Anxiety score: 0.72)</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Share what's on your mind..."
              placeholderTextColor={COLORS.outline}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
            />
          </View>
          <Pressable style={styles.sendBtn} onPress={sendMessage}>
             <Ionicons name="send" size={20} color={COLORS.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <Modal visible={noteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Session Notes</Text>
            
            {loadingNotes ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
            ) : (
              <FlatList
                data={sessionNotes}
                keyExtractor={(item) => item.id.toString()}
                style={{ maxHeight: 200, width: '100%', marginBottom: SPACING.md }}
                ListEmptyComponent={<Text style={{ color: COLORS.textMuted, fontStyle: 'italic', marginBottom: SPACING.md }}>No notes yet.</Text>}
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: COLORS.surfaceVariant, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.xs }}>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 2 }}>{new Date(item.created_at).toLocaleString()}</Text>
                    <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.onSurface }}>{item.note_text}</Text>
                  </View>
                )}
              />
            )}

            <TextInput
              style={styles.modalInputArea}
              placeholder="Type a new clinical note here..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setNoteModalVisible(false); setNoteText(''); }}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleSaveNote}>
                <Text style={styles.modalSaveBtnText}>Save Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>



      <Modal visible={escalateModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Escalate Session</Text>
            <Text style={styles.modalSubtitle}>Transfer this session to a Licensed Therapist for advanced care.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.feedbackLabel}>Urgency</Text>
              <View style={styles.urgencyContainer}>
                {['LOW', 'MEDIUM', 'CRITICAL'].map((u) => (
                  <Pressable
                    key={u}
                    style={[styles.urgencyBtn, escalateUrgency === u && styles.urgencyBtnSelected]}
                    onPress={() => setEscalateUrgency(u)}
                  >
                    <Text style={[styles.urgencyBtnText, escalateUrgency === u && styles.urgencyBtnTextSelected]}>{u}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.feedbackLabel}>Reason for Escalation</Text>
              <TextInput
                style={styles.modalInputArea}
                multiline
                numberOfLines={3}
                value={escalateReason}
                onChangeText={setEscalateReason}
                placeholder="Clinical reason..."
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.feedbackLabel}>Select Therapist</Text>
              {escalateTherapists.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, marginBottom: SPACING.md }}>Loading therapists...</Text>
              ) : (
                escalateTherapists.map(t => (
                  <Pressable
                    key={t.id}
                    style={[styles.therapistCard, selectedTherapistId === t.id && styles.therapistCardSelected]}
                    onPress={() => setSelectedTherapistId(t.id)}
                  >
                    <Text style={[styles.therapistName, selectedTherapistId === t.id && styles.therapistNameSelected]}>{t.name}</Text>
                    <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textSecondary }}>
                      {[...(t.modalities || []), ...(t.languages || [])].join(', ')}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: SPACING.lg }]}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setEscalateModalVisible(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleEscalateSubmit} disabled={escalating}>
                {escalating ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.modalSaveBtnText}>Escalate</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={!!paymentRequiredData} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
           <View style={styles.paymentModalCard}>
              <View style={styles.paymentIconWrap}>
                 <Ionicons name="card" size={32} color={COLORS.onSecondaryContainer} />
              </View>
              <Text style={styles.paymentTitle}>Continue your session?</Text>
              <Text style={styles.paymentSub}>{paymentRequiredData}</Text>

              <View style={styles.paymentOptions}>
                 <Pressable style={styles.paymentOption}>
                    <View>
                       <Text style={styles.paymentOptionLabel}>30 Minute Session</Text>
                       <Text style={styles.paymentOptionSub}>Intensive focus</Text>
                    </View>
                    <Text style={styles.paymentOptionPrice}>$20</Text>
                 </Pressable>
                 <Pressable style={[styles.paymentOption, styles.paymentOptionActive]}>
                    <View>
                       <Text style={styles.paymentOptionLabel}>60 Minute Session</Text>
                       <Text style={styles.paymentOptionSub}>Deep exploration</Text>
                    </View>
                    <Text style={styles.paymentOptionPrice}>$35</Text>
                 </Pressable>
              </View>

              <Pressable style={styles.payBtn} onPress={handlePayment}>
                 <Text style={styles.payBtnText}>Pay to Continue</Text>
                 <Ionicons name="lock-closed" size={16} color={COLORS.onPrimary} />
              </Pressable>
              <Pressable style={styles.payCancelBtn} onPress={() => { setPaymentRequiredData(null); handleEndSession(); }}>
                 <Text style={styles.payCancelText}>End Session</Text>
              </Pressable>
           </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(113, 120, 124, 0.3)', // outline-variant/30
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  headerProviderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  providerName: {
    fontFamily: FONTS.family.headline,
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  providerTitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  endBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.error,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 235, 245, 0.9)', // secondary-container/90
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(54, 101, 110, 0.1)', // secondary/10
    gap: 8,
  },
  timerBarText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.secondary,
  },
  counselorTools: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: SPACING.sm,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  toolBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.full, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant 
  },
  toolBtnText: { 
    fontFamily: FONTS.family.body,
    color: COLORS.onSurface, 
    fontSize: FONTS.sizes.sm, 
    fontWeight: '600' 
  },
  toolBtnDanger: { 
    borderColor: COLORS.error 
  },
  toolBtnDangerText: { 
    fontFamily: FONTS.family.body,
    color: COLORS.error, 
    fontSize: FONTS.sizes.sm, 
    fontWeight: '600' 
  },
  chatContainer: { 
    padding: SPACING.marginMobile, 
    flexGrow: 1, 
    justifyContent: 'flex-end',
    gap: 24,
  },
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 16,
  },
  systemMsgContainer: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  systemMsgText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  msgWrapper: {
    flexDirection: 'column',
    gap: 4,
  },
  msgWrapperLeft: {
    alignItems: 'flex-start',
  },
  msgWrapperRight: {
    alignItems: 'flex-end',
  },
  msgBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: RADIUS.xl,
  },
  msgBubbleLeft: {
    backgroundColor: 'rgba(186, 235, 245, 0.1)', // secondary-container/10
    borderWidth: 1,
    borderColor: 'rgba(54, 101, 110, 0.1)', // secondary/10
    borderTopLeftRadius: 4,
  },
  msgBubbleRight: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
    borderTopRightRadius: 4,
  },
  msgText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    lineHeight: 24,
  },
  msgTextLeft: {
    color: COLORS.onSurface,
  },
  msgTextRight: {
    color: COLORS.onPrimary,
  },
  msgTime: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.outline,
    paddingHorizontal: 8,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 199, 204, 0.2)', // outline-variant/20
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurface,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(27, 28, 28, 0.4)', // on-surface/40
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: { 
    width: '100%', 
    maxWidth: 400,
    backgroundColor: COLORS.surfaceContainerLowest, 
    borderRadius: RADIUS.xl, 
    padding: 24, 
    ...SHADOWS.lg,
  },
  modalTitle: { 
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd, 
    fontWeight: '700', 
    color: COLORS.onSurface, 
    marginBottom: 8,
  },
  modalSubtitle: { 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd, 
    color: COLORS.onSurfaceVariant, 
    marginBottom: 24,
  },
  modalInputArea: { 
    backgroundColor: COLORS.background, 
    borderRadius: RADIUS.md, 
    padding: SPACING.md, 
    height: 120, 
    textAlignVertical: 'top', 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd, 
    color: COLORS.text, 
    marginBottom: SPACING.lg, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant,
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: SPACING.md,
  },
  modalCancelBtn: { 
    paddingVertical: SPACING.sm, 
    paddingHorizontal: SPACING.md, 
    borderRadius: RADIUS.sm,
  },
  modalCancelBtnText: { 
    fontFamily: FONTS.family.body,
    color: COLORS.textSecondary, 
    fontWeight: '600',
  },
  modalSaveBtn: { 
    backgroundColor: COLORS.primary, 
    paddingVertical: SPACING.sm, 
    paddingHorizontal: SPACING.lg, 
    borderRadius: RADIUS.full, 
  },
  modalSaveBtnText: { 
    fontFamily: FONTS.family.body,
    color: COLORS.white, 
    fontWeight: '600',
  },
  feedbackLabel: { 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.sm, 
    fontWeight: '600', 
    color: COLORS.onSurface, 
    marginBottom: 8,
  },
  feedbackInput: { 
    backgroundColor: COLORS.surfaceContainerLowest, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant, 
    borderRadius: RADIUS.md, 
    padding: SPACING.sm, 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd, 
    textAlignVertical: 'top', 
    minHeight: 80,
  },
  urgencyContainer: { 
    flexDirection: 'row', 
    gap: SPACING.sm, 
    marginBottom: SPACING.md,
  },
  urgencyBtn: { 
    flex: 1, 
    paddingVertical: SPACING.sm, 
    borderRadius: RADIUS.sm, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant, 
    alignItems: 'center',
  },
  urgencyBtnSelected: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary,
  },
  urgencyBtnText: { 
    fontFamily: FONTS.family.body,
    color: COLORS.onSurface, 
    fontSize: FONTS.sizes.xs, 
    fontWeight: '600',
  },
  urgencyBtnTextSelected: { 
    color: COLORS.onPrimary,
  },
  therapistCard: { 
    padding: SPACING.md, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant, 
    marginBottom: SPACING.sm,
  },
  therapistCardSelected: { 
    borderColor: COLORS.primary, 
    backgroundColor: 'rgba(16, 67, 86, 0.05)', // primary/5
  },
  therapistName: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  therapistNameSelected: { 
    color: COLORS.primary,
  },
  paymentModalCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  paymentIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  aiSupportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  aiSupportText: {
    color: '#0284C7',
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  paymentTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginBottom: 8,
  },
  paymentSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 32,
  },
  paymentOptions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
  },
  paymentOptionActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(16, 67, 86, 0.05)',
  },
  paymentOptionLabel: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  paymentOptionSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  paymentOptionPrice: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    width: '100%',
    borderRadius: RADIUS.full,
    gap: 8,
    ...SHADOWS.md,
  },
  payBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  payCancelBtn: {
    marginTop: 16,
  },
  payCancelText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  }
});
