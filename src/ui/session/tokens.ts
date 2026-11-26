// Tokens visuais alinhados à referência Stitch
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';

export const C = {
  bg: '#181818',
  card: '#181818',
  card2: '#242426',
  field: '#242426',
  border: '#242426',
  primary: '#F5A623',
  onPrimary: '#000000',
  primaryTint: 'rgba(245, 166, 35, 0.15)',
  goldAccent: '#F5A623',
  goldDark: '#785A1D',
  inputBg: '#242426',
  timerBg: '#2C2C2E',
  subtext: '#8E8E93',
  headerText: '#7C7C80',
  wBadgeBg: '#423414',
  wBadgeText: '#F5C451',
  fBadgeBg: '#4E2424',
  fBadgeText: '#FF8585',
  pendingCheckBg: '#272729',
  pendingCheckIcon: '#525257',
  amber: colors.pr,
  text: '#FFFFFF',
  text2: '#A1A1A6',
  muted: '#8E8E93',
  success: '#F5A623',
} as const;

export const F = {
  number: fontFamilies.outfitSemiBold,
  numberBold: fontFamilies.outfitBold,
  body: fontFamilies.dmSansRegular,
  bodyMedium: fontFamilies.dmSansMedium,
};
