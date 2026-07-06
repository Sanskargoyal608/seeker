import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import apiClient from '../../api/axios';

export default function CounselorQueueScreen() {
  const router = useExpoRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const fetchQueue = async () => {
    try {
      const { data } = await apiClient.get('/api/core/sessions/queue/');
      setSessions(data);
    } catch (error) {
      console.log('Queue fetch error:', error);
      Alert.alert('Error', 'Failed to load queue.');
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

  const handleAccept = async (sessionId) => {
    setAcceptingId(sessionId);
    try {
      const { data } = await apiClient.patch(`/api/core/sessions/${sessionId}/accept/`);
      Alert.alert('Success', 'Session accepted!');
      router.replace(`/(app)/chat/${sessionId}`);
    } catch (error) {
      console.log('Accept error:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept session.');
      fetchQueue();
    } finally {
      setAcceptingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>Session #{item.id}</Text>
        <Text style={styles.cardTime}>
          Waiting since: {new Date(item.created_at).toLocaleTimeString()}
        </Text>
        {item.is_crisis_flagged && (
          <Text style={styles.crisisText}>🚨 CRISIS FLAGGED</Text>
        )}
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </Pressable>
        <Text style={styles.title}>Waiting Queue</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users are currently waiting.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchQueue}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    padding: SPACING.sm,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  cardTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  crisisText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    marginTop: 4,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.md,
  },
  acceptBtnDisabled: {
    opacity: 0.5,
  },
  acceptBtnText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.body,
    textAlign: 'center',
  },
});
