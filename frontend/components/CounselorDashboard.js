import React, { useState, useCallback } from 'react';
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

export default function CounselorDashboard() {
  const router = useExpoRouter();
  const [sessions, setSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

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
      const interval = setInterval(fetchQueueAndDashboard, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleAccept = async (sessionId) => {
    setAcceptingId(sessionId);
    try {
      const { data } = await apiClient.patch(`/api/core/sessions/${sessionId}/accept/`);
      Alert.alert('Success', 'Session accepted!');
      router.replace(`/(app)/chat/${sessionId}`);
    } catch (error) {
      console.log('Accept error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept session.');
      fetchQueueAndDashboard();
    } finally {
      setAcceptingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>User #{item.id}</Text>
        <Text style={styles.cardSub}>Category: Anxiety • Wait Time: 4m</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
           {item.is_crisis_flagged ? (
             <View style={styles.urgentChip}><Text style={styles.urgentText}>High Urgency</Text></View>
           ) : (
             <View style={styles.normalChip}><Text style={styles.normalText}>Medium Urgency</Text></View>
           )}
        </View>
      </View>
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
  );

  if (loading && sessions.length === 0) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Live Queue</Text>
        <View style={{ width: 40 }} />
      </View>

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
           onValueChange={setIsAvailable}
           trackColor={{ false: COLORS.surfaceVariant, true: COLORS.statusAvailable }}
           thumbColor="#FFFFFF"
         />
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
         <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Completed Today</Text>
            <Text style={styles.summaryValue}>12</Text>
         </View>
         <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Avg. Duration</Text>
            <Text style={styles.summaryValue}>24m</Text>
         </View>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
             <Ionicons name="chatbubbles-outline" size={48} color={COLORS.outlineVariant} />
             <Text style={styles.emptyTitle}>Queue is Empty</Text>
             <Text style={styles.emptySub}>No users are currently waiting for a session.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: SPACING.xl, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl }}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
               <Text style={styles.title}>Recent Sessions</Text>
               <Pressable onPress={() => Alert.alert('View All', 'Coming soon')}>
                 <Text style={{ color: COLORS.primary, fontFamily: FONTS.medium }}>View All</Text>
               </Pressable>
             </View>
             {recentSessions.length > 0 ? (
               <View style={styles.recentSessionList}>
                 {recentSessions.map(session => (
                   <Pressable 
                     key={session.id} 
                     style={styles.recentSessionCard}
                     onPress={() => router.push(`/(app)/chat/${session.id}`)}
                   >
                      <View style={styles.sessionIconBox}>
                         <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.sessionInfo}>
                         <Text style={styles.sessionTitle}>Session #{session.id}</Text>
                         <Text style={styles.sessionSub}>Status: {session.status.toLowerCase().replace('_', ' ')}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.onSurfaceVariant} />
                   </Pressable>
                 ))}
               </View>
             ) : (
               <View style={styles.emptyRecentBox}>
                 <Text style={{ color: COLORS.textMuted }}>No recent sessions found.</Text>
               </View>
             )}
          </View>
        }
        refreshing={loading}
        onRefresh={fetchQueueAndDashboard}
      />

      {/* Removed Practitioner Backchannel mockup */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  backBtn: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  listContainer: {
    padding: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  cardSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  urgentChip: {
    backgroundColor: COLORS.errorContainer,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  urgentText: {
    color: COLORS.error,
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
  },
  normalChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  normalText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  acceptBtnDisabled: {
    opacity: 0.5,
  },
  acceptBtnText: {
    color: COLORS.onPrimary,
    fontWeight: FONTS.weights.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  emptyText: {
    color: COLORS.onSurfaceVariant,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  statusTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    marginTop: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginTop: 4,
  },
  backchannelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryFixed,
    padding: SPACING.md,
    position: 'absolute',
    bottom: 80,
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backchannelTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onPrimaryFixed,
  },
  backchannelSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onPrimaryFixed,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginTop: SPACING.sm,
  },
  emptySub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  recentSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  sessionSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
