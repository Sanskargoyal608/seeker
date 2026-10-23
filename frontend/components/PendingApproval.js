import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setUser } from '../store/authSlice';
import apiClient from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

/**
 * What a counselor or therapist sees until an administrator has verified their
 * credentials. They may complete their profile, upload documents and set up
 * their availability; they cannot take sessions or be found by seekers yet.
 */
export default function PendingApproval({ role }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { handleLogout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  const isTherapist = role === 'THERAPIST';

  const checkAgain = async () => {
    setChecking(true);
    setStillPending(false);
    try {
      const { data } = await apiClient.get('/api/accounts/auth/me/');
      dispatch(setUser(data)); // if approved, the dashboard replaces this screen
      const profile = data.therapist_profile || data.counselor_profile;
      setStillPending(!profile?.is_verified);
    } catch (e) {
      setStillPending(true);
    } finally {
      setChecking(false);
    }
  };

  const steps = [
    { icon: 'person-circle-outline', label: 'Complete your profile', to: '/(app)/edit-profile' },
    ...(isTherapist
      ? [{ icon: 'calendar-outline', label: 'Set your weekly availability', to: '/(app)/therapist/manage-schedule' }]
      : [{ icon: 'document-text-outline', label: 'Upload your credentials', to: '/(app)/compliance' }]),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={56} color={COLORS.primary} />
        <Text style={styles.title}>Your account is awaiting approval</Text>
        <Text style={styles.body}>
          An administrator is checking your credentials. Until then you cannot take sessions or appear in search.
          You can use this time to get ready:
        </Text>

        {steps.map((s) => (
          <Pressable key={s.to} style={styles.step} onPress={() => router.push(s.to)} accessibilityRole="button">
            <Ionicons name={s.icon} size={22} color={COLORS.primary} />
            <Text style={styles.stepText}>{s.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.outlineVariant} />
          </Pressable>
        ))}

        <Pressable style={styles.check} onPress={checkAgain} disabled={checking} accessibilityRole="button">
          {checking ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.checkText}>Check again</Text>}
        </Pressable>
        {stillPending ? <Text style={styles.note}>Still waiting for approval.</Text> : null}

        <Pressable onPress={handleLogout} style={styles.logout} accessibilityRole="button">
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, alignItems: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary, textAlign: 'center', marginTop: SPACING.md },
  body: { fontSize: 15, lineHeight: 22, color: '#333', textAlign: 'center', marginVertical: SPACING.md },
  step: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', padding: SPACING.md,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.white, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.surfaceVariant,
  },
  stepText: { flex: 1, fontSize: 16, color: '#222', fontWeight: '600' },
  check: {
    marginTop: SPACING.md, backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: RADIUS.full, minWidth: 180, alignItems: 'center',
  },
  checkText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  note: { marginTop: SPACING.sm, color: '#555' },
  logout: { marginTop: SPACING.lg, padding: SPACING.sm },
  logoutText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
});
