// frontend/constants/theme.js
// Design system for the Seeker app — dark mental wellness aesthetic

export const COLORS = {
  // Backgrounds
  background: '#0A0E1A',
  surface: '#141826',
  card: '#1E2336',
  overlay: 'rgba(10, 14, 26, 0.85)',

  // Borders
  border: '#2A3050',
  borderFocused: '#6C63FF',

  // Brand
  primary: '#6C63FF',
  primaryDark: '#5A52E8',
  primaryLight: 'rgba(108, 99, 255, 0.15)',
  accent: '#00D4AA',
  accentDark: '#00B894',
  accentLight: 'rgba(0, 212, 170, 0.15)',

  // Gradient pairs
  gradientPrimary: ['#6C63FF', '#A78BFA'],
  gradientAccent: ['#00D4AA', '#6C63FF'],
  gradientDanger: ['#FF5F6D', '#FFC371'],

  // Status
  error: '#FF5F6D',
  errorLight: 'rgba(255, 95, 109, 0.15)',
  warning: '#FFB347',
  warningLight: 'rgba(255, 179, 71, 0.15)',
  success: '#00D4AA',
  successLight: 'rgba(0, 212, 170, 0.15)',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#4A5568',
  textLink: '#6C63FF',

  // Inputs
  inputBackground: '#1E2336',
  inputBorder: '#2A3050',

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
