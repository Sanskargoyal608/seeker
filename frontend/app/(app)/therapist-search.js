import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { getTherapists, requestTherapistSession } from '../../api/core';
import BottomNav from '../../components/BottomNav';

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
    }, 300);
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

  const clearFilters = () => {
    setSearchQuery('');
    setLanguage('');
    setModality('');
    setMaxPrice('');
  };

  const renderTherapist = ({ item }) => {
    const isAvailable = true; // Replace with real logic if needed

    return (
      <Pressable 
        style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
        onPress={() => router.push(`/(app)/book/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name?.[0] || 'T'}</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: isAvailable ? COLORS.statusAvailable : COLORS.statusBusy }]} />
          </View>
          
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.therapistName} numberOfLines={1}>{item.name}</Text>
              {item.title === 'Graduate Counselor' ? (
                 <View style={styles.tagBadge}>
                   <MaterialIcons name="history" size={12} color={COLORS.onSurfaceVariant} />
                   <Text style={styles.tagBadgeText}>Insightful</Text>
                 </View>
              ) : (
                 <View style={[styles.tagBadge, { backgroundColor: COLORS.secondaryContainer }]}>
                   <MaterialIcons name="star" size={12} color={COLORS.onSecondaryContainer} />
                   <Text style={[styles.tagBadgeText, { color: COLORS.onSecondaryContainer }]}>Compassionate</Text>
                 </View>
              )}
            </View>
            <Text style={styles.therapistTitle}>{item.title || 'Counselor'}</Text>
          </View>
        </View>

        <Text style={styles.bioText} numberOfLines={2}>
          {item.bio || 'Experienced practitioner offering personalized support and compassionate care for your mental wellness journey.'}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.priceText}>${item.per_session_rate}</Text>
              <Text style={styles.priceSubText}>/session</Text>
            </View>
          </View>
          <View style={styles.availabilityRow}>
             {isAvailable ? (
               <>
                 <Ionicons name="flash" size={16} color={COLORS.statusAvailable} />
                 <Text style={[styles.availabilityText, { color: COLORS.statusAvailable }]}>Available Now</Text>
               </>
             ) : (
               <Text style={styles.availabilityText}>In Session (10m)</Text>
             )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Discovery</Text>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={styles.contentPad}>
            {/* Hero text */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Find your space to heal.</Text>
              <Text style={styles.heroSubtitle}>
                Connect with licensed practitioners or graduate counselors who specialize in your specific needs.
              </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.outline} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or specialty..."
                placeholderTextColor={COLORS.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filters */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>REFINE DISCOVERY</Text>
                {(searchQuery || language || modality || maxPrice) ? (
                  <Pressable onPress={clearFilters}>
                    <Text style={styles.clearFiltersText}>Clear all</Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <View style={styles.filterChipsRow}>
                  {modality ? (
                    <Pressable style={styles.chipActive} onPress={() => setModality('')}>
                      <Text style={styles.chipActiveText}>{modality}</Text>
                      <Ionicons name="close" size={16} color={COLORS.onPrimaryContainer} />
                    </Pressable>
                  ) : (
                    <TextInput
                      style={styles.chipInput}
                      placeholder="Specialty (e.g. Grief)"
                      placeholderTextColor={COLORS.onSurfaceVariant}
                      value={modality}
                      onChangeText={setModality}
                    />
                  )}

                  {language ? (
                    <Pressable style={styles.chipActive} onPress={() => setLanguage('')}>
                      <Text style={styles.chipActiveText}>{language}</Text>
                      <Ionicons name="close" size={16} color={COLORS.onPrimaryContainer} />
                    </Pressable>
                  ) : (
                    <TextInput
                      style={styles.chipInput}
                      placeholder="Language"
                      placeholderTextColor={COLORS.onSurfaceVariant}
                      value={language}
                      onChangeText={setLanguage}
                    />
                  )}
                  
                  <View style={styles.divider} />
                  
                  {maxPrice ? (
                    <Pressable style={styles.chipActive} onPress={() => setMaxPrice('')}>
                      <Text style={styles.chipActiveText}>&lt; ${maxPrice}</Text>
                      <Ionicons name="close" size={16} color={COLORS.onPrimaryContainer} />
                    </Pressable>
                  ) : (
                    <View style={styles.chipIconInputWrap}>
                      <Ionicons name="cash-outline" size={16} color={COLORS.onSurfaceVariant} />
                      <TextInput
                        style={styles.chipIconInput}
                        placeholder="Max Price"
                        placeholderTextColor={COLORS.onSurfaceVariant}
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        }
        data={therapists}
        keyExtractor={t => t.id.toString()}
        renderItem={renderTherapist}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No practitioners found matching your criteria.</Text>
            </View>
          )
        }
      />
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    marginRight: 4,
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  contentPad: {
    paddingHorizontal: SPACING.marginMobile,
    paddingTop: 16,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLgMobile,
    fontWeight: '800',
    color: COLORS.onSurface,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 32,
    ...SHADOWS.ambient,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurface,
    height: '100%',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    fontWeight: '600',
    color: COLORS.onSurface,
    letterSpacing: 0.5,
  },
  clearFiltersText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterScroll: {
    paddingBottom: 8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 8,
  },
  chipActiveText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.onPrimaryContainer,
  },
  chipInput: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurfaceVariant,
    minWidth: 100,
  },
  chipIconInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: 6,
  },
  chipIconInput: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurfaceVariant,
    minWidth: 80,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.outlineVariant,
    marginHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: SPACING.marginMobile,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.ambient,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  avatarText: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onPrimaryContainer,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.surfaceContainerLowest,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  therapistName: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    flex: 1,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 2,
    marginLeft: 8,
  },
  tagBadgeText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
  },
  therapistTitle: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  bioText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  priceText: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceSubText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption,
    color: COLORS.onSurfaceVariant,
    marginLeft: 2,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availabilityText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.outline,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  }
});
