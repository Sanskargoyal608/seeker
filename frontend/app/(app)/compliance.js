import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '../../store/authSlice';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import * as DocumentPicker from 'expo-document-picker';

export default function ComplianceScreen() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const counselorProfile = user?.counselor_profile || {};

  const handleUpload = async (field) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (res.canceled) return;

      setLoading(true);
      // In a real implementation, we would upload via multipart form-data to S3/MinIO
      // For now, we'll just mock saving the file name to the backend profile
      const fileUri = res.assets[0].uri;
      const fileName = res.assets[0].name;

      const payload = { counselor_profile: {} };
      payload.counselor_profile[field] = fileName;

      const response = await api.patch('/api/accounts/profile/update/', payload);
      dispatch(setUser(response.data));
      Alert.alert('Success', `${fileName} uploaded successfully!`);
    } catch (err) {
      Alert.alert('Upload Error', 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    let completed = 0;
    if (user?.is_verified) completed += 34; // Identity
    if (counselorProfile.degree_file || counselorProfile.graduation_certificate) completed += 33; // Academic
    if (counselorProfile.background_check_file) completed += 33; // Background Check
    return completed;
  };
  const progress = calculateProgress();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Compliance & Credentials</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageDescription}>
          To ensure the safety and professionalism of our community, please provide the following documentation.
        </Text>

        {/* Identity Verification */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Identity Verification</Text>
              <Text style={styles.cardSub}>Government ID / Passport</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.statusAvailable} />
          </View>
          <Text style={styles.statusTextSuccess}>Verified</Text>
        </View>

        {/* Academic Credentials */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Psychology/Counseling Degree</Text>
              <Text style={styles.cardSub}>Official Bachelor's or Master's Diploma</Text>
            </View>
            <Ionicons 
              name={counselorProfile.degree_file ? "checkmark-circle" : "time-outline"} 
              size={24} 
              color={counselorProfile.degree_file ? COLORS.statusAvailable : COLORS.statusBusy} 
            />
          </View>
          <Text style={counselorProfile.degree_file ? styles.statusTextSuccess : styles.statusTextPending}>
            {counselorProfile.degree_file ? counselorProfile.degree_file : 'Pending Upload'}
          </Text>
          <Pressable style={styles.uploadBtn} onPress={() => handleUpload('degree_file')}>
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>{counselorProfile.degree_file ? 'Replace' : 'Upload File'}</Text>
          </Pressable>
        </View>

        {/* Background Check */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Background Check</Text>
              <Text style={styles.cardSub}>Recent Police Clearance or equivalent</Text>
            </View>
            <Ionicons 
              name={counselorProfile.background_check_file ? "checkmark-circle" : "alert-circle-outline"} 
              size={24} 
              color={counselorProfile.background_check_file ? COLORS.statusAvailable : COLORS.error} 
            />
          </View>
          <Text style={counselorProfile.background_check_file ? styles.statusTextSuccess : styles.statusTextError}>
            {counselorProfile.background_check_file ? counselorProfile.background_check_file : 'Required for Onboarding'}
          </Text>
          <Pressable style={styles.uploadBtn} onPress={() => handleUpload('background_check_file')}>
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>{counselorProfile.background_check_file ? 'Replace' : 'Upload File'}</Text>
          </Pressable>
        </View>

        {/* Verification Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>VERIFICATION PROGRESS</Text>
          <View style={styles.progressBarBg}>
             <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% of onboarding completed</Text>
          
          <View style={styles.supportBox}>
            <Text style={styles.supportTitle}>NEED ASSISTANCE?</Text>
            <Text style={styles.supportText}>If you're having trouble uploading documents, our practitioner support team is available 24/7.</Text>
            <Pressable style={styles.supportBtn}>
               <Text style={styles.supportBtnText}>Contact Support</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
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
  pageDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  cardSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  statusTextSuccess: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.statusAvailable,
    marginVertical: SPACING.sm,
  },
  statusTextPending: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.statusBusy,
    marginVertical: SPACING.sm,
  },
  statusTextError: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.error,
    marginVertical: SPACING.sm,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
  },
  uploadBtnText: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
    marginLeft: SPACING.sm,
  },
  progressCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  progressTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  supportBox: {
    backgroundColor: COLORS.surfacePrivate,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  supportTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  supportText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  supportBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  supportBtnText: {
    color: COLORS.onPrimary,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
