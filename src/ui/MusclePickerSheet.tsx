import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, Lock, Check, Layers } from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import { MuscleIcon } from './MuscleIcon';
import {
  MUSCLE_REGIONS,
  MuscleRegion,
  normalizeMuscleName,
  sanitizeSecondaryMuscles,
  parseSecondaryMuscles,
  Muscle,
} from '../domain/exerciseCatalog';
import { colors, fontFamilies, radii, spacing } from '../theme';

export interface MusclePickerSheetProps {
  visible: boolean;
  mode?: 'single' | 'multi' | 'filter';
  selectedValue?: string | string[] | null;
  lockedMuscle?: string | null;
  onApply: (selected: any) => void;
  onClose: () => void;
}

export const MusclePickerSheet: React.FC<MusclePickerSheetProps> = ({
  visible,
  mode = 'single',
  selectedValue,
  lockedMuscle,
  onApply,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());

  const normLocked = lockedMuscle ? normalizeMuscleName(lockedMuscle) : null;

  // Sincroniza estado de seleção quando o modal abre ou props mudam
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      if (mode === 'multi') {
        const parsed = parseSecondaryMuscles(selectedValue);
        const filtered = parsed
          .map((m) => normalizeMuscleName(m))
          .filter((m) => !normLocked || m !== normLocked);
        setMultiSelected(new Set(filtered));
      }
    }
  }, [visible, selectedValue, mode, normLocked]);

  const cardWidth = (width - 40 - 10) / 2; // 2 colunas com margem de 20 e gap de 10

  const headerTitle = useMemo(() => {
    if (mode === 'multi') return 'Músculos secundários';
    if (mode === 'filter') return 'Filtrar por músculo';
    return 'Músculo principal';
  }, [mode]);

  const handleSingleSelect = (muscle: Muscle) => {
    triggerHaptic('selection');
    onApply(muscle);
    onClose();
  };

  const handleFilterAllSelect = () => {
    triggerHaptic('selection');
    onApply(null);
    onClose();
  };

  const handleToggleMulti = (muscle: Muscle) => {
    if (normLocked && muscle === normLocked) return;

    triggerHaptic('selection');
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) {
        next.delete(muscle);
      } else {
        next.add(muscle);
      }
      return next;
    });
  };

  const handleClearMulti = () => {
    triggerHaptic('light');
    setMultiSelected(new Set());
  };

  const handleConfirmMulti = () => {
    triggerHaptic('light');
    const sanitized = sanitizeSecondaryMuscles(
      lockedMuscle || '',
      Array.from(multiSelected)
    );
    onApply(sanitized);
    onClose();
  };

  const normalizedSingle =
    mode !== 'multi' && selectedValue && typeof selectedValue === 'string'
      ? normalizeMuscleName(selectedValue)
      : null;

  const isFilterAllSelected =
    mode === 'filter' &&
    (!selectedValue ||
      selectedValue === 'Todos' ||
      (typeof selectedValue === 'string' && selectedValue.trim() === ''));

  // Filtra regiões e músculos com base na busca
  const filteredRegions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result: Array<{ region: MuscleRegion; muscles: Muscle[] }> = [];

    (Object.entries(MUSCLE_REGIONS) as [MuscleRegion, readonly Muscle[]][]).forEach(
      ([region, muscles]) => {
        const matching = muscles.filter((m) =>
          !query ? true : m.toLowerCase().includes(query)
        );
        if (matching.length > 0) {
          result.push({ region, muscles: matching });
        }
      }
    );

    return result;
  }, [searchQuery]);

  const hasAnyMatch = filteredRegions.length > 0;

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.overlay}>
          {/* Fundo escuro 65% que fecha ao toque */}
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar painel"
          />

          <View
            style={[
              styles.sheetContainer,
              {
                maxHeight: height * 0.88,
                paddingBottom:
                  mode === 'multi' ? 0 : Math.max(spacing.xl, insets.bottom + 16),
              },
            ]}
          >
            {/* Alça central de arrasto */}
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            {/* Cabeçalho */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              </Pressable>
            </View>

            {/* Campo de busca rápido */}
            <View style={styles.searchContainer}>
              <Search size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar músculo..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
                </Pressable>
              )}
            </View>

            {/* Corpo rolável */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                mode === 'multi' && { paddingBottom: 16 },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {/* No modo 'filter' (sem busca ativa), botão "Todos os músculos" */}
              {mode === 'filter' && !searchQuery.trim() && (
                <Pressable
                  onPress={handleFilterAllSelect}
                  style={[
                    styles.filterAllBtn,
                    isFilterAllSelected && styles.filterAllBtnSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFilterAllSelected }}
                  accessibilityLabel="Todos os músculos"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <View style={styles.filterAllLeft}>
                    <Layers
                      size={20}
                      color={isFilterAllSelected ? colors.primary : colors.onSurfaceVariant}
                      strokeWidth={1.75}
                    />
                    <Text
                      style={[
                        styles.filterAllText,
                        isFilterAllSelected && styles.filterAllTextSelected,
                      ]}
                    >
                      Todos os músculos
                    </Text>
                  </View>
                  {isFilterAllSelected && (
                    <Check size={16} color={colors.primary} strokeWidth={2.5} />
                  )}
                </Pressable>
              )}

              {/* Lista agrupada pelas 4 regiões em grade 2 colunas */}
              {hasAnyMatch ? (
                filteredRegions.map(({ region, muscles }, regionIndex) => (
                  <View key={region} style={styles.regionSection}>
                    <Text
                      style={[
                        styles.regionTitle,
                        regionIndex === 0 && styles.firstRegionTitle,
                      ]}
                    >
                      {region}
                    </Text>
                    <View style={styles.grid}>
                      {muscles.map((muscle) => {
                        const isLocked = Boolean(normLocked && muscle === normLocked);
                        const isSelected =
                          mode === 'multi'
                            ? multiSelected.has(muscle)
                            : normalizedSingle === muscle;

                        return (
                          <Pressable
                            key={muscle}
                            disabled={isLocked}
                            onPress={() => {
                              if (mode === 'multi') {
                                handleToggleMulti(muscle);
                              } else {
                                handleSingleSelect(muscle);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.card,
                              { width: cardWidth },
                              isSelected && styles.cardSelected,
                              isLocked && styles.cardLocked,
                              pressed && !isLocked && styles.cardPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: isSelected,
                              disabled: isLocked,
                            }}
                            accessibilityLabel={
                              isLocked
                                ? `${muscle}, músculo principal (bloqueado)`
                                : muscle
                            }
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <View style={styles.cardLeft}>
                              <MuscleIcon
                                muscle={muscle}
                                active={isSelected}
                                muted={isLocked}
                                size={26}
                              />
                              <Text
                                style={[
                                  styles.cardText,
                                  isSelected && styles.cardTextSelected,
                                  isLocked && styles.cardTextLocked,
                                ]}
                                numberOfLines={1}
                              >
                                {muscle}
                              </Text>
                            </View>

                            {isLocked ? (
                              <Lock
                                size={14}
                                color={colors.textMuted}
                                strokeWidth={2}
                              />
                            ) : isSelected ? (
                              <Check
                                size={16}
                                color={colors.primary}
                                strokeWidth={2.5}
                              />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Nenhum músculo encontrado para "{searchQuery}"
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Rodapé fixo no modo 'multi' */}
            {mode === 'multi' && (
              <View
                style={[
                  styles.multiFooter,
                  { paddingBottom: Math.max(spacing.lg, insets.bottom + 12) },
                ]}
              >
                <Pressable
                  onPress={handleClearMulti}
                  style={styles.clearBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar seleção de secundários"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.clearBtnText}>Limpar</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmMulti}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    pressed && styles.confirmBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar músculos secundários"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.confirmBtnText}>
                    {multiSelected.size > 0
                      ? `Confirmar (${multiSelected.size})`
                      : 'Salvar sem secundários'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay, // rgba(0, 0, 0, 0.65)
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet, // 28px
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    paddingHorizontal: spacing.margin, // 20px
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.gutter,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.outline, // #7D746B
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  closeBtn: {
    width: spacing.touchTargetMin, // 48dp
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    minHeight: spacing.touchTargetMin, // 48dp
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderRadius: radii.input, // 16px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurface,
    paddingVertical: 10,
  },
  clearSearchBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  filterAllBtn: {
    minHeight: spacing.touchTargetMin, // 48dp
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.input,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterAllBtnSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  filterAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterAllText: {
    fontSize: 15,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  filterAllTextSelected: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitBold,
  },
  regionSection: {
    marginBottom: 14,
  },
  regionTitle: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
    marginTop: 6,
  },
  firstRegionTitle: {
    marginTop: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 54, // Touch target generoso
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSelected: {
    backgroundColor: colors.primaryContainer, // #3A251F
    borderColor: colors.primary, // #FF7A59
  },
  cardPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerHighest,
  },
  cardLocked: {
    opacity: 0.45,
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.surfaceContainer,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 4,
  },
  cardText: {
    fontSize: 13,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
    flex: 1,
  },
  cardTextSelected: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitBold,
  },
  cardTextLocked: {
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  multiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  clearBtn: {
    minHeight: spacing.touchTargetMin, // 48dp
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  confirmBtn: {
    minHeight: 52, // 52dp
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.primary, // #FF7A59
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  confirmBtnPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.995 }],
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onPrimary, // #1A1715
  },
});
