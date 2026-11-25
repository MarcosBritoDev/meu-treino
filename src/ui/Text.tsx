import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { colors, typography } from '../theme';

export type TextVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'headline'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelSmall'
  | 'numberMedium'
  | 'numberSmall';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'coral'
  | 'pr'
  | 'error'
  | 'success'
  | 'dark';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  style?: StyleProp<TextStyle>;
  tabular?: boolean;
}

export const Text: React.FC<AppTextProps> = ({
  variant = 'bodyMedium',
  color = 'primary',
  style,
  children,
  tabular = false,
  ...props
}) => {
  const textColorMap: Record<TextColor, string> = {
    primary: colors.onSurface,
    secondary: colors.onSurfaceVariant,
    muted: colors.textMuted,
    coral: colors.primary,
    pr: colors.pr,
    error: colors.error,
    success: colors.success,
    dark: colors.onPrimary,
  };

  const fontStyle = typography[variant] || typography.bodyMedium;
  const textColor = textColorMap[color] || colors.onSurface;

  return (
    <RNText
      maxFontSizeMultiplier={1.3}
      style={[
        fontStyle,
        { color: textColor },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
