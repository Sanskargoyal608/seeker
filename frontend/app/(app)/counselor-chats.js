import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/axios';
import BottomNav from '../../components/BottomNav';
import { PageContainer } from '../../components/PageContainer';
import { useResponsive } from '../../hooks/useResponsive';

export default function CounselorChatsScreen() {
  const router = useExpoRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDesktop } = useResponsive();

  const fetchSessions = async () => {
    try {
      const [sessionsRes, mentorshipRes] = await Promise.all([
        apiClient.get('/api/core/sessions/my/').catch(() => ({ data: [] })),
        apiClient.get('/api/core/mentorship/').catch(() => ({ data: [] }))
      ]);
      
      const mentorshipChats = (mentorshipRes.data || [])
        .filter(m => m.status === 'ACCEPTED')
        .map(m => ({
          ...m,
          isMentorship: true,
          user_name: `${m.therapist_name} (Mentor)`,
          last_message_date: m.created_at, // Sort fallback
        }));
      
      const allChats = [...(sessionsRes.data || []), ...mentorshipChats]
        .sort((a, b) => new Date(b.last_message_date || b.created_at) - new Date(a.last_message_date || a.created_at));
        
      setSessions(allChats);
    } catch (error) {
      console.log('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [])
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return COLORS.success;
      case 'SCHEDULED': return COLORS.primary;
      case 'MATCHED': return COLORS.warning;
      case 'ACCEPTED': return COLORS.primary; // Mentorship
      case 'ENDED': return COLORS.textMuted;
      default: return COLORS.onSurfaceVariant;
    }
  };

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <Pressable 
        style={styles.chatCard}
        onPress={() => router.push(item.isMentorship ? `/(app)/mentorship-chat/${item.id}` : `/(app)/chat/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color={COLORS.surfaceContainer} />
          {item.is_crisis_flagged && (
             <View style={styles.urgentBadge} />
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.user_name || `User #${item.id}`}</Text>
            <Text style={styles.chatTime}>
              {item.last_message_date ? new Date(item.last_message_date).toLocaleDateString() : new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.chatSubInfo}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.chatPreview}>
              Status: {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading && sessions.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageContainer>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.isMentorship ? `mentor-${item.id}` : `session-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchSessions} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.outlineVariant} />
              <Text style={styles.emptyTitle}>No Chats Yet</Text>
              <Text style={styles.emptySub}>When you accept sessions from the dashboard, they will appear here.</Text>
            </View>
          }
        />
      </PageContainer>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontWeight: FONTS.weights.bold,
    fontSize: 24,
    color: COLORS.onSurface,
  },
  listContainer: {
    padding: SPACING.lg,
    flexGrow: 1,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    position: 'relative',
  },
  urgentBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.error,
    borderWidth: 2,
    borderColor: COLORS.surfaceContainerLowest,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontFamily: FONTS.family.body,
    fontWeight: FONTS.weights.bold,
    fontSize: 16,
    color: COLORS.onSurface,
  },
  chatTime: {
    fontFamily: FONTS.family.body,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chatSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chatPreview: {
    fontFamily: FONTS.family.body,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontFamily: FONTS.family.headline,
    fontWeight: FONTS.weights.bold,
    fontSize: 20,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontFamily: FONTS.family.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: 40,
  },
});
