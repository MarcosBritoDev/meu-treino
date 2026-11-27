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
  Settings,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  Weight,
  Cable,
  Cpu,
  User,
  Boxes,
  Sliders,
  CircleDot,
  ShieldCheck,
  HeartPulse,
  Ellipsis,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  Text,
  triggerHaptic,
  Button,
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
  getEmptyStateDescription,
  normalizeSearchText,
} from '../domain/search';
import {
  filterExercisesByMuscle,
  parseSecondaryMuscles,
  normalizeEquipmentName,
  Equipment,
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

  const handleResetFilters = useCallback(() => {
    triggerHaptic('light');
    setSearchText('');
    setDebouncedQuery('');
    setSelectedMuscle(null);
    setSelectedEquipment(null);
  }, []);

  const handleOpenSettings = useCallback(() => {
    triggerHaptic('light');
    navigation.navigate('Ajustes');
  }, [navigation]);

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

  const renderEquipmentIcon = (equipment: string) => {
    const norm = normalizeEquipmentName(equipment);
    switch (norm) {
      case 'Barra':
        return <Weight size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Halteres':
        return <Dumbbell size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Máquina':
        return <Boxes size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Cabo / Polia':
        return <Cable size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Peso corporal':
        return <User size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Smith':
        return <Sliders size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Kettlebell':
        return <CircleDot size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Barra de segurança':
        return <ShieldCheck size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Cardio':
        return <HeartPulse size={20} color={colors.primary} strokeWidth={1.75} />;
      case 'Outro':
      default:
        return <Ellipsis size={20} color={colors.primary} strokeWidth={1.75} />;
    }
  };

  const getSubtitle = (ex: ExerciseItemData) => {
    const secondary = parseSecondaryMuscles(ex.secondaryMuscles);
    if (secondary.length > 0) {
      return `${ex.muscleGroup} · ${secondary.join(', ')} · ${ex.equipment}`;
    }
    return `${ex.muscleGroup} · ${ex.equipment}`;
  };

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
        <View style={styles.cardLeft}>
          <View style={styles.iconBox}>
            {renderEquipmentIcon(ex.equipment)}
          </View>
          <View style={styles.cardDetails}>
            <View style={styles.nameRow}>
              <Text
                variant="bodyLarge"
                numberOfLines={1}
                style={styles.exerciseName}
              >
                {ex.name}
              </Text>
              {isSecondary && (
                <View style={styles.secondaryBadge}>
                  <Text style={styles.secondaryBadgeText}>
                    secundário
                  </Text>
                </View>
              )}
            </View>
            <Text
              variant="bodySmall"
              color="secondary"
              numberOfLines={1}
              style={styles.exerciseSubtitle}
            >
              {getSubtitle(ex)}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          {prText ? (
            <View style={styles.prContainer}>
              <Text variant="labelSmall" color="muted" style={styles.prLabel}>
                Melhor
              </Text>
              <Text variant="bodyMedium" tabular style={styles.prValue}>
                {prText}
              </Text>
            </View>
          ) : null}
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerTitleColumn}>
          <Text variant="displayMedium" style={styles.headerTitle}>
            Biblioteca
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.headerSubtitle}>
            Catálogo de movimentos
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={handleOpenSettings}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            style={({ pressed }) => [
              styles.gearButton,
              pressed && styles.gearButtonPressed,
            ]}
          >
            <Settings size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
          </Pressable>

          <Pressable
            onPress={() => handleOpenNewExercise()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar novo exercício"
            style={({ pressed }) => [
              styles.newButton,
              pressed && styles.newButtonPressed,
            ]}
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.2} />
            <Text variant="bodyMedium" style={styles.newButtonText}>
              Novo
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. CAMPO DE BUSCA */}
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
              style={styles.clearButton}
            >
              <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. BOTÕES DE FILTRO LADO A LADO */}
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
          <ChevronDown
            size={16}
            color={isMuscleActive ? colors.primary : colors.onSurfaceVariant}
            strokeWidth={2}
          />
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
            {isEquipActive ? `${selectedEquipment}` : 'Equipamento'}
          </Text>
          <ChevronDown
            size={16}
            color={isEquipActive ? colors.primary : colors.onSurfaceVariant}
            strokeWidth={2}
          />
        </Pressable>

        {hasActiveFilters && (
          <Pressable
            onPress={handleResetFilters}
            style={styles.clearFilterBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Limpar filtros e busca"
          >
            <Text style={styles.clearFilterText}>Limpar</Text>
          </Pressable>
        )}
      </View>

      {/* 4. CONTEÚDO PRINCIPAL (LISTA, ESQUELETO OU BUSCA VAZIA) */}
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
            const emptyDescription = getEmptyStateDescription(
              isLibraryEmpty,
              currentTerm,
              selectedMuscle || 'Todos'
            );

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
                      title="Limpar busca"
                      variant="text"
                      onPress={handleResetFilters}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitleColumn: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gearButton: {
    width: spacing.touchTargetMin, // 48px
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearButtonPressed: {
    opacity: 0.6,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: spacing.touchTargetMin, // 48px
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer, // #3A251F
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.4)',
    justifyContent: 'center',
  },
  newButtonPressed: {
    backgroundColor: 'rgba(255, 122, 89, 0.25)',
  },
  newButtonText: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    fontSize: 14,
    color: colors.primary,
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
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.xs + 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.surfaceContainerHigh,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.bodyLarge.fontFamily,
    fontWeight: '500',
    color: colors.onSurface,
    flexShrink: 1,
  },
  secondaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  secondaryBadgeText: {
    fontSize: 10,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  exerciseSubtitle: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingLeft: 4,
  },
  prContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  prLabel: {
    fontSize: 11,
    lineHeight: 12,
    marginBottom: 2,
  },
  prValue: {
    fontSize: 14,
    lineHeight: 16,
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    color: colors.onSurface,
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
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
