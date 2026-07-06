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
import { COLORS, FONTS, RADIUS, SPACING } from '../../../constants/theme';
import Constants from 'expo-constants';
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
  
  // Feedback States
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Escalation States
  const [escalateModalVisible, setEscalateModalVisible] = useState(false);
  const [escalateTherapists, setEscalateTherapists] = useState([]);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateUrgency, setEscalateUrgency] = useState('MEDIUM');
  const [selectedTherapistId, setSelectedTherapistId] = useState(null);
  const [escalating, setEscalating] = useState(false);

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
          sender: msg.sender_id == user?.id ? 'Me' : (msg.sender_role === 'System' ? 'System' : 'Other')
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
          // Ignore if it's our own message echoing back (use == to handle string vs int)
          if (data.sender_id == user?.id) return;
          
          setMessages((prev) => [...prev, { id: Date.now().toString(), text: data.message, sender: 'Other' }]);
        } else if (data.type === 'timer.update') {
          setTimer(data.time_remaining_seconds);
        } else if (data.type === 'payment.required') {
          if (isCounselor) {
            Alert.alert('System', 'The user needs to make a payment to continue the session.');
          } else {
            Alert.alert(
              'Payment Required', 
              data.message,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Pay Now', onPress: handlePayment }
              ]
            );
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
      Alert.alert('Success', 'Note saved successfully.');
      setNoteModalVisible(false);
      setNoteText('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !connected) return;

    // Add locally to show immediately on right side
    const myMsg = { id: Date.now().toString(), text: inputText.trim(), sender: 'Me' };
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
              setFeedbackModalVisible(true);
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

  const handleFeedbackSubmit = async () => {
    if (!q1.trim() || !q2.trim() || !q3.trim() || !q4.trim()) {
      Alert.alert('Error', 'Please answer all questions to help us improve.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitFeedback(id, {
        q1_before_session: q1.trim(),
        q2_after_session: q2.trim(),
        q3_what_helped: q3.trim(),
        q4_what_improve: q4.trim()
      });
      setFeedbackModalVisible(false);
      Alert.alert('Thank You', 'Your feedback has been recorded!', [
        { text: 'OK', onPress: () => router.replace('/(app)/dashboard') }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderItem = ({ item }) => {
    if (item.sender === 'System') {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    const isMe = item.sender === 'Me';
    return (
      <View style={[styles.msgWrapper, isMe ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleRight : styles.msgBubbleLeft]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>&larr; Exit</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Session #{id}</Text>
          {timer !== null && (
            <Text style={styles.timerText}>
              Time left: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : COLORS.error, marginRight: 10 }]} />
          <Pressable onPress={handleEndSession} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End</Text>
          </Pressable>
        </View>
      </View>

      {isProvider && (
        <View style={styles.counselorTools}>
          <Pressable style={styles.toolBtn} onPress={() => setNoteModalVisible(true)}>
            <Text style={styles.toolBtnText}>📝 Add Note</Text>
          </Pressable>
          {isCounselor && (
            <Pressable style={[styles.toolBtn, styles.toolBtnDanger]} onPress={handleEscalate}>
              <Text style={styles.toolBtnDangerText}>🚨 Escalate</Text>
            </Pressable>
          )}
          {sessionData?.has_escalation && (
            <Pressable style={[styles.toolBtn, { backgroundColor: '#E0F2FE', borderColor: '#0284C7' }]} onPress={() => router.push(`/(app)/backchannel/${id}`)}>
              <Text style={[styles.toolBtnText, { color: '#0284C7' }]}>🔄 Join Backchannel</Text>
            </Pressable>
          )}
        </View>
      )}

      <Modal visible={noteModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Private Note</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type your clinical note here..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setNoteModalVisible(false); setNoteText(''); }}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleSaveNote}>
                <Text style={styles.modalSaveBtnText}>Save Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={feedbackModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Session Feedback</Text>
            <Text style={styles.modalSubtitle}>Please help us improve by answering a few quick questions.</Text>
            
            <FlatList
              data={[
                { key: 'q1', title: '1. How did you feel before the session?', state: q1, setState: setQ1 },
                { key: 'q2', title: '2. How do you feel after the session?', state: q2, setState: setQ2 },
                { key: 'q3', title: '3. What helped you the most?', state: q3, setState: setQ3 },
                { key: 'q4', title: '4. What could we improve?', state: q4, setState: setQ4 },
              ]}
              keyExtractor={i => i.key}
              renderItem={({ item }) => (
                <View style={{ marginBottom: SPACING.md }}>
                  <Text style={styles.feedbackLabel}>{item.title}</Text>
                  <TextInput
                    style={styles.feedbackInput}
                    multiline
                    numberOfLines={3}
                    value={item.state}
                    onChangeText={item.setState}
                    placeholder="Your answer..."
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              )}
            />

            <View style={[styles.modalActions, { marginTop: SPACING.lg }]}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setFeedbackModalVisible(false); router.replace('/(app)/dashboard'); }}>
                <Text style={styles.modalCancelBtnText}>Skip</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleFeedbackSubmit} disabled={submittingFeedback}>
                {submittingFeedback ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.modalSaveBtnText}>Submit</Text>}
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
                style={styles.modalInput}
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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
          />
          <Pressable style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} onPress={sendMessage}>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.sm },
  backBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.body },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  timerText: { fontSize: FONTS.sizes.sm, color: COLORS.warning, marginTop: 2 },
  headerRight: { padding: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  counselorTools: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F8',
    padding: SPACING.sm,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toolBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.white, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  toolBtnText: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  toolBtnDanger: { borderColor: COLORS.error },
  toolBtnDangerText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  chatContainer: { padding: SPACING.md, flexGrow: 1, justifyContent: 'flex-end' },
  systemMsgContainer: { alignSelf: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, marginVertical: SPACING.sm },
  systemMsgText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontStyle: 'italic' },
  msgWrapper: { width: '100%', marginBottom: SPACING.md, flexDirection: 'row' },
  msgWrapperLeft: { justifyContent: 'flex-start' },
  msgWrapperRight: { justifyContent: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: SPACING.md, borderRadius: RADIUS.lg },
  msgBubbleLeft: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  msgBubbleRight: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  msgText: { fontSize: FONTS.sizes.body, lineHeight: 22 },
  msgTextLeft: { color: COLORS.text },
  msgTextRight: { color: COLORS.white },
  inputContainer: { flexDirection: 'row', padding: SPACING.md, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: FONTS.sizes.body, color: COLORS.text, marginRight: SPACING.md },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.full },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: COLORS.white, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.md },
  modalSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  modalInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, height: 120, textAlignVertical: 'top', fontSize: FONTS.sizes.body, color: COLORS.text, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  modalCancelBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm },
  modalCancelBtnText: { color: COLORS.textSecondary, fontWeight: FONTS.weights.bold },
  modalSaveBtn: { backgroundColor: COLORS.primary, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.sm },
  modalSaveBtnText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  endBtn: { backgroundColor: COLORS.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  endBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  feedbackLabel: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.xs },
  feedbackInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, fontSize: FONTS.sizes.body, textAlignVertical: 'top', minHeight: 60 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  urgencyContainer: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  urgencyBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  urgencyBtnSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  urgencyBtnText: { color: COLORS.text, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  urgencyBtnTextSelected: { color: COLORS.white },
  therapistCard: { padding: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  therapistCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  therapistNameSelected: { color: COLORS.primary },
});
