import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  Trophy,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  Text,
  triggerHaptic,
  Button,
  ScreenHeader,
  MuscleIcon,
  EmptySearchIllustration,
  MusclePickerSheet,
  EquipmentPickerSheet,
} from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import { getExercisesWithPR } from '../db/library';
import {
  ExerciseItemData,
  filterAndGroupExercises,
  formatGroupHeader,
  formatExercisePR,
  getEmptyStateTitle,
  normalizeSearchText,
} from '../domain/search';
import {
  filterExercisesByMuscle,
  parseSecondaryMuscles,
  normalizeEquipmentName,
} from '../domain/exerciseCatalog';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ListItem =
  | { type: 'header'; id: string; title: string; count: number }
  | { type: 'item'; id: string; exercise: ExerciseItemData; isSecondary?: boolean };

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { unit } = useSettingsStore();

  const [exercises, setExercises] = useState<ExerciseItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Estados dos filtros modais
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [musclePickerVisible, setMusclePickerVisible] = useState(false);
  const [equipmentPickerVisible, setEquipmentPickerVisible] = useState(false);

  // Atualiza a busca com debounce de 150 ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Carrega exercícios do banco SQLite local
  const loadExercises = useCallback(() => {
    try {
      const data = getExercisesWithPR();
      setExercises(data);
    } catch (err) {
      console.warn('Erro ao carregar exercícios:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  const isMuscleActive = Boolean(selectedMuscle && selectedMuscle !== 'Todos');
  const isEquipActive = Boolean(selectedEquipment && selectedEquipment !== 'Todos');
  const isSearchActive = debouncedQuery.trim().length > 0 || searchText.trim().length > 0;
  const hasActiveFilters = isMuscleActive || isEquipActive || isSearchActive;

  // Filtra e agrupa conforme busca, equipamento e músculo
  const groupedSections = useMemo<
    Array<{
      group: string;
      data: ExerciseItemData[];
      isSecondarySection?: boolean;
    }>
  >(() => {
    // 1. Filtro base: arquivados + equipamento + busca de texto
    const filteredBase = exercises.filter((ex) => {
      if (ex.archived) return false;

      // Filtro de equipamento
      if (isEquipActive && selectedEquipment) {
        const normExEquip = normalizeEquipmentName(ex.equipment);
        const normSelected = normalizeEquipmentName(selectedEquipment);
        if (normExEquip !== normSelected) {
          return false;
        }
      }

      // Filtro por texto de busca
      if (debouncedQuery.trim().length > 0) {
        const q = normalizeSearchText(debouncedQuery);
        const nameNorm = normalizeSearchText(ex.name);
        const muscleNorm = normalizeSearchText(ex.muscleGroup);
        const equipNorm = normalizeSearchText(ex.equipment);
        const secList = parseSecondaryMuscles(ex.secondaryMuscles);
        const secNorm = secList.map((s) => normalizeSearchText(s)).join(' ');
        if (
          !nameNorm.includes(q) &&
          !muscleNorm.includes(q) &&
          !equipNorm.includes(q) &&
          !secNorm.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

    // 2. Quando houver filtro de músculo ativo, utiliza filterExercisesByMuscle
    if (isMuscleActive && selectedMuscle) {
      const { primary, secondary } = filterExercisesByMuscle(filteredBase, selectedMuscle);
      primary.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      secondary.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      const sections: Array<{
        group: string;
        data: ExerciseItemData[];
        isSecondarySection?: boolean;
      }> = [];

      if (primary.length > 0) {
        sections.push({
          group: `Foco principal em ${selectedMuscle}`,
          data: primary,
          isSecondarySection: false,
        });
      }

      if (secondary.length > 0) {
        sections.push({
          group: `Também trabalham ${selectedMuscle} (secundário)`,
          data: secondary,
          isSecondarySection: true,
        });
      }

      return sections;
    }

    // 3. Sem filtro de músculo ativo: agrupa pelos grupos musculares ordenados
    const standard = filterAndGroupExercises(filteredBase, 'Todos', '');
    return standard.map((s) => ({
      ...s,
      isSecondarySection: false,
    }));
  }, [exercises, isMuscleActive, selectedMuscle, isEquipActive, selectedEquipment, debouncedQuery]);

  // Contagem total de exercícios filtrados
  const totalFilteredCount = useMemo(() => {
    return groupedSections.reduce((acc, sec) => acc + sec.data.length, 0);
  }, [groupedSections]);

  // Achata as seções para alimentar o FlashList com máxima performance virtualizada
  const flatListItems = useMemo<ListItem[]>(() => {
    const list: ListItem[] = [];
    for (const section of groupedSections) {
      list.push({
        type: 'header',
        id: `header-${section.group}`,
        title: formatGroupHeader(section.group, section.data.length),
        count: section.data.length,
      });
      for (const ex of section.data) {
        list.push({
          type: 'item',
          id: `${section.isSecondarySection ? 'sec-' : 'prim-'}${ex.id}`,
          exercise: ex,
          isSecondary: Boolean(section.isSecondarySection),
        });
      }
    }
    return list;
  }, [groupedSections]);

  const handleClearSearch = useCallback(() => {
    triggerHaptic('light');
    setSearchText('');
    setDebouncedQuery('');
  }, []);

  // Reseta apenas os filtros modais (músculo e equipamento), preservando a busca por texto
  const handleResetFilters = useCallback(() => {
    triggerHaptic('light');
    setSelectedMuscle(null);
    setSelectedEquipment(null);
  }, []);

  const handleOpenNewExercise = useCallback((initialName?: string) => {
    triggerHaptic('light');
    navigation.navigate('NewExercise', {
      initialName: initialName && initialName.trim() ? initialName.trim() : undefined,
    });
  }, [navigation]);

  const handleExercisePress = useCallback(
    (exerciseId: string) => {
      triggerHaptic('light');
      navigation.navigate('ExerciseDetail', { exerciseId });
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeaderContainer}>
          <Text variant="labelSmall" style={styles.sectionHeaderText}>
            {item.title}
          </Text>
        </View>
      );
    }

    const ex = item.exercise;
    const isSecondary = item.isSecondary;
    const prText = formatExercisePR(ex.bestWeight, ex.bestReps, unit);
    const secondaryList = parseSecondaryMuscles(ex.secondaryMuscles);

    return (
      <Pressable
        onPress={() => handleExercisePress(ex.id)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${ex.name}, ${ex.muscleGroup}, ${ex.equipment}${
          prText ? `, melhor marca ${prText}` : ''
        }`}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Identificador anatômico vetorial com container tonal discreto */}
        <View style={styles.iconBox}>
          <MuscleIcon muscle={ex.muscleGroup} size={28} />
        </View>

        <View style={styles.cardContent}>
          {/* Linha 1: Nome do exercício + PR histórico em âmbar */}
          <View style={styles.cardHeaderRow}>
            <Text
              variant="bodyLarge"
              numberOfLines={1}
              style={styles.exerciseName}
            >
              {ex.name}
            </Text>

            <View style={styles.cardHeaderRight}>
              {prText ? (
                <View
                  style={styles.prBadge}
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLabel={`Melhor marca: ${prText}`}
                >
                  <Trophy size={13} color={colors.pr} strokeWidth={2} />
                  <Text variant="labelSmall" tabular style={styles.prValue}>
                    {prText}
                  </Text>
                </View>
              ) : null}
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </View>
          </View>

          {/* Linha 2: Equipamento em tag neutra garantida (sem truncamento) + Músculos */}
          <View style={styles.cardMetaRow}>
            <View style={styles.equipmentPill}>
              <Text style={styles.equipmentPillText}>
                {ex.equipment}
              </Text>
            </View>

            <Text
              variant="bodySmall"
              color="secondary"
              numberOfLines={1}
              style={styles.muscleMetaText}
            >
              {ex.muscleGroup}
              {secondaryList.length > 0 ? ` · ${secondaryList.join(', ')}` : ''}
            </Text>

            {isSecondary && (
              <View style={styles.secondaryBadge}>
                <Text style={styles.secondaryBadgeText}>
                  secundário
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO PADRONIZADO (ScreenHeader) COM CONTADOR DINÂMICO E BOTÃO NOVO */}
      <ScreenHeader
        title="Biblioteca"
        subtitle={
          <Text variant="bodySmall" color="secondary" tabular style={styles.headerSubtitle}>
            {hasActiveFilters
              ? `${totalFilteredCount} ${totalFilteredCount === 1 ? 'encontrado' : 'encontrados'}`
              : `${exercises.length} ${exercises.length === 1 ? 'exercício' : 'exercícios'}`}
          </Text>
        }
        rightAction={
          <Pressable
            onPress={() => handleOpenNewExercise()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar novo exercício"
            hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
            style={({ pressed }) => [
              styles.newButton,
              pressed && styles.newButtonPressed,
            ]}
          >
            <Plus size={16} color={colors.onPrimary} strokeWidth={2.4} />
            <Text variant="bodyMedium" style={styles.newButtonText}>
              Novo
            </Text>
          </Pressable>
        }
      />

      {/* 2. CAMPO DE BUSCA COM TOUCH TARGET >= 48dp */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconWrapper}>
            <Search size={18} color={colors.textMuted} strokeWidth={1.75} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar exercício"
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxFontSizeMultiplier={1.3}
            accessible={true}
            accessibilityLabel="Campo de busca de exercícios"
          />

          {searchText.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearButton}
            >
              <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. BOTÕES DE FILTRO SIMÉTRICOS COM LIMPEZA INDIVIDUAL RÁPIDA (minHeight: 48) */}
      <View style={styles.filterBar}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setMusclePickerVisible(true);
          }}
          style={[
            styles.filterBtn,
            isMuscleActive ? styles.filterBtnActive : styles.filterBtnInactive,
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por músculo, atualmente ${selectedMuscle || 'Todos'}`}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.filterBtnText,
              isMuscleActive ? styles.filterBtnTextActive : styles.filterBtnTextInactive,
            ]}
          >
            {isMuscleActive ? `Músculo: ${selectedMuscle}` : 'Músculo: Todos'}
          </Text>

          {isMuscleActive ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setSelectedMuscle(null);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Remover filtro de músculo"
              style={styles.filterChipClear}
            >
              <X size={15} color={colors.primary} strokeWidth={2.4} />
            </Pressable>
          ) : (
            <ChevronDown
              size={16}
              color={isMuscleActive ? colors.primary : colors.onSurfaceVariant}
              strokeWidth={2}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setEquipmentPickerVisible(true);
          }}
          style={[
            styles.filterBtn,
            isEquipActive ? styles.filterBtnActive : styles.filterBtnInactive,
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por equipamento, atualmente ${selectedEquipment || 'Todos'}`}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.filterBtnText,
              isEquipActive ? styles.filterBtnTextActive : styles.filterBtnTextInactive,
            ]}
          >
            {isEquipActive ? `Equipamento: ${selectedEquipment}` : 'Equipamento: Todos'}
          </Text>

          {isEquipActive ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                setSelectedEquipment(null);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Remover filtro de equipamento"
              style={styles.filterChipClear}
            >
              <X size={15} color={colors.primary} strokeWidth={2.4} />
            </Pressable>
          ) : (
            <ChevronDown
              size={16}
              color={isEquipActive ? colors.primary : colors.onSurfaceVariant}
              strokeWidth={2}
            />
          )}
        </Pressable>

        {(isMuscleActive || isEquipActive) && (
          <Pressable
            onPress={handleResetFilters}
            style={styles.clearFilterBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Limpar filtros de músculo e equipamento"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.clearFilterText}>Limpar</Text>
          </Pressable>
        )}
      </View>

      {/* 4. CONTEÚDO PRINCIPAL (LISTA FLASHLIST, ESQUELETO OU BUSCA VAZIA) */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3, 4].map((key) => (
              <View key={key} style={styles.skeletonCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTexts}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonSubtitle} />
                </View>
                <View style={styles.skeletonRight} />
              </View>
            ))}
          </View>
        ) : flatListItems.length === 0 ? (
          (() => {
            const isLibraryEmpty = exercises.length === 0;
            const currentTerm = (debouncedQuery || searchText).trim();
            const emptyTitle = getEmptyStateTitle(isLibraryEmpty);

            // Descrição contextual precisa mencionando tanto músculo quanto equipamento quando ativos
            let emptyDescription = 'Cadastre seu primeiro exercício para começar a montar seus treinos.';
            if (!isLibraryEmpty) {
              if (currentTerm.length > 0) {
                if (isMuscleActive && isEquipActive) {
                  emptyDescription = `Não encontramos "${currentTerm}" para ${selectedMuscle} com ${selectedEquipment}.`;
                } else if (isMuscleActive) {
                  emptyDescription = `Não encontramos "${currentTerm}" para o grupo ${selectedMuscle}.`;
                } else if (isEquipActive) {
                  emptyDescription = `Não encontramos "${currentTerm}" com equipamento ${selectedEquipment}.`;
                } else {
                  emptyDescription = `Não encontramos "${currentTerm}" na sua biblioteca.`;
                }
              } else if (isMuscleActive && isEquipActive) {
                emptyDescription = `Não encontramos exercícios de ${selectedMuscle} com equipamento ${selectedEquipment}.`;
              } else if (isMuscleActive) {
                emptyDescription = `Não encontramos exercícios para o grupo ${selectedMuscle}.`;
              } else if (isEquipActive) {
                emptyDescription = `Não encontramos exercícios com equipamento ${selectedEquipment}.`;
              } else {
                emptyDescription = 'Não encontramos resultados para os filtros selecionados na sua biblioteca.';
              }
            }

            return (
              <View style={styles.emptyContainer}>
                <EmptySearchIllustration size={144} style={styles.emptyIllustration} />
                <Text variant="headline" style={styles.emptyTitle}>
                  {emptyTitle}
                </Text>
                <Text
                  variant="bodyMedium"
                  color="secondary"
                  numberOfLines={2}
                  style={styles.emptySubtitle}
                >
                  {emptyDescription}
                </Text>
                <View style={styles.emptyActions}>
                  <Button
                    title="+ Cadastrar exercício"
                    variant="primary"
                    onPress={() => handleOpenNewExercise(currentTerm)}
                    style={styles.emptyPrimaryButton}
                  />
                  {!isLibraryEmpty && (
                    <Button
                      title="Limpar busca e filtros"
                      variant="text"
                      onPress={() => {
                        handleClearSearch();
                        handleResetFilters();
                      }}
                      style={styles.emptySecondaryButton}
                    />
                  )}
                </View>
              </View>
            );
          })()
        ) : (
          <FlashList
            data={flatListItems}
            renderItem={renderItem}
            getItemType={(item) => item.type}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.flashListContent,
              { paddingBottom: insets.bottom + spacing.tabBarHeight + spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* MODAIS DE FILTRO */}
      <MusclePickerSheet
        visible={musclePickerVisible}
        mode="filter"
        selectedValue={selectedMuscle}
        onApply={(muscle) => {
          setSelectedMuscle(muscle || null);
        }}
        onClose={() => setMusclePickerVisible(false)}
      />

      <EquipmentPickerSheet
        visible={equipmentPickerVisible}
        mode="filter"
        selectedEquipment={selectedEquipment}
        onSelect={(eq) => {
          setSelectedEquipment(eq === 'Todos' ? null : eq);
        }}
        onClose={() => setEquipmentPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #1A1715
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
    fontFamily: typography.bodyMedium.fontFamily,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: spacing.touchTargetMin, // 48px
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.primary, // #FF7A59 coral vivo
    justifyContent: 'center',
  },
  newButtonPressed: {
    backgroundColor: colors.accentPressed, // #E8654A
  },
  newButtonText: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    fontSize: 14,
    color: colors.onPrimary, // #1A1715
  },
  searchContainer: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderRadius: radii.input, // 16px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    paddingHorizontal: spacing.sm,
  },
  searchIconWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    paddingTop: 4,
    paddingBottom: spacing.xs + 2,
    gap: spacing.xs + 2,
  },
  filterBtn: {
    flex: 1,
    minHeight: spacing.touchTargetMin, // 48px
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  filterBtnInactive: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterBtnActive: {
    backgroundColor: colors.primaryContainer, // #3A251F
    borderWidth: 1,
    borderColor: colors.primary, // #FF7A59
  },
  filterBtnText: {
    fontSize: 13,
    flexShrink: 1,
    marginRight: 4,
  },
  filterBtnTextInactive: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  filterBtnTextActive: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    color: colors.primary, // #FF7A59
  },
  filterChipClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFilterBtn: {
    minHeight: spacing.touchTargetMin, // 48px
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFilterText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  listContainer: {
    flex: 1,
  },
  flashListContent: {
    paddingHorizontal: spacing.margin,
  },
  sectionHeaderContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '600',
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.card, // 24px
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.xs + 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.surfaceContainerHigh,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    minWidth: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    color: colors.onSurface,
    marginRight: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 196, 107, 0.12)', // Fundo sutil âmbar
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 107, 0.35)',
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  prValue: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: typography.headline.fontFamily,
    fontWeight: '700',
    color: colors.pr, // #FFC46B âmbar sagrado
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    minWidth: 0,
  },
  equipmentPill: {
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderRadius: radii.sm, // 8px
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    flexShrink: 0,
  },
  equipmentPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  muscleMetaText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
    marginRight: 6,
  },
  secondaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexShrink: 0,
  },
  secondaryBadgeText: {
    fontSize: 11, // At least 11sp (evita 10sp)
    lineHeight: 14,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIllustration: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  emptyActions: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyPrimaryButton: {
    width: '100%',
  },
  emptySecondaryButton: {
    width: '100%',
  },
  skeletonContainer: {
    paddingHorizontal: spacing.margin,
    gap: spacing.xs + 2,
    paddingTop: spacing.sm,
  },
  skeletonCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonTexts: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  skeletonTitle: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonSubtitle: {
    width: '35%',
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonRight: {
    width: 44,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
});
