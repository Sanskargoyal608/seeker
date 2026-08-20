import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/axios';

export default function ClientsScreen() {
  const router = useExpoRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const res = await apiClient.get('/api/core/user/dashboard/');
      const rawClients = res.data?.grouped_clients || [];
      const mapped = rawClients.map(c => ({
        client: c.client_id,
        client_name: c.client_name,
        client_email: c.client_email,
        status: `${c.sessions.length} Sessions`,
      }));
      setClients(mapped);
    } catch (error) {
      console.log('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  const renderItem = ({ item }) => (
    <Pressable style={styles.card} onPress={() => router.push(`/(app)/therapist/client/${item.client}`)}>
      <View style={styles.avatar}>
         <Ionicons name="person" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.client_name || 'Client User'}</Text>
        <Text style={styles.message}>{item.client_email}</Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.chevronBox}>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Clients</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.client.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="people-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Clients Yet</Text>
              <Text style={styles.emptySub}>You will see your active clients here once you accept cases.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
  },
  list: {
    padding: SPACING.xl,
    gap: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  message: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBox: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 11,
    color: COLORS.success,
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
  }
});
