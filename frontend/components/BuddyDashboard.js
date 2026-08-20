import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import PanicButton from './PanicButton';
import BottomNav from './BottomNav';

export default function BuddyDashboard({ user, dashboardData, activeTriage, refreshing, onRefresh }) {
  const router = useRouter();

  // Pick first upcoming session if any
  const upcomingSession = dashboardData?.upcoming_bookings?.[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* TopAppBar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.push('/(app)/profile')} style={({ pressed }) => [styles.avatarContainer, pressed && { opacity: 0.7 }]}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{user?.first_name?.[0] || 'A'}</Text>
              </View>
            </Pressable>
          </View>
          <View style={styles.headerRight}>
            <Pressable 
              onPress={() => router.push('/(app)/notifications')}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.onSurfaceVariant} />
            </Pressable>
            <Pressable 
              onPress={() => router.push('/(app)/triage')}
              style={({ pressed }) => [styles.chatButton, pressed && { backgroundColor: COLORS.surfaceContainer }]}
            >
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.onSurfaceVariant} />
            </Pressable>
            <PanicButton variant="outline" />
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingTitle}>Good morning, {user?.first_name || 'Alex'}.</Text>
          <Text style={styles.greetingSubtitle}>How are you feeling today?</Text>
        </View>

        {/* Upcoming Session Card */}
        {upcomingSession ? (
          <View style={styles.upcomingCardWrapper}>
            <Pressable 
              style={({ pressed }) => [styles.upcomingCard, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push('/(app)/schedule')}
            >
              <View style={styles.upcomingCardRow}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{new Date(upcomingSession.scheduled_datetime).getDate()}</Text>
                  <Text style={styles.dateMonth}>
                    {new Date(upcomingSession.scheduled_datetime).toLocaleString('default', { month: 'short' }).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.upcomingInfo}>
                  <View style={styles.upcomingInfoTop}>
                    <Ionicons name="videocam" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.upcomingLabel}>Upcoming Session</Text>
                  </View>
                  <Text style={styles.upcomingTitle} numberOfLines={1}>Therapy with {upcomingSession.therapist_name}</Text>
                  <Text style={styles.upcomingTime}>
                    {new Date(upcomingSession.scheduled_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 50 Minutes
                  </Text>
                </View>
              </View>

              <View style={styles.upcomingCardFooter}>
                <View style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Join Session</Text>
                </View>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.upcomingCardWrapper}>
            <Pressable 
              style={({ pressed }) => [styles.upcomingCard, { backgroundColor: COLORS.surfaceContainerLow }, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push('/(app)/therapist-search')}
            >
              <View style={styles.upcomingCardRow}>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingTitle}>Find your counselor</Text>
                  <Text style={styles.upcomingTime}>You have no upcoming sessions.</Text>
                </View>
              </View>
              <View style={styles.upcomingCardFooter}>
                <View style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Discover</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Daily Practice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Practice</Text>
          <View style={styles.bentoGrid}>
            <View style={[styles.bentoItem, styles.bentoSmall1]}>
              <Ionicons name="body-outline" size={32} color={COLORS.onSecondaryContainer} />
              <View style={styles.bentoTextWrap}>
                <Text style={[styles.bentoLabel, { color: COLORS.onSecondaryContainer }]}>Daily Meditation</Text>
                <Text style={[styles.bentoHeading, { color: COLORS.onSecondaryContainer }]}>Focus & Calm</Text>
              </View>
            </View>
            
            <View style={[styles.bentoItem, styles.bentoSmall2]}>
              <Ionicons name="pencil-outline" size={32} color={COLORS.onTertiaryFixed} />
              <View style={styles.bentoTextWrap}>
                <Text style={[styles.bentoLabel, { color: COLORS.onTertiaryFixed }]}>Mood Check-in</Text>
                <Text style={[styles.bentoHeading, { color: COLORS.onTertiaryFixed }]}>Daily Journal</Text>
              </View>
            </View>

            <View style={[styles.bentoItem, styles.bentoLarge]}>
              <View>
                <Text style={styles.bentoHeading}>Breathing Exercise</Text>
                <Text style={styles.bentoSubtitle}>4-7-8 Technique • 3 min</Text>
              </View>
              <Ionicons name="play-circle" size={40} color={COLORS.primary} />
            </View>
          </View>
        </View>

        {/* Recommended for You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <Pressable onPress={() => router.push('/(app)/therapist-search')}>
              <Text style={styles.seeAllText}>See all matches</Text>
            </Pressable>
          </View>
          
          <Pressable 
             onPress={() => router.push('/(app)/therapist-search')}
             style={styles.therapistCard}
          >
            <View style={styles.therapistImgPlaceholder} />
            <View style={styles.therapistInfo}>
              <View style={styles.therapistTopRow}>
                <View>
                  <Text style={styles.therapistName}>Dr. Sarah Chen</Text>
                  <Text style={styles.therapistSpec}>Cognitive Behavioral Therapy</Text>
                </View>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>98% Match</Text>
                </View>
              </View>
              <View style={styles.therapistBottomRow}>
                <View style={styles.availabilityWrap}>
                  <View style={styles.dot} />
                  <Text style={styles.availabilityText}>Available Tomorrow</Text>
                </View>
                <View style={styles.availabilityWrap}>
                  <Ionicons name="cash-outline" size={14} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.availabilityText}>$120/session</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>
        
        {/* Active Session Chat Card */}
        {dashboardData?.recent_sessions?.map(session => (
           ['MATCHED', 'ACTIVE', 'PAYMENT_PENDING'].includes(session.status) && (
             <Pressable 
                key={session.id}
                style={styles.activeChatCard}
                onPress={() => router.push(`/(app)/chat/${session.id}`)}
             >
                <View style={styles.chatRow}>
                   <View style={styles.chatIconWrap}>
                     <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={styles.chatTitle}>Active Conversation</Text>
                     <Text style={styles.chatSub}>Status: {session.status}</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={24} color={COLORS.outline} />
                </View>
             </Pressable>
           )
        ))}
        
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.family.headline,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  appTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  chatButtonText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  welcomeSection: {
    paddingHorizontal: SPACING.marginMobile,
    marginTop: 24,
    marginBottom: 8,
  },
  greetingTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLgMobile,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  upcomingCardWrapper: {
    marginHorizontal: SPACING.marginMobile,
    marginTop: 16,
  },
  upcomingCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.xl,
    padding: SPACING.gutter,
    borderWidth: 1,
    borderColor: 'rgba(16, 67, 86, 0.08)',
    ...SHADOWS.ambient,
  },
  upcomingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upcomingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  dateBox: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.gutter,
  },
  dateDay: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onPrimaryFixed,
  },
  dateMonth: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onPrimaryFixed,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  upcomingLabel: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: COLORS.primary,
  },
  upcomingTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 2,
  },
  upcomingTime: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  joinBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-end',
  },
  joinBtnText: {
    color: COLORS.onPrimary,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: SPACING.marginMobile,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  seeAllText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  bentoItem: {
    borderRadius: RADIUS.lg,
    padding: 20,
    justifyContent: 'space-between',
  },
  bentoSmall1: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.secondaryContainer,
    aspectRatio: 1,
  },
  bentoSmall2: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.tertiaryFixed,
    aspectRatio: 1,
  },
  bentoLarge: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  bentoLabel: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    marginBottom: 4,
  },
  bentoHeading: {
    fontFamily: FONTS.family.headline,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  bentoSubtitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  bentoTextWrap: {
    marginTop: 16,
  },
  therapistCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
    padding: SPACING.gutter,
    flexDirection: 'row',
    gap: SPACING.gutter,
    marginBottom: 16,
    ...SHADOWS.ambient,
  },
  therapistImgPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  therapistInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  therapistTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  therapistName: {
    fontFamily: FONTS.family.headline,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  therapistSpec: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: COLORS.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  matchBadgeText: {
    color: COLORS.onPrimaryFixedVariant,
    fontSize: 10,
    fontWeight: 'bold',
  },
  therapistBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  availabilityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.statusAvailable,
  },
  availabilityText: {
    fontFamily: FONTS.family.body,
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  activeChatCard: {
    marginHorizontal: SPACING.marginMobile,
    marginTop: 24,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  chatSub: {
    fontFamily: FONTS.family.body,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  }
});
