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
      {/* Botão Gatilho */}
      <Pressable
        onPress={() => {
          triggerHaptic('selection');
          setOpen((prev) => !prev);
        }}
        accessibilityRole="combobox"
        accessibilityLabel={selected ? selected.label : placeholder}
        accessibilityState={{ expanded: open }}
        style={styles.triggerButton}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <View style={[styles.iconWrapper, open && styles.iconRotated]}>
          <ChevronDown size={16} color="#8E8E93" />
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
                    <Check size={16} color="#1A1715" strokeWidth={2.8} />
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F5EFE8',
    marginRight: 8,
  },
  placeholderText: {
    color: '#B7ADA3',
    fontWeight: '400',
  },
  iconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: '#23201D',
    borderWidth: 1,
    borderColor: '#38332F',
    maxHeight: 220,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 220,
  },
  scrollContent: {
    flexGrow: 0,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  optionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2D2925',
  },
  optionItemSelected: {
    backgroundColor: '#FF7A59',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#F5EFE8',
    marginRight: 8,
  },
  optionTextSelected: {
    color: '#1A1715',
    fontWeight: '700',
  },
});
