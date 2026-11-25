import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { colors, radii, spacing } from '../theme';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateAction {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {icon || <Dumbbell size={32} color={colors.primary} strokeWidth={1.75} />}
      </View>

      <Text variant="headline" style={styles.title}>
        {title}
      </Text>

      <Text variant="bodyMedium" color="secondary" style={styles.description}>
        {description}
      </Text>

      {(primaryAction || secondaryAction) && (
        <View style={styles.actionContainer}>
          {primaryAction && (
            <Button
              title={primaryAction.title}
              variant={primaryAction.variant || 'primary'}
              onPress={primaryAction.onPress}
              style={styles.actionButton}
            />
          )}

          {secondaryAction && (
            <Button
              title={secondaryAction.title}
              variant={secondaryAction.variant || 'secondary'}
              onPress={secondaryAction.onPress}
              style={styles.actionButton}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer, // #3A251F
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
});
