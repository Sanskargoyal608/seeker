// frontend/constants/theme.js
// Design system for the Seeker app — dark mental wellness aesthetic

export const COLORS = {
  // Primary & Secondary
  primary: '#104356', 
  primaryContainer: '#2d5a6e',
  onPrimary: '#ffffff',
  secondary: '#36656e',
  secondaryContainer: '#baebf5',
  onSecondary: '#ffffff',
  
  // Surface & Backgrounds
  background: '#fbf9f8',
  onBackground: '#1b1c1c',
  surface: '#fbf9f8',
  surfaceDim: '#dbd9d9',
  surfaceBright: '#fbf9f8',
  surfaceVariant: '#e4e2e2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3f3',
  surfaceContainer: '#efeded',
  surfaceContainerHigh: '#eae8e7',
  surfaceContainerHighest: '#e4e2e2',
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#41484c',
  
  // Inverse
  inverseSurface: '#303030',
  inverseOnSurface: '#f2f0f0',
  inversePrimary: '#a0cde4',
  
  // Outlines
  outline: '#71787c',
  outlineVariant: '#c1c7cc',
  
  // Status & Safety
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  crisisAlert: '#D9534F',
  statusAvailable: '#4CAF50',
  statusBusy: '#FF9800',
  
  // Specialized
  surfacePrivate: '#FDF6E3',
  safetyBlue: '#E1E8ED',
  
  // Legacy aliases to prevent immediate crashes in old components
  border: '#c1c7cc',
  borderFocused: '#104356',
  card: '#ffffff',
  text: '#1b1c1c',
  textSecondary: '#41484c',
  textMuted: '#71787c',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  gradientPrimary: ['#2d5a6e', '#104356'],
  gradientAccent: ['#baebf5', '#9fced9'],
  textLink: '#104356',
  errorLight: '#ffdad6',

  // Stitch missing colors
  onPrimaryContainer: '#a3d0e7',
  onSecondaryContainer: '#3c6b75',
  primaryFixed: '#bfe9ff',
  secondaryFixed: '#baebf5',
  tertiaryFixed: '#ffffff',
  onTertiaryFixed: '#1b1c1c',
  onPrimaryFixed: '#104356',
  onPrimaryFixedVariant: '#104356',
  
  // Legacy auth colors
  inputBackground: '#f5f3f3',
  inputBorder: '#e4e2e2',
  success: '#4CAF50',
  successLight: '#e8f5e9',
  primaryLight: '#a0cde4',
  warning: '#FF9800',
  warningLight: '#fff3e0',
  accent: '#36656e',
  accentLight: '#baebf5',
  textPrimary: '#1b1c1c',
  info: '#2d5a6e',
};

export const FONTS = {
  sizes: {
    caption: 12,
    labelSm: 14,
    bodyMd: 16,
    bodyLg: 18,
    headlineMd: 24,
    headlineLgMobile: 26,
    headlineLg: 32,
    // Legacy support
    xs: 12,
    sm: 14,
    body: 16,
    title: 24,
    h3: 26,
    h2: 32,
    h1: 36,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  family: {
    body: 'Inter',
    headline: 'Manrope',
  }
};

export const RADIUS = {
  sm: 4,      // 0.25rem
  DEFAULT: 8, // 0.5rem
  md: 12,     // 0.75rem
  lg: 16,     // 1rem
  xl: 24,     // 1.5rem
  full: 9999,
  // legacy
  xs: 4,
  xxl: 24,
};

export const SPACING = {
  unit: 8,
  gutter: 16,
  marginMobile: 20,
  marginDesktop: 40,
  // Legacy support
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const SHADOWS = {
  ambient: {
    shadowColor: '#104356',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sm: {
    shadowColor: '#104356',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  md: {
    shadowColor: '#104356',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
};
