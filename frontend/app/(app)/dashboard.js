// frontend/app/(app)/dashboard.js
// Main dashboard — shows user info, role badge, and logout button
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const ROLE_INFO = {
  GENERAL_USER: {
    label: 'Wellness User',
    emoji: '🌱',
    color: COLORS.accent,
    bgColor: COLORS.accentLight,
    description: 'Your wellness journey starts here',
    features: [
      '💬 Connect with counselors',
      '📅 Book therapy sessions',
      '📱 24/7 helpline access',
      '🔒 Emergency contacts saved',
    ],
  },
  COUNSELOR: {
    label: 'Graduate Counselor',
    emoji: '🎓',
    color: COLORS.primary,
    bgColor: COLORS.primaryLight,
    description: 'Support users through their mental wellness journey',
    features: [
      '📋 View session queue',
      '💬 Chat with users',
      '📝 Session notes',
      '💰 Track earnings',
    ],
  },
  THERAPIST: {
    label: 'Licensed Therapist',
    emoji: '🏥',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.15)',
    description: 'Provide expert therapeutic care',
    features: [
      '📅 Manage bookings',
      '👤 Patient intake forms',
      '⬆️ Receive escalations',
      '💰 Session billing',
    ],
  },
};

const QUICK_STATS = [
  { label: 'Sessions', value: '—', emoji: '💬' },
  { label: 'This week', value: '—', emoji: '📅' },
  { label: 'Rating', value: '—', emoji: '⭐' },
];

export default function DashboardScreen() {
  const user = useSelector(selectUser);
  const { handleLogout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const role = user?.role || 'GENERAL_USER';
  const info = ROLE_INFO[role] || ROLE_INFO.GENERAL_USER;
  const isVerified = user?.is_verified !== false; // Assume true for GENERAL_USER
  const isPending = (role === 'COUNSELOR' || role === 'THERAPIST') && !isVerified;

  const onLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await handleLogout();
          },
        },
      ]
    );
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient */}
        <LinearGradient
          colors={['rgba(108,99,255,0.2)', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>
              {user?.first_name || user?.username || 'Seeker'}
            </Text>
          </View>
          <Pressable
            onPress={onLogout}
            disabled={loggingOut}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Log out"
          >
            {loggingOut ? (
              <ActivityIndicator color={COLORS.error} size="small" />
            ) : (
              <Text style={styles.logoutBtnText}>Log out</Text>
            )}
          </Pressable>
        </View>

        {/* Role badge card */}
        <View style={[styles.roleCard, { borderColor: info.color }]}>
          <LinearGradient
            colors={[info.bgColor, 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
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
              <Text style={styles.pendingBannerText}>
                ⏳ Pending admin verification — some features are restricted
              </Text>
            </View>
          )}
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available features</Text>
          <View style={styles.featuresGrid}>
            {info.features.map((f) => (
              <View key={f} style={styles.featureItem}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Coming soon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming in Phase 2</Text>
          <View style={styles.comingSoonCard}>
            <LinearGradient
              colors={['rgba(108,99,255,0.1)', 'rgba(0,212,170,0.05)']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.comingSoonText}>
              🚀 Real-time chat, session matching, payments, push notifications, and more are coming soon!
            </Text>
          </View>
        </View>

        {/* App version */}
        <Text style={styles.footer}>Seeker v1.0 · Phase 1 MVP</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, padding: SPACING.lg, paddingBottom: SPACING.xxl },
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
  footer: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
