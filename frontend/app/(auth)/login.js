// frontend/app/(auth)/login.js
// Login screen — email + password, navigates to dashboard on success
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useDispatch } from 'react-redux';
import { setTokens, setUser } from '../../store/authSlice';
import { login, getErrorMessage } from '../../api/auth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await login(email.trim().toLowerCase(), password);

      // Persist tokens
      await SecureStore.setItemAsync('access_token', data.access);
      await SecureStore.setItemAsync('refresh_token', data.refresh);

      // Update Redux
      dispatch(setTokens(data));
      dispatch(setUser(data.user));

      router.replace('/(app)/dashboard');
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
        {/* Hero gradient blob */}
        <LinearGradient
          colors={['rgba(108,99,255,0.3)', 'transparent']}
          style={styles.heroBg}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.logo}>🌿</Text>
          <Text style={styles.brand}>Seeker</Text>
          <Text style={styles.tagline}>Mental wellness, within reach</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your journey</Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Your password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Login button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [styles.btnWrap, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Log in"
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
                <Text style={styles.btnText}>Log in</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register link */}
          <Pressable
            onPress={() => router.push('/(auth)/request-otp')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Create new account"
          >
            <Text style={styles.secondaryBtnText}>Create new account</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Seeker Mental Wellness Platform · v1.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: { fontSize: 48, marginBottom: 8 },
  brand: {
    color: COLORS.text,
    fontSize: FONTS.sizes.h1,
    fontWeight: FONTS.weights.heavy,
    letterSpacing: -1,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.h3,
    fontWeight: FONTS.weights.bold,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    marginTop: -SPACING.sm,
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
  },
  fieldGroup: { gap: 6 },
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
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderLeftWidth: 0,
    borderTopRightRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
  },
  footer: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
