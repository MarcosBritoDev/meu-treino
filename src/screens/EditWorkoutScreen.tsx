import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Play,
  Save,
  Plus,
  Pencil,
  Dumbbell,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme';
import { Text } from '../ui/Text';
import { Toast } from '../ui/Toast';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ExerciseCard } from '../ui/ExerciseCard';
import { SetTypeSheet, SetTypeOptionKey } from '../ui/SetTypeSheet';
import { SetEditSheet } from '../ui/SetEditSheet';
import { SetMenuAction } from '../ui/session/SetTable';
import { triggerHaptic } from '../ui/haptics';
import { estimarDuracao } from '../domain/duration';
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
  const [nameError, setNameError] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
    if (!workoutId) return;
    if (!name.trim()) {
      triggerHaptic('error');
      setNameError(true);
      setToastMessage('Informe um nome para o treino');
      setToastVisible(true);
      return;
    }
    setNameError(false);
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
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ChevronLeft size={24} color={colors.onSurface} strokeWidth={2} />
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
      {/* 1. CABEÇALHO LIMPO E ERGONÔMICO (Sem botão minúsculo no topo) */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ChevronLeft size={24} color={colors.onSurface} strokeWidth={2} />
        </Pressable>

        <View
          style={[
            styles.nameInputContainer,
            isInputFocused && styles.nameInputContainerFocused,
            nameError && styles.nameInputContainerError,
          ]}
        >
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError && text.trim().length > 0) {
                setNameError(false);
              }
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            maxLength={40}
            placeholder="Nome do treino"
            placeholderTextColor={colors.textMuted}
            style={styles.nameInputInline}
            accessible={true}
            accessibilityLabel="Nome do treino"
          />
          <Pencil
            size={14}
            color={isInputFocused ? colors.primary : colors.textMuted}
            strokeWidth={1.75}
            style={styles.pencilIcon}
          />
        </View>

        <View style={styles.codeBadge}>
          <Text variant="labelSmall" tabular style={styles.codeBadgeText}>
            {data.code}{data.groupName ? ` · ${data.groupName}` : ''}
          </Text>
        </View>
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
            <View style={styles.emptyIconCircle}>
              <Dumbbell size={28} color={colors.textMuted} strokeWidth={1.75} />
            </View>
            <Text variant="headline" style={styles.emptyPreviewTitle}>
              Ficha sem exercícios
            </Text>
            <Text variant="bodyMedium" color="secondary" style={styles.emptyPreviewText}>
              Adicione exercícios abaixo para estruturar suas séries planejadas, metas e tempos de descanso.
            </Text>
          </View>
        )}

        {/* BOTÃO + ADICIONAR EXERCÍCIO (Superfície sólida, sem border tracejado) */}
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
            pressed && styles.btnSecondaryPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Adicionar exercício"
        >
          <Plus size={18} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.addExerciseButtonText}>Adicionar exercício</Text>
        </Pressable>
      </ScrollView>

      {/* 3. RODAPÉ FIXO CONTEXTUAL (Thumb Zone) */}
      <View style={styles.fixedFooter}>
        <View style={styles.footerInfoRow}>
          <Text variant="bodySmall" color="secondary" style={styles.footerStatsText}>
            <Text variant="headline" tabular style={styles.footerStatsBold}>
              {totalSets}
            </Text>
            {' '}{totalSets === 1 ? 'série' : 'séries'}
            {' · ~'}
            <Text variant="headline" tabular style={styles.footerStatsBold}>
              {approxMin}
            </Text>
            {' min'}
          </Text>

          {isDirty ? (
            <View style={styles.unsavedIndicator}>
              <View style={styles.unsavedDot} />
              <Text variant="labelSmall" color="coral" style={styles.unsavedText}>
                Alterações não salvas
              </Text>
            </View>
          ) : null}
        </View>

        {!isDirty ? (
          /* Quando limpo (!isDirty): Botão primário heróico é Iniciar treino */
          <Pressable
            onPress={handleStartClick}
            style={({ pressed }) => [
              styles.primaryHeroBtn,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Iniciar treino"
          >
            <Play size={18} fill={colors.onPrimary} color={colors.onPrimary} />
            <Text style={styles.primaryHeroBtnText}>Iniciar treino</Text>
          </Pressable>
        ) : (
          /* Quando modificado (isDirty): Botão primário Salvar alterações + Secundário Iniciar */
          <View style={styles.dualActionRow}>
            <Pressable
              onPress={handleStartClick}
              style={({ pressed }) => [
                styles.secondaryStartBtn,
                pressed && styles.btnSecondaryPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Iniciar treino"
            >
              <Play size={16} fill={colors.onSurface} color={colors.onSurface} />
              <Text style={styles.secondaryStartBtnText}>Iniciar</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveWorkout}
              style={({ pressed }) => [
                styles.primarySaveBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Salvar alterações"
            >
              <Save size={18} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.primarySaveBtnText}>Salvar alterações</Text>
            </Pressable>
          </View>
        )}
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

      {/* MODAL: Salvar antes de iniciar? (Padronizado via ConfirmModal) */}
      <ConfirmModal
        visible={showUnsavedModal}
        title="Salvar antes de iniciar?"
        description="Você fez alterações nesta ficha de treino. Deseja salvar as alterações no planejamento antes de iniciar a sessão?"
        confirmLabel="Salvar e iniciar"
        cancelLabel="Continuar editando"
        discardLabel="Iniciar versão salva"
        onConfirm={() => {
          handleSaveWorkout();
          setShowUnsavedModal(false);
          checkConflictAndStart();
        }}
        onCancel={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          checkConflictAndStart();
        }}
      />

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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  backButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    borderRadius: radii.pill,
  },
  headerTitleFallback: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  nameInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radii.input,
    paddingHorizontal: spacing.gutter,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  nameInputContainerFocused: {
    borderColor: colors.primary,
  },
  nameInputContainerError: {
    borderColor: colors.error,
  },
  nameInputInline: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    paddingVertical: 0,
    minWidth: 80,
  },
  pencilIcon: {
    marginLeft: spacing.xs,
  },
  codeBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 130,
  },
  emptyPreviewBox: {
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.gutter,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.gutter,
  },
  emptyPreviewTitle: {
    color: colors.onSurface,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyPreviewText: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingVertical: 14,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.card,
    marginTop: spacing.xs,
  },
  addExerciseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(35, 32, 29, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.gutter,
    paddingBottom: spacing.md,
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerStatsText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  footerStatsBold: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  unsavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  unsavedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    height: spacing.buttonHeight,
    borderRadius: radii.pill,
  },
  primaryHeroBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  dualActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
  },
  secondaryStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    height: spacing.buttonHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  secondaryStartBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  primarySaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    height: spacing.buttonHeight,
    borderRadius: radii.pill,
  },
  primarySaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  btnPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.995 }],
  },
  btnSecondaryPressed: {
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
