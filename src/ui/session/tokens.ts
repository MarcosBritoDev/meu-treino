// Tokens visuais alinhados à referência Stitch
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';

export const C = {
  bg: '#1A1715',
  card: '#23201D',
  card2: '#2D2925',
  field: '#38332F',
  border: '#3A3531',
  primary: '#FF7A59',
  onPrimary: '#1A1715',
  primaryTint: 'rgba(255, 122, 89, 0.15)',
  goldAccent: '#FF7A59',
  goldDark: '#701500',
  inputBg: '#38332F',
  timerBg: '#2D2925',
  subtext: '#B7ADA3',
  headerText: '#7D746B',
  wBadgeBg: 'rgba(255, 122, 89, 0.12)',
  wBadgeText: '#FF7A59',
  fBadgeBg: 'rgba(255, 107, 107, 0.15)',
  fBadgeText: '#FF6B6B',
  pendingCheckBg: '#2D2925',
  pendingCheckIcon: '#7D746B',
  amber: colors.pr,
  text: '#F5EFE8',
  text2: '#B7ADA3',
  muted: '#7D746B',
  success: '#7BC98F',
} as const;

export const F = {
  number: fontFamilies.outfitSemiBold,
  numberBold: fontFamilies.outfitBold,
  body: fontFamilies.dmSansRegular,
  bodyMedium: fontFamilies.dmSansMedium,
};
