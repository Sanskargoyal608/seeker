import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/axios';
import BottomNav from './BottomNav';
import { PageContainer } from './PageContainer';

export default function CounselorDashboard() {
  const router = useExpoRouter();
  const [sessions, setSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const queueListRef = useRef(null);

  const fetchQueueAndDashboard = async () => {
    try {
      const [queueRes, dashboardRes] = await Promise.all([
        apiClient.get('/api/core/sessions/queue/'),
        apiClient.get('/api/core/user/dashboard/')
      ]);
      setSessions(queueRes.data);
      setRecentSessions(dashboardRes.data.recent_sessions || []);
    } catch (error) {
      console.log('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchQueueAndDashboard();
      apiClient.get('/api/core/counselor/availability/')
        .then(res => setIsAvailable(res.data.status === 'AVAILABLE'))
        .catch(e => console.log('Availability fetch error:', e));
      const interval = setInterval(fetchQueueAndDashboard, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  // Auto-scroll logic for Live Queue
  useEffect(() => {
    if (sessions.length > 1) {
      let index = 0;
      const scrollInterval = setInterval(() => {
        index = (index + 1) % sessions.length;
        queueListRef.current?.scrollToIndex({ index, animated: true });
      }, 5000);
      return () => clearInterval(scrollInterval);
    }
  }, [sessions.length]);

  const handleAccept = async (sessionId) => {
    setAcceptingId(sessionId);
    try {
      await apiClient.patch(`/api/core/sessions/${sessionId}/accept/`);
      router.push(`/(app)/chat/${sessionId}`);
    } catch (error) {
      console.log('Accept error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept session.');
      fetchQueueAndDashboard();
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = (sessionId) => {
    // Hide it locally for this counselor
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const renderQueueItem = ({ item }) => (
    <View style={styles.queueCard}>
      <View style={styles.queueCardInfo}>
        <Text style={styles.queueCardTitle}>{item.user_name || `User #${item.id}`}</Text>
        <Text style={styles.queueCardSub}>Wait Time: {item.duration_minutes || '0'}m</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
           {item.is_crisis_flagged ? (
             <View style={styles.urgentChip}><Text style={styles.urgentText}>High Urgency</Text></View>
           ) : (
             <View style={styles.normalChip}><Text style={styles.normalText}>Medium Urgency</Text></View>
           )}
        </View>
      </View>
      <View style={styles.queueActionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.declineBtn,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => handleDecline(item.id)}
          disabled={acceptingId !== null}
        >
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.acceptBtn,
            pressed && { opacity: 0.8 },
            acceptingId === item.id && styles.acceptBtnDisabled,
          ]}
          onPress={() => handleAccept(item.id)}
          disabled={acceptingId !== null}
        >
          {acceptingId === item.id ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.acceptBtnText}>Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Home</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={[{key: 'content'}]}
        renderItem={() => (
          <View>
            {/* Status Toggle Bar */}
            <View style={styles.statusBar}>
               <View>
                  <Text style={styles.statusTitle}>Current Status</Text>
                  <Text style={[styles.statusText, { color: isAvailable ? COLORS.statusAvailable : COLORS.statusBusy }]}>
                     {isAvailable ? 'Available for Sessions' : 'Busy / Offline'}
                  </Text>
               </View>
               <Switch
                 value={isAvailable}
                 onValueChange={(val) => { setIsAvailable(val); apiClient.patch('/api/core/counselor/availability/', { status: val ? 'AVAILABLE' : 'AWAY' }).catch(e => console.log(e)); }}
                 trackColor={{ false: COLORS.surfaceVariant, true: COLORS.statusAvailable }}
                 thumbColor="#FFFFFF"
               />
            </View>

            {/* Live Queue Horizontal Widget */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Live Queue</Text>
              {sessions.length > 0 ? (
                <FlatList
                  ref={queueListRef}
                  data={sessions}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderQueueItem}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={280 + SPACING.md} 
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingRight: SPACING.lg }}
                />
              ) : (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-outline" size={32} color={COLORS.outlineVariant} />
                  <Text style={styles.emptySub}>No users are currently waiting.</Text>
                </View>
              )}
            </View>

            {/* Recent Chats Vertical List */}
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
                <Text style={styles.sectionTitle}>Recent Chats</Text>
                <Pressable onPress={() => router.push('/(app)/counselor-chats')}>
                  <Text style={{ color: COLORS.primary, fontFamily: FONTS.family.body, fontWeight: FONTS.weights.medium }}>View All</Text>
                </Pressable>
              </View>

              {recentSessions.length > 0 ? (
                <View style={styles.recentSessionList}>
                  {recentSessions.slice(0, 6).map(session => (
                    <Pressable 
                      key={session.id} 
                      style={styles.recentSessionCard}
                      onPress={() => router.push(`/(app)/chat/${session.id}`)}
                    >
                       <View style={styles.sessionIconBox}>
                          <Ionicons name="person" size={24} color={COLORS.surfaceContainerLowest} />
                       </View>
                       <View style={styles.sessionInfo}>
                          <Text style={styles.sessionTitle}>{session.user_name || `User #${session.user || session.id}`}</Text>
                          <Text style={styles.sessionSub}>Status: {session.status.replace('_', ' ')} • {session.last_message_date ? new Date(session.last_message_date).toLocaleDateString() : 'Just now'}</Text>
                       </View>
                       <Ionicons name="chevron-forward" size={20} color={COLORS.onSurfaceVariant} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptySub}>No recent chats found.</Text>
                </View>
              )}
            </View>
          </View>
        )}
        refreshing={loading}
        onRefresh={fetchQueueAndDashboard}
        showsVerticalScrollIndicator={false}
      />
      </PageContainer>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  title: {
    fontFamily: FONTS.family.headline,
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  statusTitle: {
    fontFamily: FONTS.family.body,
    fontSize: 16,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  statusText: {
    fontFamily: FONTS.family.body,
    fontSize: 14,
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: 18,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  queueCard: {
    width: 280,
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
    ...SHADOWS.sm,
  },
  queueCardInfo: {
    marginBottom: SPACING.md,
  },
  queueCardTitle: {
    fontFamily: FONTS.family.body,
    fontSize: 16,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  queueCardSub: {
    fontFamily: FONTS.family.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  urgentChip: {
    backgroundColor: COLORS.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  urgentText: {
    color: COLORS.onErrorContainer,
    fontSize: 12,
    fontWeight: FONTS.weights.bold,
  },
  normalChip: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  normalText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 12,
    fontWeight: FONTS.weights.medium,
  },
  queueActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  declineBtnText: {
    color: COLORS.onSurfaceVariant,
    fontWeight: FONTS.weights.bold,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  emptySub: {
    fontFamily: FONTS.family.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  recentSessionList: {
    marginTop: SPACING.xs,
  },
  recentSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  sessionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontFamily: FONTS.family.body,
    fontSize: 16,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  sessionSub: {
    fontFamily: FONTS.family.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
