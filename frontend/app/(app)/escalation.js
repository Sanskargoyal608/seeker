import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/axios';

export default function EscalationScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams();
  const [therapists, setTherapists] = useState([]);
  const [urgency, setUrgency] = useState('Medium');
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);

  React.useEffect(() => {
    apiClient.get('/api/core/therapists/')
      .then(res => setTherapists(res.data))
      .catch(e => console.log('Failed to fetch therapists', e));
    if (session_id) {
       apiClient.get(`/api/core/sessions/${session_id}/`)
         .then(res => setSessionDetails(res.data))
         .catch(e => console.log('Failed to fetch session', e));
    }
  }, [session_id]);

  const handleSubmit = async () => {
    if (!selectedTherapist) {
      Alert.alert('Error', 'Please select a therapist for handover.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for escalation.');
      return;
    }
    if (!session_id) {
      Alert.alert('Error', 'No session ID found.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/core/escalate/', { session_id, therapist_id: selectedTherapist, urgency, reason });
      const therapistName = therapists.find(t => t.id === selectedTherapist)?.user?.first_name || 'the selected therapist';
      Alert.alert(
        'Escalation Initiated',
        `Clinical handover request sent to ${therapistName}. They will join the session shortly.`,
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
        
        {/* Case Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Case Details</Text>
          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>Client:</Text>
             <Text style={styles.detailValue}>{sessionDetails?.user_name || `Anonymous User #${sessionDetails?.user || session_id || 'Unknown'}`}</Text>
          </View>
          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>Duration:</Text>
             <Text style={styles.detailValue}>{sessionDetails?.duration_minutes || '0'}m</Text>
          </View>
          <View style={styles.detailRow}>
             <Text style={styles.detailLabel}>Primary Concern:</Text>
             <Text style={styles.detailValue}>{sessionDetails?.is_crisis_flagged ? 'Crisis Flagged' : 'General'}</Text>
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
        {therapists.map((therapist) => {
          const isAvailable = true; // Replace with therapist availability logic if any
          return (
          <Pressable 
            key={therapist.id} 
            style={[
              styles.therapistCard, 
              selectedTherapist === therapist.id && styles.therapistCardSelected,
              !isAvailable && { opacity: 0.5 }
            ]}
            onPress={() => isAvailable && setSelectedTherapist(therapist.id)}
            disabled={!isAvailable}
          >
            <View style={styles.therapistInfo}>
               <View style={styles.avatarWrap}>
                  <Text style={styles.avatarInitial}>{therapist.user?.first_name?.[0] || 'T'}</Text>
                  {isAvailable && <View style={styles.onlineDot} />}
               </View>
               <View>
                 <Text style={styles.tName}>{therapist.user?.first_name} {therapist.user?.last_name}</Text>
                 <Text style={styles.tRole}>{therapist.modalities?.join(', ') || 'Licensed Therapist'}</Text>
               </View>
            </View>
            <Ionicons 
               name={selectedTherapist === therapist.id ? "radio-button-on" : "radio-button-off"} 
               size={24} 
               color={selectedTherapist === therapist.id ? COLORS.primary : COLORS.outlineVariant} 
            />
          </Pressable>
          );
        })}

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
