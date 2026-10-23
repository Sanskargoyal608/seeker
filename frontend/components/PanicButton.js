import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { userPanic } from '../api/core';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import CrisisSupportModal from './CrisisSupportModal';

/**
 * The always-available "Crisis" button.
 *
 * Tapping it opens help straight away, with phone numbers and no network wait and
 * no confirmation question. Telling our support team is a separate, explicit tap,
 * so an accidental press does not page anyone.
 */
export default function PanicButton() {
  const [open, setOpen] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const [support, setSupport] = useState(null); // {message, helplines} from the server
  const [failed, setFailed] = useState(false);

  const alertTeam = async () => {
    setAlerting(true);
    setFailed(false);
    try {
      const data = await userPanic();
      setSupport(data);
      setAlerted(true);
    } catch (e) {
      setFailed(true);
    } finally {
      setAlerting(false);
    }
  };

  const message = failed
    ? 'We could not reach our support team just now. Please call one of the numbers below, or 112 if you are in danger.'
    : support?.message;

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.panicBtn, pressed && styles.btnPressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="I need urgent help"
      >
        <Text style={styles.panicText}>Crisis</Text>
      </Pressable>

      <CrisisSupportModal
        visible={open}
        onClose={() => { setOpen(false); setFailed(false); }}
        message={message}
        helplines={support?.helplines}
        alerted={alerted}
        alerting={alerting}
        onAlert={alertTeam}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  panicBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
