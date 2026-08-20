import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons, MaterialSymbols } from '@expo/vector-icons';
import apiClient from '../../api/axios';
import { requestPasswordReset, resetPassword } from '../../api/auth';
import PanicButton from '../../components/PanicButton';

export default function SettingsScreen() {
  const user = useSelector(selectUser);
  const router = useRouter();
  const { handleLogout } = useAuth();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [sessionNotif, setSessionNotif] = useState(true);

  // Change Password State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleChangePasswordRequest = async () => {
    setLoadingPassword(true);
    try {
      await requestPasswordReset(user?.email);
      setOtpSent(true);
      setPasswordModalVisible(true);
      Alert.alert('OTP Sent', 'Please check your email for the OTP to reset your password.');
    } catch (err) {
      Alert.alert('Error', 'Failed to send OTP. Please try again later.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePasswordResetSubmit = async () => {
    if (!otpCode || !newPassword) {
      Alert.alert('Error', 'Please enter both OTP and a new password.');
      return;
    }
    setLoadingPassword(true);
    try {
      await resetPassword(user?.email, otpCode, newPassword);
      setPasswordModalVisible(false);
      setOtpCode('');
      setNewPassword('');
      setOtpSent(false);
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to change password. Invalid OTP or weak password.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleLogout },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.delete('/api/accounts/delete/');
      setDeleteModalVisible(false);
      Alert.alert('Success', 'Your account has been deleted.');
      handleLogout();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (user?.role === 'THERAPIST') {
        router.replace('/(app)/therapist/dashboard');
      } else {
        router.replace('/(app)/dashboard');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.headerRight}>
           <Text style={styles.appName}>Buddy Wellness</Text>
           <PanicButton variant="outline" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
         
        {/* Profile Header Context */}
        <View style={styles.profileContextCard}>
           <View style={styles.avatarWrap}>
              <View style={styles.avatarPlaceholder}>
                 <Text style={styles.avatarText}>{user?.first_name?.[0] || 'U'}</Text>
              </View>
              <View style={styles.statusDot} />
           </View>
           <View style={styles.profileContextInfo}>
              <Text style={styles.nameText}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.memberSince}>Active Buddy since {new Date(user?.date_joined || Date.now()).getFullYear()}</Text>
              <View style={styles.badges}>
                 <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>Premium Member</Text>
                 </View>
                 <View style={styles.goalBadge}>
                    <Text style={styles.goalBadgeText}>Daily Goal: Mindful Breath</Text>
                 </View>
              </View>
           </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.financialCard}>
           <Ionicons name="wallet-outline" size={120} color="rgba(255,255,255,0.1)" style={styles.financeBgIcon} />
           <Text style={styles.financeTitle}>Financial Summary</Text>
           
           <View style={styles.financeBalanceRow}>
              <Text style={styles.financeAmount}>$1,420.50</Text>
              <Text style={styles.financeLabel}>Total Invested</Text>
           </View>

           <View style={styles.financeStatsGrid}>
              <View style={styles.financeStatBox}>
                 <Text style={styles.financeStatLabel}>This Month</Text>
                 <Text style={styles.financeStatValue}>$185.00</Text>
              </View>
              <View style={styles.financeStatBox}>
                 <Text style={styles.financeStatLabel}>Next Billing</Text>
                 <Text style={styles.financeStatValue}>Oct 12</Text>
              </View>
              <View style={styles.financeStatBox}>
                 <Text style={styles.financeStatLabel}>Saved</Text>
                 <Text style={styles.financeStatValue}>$240.00</Text>
              </View>
              <View style={styles.financeStatBox}>
                 <Text style={styles.financeStatLabel}>Credits</Text>
                 <Text style={styles.financeStatValue}>4 Left</Text>
              </View>
           </View>

           <Pressable style={styles.financeBtn}>
              <Text style={styles.financeBtnText}>View Detailed History</Text>
           </Pressable>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Security</Text>
           <View style={styles.settingCard}>
              
              <Pressable 
                 style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
                 onPress={handleChangePasswordRequest}
                 disabled={loadingPassword}
              >
                 <View style={styles.settingRowLeft}>
                    <View style={styles.settingIconWrap}>
                       <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
                    </View>
                    <View>
                       <Text style={styles.settingTitle}>Change Password</Text>
                       <Text style={styles.settingSub}>Last updated 3 months ago</Text>
                    </View>
                 </View>
                  {loadingPassword ? (
                     <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                     <Ionicons name="chevron-forward" size={20} color={COLORS.outlineVariant} />
                  )}
              </Pressable>

              <View style={[styles.settingRow, styles.settingRowBorder]}>
                 <View style={styles.settingRowLeft}>
                    <View style={styles.settingIconWrap}>
                       <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                    </View>
                    <View>
                       <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                       <Text style={styles.settingSub}>Enhanced protection for your sessions</Text>
                    </View>
                 </View>
                 <Switch 
                    value={twoFactor} 
                    onValueChange={setTwoFactor} 
                    trackColor={{ false: COLORS.outlineVariant, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                 />
              </View>

           </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Notifications</Text>
           <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                 <View style={styles.settingRowLeft}>
                    <Ionicons name="notifications" size={20} color={COLORS.onSurfaceVariant} style={{ marginRight: 16 }} />
                    <Text style={styles.settingTitle}>Push Notifications</Text>
                 </View>
                 <Switch value={pushNotif} onValueChange={setPushNotif} trackColor={{ false: COLORS.outlineVariant, true: COLORS.primary }} thumbColor={COLORS.white} />
              </View>
              <View style={[styles.settingRow, styles.settingRowBorder]}>
                 <View style={styles.settingRowLeft}>
                    <Ionicons name="mail" size={20} color={COLORS.onSurfaceVariant} style={{ marginRight: 16 }} />
                    <Text style={styles.settingTitle}>Email Updates</Text>
                 </View>
                 <Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ false: COLORS.outlineVariant, true: COLORS.primary }} thumbColor={COLORS.white} />
              </View>
              <View style={[styles.settingRow, styles.settingRowBorder]}>
                 <View style={styles.settingRowLeft}>
                    <Ionicons name="calendar" size={20} color={COLORS.onSurfaceVariant} style={{ marginRight: 16 }} />
                    <Text style={styles.settingTitle}>Session Reminders</Text>
                 </View>
                 <Switch value={sessionNotif} onValueChange={setSessionNotif} trackColor={{ false: COLORS.outlineVariant, true: COLORS.primary }} thumbColor={COLORS.white} />
              </View>
           </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>Account Actions</Text>
           
           <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={styles.logoutText}>Log Out</Text>
           </Pressable>

           <Pressable style={styles.deleteBtn} onPress={() => setDeleteModalVisible(true)}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={styles.deleteText}>Delete Account</Text>
           </Pressable>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerVersion}>Buddy Wellness App v4.2.0</Text>
           <Text style={styles.footerTagline}>Designed with empathy</Text>
        </View>

      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
         <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
               <View style={styles.modalIconWrap}>
                  <Ionicons name="warning" size={40} color={COLORS.error} />
               </View>
               <Text style={styles.modalTitle}>Are you sure?</Text>
               <Text style={styles.modalSub}>
                  This action will permanently delete your session history, therapeutic matches, and all personal wellness data. This cannot be undone.
               </Text>
               <View style={styles.modalActions}>
                  <Pressable style={styles.modalDeleteBtn} onPress={handleDeleteAccount}>
                     <Text style={styles.modalDeleteBtnText}>Yes, Delete Everything</Text>
                  </Pressable>
                  <Pressable style={styles.modalCancelBtn} onPress={() => setDeleteModalVisible(false)}>
                     <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </Pressable>
               </View>
            </View>
         </View>
      </Modal>

      {/* Change Password OTP Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
               <View style={styles.modalIconWrap}>
                  <Ionicons name="lock-closed" size={40} color={COLORS.primary} />
               </View>
               <Text style={styles.modalTitle}>Change Password</Text>
               <Text style={styles.modalSub}>
                  Enter the OTP sent to your email along with your new password.
               </Text>
               
               <TextInput
                  style={styles.modalInput}
                  placeholder="Enter OTP"
                  placeholderTextColor={COLORS.outline}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
               />
               <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  placeholderTextColor={COLORS.outline}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
               />
               
               <View style={styles.modalActions}>
                  <Pressable 
                     style={({ pressed }) => [styles.modalPrimaryBtn, pressed && { opacity: 0.8 }]} 
                     onPress={handlePasswordResetSubmit}
                     disabled={loadingPassword}
                  >
                     {loadingPassword ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalPrimaryBtnText}>Change Password</Text>}
                  </Pressable>
                  <Pressable style={styles.modalCancelBtn} onPress={() => { setPasswordModalVisible(false); setOtpSent(false); }}>
                     <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </Pressable>
               </View>
            </View>
         </View>
      </Modal>

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
    backgroundColor: 'rgba(251, 249, 248, 0.8)', // surface/80
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurfaceVariant,
    display: 'none', // Shown on md screens in original, hiding on mobile
  },
  crisisBtn: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)', // error/10
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  crisisBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.error,
  },
  container: {
    paddingHorizontal: SPACING.marginMobile,
    paddingTop: SPACING.lg,
    paddingBottom: 80,
  },
  profileContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    padding: 24,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(193, 199, 204, 0.3)',
    marginBottom: 40,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderWidth: 4,
    borderColor: 'rgba(45, 90, 110, 0.2)', // primary-container/20
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: FONTS.family.headline,
    fontSize: 32,
    color: COLORS.onSurfaceVariant,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.statusAvailable,
    borderWidth: 4,
    borderColor: COLORS.surfaceContainerLowest,
  },
  profileContextInfo: {
    flex: 1,
  },
  nameText: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  memberSince: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  premiumBadge: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  premiumBadgeText: {
    fontFamily: FONTS.family.body,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.onSecondaryContainer,
  },
  goalBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  goalBadgeText: {
    fontFamily: FONTS.family.body,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.onSurfaceVariant,
  },
  financialCard: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: RADIUS.xl,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
    ...SHADOWS.sm,
  },
  financeBgIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 24,
  },
  financeTitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: 'rgba(163, 208, 231, 0.8)', // on-primary-container/80
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  financeBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  financeAmount: {
    fontFamily: FONTS.family.headline,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.onPrimaryContainer,
  },
  financeLabel: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onPrimaryContainer,
    opacity: 0.8,
  },
  financeStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 24,
  },
  financeStatBox: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: RADIUS.lg,
  },
  financeStatLabel: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.onPrimaryContainer,
    opacity: 0.7,
  },
  financeStatValue: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimaryContainer,
  },
  financeBtn: {
    marginTop: 24,
    width: '100%',
    paddingVertical: 12,
    backgroundColor: COLORS.onPrimaryContainer,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  financeBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
    marginTop: 24,
  },
  settingCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 199, 204, 0.3)',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 199, 204, 0.2)',
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  settingSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 199, 204, 0.3)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: RADIUS.xl,
    gap: 16,
    marginBottom: 8,
  },
  logoutText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 218, 214, 0.1)', // error-container/10
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)', // error/20
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: RADIUS.xl,
    gap: 16,
  },
  deleteText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
  },
  footerVersion: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.outline,
    marginBottom: 4,
  },
  footerTagline: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: 'rgba(113, 120, 124, 0.6)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 8,
  },
  modalSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalDeleteBtn: {
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  modalDeleteBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onError,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurface,
  }
});
