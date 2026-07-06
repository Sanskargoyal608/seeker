import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/axios';
import { COLORS, FONTS, RADIUS, SPACING } from '../../../constants/theme';

export default function BookTherapistScreen() {
  const { therapist_id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  const [intakeReason, setIntakeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!selectedTimeSlot) {
      Alert.alert('Selection Required', 'Please select a time slot.');
      return;
    }
    if (!intakeReason.trim()) {
      Alert.alert('Intake Form', 'Please provide a brief reason for booking.');
      return;
    }

    try {
      setSubmitting(true);
      // Construct scheduled_datetime
      const datetimeStr = `${selectedDate}T${selectedTimeSlot.start_time}:00`;
      
      const payload = {
        therapist: parseInt(therapist_id),
        scheduled_datetime: datetimeStr,
        duration_minutes: 60,
        intake_data: { reason: intakeReason }
      };

      await apiClient.post('/api/profiles/bookings/', payload);
      Alert.alert('Success', 'Your session has been booked successfully!', [
        { text: 'OK', onPress: () => router.push('/(app)/dashboard') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to complete booking. Slot might be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDaySlots = availableSlots.find(d => d.date === selectedDate)?.slots || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.title}>Book Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.sectionTitle}>1. Select Date</Text>
          {availableSlots.length === 0 ? (
            <Text style={styles.emptyText}>No available slots for the next 14 days.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateList}>
              {availableSlots.map((item, idx) => {
                const dateObj = new Date(item.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dateObj.toLocaleDateString('en-US', { day: 'numeric' });
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const isSelected = selectedDate === item.date;

                return (
                  <Pressable
                    key={idx}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => {
                      setSelectedDate(item.date);
                      setSelectedTimeSlot(null);
                    }}
                  >
                    <Text style={[styles.dateDay, isSelected && styles.textActive]}>{dayName}</Text>
                    <Text style={[styles.dateNum, isSelected && styles.textActive]}>{dayNum}</Text>
                    <Text style={[styles.dateMonth, isSelected && styles.textActive]}>{monthName}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {selectedDate && (
            <>
              <Text style={styles.sectionTitle}>2. Select Time</Text>
              <View style={styles.timeGrid}>
                {currentDaySlots.map((slot, idx) => {
                  const isSelected = selectedTimeSlot?.id === slot.id;
                  return (
                    <Pressable
                      key={idx}
                      style={[styles.timeSlot, isSelected && styles.timeSlotActive]}
                      onPress={() => setSelectedTimeSlot(slot)}
                    >
                      <Text style={[styles.timeSlotText, isSelected && styles.textActive]}>
                        {slot.start_time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {selectedTimeSlot && (
            <>
              <Text style={styles.sectionTitle}>3. Intake Form</Text>
              <Text style={styles.label}>What brings you to therapy today?</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Briefly describe what you'd like to discuss..."
                value={intakeReason}
                onChangeText={setIntakeReason}
                textAlignVertical="top"
              />

              <Pressable
                style={styles.bookBtn}
                onPress={handleBooking}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.bookBtnText}>Confirm Booking</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: SPACING.xs },
  title: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text },
  container: { flex: 1, padding: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.h4, fontWeight: FONTS.weights.bold, color: COLORS.text, marginTop: SPACING.xl, marginBottom: SPACING.md },
  emptyText: { color: COLORS.textSecondary, fontStyle: 'italic' },
  dateList: { flexDirection: 'row' },
  dateCard: { width: 70, height: 90, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  dateCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDay: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textTransform: 'uppercase' },
  dateNum: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text, marginVertical: 2 },
  dateMonth: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  textActive: { color: COLORS.white },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  timeSlot: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  timeSlotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeSlotText: { fontSize: FONTS.sizes.body, color: COLORS.text, fontWeight: FONTS.weights.bold },
  label: { fontSize: FONTS.sizes.body, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  textArea: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: FONTS.sizes.body, color: COLORS.text, minHeight: 100 },
  bookBtn: { backgroundColor: COLORS.primary, padding: SPACING.lg, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.xl },
  bookBtnText: { color: COLORS.white, fontSize: FONTS.sizes.h4, fontWeight: FONTS.weights.bold },
});
