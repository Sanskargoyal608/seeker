import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../../api/axios';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await apiClient.get('/api/core/user/dashboard/');
        const groups = res.data?.grouped_clients || [];
        const found = groups.find(g => g.client_id.toString() === id);
        
        if (found) {
          setClient({
            client_name: found.client_name,
            client_email: found.client_email,
            status: `${found.sessions.length} Sessions`,
            session: found.sessions[0]?.id // latest session
          });
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      // Notes should ideally be saved per-session or on a new TherapistClient profile model.
      Alert.alert('Info', 'Client-level notes are deprecated. Please use session notes inside the chat.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save notes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.safe, styles.center]}>
        <Text style={styles.errorText}>Client not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={'#0F172A'} />
        </Pressable>
        <Text style={styles.headerTitle}>Client Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
             <Ionicons name="person" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.name}>{client.client_name || 'Client User'}</Text>
          <Text style={styles.email}>{client.client_email}</Text>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{client.status || 'Active'}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtnOutline} onPress={() => router.push(`/(app)/chat/${client.session}`)}>
              <Ionicons name="chatbubbles-outline" size={18} color={COLORS.primary} />
              <Text style={styles.actionBtnOutlineText}>Message</Text>
            </Pressable>
            <Pressable style={styles.actionBtnOutline}>
              <Ionicons name="videocam-outline" size={18} color={COLORS.primary} />
              <Text style={styles.actionBtnOutlineText}>Video Call</Text>
            </Pressable>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactIconBox}>
               <Ionicons name="warning-outline" size={20} color={COLORS.error} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>Primary Emergency</Text>
              <Text style={styles.contactPhone}>Provided in Intake</Text>
            </View>
            <Pressable style={styles.callBtn}>
               <Ionicons name="call" size={16} color="#FFFFFF" />
               <Text style={styles.callBtnText}>Call</Text>
            </Pressable>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.notesHeader}>
             <Text style={styles.sectionTitle}>Intake & Clinical Notes</Text>
             <Pressable onPress={handleSaveNotes} disabled={saving} style={[styles.saveBtn, saving && {opacity: 0.7}]}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
             </Pressable>
          </View>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Add clinical observations, diagnoses, and treatment plans here..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#0F172A' },
  content: { padding: SPACING.xl, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.xl,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  name: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#0F172A' },
  email: { fontFamily: 'Outfit-Regular', fontSize: 14, color: '#64748B', marginTop: 4 },
  statusBox: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontFamily: 'Outfit-Medium', color: COLORS.success, fontSize: 12 },
  
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.xl,
    width: '100%',
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F8FAFC',
  },
  actionBtnOutlineText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
  },

  section: { 
    backgroundColor: '#FFFFFF', 
    padding: SPACING.xl, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#0F172A', marginBottom: SPACING.lg },
  
  contactCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FEF2F2', 
    padding: SPACING.md, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  contactIconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center'
  },
  contactInfo: { flex: 1, marginLeft: SPACING.md },
  contactName: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#991B1B' },
  contactPhone: { fontFamily: 'Outfit-Regular', fontSize: 13, color: '#B91C1C', marginTop: 2 },
  callBtn: { 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.error, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 
  },
  callBtnText: { color: '#FFFFFF', fontFamily: 'Outfit-SemiBold', fontSize: 14, marginLeft: 6 },
  
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveBtnText: { color: '#FFFFFF', fontFamily: 'Outfit-Medium', fontSize: 13 },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: SPACING.lg,
    height: 250,
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: '#0F172A',
  },
  errorText: { fontFamily: 'Outfit-SemiBold', color: COLORS.error, fontSize: 16, marginBottom: SPACING.md },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFFFFF', fontFamily: 'Outfit-SemiBold' }
});
