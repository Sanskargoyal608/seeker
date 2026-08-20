import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { userPanic } from '../api/core';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function PanicButton() {
  const [loading, setLoading] = useState(false);

  const handlePanic = () => {
    Alert.alert(
      '🚨 Panic Button',
      'This will alert administrators and your emergency contacts immediately. Are you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Alert Now',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await userPanic();
              Alert.alert('Help is on the way', 'Administrators and emergency contacts have been notified. Stay safe.');
            } catch (error) {
              Alert.alert('Error', 'Failed to trigger panic alert. Please call emergency services directly.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.panicBtn, pressed && styles.btnPressed]}
        onPress={handlePanic}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.panicText}>Crisis</Text>
        )}
      </Pressable>
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
