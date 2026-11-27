import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import { colors, fontFamilies, radii, spacing } from '../theme';

export interface StyledDropdownOption {
  value: string;
  label: string;
}

export interface StyledDropdownProps {
  value: string;
  options: readonly StyledDropdownOption[] | StyledDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export const StyledDropdown: React.FC<StyledDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Selecione uma opção',
  style,
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.container, style]}>
      {/* Botão Gatilho com alvo de toque mínimo de 48dp */}
      <Pressable
        onPress={() => {
          triggerHaptic('selection');
          setOpen((prev) => !prev);
        }}
        accessibilityRole="combobox"
        accessibilityLabel={selected ? selected.label : placeholder}
        accessibilityState={{ expanded: open }}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={[styles.triggerButton, open && styles.triggerButtonOpen]}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <View style={[styles.iconWrapper, open && styles.iconRotated]}>
          <ChevronDown size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
        </View>
      </Pressable>

      {/* Lista de opções aberta */}
      {open && (
        <View style={styles.dropdownMenu}>
          <ScrollView
            nestedScrollEnabled
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {options.map((opt, index) => {
              const isSelected = opt.value === value;
              const isLast = index === options.length - 1;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    triggerHaptic('light');
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                    !isLast && styles.optionItemBorder,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Check size={18} color={colors.onPrimary} strokeWidth={2.5} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  triggerButton: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: spacing.touchTargetMin, // 48dp
    borderRadius: radii.input, // 16px
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerButtonOpen: {
    borderColor: colors.primary, // #FF7A59
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
    marginRight: 8,
  },
  placeholderText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.dmSansRegular,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    maxHeight: 230,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 230,
  },
  scrollContent: {
    flexGrow: 0,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: spacing.touchTargetMin, // 48dp
  },
  optionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  optionItemSelected: {
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurface,
    marginRight: 8,
  },
  optionTextSelected: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.dmSansMedium,
  },
});
