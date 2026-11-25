import React from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { triggerHaptic } from './haptics';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'large' | 'secondary' | 'danger' | 'text';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
  },
  large: {
    height: spacing.buttonLargeHeight,
    backgroundColor: colors.primary,
  },
  secondary: {
    height: spacing.buttonHeight,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  danger: {
    height: spacing.buttonHeight,
    backgroundColor: colors.error,
  },
  text: {
    minHeight: spacing.touchTargetMin,
    backgroundColor: colors.transparent,
    paddingHorizontal: spacing.md,
  },
};

const variantPressedStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accentPressed,
  },
  large: {
    backgroundColor: colors.accentPressed,
  },
  secondary: {
    backgroundColor: colors.surfaceBright,
  },
  danger: {
    backgroundColor: '#E05A5A',
  },
  text: {
    backgroundColor: colors.primaryContainer,
  },
};

const variantTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: colors.onPrimary,
    fontFamily: typography.bodyLarge.fontFamily,
    fontWeight: '600',
  },
  large: {
    color: colors.onPrimary,
    fontFamily: typography.headline.fontFamily,
    fontWeight: '700',
  },
  secondary: {
    color: colors.onSurface,
    fontFamily: typography.bodyLarge.fontFamily,
  },
  danger: {
    color: colors.onError,
    fontFamily: typography.bodyLarge.fontFamily,
    fontWeight: '600',
  },
  text: {
    color: colors.primary,
    fontFamily: typography.bodyLarge.fontFamily,
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isInteractive = !disabled && !loading;

  const handlePress = () => {
    if (!isInteractive) return;
    triggerHaptic(variant === 'danger' ? 'medium' : 'light');
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && isInteractive && variantPressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' || variant === 'large' || variant === 'danger'
                ? colors.onPrimary
                : colors.onSurface
            }
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
            <Text
              variant={variant === 'large' ? 'headline' : 'bodyLarge'}
              style={[
                styles.textBase,
                variantTextStyles[variant],
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: spacing.touchTargetMin,
    paddingHorizontal: spacing.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  textBase: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
