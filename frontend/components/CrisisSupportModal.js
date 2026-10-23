import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

// Shown when the server cannot be reached, so a person in crisis never sees an empty screen.
export const FALLBACK_HELPLINES = [
  { name: 'Emergency services', phone: '112', is_24_7: true, description: 'National emergency number.' },
  { name: 'Tele-MANAS', phone: '14416', is_24_7: true, description: 'Free 24x7 mental health support.' },
];

const callNumber = (phone) => {
  const digits = String(phone).replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${digits}`).catch(() => {});
};

/**
 * A calm full-screen sheet with real phone numbers. Works on native and web
 * (it is a Modal, not Alert.alert, which does nothing in browsers).
 *
 * Props:
 *  visible, onClose
 *  message        text under the title
 *  helplines      [{name, phone, description, is_24_7}] (falls back to a built-in minimum)
 *  alerted        true once our support team has been told
 *  alerting       true while the request is in flight
 *  onAlert        optional; shows a button that tells our support team
 */
export default function CrisisSupportModal({
  visible, onClose, message, helplines, alerted = false, alerting = false, onAlert,
}) {
  const lines = helplines && helplines.length ? helplines : FALLBACK_HELPLINES;
  const body = message || 'You are not alone. If you are in immediate danger, please call 112 now.';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title} accessibilityRole="header">You matter. Help is available.</Text>
            <Text style={styles.message}>{body}</Text>

            {lines.map((h) => (
              <Pressable
                key={`${h.name}-${h.phone}`}
                style={({ pressed }) => [styles.line, pressed && { opacity: 0.85 }]}
                onPress={() => callNumber(h.phone)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${h.name} on ${h.phone}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{h.name}{h.is_24_7 ? '  ·  24x7' : ''}</Text>
                  {h.description ? <Text style={styles.lineDesc}>{h.description}</Text> : null}
                </View>
                <Text style={styles.linePhone}>{h.phone}</Text>
              </Pressable>
            ))}

            {onAlert && !alerted ? (
              <Pressable
                style={[styles.alertBtn, alerting && { opacity: 0.7 }]}
                onPress={onAlert}
                disabled={alerting}
                accessibilityRole="button"
              >
                {alerting
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.alertBtnText}>Tell our support team I need help</Text>}
              </Pressable>
            ) : null}
            {alerted ? (
              <Text style={styles.alerted}>Our support team has been told.</Text>
            ) : null}

            <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl || 24, borderTopRightRadius: RADIUS.xl || 24,
    ...(Platform.OS === 'web' ? { marginBottom: 'auto', marginTop: 'auto', borderRadius: 24 } : null),
  },
  content: { padding: SPACING.lg },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  message: { fontSize: 16, lineHeight: 24, color: COLORS.onSurface || '#222', marginBottom: SPACING.md },
  line: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg || 16, backgroundColor: '#FDECEA', borderWidth: 1, borderColor: '#F5C6C2',
  },
  lineName: { fontSize: 16, fontWeight: '600', color: '#222' },
  lineDesc: { fontSize: 13, color: '#555', marginTop: 2 },
  linePhone: { fontSize: 20, fontWeight: '700', color: COLORS.error, marginLeft: SPACING.md },
  alertBtn: {
    marginTop: SPACING.md, backgroundColor: COLORS.error, paddingVertical: 14,
    borderRadius: RADIUS.full, alignItems: 'center',
  },
  alertBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  alerted: { marginTop: SPACING.md, textAlign: 'center', fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  closeBtn: { marginTop: SPACING.md, paddingVertical: 12, alignItems: 'center' },
  closeText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
});
