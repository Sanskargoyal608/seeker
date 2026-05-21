// frontend/app/(auth)/register.js
// Step 3 of registration: Role-aware form (General User / Counselor / Therapist)
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch } from 'react-redux';
import { setTokens, setUser, clearRegistrationFlow } from '../../store/authSlice';
import {
  registerGeneralUser,
  registerCounselor,
  registerTherapist,
  getErrorMessage,
} from '../../api/auth';
import EmergencyContactForm from '../../components/EmergencyContactForm';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const ROLE_META = {
  GENERAL_USER: {
    label: 'User',
    emoji: '🌱',
    description: 'Create your personal wellness account',
  },
  COUNSELOR: {
    label: 'Graduate Counselor',
    emoji: '🎓',
    description: 'Your account requires admin verification',
  },
  THERAPIST: {
    label: 'Licensed Therapist',
    emoji: '🏥',
    description: 'Your license will be reviewed by our team',
  },
};

const MODALITY_OPTIONS = ['CBT', 'DBT', 'EMDR', 'ACT', 'Psychodynamic', 'Humanistic', 'Mindfulness'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'];

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { email, role } = useLocalSearchParams();
  const meta = ROLE_META[role] || ROLE_META.GENERAL_USER;

  // Common fields
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // General User
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: '', phone: '', relationship: '' },
    { name: '', phone: '', relationship: '' },
  ]);

  // Counselor specific
  const [university, setUniversity] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [perMinuteRate, setPerMinuteRate] = useState('');
  const [bio, setBio] = useState('');
  const [degreeFile, setDegreeFile] = useState(null);
  const [certFile, setCertFile] = useState(null);

  // Therapist specific
  const [licenseNumber, setLicenseNumber] = useState('');
  const [selectedModalities, setSelectedModalities] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [perSessionRate, setPerSessionRate] = useState('');
  const [twoFactorPhone, setTwoFactorPhone] = useState('');
  const [licenseFile, setLicenseFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── File pickers ─────────────────────────────────────────────────

  const pickFile = async (setter, label) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setter(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', `Failed to pick ${label}. Please try again.`);
    }
  };

  // ── Toggle helpers ────────────────────────────────────────────────

  const toggleModality = (m) => {
    setSelectedModalities((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const toggleLanguage = (l) => {
    setSelectedLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  };

  // ── Validation ────────────────────────────────────────────────────

  const validate = () => {
    if (!username.trim()) return 'Username is required.';
    if (!firstName.trim()) return 'First name is required.';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';

    if (role === 'GENERAL_USER') {
      const valid = emergencyContacts.every(
        (c) => c.name.trim() && c.phone.trim() && c.relationship.trim()
      );
      if (!valid) return 'Please complete all emergency contact fields.';
      if (emergencyContacts.length < 2) return 'At least 2 emergency contacts required.';
    }

    if (role === 'COUNSELOR') {
      if (!university.trim()) return 'University is required.';
      if (!graduationYear || isNaN(graduationYear)) return 'Valid graduation year required.';
      if (!specialization.trim()) return 'Specialization is required.';
      if (!perMinuteRate || isNaN(perMinuteRate)) return 'Valid per-minute rate required.';
    }

    if (role === 'THERAPIST') {
      if (!licenseNumber.trim()) return 'License number is required.';
      if (selectedModalities.length === 0) return 'Select at least one therapy modality.';
      if (!perMinuteRate || isNaN(perMinuteRate)) return 'Valid per-minute rate required.';
      if (!perSessionRate || isNaN(perSessionRate)) return 'Valid per-session rate required.';
    }

    return null;
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);

    try {
      let data;

      if (role === 'GENERAL_USER') {
        data = await registerGeneralUser({
          email,
          username: username.trim(),
          password,
          password_confirm: confirmPassword,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          emergency_contacts: emergencyContacts,
        });
      } else if (role === 'COUNSELOR') {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('username', username.trim());
        formData.append('password', password);
        formData.append('password_confirm', confirmPassword);
        formData.append('first_name', firstName.trim());
        formData.append('last_name', lastName.trim());
        formData.append('phone', phone.trim());
        formData.append('university', university.trim());
        formData.append('graduation_year', graduationYear);
        formData.append('specialization', specialization.trim());
        formData.append('years_experience', yearsExperience || '0');
        formData.append('per_minute_rate', perMinuteRate);
        formData.append('bio', bio.trim());

        if (degreeFile) {
          formData.append('degree_file', {
            uri: degreeFile.uri,
            name: degreeFile.name,
            type: degreeFile.mimeType || 'application/pdf',
          });
        }
        if (certFile) {
          formData.append('graduation_certificate', {
            uri: certFile.uri,
            name: certFile.name,
            type: certFile.mimeType || 'application/pdf',
          });
        }

        data = await registerCounselor(formData);
      } else if (role === 'THERAPIST') {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('username', username.trim());
        formData.append('password', password);
        formData.append('password_confirm', confirmPassword);
        formData.append('first_name', firstName.trim());
        formData.append('last_name', lastName.trim());
        formData.append('phone', phone.trim());
        formData.append('license_number', licenseNumber.trim());
        selectedModalities.forEach((m) => formData.append('modalities', m));
        selectedLanguages.forEach((l) => formData.append('languages', l));
        formData.append('per_minute_rate', perMinuteRate);
        formData.append('per_session_rate', perSessionRate);
        formData.append('bio', bio.trim());
        formData.append('two_factor_phone', twoFactorPhone.trim());

        if (licenseFile) {
          formData.append('license_file', {
            uri: licenseFile.uri,
            name: licenseFile.name,
            type: licenseFile.mimeType || 'application/pdf',
          });
        }

        data = await registerTherapist(formData);
      }

      // Persist tokens
      await SecureStore.setItemAsync('access_token', data.access);
      await SecureStore.setItemAsync('refresh_token', data.refresh);

      dispatch(setTokens(data));
      dispatch(setUser(data.user));
      dispatch(clearRegistrationFlow());

      router.replace('/(app)/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Pill toggle component ─────────────────────────────────────────

  const PillToggle = ({ items, selected, onToggle }) => (
    <View style={styles.pillRow}>
      {items.map((item) => (
        <Pressable
          key={item}
          onPress={() => onToggle(item)}
          style={[styles.pill, selected.includes(item) && styles.pillSelected]}
        >
          <Text style={[styles.pillText, selected.includes(item) && styles.pillTextSelected]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // ── File picker row ───────────────────────────────────────────────

  const FileRow = ({ file, onPick, label }) => (
    <Pressable
      onPress={onPick}
      style={({ pressed }) => [styles.fileBtn, pressed && { opacity: 0.7 }]}
      accessibilityLabel={`Pick ${label}`}
    >
      {file ? (
        <Text style={styles.fileBtnTextSuccess}>✅ {file.name}</Text>
      ) : (
        <Text style={styles.fileBtnText}>📎 Upload {label} (PDF or image)</Text>
      )}
    </Pressable>
  );

  // ── Render ────────────────────────────────────────────────────────

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
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepBadge}>Step 3 of 3</Text>
          <Text style={styles.title}>
            {meta.emoji} Complete your profile
          </Text>
          <Text style={styles.subtitle}>{meta.description}</Text>
        </View>

        {/* Email badge */}
        <View style={styles.emailBadge}>
          <Text style={styles.emailBadgeText}>✅ Verified: {email}</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Common Fields ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account details</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="johndoe"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.label}>First name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor={COLORS.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor={COLORS.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9876543210"
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Min. 8 characters"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* ── General User: Emergency Contacts ── */}
        {role === 'GENERAL_USER' && (
          <View style={styles.section}>
            <EmergencyContactForm
              contacts={emergencyContacts}
              onChange={setEmergencyContacts}
            />
          </View>
        )}

        {/* ── Counselor: Professional Info ── */}
        {role === 'COUNSELOR' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional information</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>University *</Text>
              <TextInput
                style={styles.input}
                placeholder="XYZ University"
                placeholderTextColor={COLORS.textMuted}
                value={university}
                onChangeText={setUniversity}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.label}>Graduation year *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2023"
                  placeholderTextColor={COLORS.textMuted}
                  value={graduationYear}
                  onChangeText={setGraduationYear}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.label}>Years experience</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor={COLORS.textMuted}
                  value={yearsExperience}
                  onChangeText={setYearsExperience}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Specialization *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Anxiety, Depression"
                placeholderTextColor={COLORS.textMuted}
                value={specialization}
                onChangeText={setSpecialization}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Rate per minute (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="2.50"
                placeholderTextColor={COLORS.textMuted}
                value={perMinuteRate}
                onChangeText={setPerMinuteRate}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of your background..."
                placeholderTextColor={COLORS.textMuted}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Degree file (optional)</Text>
              <FileRow
                file={degreeFile}
                onPick={() => pickFile(setDegreeFile, 'degree file')}
                label="degree file"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Graduation certificate (optional)</Text>
              <FileRow
                file={certFile}
                onPick={() => pickFile(setCertFile, 'graduation certificate')}
                label="graduation certificate"
              />
            </View>
          </View>
        )}

        {/* ── Therapist: Professional Info ── */}
        {role === 'THERAPIST' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional information</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>License number *</Text>
              <TextInput
                style={styles.input}
                placeholder="LIC-12345"
                placeholderTextColor={COLORS.textMuted}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.label}>Rate per minute (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="5.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={perMinuteRate}
                  onChangeText={setPerMinuteRate}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.fieldGroup, styles.flex1]}>
                <Text style={styles.label}>Rate per session (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1500"
                  placeholderTextColor={COLORS.textMuted}
                  value={perSessionRate}
                  onChangeText={setPerSessionRate}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Therapy modalities * (select all that apply)</Text>
              <PillToggle
                items={MODALITY_OPTIONS}
                selected={selectedModalities}
                onToggle={toggleModality}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Languages spoken</Text>
              <PillToggle
                items={LANGUAGE_OPTIONS}
                selected={selectedLanguages}
                onToggle={toggleLanguage}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of your background..."
                placeholderTextColor={COLORS.textMuted}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>2FA phone number (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor={COLORS.textMuted}
                value={twoFactorPhone}
                onChangeText={setTwoFactorPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>License file (optional)</Text>
              <FileRow
                file={licenseFile}
                onPick={() => pickFile(setLicenseFile, 'license file')}
                label="license file"
              />
            </View>
          </View>
        )}

        {/* Pending approval notice */}
        {(role === 'COUNSELOR' || role === 'THERAPIST') && (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingText}>
              ⏳ Your account will require admin verification before you can access{' '}
              {role === 'COUNSELOR' ? 'counselor' : 'therapist'} features.
            </Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => [
            styles.btnWrap,
            loading && { opacity: 0.6 },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Complete registration"
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
              <Text style={styles.btnText}>Complete registration 🎉</Text>
            )}
          </LinearGradient>
        </Pressable>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },
  container: { flexGrow: 1, padding: SPACING.lg, paddingTop: 60 },
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.lg, padding: SPACING.xs },
  backBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  header: { gap: SPACING.sm, marginBottom: SPACING.md },
  stepBadge: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes.h3,
    fontWeight: FONTS.weights.bold,
    letterSpacing: -0.5,
  },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  emailBadge: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: SPACING.md,
  },
  emailBadgeText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.semibold,
    marginBottom: 4,
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: SPACING.sm },
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
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  pillSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  pillTextSelected: { color: COLORS.primary },
  fileBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  fileBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.body },
  fileBtnTextSuccess: {
    color: COLORS.success,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
  },
  pendingBox: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
    marginBottom: SPACING.md,
  },
  pendingText: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
  },
  btnWrap: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  btn: {
    padding: SPACING.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
  },
  btnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: FONTS.weights.bold,
  },
});
