// frontend/app/(app)/dashboard.js
// Home. Sends each role to its own dashboard. Counselors and therapists whose
// credentials have not been verified yet see the "awaiting approval" screen instead.
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { getDashboardData, getActiveTriage } from '../../api/core';
import BuddyDashboard from '../../components/BuddyDashboard';
import CounselorDashboard from '../../components/CounselorDashboard';
import PendingApproval from '../../components/PendingApproval';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

export default function DashboardScreen() {
  const user = useSelector(selectUser);
  const router = useRouter();
  const role = user?.role;

  const [dashboardData, setDashboardData] = useState(null);
  const [activeTriage, setActiveTriage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setFailed(false);
      const [data, triageData] = await Promise.all([getDashboardData(), getActiveTriage()]);

      // A new seeker with no history and no intake in progress starts with the intake.
      if (data.recent_sessions && data.recent_sessions.length === 0 && !triageData) {
        router.replace('/(app)/triage');
        return;
      }
      setDashboardData(data);
      setActiveTriage(triageData);
    } catch (error) {
      console.log('Dashboard fetch error:', error?.response?.status || error?.message);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (role === 'GENERAL_USER') {
        fetchDashboard();
      }
    }, [role])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Providers who are not verified yet can prepare, not work.
  const providerProfile = role === 'THERAPIST' ? user.therapist_profile : user.counselor_profile;
  if ((role === 'THERAPIST' || role === 'COUNSELOR') && !providerProfile?.is_verified) {
    return <PendingApproval role={role} />;
  }

  if (role === 'THERAPIST') {
    return <Redirect href="/(app)/therapist/dashboard" />;
  }

  if (role === 'COUNSELOR') {
    return <CounselorDashboard />;
  }

  // Seeker
  if (failed) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.message}>We could not load your home screen.</Text>
        <Pressable style={styles.retry} onPress={() => { setLoading(true); fetchDashboard(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading || !dashboardData) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <BuddyDashboard
      user={user}
      dashboardData={dashboardData}
      activeTriage={activeTriage}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  message: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: SPACING.md },
  retry: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: RADIUS.full },
  retryText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
