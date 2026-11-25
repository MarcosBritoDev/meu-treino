import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { colors, radii, spacing } from '../theme';

export type CardVariant = 'surface' | 'high' | 'highlight';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  style,
  onPress,
  accessibilityLabel,
}) => {
  const containerStyle = [
    styles.card,
    styles[variant],
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={containerStyle}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card, // 24px
    padding: spacing.cardPadding, // 16 a 20px (18px)
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
  },
  surface: {
    backgroundColor: colors.surfaceContainer, // #23201D
  },
  high: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
  },
  highlight: {
    backgroundColor: colors.primaryContainer, // #3A251F (destaque coral)
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
});
