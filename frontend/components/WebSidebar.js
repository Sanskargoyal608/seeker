import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';

export default function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector(selectUser);
  const [isHovered, setIsHovered] = useState(false);

  const getLinks = () => {
    const role = user?.role;
    
    const baseLinks = [
      { name: 'Home', icon: 'home-outline', route: '/(app)/dashboard' },
      { name: 'Discovery', icon: 'search-outline', route: '/(app)/therapist-search' },
      { name: 'Chats', icon: 'chatbubbles-outline', route: '/(app)/triage' },
    ];

    if (role === 'COUNSELOR') {
      return [
        { name: 'Dashboard', icon: 'home-outline', route: '/(app)/dashboard' },
        { name: 'Chats', icon: 'chatbubbles-outline', route: '/(app)/counselor-chats' },
        { name: 'Mentorship', icon: 'search-outline', route: '/(app)/mentorship' },
        { name: 'Profile', icon: 'person-outline', route: '/(app)/counselor-profile' },
      ];
    }

    if (role === 'THERAPIST') {
      return [
        { name: 'Dashboard', icon: 'home-outline', route: '/(app)/therapist/dashboard' },
        { name: 'Calendar', icon: 'calendar-outline', route: '/(app)/therapist/calendar' },
        { name: 'Clients', icon: 'people-outline', route: '/(app)/therapist/clients' },
        { name: 'Mentees', icon: 'people-outline', route: '/(app)/therapist/mentees' },
        { name: 'Earnings', icon: 'cash-outline', route: '/(app)/therapist/earnings' },
      ];
    }

    return [
      ...baseLinks,
      { name: 'Profile', icon: 'person-outline', route: '/(app)/profile' }
    ];
  };

  const links = getLinks();

  return (
    <View 
      style={[styles.sidebar, { width: isHovered ? 240 : 80 }]}
      onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
      onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
    >
      <View style={styles.logoContainer}>
        <Ionicons name="leaf" size={32} color={COLORS.primary} />
        {isHovered && <Text style={styles.logoText}>Seeker</Text>}
      </View>

      <View style={styles.navContainer}>
        {links.map((link, index) => {
          const isActive = pathname === link.route || pathname.startsWith(link.route + '/');
          return (
            <Pressable
              key={index}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => router.push(link.route)}
            >
              <Ionicons 
                name={link.icon} 
                size={24} 
                color={isActive ? COLORS.primary : COLORS.textSecondary} 
              />
              {isHovered && (
                <Text style={[styles.navText, isActive && styles.navTextActive]}>
                  {link.name}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footerContainer}>
        <Pressable style={styles.navItem} onPress={() => router.push('/(app)/settings')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textSecondary} />
          {isHovered && <Text style={styles.navText}>Settings</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: COLORS.surfaceContainer,
    borderRightWidth: 1,
    borderRightColor: COLORS.surfaceDim,
    height: '100%',
    paddingVertical: SPACING.lg,
    transition: 'width 0.2s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: SPACING.xl * 2,
    height: 40,
  },
  logoText: {
    fontFamily: FONTS.family.body,
    fontWeight: FONTS.weights.bold,
    fontSize: 24,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  navContainer: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  navItemActive: {
    backgroundColor: COLORS.primary + '15',
  },
  navText: {
    fontFamily: FONTS.family.body,
    fontWeight: FONTS.weights.medium,
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
  },
  navTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  footerContainer: {
    paddingHorizontal: SPACING.sm,
  }
});
