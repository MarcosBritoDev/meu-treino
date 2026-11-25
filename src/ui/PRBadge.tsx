import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Trophy } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';
import { Text } from './Text';

export interface PRBadgeProps {
  label?: string;
  style?: ViewStyle;
}

/**
 * PRBadge — Chip âmbar exclusivo para Personal Record (PR).
 * Utiliza o tom âmbar #FFC46B e ícone de troféu com traço 1.75.
 */
export const PRBadge: React.FC<PRBadgeProps> = ({
  label = 'Recorde pessoal',
  style,
}) => {
  return (
    <View
      style={[styles.badge, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Conquista: ${label}`}
    >
      <Trophy size={14} color={colors.onPr} strokeWidth={1.75} style={styles.icon} />
      <Text variant="labelSmall" style={styles.label}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pr, // #FFC46B (âmbar)
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    color: colors.onPr, // #1A1715
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '700',
  },
});
