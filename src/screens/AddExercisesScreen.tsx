import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Search,
  X,
  Check,
  Plus,
  Dumbbell,
  RotateCcw,
  ChevronDown,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  Text,
  Button,
  triggerHaptic,
  MusclePickerSheet,
  EquipmentPickerSheet,
  MuscleIcon,
} from '../ui';
import {
  normalizeSearchText,
  ORDERED_MUSCLE_GROUPS,
  formatGroupHeader,
} from '../domain/search';
import {
  filterExercisesByMuscle,
  parseSecondaryMuscles,
  normalizeEquipmentName,
  Equipment,
} from '../domain/exerciseCatalog';
import {
  getExercisesForAddSelection,
  ExerciseSelectionItem,
} from '../db/library';
import { getExpoDb } from '../db/client';

type RouteParams = RouteProp<RootStackParamList, 'AddExercises'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ListItem =
  | { type: 'header'; id: string; title: string; count: number }
  | { type: 'item'; id: string; exercise: ExerciseSelectionItem; isSecondary?: boolean };

export const AddExercisesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteParams>();
  const workoutId = route.params?.workoutId;
  const sessionId = route.params?.sessionId;
  const fromScreen = route.params?.fromScreen;
  const replaceTargetWorkoutExerciseId = route.params?.replaceTargetWorkoutExerciseId;
  const existingExerciseIds = useMemo(
    () => new Set(route.params?.existingExerciseIds || []),
    [route.params?.existingExerciseIds]
  );

  const [allExercises, setAllExercises] = useState<ExerciseSelectionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Array para preservar ordem de seleção

  // Filtros modais e busca
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [musclePickerVisible, setMusclePickerVisible] = useState(false);
  const [equipmentPickerVisible, setEquipmentPickerVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Carrega exercícios do banco SQLite
  const loadExercises = useCallback(() => {
    try {
      const list = getExercisesForAddSelection();
      setAllExercises(list);
    } catch (err) {
      console.warn('Erro ao carregar exercícios:', err);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Debounce de 150ms na busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const isMuscleActive = Boolean(selectedMuscle && selectedMuscle !== 'Todos');
  const isEquipActive = Boolean(selectedEquipment && selectedEquipment !== 'Todos');
  const isSearchActive = debouncedQuery.trim().length > 0 || searchQuery.trim().length > 0;
  const hasActiveFilters = isMuscleActive || isEquipActive || isSearchActive;

  // Filtra e agrupa conforme busca, equipamento e músculo
  const groupedSections = useMemo(() => {
    // 1. Filtro base: equipamento + busca de texto
    const filteredBase = allExercises.filter((ex) => {
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
        data: ExerciseSelectionItem[];
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

    // 3. Sem filtro de músculo ativo: agrupa pelos grupos musculares padrão
    const sections: Array<{
      group: string;
      data: ExerciseSelectionItem[];
      isSecondarySection?: boolean;
    }> = [];

    for (const group of ORDERED_MUSCLE_GROUPS) {
      const itemsInGroup = filteredBase.filter((ex) => ex.muscleGroup === group);
      if (itemsInGroup.length > 0) {
        itemsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        sections.push({
          group,
          data: itemsInGroup,
          isSecondarySection: false,
        });
      }
    }

    const customGroups = Array.from(
      new Set(
        filteredBase
          .map((e) => e.muscleGroup)
          .filter((g) => !ORDERED_MUSCLE_GROUPS.includes(g as any))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    for (const group of customGroups) {
      const itemsInGroup = filteredBase.filter((ex) => ex.muscleGroup === group);
      if (itemsInGroup.length > 0) {
        itemsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        sections.push({
          group,
          data: itemsInGroup,
          isSecondarySection: false,
        });
      }
    }

    return sections;
  }, [allExercises, isMuscleActive, selectedMuscle, isEquipActive, selectedEquipment, debouncedQuery]);

  // Lista achatada para FlashList
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

  const totalResultsCount = useMemo(() => {
    return groupedSections.reduce((sum, s) => sum + s.data.length, 0);
  }, [groupedSections]);

  // Alterna seleção mantendo ordem
  const handleToggleSelect = (exerciseId: string) => {
    if (existingExerciseIds.has(exerciseId)) {
      triggerHaptic('warning');
      return;
    }

    triggerHaptic('selection');
    if (replaceTargetWorkoutExerciseId) {
      setSelectedIds([exerciseId]);
      return;
    }
    setSelectedIds((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId);
      }
      return [...prev, exerciseId];
    });
  };

  // Limpa todas as seleções
  const handleClearSelection = () => {
    triggerHaptic('light');
    setSelectedIds([]);
  };

  // Limpa filtros
  const handleResetFilters = () => {
    triggerHaptic('light');
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedMuscle(null);
    setSelectedEquipment(null);
  };

  // Conclui adição e retorna para Editar Treino ou ActiveSession
  const handleConfirmAdd = () => {
    if (selectedIds.length === 0) return;
    triggerHaptic('success');

    const exercisesMap = new Map(allExercises.map((e) => [e.id, e]));
    const selectedObjects = selectedIds
      .map((id) => exercisesMap.get(id))
      .filter((e): e is ExerciseSelectionItem => Boolean(e))
      .map((e) => ({
        exerciseId: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        defaultRestS: e.defaultRestS,
      }));

    if (sessionId || fromScreen === 'ActiveSession') {
      const activeSessionId = sessionId!;
      try {
        const rawDb = getExpoDb();
        const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
          `SELECT MAX(position) as maxPos FROM session_exercises WHERE session_id = ?`,
          [activeSessionId]
        );
        let nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

        for (const item of selectedObjects) {
          const seId = `se_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          rawDb.runSync(
            `INSERT INTO session_exercises (id, session_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, is_session_only)
             VALUES (?, ?, ?, ?, 3, 8, 12, ?, 1)`,
            [seId, activeSessionId, item.exerciseId, nextPos++, item.defaultRestS || 90]
          );

          for (let s = 1; s <= 3; s++) {
            const setId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            rawDb.runSync(
              `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume, type, reps_mode, min_reps, max_reps, effort_mode, is_session_only)
               VALUES (?, ?, ?, 20.0, 10, 0, 0, 0, 'normal', 'reps_range', 8, 12, 'none', 1)`,
              [setId, seId, s]
            );
          }
        }
      } catch (err) {
        console.warn('Erro ao inserir exercícios na sessão ativa:', err);
      }

      navigation.navigate('ActiveSession', {
        sessionId: activeSessionId,
      });
      return;
    }

    if (workoutId) {
      if (replaceTargetWorkoutExerciseId && selectedObjects.length > 0) {
        navigation.navigate('EditWorkout', {
          workoutId,
          replacedExercise: {
            targetWorkoutExerciseId: replaceTargetWorkoutExerciseId,
            newExercise: selectedObjects[0],
          },
        });
        return;
      }

      navigation.navigate('EditWorkout', {
        workoutId,
        addedExercises: selectedObjects,
      });
    }
  };



  const selectedCount = selectedIds.length;
  const showEmptyState = totalResultsCount === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO COM BOTÃO NOVO >= 48DP */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>

        <Text variant="headline" style={styles.headerTitle}>
          {replaceTargetWorkoutExerciseId ? 'Substituir exercício' : 'Adicionar exercícios'}
        </Text>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('NewExercise', {
              initialName: searchQuery.trim(),
              fromScreen: 'AddExercises',
            });
          }}
          style={({ pressed }) => [
            styles.newButton,
            pressed && styles.newButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar novo exercício"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Plus size={16} color={colors.primary} strokeWidth={2.2} />
          <Text variant="bodyMedium" style={styles.newButtonText}>
            Novo
          </Text>
        </Pressable>
      </View>

      {/* 2. CAMPO DE BUSCA */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar exercício..."
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessible={true}
            accessibilityLabel="Buscar exercício por nome, músculo ou equipamento"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setSearchQuery('');
              }}
              style={styles.clearSearchBtn}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. BOTÕES DE FILTRO SIMÉTRICOS COM RÓTULOS COMPACTOS (SEM TRUNCAMENTO EM 360PX) */}
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
            {isMuscleActive ? selectedMuscle : 'Músculo'}
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
              color={colors.onSurfaceVariant}
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
            {isEquipActive ? selectedEquipment : 'Equipamento'}
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
              color={colors.onSurfaceVariant}
              strokeWidth={2}
            />
          )}
        </Pressable>
      </View>

      {/* STATUS DA LISTA COM NÚMERO TABULAR */}
      {!showEmptyState && (
        <View style={styles.listStatusRow}>
          <View style={styles.statusDot} />
          <Text variant="labelSmall" style={styles.listStatusText}>
            Exercícios disponíveis •{' '}
            <Text variant="labelSmall" tabular style={styles.listStatusCount}>
              {totalResultsCount}
            </Text>
          </Text>
        </View>
      )}

      {/* 4. LISTA DE EXERCÍCIOS OU ESTADO SEM RESULTADO */}
      {showEmptyState ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Dumbbell size={32} color={colors.textMuted} strokeWidth={1.8} />
          </View>
          <Text variant="headline" style={styles.emptyTitle}>
            Nenhum exercício encontrado
          </Text>
          <Text variant="bodySmall" style={styles.emptyDescription}>
            Tente buscar por outro termo ou selecione uma categoria diferente.
          </Text>

          <View style={styles.emptyActions}>
            <Button
              title="Ver todos os exercícios"
              variant="secondary"
              icon={<RotateCcw size={16} color={colors.onSurface} strokeWidth={2} />}
              onPress={handleResetFilters}
              style={styles.emptyButton}
            />

            <Button
              title="Cadastrar exercício"
              variant="primary"
              icon={<Plus size={16} color={colors.onPrimary} strokeWidth={2.4} />}
              onPress={() => {
                triggerHaptic('light');
                navigation.navigate('NewExercise', {
                  initialName: searchQuery.trim(),
                  fromScreen: 'AddExercises',
                });
              }}
              style={styles.emptyButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={flatListItems}
            keyExtractor={(item) => item.id}
            getItemType={(item) => item.type}
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom:
                  selectedCount > 0
                    ? insets.bottom + 88
                    : insets.bottom + spacing.xl,
              },
            ]}
            renderItem={({ item }) => {
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
              const isAlreadyInWorkout = existingExerciseIds.has(ex.id);
              const isSelected = selectedIds.includes(ex.id);

              return (
                <Pressable
                  onPress={() => handleToggleSelect(ex.id)}
                  disabled={isAlreadyInWorkout}
                  style={({ pressed }) => [
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                    isAlreadyInWorkout && styles.exerciseCardDisabled,
                    pressed && !isAlreadyInWorkout && styles.exerciseCardPressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isSelected,
                    disabled: isAlreadyInWorkout,
                  }}
                  accessibilityLabel={`${ex.name}, ${ex.muscleGroup}, ${ex.equipment}. ${
                    isAlreadyInWorkout
                      ? 'Já no treino'
                      : isSelected
                      ? 'Selecionado'
                      : 'Não selecionado'
                  }`}
                >
                  {/* Ícone anatômico vetorial neutro */}
                  <View style={styles.iconBox}>
                    <MuscleIcon muscle={ex.muscleGroup} size={26} />
                  </View>

                  {/* Detalhes do Exercício: Linha 1 dedicada ao nome, Linha 2 para tags */}
                  <View style={styles.cardDetails}>
                    <Text
                      variant="bodyLarge"
                      style={[
                        styles.exerciseName,
                        isAlreadyInWorkout && styles.exerciseNameDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.equipmentPill}>
                        <Text style={styles.equipmentPillText} numberOfLines={1}>
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

                  {/* Indicador de Check ou Selo "Já no treino" */}
                  {isAlreadyInWorkout ? (
                    <View style={styles.alreadyInWorkoutBadge}>
                      <Text variant="labelSmall" style={styles.alreadyInWorkoutText}>
                        Já no treino
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.checkboxCircle,
                        isSelected && styles.checkboxCircleSelected,
                      ]}
                    >
                      {isSelected && (
                        <Check size={16} color={colors.onPrimary} strokeWidth={2.8} />
                      )}
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* 5. BARRA INFERIOR FIXA CONDENSADA EM LINHA ÚNICA (56dp + insets.bottom) */}
      {selectedCount > 0 && (
        <View
          style={[
            styles.floatingActionBar,
            { paddingBottom: Math.max(spacing.md, insets.bottom + 8) },
          ]}
        >
          <View style={styles.floatingBarRow}>
            {/* Botão de limpar seleção com contador em Outfit tabular */}
            <Pressable
              onPress={handleClearSelection}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Limpar seleção de ${selectedCount} ${selectedCount === 1 ? 'exercício' : 'exercícios'}`}
              style={({ pressed }) => [
                styles.clearSelectionBtn,
                pressed && styles.clearSelectionBtnPressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.selectionCountBadge}>
                <Text variant="labelSmall" tabular style={styles.selectionCountBadgeText}>
                  {selectedCount}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.clearSelectionText}>
                Limpar
              </Text>
            </Pressable>

            {/* Botão primário coral Adicionar ao treino */}
            <Pressable
              onPress={handleConfirmAdd}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={
                replaceTargetWorkoutExerciseId
                  ? 'Substituir exercício selecionado'
                  : `Adicionar ${selectedCount} ${selectedCount === 1 ? 'exercício' : 'exercícios'} ao treino`
              }
              style={({ pressed }) => [
                styles.confirmAddButton,
                pressed && styles.confirmAddButtonPressed,
              ]}
            >
              <Plus size={18} color={colors.onPrimary} strokeWidth={2.4} />
              <Text variant="bodyLarge" style={styles.confirmAddButtonText}>
                {replaceTargetWorkoutExerciseId
                  ? 'Substituir exercício'
                  : `Adicionar (${selectedCount})`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
    width: spacing.touchTargetMin, // 48px
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.headline.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: spacing.touchTargetMin, // 48px
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
  },
  newButtonPressed: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  newButtonText: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    fontSize: 14,
    color: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    height: 52,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    color: colors.onSurface,
  },
  clearSearchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 10,
    gap: spacing.sm,
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
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 13,
    flexShrink: 1,
    marginRight: 4,
  },
  filterBtnTextInactive: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  filterBtnTextActive: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    color: colors.primary,
  },
  filterChipClear: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  listStatusText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  listStatusCount: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
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
    color: colors.onSurfaceVariant,
  },
  exerciseCard: {
    minHeight: 72,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  exerciseCardSelected: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
  },
  exerciseCardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.surfaceContainerHigh,
  },
  exerciseCardDisabled: {
    opacity: 0.55,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
    justifyContent: 'center',
  },
  exerciseName: {
    fontFamily: typography.bodyLarge.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  exerciseNameDisabled: {
    color: colors.textMuted,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'nowrap',
  },
  equipmentPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexShrink: 0,
  },
  equipmentPillText: {
    fontSize: 11,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  muscleMetaText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  secondaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexShrink: 0,
  },
  secondaryBadgeText: {
    fontSize: 11,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  checkboxCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  alreadyInWorkoutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  alreadyInWorkoutText: {
    fontSize: 11,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '500',
    color: colors.textMuted,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyActions: {
    gap: 10,
    width: '100%',
    maxWidth: 280,
  },
  emptyButton: {
    width: '100%',
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingHorizontal: spacing.margin,
    paddingTop: 12,
  },
  floatingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearSelectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  clearSelectionBtnPressed: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  selectionCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  selectionCountBadgeText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
  clearSelectionText: {
    fontSize: 13,
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  confirmAddButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  confirmAddButtonPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  confirmAddButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
