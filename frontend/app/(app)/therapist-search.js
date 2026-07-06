import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { getTherapists, requestTherapistSession } from '../../api/core';

export default function TherapistSearchScreen() {
  const router = useRouter();
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [modality, setModality] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [requestingId, setRequestingId] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTherapists();
    }, 300); // 300ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, language, modality, maxPrice]);

  const fetchTherapists = async () => {
    setLoading(true);
    try {
      const q = searchQuery.trim() || '*';
      const lang = language.trim() || null;
      const mod = modality.trim() || null;
      const price = maxPrice.trim() ? parseFloat(maxPrice) : null;
      const data = await getTherapists(q, lang, mod, price);
      setTherapists(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load therapists');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSession = async (therapistId) => {
    setRequestingId(therapistId);
    try {
      await requestTherapistSession(therapistId);
      Alert.alert('Success', 'Session request sent! The therapist will be notified.', [
        { text: 'OK', onPress: () => router.replace('/(app)/dashboard') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to request session.');
    } finally {
      setRequestingId(null);
    }
  };

  const renderTherapist = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name?.[0] || 'T'}</Text>
        </View>
        <View style={styles.cardHeaderContent}>
          <Text style={styles.therapistName}>{item.name}</Text>
          <Text style={styles.therapistRate}>${item.per_session_rate} / session</Text>
        </View>
      </View>
      
      {item.bio ? <Text style={styles.bioText} numberOfLines={3}>{item.bio}</Text> : null}
      
      <View style={styles.tagsContainer}>
        {item.modalities?.slice(0, 3).map((mod, idx) => (
          <View key={idx} style={styles.tag}>
            <Text style={styles.tagText}>{mod}</Text>
          </View>
        ))}
        {item.languages?.slice(0, 2).map((lang, idx) => (
          <View key={`lang-${idx}`} style={[styles.tag, styles.langTag]}>
            <Text style={styles.tagText}>{lang}</Text>
          </View>
        ))}
      </View>
      
      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
        <Pressable 
          style={({ pressed }) => [styles.requestBtn, { flex: 1, backgroundColor: COLORS.secondary }, pressed && styles.pressedBtn]}
          onPress={() => router.push(`/(app)/book/${item.id}`)}
        >
          <Text style={styles.requestBtnText}>Book Later</Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.requestBtn, { flex: 1 }, pressed && styles.pressedBtn]}
          onPress={() => handleRequestSession(item.id)}
          disabled={requestingId === item.id}
        >
          {requestingId === item.id ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.requestBtnText}>Request Now</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Find a Therapist</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, bio..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Language (e.g. English)"
            value={language}
            onChangeText={setLanguage}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="Modality (e.g. CBT)"
            value={modality}
            onChangeText={setModality}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 10 }]}
            placeholder="Max Price ($)"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="numeric"
          />
        </View>
      </View>

      {loading && therapists.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
      ) : therapists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No therapists found matching your criteria.</Text>
          <Pressable onPress={() => { setSearchQuery(''); setLanguage(''); setModality(''); setMaxPrice(''); }} style={{ marginTop: 10 }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Clear Filters</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={therapists}
          keyExtractor={t => t.id.toString()}
          renderItem={renderTherapist}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 24, color: COLORS.text },
  title: { fontSize: FONTS.sizes.h3, fontWeight: FONTS.weights.bold, color: COLORS.text },
  filterSection: { padding: SPACING.lg, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.xs },
  searchRow: { flexDirection: 'row', gap: SPACING.sm },
  input: { flex: 1, height: 44, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, fontSize: FONTS.sizes.body },
  searchBtn: { backgroundColor: COLORS.primary, justifyContent: 'center', paddingHorizontal: SPACING.lg, borderRadius: RADIUS.sm },
  searchBtnText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  listContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarText: { fontSize: FONTS.sizes.h3, fontWeight: 'bold', color: COLORS.primary },
  cardHeaderContent: { flex: 1 },
  therapistName: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.text },
  therapistRate: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  bioText: { fontSize: FONTS.sizes.body, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.md },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.background, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  langTag: { backgroundColor: COLORS.primary + '10' },
  tagText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  requestBtn: { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  pressedBtn: { opacity: 0.8 },
  requestBtnText: { color: COLORS.white, fontSize: FONTS.sizes.body, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: FONTS.sizes.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 }
});
