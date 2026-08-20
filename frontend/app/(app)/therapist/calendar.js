import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../../api/axios';

// Helper to generate the next 14 days
const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export default function TherapistCalendarScreen() {
  const router = useRouter();
  const dates = useMemo(() => generateDates(), []);
  
  // Format YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  const [selectedDateObj, setSelectedDateObj] = useState(dates[0]);
  const selectedDate = formatDate(selectedDateObj);
  
  const [scheduled, setScheduled] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/profiles/therapist/calendar/${selectedDate}/`);
      setScheduled(res.data.scheduled || []);
      setUnscheduled(res.data.unscheduled || []);
    } catch (error) {
      console.log('Error fetching calendar', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCalendar();
    }, [selectedDate])
  );

  const toggleSlotBlock = async (slot) => {
    try {
      await apiClient.post(`/api/profiles/therapist/calendar/${selectedDate}/toggle-block/`, {
        start_time: slot.start_time,
        end_time: slot.end_time
      });
      fetchCalendar(); // Refresh UI
    } catch (error) {
      Alert.alert('Error', 'Could not update slot availability.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(app)/therapist/manage-schedule')}>
          <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.calendarStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
          {dates.map((dateObj, idx) => {
            const dateStr = formatDate(dateObj);
            const isSelected = selectedDate === dateStr;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            
            return (
              <Pressable 
                key={idx} 
                style={[styles.dayCard, isSelected && styles.dayCardActive]}
                onPress={() => setSelectedDateObj(dateObj)}
              >
                <Text style={[styles.dayName, isSelected && styles.textActive]}>{dayName}</Text>
                <Text style={[styles.dayNumber, isSelected && styles.textActive]}>{dayNum}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Scheduled Sessions */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scheduled Sessions</Text>
              <Text style={styles.sectionSub}>{scheduled.length}</Text>
            </View>

            <View style={styles.timeline}>
              {scheduled.length === 0 && (
                <Text style={styles.emptyText}>No sessions booked for this day.</Text>
              )}
              {scheduled.map((s, idx) => (
                <View key={`s_${s.id}`} style={styles.eventRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{s.start_time}</Text>
                    <Text style={styles.durationText}>{s.duration} min</Text>
                  </View>
                  <View style={styles.eventLine}>
                    <View style={styles.dotPrimary} />
                    {idx !== scheduled.length - 1 && <View style={styles.line} />}
                  </View>
                  <Pressable style={styles.eventCard} onPress={() => router.push(`/(app)/chat/${s.id}`)}>
                    <View style={styles.eventCardLeft}>
                      <Text style={styles.clientName}>{s.patient_name}</Text>
                      <Text style={styles.eventStatus}>Confirmed</Text>
                    </View>
                    <Ionicons name="videocam" size={24} color={COLORS.primary} />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Unscheduled / Available Slots */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Slots</Text>
            </View>

            <View style={styles.timeline}>
              {unscheduled.length === 0 && (
                <Text style={styles.emptyText}>No availability set for this day.</Text>
              )}
              {unscheduled.map((s, idx) => (
                <View key={`u_${s.id}`} style={styles.eventRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{s.start_time}</Text>
                    <Text style={styles.durationText}>Open</Text>
                  </View>
                  <View style={styles.eventLine}>
                    <View style={[styles.dot, s.is_blocked ? styles.dotGray : styles.dotGreen]} />
                    {idx !== unscheduled.length - 1 && <View style={styles.line} />}
                  </View>
                  <View style={[styles.eventCard, s.is_blocked && styles.eventCardBlocked]}>
                    <View style={styles.eventCardLeft}>
                      <Text style={[styles.clientName, s.is_blocked && {color: '#94A3B8'}]}>
                        {s.is_blocked ? 'Blocked Slot' : 'Available'}
                      </Text>
                      <Text style={styles.eventStatus}>
                        {s.is_blocked ? 'Not taking bookings' : 'Open for bookings'}
                      </Text>
                    </View>
                    <Switch
                      value={!s.is_blocked}
                      onValueChange={() => toggleSlotBlock(s)}
                      trackColor={{ false: '#E2E8F0', true: '#DCFCE7' }}
                      thumbColor={!s.is_blocked ? COLORS.success : '#f4f3f4'}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
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
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center'
  },
  calendarStripContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)' },
  calendarStrip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: 12 },
  dayCard: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, width: 64,
  },
  dayCardActive: { backgroundColor: COLORS.primary },
  dayName: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  dayNumber: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#0F172A' },
  textActive: { color: '#FFFFFF' },
  
  content: { paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, marginTop: SPACING.xl, marginBottom: SPACING.lg
  },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#0F172A' },
  sectionSub: { fontFamily: 'Outfit-Medium', fontSize: 13, color: COLORS.primary, backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 10, fontFamily: 'Outfit-Regular' },

  timeline: { paddingHorizontal: SPACING.xl },
  eventRow: { flexDirection: 'row', marginBottom: SPACING.lg },
  timeCol: { width: 60, alignItems: 'flex-end', paddingRight: SPACING.md },
  timeText: { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: '#0F172A' },
  durationText: { fontFamily: 'Outfit-Regular', fontSize: 11, color: '#64748B', marginTop: 2 },
  eventLine: { alignItems: 'center', marginRight: SPACING.md },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  dotPrimary: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, zIndex: 1 },
  dotGray: { backgroundColor: '#94A3B8' },
  dotGreen: { backgroundColor: COLORS.success },
  line: { width: 2, flex: 1, backgroundColor: '#E2E8F0', position: 'absolute', top: 12, bottom: -20 },
  
  eventCard: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: SPACING.lg, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    marginTop: -8
  },
  eventCardBlocked: { backgroundColor: '#F8FAFC' },
  eventCardLeft: { flex: 1 },
  clientName: { fontFamily: 'Outfit-SemiBold', fontSize: 16, color: '#0F172A', marginBottom: 4 },
  eventStatus: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#64748B' }
});
