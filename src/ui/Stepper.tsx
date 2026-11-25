import React, { useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';
import { triggerHaptic } from './haptics';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  size?: 'default' | 'compact';
  onChange: (newValue: number) => void;
  style?: ViewStyle;
  formatValue?: (val: number) => string;
  accessibilityLabel?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  step = 2.5,
  min = 0,
  max = 999,
  unit,
  size = 'default',
  onChange,
  style,
  formatValue,
  accessibilityLabel = 'Ajustar valor',
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const applyChange = (direction: 'up' | 'down') => {
    let next = direction === 'up' ? value + step : value - step;
    if (next < min) next = min;
    if (next > max) next = max;

    const rounded = Math.round(next * 100) / 100;
    if (rounded !== value) {
      triggerHaptic('light');
      onChange(rounded);
    }
  };

  const startRepeat = (direction: 'up' | 'down') => {
    applyChange(direction);
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        applyChange(direction);
      }, 120);
    }, 400);
  };

  const stopRepeat = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const isAtMin = value <= min;
  const isAtMax = value >= max;

  const displayString = formatValue
    ? formatValue(value)
    : `${String(value).replace('.', ',')}${unit ? ` ${unit}` : ''}`;

  if (size === 'compact') {
    return (
      <View
        style={[styles.compactContainer, style]}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ now: value, min, max }}
      >
        <Pressable
          onPressIn={() => !isAtMin && startRepeat('down')}
          onPressOut={stopRepeat}
          disabled={isAtMin}
          hitSlop={8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Diminuir incremento"
          style={({ pressed }) => [
            styles.compactButton,
            pressed && !isAtMin && styles.roundButtonPressed,
            isAtMin && styles.roundButtonDisabled,
          ]}
        >
          <Minus size={16} color={isAtMin ? colors.textMuted : colors.onSurface} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.compactValueContainer}>
          <Text variant="numberSmall" style={styles.compactValueText} tabular>
            {displayString}
          </Text>
        </View>

        <Pressable
          onPressIn={() => !isAtMax && startRepeat('up')}
          onPressOut={stopRepeat}
          disabled={isAtMax}
          hitSlop={8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Aumentar incremento"
          style={({ pressed }) => [
            styles.compactButton,
            pressed && !isAtMax && styles.roundButtonPressed,
            isAtMax && styles.roundButtonDisabled,
          ]}
        >
          <Plus size={16} color={isAtMax ? colors.textMuted : colors.onSurface} strokeWidth={2.2} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: value, min, max }}
    >
      <Pressable
        onPressIn={() => !isAtMin && startRepeat('down')}
        onPressOut={stopRepeat}
        disabled={isAtMin}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Diminuir valor"
        style={({ pressed }) => [
          styles.roundButton,
          pressed && !isAtMin && styles.roundButtonPressed,
          isAtMin && styles.roundButtonDisabled,
        ]}
      >
        <Minus size={20} color={isAtMin ? colors.textMuted : colors.onSurface} strokeWidth={2} />
      </Pressable>

      <View style={styles.valueContainer}>
        <Text variant="displayMedium" style={styles.valueText} tabular>
          {displayString}
        </Text>
      </View>

      <Pressable
        onPressIn={() => !isAtMax && startRepeat('up')}
        onPressOut={stopRepeat}
        disabled={isAtMax}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Aumentar valor"
        style={({ pressed }) => [
          styles.roundButton,
          pressed && !isAtMax && styles.roundButtonPressed,
          isAtMax && styles.roundButtonDisabled,
        ]}
      >
        <Plus size={20} color={isAtMax ? colors.textMuted : colors.onSurface} strokeWidth={2} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: spacing.touchTargetMin,
  },
  roundButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundButtonPressed: {
    backgroundColor: colors.surfaceBright,
  },
  roundButtonDisabled: {
    opacity: 0.35,
  },
  valueContainer: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: colors.onSurface,
    textAlign: 'center',
  },

  // Modo compacto (para linha em lista de ajustes)
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.pill,
    paddingHorizontal: 4,
    paddingVertical: 3,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactValueContainer: {
    paddingHorizontal: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactValueText: {
    color: colors.onSurface,
    textAlign: 'center',
    fontSize: 14,
  },
});
