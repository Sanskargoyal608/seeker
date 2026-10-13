// frontend/app/(auth)/_layout.js
import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

export default function AuthLayout() {
  const { isDesktop } = useResponsive();

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop && (
        <View style={styles.brandPanel}>
          <View style={styles.brandContent}>
            <Ionicons name="leaf" size={64} color={COLORS.onPrimary} style={{ marginBottom: 16 }} />
            <Text style={styles.brandTitle}>Seeker</Text>
            <Text style={styles.brandTagline}>Connect with counselors and therapists for mental health support.</Text>
          </View>
        </View>
      )}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <View style={{ width: '100%', maxWidth: isDesktop ? 450 : '100%', flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandPanel: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContent: {
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
  },
  brandTitle: {
    fontFamily: FONTS.family.headline,
    fontWeight: FONTS.weights.bold,
    fontSize: 48,
    color: COLORS.onPrimary,
    marginBottom: 16,
  },
  brandTagline: {
    fontFamily: FONTS.family.body,
    fontWeight: FONTS.weights.medium,
    fontSize: 18,
    color: COLORS.onPrimary,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 26,
  }
});
