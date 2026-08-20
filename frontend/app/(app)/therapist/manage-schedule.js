import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import apiClient from '../../../api/axios';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Mon' },
  { id: 1, label: 'Tue' },
  { id: 2, label: 'Wed' },
  { id: 3, label: 'Thu' },
  { id: 4, label: 'Fri' },
  { id: 5, label: 'Sat' },
  { id: 6, label: 'Sun' },
];

export default function ManageScheduleScreen() {
  const router = useRouter();
  
  // Default selection: Mon-Fri
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4]);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('17:00');

  const toggleDay = (id) => {
    if (selectedDays.includes(id)) {
      setSelectedDays(selectedDays.filter(d => d !== id));
    } else {
      setSelectedDays([...selectedDays, id].sort());
    }
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day.');
      return;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTimeStr) || !timeRegex.test(endTimeStr)) {
      Alert.alert('Error', 'Please use HH:MM format (24-hour) for times.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/profiles/availability/bulk/', {
        days: selectedDays,
        start_time: startTimeStr,
        end_time: endTimeStr,
        session_duration: sessionDuration
      });
      
      Alert.alert('Success', 'Your schedule has been updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.log('Error saving schedule', error);
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Schedule Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Working Days */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Working Days</Text>
          </View>
          <Text style={styles.subtitle}>Select the days you are available to take sessions.</Text>
          
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map(day => (
              <Pressable
                key={day.id}
                style={[styles.dayCircle, selectedDays.includes(day.id) && styles.dayCircleActive]}
                onPress={() => toggleDay(day.id)}
              >
                <Text style={[styles.dayText, selectedDays.includes(day.id) && styles.dayTextActive]}>
                  {day.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time Range */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Daily Hours</Text>
          </View>
          <Text style={styles.subtitle}>Set your standard start and end times (24h format).</Text>
          
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Start Time</Text>
              <View style={styles.inputBox}>
                 <Text style={styles.inputText}>{startTimeStr}</Text>
              </View>
              <View style={styles.timeBtns}>
                 <Pressable onPress={() => setStartTimeStr('08:00')} style={styles.tinyBtn}><Text style={styles.tinyBtnText}>08:00</Text></Pressable>
                 <Pressable onPress={() => setStartTimeStr('09:00')} style={styles.tinyBtn}><Text style={styles.tinyBtnText}>09:00</Text></Pressable>
                 <Pressable onPress={() => setStartTimeStr('10:00')} style={styles.tinyBtn}><Text style={styles.tinyBtnText}>10:00</Text></Pressable>
              </View>
            </View>
            
            <Ionicons name="arrow-forward" size={20} color="#CBD5E1" style={{ marginTop: 24 }} />
            
            <View style={styles.timeCol}>
              <Text style={styles.label}>End Time</Text>
              <View style={styles.inputBox}>
                 <Text style={styles.inputText}>{endTimeStr}</Text>
              </View>
              <View style={styles.timeBtns}>
                 <Pressable onPress={() => setEndTimeStr('16:00')} style={styles.tinyBtn}><Text style={styles.tinyBtnText}>16:00</Text></Pressable>
                 <Pressable onPress={() => setEndTimeStr('17:00')} style={styles.tinyBtn}><Text style={styles.tinyBtnText}>17:00</Text></Pressable>
                 <Pressable onPress={() => setEndTimeStr('18:00')} style={styles.tinyBtn}><Text style={styles.tinyBtnText}>18:00</Text></Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Duration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hourglass-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Session Duration</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.badge}><Text style={styles.badgeText}>{sessionDuration} min</Text></View>
          </View>
          <Text style={styles.subtitle}>Standard length for each client appointment.</Text>
          
          <Slider
            style={{ width: '100%', height: 40, marginTop: SPACING.md }}
            minimumValue={30}
            maximumValue={120}
            step={15}
            value={sessionDuration}
            onValueChange={setSessionDuration}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor="#E2E8F0"
            thumbTintColor={COLORS.primary}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#0284C7" />
          <Text style={styles.infoText}>Saving will update your future availability. Existing booked sessions will not be affected.</Text>
        </View>

        <Pressable 
          style={styles.saveBtn} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Schedule</Text>
          )}
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#0F172A' },
  backBtn: { padding: 4 },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#0F172A' },
  subtitle: { fontFamily: 'Outfit-Regular', fontSize: 13, color: '#64748B', marginBottom: SPACING.md },
  
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 },
  dayCircle: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0'
  },
  dayCircleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#475569' },
  dayTextActive: { color: '#FFFFFF' },
  
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timeCol: { flex: 1, alignItems: 'center' },
  label: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#475569', marginBottom: 6 },
  inputBox: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
    borderWidth: 1, borderColor: '#E2E8F0', width: '100%', alignItems: 'center'
  },
  inputText: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#0F172A' },
  timeBtns: { flexDirection: 'row', gap: 6, marginTop: 12 },
  tinyBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tinyBtnText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#475569' },
  
  badge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: COLORS.primary, fontFamily: 'Outfit-Bold', fontSize: 14 },
  
  infoBox: {
    flexDirection: 'row', backgroundColor: '#F0F9FF', padding: SPACING.md, borderRadius: 12,
    alignItems: 'flex-start', gap: 12, marginBottom: SPACING.xl
  },
  infoText: { flex: 1, fontFamily: 'Outfit-Medium', fontSize: 13, color: '#0369A1', lineHeight: 18 },
  
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  saveBtnText: { color: '#FFFFFF', fontFamily: 'Outfit-Bold', fontSize: 16 },
});
