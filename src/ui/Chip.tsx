import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { triggerHaptic } from './haptics';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const handlePress = () => {
    if (disabled) return;
    triggerHaptic('selection');
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && !disabled && (selected ? styles.selectedPressed : styles.unselectedPressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text
          variant="bodySmall"
          style={[
            styles.text,
            selected ? styles.textSelected : styles.textUnselected,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    minHeight: spacing.touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  unselected: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  unselectedPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedPressed: {
    backgroundColor: colors.accentPressed,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontFamily: typography.labelSmall.fontFamily,
  },
  textUnselected: {
    color: colors.onSurfaceVariant,
  },
  textSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
