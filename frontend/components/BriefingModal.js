import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getSessionIntake } from '../api/core';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

/**
 * Shows a clinician the AI-assisted intake briefing for a session. Clinicians only:
 * the server refuses anyone else. The briefing is a starting point, not a diagnosis.
 */
export default function BriefingModal({ sessionId, onClose }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    getSessionIntake(sessionId)
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((e) => !cancelled && setState({
        loading: false, data: null,
        error: e.response?.status === 404 ? 'There is no briefing for this session.' : 'Could not load the briefing.',
      }));
    return () => { cancelled = true; };
  }, [sessionId]);

  const { loading, data, error } = state;
  const conditions = data?.provisional_conditions || [];
  const text = data?.intake_dossier
    || (data?.responses_json ? Object.entries(data.responses_json).map(([k, v]) => `${k}: ${v}`).join('\n') : null);

  return (
    <Modal visible={!!sessionId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Intake briefing</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {loading ? <ActivityIndicator color={COLORS.primary} style={{ margin: SPACING.lg }} /> : null}
            {error ? <Text style={styles.body}>{error}</Text> : null}
            {text ? <Text style={styles.body}>{text}</Text> : null}
            {conditions.length > 0 ? (
              <Text style={[styles.body, { marginTop: SPACING.md }]}>
                Provisional (AI, unconfirmed): {conditions.join(', ')}
              </Text>
            ) : null}
          </ScrollView>
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  sheet: { width: '100%', maxWidth: 560, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  body: { fontSize: 15, lineHeight: 22, color: '#222' },
  close: { marginTop: SPACING.md, alignItems: 'center', paddingVertical: 10 },
  closeText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
});
