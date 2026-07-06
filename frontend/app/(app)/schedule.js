import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../../api/axios';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ScheduleScreen() {
  const router = useRouter();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(10, 0, 0, 0)));

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/profiles/availability/');
      setSlots(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    try {
      setIsSubmitting(true);
      
      const formatTime = (d) => {
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      };

      const payload = {
        day_of_week: selectedDay,
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        is_active: true
      };

      await apiClient.post('/api/profiles/availability/', payload);
      setModalVisible(false);
      fetchSlots();
    } catch (error) {
      Alert.alert('Error', 'Failed to add slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await apiClient.delete(`/api/profiles/availability/${id}/`);
      fetchSlots();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete slot.');
    }
  };

  const renderSlot = ({ item }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotInfo}>
        <Text style={styles.slotDay}>{DAYS[item.day_of_week]}</Text>
        <Text style={styles.slotTime}>
          {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
        </Text>
      </View>
      <Pressable onPress={() => handleDeleteSlot(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.title}>My Schedule</Text>
        <Pressable onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSlot}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No slots configured yet.</Text>}
        />
      )}

      {/* Add Slot Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Availability Slot</Text>
            
            <Text style={styles.label}>Day of the Week</Text>
            <View style={styles.daySelector}>
              {DAYS.map((day, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.dayChip, selectedDay === idx && styles.dayChipActive]}
                  onPress={() => setSelectedDay(idx)}
                >
                  <Text style={[styles.dayChipText, selectedDay === idx && styles.dayChipTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timePickerContainer}>
                <Text style={styles.label}>Start Time</Text>
                <Pressable style={styles.timeBox} onPress={() => setShowStartPicker(true)}>
                  <Text>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </Pressable>
                {showStartPicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (date) setStartTime(date);
                    }}
                  />
                )}
              </View>

              <View style={styles.timePickerContainer}>
                <Text style={styles.label}>End Time</Text>
                <Pressable style={styles.timeBox} onPress={() => setShowEndPicker(true)}>
                  <Text>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </Pressable>
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (date) setEndTime(date);
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAddSlot} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Slot</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: SPACING.xs },
  title: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text },
  addBtn: { padding: SPACING.xs },
  listContainer: { padding: SPACING.md },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl },
  slotCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  slotInfo: { flex: 1 },
  slotDay: { fontSize: FONTS.sizes.bodyLg, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: 4 },
  slotTime: { fontSize: FONTS.sizes.body, color: COLORS.textSecondary },
  deleteBtn: { padding: SPACING.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, padding: SPACING.xl, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  modalTitle: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: FONTS.weights.bold },
  daySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.lg },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
  dayChipTextActive: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  timeRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  timePickerContainer: { flex: 1 },
  timeBox: { backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  cancelBtn: { padding: SPACING.md, borderRadius: RADIUS.sm },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: FONTS.weights.bold },
  saveBtn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.sm, minWidth: 100, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
});
