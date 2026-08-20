import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

export default function PublicProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const user = useSelector(selectUser);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If it's my own profile preview
    if (!slug || slug === user?.counselor_profile?.slug || slug === user?.therapist_profile?.slug) {
      setProfile(user?.therapist_profile || user?.counselor_profile);
      setLoading(false);
      return;
    }

    // Try fetching therapist
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/api/profiles/public/therapist/${slug}/`);
        setProfile(data);
      } catch (err) {
        try {
          const { data } = await api.get(`/api/profiles/public/counselor/${slug}/`);
          setProfile(data);
        } catch (e) {
          console.log('Failed to fetch profile', e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  const name = profile?.user?.first_name ? `${profile.user.first_name} ${profile.user.last_name}` : (user?.first_name ? `${user.first_name} ${user.last_name}` : 'Sarah Chen');
  const rate = profile?.per_minute_rate || 1.50;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Public Profile View</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
             <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.nameText}>{name}</Text>
          <Text style={styles.roleText}>{profile?.license_number ? 'Licensed Therapist' : 'Graduate Counselor'}</Text>

          <View style={styles.infoRow}>
             <Ionicons name="school-outline" size={16} color={COLORS.onSurfaceVariant} />
             <Text style={styles.infoText}>{profile?.university || 'University of Pennsylvania'}, Class of {profile?.graduation_year || '2023'}</Text>
          </View>
          <View style={styles.infoRow}>
             <Ionicons name="language-outline" size={16} color={COLORS.onSurfaceVariant} />
             <Text style={styles.infoText}>{(profile?.languages?.length ? profile.languages : ['English']).join(', ')}</Text>
          </View>

          <View style={styles.chipContainer}>
             {(profile?.modalities?.length ? profile.modalities : ['Stress Management']).slice(0, 3).map(mod => (
               <View key={mod} style={styles.chip}><Text style={styles.chipText}>{mod}</Text></View>
             ))}
          </View>

          <View style={styles.rateBox}>
             <Text style={styles.rateLabel}>Session Rate</Text>
             <Text style={styles.rateValue}>${Number(rate).toFixed(2)} / minute</Text>
             <Text style={styles.rateDesc}>Professional guidance at an accessible rate.</Text>
          </View>

          <Pressable style={styles.chatBtn}>
             <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.onPrimary} />
             <Text style={styles.chatBtnText}>Start 5-Min Free Chat</Text>
          </Pressable>
        </View>

        {/* Verification */}
        <View style={styles.verifyCard}>
           <View style={styles.verifyRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.statusAvailable} />
              <View style={styles.verifyTextWrap}>
                 <Text style={styles.verifyTitle}>Verified Identity</Text>
                 <Text style={styles.verifySub}>Background checked</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.outlineVariant} />
           </View>
        </View>

        {/* Languages & Approaches */}
        <View style={styles.sectionCard}>
           <Text style={styles.sectionTitle}>Languages</Text>
           <View style={styles.chipContainer}>
             {(profile?.languages?.length ? profile.languages : ['English']).map((lang) => (
               <View key={lang} style={styles.chip}>
                 <Text style={styles.chipText}>{lang}</Text>
               </View>
             ))}
           </View>

           <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Therapeutic Approaches</Text>
           <View style={styles.chipContainer}>
             {(profile?.modalities?.length ? profile.modalities : ['Cognitive Behavioral Therapy (CBT)', 'Person-Centered Therapy']).map((modality) => (
               <View key={modality} style={styles.chip}>
                 <Text style={styles.chipText}>{modality}</Text>
               </View>
             ))}
           </View>
        </View>

        {/* About / Bio */}
        <View style={styles.sectionCard}>
           <Text style={styles.sectionTitle}>About Me</Text>
           <Text style={styles.bodyText}>
              {profile?.bio || 'Passionate about helping individuals overcome life’s challenges, I provide a safe, non-judgmental space for clients to explore their feelings and develop healthy coping mechanisms.'}
           </Text>
        </View>

        {/* Education & Background */}
        <View style={styles.sectionCard}>
           <Text style={styles.sectionTitle}>Education & Background</Text>
           
           <View style={styles.historyRow}>
              <View style={styles.iconBox}>
                 <Ionicons name="school-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.historyTextWrap}>
                 <Text style={styles.historyTitle}>M.S. in Counseling & Mental Health Services</Text>
                 <Text style={styles.historySub}>University of Pennsylvania • 2021 — 2023</Text>
                 <Text style={styles.historyDesc}>Specialized focus on trauma-informed care and adolescent psychology.</Text>
              </View>
           </View>

           <View style={[styles.historyRow, { marginTop: SPACING.lg }]}>
              <View style={styles.iconBox}>
                 <Ionicons name="ribbon-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.historyTextWrap}>
                 <Text style={styles.historyTitle}>Clinical Practicum</Text>
                 <Text style={styles.historySub}>UPenn Counseling Center • 2022 — 2023</Text>
                 <Text style={styles.historyDesc}>Completed over 600 hours of supervised clinical direct service.</Text>
              </View>
           </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  container: {
    padding: SPACING.lg,
  },
  profileCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onPrimaryFixed,
  },
  nameText: {
    fontSize: 24,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  roleText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
    marginLeft: 6,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  chip: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  chipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  rateBox: {
    backgroundColor: COLORS.surfacePrivate,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  rateLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginVertical: 4,
  },
  rateDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    lineHeight: 16,
  },
  chatBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnText: {
    color: COLORS.onPrimary,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.md,
    marginLeft: SPACING.sm,
  },
  verifyCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyTextWrap: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  verifyTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  verifySub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.statusAvailable,
  },
  sectionCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  bodyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 22,
  },
  historyRow: {
    flexDirection: 'row',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTextWrap: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  historyTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  historySub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    marginVertical: 2,
  },
  historyDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
});
