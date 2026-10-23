import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

/**
 * A provider's public profile.
 *
 * Opened as /public-profile?slug=<slug or numeric id>&type=therapist|counselor.
 * `type` matters: a therapist and a counselor can share the same numeric id.
 * Without `type` (a shared link) we try therapist, then counselor.
 * With no `slug` at all it previews the signed-in provider's own profile.
 * Nothing here is invented: if a field is missing it is simply not shown.
 */
export default function PublicProfileScreen() {
  const router = useRouter();
  const { slug, type } = useLocalSearchParams();
  const user = useSelector(selectUser);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const ownProfile = user?.therapist_profile || user?.counselor_profile || null;
  const isOwnPreview = !slug;

  useEffect(() => {
    if (isOwnPreview) {
      setProfile(ownProfile);
      setNotFound(!ownProfile);
      setLoading(false);
      return;
    }

    const kinds = type === 'counselor' ? ['counselor'] : type === 'therapist' ? ['therapist'] : ['therapist', 'counselor'];
    let cancelled = false;
    (async () => {
      for (const kind of kinds) {
        try {
          const { data } = await api.get(`/api/profiles/public/${kind}/${slug}/`);
          if (!cancelled) setProfile(data);
          if (!cancelled) setLoading(false);
          return;
        } catch (e) {
          // try the next kind
        }
      }
      if (!cancelled) {
        setNotFound(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, type]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }]}>
        <Text style={styles.nameText}>Profile not found</Text>
        <Text style={[styles.bodyText, { textAlign: 'center', marginVertical: SPACING.md }]}>
          This provider is not available any more, or the link is wrong.
        </Text>
        <Pressable style={styles.chatBtn} onPress={() => router.back()}>
          <Text style={styles.chatBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Public API returns { name, role, ... }. The own-profile preview has the user's names.
  const name = (profile.name || (isOwnPreview ? `${user?.first_name || ''} ${user?.last_name || ''}` : '')).trim() || 'Provider';
  const isCounselor = profile.role ? profile.role === 'COUNSELOR' : !!user?.counselor_profile && isOwnPreview;
  const languages = profile.languages || [];
  const modalities = profile.modalities || [];
  const rateText = isCounselor
    ? (profile.per_minute_rate ? `₹${Number(profile.per_minute_rate).toFixed(0)} / minute` : null)
    : (profile.per_session_rate ? `₹${Number(profile.per_session_rate).toFixed(0)} / session` : null);

  const startChat = async () => {
    try {
      const { data } = await api.post('/api/core/sessions/request-therapist/', { therapist_id: profile.id });
      router.push(`/(app)/chat/${data.id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not start the chat. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{isOwnPreview ? 'Public Profile Preview' : 'Profile'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
             <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.nameText}>{name}</Text>
          <Text style={styles.roleText}>{isCounselor ? 'Graduate Counselor' : 'Licensed Therapist'}</Text>

          {profile.university ? (
            <View style={styles.infoRow}>
               <Ionicons name="school-outline" size={16} color={COLORS.onSurfaceVariant} />
               <Text style={styles.infoText}>{profile.university}{profile.graduation_year ? `, Class of ${profile.graduation_year}` : ''}</Text>
            </View>
          ) : null}
          {languages.length > 0 ? (
            <View style={styles.infoRow}>
               <Ionicons name="language-outline" size={16} color={COLORS.onSurfaceVariant} />
               <Text style={styles.infoText}>{languages.join(', ')}</Text>
            </View>
          ) : null}

          {modalities.length > 0 ? (
            <View style={styles.chipContainer}>
               {modalities.slice(0, 3).map(mod => (
                 <View key={mod} style={styles.chip}><Text style={styles.chipText}>{mod}</Text></View>
               ))}
            </View>
          ) : null}

          {rateText ? (
            <View style={styles.rateBox}>
               <Text style={styles.rateLabel}>{isCounselor ? 'Chat Rate' : 'Session Rate'}</Text>
               <Text style={styles.rateValue}>{rateText}</Text>
            </View>
          ) : null}

          {/* Therapists can be messaged or booked from here. Counselors are reached
              through the live queue (booking them is added separately). */}
          {!isOwnPreview && !isCounselor ? (
            <>
              <Pressable style={styles.chatBtn} onPress={startChat}>
                 <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.onPrimary} />
                 <Text style={styles.chatBtnText}>Start a chat</Text>
              </Pressable>
              <Pressable
                style={[styles.chatBtn, { marginTop: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary }]}
                onPress={() => router.push(`/(app)/book/${profile.id}?type=therapist`)}
              >
                 <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                 <Text style={[styles.chatBtnText, { color: COLORS.primary }]}>Book a session</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {/* Verification: public profiles are only served for providers whose credentials an admin approved */}
        {!isOwnPreview ? (
          <View style={styles.verifyCard}>
             <View style={styles.verifyRow}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.statusAvailable} />
                <View style={styles.verifyTextWrap}>
                   <Text style={styles.verifyTitle}>Credentials verified</Text>
                   <Text style={styles.verifySub}>Reviewed and approved by our team</Text>
                </View>
             </View>
          </View>
        ) : null}

        {(languages.length > 0 || modalities.length > 0) ? (
          <View style={styles.sectionCard}>
             {languages.length > 0 ? (
               <>
                 <Text style={styles.sectionTitle}>Languages</Text>
                 <View style={styles.chipContainer}>
                   {languages.map((lang) => (
                     <View key={lang} style={styles.chip}><Text style={styles.chipText}>{lang}</Text></View>
                   ))}
                 </View>
               </>
             ) : null}
             {modalities.length > 0 ? (
               <>
                 <Text style={[styles.sectionTitle, languages.length > 0 && { marginTop: SPACING.md }]}>Therapeutic Approaches</Text>
                 <View style={styles.chipContainer}>
                   {modalities.map((modality) => (
                     <View key={modality} style={styles.chip}><Text style={styles.chipText}>{modality}</Text></View>
                   ))}
                 </View>
               </>
             ) : null}
          </View>
        ) : null}

        {profile.bio ? (
          <View style={styles.sectionCard}>
             <Text style={styles.sectionTitle}>About</Text>
             <Text style={styles.bodyText}>{profile.bio}</Text>
          </View>
        ) : null}

        {isCounselor && profile.specialization ? (
          <View style={styles.sectionCard}>
             <Text style={styles.sectionTitle}>Focus</Text>
             <Text style={styles.bodyText}>{profile.specialization}</Text>
          </View>
        ) : null}

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
