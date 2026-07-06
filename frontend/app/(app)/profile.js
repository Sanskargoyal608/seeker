// frontend/app/(app)/profile.js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import api from '../../api/axios';

export default function ProfileScreen() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const { handleLogout } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Therapist fields
  const [perSessionRate, setPerSessionRate] = useState(user?.therapist_profile?.per_session_rate?.toString() || '');
  const [modalities, setModalities] = useState(user?.therapist_profile?.modalities?.join(', ') || '');
  const [languages, setLanguages] = useState(user?.therapist_profile?.languages?.join(', ') || '');

  // Counselor fields
  const [specialization, setSpecialization] = useState(user?.counselor_profile?.specialization || '');
  const [yearsExperience, setYearsExperience] = useState(user?.counselor_profile?.years_experience?.toString() || '');

  // General fields
  const [bio, setBio] = useState(user?.therapist_profile?.bio || user?.counselor_profile?.bio || '');

  // Emergency Contacts (General User)
  const [ec1Name, setEc1Name] = useState(user?.emergency_contacts?.[0]?.name || '');
  const [ec1Phone, setEc1Phone] = useState(user?.emergency_contacts?.[0]?.phone || '');
  const [ec2Name, setEc2Name] = useState(user?.emergency_contacts?.[1]?.name || '');
  const [ec2Phone, setEc2Phone] = useState(user?.emergency_contacts?.[1]?.phone || '');

  const [loading, setLoading] = useState(false);

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleLogout },
    ]);
  };

  const onSave = async () => {
    setLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      };

      if (user?.role === 'THERAPIST') {
        payload.therapist_profile = {
          per_session_rate: parseFloat(perSessionRate) || 0,
          modalities: modalities.split(',').map(m => m.trim()).filter(Boolean),
          languages: languages.split(',').map(l => l.trim()).filter(Boolean),
          bio: bio,
        };
      } else if (user?.role === 'COUNSELOR') {
        payload.counselor_profile = {
          specialization: specialization,
          years_experience: parseInt(yearsExperience) || 0,
          bio: bio,
        };
      } else if (user?.role === 'GENERAL_USER') {
        const ecs = [];
        if (ec1Name || ec1Phone) ecs.push({ name: ec1Name, phone: ec1Phone, relationship: 'Primary' });
        if (ec2Name || ec2Phone) ecs.push({ name: ec2Name, phone: ec2Phone, relationship: 'Secondary' });
        if (ecs.length > 0) {
          payload.emergency_contacts = ecs;
        }
      }

      const response = await api.patch('/api/accounts/profile/update/', payload);
      dispatch(setUser(response.data));
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1234567890"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          {user?.role === 'THERAPIST' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Rate per Session ($)</Text>
                <TextInput
                  style={styles.input}
                  value={perSessionRate}
                  onChangeText={setPerSessionRate}
                  placeholder="150"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Modalities (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={modalities}
                  onChangeText={setModalities}
                  placeholder="CBT, EMDR, ACT"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Languages (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={languages}
                  onChangeText={setLanguages}
                  placeholder="English, Spanish"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}

          {user?.role === 'COUNSELOR' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Specialization</Text>
                <TextInput
                  style={styles.input}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="Anxiety, Depression..."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Years of Experience</Text>
                <TextInput
                  style={styles.input}
                  value={yearsExperience}
                  onChangeText={setYearsExperience}
                  placeholder="5"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}

          {user?.role === 'GENERAL_USER' && (
            <>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Primary Contact Name</Text>
                <TextInput
                  style={styles.input}
                  value={ec1Name}
                  onChangeText={setEc1Name}
                  placeholder="Jane Doe"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Primary Contact Phone</Text>
                <TextInput
                  style={styles.input}
                  value={ec1Phone}
                  onChangeText={setEc1Phone}
                  placeholder="+1987654321"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Secondary Contact Name</Text>
                <TextInput
                  style={styles.input}
                  value={ec2Name}
                  onChangeText={setEc2Name}
                  placeholder="John Smith"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Secondary Contact Phone</Text>
                <TextInput
                  style={styles.input}
                  value={ec2Phone}
                  onChangeText={setEc2Phone}
                  placeholder="+1122334455"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={onSave} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Save Changes</Text>}
          </Pressable>
        </View>

        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, { backgroundColor: COLORS.info || '#17a2b8', marginBottom: SPACING.md }]} onPress={() => router.push('/(app)/helpline')}>
          <Text style={styles.btnText}>Crisis Helpline Directory</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: SPACING.xs },
  backBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.body, fontWeight: FONTS.weights.bold },
  headerTitle: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text },
  container: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.sm },
  fieldGroup: { marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.body },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md },
  btnPressed: { opacity: 0.8 },
  btnText: { color: COLORS.white, fontSize: FONTS.sizes.bodyLg, fontWeight: FONTS.weights.bold },
  logoutBtn: { backgroundColor: COLORS.errorLight, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.error },
  logoutBtnText: { color: COLORS.error, fontSize: FONTS.sizes.bodyLg, fontWeight: FONTS.weights.bold },
});
