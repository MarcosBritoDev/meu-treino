import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { triggerHaptic } from './haptics';
import { Text } from './Text';

export interface SegmentOption<T extends string | number> {
  label: string;
  value: T;
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              if (!isSelected) {
                triggerHaptic('selection');
                onChange(option.value);
              }
            }}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.accessibilityLabel || option.label}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && !isSelected && styles.segmentPressed,
            ]}
          >
            <Text
              variant="bodySmall"
              style={[
                styles.segmentText,
                isSelected ? styles.textSelected : styles.textUnselected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 3,
    minHeight: spacing.touchTargetMin,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    minHeight: spacing.touchTargetMin - 6,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  segmentText: {
    fontFamily: typography.labelSmall.fontFamily,
    textAlign: 'center',
  },
  textUnselected: {
    color: colors.onSurfaceVariant,
  },
  textSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
