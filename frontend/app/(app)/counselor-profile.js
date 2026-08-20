import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import api from '../../api/axios';
import BottomNav from '../../components/BottomNav';

export default function CounselorProfileScreen() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const [rate, setRate] = useState(parseFloat(user?.counselor_profile?.per_minute_rate) || 2.50);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/api/core/user/dashboard/');
      setRecentSessions(data.recent_sessions || []);
    } catch (error) {
      console.log('Dashboard fetch error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      if (user?.counselor_profile?.per_minute_rate) {
        setRate(parseFloat(user.counselor_profile.per_minute_rate));
      }
    }, [user])
  );

  const saveRate = async (newRate) => {
    setSavingRate(true);
    try {
      const payload = {
        counselor_profile: { per_minute_rate: parseFloat(newRate).toFixed(2) }
      };
      const response = await api.patch('/api/accounts/profile/update/', payload);
      dispatch(setUser(response.data));
      Alert.alert('Success', 'Chat rate updated successfully.');
    } catch (error) {
      console.log('Save rate error:', error);
      Alert.alert('Error', 'Failed to save rate.');
      setRate(parseFloat(user?.counselor_profile?.per_minute_rate) || 2.50); // Revert
    } finally {
      setSavingRate(false);
    }
  };

  const handleWithdraw = () => {
    Alert.alert("Withdraw Funds", "Withdrawal request initiated. Funds will be deposited in 3-5 business days.");
  };

  const deactivateAccount = () => {
    Alert.alert("Deactivate", "Are you sure you want to deactivate your account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Deactivate", style: "destructive" }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Earnings Card */}
        <View style={styles.card}>
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Total Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>$1,248.50</Text>
          <Text style={styles.payoutText}>Next payout: Nov 15, 2023</Text>
          
          <Pressable style={styles.primaryBtn} onPress={handleWithdraw}>
            <Text style={styles.primaryBtnText}>Withdraw Funds</Text>
          </Pressable>
        </View>

        {/* Chat Rate */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
             <Text style={styles.cardTitle}>Chat Rate</Text>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               {savingRate && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />}
               <Text style={styles.rateValue}>${rate.toFixed(2)}/min</Text>
             </View>
          </View>
          <Text style={styles.subText}>Higher rates may affect your ranking in the discovery feed.</Text>
          
          <Slider
            style={{ width: '100%', height: 40, marginTop: SPACING.md }}
            minimumValue={0.50}
            maximumValue={10.00}
            step={0.10}
            value={rate}
            onValueChange={setRate}
            onSlidingComplete={saveRate}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.outlineVariant}
            thumbTintColor={COLORS.primary}
          />
          <View style={styles.rowBetween}>
             <Text style={styles.sliderLabel}>$0.50</Text>
             <Text style={styles.sliderLabel}>$10.00</Text>
          </View>
        </View>

        {/* Public Profile Summary */}
        <View style={styles.card}>
           <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Public Profile</Text>
              <Pressable style={styles.editBtn} onPress={() => router.push(`/(app)/public-profile?slug=${user?.counselor_profile?.slug || ''}`)}>
                 <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                 <Text style={styles.editBtnText}>View</Text>
              </Pressable>
           </View>
           <Pressable style={styles.editBtnInline} onPress={() => router.push('/(app)/edit-profile')}>
              <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Edit Details</Text>
           </Pressable>

           <Text style={styles.sectionHeader}>Professional Bio</Text>
           <Text style={styles.bioText}>
              Licensed therapist specializing in cognitive behavioral therapy with over 10 years of experience helping individuals navigate stress and professional burnout.
           </Text>

           <Text style={styles.sectionHeader}>Matched Specialties</Text>
           <View style={styles.chipContainer}>
              {['Stress Management', 'Anxiety', 'Career Burnout', 'Relationships'].map((spec) => (
                <View key={spec} style={styles.chip}>
                  <Text style={styles.chipText}>{spec}</Text>
                  <Ionicons name="close" size={14} color={COLORS.onSurfaceVariant} />
                </View>
              ))}
              <Pressable style={styles.addChip}>
                 <Text style={styles.addChipText}>+ Add New</Text>
              </Pressable>
           </View>

           <Text style={styles.sectionHeader}>Education & Credentials</Text>
           <View style={styles.eduRow}>
              <Ionicons name="school-outline" size={20} color={COLORS.primary} />
              <View style={styles.eduInfo}>
                 <Text style={styles.eduTitle}>PhD in Clinical Psychology</Text>
                 <Text style={styles.eduSub}>Stanford University, 2012</Text>
              </View>
           </View>
           
           <Pressable style={styles.complianceBtn} onPress={() => router.push('/(app)/compliance')}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              <Text style={styles.complianceBtnText}>Manage Compliance Docs</Text>
           </Pressable>
        </View>

        {/* Recent Sessions */}
        <View style={styles.card}>
           <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Recent Sessions</Text>
              <Pressable>
                 <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
           </View>
           
           {recentSessions.length > 0 ? (
             recentSessions.map((session, index) => (
               <Pressable 
                 key={session.id || index} 
                 style={styles.sessionItem}
                 onPress={() => router.push(`/(app)/chat/${session.id}`)}
               >
                  <View style={styles.sessionIconBox}>
                     <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.sessionInfo}>
                     <Text style={styles.sessionUser}>Session #{session.id || 'N/A'}</Text>
                     <Text style={styles.sessionDetails}>Duration: {session.duration_minutes || 0} mins</Text>
                  </View>
                  <Text style={styles.sessionStatus}>Completed</Text>
               </Pressable>
             ))
           ) : (
             <Text style={{ color: COLORS.textMuted, marginTop: SPACING.md }}>No recent sessions.</Text>
           )}
        </View>

        {/* Danger Zone */}
        <Pressable style={styles.deactivateBtn} onPress={deactivateAccount}>
           <Ionicons name="trash-outline" size={20} color={COLORS.error} />
           <Text style={styles.deactivateText}>Deactivate Account</Text>
        </Pressable>
        <View style={{ height: 100 }} />
      </ScrollView>
      <BottomNav />
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
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginLeft: SPACING.sm,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginVertical: SPACING.sm,
  },
  payoutText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.onPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  subText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  sliderLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryFixed,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  editBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    marginLeft: 4,
  },
  sectionHeader: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  bioText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurface,
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  chipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginRight: 4,
  },
  addChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
  },
  eduRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eduInfo: {
    marginLeft: SPACING.md,
  },
  eduTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  eduSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  complianceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xl,
  },
  complianceBtnText: {
    marginLeft: SPACING.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: COLORS.onSecondaryContainer,
    fontWeight: FONTS.weights.bold,
  },
  sessionInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  sessionName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  sessionTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionEarn: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.statusAvailable,
  },
  sessionStatus: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionUser: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  sessionDetails: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  deactivateText: {
    color: COLORS.error,
    fontWeight: FONTS.weights.bold,
    marginLeft: SPACING.sm,
  },
});
