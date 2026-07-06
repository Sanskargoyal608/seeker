import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getHelplines } from '../../api/core';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export default function HelplineScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [helplines, setHelplines] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHelplines = async () => {
      try {
        const data = await getHelplines();
        setHelplines(data);
      } catch (err) {
        setError('Failed to load helpline directory.');
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHelplines();
  }, []);

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>&larr; Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Crisis Helpline Directory</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.disclaimer}>
          If you or someone you know is in immediate danger, please contact local emergency services immediately.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : helplines.length === 0 ? (
          <Text style={styles.emptyText}>No helplines currently available.</Text>
        ) : (
          helplines.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{entry.name}</Text>
                {entry.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{entry.category.name}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.descriptionText}>{entry.description}</Text>
              
              <View style={styles.detailsRow}>
                {entry.region ? <Text style={styles.detailItem}>📍 {entry.region}</Text> : null}
                {entry.is_24_7 ? <Text style={styles.detailItem}>🕒 24/7</Text> : null}
              </View>

              <Pressable 
                style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.8 }]} 
                onPress={() => handleCall(entry.phone)}
              >
                <Text style={styles.callBtnText}>📞 Call {entry.phone}</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: SPACING.xs, marginRight: SPACING.md },
  backBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.md, fontWeight: 'bold' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: 'bold', color: COLORS.textPrimary },
  scrollContent: { padding: SPACING.md },
  disclaimer: {
    backgroundColor: COLORS.error,
    color: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  errorText: { color: COLORS.error, textAlign: 'center', marginTop: 20 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.xs },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, flex: 1 },
  categoryBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  categoryText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: 'bold' },
  descriptionText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  detailsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  detailItem: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  callBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  callBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONTS.sizes.md },
});
