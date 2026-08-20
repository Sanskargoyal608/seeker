import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const MOCK_ON_CALL_THERAPISTS = [
  { id: '1', name: 'Dr. Michael Vance', role: 'Licensed Clinical Psychologist', available: true },
  { id: '2', name: 'Sarah Sterling, LCSW', role: 'Crisis Specialist', available: true },
  { id: '3', name: 'Dr. Emily Chen', role: 'Trauma Specialist', available: false },
];

export default function EscalationScreen() {
  const router = useRouter();
  const [urgency, setUrgency] = useState('Medium');
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTherapist) {
      Alert.alert('Error', 'Please select a therapist for handover.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for escalation.');
      return;
    }

    setLoading(true);
    try {
      // Mock API call to create EscalationRequest
      // In reality, this would hit /api/core/escalate/
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert(
        'Escalation Initiated',
        `Clinical handover request sent to ${MOCK_ON_CALL_THERAPISTS.find(t => t.id === selectedTherapist)?.name}. They will join the session shortly.`,
        [{ text: 'Return to Chat', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to escalate session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Clinical Handover</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Case Summary (Mocked Data) */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Case Details</Text>
          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>Client:</Text>
             <Text style={styles.detailValue}>Anonymous User #402</Text>
          </View>
          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>Duration:</Text>
             <Text style={styles.detailValue}>14m 32s</Text>
          </View>
          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>Primary Concern:</Text>
             <Text style={styles.detailValue}>Severe Panic Attack (AI Flagged)</Text>
          </View>
        </View>

        {/* Urgency Level */}
        <Text style={styles.label}>Select Urgency Level</Text>
        <View style={styles.urgencyRow}>
           {['Medium', 'High', 'Critical'].map((level) => {
             const isSelected = urgency === level;
             let bgColor = COLORS.surfaceContainer;
             let color = COLORS.onSurfaceVariant;
             if (isSelected) {
               if (level === 'Medium') { bgColor = '#FEF3C7'; color = '#D97706'; } // Amber
               if (level === 'High') { bgColor = '#FEE2E2'; color = '#DC2626'; } // Red
               if (level === 'Critical') { bgColor = '#7F1D1D'; color = '#FFFFFF'; } // Dark Red
             }

             return (
               <Pressable 
                 key={level} 
                 style={[styles.urgencyBtn, { backgroundColor: bgColor, borderColor: isSelected ? 'transparent' : COLORS.outlineVariant }]}
                 onPress={() => setUrgency(level)}
               >
                 <Text style={[styles.urgencyText, { color }]}>{level}</Text>
               </Pressable>
             );
           })}
        </View>

        {/* Therapist Selection */}
        <Text style={styles.label}>On-Call Therapists</Text>
        {MOCK_ON_CALL_THERAPISTS.map((therapist) => (
          <Pressable 
            key={therapist.id} 
            style={[
              styles.therapistCard, 
              selectedTherapist === therapist.id && styles.therapistCardSelected,
              !therapist.available && { opacity: 0.5 }
            ]}
            onPress={() => therapist.available && setSelectedTherapist(therapist.id)}
            disabled={!therapist.available}
          >
            <View style={styles.therapistInfo}>
               <View style={styles.avatarWrap}>
                  <Text style={styles.avatarInitial}>{therapist.name[0]}</Text>
                  {therapist.available && <View style={styles.onlineDot} />}
               </View>
               <View>
                 <Text style={styles.tName}>{therapist.name}</Text>
                 <Text style={styles.tRole}>{therapist.role}</Text>
               </View>
            </View>
            <Ionicons 
               name={selectedTherapist === therapist.id ? "radio-button-on" : "radio-button-off"} 
               size={24} 
               color={selectedTherapist === therapist.id ? COLORS.primary : COLORS.outlineVariant} 
            />
          </Pressable>
        ))}

        {/* Reason */}
        <Text style={styles.label}>Reason for Escalation</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Briefly describe why this case requires a licensed therapist..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          value={reason}
          onChangeText={setReason}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
         <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>Escalate Session</Text>
            )}
         </Pressable>
      </View>
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
  summaryCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    width: 120,
    fontSize: FONTS.sizes.sm,
    color: COLORS.onSurfaceVariant,
  },
  detailValue: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.onSurface,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  urgencyBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  therapistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.sm,
  },
  therapistCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFixed,
  },
  therapistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarInitial: {
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSecondaryContainer,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.statusAvailable,
    borderWidth: 2,
    borderColor: COLORS.surfaceContainerLowest,
  },
  tName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.onSurface,
  },
  tRole: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.onSurfaceVariant,
  },
  textArea: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    fontSize: FONTS.sizes.md,
    color: COLORS.onSurface,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  submitBtn: {
    backgroundColor: '#DC2626', // Red for escalation
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  }
});
