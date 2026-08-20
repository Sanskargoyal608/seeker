import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const isCounselor = user?.role === 'COUNSELOR';

  const tabs = isCounselor ? [
    { name: 'Home', icon: 'home', route: '/(app)/dashboard' },
    { name: 'Mentorship', icon: 'people', route: '/(app)/mentorship' },
    { name: 'Profile', icon: 'person', route: '/(app)/counselor-profile' },
  ] : [
    { name: 'Home', icon: 'home', route: '/(app)/dashboard' },
    { name: 'Discovery', icon: 'search', route: '/(app)/therapist-search' },
    { name: 'Profile', icon: 'person', route: '/(app)/profile' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <Pressable
            key={tab.name}
            style={[styles.tabBtn, isActive && styles.tabActive]}
            onPress={() => router.replace(tab.route)}
          >
            <Ionicons
              name={isActive ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color={isActive ? COLORS.onSecondaryContainer : COLORS.onSurfaceVariant}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    ...SHADOWS.sm,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabActive: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: 24,
    marginHorizontal: 12,
  },
  tabText: {
    fontFamily: FONTS.family.body,
    fontSize: 10,
    marginTop: 2,
    color: COLORS.onSurfaceVariant,
  },
  tabTextActive: {
    color: COLORS.onSecondaryContainer,
    fontWeight: '700',
  },
});
