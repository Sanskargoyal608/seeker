// frontend/components/RoleSelector.js
// Role selection pill buttons for the registration flow
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const ROLES = [
  {
    value: 'GENERAL_USER',
    label: 'User',
    subtitle: 'Seeking support',
    emoji: '🌱',
  },
  {
    value: 'COUNSELOR',
    label: 'Counselor',
    subtitle: 'Graduate counselor',
    emoji: '🎓',
  },
  {
    value: 'THERAPIST',
    label: 'Therapist',
    subtitle: 'Licensed therapist',
    emoji: '🏥',
  },
];

const RoleSelector = ({ value, onChange }) => {
  return (
    <View style={styles.container}>
      {ROLES.map((role) => {
        const isSelected = value === role.value;
        return (
          <Pressable
            key={role.value}
            onPress={() => onChange(role.value)}
            style={({ pressed }) => [
              styles.card,
              isSelected && styles.cardSelected,
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${role.label}: ${role.subtitle}`}
          >
            {isSelected && (
              <LinearGradient
                colors={['rgba(108,99,255,0.2)', 'rgba(0,212,170,0.1)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}

            <Text style={styles.emoji}>{role.emoji}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {role.label}
            </Text>
            <Text style={styles.subtitle}>{role.subtitle}</Text>

            {isSelected && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 100,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: COLORS.primary,
  },
  cardPressed: {
    opacity: 0.8,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    textAlign: 'center',
  },
  labelSelected: {
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    marginTop: 2,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
  },
});

export default RoleSelector;
