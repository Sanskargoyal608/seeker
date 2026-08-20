import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialSymbols } from '@expo/vector-icons';
import { getNotifications, markNotificationRead } from '../../api/core';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import apiClient from '../../api/axios'; // For markAllRead if implemented

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.log('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllAsRead = async () => {
    try {
      // Optioanl: API call to mark all read, currently optimistic update
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      for(let id of unreadIds) {
        await markNotificationRead(id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.log(e);
    }
  };

  const handlePress = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      } catch (e) {
        console.log(e);
      }
    }

    if (notification.notification_type === 'new_message' && notification.related_id) {
      router.push(`/(app)/chat/${notification.related_id}`);
    } else if (notification.notification_type === 'escalation_alert') {
      router.replace('/(app)/dashboard');
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'new_message': return { name: 'chatbubbles', color: COLORS.secondary, bg: 'rgba(186, 235, 245, 0.2)' };
      case 'session_reminder': return { name: 'alarm', color: COLORS.primary, bg: 'rgba(45, 90, 110, 0.1)' };
      case 'escalation_alert': return { name: 'warning', color: COLORS.error, bg: COLORS.errorContainer };
      case 'session_request': return { name: 'person-add', color: COLORS.statusAvailable, bg: 'rgba(52, 211, 153, 0.2)' };
      case 'escalation_update': return { name: 'warning', color: COLORS.error, bg: COLORS.errorContainer };
      case 'mentorship': return { name: 'school', color: COLORS.primary, bg: 'rgba(45, 90, 110, 0.1)' };
      case 'payout': return { name: 'wallet', color: COLORS.statusBusy, bg: 'rgba(251, 191, 36, 0.2)' };
      default: return { name: 'notifications', color: COLORS.onSurfaceVariant, bg: COLORS.surfaceContainerHigh };
    }
  };

  const renderItem = ({ item }) => {
    const iconConfig = getIconForType(item.notification_type);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.notificationCard,
          !item.is_read ? styles.unreadCard : styles.readCard,
          pressed && { transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
        </View>
        <View style={styles.contentWrap}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
            <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  if (loading) {
     return (
        <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
           <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
     );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Buddy Wellness</Text>
        </View>
        <Pressable style={styles.crisisBtn}>
          <Text style={styles.crisisBtnText}>Crisis</Text>
        </Pressable>
      </View>

      <View style={styles.pageHeader}>
        <View>
           <Text style={styles.pageTitle}>Notifications</Text>
           <Text style={styles.pageSub}>Stay updated with your wellness journey.</Text>
        </View>
        <Pressable onPress={markAllAsRead} style={styles.markAllBtn}>
           <Text style={styles.markAllText}>Mark all as read</Text>
        </Pressable>
      </View>
      
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
           <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                 <Ionicons name="notifications-off-outline" size={48} color={COLORS.outline} />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySub}>You don't have any new notifications right now.</Text>
           </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.marginMobile,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 199, 204, 0.3)', // outline-variant/30
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
  },
  headerTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.bodyLg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  crisisBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  crisisBtnText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    fontWeight: '600',
    color: COLORS.error,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.marginMobile,
    paddingTop: 24,
    paddingBottom: 16,
  },
  pageTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineLgMobile,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  pageSub: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  markAllBtn: {
    padding: 8,
  },
  markAllText: {
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm,
    color: COLORS.primary,
  },
  listContainer: { 
    paddingHorizontal: SPACING.marginMobile,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: 12,
    borderWidth: 1,
  },
  unreadCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderColor: 'rgba(193, 199, 204, 0.3)',
    ...SHADOWS.sm,
  },
  readCard: {
    backgroundColor: 'rgba(245, 243, 243, 0.5)', // surface-container-low/50
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentWrap: { 
    flex: 1,
    paddingRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: { 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.labelSm, 
    fontWeight: '600', 
    color: COLORS.onSurfaceVariant,
    flex: 1,
    marginRight: 8,
  },
  unreadText: { 
    fontWeight: '700', 
    color: COLORS.onSurface, 
  },
  time: { 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.caption, 
    color: COLORS.outline,
  },
  body: { 
    fontFamily: FONTS.family.body,
    fontSize: FONTS.sizes.bodyMd, 
    color: COLORS.onSurfaceVariant, 
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    opacity: 0.5,
  },
  emptyTitle: {
    fontFamily: FONTS.family.headline,
    fontSize: FONTS.sizes.headlineMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: 8,
  },
  emptySub: { 
    fontFamily: FONTS.family.body,
    textAlign: 'center', 
    color: 'rgba(65, 72, 76, 0.7)', // on-surface-variant/70
    fontSize: FONTS.sizes.bodyMd,
  },
});
