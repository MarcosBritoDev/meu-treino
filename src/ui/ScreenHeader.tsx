import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { colors, radii, spacing } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  onOpenSettings?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onOpenSettings,
  rightAction,
  style,
}) => {
  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onBack();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={styles.iconButton}
          >
            <ArrowLeft size={24} color={colors.onSurface} strokeWidth={1.75} />
          </Pressable>
        ) : null}

        <View style={styles.titleColumn}>
          <Text
            variant="displayMedium"
            numberOfLines={1}
            style={[styles.title, !onBack ? styles.titleNoBack : undefined]}
          >
            {title}
          </Text>
          {typeof subtitle === 'string' ? (
            <Text
              variant="bodySmall"
              color="secondary"
              numberOfLines={1}
              style={[styles.subtitle, !onBack ? styles.titleNoBack : undefined]}
            >
              {subtitle}
            </Text>
          ) : subtitle ? (
            subtitle
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightAction ? (
          rightAction
        ) : onOpenSettings ? (
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ajustes e configurações"
            style={styles.iconButton}
          >
            <Settings size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: spacing.touchTargetMin,
    backgroundColor: colors.background,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginLeft: spacing.xs,
  },
  titleNoBack: {
    marginLeft: 0,
  },
  subtitle: {
    marginLeft: spacing.xs,
    marginTop: 2,
  },
  iconButton: {
    width: spacing.touchTargetMin, // 48px
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
