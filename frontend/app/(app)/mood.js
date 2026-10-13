import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/axios';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const MOODS = [
  { key: 'great', emoji: '😄', label: 'Great', color: '#4CAF50' },
  { key: 'good', emoji: '🙂', label: 'Good', color: '#8BC34A' },
  { key: 'okay', emoji: '😐', label: 'Okay', color: '#FFC107' },
  { key: 'low', emoji: '😔', label: 'Low', color: '#FF9800' },
  { key: 'bad', emoji: '😢', label: 'Bad', color: '#F44336' },
];

export default function MoodScreen() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await apiClient.get('/api/core/mood/');
      setHistory(data);
    } catch (e) {
      console.log('Failed to fetch mood history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) {
      Alert.alert('Select Mood', 'Please select how you are feeling.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/core/mood/', { mood: selectedMood, note: note.trim() });
      setSubmitted(true);
      setSelectedMood(null);
      setNote('');
      fetchHistory();
    } catch (e) {
      Alert.alert('Error', 'Failed to save mood entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMoodEmoji = (mood) => MOODS.find(m => m.key === mood)?.emoji || '❓';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Mood Check-in</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {submitted ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.statusAvailable || '#4CAF50'} />
            <Text style={styles.successTitle}>Mood Recorded!</Text>
            <Text style={styles.successText}>Keep tracking daily for better insights.</Text>
            <Pressable style={styles.anotherBtn} onPress={() => setSubmitted(false)}>
              <Text style={styles.anotherBtnText}>Log Another</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.question}>How are you feeling right now?</Text>
            <View style={styles.moodGrid}>
              {MOODS.map(mood => (
                <Pressable
                  key={mood.key}
                  style={[styles.moodItem, selectedMood === mood.key && { borderColor: mood.color, borderWidth: 3, backgroundColor: mood.color + '15' }]}
                  onPress={() => setSelectedMood(mood.key)}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodLabel, selectedMood === mood.key && { color: mood.color, fontWeight: '700' }]}>{mood.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.noteLabel}>Want to add a note? (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What's on your mind..."
              placeholderTextColor={COLORS.outline}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />

            <Pressable style={[styles.submitBtn, !selectedMood && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!selectedMood || submitting}>
              {submitting ? <ActivityIndicator color={COLORS.onPrimary} /> : <Text style={styles.submitBtnText}>Save Mood</Text>}
            </Pressable>
          </>
        )}

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Entries</Text>
          {loadingHistory ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No mood entries yet. Start tracking!</Text>
          ) : (
            history.slice(0, 10).map(entry => (
              <View key={entry.id} style={styles.historyItem}>
                <Text style={styles.historyEmoji}>{getMoodEmoji(entry.mood)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyMood}>{entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}</Text>
                  {entry.note ? <Text style={styles.historyNote} numberOfLines={2}>{entry.note}</Text> : null}
                </View>
                <Text style={styles.historyDate}>{new Date(entry.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg || 16, paddingVertical: SPACING.md || 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceVariant || '#e0e0e0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: FONTS.family.headline, fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  content: { padding: 24, paddingBottom: 80 },
  question: { fontFamily: FONTS.family.headline, fontSize: 24, fontWeight: '700', color: COLORS.onSurface, textAlign: 'center', marginBottom: 24 },
  moodGrid: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 32 },
  moodItem: {
    width: 80, height: 100, borderRadius: 20, backgroundColor: COLORS.surfaceContainerLowest || '#fff',
    borderWidth: 1, borderColor: COLORS.outlineVariant || '#ccc', justifyContent: 'center', alignItems: 'center',
  },
  moodEmoji: { fontSize: 36, marginBottom: 4 },
  moodLabel: { fontFamily: FONTS.family.body, fontSize: 12, color: COLORS.onSurfaceVariant },
  noteLabel: { fontFamily: FONTS.family.body, fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: 8 },
  noteInput: {
    backgroundColor: COLORS.surfaceContainerLowest || '#fff', borderWidth: 1, borderColor: COLORS.outlineVariant || '#ccc',
    borderRadius: 16, padding: 16, fontFamily: FONTS.family.body, fontSize: 14, color: COLORS.onSurface,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 40, alignItems: 'center', marginBottom: 40,
  },
  submitBtnText: { fontFamily: FONTS.family.body, fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
  successBox: { alignItems: 'center', paddingVertical: 40 },
  successTitle: { fontFamily: FONTS.family.headline, fontSize: 24, fontWeight: '700', color: COLORS.onSurface, marginTop: 16 },
  successText: { fontFamily: FONTS.family.body, fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 8, marginBottom: 24 },
  anotherBtn: { borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 40 },
  anotherBtnText: { fontFamily: FONTS.family.body, fontSize: 14, fontWeight: '600', color: COLORS.primary },
  historySection: { marginTop: 16 },
  historyTitle: { fontFamily: FONTS.family.headline, fontSize: 18, fontWeight: '600', color: COLORS.onSurface, marginBottom: 16 },
  emptyText: { fontFamily: FONTS.family.body, fontSize: 14, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    backgroundColor: COLORS.surfaceContainerLowest || '#fff', borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.outlineVariant || '#e0e0e0',
  },
  historyEmoji: { fontSize: 28 },
  historyMood: { fontFamily: FONTS.family.body, fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  historyNote: { fontFamily: FONTS.family.body, fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  historyDate: { fontFamily: FONTS.family.body, fontSize: 12, color: COLORS.outline },
});
