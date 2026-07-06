// frontend/constants/theme.js
// Design system for the Seeker app — dark mental wellness aesthetic

export const COLORS = {
  // Backgrounds
  background: '#F7F9FC', // Light grayish blue
  surface: '#FFFFFF', // Clean white
  card: '#FFFFFF',
  overlay: 'rgba(247, 249, 252, 0.85)',

  // Borders
  border: '#E2E8F0', // Soft gray
  borderFocused: '#4A90E2', // Gentle blue

  // Brand
  primary: '#4A90E2', // Gentle calm blue
  primaryDark: '#357ABD',
  primaryLight: 'rgba(74, 144, 226, 0.15)',
  accent: '#50E3C2', // Soft teal/green
  accentDark: '#3EBA9E',
  accentLight: 'rgba(80, 227, 194, 0.15)',

  // Gradient pairs
  gradientPrimary: ['#4A90E2', '#86B9FF'],
  gradientAccent: ['#50E3C2', '#4A90E2'],
  gradientDanger: ['#FF7675', '#FF9A9E'],

  // Status
  error: '#FF7675', // Soft red
  errorLight: 'rgba(255, 118, 117, 0.15)',
  warning: '#FDCB6E', // Soft yellow
  warningLight: 'rgba(253, 203, 110, 0.15)',
  success: '#50E3C2',
  successLight: 'rgba(80, 227, 194, 0.15)',

  // Text
  text: '#2D3748', // Dark gray, not harsh black
  textSecondary: '#718096', // Medium gray
  textMuted: '#A0AEC0', // Light gray
  textLink: '#4A90E2',

  // Inputs
  inputBackground: '#F7F9FC',
  inputBorder: '#E2E8F0',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    body: 15,
    bodyLg: 17,
    subtitle: 18,
    title: 22,
    h3: 26,
    h2: 30,
    h1: 36,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
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
