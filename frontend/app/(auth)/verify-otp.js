// frontend/app/(auth)/verify-otp.js
// Step 2 of registration: Enter 6-digit OTP received by email
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { setRegistrationFlow } from '../../store/authSlice';
import { verifyOTP, requestOTP, getErrorMessage } from '../../api/auth';
import OTPInput from '../../components/OTPInput';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOTPScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { email, role } = useLocalSearchParams();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  // Shake animation for error
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      shake();
      return;
    }
    setError('');
    setLoading(true);

    try {
      await verifyOTP(email, otp);

      setSuccess(true);
      dispatch(setRegistrationFlow({ email, role, otpVerified: true }));

      // Brief success state then navigate
      setTimeout(() => {
        router.push({
          pathname: '/(auth)/register',
          params: { email, role },
        });
      }, 800);
    } catch (err) {
      setOtp('');
      setError(getErrorMessage(err));
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      await requestOTP(email, role);
      setResendCooldown(RESEND_COOLDOWN);
      setOtp('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Background blob */}
      <LinearGradient
        colors={['rgba(108,99,255,0.15)', 'transparent']}
        style={styles.heroBg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Back */}
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepBadge}>Step 2 of 3</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>
      </View>

      {/* OTP Box */}
      <View style={styles.card}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <OTPInput value={otp} onChange={setOtp} disabled={loading || success} />
        </Animated.View>

        {/* Status */}
        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ OTP verified! Redirecting…</Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Verify button */}
        <Pressable
          onPress={handleVerify}
          disabled={loading || success || otp.length < 6}
          style={({ pressed }) => [
            styles.btnWrap,
            (loading || success || otp.length < 6) && { opacity: 0.6 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Verify OTP"
        >
          <LinearGradient
            colors={COLORS.gradientPrimary}
            style={styles.btn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Verify code →</Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive it? </Text>
          <Pressable
            onPress={handleResend}
            disabled={resendCooldown > 0 || resending}
            accessibilityLabel={
              resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'
            }
          >
            <Text
              style={[
                styles.resendLink,
                (resendCooldown > 0 || resending) && styles.resendLinkDisabled,
              ]}
            >
              {resending
                ? 'Sending…'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend code'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          💡 Check spam/junk if you don't see it. The code is valid for 10 minutes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: 60,
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.xl, padding: SPACING.xs },
  backBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  header: { gap: SPACING.sm, marginBottom: SPACING.xl },
  stepBadge: {
    color: COLORS.primary,
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
  emailHighlight: {
    color: COLORS.text,
    fontWeight: FONTS.weights.semibold,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  successBox: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success,
    alignItems: 'center',
  },
  successText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
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
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  resendLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
  },
  resendLinkDisabled: { color: COLORS.textMuted },
  hint: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
