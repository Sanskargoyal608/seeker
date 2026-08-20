import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../../../api/axios';

export default function TherapistProfileScreen() {
  const user = useSelector(selectUser);
  const router = useRouter();
  
  const therapist = user?.therapist_profile || {};
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loadingFinances, setLoadingFinances] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const [earnRes, payRes] = await Promise.all([
          apiClient.get('/api/core/therapist/earnings/'),
          apiClient.get('/api/core/therapist/payouts/')
        ]);
        setEarnings(earnRes.data || []);
        setPayouts(payRes.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingFinances(false);
      }
    };
    fetchFinances();
  }, []);

  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.net_amount), 0);
  const totalPayouts = payouts.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
  const availableBalance = totalEarnings - totalPayouts;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={() => router.push('/(app)/settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {therapist.profile_photo ? (
              <Image source={{ uri: therapist.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {user?.first_name?.charAt(0) || ''}{user?.last_name?.charAt(0) || ''}
                </Text>
              </View>
            )}
            {therapist.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.role}>Licensed Therapist</Text>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable style={styles.editBtn} onPress={() => router.push('/(app)/edit-profile')}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
            {therapist.slug && (
              <Pressable 
                style={[styles.editBtn, { backgroundColor: COLORS.primaryLight }]} 
                onPress={() => router.push(`/(app)/public-profile?slug=${therapist.slug}`)}
              >
                <Text style={[styles.editBtnText, { color: COLORS.primary }]}>View Public</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Finance & Earnings Inline */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsTop}>
            <View>
              <Text style={styles.earningsLabel}>Available Balance</Text>
              <Text style={styles.earningsAmount}>
                ${loadingFinances ? '...' : availableBalance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={24} color={COLORS.primary} />
            </View>
          </View>
          <Pressable 
            style={styles.withdrawBtn} 
            onPress={() => router.push('/(app)/therapist/earnings')}
          >
            <Text style={styles.withdrawBtnText}>Manage Wallet</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </Pressable>
        </View>

        {/* Action Grid */}
        <View style={styles.actionGrid}>
          <Pressable style={styles.actionGridItem} onPress={() => router.push('/(app)/therapist/calendar')}>
             <Ionicons name="calendar-outline" size={28} color={COLORS.primary} />
             <Text style={styles.actionGridText}>My Schedule</Text>
          </Pressable>
          <Pressable style={styles.actionGridItem} onPress={() => router.push('/(app)/therapist/clients')}>
             <Ionicons name="people-outline" size={28} color={COLORS.primary} />
             <Text style={styles.actionGridText}>My Clients</Text>
          </Pressable>
        </View>

        {/* Info Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bodyText}>
            {therapist.bio || 'No bio provided. Tap Edit Profile to add one.'}
          </Text>
        </View>

        {/* Professional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Rate</Text>
            <Text style={styles.infoValue}>${therapist.per_session_rate || '0.00'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>License No.</Text>
            <Text style={styles.infoValue}>{therapist.license_number || 'Pending'}</Text>
          </View>
          
          {therapist.license_file ? (
             <Pressable style={styles.infoRow} onPress={() => {}}>
               <Text style={styles.infoLabel}>License Document</Text>
               <Text style={[styles.infoValue, {color: COLORS.primary}]}>View Document</Text>
             </Pressable>
          ) : null}
        </View>

        {/* Tags Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modalities</Text>
          <View style={styles.chipContainer}>
            {therapist.modalities && therapist.modalities.length > 0 ? (
              therapist.modalities.map((modality, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{modality}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>None listed</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={styles.chipContainer}>
            {therapist.languages && therapist.languages.length > 0 ? (
              therapist.languages.map((lang, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{lang}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>None listed</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)',
  },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#0F172A' },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: SPACING.xl, paddingBottom: 100 },
  profileCard: { 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: SPACING.lg,
  },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarInitials: { fontFamily: 'Outfit-Bold', fontSize: 32, color: COLORS.primary },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0, 
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2
  },
  name: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#0F172A' },
  role: { fontFamily: 'Outfit-Medium', fontSize: 15, color: '#64748B', marginTop: 4 },
  editBtn: {
    marginTop: SPACING.lg, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: '#F1F5F9', borderRadius: 20
  },
  editBtnText: { fontFamily: 'Outfit-SemiBold', color: '#0F172A', fontSize: 14 },
  
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  earningsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#64748B' },
  earningsAmount: { fontFamily: 'Outfit-Bold', fontSize: 28, color: '#0F172A', marginTop: 4 },
  walletIconBox: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center'
  },
  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: '#F1F5F9'
  },
  withdrawBtnText: { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: COLORS.primary },

  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionGridItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  actionGridText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: '#0F172A',
    marginTop: 8,
  },

  section: { 
    backgroundColor: '#FFFFFF', padding: SPACING.xl, borderRadius: 20, 
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#0F172A', marginBottom: SPACING.md },
  bodyText: { fontFamily: 'Outfit-Regular', fontSize: 15, color: '#475569', lineHeight: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { fontFamily: 'Outfit-Medium', fontSize: 14, color: '#64748B' },
  infoValue: { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: '#0F172A' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#475569' }
});
