// frontend/app/(auth)/request-otp.js
// Step 1 of registration: Enter email + select role → receive OTP
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { setRegistrationFlow } from '../../store/authSlice';
import { requestOTP, getErrorMessage } from '../../api/auth';
import RoleSelector from '../../components/RoleSelector';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export default function RequestOTPScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('GENERAL_USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await requestOTP(trimmedEmail, role);

      // Store in Redux for next screens
      dispatch(setRegistrationFlow({ email: trimmedEmail, role }));

      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: trimmedEmail, role },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top gradient */}
        <LinearGradient
          colors={['rgba(0,212,170,0.2)', 'transparent']}
          style={styles.heroBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepBadge}>Step 1 of 3</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            We'll send a one-time code to your email to verify your identity.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Role */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>I am a</Text>
            <RoleSelector value={role} onChange={setRole} />
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRequestOTP}
            />
          </View>

          {/* Info note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📬 A 6-digit code will be sent to this email. It expires in{' '}
              <Text style={styles.infoHighlight}>10 minutes</Text>.
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit button */}
          <Pressable
            onPress={handleRequestOTP}
            disabled={loading}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Send OTP"
          >
            <LinearGradient
              colors={COLORS.gradientAccent}
              style={styles.btn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnText}>Send verification code →</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: 60,
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 300,
    height: 300,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.xl,
    padding: SPACING.xs,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
  },
  header: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  stepBadge: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.h2,
    fontWeight: FONTS.weights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  fieldGroup: { gap: 8 },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    padding: SPACING.md,
  },
  infoBox: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
  },
  infoHighlight: {
    color: COLORS.accent,
    fontWeight: FONTS.weights.semibold,
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm },
  btnWrap: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: {
    padding: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
  },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: FONTS.weights.bold,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  loginText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  loginLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
  },
});
