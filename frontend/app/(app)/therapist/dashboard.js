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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/axios';

export default function TherapistDashboard() {
  const router = useExpoRouter();
  const user = useSelector(selectUser);
  const [escalations, setEscalations] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const fetchQueue = async () => {
    try {
      const queueRes = await apiClient.get('/api/core/therapist/queue/');
      setEscalations(queueRes.data?.escalations || []);
      setRecentSessions(queueRes.data?.recent_sessions || []);
    } catch (error) {
      console.log('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchQueue();
      const interval = setInterval(fetchQueue, 10000);
      return () => clearInterval(interval);
    }, [])
  );

  const handleAccept = async (escalationId) => {
    setAcceptingId(escalationId);
    try {
      const response = await apiClient.post(`/api/core/escalations/${escalationId}/respond/`, {
        action: 'ACCEPT'
      });
      fetchQueue();
      if (response.data && response.data.session_id) {
        router.push(`/chat/${response.data.session_id}`);
      } else {
        Alert.alert('Success', 'Escalation accepted!');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept escalation.');
      fetchQueue();
    } finally {
      setAcceptingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.urgencyDot, item.urgency === 'HIGH' ? styles.dotHigh : styles.dotMedium]} />
          <Text style={styles.cardTitle}>Session #{item.session}</Text>
        </View>
        <Text style={styles.timeAgo}>Just now</Text>
      </View>
      
      <Text style={styles.cardSub} numberOfLines={2}>Reason: {item.reason || 'Not specified'}</Text>
      
      {item.status === 'PENDING' ? (
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
            <Text style={styles.acceptBtnText}>Accept Case</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtnOutline} onPress={() => router.push(`/(app)/chat/${item.session}`)}>
            <Ionicons name="chatbubbles-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionBtnOutlineText}>User Chat</Text>
          </Pressable>
          <Pressable style={styles.actionBtnOutline} onPress={() => Alert.alert('Backchannel', 'Opening chat with counselor...')}>
            <Ionicons name="people-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionBtnOutlineText}>Counselor</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (loading && escalations.length === 0) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.userName}>{user?.first_name || 'Therapist'}</Text>
        </View>
        <Pressable 
          style={styles.notificationBtn} 
          onPress={() => router.push('/(app)/therapist/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          {/* Badge dot if notifications exist */}
          <View style={styles.badge} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
           <View style={styles.statusLeft}>
              <View style={[styles.statusIndicator, { backgroundColor: isAvailable ? COLORS.success : COLORS.gray }]} />
              <View>
                <Text style={styles.statusTitle}>Current Status</Text>
                <Text style={styles.statusText}>
                   {isAvailable ? 'Available for Escalations' : 'Offline'}
                </Text>
              </View>
           </View>
           <Switch
             value={isAvailable}
             onValueChange={setIsAvailable}
             trackColor={{ false: COLORS.surfaceVariant, true: COLORS.successLight }}
             thumbColor={isAvailable ? COLORS.success : COLORS.white}
           />
        </View>

        <View style={styles.listHeader}>
           <Text style={styles.sectionTitle}>Live Escalation Queue</Text>
           <Text style={styles.sectionCount}>{escalations.length} Active</Text>
        </View>

        {escalations.length === 0 ? (
          <View style={styles.emptyWrap}>
             <View style={styles.emptyIconBox}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.primary} />
             </View>
             <Text style={styles.emptyTitle}>You're all caught up!</Text>
             <Text style={styles.emptySub}>The queue is currently empty. We'll alert you if a high-priority escalation comes in.</Text>
          </View>
        ) : (
          escalations.map(item => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>)
        )}

        <View style={styles.listHeader}>
           <Text style={styles.sectionTitle}>Active Sessions</Text>
           <Text style={styles.sectionCount}>{recentSessions.length} Sessions</Text>
        </View>

        {recentSessions.length === 0 ? (
          <View style={styles.emptyWrap}>
             <Text style={styles.emptySub}>No active sessions at the moment.</Text>
          </View>
        ) : (
          <View style={{ marginBottom: SPACING.xxl }}>
            {recentSessions.map(session => (
              <Pressable 
                key={session.id} 
                style={styles.compactCard} 
                onPress={() => router.push(`/(app)/chat/${session.id}`)}
              >
                <View style={styles.compactCardLeft}>
                  <Text style={styles.compactCardTitle}>Session #{session.id}</Text>
                  <Text style={styles.compactCardSub}>{session.user_details?.email || 'Active Session'}</Text>
                </View>
                <View style={styles.compactCardRight}>
                  <Text style={styles.compactCardAction}>Resume Chat</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)',
  },
  greeting: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#64748B',
  },
  userName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    marginTop: 2,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  statusTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  statusText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 18,
    color: '#0F172A',
  },
  sectionCount: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotHigh: { backgroundColor: COLORS.error },
  dotMedium: { backgroundColor: COLORS.warning },
  cardTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  timeAgo: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#94A3B8',
  },
  cardSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#475569',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F8FAFC',
  },
  actionBtnOutlineText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCardLeft: {
    flexDirection: 'column',
  },
  compactCardTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  compactCardSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  compactCardRight: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compactCardAction: {
    fontFamily: 'Outfit-Medium',
    fontSize: 13,
    color: COLORS.primary,
  }
});
