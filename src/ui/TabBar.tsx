import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  Home,
  Dumbbell,
  BookOpen,
  TrendingUp,
} from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';

/**
 * TabBar — 72px de altura
 * 4 abas na ordem exata: Início, Treinos, Biblioteca, Progresso
 * Ícone preenchido + rótulo coral (#FF7A59) na ativa; #7D746B na inativa.
 */
export const TabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const tabIcons: Record<string, React.ElementType> = {
    Inicio: Home,
    Treinos: Dumbbell,
    Biblioteca: BookOpen,
    Progresso: TrendingUp,
  };

  const tabLabels: Record<string, string> = {
    Inicio: 'Início',
    Treinos: 'Treinos',
    Biblioteca: 'Biblioteca',
    Progresso: 'Progresso',
  };

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            triggerHaptic('selection');
            navigation.navigate(route.name);
          }
        };

        const IconComponent = tabIcons[route.name] || Home;
        const label = tabLabels[route.name] || route.name;
        const color = isFocused ? colors.primary : colors.textMuted;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel || label}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={styles.iconContainer}>
              <IconComponent
                size={22}
                color={color}
                strokeWidth={isFocused ? 2.2 : 1.75}
                fill={isFocused ? color : 'none'}
              />
            </View>
            <Text
              variant="labelSmall"
              style={[
                styles.label,
                { color },
                isFocused ? styles.activeLabel : undefined,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: spacing.tabBarHeight, // 72px
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant, // #3A3531
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: spacing.touchTargetMin,
  },
  iconContainer: {
    marginBottom: 4,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.labelSmall.fontFamily,
    fontSize: 12,
  },
  activeLabel: {
    fontWeight: '600',
  },
});
