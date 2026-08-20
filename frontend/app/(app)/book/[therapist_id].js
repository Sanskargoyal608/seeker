import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/axios';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../../constants/theme';
import PanicButton from '../../../components/PanicButton';

export default function BookTherapistScreen() {
  const { therapist_id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [intakeReason, setIntakeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchSlots();
  }, [therapist_id]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/api/profiles/therapists/${therapist_id}/slots/?days=14`);
      setAvailableSlots(data.available_slots);
      if (data.available_slots.length > 0) {
        setSelectedDate(data.available_slots[0].date);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load availability for this therapist.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!intakeReason.trim()) {
      Alert.alert('Required', 'Please provide a brief reason for booking.');
      return;
    }

    try {
      setSubmitting(true);
      const datetimeStr = `${selectedDate}T${selectedTimeSlot.start_time}:00`;
      
      const payload = {
        therapist: parseInt(therapist_id),
        scheduled_datetime: datetimeStr,
        duration_minutes: 60,
        intake_data: { reason: intakeReason }
      };

      await apiClient.post('/api/profiles/bookings/', payload);
      setStep(3); // Go to Confirmation
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to complete booking. Slot might be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDaySlots = availableSlots.find(d => d.date === selectedDate)?.slots || [];

  if (loading) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Buddy Wellness</Text>
        </View>
        <PanicButton variant="outline" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          {/* Provider Info Card */}
          <View style={styles.providerCard}>
            <View style={styles.providerImgPlaceholder}>
              <Text style={styles.providerImgInitial}>Dr</Text>
            </View>
            <View style={styles.providerDetails}>
              <Text style={styles.providerName}>Dr. Sarah Chen</Text>
              <Text style={styles.providerSpec}>Licensed Psychotherapist • CBT</Text>
              <View style={styles.acceptingBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.acceptingText}>Accepting New Clients</Text>
              </View>
            </View>
          </View>

          {/* Stepper Navbar */}
          <View style={styles.stepperNav}>
            <View style={[styles.stepItem, step === 1 ? styles.stepActive : (step > 1 ? styles.stepDone : styles.stepFuture)]}>
               <Text style={[styles.stepLabel, step === 1 ? styles.textPrimary : (step > 1 ? styles.textDone : styles.textFuture)]}>Step 1</Text>
               <Text style={[styles.stepTitle, step === 1 ? styles.textPrimary : (step > 1 ? styles.textDone : styles.textFuture)]}>Select Session</Text>
            </View>
            <View style={[styles.stepItem, step === 2 ? styles.stepActive : (step > 2 ? styles.stepDone : styles.stepFuture)]}>
               <Text style={[styles.stepLabel, step === 2 ? styles.textPrimary : (step > 2 ? styles.textDone : styles.textFuture)]}>Step 2</Text>
               <Text style={[styles.stepTitle, step === 2 ? styles.textPrimary : (step > 2 ? styles.textDone : styles.textFuture)]}>Intake Details</Text>
            </View>
            <View style={[styles.stepItem, step === 3 ? styles.stepActive : styles.stepFuture]}>
               <Text style={[styles.stepLabel, step === 3 ? styles.textPrimary : styles.textFuture]}>Step 3</Text>
               <Text style={[styles.stepTitle, step === 3 ? styles.textPrimary : styles.textFuture]}>Confirmation</Text>
            </View>
          </View>

          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionHeader}>When would you like to talk?</Text>
              <Text style={styles.sectionSub}>Choose a time that works best for your privacy and peace of mind.</Text>
              
              {/* Fake Calendar View for Demo / Date List */}
              <View style={styles.calendarWidget}>
                 <View style={styles.calendarHeader}>
                    <Text style={styles.calendarMonth}>Available Dates</Text>
                 </View>
                 {availableSlots.length === 0 ? (
                   <Text style={{ fontFamily: FONTS.family.body, color: COLORS.onSurfaceVariant }}>No available slots for the next 14 days.</Text>
                 ) : (
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                     {availableSlots.map((item, idx) => {
                        const dateObj = new Date(item.date);
                        const isSelected = selectedDate === item.date;
                        return (
                          <Pressable
                            key={idx}
                            style={[styles.dateCell, isSelected && styles.dateCellActive]}
                            onPress={() => {
                              setSelectedDate(item.date);
                              setSelectedTimeSlot(null);
                            }}
                          >
                            <Text style={[styles.dateCellDay, isSelected && { color: COLORS.onPrimary }]}>{dateObj.getDate()}</Text>
                          </Pressable>
                        )
                     })}
                   </ScrollView>
                 )}
                 <Text style={styles.calendarHint}>Available slots are highlighted based on your timezone.</Text>
              </View>

              {/* Time Slots */}
              {selectedDate && (
                <View style={styles.timeSlotsWrapper}>
                  <Text style={styles.timeSlotsTitle}>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'})}</Text>
                  <View style={styles.timeGrid}>
                    {currentDaySlots.map((slot, idx) => {
                      const isSelected = selectedTimeSlot?.id === slot.id;
                      return (
                        <Pressable
                          key={idx}
                          style={[styles.timeBtn, isSelected && styles.timeBtnActive]}
                          onPress={() => setSelectedTimeSlot(slot)}
                        >
                          <Text style={[styles.timeBtnText, isSelected && { color: COLORS.onPrimary }]}>{slot.start_time}</Text>
                          <Text style={[styles.timeBtnSub, isSelected && { color: COLORS.onPrimary }]}>50 mins</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.infoBanner}>
                     <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                     <Text style={styles.infoBannerText}>Full session length is 50 minutes. Please arrive 5 minutes early to your virtual waiting room.</Text>
                  </View>
                </View>
              )}

              <View style={styles.actionRow}>
                 <Pressable 
                    style={[styles.primaryActionBtn, !selectedTimeSlot && { opacity: 0.5 }]} 
                    disabled={!selectedTimeSlot}
                    onPress={() => setStep(2)}
                 >
                    <Text style={styles.primaryActionText}>Next: Patient Intake</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.onPrimary} />
                 </Pressable>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionHeader}>Patient Intake</Text>
              <Text style={styles.sectionSub}>Please provide a brief reason for booking. This helps Dr. Chen prepare for your session.</Text>
              
              <View style={styles.intakeForm}>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={6}
                  placeholder="What brings you to therapy today? (Optional but recommended)"
                  placeholderTextColor={COLORS.outline}
                  value={intakeReason}
                  onChangeText={setIntakeReason}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.actionRowSpace}>
                 <Pressable style={styles.secondaryActionBtn} onPress={() => setStep(1)}>
                    <Text style={styles.secondaryActionText}>Back</Text>
                 </Pressable>
                 <Pressable 
                    style={styles.primaryActionBtn} 
                    onPress={handleBooking}
                    disabled={submitting}
                 >
                    {submitting ? <ActivityIndicator color={COLORS.onPrimary} size="small" /> : (
                      <>
                        <Text style={styles.primaryActionText}>Confirm Booking</Text>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.onPrimary} />
                      </>
                    )}
                 </Pressable>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.statusAvailable} style={{ marginBottom: 16 }} />
                <Text style={styles.successTitle}>Booking Confirmed!</Text>
                <Text style={styles.successText}>Your session has been scheduled successfully.</Text>
                
                <Pressable style={styles.homeBtn} onPress={() => router.push('/(app)/dashboard')}>
                  <Text style={styles.homeBtnText}>Return to Dashboard</Text>
                </Pressable>
              </View>
            </View>
          )}

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
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    zIndex: 10,
    ...SHADOWS.ambient,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.marginMobile,
    paddingTop: 24,
  },
  providerCard: {
    marginBottom: 32,
  },
  providerImgPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.md,
  },
  providerImgInitial: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLg,
    color: COLORS.onSurfaceVariant,
  },
  providerName: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  providerSpec: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: 8,
  },
  acceptingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.statusAvailable,
  },
  acceptingText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.statusAvailable,
  },
  stepperNav: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.outlineVariant,
    marginLeft: 16,
    paddingLeft: 24,
    marginBottom: 40,
    gap: 24,
  },
  stepItem: {
    position: 'relative',
  },
  stepActive: {
  },
  stepActiveIndicator: {
    position: 'absolute',
    left: -27,
    top: 4,
    width: 4,
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  textPrimary: {
    color: COLORS.primary,
  },
  textDone: {
    color: COLORS.onSurfaceVariant,
  },
  textFuture: {
    color: COLORS.outlineVariant,
  },
  stepLabel: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  sectionHeader: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLgMobile,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: 24,
  },
  calendarWidget: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.ambient,
    marginBottom: 24,
  },
  calendarHeader: {
    marginBottom: 16,
  },
  calendarMonth: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  dateCell: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  dateCellActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  dateCellDay: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  calendarHint: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.outline,
    textAlign: 'center',
    marginTop: 8,
  },
  timeSlotsWrapper: {
    marginBottom: 32,
  },
  timeSlotsTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  timeBtn: {
    width: '48%',
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  timeBtnText: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  timeBtnSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: RADIUS.xl,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  actionRow: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  actionRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    gap: 8,
    ...SHADOWS.md,
  },
  primaryActionText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
  secondaryActionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  secondaryActionText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  intakeForm: {
    marginTop: 16,
  },
  textArea: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
    padding: 20,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurface,
    minHeight: 160,
    ...SHADOWS.sm,
  },
  successBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  successTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 16,
  },
  successText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: 40,
    textAlign: 'center',
  },
  homeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
  },
  homeBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
});
