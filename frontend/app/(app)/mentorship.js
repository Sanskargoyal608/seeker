import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import BottomNav from '../../components/BottomNav';

export default function MentorshipScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sopModalVisible, setSopModalVisible] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState(null);
  const [selectedTherapistName, setSelectedTherapistName] = useState('');
  const [sopText, setSopText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApply = async () => {
    if (!sopText.trim()) {
      Alert.alert('Required', 'Please write your statement of purpose.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/core/mentorship/', {
        therapist_id: selectedTherapistId,
        sop_message: sopText.trim(),
      });
      Alert.alert('Success', 'Your mentorship request has been sent!');
      setSopModalVisible(false);
      setSopText('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTherapists = async (query = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/profiles/therapists/search/', { params: { q: query || '*' } });
      // The API returns { hits: [{ document: { id, name, modalities, languages, ... } }, ...] } or similar. 
      // If it's returning standard Typesense, it's data.hits. If BudgetCounselorSearchView format, data.therapists.
      // Let's support both just in case.
      const results = data.hits ? data.hits.map(h => h.document) : (data.therapists || []);
      setTherapists(results);
    } catch (error) {
      console.log('Error fetching therapists:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTherapists(search);
    }, [search])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Licensed Therapists</Text>
        <Pressable style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={COLORS.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Mentorship Call to Action */}
        <View style={styles.heroCard}>
           <Text style={styles.heroTitle}>Discover Your Mentor</Text>
           <Text style={styles.heroText}>
             Connect with experienced Licensed Therapists to guide your clinical practicum, discuss complex cases, and advance your career.
           </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by specialty (e.g. CBT, EMDR)..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <Text style={styles.sectionTitle}>Available for Mentorship</Text>

        {/* Therapists List */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : (
          therapists.length > 0 ? therapists.map((therapist, index) => {
            const doc = therapist;
            // Handle different ID structures
            const id = doc.id || doc.user_id || index;
            const name = doc.name || doc.first_name + ' ' + doc.last_name || 'Therapist';
            const specialties = doc.modalities || [];
            
            return (
              <View key={id} style={styles.therapistCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: COLORS.primaryFixed, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 24, color: COLORS.onPrimaryFixed, fontWeight: 'bold' }}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.infoWrap}>
                     <Text style={styles.nameText}>{name}</Text>
                     <Text style={styles.expText}>Licensed Professional</Text>
                  </View>
                </View>

                <View style={styles.specialtiesWrap}>
                   {specialties.slice(0, 3).map(spec => (
                     <View key={spec} style={styles.chip}>
                        <Text style={styles.chipText}>{spec}</Text>
                     </View>
                   ))}
                </View>

                <View style={styles.actionRow}>
                   <Pressable 
                      style={styles.viewBtn} 
                      onPress={() => router.push(`/(app)/public-profile?slug=${doc.slug || id}`)}
                   >
                      <Text style={styles.viewBtnText}>View Profile</Text>
                   </Pressable>
                   <Pressable 
                      style={styles.applyBtn}
                      onPress={() => {
                        setSelectedTherapistId(id);
                        setSelectedTherapistName(name);
                        setSopModalVisible(true);
                      }}
                   >
                      <Text style={styles.applyBtnText}>Apply for Mentorship</Text>
                   </Pressable>
                </View>
              </View>
            );
          }) : (
            <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.lg }}>
              No therapists found.
            </Text>
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={sopModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for Mentorship</Text>
            <Text style={styles.modalSub}>Applying to {selectedTherapistName}</Text>
            <Text style={styles.modalLabel}>Statement of Purpose</Text>
            <Text style={styles.modalHint}>Explain why this therapist should mentor you. Include your background, goals, and what you hope to learn.</Text>
            <TextInput
              style={styles.sopInput}
              placeholder="Write your statement of purpose..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              value={sopText}
              onChangeText={setSopText}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setSopModalVisible(false); setSopText(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.submitSopBtn, !sopText.trim() && { opacity: 0.5 }]} onPress={handleApply} disabled={submitting || !sopText.trim()}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitSopText}>Submit Application</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav />
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  filterBtn: {
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.full,
  },
  container: {
    padding: SPACING.lg,
  },
  heroCard: {
    backgroundColor: COLORS.primaryFixed,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onPrimaryFixed,
    marginBottom: SPACING.sm,
  },
  heroText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.onPrimaryFixedVariant,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  matchBtn: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  matchBtnText: {
    color: COLORS.onPrimary,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.lg,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.onSurface,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  therapistCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surfaceContainer,
  },
  infoWrap: {
    marginLeft: SPACING.md,
    justifyContent: 'center',
    flex: 1,
  },
  nameText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  expText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
    marginLeft: 4,
    fontWeight: FONTS.weights.medium,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  chipText: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  viewBtnText: {
    color: COLORS.onSurface,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  applyBtnText: {
    color: COLORS.onPrimary,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surfaceContainerLowest || '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  modalSub: { fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.onSurface, marginBottom: 4 },
  modalHint: { fontSize: 12, color: COLORS.onSurfaceVariant, marginBottom: 12, lineHeight: 18 },
  sopInput: { backgroundColor: COLORS.background || '#f5f5f5', borderWidth: 1, borderColor: COLORS.outlineVariant || '#ccc', borderRadius: 16, padding: 16, fontSize: 14, color: COLORS.onSurface, minHeight: 140, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  modalCancelText: { color: COLORS.onSurfaceVariant, fontWeight: '600' },
  submitSopBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 40 },
  submitSopText: { color: COLORS.onPrimary, fontWeight: '700' },
});
