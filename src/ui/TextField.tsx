import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  error?: string;
  showCounter?: boolean;
  maxLength?: number;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  helperText,
  error,
  showCounter = false,
  maxLength,
  value = '',
  onChangeText,
  containerStyle,
  inputStyle,
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const currentLength = (value || '').length;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="bodySmall" color="secondary" style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          Boolean(error) && styles.errorWrapper,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxFontSizeMultiplier={1.3}
          style={[styles.input, inputStyle]}
          accessible={true}
          accessibilityLabel={label || placeholder}
          accessibilityHint={error || helperText}
          {...props}
        />
      </View>

      <View style={styles.footer}>
        {error ? (
          <Text variant="labelSmall" color="error" style={styles.errorText}>
            {error}
          </Text>
        ) : helperText ? (
          <Text variant="labelSmall" color="muted">
            {helperText}
          </Text>
        ) : (
          <View style={styles.spacer} />
        )}

        {showCounter && maxLength && (
          <Text variant="labelSmall" color="muted" tabular>
            {`${currentLength}/${maxLength}`}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderRadius: radii.input, // 16px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    minHeight: spacing.touchTargetMin,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
  },
  errorWrapper: {
    borderColor: colors.error,
  },
  input: {
    color: colors.onSurface,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight: 18,
  },
  errorText: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
});
