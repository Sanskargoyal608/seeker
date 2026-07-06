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
          <Text style={styles.panicText}>🚨 PANIC</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  panicBtn: {
    backgroundColor: COLORS.error,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  panicText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.heavy,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  btnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
});
