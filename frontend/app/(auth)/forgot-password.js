// frontend/app/(auth)/forgot-password.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import api from '../../api/axios';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = request, 2 = reset
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/accounts/auth/forgot-password/request/', { email });
      setStep(2);
      Alert.alert('OTP Sent', 'If the email exists, an OTP has been sent to your inbox.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/accounts/auth/forgot-password/reset/', {
        email,
        otp,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Your password has been reset successfully.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? "Enter your email to receive a reset OTP." : "Enter the OTP sent to your email and your new password."}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={step === 1}
          />
        </View>

        {step === 2 && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
          </>
        )}

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={step === 1 ? handleRequestOTP : handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.btnText}>{step === 1 ? 'Send OTP' : 'Reset Password'}</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkText}>Back to Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  title: { fontSize: FONTS.sizes.h2, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: FONTS.sizes.body, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  inputContainer: { marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs, fontWeight: FONTS.weights.medium },
  input: { backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.body },
  btn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md },
  btnPressed: { opacity: 0.8 },
  btnText: { color: COLORS.white, fontSize: FONTS.sizes.bodyLg, fontWeight: FONTS.weights.bold },
  linkBtn: { marginTop: SPACING.xl, alignItems: 'center' },
  linkText: { color: COLORS.textLink, fontSize: FONTS.sizes.body, fontWeight: FONTS.weights.semibold },
});
