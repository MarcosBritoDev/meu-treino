import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { colors, radii, spacing } from '../theme';
import { Text } from './Text';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  durationMs?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  visible,
  durationMs = 4000, // 4 segundos
  onDismiss,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(20));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
      translateY.setValue(20);
    }
  }, [visible, durationMs, fadeAnim, translateY, onDismiss]);

  if (!visible) return null;

  const IconComponent =
    type === 'success'
      ? CheckCircle2
      : type === 'error'
      ? AlertCircle
      : Info;

  const iconColor =
    type === 'success'
      ? colors.success
      : type === 'error'
      ? colors.error
      : colors.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.toastBox}>
        <IconComponent size={20} color={iconColor} strokeWidth={1.75} />
        <Text variant="bodySmall" style={styles.text}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.tabBarHeight + spacing.margin,
    left: spacing.margin,
    right: spacing.margin,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: radii.pill,
    paddingVertical: spacing.gutter,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minHeight: spacing.touchTargetMin,
    gap: spacing.sm,
  },
  text: {
    color: colors.onSurface,
    flexShrink: 1,
  },
});
