export const colors = {
  // Backgrounds
  bg: '#0B0D12',
  bgCard: '#161A22',
  bgDeep: '#0f1117',
  bgInset: '#1e2230',

  // Titanium accents
  titanium: '#C0C4CC',
  titaniumMid: '#8B8F98',
  titaniumDim: '#555',
  titaniumFaint: '#3a3f4d',

  // Text
  textPrimary: '#F5F7FA',
  textSecondary: '#8B8F98',
  textMuted: '#555',
  textFaint: '#333',

  // Borders
  border: '#1e2230',
  borderMid: '#2a2f3d',

  // Semantic
  green: '#4a9a44',
  greenBg: '#1a2818',
  greenBorder: '#2a4228',
  greenText: '#a0d49c',
  amber: '#c9a040',
  amberBg: '#1a1200',
  amberBorder: '#3a3200',
  purple: '#7060c0',
  purpleBg: '#100e18',
  purpleBorder: '#2a2648',
  purpleText: '#b0a0e0',
  blue: '#378ADD',
  red: '#c05050',
}

export const typography = {
  h1: { fontSize: 28, fontWeight: '500' as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '500' as const, color: colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '500' as const, color: colors.textPrimary },
  h4: { fontSize: 16, fontWeight: '500' as const, color: colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.textPrimary },
  small: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: '400' as const, color: colors.textMuted, letterSpacing: 1 },
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
  lg: 14,
  xl: 20,
  full: 999,
}

export const shadows = {
  none: {},
}
