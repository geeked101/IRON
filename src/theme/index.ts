export const colors = {
  // Backgrounds
  bg: '#121212',
  bgCard: '#1E1E1E',
  bgActive: '#2A150C',
  bgDeep: '#181818',
  bgInset: '#242424',

  // Brand Accents (Vibrant Electric Orange)
  accent: '#FF3B00',
  accentSecondary: '#FF5500',

  // Titanium / Neutrals
  titanium: '#FFFFFF',
  titaniumMid: '#FF3B00',
  titaniumDim: '#8E8E93',
  titaniumFaint: '#3A3A3E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#8E8E93',
  textFaint: '#555555',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderMid: '#2A2A2E',

  // Semantic
  orange: '#FF3B00',
  orangeBg: '#2A150C',
  orangeBorder: '#FF3B00',
  orangeText: '#FF5500',

  green: '#34C759',
  greenBg: '#132817',
  greenBorder: '#34C759',
  greenText: '#34C759',

  amber: '#FF9500',
  amberBg: '#2A1C0C',
  amberBorder: '#FF9500',

  purple: '#AF52DE',
  purpleBg: '#200C2A',
  purpleBorder: '#AF52DE',
  purpleText: '#AF52DE',

  blue: '#0A84FF',
  red: '#FF453A',
}

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary },
  h4: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.textPrimary },
  small: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: '500' as const, color: colors.textMuted, letterSpacing: 1 },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  full: 999,
}

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
}
