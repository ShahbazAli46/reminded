// Design System Color Tokens from files/Design_System.md

export const lightColors = {
  // Brand & Primary (Calm Steel Blue from Design_System.md)
  primary: '#3A6EA5',
  primaryDark: '#274A73',
  primaryLight: '#EBF2FA',
  primaryTint: '#D9E6F5',
  primaryPressed: '#2E5884',
  primaryDisabled: '#AEC7E3',
  primaryTextOnDark: '#FFFFFF',

  // Backgrounds & Surfaces
  bgScreen: '#F7F8FA',
  bgSurface: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCardSubtle: '#F8FAFC',
  bgSearch: '#EEF2F6',
  bgInput: '#FFFFFF',
  bgSubtle: '#F0F3F6',
  bgHover: '#F4F7F9',

  // Borders & Dividers
  borderLight: '#F0F3F6',
  borderDefault: '#E3E6EA',
  borderStrong: '#CBD5E1',
  borderFocused: '#3A6EA5',
  borderError: '#D14B4B',

  // Text
  textPrimary: '#1C1F26',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textLink: '#3A6EA5',
  textError: '#D14B4B',

  // Navigation & Bottom Bar
  bottomBarBg: '#FFFFFF',
  bottomBarBorder: '#E3E6EA',
  tabActive: '#3A6EA5',
  tabActiveBg: '#EBF2FA',
  tabInactive: '#6B7280',
  unreadBadge: '#3A6EA5',

  // Priority Tags (Light Mode)
  priority: {
    High: { bg: '#FEE2E2', text: '#B91C1C', dot: '#D14B4B', border: '#FECACA' },
    Medium: { bg: '#FEF3C7', text: '#B45309', dot: '#E0A93D', border: '#FDE68A' },
    Low: { bg: '#E7F8F0', text: '#15803D', dot: '#3A9E6B', border: '#C0EFE0' },
  },

  // Status Badges (Light Mode - distinct from priority to prevent double-yellow clash)
  status: {
    Upcoming: { bg: '#EBF2FA', text: '#274A73', dot: '#3A6EA5', border: '#D9E6F5' },
    Pending: { bg: '#F1F5F9', text: '#475569', dot: '#D97706', border: '#E2E8F0' },
    DonePending: { bg: '#E7F8F0', text: '#116530', dot: '#2E9E6B', border: '#B4F3AC' },
    Completed: { bg: '#EBFBF0', text: '#1B873F', dot: '#2E9E6B', border: '#C5F4D3' },
    Cancelled: { bg: '#F0F3F6', text: '#6B7280', dot: '#9CA3AF', border: '#E3E6EA' },
    AwaitingAcceptance: { bg: '#F1F5F9', text: '#475569', dot: '#D97706', border: '#E2E8F0' },
    Declined: { bg: '#FEE2E2', text: '#D14B4B', dot: '#D14B4B', border: '#FECACA' },
  },

  // Read Receipts
  ticks: {
    read: '#3A6EA5',
    delivered: '#9CA3AF',
    sent: '#9CA3AF',
  },

  // Banners
  banner: {
    info: { bg: '#EBF2FA', text: '#274A73', link: '#3A6EA5' },
    warning: { bg: '#FFFBEB', text: '#B45309', link: '#E0A93D' },
  },

  // OTP Error
  otpError: {
    bg: '#FEF2F2',
    border: '#D14B4B',
    text: '#B91C1C',
  },
} as const;

export const darkColors = {
  // Brand & Primary
  primary: '#4E8AC9',
  primaryDark: '#3A6EA5',
  primaryLight: '#182738',
  primaryTint: '#233950',
  primaryPressed: '#3D76B0',
  primaryDisabled: '#2A3F55',
  primaryTextOnDark: '#FFFFFF',

  // Backgrounds & Surfaces (OLED Dark)
  bgScreen: '#0F141C',
  bgSurface: '#18202C',
  bgCard: '#18202C',
  bgCardSubtle: '#1F2A3A',
  bgSearch: '#222D3E',
  bgInput: '#222D3E',
  bgSubtle: '#222D3E',
  bgHover: '#222D3E',

  // Borders & Dividers
  borderLight: '#1F2A3A',
  borderDefault: '#283547',
  borderStrong: '#33435A',
  borderFocused: '#4E8AC9',
  borderError: '#EF5350',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLink: '#4E8AC9',
  textError: '#EF5350',

  // Navigation & Bottom Bar
  bottomBarBg: '#18202C',
  bottomBarBorder: '#283547',
  tabActive: '#4E8AC9',
  tabActiveBg: '#1E2F42',
  tabInactive: '#94A3B8',
  unreadBadge: '#4E8AC9',

  // Priority Tags (Dark Mode - subtle translucent accents, low glare)
  priority: {
    High: { bg: 'rgba(239, 68, 68, 0.12)', text: '#FCA5A5', dot: '#EF4444', border: 'rgba(239, 68, 68, 0.22)' },
    Medium: { bg: 'rgba(245, 158, 11, 0.12)', text: '#FCD34D', dot: '#EAB308', border: 'rgba(245, 158, 11, 0.22)' },
    Low: { bg: 'rgba(52, 211, 153, 0.10)', text: '#86EFAC', dot: '#22C55E', border: 'rgba(52, 211, 153, 0.20)' },
  },

  // Status Badges (Dark Mode - distinct from priority, calm slate for pending)
  status: {
    Upcoming: { bg: 'rgba(78, 138, 201, 0.12)', text: '#93C5FD', dot: '#4E8AC9', border: 'rgba(78, 138, 201, 0.22)' },
    Pending: { bg: 'rgba(148, 163, 184, 0.10)', text: '#CBD5E1', dot: '#F59E0B', border: 'rgba(148, 163, 184, 0.18)' },
    DonePending: { bg: 'rgba(52, 211, 153, 0.10)', text: '#86EFAC', dot: '#22C55E', border: 'rgba(52, 211, 153, 0.20)' },
    Completed: { bg: 'rgba(52, 211, 153, 0.08)', text: '#6EE7B7', dot: '#10B981', border: 'rgba(52, 211, 153, 0.16)' },
    Cancelled: { bg: 'rgba(100, 116, 139, 0.10)', text: '#94A3B8', dot: '#64748B', border: 'rgba(100, 116, 139, 0.18)' },
    AwaitingAcceptance: { bg: 'rgba(148, 163, 184, 0.10)', text: '#CBD5E1', dot: '#F59E0B', border: 'rgba(148, 163, 184, 0.18)' },
    Declined: { bg: 'rgba(239, 68, 68, 0.12)', text: '#FCA5A5', dot: '#EF4444', border: 'rgba(239, 68, 68, 0.22)' },
  },

  // Read Receipts
  ticks: {
    read: '#4E8AC9',
    delivered: '#64748B',
    sent: '#64748B',
  },

  // Banners
  banner: {
    info: { bg: '#182738', text: '#60A5FA', link: '#4E8AC9' },
    warning: { bg: '#362B16', text: '#FBBF24', link: '#E0A93D' },
  },

  // OTP Error
  otpError: {
    bg: '#3B1C22',
    border: '#EF5350',
    text: '#EF5350',
  },
} as const;

export const colors = lightColors;

export const fontFamily = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  semiBold: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
} as const;

export const typography = {
  brandTitle: { fontFamily: fontFamily.semiBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 },
  h1: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  h2: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  bodyBold: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 20 },
  subtext: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  subtextBold: { fontFamily: fontFamily.semiBold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 15 },
  micro: { fontFamily: fontFamily.semiBold, fontSize: 10, lineHeight: 13, letterSpacing: 0.2 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fab: {
    shadowColor: '#3A6EA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const theme = {
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows,
};
