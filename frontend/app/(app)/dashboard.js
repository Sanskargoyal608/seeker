// frontend/app/(app)/dashboard.js
// Main dashboard — shows user info, role badge, and recent sessions
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectUser, selectAccessToken } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDashboardData, getActiveTriage, respondToEscalationRequest, createTherapistFollowUp, getSessionIntake } from '../../api/core';
import apiClient from '../../api/axios';
import PanicButton from '../../components/PanicButton';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

const ROLE_INFO = {
  GENERAL_USER: {
    label: 'Wellness User',
    emoji: '🌱',
    color: COLORS.accent,
    bgColor: COLORS.accentLight,
    description: 'Your wellness journey starts here',
  },
  COUNSELOR: {
    label: 'Graduate Counselor',
    emoji: '🎓',
    color: COLORS.primary,
    bgColor: COLORS.primaryLight,
    description: 'Support users through their mental wellness journey',
  },
  THERAPIST: {
    label: 'Licensed Therapist',
    emoji: '🏥',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.15)',
    description: 'Provide expert therapeutic care',
  },
};

export default function DashboardScreen() {
  const user = useSelector(selectUser);
  const token = useSelector(selectAccessToken);
  const { handleLogout } = useAuth();
  const router = useRouter();
  
  const [loggingOut, setLoggingOut] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTriage, setActiveTriage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Note Modal States
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [sessionNotes, setSessionNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Intake Modal States
  const [intakeModalVisible, setIntakeModalVisible] = useState(false);
  const [sessionIntake, setSessionIntake] = useState(null);
  const [loadingIntake, setLoadingIntake] = useState(false);
  
  // Expanded Clients State for Therapist Dashboard
  const [expandedClients, setExpandedClients] = useState({});

  // Escalation Alert States
  const [escalationAlert, setEscalationAlert] = useState(null);
  const [respondingToEscalation, setRespondingToEscalation] = useState(false);

  const role = user?.role || 'GENERAL_USER';
  const info = ROLE_INFO[role] || ROLE_INFO.GENERAL_USER;
  const isVerified = user?.is_verified !== false;
  const isPending = (role === 'COUNSELOR' || role === 'THERAPIST') && !isVerified;

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [data, triageData] = await Promise.all([
        getDashboardData(),
        role === 'GENERAL_USER' ? getActiveTriage() : Promise.resolve(null)
      ]);
      
      if (role === 'GENERAL_USER' && data.recent_sessions && data.recent_sessions.length === 0 && !triageData) {
        router.replace('/(app)/triage');
        return;
      }
      
      setDashboardData(data);
      setActiveTriage(triageData);
      
      if (data.pending_escalation && !escalationAlert) {
        setEscalationAlert({
          id: data.pending_escalation.id,
          urgency: data.pending_escalation.urgency,
          reason: data.pending_escalation.reason,
          triage_session_id: data.pending_escalation.triage_session_id,
        });
      }
    } catch (error) {
      console.log('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await handleLogout();
        },
      },
    ]);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchNotes = async (sessionId) => {
    try {
      setLoadingNotes(true);
      setNotesModalVisible(true);
      const { data } = await apiClient.get(`/api/core/sessions/${sessionId}/notes/`);
      setSessionNotes(data);
    } catch (error) {
      console.log('Failed to fetch notes:', error);
      Alert.alert('Error', 'Failed to load session notes.');
      setNotesModalVisible(false);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchIntake = async (sessionId) => {
    try {
      setLoadingIntake(true);
      setIntakeModalVisible(true);
      const data = await getSessionIntake(sessionId);
      setSessionIntake(data);
    } catch (error) {
      console.log('Failed to fetch intake:', error);
      Alert.alert('Notice', 'No intake form available for this session.');
      setIntakeModalVisible(false);
    } finally {
      setLoadingIntake(false);
    }
  };

  const toggleClient = (clientId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const escalationWs = useRef(null);

  useEffect(() => {
    if (role === 'THERAPIST' && token) {
      const wsUrl = `${WS_BASE_URL}/ws/escalations/?token=${token}`;
      escalationWs.current = new WebSocket(wsUrl);

      escalationWs.current.onopen = () => {
        console.log('Therapist connected to escalation WS');
      };

      escalationWs.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'escalation.alert') {
            setEscalationAlert({
              id: data.escalation_id,
              urgency: data.urgency,
              reason: data.reason,
              sessionId: data.triage_session_id
            });
          }
        } catch (err) {
          console.error('WS message error', err);
        }
      };

      escalationWs.current.onerror = (error) => {
        console.log('WS error', error.message);
      };

      return () => {
        if (escalationWs.current) {
          escalationWs.current.close();
        }
      };
    }
  }, [role, token]);

  const handleEscalationResponse = async (action) => {
    if (!escalationAlert) return;
    setRespondingToEscalation(true);
    try {
      const { session_id } = await respondToEscalationRequest(escalationAlert.id, action);
      if (action === 'ACCEPT' && session_id) {
        router.push(`/(app)/chat/${session_id}`);
      } else {
        Alert.alert('Success', `Escalation request ${action.toLowerCase()}ed.`);
      }
    } catch (err) {
      Alert.alert('Error', `Failed to ${action.toLowerCase()} escalation.`);
    } finally {
      setRespondingToEscalation(false);
      setEscalationAlert(null);
    }
  };

  const handleAcceptSession = async (sessionId) => {
    try {
      await apiClient.patch(`/api/core/sessions/${sessionId}/accept/`);
      Alert.alert('Success', 'Session accepted!');
      fetchDashboard();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept session.');
    }
  };

  const handleFollowUp = async (userId) => {
    try {
      setLoading(true);
      const data = await createTherapistFollowUp(userId);
      router.push(`/(app)/chat/${data.id}`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to initiate follow up.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || (role === 'GENERAL_USER' && !dashboardData)) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <LinearGradient colors={['rgba(108,99,255,0.2)', 'transparent']} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/(app)/profile')} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.first_name || user?.username || 'Seeker'}</Text>
            <Text style={{ color: COLORS.primary, fontSize: FONTS.sizes.sm, marginTop: 4 }}>View Profile &rarr;</Text>
          </Pressable>
          <Pressable onPress={onLogout} disabled={loggingOut} style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}>
            {loggingOut ? <ActivityIndicator color={COLORS.error} size="small" /> : <Text style={styles.logoutBtnText}>Log out</Text>}
          </Pressable>
        </View>

        <View style={[styles.roleCard, { borderColor: info.color }]}>
          <LinearGradient colors={[info.bgColor, 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.roleHeader}>
            <Text style={styles.roleEmoji}>{info.emoji}</Text>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleLabel, { color: info.color }]}>{info.label}</Text>
              <Text style={styles.roleEmail}>{user?.email}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isPending ? COLORS.warning : COLORS.success }]} />
          </View>
          <Text style={styles.roleDescription}>{info.description}</Text>
          {isPending && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>⏳ Pending admin verification — some features are restricted</Text>
            </View>
          )}
        </View>

        {role === 'GENERAL_USER' && (
          <View style={styles.actionRow}>
            <Pressable style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.8 }]} onPress={() => router.push('/(app)/triage')}>
              <Text style={styles.actionBtnPrimaryText}>{activeTriage ? 'Continue Chat' : 'Start New Chat'}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, pressed && { opacity: 0.8 }]} onPress={() => router.push('/(app)/therapist-search')}>
              <Text style={styles.actionBtnSecondaryText}>Talk to Counselor</Text>
            </Pressable>
          </View>
        )}

        {role === 'COUNSELOR' && (
          <View style={styles.actionRow}>
            <Pressable style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.8 }]} onPress={() => router.push('/(app)/counselor-queue')}>
              <Text style={styles.actionBtnPrimaryText}>View Waiting Queue</Text>
            </Pressable>
          </View>
        )}

        {role === 'THERAPIST' && (
          <View style={styles.actionRow}>
            <Pressable style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && { opacity: 0.8 }]} onPress={() => router.push('/(app)/schedule')}>
              <Text style={styles.actionBtnPrimaryText}>My Schedule</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          {dashboardData?.upcoming_bookings?.length > 0 ? (
            dashboardData.upcoming_bookings.map(booking => (
              <View key={`booking-${booking.id}`} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionStatus}>Status: {booking.status}</Text>
                  <Pressable onPress={async () => {
                    try {
                      setLoading(true);
                      const { data } = await apiClient.post(`/api/profiles/bookings/${booking.id}/start/`);
                      router.push(`/(app)/chat/${data.session_id}`);
                    } catch(err) {
                      setLoading(false);
                      Alert.alert('Error', 'Cannot start session yet.');
                    }
                  }}>
                    <Text style={{ color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: 'bold' }}>Join Chat &rarr;</Text>
                  </Pressable>
                </View>
                <Text style={styles.sessionDate}>Scheduled for: {new Date(booking.scheduled_datetime).toLocaleString()}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 4 }}>Therapist: {booking.therapist_name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No upcoming scheduled sessions.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{role === 'THERAPIST' ? 'Client History' : 'Recent Sessions'}</Text>
          {refreshing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : role === 'THERAPIST' ? (
            dashboardData?.grouped_clients?.length > 0 ? (
              dashboardData.grouped_clients.map(client => (
                <View key={client.client_id} style={styles.clientGroupCard}>
                  <Pressable 
                    style={styles.clientGroupHeader}
                    onPress={() => toggleClient(client.client_id)}
                  >
                    <View>
                      <Text style={styles.clientGroupName}>{client.client_name}</Text>
                      <Text style={styles.clientGroupEmail}>{client.client_email}</Text>
                    </View>
                    <Text style={styles.expandIcon}>
                      {expandedClients[client.client_id] ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                  
                  {expandedClients[client.client_id] && (
                    <View style={styles.clientSessionsContainer}>
                      {client.sessions.map(session => (
                        <Pressable 
                          key={session.id} 
                          style={({ pressed }) => [styles.sessionCard, styles.nestedSessionCard, pressed && { opacity: 0.7 }]}
                          onPress={() => {
                            if (['MATCHED', 'ACTIVE', 'PAYMENT_PENDING', 'PAID', 'ENDED'].includes(session.status)) {
                              router.push(`/(app)/chat/${session.id}`);
                            }
                          }}
                        >
                          <View style={styles.sessionHeader}>
                            <Text style={styles.sessionStatus}>Status: {session.status}</Text>
                            {['MATCHED', 'ACTIVE', 'PAYMENT_PENDING', 'PAID'].includes(session.status) && (
                              <Text style={{ color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: 'bold' }}>Enter Chat &rarr;</Text>
                            )}
                          </View>
                          <Text style={styles.sessionDate}>{new Date(session.created_at).toLocaleString()}</Text>
                          
                          <View style={[styles.sessionFooter, { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm }]}>
                            {session.status === 'WAITING' && (
                              <Pressable 
                                style={[styles.viewNotesBtn, { backgroundColor: COLORS.success, borderColor: COLORS.success }]} 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleAcceptSession(session.id);
                                }}
                              >
                                <Text style={[styles.viewNotesBtnText, { color: COLORS.white }]}>✅ Accept</Text>
                              </Pressable>
                            )}
                            {session.status === 'ENDED' && (
                              <Pressable 
                                style={[styles.viewNotesBtn, { borderColor: COLORS.primary }]} 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleFollowUp(client.client_id);
                                }}
                              >
                                <Text style={[styles.viewNotesBtnText, { color: COLORS.primary }]}>💬 Follow Up</Text>
                              </Pressable>
                            )}
                            <Pressable 
                              style={styles.viewNotesBtn} 
                              onPress={(e) => {
                                e.stopPropagation();
                                fetchIntake(session.id);
                              }}
                            >
                              <Text style={styles.viewNotesBtnText}>📄 Intake Form</Text>
                            </Pressable>
                            <Pressable 
                              style={styles.viewNotesBtn} 
                              onPress={(e) => {
                                e.stopPropagation();
                                fetchNotes(session.id);
                              }}
                            >
                              <Text style={styles.viewNotesBtnText}>📝 Notes</Text>
                            </Pressable>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No client history found.</Text>
            )
          ) : (
            dashboardData?.recent_sessions?.length > 0 ? (
              dashboardData.recent_sessions.map(session => (
                <Pressable 
                  key={session.id} 
                  style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    if (['MATCHED', 'ACTIVE', 'PAYMENT_PENDING', 'PAID', 'ENDED'].includes(session.status)) {
                      router.push(`/(app)/chat/${session.id}`);
                    }
                  }}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionStatus}>Status: {session.status}</Text>
                    {['MATCHED', 'ACTIVE', 'PAYMENT_PENDING', 'PAID'].includes(session.status) && (
                      <Text style={{ color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: 'bold' }}>Enter Chat &rarr;</Text>
                    )}
                  </View>
                  <Text style={styles.sessionDate}>{new Date(session.created_at).toLocaleString()}</Text>
                  
                  {role === 'GENERAL_USER' && session.provider_details && (
                    <View style={{ marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: COLORS.background, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm }}>
                        {session.provider_details.photo ? (
                          <Text>📷</Text>
                        ) : (
                          <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{session.provider_details.name[0]}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', color: COLORS.textPrimary }}>{session.provider_details.name}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{session.provider_details.title}</Text>
                        {session.provider_details.specialization ? (
                          <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 2 }}>{session.provider_details.specialization}</Text>
                        ) : null}
                      </View>
                      
                      {session.status === 'ENDED' && session.provider_details.title === 'Licensed Therapist' && (
                        <Pressable 
                          style={{ backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/(app)/book/${session.provider_details.id}`);
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: 'bold' }}>💬 Chat Again</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  
                  {role === 'COUNSELOR' && (
                    <View style={[styles.sessionFooter, { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm }]}>
                      <Pressable 
                        style={styles.viewNotesBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          fetchNotes(session.id);
                        }}
                      >
                        <Text style={styles.viewNotesBtnText}>📝 Notes</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>No recent sessions found.</Text>
            )
          )}
        </View>

        {/* App version */}
        <Text style={styles.footer}>Seeker v1.0 · Phase 1 MVP</Text>
      </ScrollView>

      {/* Floating Action Buttons */}
      {role === 'GENERAL_USER' && (
        <View style={styles.fabContainer}>
          {activeTriage && (
            <Pressable 
              style={({ pressed }) => [styles.chatFab, pressed && styles.fabPressed]} 
              onPress={() => router.push('/(app)/triage')}
            >
              <Text style={styles.chatFabIcon}>💬</Text>
              <View style={styles.chatFabDot} />
            </Pressable>
          )}
          <PanicButton />
        </View>
      )}

      {/* Notes Modal */}
      <Modal visible={notesModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Notes</Text>
              <Pressable onPress={() => setNotesModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </Pressable>
            </View>
            
            {loadingNotes ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : sessionNotes.length === 0 ? (
              <Text style={styles.emptyNotesText}>No notes added for this session.</Text>
            ) : (
              <FlatList
                data={sessionNotes}
                keyExtractor={(item) => item.id.toString()}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <View style={styles.noteItem}>
                    <Text style={styles.noteDate}>{new Date(item.created_at).toLocaleString()}</Text>
                    <Text style={styles.noteText}>{item.note_text}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Intake Modal */}
      <Modal visible={intakeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Intake Form</Text>
              <Pressable onPress={() => setIntakeModalVisible(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </Pressable>
            </View>
            
            {loadingIntake ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : !sessionIntake ? (
              <Text style={styles.emptyNotesText}>No intake data available.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.md }}>
                  Submitted on: {new Date(sessionIntake.submitted_at).toLocaleString()}
                </Text>
                {Object.entries(sessionIntake.responses_json).map(([question, answer], idx) => (
                  <View key={idx} style={{ marginBottom: SPACING.md, backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: RADIUS.md }}>
                    <Text style={{ fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.xs }}>{question}</Text>
                    <Text style={{ color: COLORS.textSecondary }}>{answer || 'No response'}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Escalation Alert Modal */}
      <Modal visible={!!escalationAlert} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: COLORS.error, borderWidth: 2 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: 'transparent' }]}>
              <Text style={[styles.modalTitle, { color: COLORS.error }]}>🚨 Escalation Alert</Text>
            </View>
            
            <View style={styles.escalationDetails}>
              <View style={[styles.urgencyBadge, { backgroundColor: escalationAlert?.urgency === 'HIGH' || escalationAlert?.urgency === 'CRITICAL' ? COLORS.error : COLORS.warning }]}>
                <Text style={styles.urgencyText}>{escalationAlert?.urgency} URGENCY</Text>
              </View>
              <Text style={styles.escalationReasonLabel}>Reason for escalation:</Text>
              <Text style={styles.escalationReasonText}>{escalationAlert?.reason}</Text>
            </View>

            <View style={styles.escalationActions}>
              <Pressable 
                style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, { flex: 1 }, pressed && { opacity: 0.8 }]} 
                onPress={() => handleEscalationResponse('DECLINE')}
                disabled={respondingToEscalation}
              >
                <Text style={styles.actionBtnSecondaryText}>Decline</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: COLORS.error, flex: 1 }, pressed && { opacity: 0.8 }]} 
                onPress={() => handleEscalationResponse('ACCEPT')}
                disabled={respondingToEscalation}
              >
                {respondingToEscalation ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.actionBtnPrimaryText}>Accept Session</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  clientGroup: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  clientName: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  clientToggleIcon: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  clientSessions: {
    padding: SPACING.sm,
    backgroundColor: '#FAFAFA',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
  },
  userName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.h3,
    fontWeight: FONTS.weights.bold,
    letterSpacing: -0.5,
  },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  logoutBtnText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  roleCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  roleEmoji: { fontSize: 36 },
  roleInfo: { flex: 1 },
  roleLabel: {
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.bold,
  },
  roleEmail: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleDescription: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    lineHeight: 22,
  },
  pendingBanner: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  pendingBannerText: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: { fontSize: 20 },
  statValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.md,
  },
  featuresGrid: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  featureItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionBtnPrimaryText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
  },
  actionBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionBtnSecondaryText: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionStatus: {
    color: COLORS.text,
    fontWeight: FONTS.weights.bold,
  },
  sessionDate: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 4,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  comingSoonCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  comingSoonText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    lineHeight: 22,
  },
  clientGroupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  clientGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clientGroupName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  clientGroupEmail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
  clientSessionsContainer: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  nestedSessionCard: {
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.body, fontStyle: 'italic', marginTop: SPACING.md },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: SPACING.xl },
  fabContainer: { position: 'absolute', bottom: SPACING.xl, right: SPACING.lg, alignItems: 'flex-end', gap: SPACING.md },
  chatFab: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  chatFabIcon: { fontSize: 24 },
  chatFabDot: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error, borderWidth: 2, borderColor: COLORS.white },
  fabPressed: { transform: [{ scale: 0.95 }] },
  sessionFooter: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'flex-end' },
  viewNotesBtn: { paddingVertical: 4, paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  viewNotesBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  closeModalBtn: { padding: SPACING.xs },
  closeModalText: { fontSize: FONTS.sizes.lg, color: COLORS.textMuted, fontWeight: 'bold' },
  emptyNotesText: { textAlign: 'center', color: COLORS.textMuted, fontStyle: 'italic', marginVertical: SPACING.lg },
  noteItem: { padding: SPACING.md, backgroundColor: COLORS.background, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  noteDate: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: 4 },
  noteText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
});
