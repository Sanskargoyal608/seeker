import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
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
import CrisisSupportModal from '../../components/CrisisSupportModal';

export default function TriageScreen() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [conversationPhase, setConversationPhase] = useState('OPENING');
  const [turnCount, setTurnCount] = useState(1);
  const [suggestedChips, setSuggestedChips] = useState([]);
  const [routingDecision, setRoutingDecision] = useState(null);
  const [recommendedTherapists, setRecommendedTherapists] = useState([]);
  const [resultingSessionId, setResultingSessionId] = useState(null);
  const [isCrisis, setIsCrisis] = useState(false);
  const [crisisSupport, setCrisisSupport] = useState(null);
  const [showCrisisHelp, setShowCrisisHelp] = useState(false);
  const crisisShown = useRef(false);
  const flatListRef = useRef();

  const PHASES = ['OPENING', 'EXPLORATION', 'DEEPENING', 'CLOSING'];
  const PHASE_LABELS = { OPENING: 'Getting Started', EXPLORATION: 'Understanding You', DEEPENING: 'Clinical Intake', CLOSING: 'Intake Complete' };
  const phaseIndex = PHASES.indexOf(conversationPhase);

  useEffect(() => {
    initTriage();
  }, []);

  const updateTriageState = (data) => {
    if (!data) return;
    setSessionId(data.id);
    setConversationPhase(data.conversation_phase || 'OPENING');
    setTurnCount(data.turn_count || 1);
    setSuggestedChips(data.suggested_chips || []);
    setRoutingDecision(data.routing_decision || null);
    setRecommendedTherapists(data.recommended_therapists || []);
    setResultingSessionId(data.resulting_session || null);

    const formattedMessages = (data.messages || []).map((msg, index) => ({
      id: index.toString(),
      text: msg.content,
      sender: msg.role === 'model' ? 'system' : 'user',
    }));
    setMessages(formattedMessages);

    if (data.is_crisis) {
      setIsCrisis(true);
      setCrisisSupport(data.crisis_support || null);
      if (!crisisShown.current) {
        crisisShown.current = true;
        setShowCrisisHelp(true); // open help once, straight away
      }
    }

    if (data.status === 'WAITING' || data.status === 'ROUTING' || data.is_complete) {
      setCompleted(true);
    }
  };

  const initTriage = async () => {
    try {
      setLoading(true);
      let data = await getActiveTriage();
      
      if (!data) {
        data = await startTriage();
      }
      updateTriageState(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || sending || completed) return;
    
    setInput('');
    Keyboard.dismiss();
    
    const userMsg = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await respondTriage(sessionId, text);
      updateTriageState(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => handleSendText(input);

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
      <CrisisSupportModal
        visible={showCrisisHelp}
        onClose={() => setShowCrisisHelp(false)}
        message={crisisSupport?.message}
        helplines={crisisSupport?.helplines}
        alerted
      />
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
      >
        {/* Progress Stepper */}
        <View style={styles.stepperContainer}>
          {PHASES.map((phase, idx) => (
            <View key={phase} style={[styles.stepLine, idx <= phaseIndex ? styles.stepActive : styles.stepInactive]} />
          ))}
          <Text style={styles.stepText}>Turn {turnCount || 1} of 5 • {PHASE_LABELS[conversationPhase] || 'Clinical Intake'}</Text>
        </View>

        {/* Crisis Helpline Banner */}
        {isCrisis && (
          <Pressable style={styles.crisisBanner} onPress={() => setShowCrisisHelp(true)} accessibilityRole="button">
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={styles.crisisBannerText}>If you're in immediate danger, call 112. Tap for free helplines.</Text>
          </Pressable>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={sending ? (
            <View style={styles.sysMsgContainer}>
              <View style={styles.sysAvatar}>
                <MaterialIcons name="smart-toy" size={18} color={COLORS.onSecondaryContainer} />
              </View>
              <View style={styles.sysMsgBody}>
                <Text style={styles.sysName}>Buddy AI</Text>
                <View style={styles.sysBubble}>
                  <View style={styles.typingContainer}>
                    <View style={[styles.typingDot, { opacity: 0.4 }]} />
                    <View style={[styles.typingDot, { opacity: 0.7 }]} />
                    <View style={[styles.typingDot, { opacity: 1.0 }]} />
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        />

        {completed ? (
          <View style={styles.completedBox}>
            {routingDecision === 'LICENSED_THERAPIST' && recommendedTherapists && recommendedTherapists.length > 0 ? (
              <View style={styles.therapistRecommendationContainer}>
                <View style={styles.tierBadgeTherapist}>
                  <Ionicons name="medkit" size={14} color="#7C2D12" />
                  <Text style={styles.tierBadgeTextTherapist}>Clinical Specialist Match</Text>
                </View>
                <Text style={styles.recommendationTitle}>Recommended Psychologists</Text>
                <Text style={styles.recommendationSubtitle}>
                  Based on your intake assessment, we matched psychologists with specialized expertise for your needs:
                </Text>

                <ScrollView style={styles.therapistListScroll} showsVerticalScrollIndicator={false}>
                  {recommendedTherapists.map((t, idx) => (
                    <View key={t.id || idx} style={styles.therapistCard}>
                      <View style={styles.therapistCardHeader}>
                        <View style={styles.therapistAvatar}>
                          <Text style={styles.therapistAvatarText}>
                            {(t.name || 'Dr').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.therapistInfo}>
                          <Text style={styles.therapistName}>{t.name}</Text>
                          <Text style={styles.therapistRate}>${t.per_session_rate} / session</Text>
                          {t.match_reason ? (
                            <Text style={styles.therapistMatchReason}>{t.match_reason}</Text>
                          ) : null}
                        </View>
                      </View>

                      {t.modalities && t.modalities.length > 0 ? (
                        <View style={styles.modalitiesRow}>
                          {t.modalities.map((m, mIdx) => (
                            <View key={mIdx} style={styles.modalityTag}>
                              <Text style={styles.modalityTagText}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.therapistCardActions}>
                        <Pressable 
                          style={styles.chooseTherapistBtn}
                          onPress={() => {
                            if (resultingSessionId) {
                              router.replace(`/(app)/chat/${resultingSessionId}`);
                            } else {
                              router.replace(`/(app)/book/${t.id}`);
                            }
                          }}
                        >
                          <Text style={styles.chooseTherapistBtnText}>Start with {t.name.split(' ')[0]}</Text>
                          <Ionicons name="arrow-forward" size={14} color="#fff" />
                        </Pressable>
                        <Pressable 
                          style={styles.viewProfileBtn}
                          onPress={() => router.push(`/(app)/public-profile?slug=${t.id}&type=therapist`)}
                        >
                          <Text style={styles.viewProfileBtnText}>Profile</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <Pressable style={styles.returnBtn} onPress={() => router.replace('/(app)/dashboard')}>
                  <Text style={styles.returnBtnText}>Return to Dashboard</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.counselorQueueContainer}>
                <View style={styles.tierBadgeCounselor}>
                  <Ionicons name="time-outline" size={16} color="#065F46" />
                  <Text style={styles.tierBadgeTextCounselor}>Request Submitted</Text>
                </View>
                <Text style={styles.counselorQueueTitle}>Intake Completed</Text>
                <Text style={styles.completedText}>
                  We will connect you as soon as a counselor accepts your request. Your intake summary has been securely compiled so your counselor will have full context when starting the session.
                </Text>
                <View style={styles.counselorQueueActions}>
                  <Pressable style={styles.primaryActionBtn} onPress={() => router.replace('/(app)/dashboard')}>
                    <Ionicons name="home" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>Return to Dashboard</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.inputSection}>
            {/* Quick Response Suggestion Chips */}
            {suggestedChips && suggestedChips.length > 0 && !sending && (
              <View style={styles.chipsScrollContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsList}>
                  {suggestedChips.map((chip, idx) => (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [styles.chipButton, pressed && { opacity: 0.7 }]}
                      onPress={() => handleSendText(chip)}
                    >
                      <Ionicons name="sparkles-outline" size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
                      <Text style={styles.chipText}>{chip}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

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
              <Text style={styles.disclaimerText}>AI Intake • Clinical evaluation required</Text>
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
  // Chips styles
  chipsScrollContainer: {
    marginBottom: 10,
  },
  chipsList: {
    gap: 8,
    paddingHorizontal: 4,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(54, 101, 110, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  chipText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: COLORS.primary,
  },
  completedBox: {
    margin: SPACING.marginMobile,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    maxHeight: '90%',
  },
  therapistRecommendationContainer: {
    width: '100%',
    alignItems: 'center',
  },
  tierBadgeTherapist: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: 10,
  },
  tierBadgeTextTherapist: {
    fontFamily: FONTS.family.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  recommendationTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  recommendationSubtitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  therapistListScroll: {
    width: '100%',
    maxHeight: 280,
    marginBottom: 16,
  },
  therapistCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
  },
  therapistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  therapistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistAvatarText: {
    fontFamily: FONTS.family.headline,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontFamily: FONTS.family.headline,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  therapistRate: {
    fontFamily: FONTS.family.body,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  therapistMatchReason: {
    fontFamily: FONTS.family.body,
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  modalitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  modalityTag: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  modalityTagText: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  therapistCardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chooseTherapistBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  chooseTherapistBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
  viewProfileBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  viewProfileBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  counselorQueueContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tierBadgeCounselor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: 12,
  },
  tierBadgeTextCounselor: {
    fontFamily: FONTS.family.body,
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  counselorQueueTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  completedText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  counselorQueueActions: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
  },
  primaryActionBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
  returnBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
  },
  returnBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  crisisBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    marginHorizontal: SPACING.marginMobile,
    marginBottom: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  crisisBannerText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.onSecondaryContainer,
  },
});
