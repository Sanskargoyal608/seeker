import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { submitFeedback } from '../../../api/core';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../../constants/theme';

export default function SessionFeedbackScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFeedback(id, {
        q1_before_session: q1.trim() || 'N/A',
        q2_after_session: q2.trim() || 'N/A',
        q3_what_helped: q3.trim() || 'N/A',
        q4_what_improve: q4.trim() || 'N/A'
      });
      router.replace('/(app)/dashboard');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit feedback.');
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(app)/dashboard');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarPlaceholder}>
             <Ionicons name="person" size={20} color={COLORS.onSurfaceVariant} />
          </View>
          <Text style={styles.headerTitle}>Buddy Wellness</Text>
        </View>
        <Pressable style={styles.crisisBtn}>
          <Text style={styles.crisisBtnText}>Crisis</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.progressHeader}>
             <View>
                <Text style={styles.progressLabel}>Session Complete</Text>
                <Text style={styles.progressTitle}>Reflect on your session</Text>
             </View>
             <View style={styles.checkCircle}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.onSecondaryContainer} />
             </View>
          </View>

          <View style={styles.formCard}>
             
             {/* Q1 */}
             <View style={styles.formGroup}>
                <Text style={styles.questionTitle}>How did you feel before/after?</Text>
                <Text style={styles.questionSub}>Describe any shift in your emotional state during the time spent with your practitioner.</Text>
                <TextInput
                   style={styles.textArea}
                   multiline
                   numberOfLines={3}
                   placeholder="Share what's on your mind..."
                   placeholderTextColor={COLORS.outline}
                   value={q1}
                   onChangeText={setQ1}
                   textAlignVertical="top"
                />
             </View>

             {/* Q2 */}
             <View style={styles.formGroup}>
                <Text style={styles.questionTitle}>What helped most?</Text>
                <Text style={styles.questionSub}>Was there a specific technique, insight, or moment that resonated with you?</Text>
                <TextInput
                   style={styles.textArea}
                   multiline
                   numberOfLines={3}
                   placeholder="What stood out to you today?"
                   placeholderTextColor={COLORS.outline}
                   value={q2}
                   onChangeText={setQ2}
                   textAlignVertical="top"
                />
             </View>

             {/* Q3 */}
             <View style={styles.formGroup}>
                <Text style={styles.questionTitle}>What could improve?</Text>
                <Text style={styles.questionSub}>Help us enhance your experience. Is there something we could do differently?</Text>
                <TextInput
                   style={styles.textArea}
                   multiline
                   numberOfLines={3}
                   placeholder="Your suggestions are valuable to us..."
                   placeholderTextColor={COLORS.outline}
                   value={q3}
                   onChangeText={setQ3}
                   textAlignVertical="top"
                />
             </View>

             {/* Q4 */}
             <View style={styles.formGroup}>
                <Text style={styles.questionTitle}>Any concerns?</Text>
                <Text style={styles.questionSub}>Is there anything else you'd like to share about your session or your practitioner?</Text>
                <TextInput
                   style={styles.textArea}
                   multiline
                   numberOfLines={3}
                   placeholder="Anything else..."
                   placeholderTextColor={COLORS.outline}
                   value={q4}
                   onChangeText={setQ4}
                   textAlignVertical="top"
                />
             </View>

             <View style={styles.reportRow}>
                <Ionicons name="flag" size={16} color={COLORS.onSurfaceVariant} />
                <Text style={styles.reportText}>Report inappropriate behavior</Text>
             </View>

             <View style={styles.actionGroup}>
                <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                   {submitting ? <ActivityIndicator color={COLORS.onPrimary} /> : <Text style={styles.submitText}>Submit Feedback</Text>}
                </Pressable>
                <Pressable style={styles.skipBtn} onPress={handleSkip}>
                   <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>
             </View>
          </View>

          <Text style={styles.footerHint}>
             Your feedback is anonymous and helps us ensure the highest quality of empathetic care for the entire community.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
    paddingHorizontal: SPACING.marginMobile,
    paddingTop: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressLabel: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.primary,
    opacity: 0.6,
    marginBottom: 4,
  },
  progressTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLgMobile,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 67, 86, 0.08)',
    ...SHADOWS.sm,
    marginBottom: 40,
  },
  formGroup: {
    marginBottom: 24,
  },
  questionTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  questionSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: COLORS.surfaceBright,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    padding: 16,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurface,
    minHeight: 100,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    gap: 8,
    marginBottom: 24,
  },
  reportText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  actionGroup: {
    gap: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  submitText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  footerHint: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  }
});
