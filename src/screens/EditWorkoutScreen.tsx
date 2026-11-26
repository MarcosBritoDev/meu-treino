import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ChevronLeft,
  Play,
  Save,
  Plus,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { Text } from '../ui/Text';
import { Toast } from '../ui/Toast';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ExerciseCard } from '../ui/ExerciseCard';
import { SetTypeSheet, SetTypeOptionKey } from '../ui/SetTypeSheet';
import { SetEditSheet } from '../ui/SetEditSheet';
import { SetMenuAction } from '../ui/session/SetTable';
import { triggerHaptic } from '../ui/haptics';
import { estimarDuracao, formatarDuracao } from '../domain/duration';
import {
  Unit,
  PlannedSet,
  sanitizePlannedSet,
  serializeExercisesForDirtyCheck,
  canPerformSetAction,
} from '../domain/sessionMath';
import {
  getWorkoutForEdit,
  saveWorkout,
  startWorkoutSession,
  getInProgressSession,
  discardInProgressSession,
  getUserUnit,
  WorkoutForEdit,
  WorkoutExerciseForEdit,
  InProgressSessionInfo,
} from '../db/workouts';

type RouteParams = RouteProp<RootStackParamList, 'EditWorkout'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const serializeExercises = serializeExercisesForDirtyCheck;

export const EditWorkoutScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const workoutId = route.params?.workoutId;

  const [data, setData] = useState<WorkoutForEdit | null>(null);
  const [name, setName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState<WorkoutExerciseForEdit[]>([]);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [unit, setUnit] = useState<Unit>('kg');

  // Estado inicial para detecção de alterações pendentes (Dirty State)
  const [initialState, setInitialState] = useState<{
    name: string;
    groupId: string | null;
    isActive: boolean;
    exercisesJson: string;
  } | null>(null);

  // Sheets e Modais
  const [addSetExerciseId, setAddSetExerciseId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    exercise: WorkoutExerciseForEdit;
    set: any;
    badgeLabel: string;
  } | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);
  const [conflictSession, setConflictSession] = useState<InProgressSessionInfo | null>(null);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Carrega dados da ficha e configurações
  const loadWorkout = useCallback(() => {
    if (!workoutId) return;
    try {
      const currentUnit = getUserUnit();
      setUnit(currentUnit);

      const result = getWorkoutForEdit(workoutId);
      if (result) {
        setData(result);
        setName(result.name);
        setSelectedGroupId(result.groupId);
        setIsActive(result.isActive);
        setExercises(result.exercises);

        setInitialState({
          name: result.name,
          groupId: result.groupId,
          isActive: result.isActive,
          exercisesJson: serializeExercises(result.exercises),
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar treino para edição:', err);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Recebe exercícios adicionados da AddExercisesScreen (gera 3 séries normais por padrão)
  useEffect(() => {
    const newItems = route.params?.addedExercises;
    if (newItems && newItems.length > 0) {
      setExercises((prev) => {
        const nextPos = prev.length;
        const mapped: WorkoutExerciseForEdit[] = newItems.map((item, idx) => {
          const newExId = `new_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
          const repMin = 8;
          const repMax = 12;
          const restS = item.defaultRestS || 90;

          // Cria automaticamente 3 séries normais em workout_exercise_sets
          const defaultSets: PlannedSet[] = [0, 1, 2].map((sIdx) => ({
            id: `wes_${newExId}_${sIdx}`,
            workoutExerciseId: newExId,
            position: sIdx,
            type: 'normal',
            repsMode: 'reps_range',
            minReps: repMin,
            maxReps: repMax,
            effortMode: 'none',
            effortValue: null,
            effortValueMax: null,
            effortRefExerciseId: null,
            restS: null,
          }));

          return {
            id: newExId,
            exerciseId: item.exerciseId,
            name: item.name,
            muscleGroup: item.muscleGroup,
            equipment: item.equipment,
            position: nextPos + idx,
            targetSets: 3,
            repMin,
            repMax,
            restS,
            note: null,
            sets: defaultSets,
          };
        });
        return [...prev, ...mapped];
      });
      triggerHaptic('success');
      setToastMessage(
        newItems.length === 1
          ? '1 exercício adicionado'
          : `${newItems.length} exercícios adicionados`
      );
      setToastVisible(true);
      navigation.setParams({ addedExercises: undefined });
    }
  }, [route.params?.addedExercises, navigation]);

  // Recebe exercício substituído (mantém as séries planejadas intactas!)
  useEffect(() => {
    const replaced = route.params?.replacedExercise;
    if (replaced) {
      const { targetWorkoutExerciseId, newExercise } = replaced;
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== targetWorkoutExerciseId) return ex;
          return {
            ...ex,
            exerciseId: newExercise.exerciseId,
            name: newExercise.name,
            muscleGroup: newExercise.muscleGroup,
            equipment: newExercise.equipment,
            // Séries planejadas intactas
          };
        })
      );
      triggerHaptic('success');
      setToastMessage(`Substituído por ${newExercise.name}`);
      setToastVisible(true);
      navigation.setParams({ replacedExercise: undefined });
    }
  }, [route.params?.replacedExercise, navigation]);

  // Verificação de alterações não salvas (Dirty State)
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    return (
      name.trim() !== initialState.name.trim() ||
      selectedGroupId !== initialState.groupId ||
      isActive !== initialState.isActive ||
      serializeExercises(exercises) !== initialState.exercisesJson
    );
  }, [name, selectedGroupId, isActive, exercises, initialState]);

  // Cálculos do resumo do rodapé (Séries e Duração Estimada)
  const totalSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + (ex.sets?.length ?? ex.targetSets ?? 0), 0);
  }, [exercises]);

  const approxMin = useMemo(() => {
    const totalSecs = estimarDuracao({
      exercises: exercises.map((e) => ({
        targetSets: e.sets?.length ?? e.targetSets ?? 3,
        restS: e.restS ?? 90,
      })),
    });
    return Math.max(1, Math.round(totalSecs / 60));
  }, [exercises]);

  // Iniciar sessão
  const startSessionAndNavigate = () => {
    if (!workoutId) return;
    try {
      const sessionId = startWorkoutSession(workoutId, name.trim());
      navigation.navigate('ActiveSession', { sessionId, workoutId });
    } catch (err) {
      console.warn('Erro ao iniciar sessão:', err);
    }
  };

  const checkConflictAndStart = () => {
    const existing = getInProgressSession();
    if (existing) {
      setConflictSession(existing);
      setConflictModalVisible(true);
      return;
    }
    startSessionAndNavigate();
  };

  const handleStartClick = () => {
    if (isDirty) {
      triggerHaptic('warning');
      setShowUnsavedModal(true);
    } else {
      triggerHaptic('light');
      checkConflictAndStart();
    }
  };

  // Voltar
  const handleBack = () => {
    if (isDirty) {
      triggerHaptic('warning');
      setDiscardModalVisible(true);
    } else {
      triggerHaptic('light');
      navigation.goBack();
    }
  };

  // Salvar ficha completa
  const handleSaveWorkout = () => {
    if (!workoutId || !name.trim()) {
      triggerHaptic('error');
      return;
    }
    try {
      saveWorkout(workoutId, {
        name: name.trim(),
        groupId: selectedGroupId,
        isActive,
        exercises: exercises.map((ex, idx) => ({
          ...ex,
          position: idx,
          sets: (ex.sets || []).map((s, sIdx) => ({
            ...s,
            position: sIdx,
          })),
        })),
      });

      setInitialState({
        name: name.trim(),
        groupId: selectedGroupId,
        isActive,
        exercisesJson: serializeExercises(exercises),
      });

      triggerHaptic('success');
      setToastMessage('Treino salvo');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao salvar treino:', err);
      triggerHaptic('error');
      setToastMessage('Erro ao salvar treino');
      setToastVisible(true);
    }
  };

  // Alternar descanso de um exercício (60/90/120/180s)
  const handleCycleRest = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const currentRest = ex.restS ?? 90;
        const presets = [60, 90, 120, 180];
        const idx = presets.indexOf(currentRest);
        const nextRest = idx >= 0 ? presets[(idx + 1) % presets.length] : 60;
        return { ...ex, restS: nextRest };
      })
    );
  };

  // Atualizar nota inline
  const handleUpdateNote = (exerciseId: string, note: string) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, note } : ex))
    );
  };

  // Reordenação de exercícios
  const handleMoveExerciseUp = (exerciseId: string) => {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === exerciseId);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy.map((e, p) => ({ ...e, position: p }));
    });
  };

  const handleMoveExerciseDown = (exerciseId: string) => {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === exerciseId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy.map((e, p) => ({ ...e, position: p }));
    });
  };

  // Remover exercício
  const handleRemoveExercise = (exerciseId: string) => {
    setExercises((prev) =>
      prev.filter((e) => e.id !== exerciseId).map((e, p) => ({ ...e, position: p }))
    );
  };

  // Substituir exercício
  const handleSwapExercise = (workoutExerciseId: string) => {
    navigation.navigate('AddExercises', {
      workoutId,
      existingExerciseIds: exercises.map((e) => e.exerciseId),
      fromScreen: 'EditWorkout',
      replaceTargetWorkoutExerciseId: workoutExerciseId,
    });
  };

  // Adicionar série via SetTypeSheet (1 toque)
  const handleAddSetOption = (optionKey: SetTypeOptionKey) => {
    if (!addSetExerciseId) return;

    const targetEx = exercises.find((e) => e.id === addSetExerciseId);
    if (!targetEx) return;

    triggerHaptic('light');
    const newId = `wes_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentSets = targetEx.sets || [];
    const position = currentSets.length;

    let newSet: PlannedSet = {
      id: newId,
      workoutExerciseId: targetEx.id,
      position,
      type: 'normal',
      repsMode: 'reps_range',
      minReps: targetEx.repMin || 8,
      maxReps: targetEx.repMax || 10,
      effortMode: 'none',
      effortValue: null,
      effortValueMax: null,
      effortRefExerciseId: null,
      restS: null,
    };

    if (optionKey === 'warmup') {
      newSet.type = 'warmup';
      newSet.repsMode = 'reps_range';
      newSet.minReps = 8;
      newSet.maxReps = 12;
      newSet.effortMode = 'none';
      newSet.effortValue = null;
    } else if (optionKey === 'rpe') {
      newSet.type = 'normal';
      newSet.effortMode = 'rpe';
      newSet.effortValue = 8;
    } else if (optionKey === 'rir') {
      newSet.type = 'normal';
      newSet.effortMode = 'rir';
      newSet.effortValue = 2;
    } else if (optionKey === 'failure') {
      newSet.type = 'failure';
      newSet.repsMode = 'reps_max';
      newSet.minReps = null;
      newSet.maxReps = null;
      newSet.effortMode = 'none';
      newSet.effortValue = null;
    } else if (optionKey === 'drop') {
      newSet.type = 'drop';
      newSet.repsMode = 'reps_max';
      newSet.minReps = null;
      newSet.maxReps = null;
      newSet.effortMode = 'none';
      newSet.effortValue = null;
      newSet.drop_percent = 20;
      newSet.dropPercent = 20;
    }

    newSet = sanitizePlannedSet(newSet);

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== addSetExerciseId) return ex;
        const updatedSets = [...(ex.sets || []), newSet];
        return {
          ...ex,
          targetSets: updatedSets.length,
          sets: updatedSets,
        };
      })
    );

    setAddSetExerciseId(null);
    setToastMessage('Série adicionada');
    setToastVisible(true);
  };

  // Ações no menu contextual de cada série (⋮)
  const handleSetMenuAction = (
    exerciseId: string,
    action: SetMenuAction,
    setId: string
  ) => {
    triggerHaptic('light');
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const sets = [...(ex.sets || [])];
        const idx = sets.findIndex((s) => s.id === setId);
        if (idx === -1) return ex;

        if (!canPerformSetAction(sets, action, idx)) {
          setToastMessage('Ação inválida: Drop exige uma série de trabalho antes dele');
          setToastVisible(true);
          return ex;
        }

        if (action === 'duplicate') {
          const original = sets[idx];
          const cloned: PlannedSet = {
            ...original,
            id: `wes_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          };
          sets.splice(idx + 1, 0, cloned);
        } else if (action === 'up' && idx > 0) {
          const temp = sets[idx];
          sets[idx] = sets[idx - 1];
          sets[idx - 1] = temp;
        } else if (action === 'down' && idx < sets.length - 1) {
          const temp = sets[idx];
          sets[idx] = sets[idx + 1];
          sets[idx + 1] = temp;
        } else if (action === 'remove') {
          sets.splice(idx, 1);
        }

        const reindexed = sets.map((s, pIdx) => ({ ...s, position: pIdx }));
        return { ...ex, targetSets: reindexed.length, sets: reindexed };
      })
    );
  };

  // Edição detalhada via SetEditSheet
  const handleApplySetEdit = (updatedSet: any) => {
    if (!editingTarget) return;
    triggerHaptic('success');
    const targetExId = editingTarget.exercise.id;
    const targetSetId = editingTarget.set.id;

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== targetExId) return ex;
        const updatedSets = (ex.sets || []).map((s) => {
          if (s.id !== targetSetId) return s;
          return sanitizePlannedSet({
            ...s,
            ...updatedSet,
          });
        });
        return { ...ex, sets: updatedSets };
      })
    );
    setEditingTarget(null);
  };

  const handleRemoveSetFromSheet = (setId: string) => {
    if (!editingTarget) return;
    triggerHaptic('medium');
    const targetExId = editingTarget.exercise.id;

    const currentSets = editingTarget.exercise.sets || [];
    const idx = currentSets.findIndex((s: any) => s.id === setId);
    if (idx !== -1 && !canPerformSetAction(currentSets, 'remove', idx)) {
      setToastMessage('Ação inválida: Drop exige uma série de trabalho antes dele');
      setToastVisible(true);
      return;
    }

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== targetExId) return ex;
        const filtered = (ex.sets || []).filter((s) => s.id !== setId);
        const reindexed = filtered.map((s, pIdx) => ({ ...s, position: pIdx }));
        return { ...ex, targetSets: reindexed.length, sets: reindexed };
      })
    );
    setEditingTarget(null);
  };

  const handleToggleExpand = (exerciseId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId] === false ? true : false,
    }));
  };

  if (!workoutId || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Text variant="headline" style={styles.headerTitleFallback}>
            Editar treino
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" color="secondary">
            Treino não encontrado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO DA PRÉVIA */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>

          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={40}
            placeholder="Nome do treino"
            placeholderTextColor="#636366"
            style={styles.nameInputInline}
            accessible={true}
            accessibilityLabel="Nome do treino"
          />

          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{data.code}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleStartClick}
          style={({ pressed }) => [
            styles.startBtn,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Iniciar treino"
        >
          <Play size={12} fill="#FF7A59" color="#FF7A59" />
          <Text style={styles.startBtnText}>Iniciar</Text>
        </Pressable>
      </View>

      {/* 2. CONTEÚDO ROLÁVEL (LISTA DE EXERCÍCIOS) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.id || `ex-${idx}`}
            index={idx}
            exercise={ex}
            mode="preview"
            unit={unit}
            isExpanded={expandedMap[ex.id] !== false}
            onToggleExpand={() => handleToggleExpand(ex.id)}
            canMoveUp={idx > 0}
            canMoveDown={idx < exercises.length - 1}
            onCycleRest={handleCycleRest}
            onUpdateNote={handleUpdateNote}
            onOpenAddSet={(id) => setAddSetExerciseId(id)}
            onSwapExercise={handleSwapExercise}
            onRemoveExercise={handleRemoveExercise}
            onMoveUp={handleMoveExerciseUp}
            onMoveDown={handleMoveExerciseDown}
            onRowClick={(exerciseObj, set, badgeLabel) =>
              setEditingTarget({ exercise: exerciseObj, set, badgeLabel })
            }
            onMenuAction={handleSetMenuAction}
          />
        ))}

        {exercises.length === 0 && (
          <View style={styles.emptyPreviewBox}>
            <Text variant="bodyMedium" color="secondary" style={styles.emptyPreviewText}>
              Nenhum exercício nesta ficha ainda.
            </Text>
          </View>
        )}

        {/* BOTÃO + ADICIONAR EXERCÍCIO */}
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('AddExercises', {
              workoutId,
              existingExerciseIds: exercises.map((e) => e.exerciseId),
              fromScreen: 'EditWorkout',
            });
          }}
          style={({ pressed }) => [
            styles.addExerciseButton,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Adicionar exercício"
        >
          <Plus size={18} color="#FF7A59" strokeWidth={2.4} />
          <Text style={styles.addExerciseButtonText}>Adicionar exercício</Text>
        </Pressable>
      </ScrollView>

      {/* 3. RODAPÉ FIXO (Modo Prévia) */}
      <View style={styles.fixedFooter}>
        <View style={styles.footerInfoRow}>
          <Text style={styles.footerStatsText}>
            <Text style={styles.footerStatsBold}>{totalSets} {totalSets === 1 ? 'série' : 'séries'}</Text> · ~{approxMin} min
          </Text>

          {isDirty && (
            <View style={styles.unsavedIndicator}>
              <View style={styles.unsavedDot} />
              <Text style={styles.unsavedText}>Alterações não salvas</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleSaveWorkout}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Salvar treino"
        >
          <Save size={16} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.saveButtonText}>Salvar treino</Text>
        </Pressable>
      </View>

      {/* SHEET: Adicionar série (6 opções) */}
      <SetTypeSheet
        visible={Boolean(addSetExerciseId)}
        mode="preview"
        unit={unit}
        sets={exercises.find((e) => e.id === addSetExerciseId)?.sets || []}
        onClose={() => setAddSetExerciseId(null)}
        onSelect={handleAddSetOption}
      />

      {/* SHEET: Editar série detalhada */}
      <SetEditSheet
        visible={Boolean(editingTarget)}
        set={editingTarget?.set || null}
        sets={editingTarget?.exercise?.sets || []}
        setIndex={editingTarget?.exercise?.sets?.findIndex((s: any) => s.id === editingTarget?.set?.id)}
        exercise={editingTarget?.exercise ? {
          id: editingTarget.exercise.exerciseId,
          name: editingTarget.exercise.name,
          defaultRest: editingTarget.exercise.restS,
        } : null}
        badgeLabel={editingTarget?.badgeLabel || '1'}
        unit={unit}
        onClose={() => setEditingTarget(null)}
        onApply={handleApplySetEdit}
        onRemove={handleRemoveSetFromSheet}
      />

      {/* MODAL: "Salvar antes de iniciar?" */}
      {showUnsavedModal && (
        <Modal
          transparent
          visible={showUnsavedModal}
          animationType="fade"
          onRequestClose={() => setShowUnsavedModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowUnsavedModal(false)}
          >
            <Pressable
              style={styles.unsavedModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.unsavedModalTitle}>Salvar antes de iniciar?</Text>
              <Text style={styles.unsavedModalDesc}>
                Você fez alterações na prévia deste treino. Deseja salvar no planejamento antes de iniciar a sessão?
              </Text>

              <View style={styles.unsavedModalBtnList}>
                <Pressable
                  onPress={() => {
                    handleSaveWorkout();
                    setShowUnsavedModal(false);
                    checkConflictAndStart();
                  }}
                  style={({ pressed }) => [
                    styles.modalPrimaryBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Salvar e iniciar treino"
                >
                  <Text style={styles.modalPrimaryBtnText}>Salvar e iniciar</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowUnsavedModal(false);
                    checkConflictAndStart();
                  }}
                  style={({ pressed }) => [
                    styles.modalSecondaryBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Iniciar sem salvar"
                >
                  <Text style={styles.modalSecondaryBtnText}>Iniciar sem salvar</Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowUnsavedModal(false)}
                  style={({ pressed }) => [
                    styles.modalCancelBtn,
                    pressed && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                >
                  <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Modal de Conflito de Sessão */}
      <ConfirmModal
        visible={conflictModalVisible}
        title="Treino em andamento"
        description={`Já existe uma sessão iniciada ("${conflictSession?.nameSnapshot}"). Deseja descartar a sessão anterior e iniciar esta?`}
        confirmLabel="Descartar e iniciar"
        cancelLabel="Voltar"
        isDanger={true}
        onConfirm={() => {
          discardInProgressSession();
          setConflictModalVisible(false);
          startSessionAndNavigate();
        }}
        onCancel={() => setConflictModalVisible(false)}
      />

      {/* MODAL: Descartar alterações ao voltar */}
      <ConfirmModal
        visible={discardModalVisible}
        title="Descartar alterações?"
        description="Você fez alterações na prévia deste treino que ainda não foram salvas. Deseja sair e descartar?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        isDanger
        onConfirm={() => {
          setDiscardModalVisible(false);
          navigation.goBack();
        }}
        onCancel={() => setDiscardModalVisible(false)}
      />

      {/* FEEDBACK TOAST */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1715',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#23201D',
    backgroundColor: '#1A1715',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  headerTitleFallback: {
    color: '#F5EFE8',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  nameInputInline: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#F5EFE8',
    paddingVertical: 2,
    paddingHorizontal: 0,
    minWidth: 80,
  },
  codeBadge: {
    backgroundColor: '#2D2925',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7A59',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D2925',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F5EFE8',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 110,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#23201D',
    borderWidth: 1,
    borderColor: '#38332F',
    borderStyle: 'dashed',
    borderRadius: 14,
    marginTop: 4,
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7A59',
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(35, 32, 29, 0.96)',
    borderTopWidth: 1,
    borderTopColor: '#2D2925',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footerStatsText: {
    fontSize: 12,
    color: '#B7ADA3',
  },
  footerStatsBold: {
    fontWeight: '700',
    color: '#F5EFE8',
  },
  unsavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF7A59',
  },
  unsavedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF7A59',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF7A59',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1715',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsavedModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#23201D',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2D2925',
    padding: 20,
  },
  unsavedModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5EFE8',
    marginBottom: 6,
  },
  unsavedModalDesc: {
    fontSize: 12,
    color: '#B7ADA3',
    lineHeight: 18,
    marginBottom: 18,
  },
  unsavedModalBtnList: {
    flexDirection: 'column',
    gap: 8,
  },
  modalPrimaryBtn: {
    backgroundColor: '#FF7A59',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1715',
  },
  modalSecondaryBtn: {
    backgroundColor: '#2D2925',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5EFE8',
  },
  modalCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  emptyPreviewBox: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewText: {
    textAlign: 'center',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
