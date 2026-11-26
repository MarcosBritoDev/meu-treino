import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Search,
  X,
  Check,
  Plus,
  Clock,
  Dumbbell,
  Weight,
  Cable,
  Cpu,
  User,
  RotateCcw,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { triggerHaptic } from '../ui/haptics';
import { normalizeSearchText, FILTER_CHIPS, FilterChip } from '../domain/search';
import {
  getExercisesForAddSelection,
  ExerciseSelectionItem,
} from '../db/library';
import { getExpoDb } from '../db/client';

type RouteParams = RouteProp<RootStackParamList, 'AddExercises'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AddExercisesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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

  // Filtros
  const [activeChip, setActiveChip] = useState<FilterChip>('Todos');
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

  // Filtra exercícios por grupo e texto
  const filteredExercises = useMemo(() => {
    const q = normalizeSearchText(debouncedQuery);

    return allExercises.filter((ex) => {
      // 1. Filtro por chip de grupo
      if (activeChip !== 'Todos') {
        const chipNorm = normalizeSearchText(activeChip);
        const muscleNorm = normalizeSearchText(ex.muscleGroup);
        if (!muscleNorm.includes(chipNorm)) {
          return false;
        }
      }

      // 2. Filtro por busca de texto
      if (q.length > 0) {
        const nameNorm = normalizeSearchText(ex.name);
        const muscleNorm = normalizeSearchText(ex.muscleGroup);
        const equipNorm = normalizeSearchText(ex.equipment);
        if (!nameNorm.includes(q) && !muscleNorm.includes(q) && !equipNorm.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allExercises, activeChip, debouncedQuery]);

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

  // Conclui adição e retorna para Editar Treino ou ActiveSession
  const handleConfirmAdd = () => {
    if (selectedIds.length === 0) return;
    triggerHaptic('success');

    // Mapeia os IDs selecionados para os objetos de exercício na ordem selecionada
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

          // Insere 3 séries padrão
          for (let s = 1; s <= 3; s++) {
            const setId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            rawDb.runSync(
              `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume)
               VALUES (?, ?, ?, 20.0, 10, 0, 0, 0)`,
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

  // Ícone de equipamento
  const renderEquipmentIcon = (equipment: string) => {
    const eq = equipment.toLowerCase();
    if (eq.includes('barra')) {
      return <Weight size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    if (eq.includes('halter')) {
      return <Dumbbell size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    if (eq.includes('cabo') || eq.includes('polia')) {
      return <Cable size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    if (eq.includes('máquina') || eq.includes('maquina')) {
      return <Cpu size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    return <User size={20} color={colors.primary} strokeWidth={1.75} />;
  };

  const selectedCount = selectedIds.length;
  const showEmptyState = filteredExercises.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO (Apenas voltar e título; sem filtro e sem avatar) */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text variant="headline" style={styles.headerTitle}>
          {replaceTargetWorkoutExerciseId ? 'Substituir exercício' : 'Adicionar exercícios'}
        </Text>
        <View style={styles.headerSpacer} />
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
            >
              <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. CHIPS HORIZONTAIS DE GRUPOS */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const isSelected = activeChip === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveChip(chip);
                }}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${chip}`}
              >
                <Text
                  variant="labelSmall"
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* STATUS DA LISTA (Aparece somente quando houver itens) */}
      {!showEmptyState && (
        <View style={styles.listStatusRow}>
          <View style={styles.statusDot} />
          <Text variant="labelSmall" style={styles.listStatusText}>
            Exercícios disponíveis •{' '}
            <Text variant="labelSmall" style={styles.listStatusCount}>
              {filteredExercises.length}
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
              onPress={() => {
                triggerHaptic('light');
                setSearchQuery('');
                setActiveChip('Todos');
              }}
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
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              selectedCount > 0 && styles.listContentWithBar,
            ]}
            renderItem={({ item }) => {
              const isAlreadyInWorkout = existingExerciseIds.has(item.id);
              const isSelected = selectedIds.includes(item.id);

              return (
                <Pressable
                  onPress={() => handleToggleSelect(item.id)}
                  disabled={isAlreadyInWorkout}
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                    isAlreadyInWorkout && styles.exerciseCardDisabled,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isSelected,
                    disabled: isAlreadyInWorkout,
                  }}
                  accessibilityLabel={`${item.name}, ${item.muscleGroup}, ${item.equipment}. ${
                    isAlreadyInWorkout
                      ? 'Já no treino'
                      : isSelected
                      ? 'Selecionado'
                      : 'Não selecionado'
                  }`}
                >
                  {/* Ícone do equipamento */}
                  <View style={styles.equipmentIconBox}>
                    {renderEquipmentIcon(item.equipment)}
                  </View>

                  {/* Detalhes do Exercício (2 linhas separadas rigorosamente) */}
                  <View style={styles.cardDetails}>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.exerciseName,
                        isAlreadyInWorkout && styles.exerciseNameDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {/* Linha 2: Músculo · Equipamento + chip Composto/Isolamento */}
                    <View style={styles.metaRow}>
                      <Text variant="labelSmall" style={styles.muscleEquipText}>
                        {item.muscleGroup} · {item.equipment}
                      </Text>
                      {item.kind ? (
                        <View style={styles.kindChip}>
                          <Text variant="labelSmall" style={styles.kindChipText}>
                            {item.kind === 'isolamento' ? 'Isolamento' : 'Composto'}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Linha 3: Último registro */}
                    <View style={styles.lastLogHistoryRow}>
                      <Clock size={12} color={colors.textMuted} strokeWidth={2} />
                      <Text variant="labelSmall" style={styles.lastLogText}>
                        {item.lastWeight != null && item.lastReps != null ? (
                          <>
                            Último:{' '}
                            <Text variant="labelSmall" style={styles.lastLogHighlight}>
                              {item.lastWeight} kg × {item.lastReps}
                            </Text>
                          </>
                        ) : (
                          'Nunca treinado'
                        )}
                      </Text>
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

      {/* 5. BARRA INFERIOR FIXA (Surge somente ao selecionar exercícios) */}
      {selectedCount > 0 && (
        <View style={styles.floatingActionBar}>
          {/* Linha superior da barra */}
          <View style={styles.actionSummaryRow}>
            <View style={styles.selectedCountRow}>
              <View style={styles.pulsingDot} />
              <Text variant="headline" style={styles.selectedSummaryText}>
                {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
              </Text>
            </View>

            <Pressable
              onPress={handleClearSelection}
              accessibilityRole="button"
              accessibilityLabel="Limpar seleção"
            >
              <Text variant="bodySmall" style={styles.clearSelectionText}>
                Limpar seleção
              </Text>
            </Pressable>
          </View>

          {/* Linha inferior de botões */}
          <View style={styles.actionButtonsRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text variant="bodyMedium" style={styles.cancelButtonText}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmAdd}
              style={styles.confirmAddButton}
              accessibilityRole="button"
              accessibilityLabel={
                replaceTargetWorkoutExerciseId
                  ? 'Substituir exercício selecionado'
                  : `Adicionar ${selectedCount} exercícios ao treino`
              }
            >
              <Plus size={18} color={colors.onPrimary} strokeWidth={2.4} />
              <Text variant="bodyMedium" style={styles.confirmAddButtonText}>
                {replaceTargetWorkoutExerciseId
                  ? 'Substituir exercício'
                  : `Adicionar ao treino (${selectedCount})`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  headerSpacer: {
    width: 38,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.dmSansRegular,
    fontSize: 15,
    color: colors.onSurface,
  },
  clearSearchBtn: {
    padding: 4,
  },
  chipsContainer: {
    paddingBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  filterChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listContentWithBar: {
    paddingBottom: 140, // Espaço quando a barra inferior estiver visível
  },
  exerciseCard: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  exerciseCardSelected: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderColor: colors.primary,
  },
  exerciseCardDisabled: {
    opacity: 0.55,
  },
  equipmentIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  exerciseName: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 3,
  },
  exerciseNameDisabled: {
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  muscleEquipText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  kindChipText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  lastLogHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastLogText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  lastLogHighlight: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  alreadyInWorkoutText: {
    fontSize: 11,
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  actionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  selectedCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  selectedSummaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  clearSelectionText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  confirmAddButton: {
    flex: 1.6,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmAddButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
