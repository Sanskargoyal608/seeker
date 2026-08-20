import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/axios';
import BottomNav from '../../components/BottomNav';
import PanicButton from '../../components/PanicButton';

export default function ProfileScreen() {
  const user = useSelector(selectUser);
  const router = useRouter();
  
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await apiClient.get('/api/core/sessions/');
        // Filter out completed or past sessions for history
        const pastSessions = data.filter(s => s.status === 'COMPLETED').slice(0, 3);
        setHistory(pastSessions);
      } catch (err) {
        console.log(err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const getBio = () => {
    if (user?.role === 'THERAPIST') return user.therapist_profile?.bio;
    if (user?.role === 'COUNSELOR') return user.counselor_profile?.bio;
    return "Focused on mindfulness and cognitive behavioral growth. Part of the Buddy community.";
  };

  const getRoleLabel = () => {
    if (user?.role === 'THERAPIST') return 'Licensed Therapist';
    if (user?.role === 'COUNSELOR') return 'Counselor';
    return 'Verified Member';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Buddy Wellness</Text>
        </View>
        <PanicButton variant="outline" />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
               <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{user?.first_name?.[0] || 'U'}</Text>
               </View>
               <Pressable style={styles.editAvatarBtn} onPress={() => router.push('/(app)/edit-profile')}>
                  <Ionicons name="pencil" size={16} color={COLORS.onPrimary} />
               </Pressable>
            </View>
            <View style={styles.profileDetails}>
               <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{user?.first_name} {user?.last_name}</Text>
                  <View style={styles.roleBadge}>
                     <Text style={styles.roleBadgeText}>{getRoleLabel()}</Text>
                  </View>
               </View>
               <Text style={styles.bioText} numberOfLines={3}>{getBio()}</Text>
               
               <View style={styles.actionRow}>
                  <Pressable style={styles.primaryBtn} onPress={() => router.push('/(app)/settings')}>
                     <Ionicons name="settings" size={18} color={COLORS.onPrimary} />
                     <Text style={styles.primaryBtnText}>Account Settings</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(app)/edit-profile')}>
                     <Text style={styles.secondaryBtnText}>Edit Profile</Text>
                  </Pressable>
               </View>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
           {/* Session History */}
           <View style={styles.gridItem}>
              <View style={styles.gridCard}>
                 <View style={styles.cardHeader}>
                    <Ionicons name="time" size={20} color={COLORS.primary} />
                    <Text style={styles.cardTitle}>Session History</Text>
                 </View>
                 
                 {loadingHistory ? (
                    <ActivityIndicator color={COLORS.primary} />
                 ) : history.length > 0 ? (
                    history.map(s => (
                       <View key={s.id} style={styles.historyRow}>
                          <View>
                             <Text style={styles.historyName}>{s.provider_name || s.user_name}</Text>
                             <Text style={styles.historySub}>{s.status}</Text>
                          </View>
                          <Text style={styles.historyDate}>
                             {new Date(s.start_time || s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </Text>
                       </View>
                    ))
                 ) : (
                    <Text style={styles.emptyText}>No past sessions found.</Text>
                 )}

                 <Pressable style={styles.viewAllBtn}>
                    <Text style={styles.viewAllText}>View all history</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                 </Pressable>
              </View>
           </View>

           {/* Emergency Contacts (General User Only) */}
           {user?.role === 'GENERAL_USER' && (
           <View style={styles.gridItem}>
              <View style={[styles.gridCard, { backgroundColor: 'rgba(253, 246, 227, 0.4)' }]}>
                 <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeader}>
                       <Ionicons name="medical" size={20} color={COLORS.error} />
                       <Text style={styles.cardTitle}>Emergency Contacts</Text>
                    </View>
                    <Text style={styles.contactCount}>
                       {user?.emergency_contacts?.length || 0} Contacts
                    </Text>
                 </View>
                 
                 {user?.emergency_contacts && user.emergency_contacts.length > 0 ? (
                    user.emergency_contacts.map((ec, idx) => (
                       <View key={idx} style={styles.contactBox}>
                          <View style={styles.contactTop}>
                             <Text style={styles.contactName}>{ec.name}</Text>
                             <View style={styles.contactRelBadge}>
                                <Text style={styles.contactRelText}>{ec.relationship || 'Primary'}</Text>
                             </View>
                          </View>
                          <View style={styles.contactDetail}>
                             <Ionicons name="call" size={14} color={COLORS.onSurfaceVariant} />
                             <Text style={styles.contactDetailText}>{ec.phone}</Text>
                          </View>
                       </View>
                    ))
                 ) : (
                    <Text style={styles.emptyText}>No emergency contacts added.</Text>
                 )}
                 <Pressable style={styles.addContactBtn} onPress={() => router.push('/(app)/edit-profile')}>
                    <Text style={styles.addContactText}>+ Add Contact</Text>
                 </Pressable>
              </View>
           </View>
           )}
           
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  crisisBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorContainer,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  crisisBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onErrorContainer,
  },
  container: {
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: SPACING.lg,
    paddingBottom: 80,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 67, 86, 0.08)',
    marginBottom: 24,
  },
  profileTop: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderWidth: 4,
    borderColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  avatarText: {
    fontFamily: FONTS.family.headline,
    fontSize: 32,
    color: COLORS.onSurfaceVariant,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.md,
  },
  profileDetails: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nameText: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLgMobile,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  roleBadge: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  roleBadgeText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSecondaryContainer,
    fontWeight: '600',
  },
  bioText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  secondaryBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  gridItem: {
    width: '100%',
  },
  gridCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 67, 86, 0.08)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.outline,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  contactCount: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.outline,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  historyName: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  historySub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  historyDate: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.outline,
  },
  emptyText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  viewAllText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  contactBox: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
  },
  contactTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  contactRelBadge: {
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  contactRelText: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    color: COLORS.outline,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactDetailText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  addContactBtn: {
    padding: 8,
    alignItems: 'center',
  },
  addContactText: {
    fontFamily: FONTS.family.body,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONTS.sizes.labelSm,
  }
});
