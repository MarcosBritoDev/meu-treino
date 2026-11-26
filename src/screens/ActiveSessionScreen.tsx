import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Timer,
  Pause,
  Play,
  Check,
  Plus,
  Calculator,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  AlertTriangle,
  Minus,
  X,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PRBadge } from '../ui/PRBadge';
import { Toast } from '../ui/Toast';
import { ConfirmModal } from '../ui/ConfirmModal';
import { PlateCalculatorSheet } from '../ui/PlateCalculatorSheet';
import { ActiveExerciseActionSheet } from '../ui/ActiveExerciseActionSheet';
import { EditSessionExerciseSheet } from '../ui/EditSessionExerciseSheet';
import { triggerHaptic } from '../ui/haptics';
import { detectarPR } from '../domain/pr';
import { useSettingsStore } from '../store/useSettingsStore';
import { getExpoDb } from '../db/client';

type RouteParams = RouteProp<RootStackParamList, 'ActiveSession'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SetItem {
  id: string;
  sessionExerciseId: string;
  index: number;
  weight: number;
  reps: number;
  rpe: number | null;
  completedAt: number | null;
  isPrWeight: boolean;
  isPrVolume: boolean;
}

interface ActiveExerciseItem {
  id: string; // session_exercises.id
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  defaultIncrement?: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restS: number;
  note: string | null;
  previousLog: string;
  sets: SetItem[];
}

export const ActiveSessionScreen: React.FC = () => {
  // Mantém a tela acesa durante todo o treino em andamento
  useKeepAwake();

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const sessionId = route.params?.sessionId;

  const { unit, defaultIncrement, defaultRestS, autoRestTimer, restAlert } = useSettingsStore();

  // Estados principais da sessão
  const [sessionName, setSessionName] = useState('Treino em andamento');
  const [groupName, setGroupName] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [totalPausedS, setTotalPausedS] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [exercises, setExercises] = useState<ActiveExerciseItem[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Descanso (Timer fixo inferior)
  const [restActive, setRestActive] = useState(false);
  const [restEndTimestamp, setRestEndTimestamp] = useState<number>(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState<number>(90);
  const [restRemaining, setRestRemaining] = useState<number>(0);

  // Sheets e Modais
  const [plateSheetVisible, setPlateSheetVisible] = useState(false);
  const [plateExerciseName, setPlateExerciseName] = useState('');
  const [plateInitialWeight, setPlateInitialWeight] = useState(60);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedExerciseForAction, setSelectedExerciseForAction] = useState<ActiveExerciseItem | null>(null);

  const [editSheetVisible, setEditSheetVisible] = useState(false);

  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  // Edição rápida de peso/reps em popup
  const [numberModalVisible, setNumberModalVisible] = useState(false);
  const [numberModalTitle, setNumberModalTitle] = useState('');
  const [numberModalValue, setNumberModalValue] = useState('');
  const [numberModalCallback, setNumberModalCallback] = useState<(val: number) => void>(() => () => {});

  // Toast para notificações de PR e avisos
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. CARREGAMENTO COMPLETO DA SESSÃO ATIVA
  const loadSession = useCallback(() => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();

      // Sessão
      const sessRows = rawDb.getAllSync<{
        id: string;
        workout_id: string | null;
        name_snapshot: string;
        started_at: number;
        total_paused_s: number;
      }>(
        `SELECT id, workout_id, name_snapshot, started_at, total_paused_s
         FROM sessions
         WHERE id = ?`,
        [sessionId]
      );

      if (sessRows.length === 0) return;

      const s = sessRows[0];
      setSessionName(s.name_snapshot);
      setStartedAt(s.started_at);
      setTotalPausedS(s.total_paused_s || 0);

      // Nome do grupo se houver
      if (s.workout_id) {
        const grpRows = rawDb.getAllSync<{ groupName: string }>(
          `SELECT g.name AS groupName
           FROM workouts w
           JOIN groups g ON w.group_id = g.id
           WHERE w.id = ?`,
          [s.workout_id]
        );
        if (grpRows.length > 0) {
          setGroupName(grpRows[0].groupName);
        }
      }

      // Exercícios da sessão
      const exRows = rawDb.getAllSync<{
        id: string;
        exercise_id: string;
        name: string;
        muscle_group: string;
        equipment: string;
        default_increment: number | null;
        target_sets: number;
        rep_min: number;
        rep_max: number;
        rest_s: number;
        note: string | null;
      }>(
        `SELECT 
          se.id,
          se.exercise_id,
          e.name,
          e.muscle_group,
          e.equipment,
          e.default_increment,
          se.target_sets,
          se.rep_min,
          se.rep_max,
          se.rest_s,
          se.note
         FROM session_exercises se
         JOIN exercises e ON se.exercise_id = e.id
         WHERE se.session_id = ?
         ORDER BY se.position ASC`,
        [sessionId]
      );

      const items: ActiveExerciseItem[] = [];

      for (const ex of exRows) {
        // Histórico anterior deste exercício para a coluna "Anterior"
        const prevRows = rawDb.getAllSync<{ weight: number; reps: number }>(
          `SELECT st.weight, st.reps
           FROM sets st
           JOIN session_exercises se ON st.session_exercise_id = se.id
           JOIN sessions s ON se.session_id = s.id
           WHERE se.exercise_id = ? AND s.status = 'completed' AND st.completed_at IS NOT NULL
           ORDER BY s.ended_at DESC, st.completed_at DESC
           LIMIT 1`,
          [ex.exercise_id]
        );

        const previousLog =
          prevRows.length > 0
            ? `${prevRows[0].weight} ${unit} × ${prevRows[0].reps}`
            : '—';

        // Séries salvas desta sessão
        let setRows = rawDb.getAllSync<{
          id: string;
          session_exercise_id: string;
          index: number;
          weight: number;
          reps: number;
          rpe: number | null;
          completed_at: number | null;
          is_pr_weight: number;
          is_pr_volume: number;
        }>(
          `SELECT id, session_exercise_id, "index", weight, reps, rpe, completed_at, is_pr_weight, is_pr_volume
           FROM sets
           WHERE session_exercise_id = ?
           ORDER BY "index" ASC`,
          [ex.id]
        );

        // Se nenhuma série existia ainda, inicializa com target_sets
        if (setRows.length === 0) {
          const setsCount = ex.target_sets || 3;
          const initialWeight = prevRows.length > 0 ? prevRows[0].weight : 20.0;
          const initialReps = prevRows.length > 0 ? prevRows[0].reps : (ex.rep_min || 10);

          for (let idx = 1; idx <= setsCount; idx++) {
            const newSetId = `set_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
            rawDb.runSync(
              `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume)
               VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
              [newSetId, ex.id, idx, initialWeight, initialReps]
            );
          }

          setRows = rawDb.getAllSync(
            `SELECT id, session_exercise_id, "index", weight, reps, rpe, completed_at, is_pr_weight, is_pr_volume
             FROM sets
             WHERE session_exercise_id = ?
             ORDER BY "index" ASC`,
            [ex.id]
          );
        }

        const sets: SetItem[] = setRows.map((r) => ({
          id: r.id,
          sessionExerciseId: r.session_exercise_id,
          index: r.index,
          weight: r.weight,
          reps: r.reps,
          rpe: r.rpe,
          completedAt: r.completed_at,
          isPrWeight: Boolean(r.is_pr_weight),
          isPrVolume: Boolean(r.is_pr_volume),
        }));

        items.push({
          id: ex.id,
          exerciseId: ex.exercise_id,
          name: ex.name,
          muscleGroup: ex.muscle_group,
          equipment: ex.equipment,
          defaultIncrement: ex.default_increment ?? defaultIncrement,
          targetSets: ex.target_sets,
          repMin: ex.rep_min,
          repMax: ex.rep_max,
          restS: ex.rest_s,
          note: ex.note,
          previousLog,
          sets,
        });
      }

      setExercises(items);

      // Expande o primeiro exercício com séries pendentes
      const firstIncomplete = items.find((item) =>
        item.sets.some((s) => s.completedAt === null)
      );
      if (firstIncomplete) {
        setExpandedExerciseId(firstIncomplete.id);
      } else if (items.length > 0) {
        setExpandedExerciseId(items[0].id);
      }
    } catch (err) {
      console.warn('Erro ao carregar sessão ativa:', err);
    }
  }, [sessionId, unit]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // 2. CRONÔMETRO RESILIENTE CALCULADO POR TIMESTAMPS
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      if (isPaused && pausedAt) {
        const currentElapsed = Math.floor((pausedAt - startedAt - totalPausedS * 1000) / 1000);
        setElapsedSeconds(Math.max(0, currentElapsed));
      } else {
        const currentElapsed = Math.floor((now - startedAt - totalPausedS * 1000) / 1000);
        setElapsedSeconds(Math.max(0, currentElapsed));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt, totalPausedS, isPaused, pausedAt]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${pad(hours)}:${pad(remMins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }, [elapsedSeconds]);

  // Pausar / Retomar treino
  const handleTogglePause = () => {
    triggerHaptic('light');
    const now = Date.now();
    if (!isPaused) {
      setIsPaused(true);
      setPausedAt(now);
    } else {
      if (pausedAt) {
        const pauseDiffS = Math.floor((now - pausedAt) / 1000);
        const newTotalPaused = totalPausedS + pauseDiffS;
        setTotalPausedS(newTotalPaused);
        try {
          const rawDb = getExpoDb();
          rawDb.runSync(`UPDATE sessions SET total_paused_s = ? WHERE id = ?`, [
            newTotalPaused,
            sessionId || '',
          ]);
        } catch {}
      }
      setIsPaused(false);
      setPausedAt(null);
    }
  };

  // 3. CRONÔMETRO DE DESCANSO REGRESSIVO
  useEffect(() => {
    if (!restActive) return;

    const interval = setInterval(() => {
      const remaining = Math.ceil((restEndTimestamp - Date.now()) / 1000);
      if (remaining <= 0) {
        setRestActive(false);
        setRestRemaining(0);
        triggerHaptic('success');
      } else {
        setRestRemaining(remaining);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [restActive, restEndTimestamp]);

  const formattedRest = useMemo(() => {
    const m = Math.floor(restRemaining / 60);
    const s = restRemaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [restRemaining]);

  const restProgress = useMemo(() => {
    if (restTotalSeconds <= 0) return 0;
    const passed = restTotalSeconds - restRemaining;
    return Math.min(1, Math.max(0, passed / restTotalSeconds));
  }, [restTotalSeconds, restRemaining]);

  const startRestTimer = (seconds: number) => {
    const total = Math.max(15, seconds || defaultRestS || 90);
    setRestTotalSeconds(total);
    setRestRemaining(total);
    setRestEndTimestamp(Date.now() + total * 1000);
    setRestActive(true);
  };

  const handleAdjustRest = (deltaSeconds: number) => {
    triggerHaptic('light');
    const newEnd = restEndTimestamp + deltaSeconds * 1000;
    setRestEndTimestamp(newEnd);
    const newRemaining = Math.max(0, Math.ceil((newEnd - Date.now()) / 1000));
    setRestRemaining(newRemaining);
    if (deltaSeconds > 0) {
      setRestTotalSeconds((prev) => prev + deltaSeconds);
    }
  };

  // 4. ATUALIZAÇÃO E CONCLUSÃO DE SÉRIES
  const handleToggleSetCheck = (exercise: ActiveExerciseItem, setItem: SetItem) => {
    const rawDb = getExpoDb();
    const isAlreadyCompleted = setItem.completedAt !== null;

    if (isAlreadyCompleted) {
      // Desmarca a série
      triggerHaptic('light');
      rawDb.runSync(
        `UPDATE sets SET completed_at = NULL, is_pr_weight = 0, is_pr_volume = 0 WHERE id = ?`,
        [setItem.id]
      );

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setItem.id
                    ? {
                        ...s,
                        completedAt: null,
                        isPrWeight: false,
                        isPrVolume: false,
                      }
                    : s
                ),
              }
            : ex
        )
      );
    } else {
      // Conclui a série
      const completedTime = Date.now();

      // Histórico anterior para detectar PR
      const historyRows = rawDb.getAllSync<{ weight: number; reps: number }>(
        `SELECT st.weight, st.reps
         FROM sets st
         JOIN session_exercises se ON st.session_exercise_id = se.id
         WHERE se.exercise_id = ? AND st.completed_at IS NOT NULL AND st.id != ?`,
        [exercise.exerciseId, setItem.id]
      );

      const pr = detectarPR(historyRows, {
        weight: setItem.weight,
        reps: setItem.reps,
      });

      rawDb.runSync(
        `UPDATE sets 
         SET completed_at = ?, is_pr_weight = ?, is_pr_volume = ?
         WHERE id = ?`,
        [completedTime, pr.isPrWeight ? 1 : 0, pr.isPrVolume ? 1 : 0, setItem.id]
      );

      if (pr.isPrWeight || pr.isPrVolume) {
        triggerHaptic('success');
        setToastMessage(`Novo recorde: ${setItem.weight} ${unit} × ${setItem.reps}`);
        setToastVisible(true);
      } else {
        triggerHaptic('light');
      }

      // Atualiza estado local
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setItem.id
                    ? {
                        ...s,
                        completedAt: completedTime,
                        isPrWeight: pr.isPrWeight,
                        isPrVolume: pr.isPrVolume,
                      }
                    : s
                ),
              }
            : ex
        )
      );

      // Inicia descanso automático se habilitado
      if (autoRestTimer) {
        startRestTimer(exercise.restS || defaultRestS || 90);
      }

      // Se todas as séries deste exercício forem concluídas, expande o próximo
      const allOtherCompleted = exercise.sets
        .filter((s) => s.id !== setItem.id)
        .every((s) => s.completedAt !== null);

      if (allOtherCompleted) {
        const currentIdx = exercises.findIndex((e) => e.id === exercise.id);
        if (currentIdx >= 0 && currentIdx < exercises.length - 1) {
          setExpandedExerciseId(exercises[currentIdx + 1].id);
        }
      }
    }
  };

  // Ajustes de carga e reps (steppers)
  const handleUpdateWeight = (exerciseId: string, setId: string, newWeight: number) => {
    const finalWeight = Math.max(0, Number(newWeight.toFixed(1)));
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE sets SET weight = ? WHERE id = ?`, [finalWeight, setId]);
    } catch {}

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, weight: finalWeight } : s)),
            }
          : ex
      )
    );
  };

  const handleUpdateReps = (exerciseId: string, setId: string, newReps: number) => {
    const finalReps = Math.max(1, Math.round(newReps));
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE sets SET reps = ? WHERE id = ?`, [finalReps, setId]);
    } catch {}

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, reps: finalReps } : s)),
            }
          : ex
      )
    );
  };

  const handleUpdateRpe = (exerciseId: string, setId: string, rpe: number) => {
    triggerHaptic('selection');
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE sets SET rpe = ? WHERE id = ?`, [rpe, setId]);
    } catch {}

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, rpe } : s)),
            }
          : ex
      )
    );
  };

  // Adicionar série ao fim do exercício
  const handleAddSet = (exercise: ActiveExerciseItem) => {
    triggerHaptic('light');
    const rawDb = getExpoDb();
    const nextIdx = exercise.sets.length + 1;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const weight = lastSet ? lastSet.weight : 20.0;
    const reps = lastSet ? lastSet.reps : 10;
    const newSetId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    rawDb.runSync(
      `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
      [newSetId, exercise.id, nextIdx, weight, reps]
    );

    const newSet: SetItem = {
      id: newSetId,
      sessionExerciseId: exercise.id,
      index: nextIdx,
      weight,
      reps,
      rpe: null,
      completedAt: null,
      isPrWeight: false,
      isPrVolume: false,
    };

    setExercises((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, sets: [...ex.sets, newSet] } : ex))
    );
  };

  // 5. AÇÕES DO MENU DO EXERCÍCIO
  const handleOpenActionMenu = (ex: ActiveExerciseItem) => {
    triggerHaptic('light');
    setSelectedExerciseForAction(ex);
    setActionSheetVisible(true);
  };

  const handleSkipExercise = () => {
    if (!selectedExerciseForAction) return;
    triggerHaptic('light');
    const currentIdx = exercises.findIndex((e) => e.id === selectedExerciseForAction.id);
    if (currentIdx >= 0 && currentIdx < exercises.length - 1) {
      setExpandedExerciseId(exercises[currentIdx + 1].id);
    }
  };

  const handleRemoveExercise = () => {
    if (!selectedExerciseForAction) return;
    triggerHaptic('medium');
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`DELETE FROM session_exercises WHERE id = ?`, [selectedExerciseForAction.id]);
    } catch {}

    setExercises((prev) => prev.filter((e) => e.id !== selectedExerciseForAction.id));
  };

  const handleReplaceExercise = () => {
    if (!selectedExerciseForAction) return;
    navigation.navigate('AddExercises', {
      sessionId,
      existingExerciseIds: exercises.map((e) => e.exerciseId),
      fromScreen: 'ActiveSession',
    });
  };

  const handleSaveEditedExercise = (data: {
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
    increment: number;
  }) => {
    if (!selectedExerciseForAction) return;
    try {
      const rawDb = getExpoDb();
      // 1. Atualiza apenas session_exercises (nunca workout_exercises)
      rawDb.runSync(
        `UPDATE session_exercises 
         SET target_sets = ?, rep_min = ?, rep_max = ?, rest_s = ?
         WHERE id = ?`,
        [data.targetSets, data.repMin, data.repMax, data.restS, selectedExerciseForAction.id]
      );

      // 2. Se mudou o incremento padrão, persiste no exercício
      if (data.increment) {
        rawDb.runSync(`UPDATE exercises SET default_increment = ? WHERE id = ?`, [
          data.increment,
          selectedExerciseForAction.exerciseId,
        ]);
      }

      // 3. Ajuste de séries na tabela sets da sessão atual:
      // Se aumentou (ex: de 3 para 5 séries), adiciona linhas novas na hora
      const currentSets = selectedExerciseForAction.sets;
      const diff = data.targetSets - currentSets.length;
      if (diff > 0) {
        const lastSet = currentSets[currentSets.length - 1];
        const weight = lastSet ? lastSet.weight : 20.0;
        const reps = lastSet ? lastSet.reps : data.repMin;
        for (let i = 1; i <= diff; i++) {
          const nextIdx = currentSets.length + i;
          const newSetId = `set_${Date.now()}_${nextIdx}_${Math.random().toString(36).substring(2, 6)}`;
          rawDb.runSync(
            `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume)
             VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
            [newSetId, selectedExerciseForAction.id, nextIdx, weight, reps]
          );
        }
      } else if (diff < 0) {
        // Se diminuiu (sempre respeitando as que já foram concluídas)
        const completedCount = currentSets.filter((s) => s.completedAt !== null).length;
        const targetCount = Math.max(completedCount, data.targetSets);
        rawDb.runSync(
          `DELETE FROM sets 
           WHERE session_exercise_id = ? AND "index" > ? AND completed_at IS NULL`,
          [selectedExerciseForAction.id, targetCount]
        );
      }

      triggerHaptic('success');
      setToastMessage('Exercício atualizado');
      setToastVisible(true);
      loadSession();
    } catch (err) {
      console.warn('Erro ao atualizar exercício da sessão:', err);
    }
  };

  // 6. FINALIZAR SESSÃO
  const totalPendingSets = useMemo(() => {
    return exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completedAt === null).length,
      0
    );
  }, [exercises]);

  const completedExercisesCount = useMemo(() => {
    return exercises.filter(
      (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completedAt !== null)
    ).length;
  }, [exercises]);

  const handleConfirmFinish = () => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ?`, [
        Date.now(),
        sessionId,
      ]);
      triggerHaptic('success');
      setFinishModalVisible(false);
      navigation.replace('WorkoutSummary', {
        sessionId,
      });
    } catch (err) {
      console.warn('Erro ao concluir treino:', err);
    }
  };

  const handleConfirmDiscard = () => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE sessions SET status = 'discarded', ended_at = ? WHERE id = ?`, [
        Date.now(),
        sessionId,
      ]);
      triggerHaptic('medium');
      setDiscardModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (err) {
      console.warn('Erro ao descartar treino:', err);
    }
  };

  // Progressão fina coral
  const progressRatio = exercises.length > 0 ? completedExercisesCount / exercises.length : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. BARRA SUPERIOR (HEADER FIXO) */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.timerChip}>
            <Timer size={16} color={colors.onSurfaceVariant} strokeWidth={2.2} />
            <Text variant="headline" style={styles.timerText}>
              {formattedTimer}
            </Text>
          </View>

          <Pressable
            onPress={handleTogglePause}
            style={styles.pauseButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Retomar treino' : 'Pausar treino'}
          >
            {isPaused ? (
              <Play size={18} color={colors.primary} fill={colors.primary} />
            ) : (
              <Pause size={18} color={colors.onSurfaceVariant} strokeWidth={2.4} />
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => setFinishModalVisible(true)}
          style={styles.finishHeaderButton}
          accessibilityRole="button"
          accessibilityLabel="Finalizar treino"
        >
          <Text variant="labelSmall" style={styles.finishHeaderText}>
            Finalizar
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: restActive ? 140 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. TÍTULO E PROGRESSO DO TREINO */}
        <View style={styles.titleSection}>
          <Text variant="headline" style={styles.workoutMainTitle} numberOfLines={2}>
            {sessionName}
          </Text>

          <View style={styles.progressRow}>
            <Text variant="bodySmall" style={styles.progressText}>
              {groupName ? `Grupo ${groupName} · ` : ''}
              {completedExercisesCount} de {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(progressRatio * 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 3. LISTA DE EXERCÍCIOS (ACCORDION: 1 EXPANDIDO POR VEZ) */}
        {exercises.length === 0 ? (
          /* Sessão livre avulsa sem exercícios */
          <Card variant="surface" style={styles.emptySessionCard}>
            <Dumbbell size={36} color={colors.primary} strokeWidth={1.75} style={{ marginBottom: 8 }} />
            <Text variant="headline" style={styles.emptySessionTitle}>
              Nenhum exercício adicionado
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.emptySessionSubtitle}>
              Monte sua sessão livre adicionando os exercícios que deseja registrar hoje.
            </Text>
            <Button
              title="Adicionar exercício"
              variant="primary"
              icon={<Plus size={20} color={colors.onPrimary} strokeWidth={2.4} />}
              onPress={() =>
                navigation.navigate('AddExercises', {
                  sessionId,
                  existingExerciseIds: [],
                  fromScreen: 'ActiveSession',
                })
              }
              style={{ marginTop: 12, height: 48, borderRadius: radii.pill }}
            />
          </Card>
        ) : (
          <View style={styles.exercisesList}>
            {exercises.map((exercise, exIndex) => {
              const isExpanded = expandedExerciseId === exercise.id;
              const completedCount = exercise.sets.filter((s) => s.completedAt !== null).length;
              const isExerciseComplete = completedCount === exercise.sets.length && exercise.sets.length > 0;

              return (
                <View key={exercise.id}>
                  {isExpanded ? (
                    /* ================= CARTÃO EXPANDIDO ================= */
                    <Card variant="surface" style={styles.expandedCard}>
                      {/* Topo do Exercício Expandido */}
                      <View style={styles.expandedHeader}>
                        <View style={styles.expandedHeaderLeft}>
                          <View style={styles.exerciseNameRow}>
                            <Text variant="headline" style={styles.exerciseTitle}>
                              {exercise.name}
                            </Text>
                            <Pressable
                              onPress={() => {
                                triggerHaptic('light');
                                const currentSet = exercise.sets.find((s) => s.completedAt === null) || exercise.sets[0];
                                setPlateExerciseName(exercise.name);
                                setPlateInitialWeight(currentSet ? currentSet.weight : 60);
                                setPlateSheetVisible(true);
                              }}
                              style={styles.calcIconButton}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel="Abrir calculadora de anilhas"
                            >
                              <Calculator size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                            </Pressable>
                          </View>

                          {exercise.note ? (
                            <Text variant="bodySmall" style={styles.exerciseNoteText}>
                              {exercise.note}
                            </Text>
                          ) : (
                            <Text variant="bodySmall" style={styles.exerciseMuscleText}>
                              {exercise.muscleGroup} · {exercise.equipment}
                            </Text>
                          )}
                        </View>

                        <Pressable
                          onPress={() => handleOpenActionMenu(exercise)}
                          style={styles.menuButton}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Mais opções do exercício"
                        >
                          <MoreVertical size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
                        </Pressable>
                      </View>

                      {/* Cabeçalho das Colunas da Tabela */}
                      <View style={styles.tableHeaderRow}>
                        <Text variant="labelSmall" style={styles.colSerie}>
                          Série
                        </Text>
                        <Text variant="labelSmall" style={styles.colAnterior}>
                          Anterior
                        </Text>
                        <Text variant="labelSmall" style={styles.colCarga}>
                          Carga ({unit})
                        </Text>
                        <Text variant="labelSmall" style={styles.colReps}>
                          Reps
                        </Text>
                        <Text variant="labelSmall" style={styles.colCheck}>
                          Check
                        </Text>
                      </View>

                      {/* Linhas de Séries */}
                      <View style={styles.setsTable}>
                        {exercise.sets.map((setItem, sIdx) => {
                          const isDone = setItem.completedAt !== null;
                          const isCurrent =
                            !isDone &&
                            exercise.sets.slice(0, sIdx).every((s) => s.completedAt !== null);

                          return (
                            <View key={setItem.id} style={styles.setRowWrapper}>
                              <View
                                style={[
                                  styles.setRow,
                                  isDone && styles.setRowDone,
                                  isCurrent && styles.setRowCurrent,
                                  !isDone && !isCurrent && styles.setRowPending,
                                ]}
                              >
                                {/* 1. Número da Série */}
                                <View style={styles.colSerie}>
                                  <View
                                    style={[
                                      styles.setIndexCircle,
                                      isDone && styles.setIndexCircleDone,
                                      isCurrent && styles.setIndexCircleCurrent,
                                    ]}
                                  >
                                    <Text
                                      variant="labelSmall"
                                      style={[
                                        styles.setIndexText,
                                        isCurrent && { color: colors.background, fontWeight: '700' },
                                      ]}
                                    >
                                      {setItem.index}
                                    </Text>
                                  </View>
                                </View>

                                {/* 2. Anterior */}
                                <View style={styles.colAnterior}>
                                  <Text variant="bodySmall" style={styles.previousLogText} numberOfLines={1}>
                                    {exercise.previousLog}
                                  </Text>
                                </View>

                                {/* 3. Carga (kg) com steppers */}
                                <View style={styles.colCarga}>
                                  <View style={styles.stepperContainer}>
                                    <Pressable
                                      onPress={() =>
                                        handleUpdateWeight(
                                          exercise.id,
                                          setItem.id,
                                          setItem.weight - defaultIncrement
                                        )
                                      }
                                      style={styles.microStepButton}
                                      hitSlop={4}
                                    >
                                      <Minus size={12} color={colors.onSurfaceVariant} strokeWidth={2.4} />
                                    </Pressable>

                                    <Pressable
                                      onPress={() => {
                                        setNumberModalTitle(`Carga (${unit}) - Série ${setItem.index}`);
                                        setNumberModalValue(String(setItem.weight));
                                        setNumberModalCallback(() => (val: number) => {
                                          handleUpdateWeight(exercise.id, setItem.id, val);
                                        });
                                        setNumberModalVisible(true);
                                      }}
                                      style={styles.numberBox}
                                    >
                                      <Text
                                        variant="headline"
                                        style={[
                                          styles.numberBoxText,
                                          isCurrent && { color: colors.primary },
                                        ]}
                                      >
                                        {setItem.weight}
                                      </Text>
                                    </Pressable>

                                    <Pressable
                                      onPress={() =>
                                        handleUpdateWeight(
                                          exercise.id,
                                          setItem.id,
                                          setItem.weight + defaultIncrement
                                        )
                                      }
                                      style={styles.microStepButton}
                                      hitSlop={4}
                                    >
                                      <Plus size={12} color={colors.onSurfaceVariant} strokeWidth={2.4} />
                                    </Pressable>
                                  </View>
                                </View>

                                {/* 4. Reps com steppers */}
                                <View style={styles.colReps}>
                                  <View style={styles.stepperContainer}>
                                    <Pressable
                                      onPress={() =>
                                        handleUpdateReps(exercise.id, setItem.id, setItem.reps - 1)
                                      }
                                      style={styles.microStepButton}
                                      hitSlop={4}
                                    >
                                      <Minus size={12} color={colors.onSurfaceVariant} strokeWidth={2.4} />
                                    </Pressable>

                                    <Pressable
                                      onPress={() => {
                                        setNumberModalTitle(`Repetições - Série ${setItem.index}`);
                                        setNumberModalValue(String(setItem.reps));
                                        setNumberModalCallback(() => (val: number) => {
                                          handleUpdateReps(exercise.id, setItem.id, val);
                                        });
                                        setNumberModalVisible(true);
                                      }}
                                      style={styles.numberBox}
                                    >
                                      <Text
                                        variant="headline"
                                        style={[
                                          styles.numberBoxText,
                                          isCurrent && { color: colors.primary },
                                        ]}
                                      >
                                        {setItem.reps}
                                      </Text>
                                    </Pressable>

                                    <Pressable
                                      onPress={() =>
                                        handleUpdateReps(exercise.id, setItem.id, setItem.reps + 1)
                                      }
                                      style={styles.microStepButton}
                                      hitSlop={4}
                                    >
                                      <Plus size={12} color={colors.onSurfaceVariant} strokeWidth={2.4} />
                                    </Pressable>
                                  </View>
                                </View>

                                {/* 5. Check Button 48px */}
                                <View style={styles.colCheck}>
                                  <Pressable
                                    onPress={() => handleToggleSetCheck(exercise, setItem)}
                                    style={[
                                      styles.checkButton,
                                      isDone && styles.checkButtonDone,
                                      isCurrent && styles.checkButtonCurrent,
                                      !isDone && !isCurrent && styles.checkButtonPending,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Marcar série ${setItem.index} como concluída`}
                                  >
                                    {isDone ? (
                                      <Check size={22} color={colors.onPrimary} strokeWidth={3} />
                                    ) : isCurrent ? (
                                      <Check size={20} color={colors.primary} strokeWidth={2.5} />
                                    ) : (
                                      <Check size={18} color="rgba(255, 255, 255, 0.15)" strokeWidth={2} />
                                    )}
                                  </Pressable>
                                </View>
                              </View>

                              {/* Linha recolhível de RPE opcional após conclusão da série */}
                              {isDone && (
                                <View style={styles.rpeRow}>
                                  <Text variant="labelSmall" color="secondary" style={styles.rpeLabel}>
                                    RPE:
                                  </Text>
                                  <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.rpeScroll}
                                  >
                                    {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((rVal) => {
                                      const isRpeSelected = setItem.rpe === rVal;
                                      return (
                                        <Pressable
                                          key={rVal}
                                          onPress={() => handleUpdateRpe(exercise.id, setItem.id, rVal)}
                                          style={[
                                            styles.rpeChip,
                                            isRpeSelected && styles.rpeChipSelected,
                                          ]}
                                        >
                                          <Text
                                            variant="labelSmall"
                                            style={[
                                              styles.rpeChipText,
                                              isRpeSelected && styles.rpeChipTextSelected,
                                            ]}
                                          >
                                            {rVal}
                                          </Text>
                                        </Pressable>
                                      );
                                    })}
                                  </ScrollView>

                                  {setItem.isPrWeight && (
                                    <View style={{ marginLeft: 8 }}>
                                      <PRBadge label="PR" />
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>

                      {/* Botão + Adicionar Série */}
                      <Pressable
                        onPress={() => handleAddSet(exercise)}
                        style={styles.addSetButton}
                        accessibilityRole="button"
                        accessibilityLabel="Adicionar nova série ao exercício"
                      >
                        <Plus size={16} color={colors.onSurfaceVariant} strokeWidth={2.4} />
                        <Text variant="bodyMedium" style={styles.addSetText}>
                          Adicionar série
                        </Text>
                      </Pressable>
                    </Card>
                  ) : (
                    /* ================= CARTÃO RECOLHIDO ================= */
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                        setExpandedExerciseId(exercise.id);
                      }}
                      style={({ pressed }) => [
                        styles.collapsedCard,
                        isExerciseComplete && styles.collapsedCardComplete,
                        pressed && { opacity: 0.9 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Expandir exercício: ${exercise.name}`}
                    >
                      <View style={styles.collapsedLeft}>
                        <View
                          style={[
                            styles.collapsedIndexCircle,
                            isExerciseComplete && styles.collapsedIndexCircleComplete,
                          ]}
                        >
                          <Text
                            variant="labelSmall"
                            style={[
                              styles.collapsedIndexText,
                              isExerciseComplete && { color: colors.background, fontWeight: '700' },
                            ]}
                          >
                            {exIndex + 1}
                          </Text>
                        </View>

                        <View style={styles.collapsedInfo}>
                          <Text variant="bodyLarge" style={styles.collapsedNameText}>
                            {exercise.name}
                          </Text>
                          <Text variant="bodySmall" color="secondary">
                            {completedCount > 0 ? `${completedCount}/${exercise.sets.length} séries · ` : ''}
                            {exercise.targetSets} séries · {exercise.repMin}-{exercise.repMax} reps
                          </Text>
                        </View>
                      </View>

                      <View style={styles.collapsedRight}>
                        {isExerciseComplete ? (
                          <View style={styles.completeCheckBadge}>
                            <Check size={14} color={colors.onPrimary} strokeWidth={3} />
                          </View>
                        ) : null}
                        <ChevronDown size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
                      </View>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {/* BOTÃO PARA ADICIONAR EXERCÍCIO ADICIONAL AO TREINO */}
            <Pressable
              onPress={() =>
                navigation.navigate('AddExercises', {
                  sessionId,
                  existingExerciseIds: exercises.map((e) => e.exerciseId),
                  fromScreen: 'ActiveSession',
                })
              }
              style={styles.addExerciseFooterButton}
              accessibilityRole="button"
              accessibilityLabel="Adicionar exercício a este treino"
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.4} />
              <Text variant="bodyMedium" style={styles.addExerciseFooterText}>
                Adicionar exercício
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 4. RODAPÉ FIXO DE DESCANSO (APARECE SOMENTE DURANTE O DESCANSO) */}
      {restActive && (
        <View style={styles.restFloatingFooter}>
          <View style={styles.restCard}>
            <View style={styles.restTopRow}>
              <View style={styles.restInfo}>
                <View style={styles.restIconCircle}>
                  <Timer size={20} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text variant="labelSmall" style={styles.restLabel}>
                    Descanso
                  </Text>
                  <Text variant="headline" style={styles.restCountdownText}>
                    {formattedRest}
                  </Text>
                </View>
              </View>

              {/* Botões sem quebra de texto */}
              <View style={styles.restActionsRow}>
                <Pressable
                  onPress={() => handleAdjustRest(-15)}
                  style={styles.restPillButton}
                  hitSlop={4}
                >
                  <Text variant="labelSmall" style={styles.restPillText}>
                    −15 s
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleAdjustRest(+30)}
                  style={[styles.restPillButton, styles.restPillButtonCoral]}
                  hitSlop={4}
                >
                  <Text variant="labelSmall" style={styles.restPillTextCoral}>
                    +30 s
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    setRestActive(false);
                  }}
                  style={styles.restSkipButton}
                  hitSlop={4}
                >
                  <Text variant="labelSmall" style={styles.restSkipText}>
                    Pular
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Barra de Progresso do Descanso */}
            <View style={styles.restProgressBarTrack}>
              <View
                style={[
                  styles.restProgressBarFill,
                  { width: `${Math.round(restProgress * 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* 5. SHEETS E MODAIS */}
      <PlateCalculatorSheet
        visible={plateSheetVisible}
        onClose={() => setPlateSheetVisible(false)}
        exerciseName={plateExerciseName}
        initialWeight={plateInitialWeight}
        unit={unit}
      />

      <ActiveExerciseActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        exerciseName={selectedExerciseForAction?.name}
        onEditThisSession={() => setEditSheetVisible(true)}
        onSkipExercise={handleSkipExercise}
        onReplaceExercise={handleReplaceExercise}
        onRemoveExercise={handleRemoveExercise}
      />

      <EditSessionExerciseSheet
        visible={editSheetVisible}
        onClose={() => setEditSheetVisible(false)}
        exerciseName={selectedExerciseForAction?.name}
        initialTargetSets={selectedExerciseForAction?.targetSets}
        initialRepMin={selectedExerciseForAction?.repMin}
        initialRepMax={selectedExerciseForAction?.repMax}
        initialRestS={selectedExerciseForAction?.restS}
        initialIncrement={selectedExerciseForAction?.defaultIncrement}
        completedSetsCount={
          selectedExerciseForAction?.sets.filter((s) => s.completedAt !== null).length || 0
        }
        onSave={handleSaveEditedExercise}
        onRemove={() => {
          handleRemoveExercise();
          setToastMessage('Exercício removido deste treino');
          setToastVisible(true);
        }}
      />

      {/* MODAL DE CONFIRMAÇÃO DE CONCLUSÃO */}
      <ConfirmModal
        visible={finishModalVisible}
        title="Finalizar este treino?"
        description={
          totalPendingSets > 0
            ? `${totalPendingSets} ${totalPendingSets === 1 ? 'série não foi feita' : 'séries não foram feitas'}. Deseja concluir a sessão mesmo assim?`
            : 'Todas as séries planejadas foram concluídas!'
        }
        confirmLabel="Concluir treino"
        cancelLabel="Continuar treinando"
        isDanger={false}
        onConfirm={handleConfirmFinish}
        onCancel={() => setFinishModalVisible(false)}
      />

      {/* MODAL DE CONFIRMAÇÃO DE DESCARTE */}
      <ConfirmModal
        visible={discardModalVisible}
        title="Descartar treino em andamento?"
        description="O progresso desta sessão não será salvo no histórico."
        confirmLabel="Descartar"
        cancelLabel="Continuar treinando"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setDiscardModalVisible(false)}
      />

      {/* MODAL POPUP PARA ENTRADA NUMÉRICA RÁPIDA */}
      <Modal
        visible={numberModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNumberModalVisible(false)}
      >
        <Pressable
          style={styles.numberModalOverlay}
          onPress={() => setNumberModalVisible(false)}
        >
          <Pressable style={styles.numberModalContent} onPress={(e) => e.stopPropagation()}>
            <Text variant="headline" style={styles.numberModalTitle}>
              {numberModalTitle}
            </Text>
            <TextInput
              style={styles.numberModalInput}
              keyboardType="numeric"
              value={numberModalValue}
              onChangeText={setNumberModalValue}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.numberModalActions}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setNumberModalVisible(false)}
                style={{ flex: 1, height: 44, borderRadius: radii.pill }}
              />
              <Button
                title="Salvar"
                variant="primary"
                onPress={() => {
                  const num = parseFloat(numberModalValue.replace(',', '.'));
                  if (!isNaN(num)) {
                    numberModalCallback(num);
                  }
                  setNumberModalVisible(false);
                }}
                style={{ flex: 1, height: 44, borderRadius: radii.pill }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* TOAST DE RECORDE */}
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
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(26, 23, 21, 0.95)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  timerText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    fontWeight: '700',
  },
  pauseButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishHeaderButton: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  finishHeaderText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  titleSection: {
    gap: 6,
    paddingTop: 4,
  },
  workoutMainTitle: {
    fontSize: 28,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  progressRow: {
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  progressBarTrack: {
    height: 4,
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  emptySessionCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptySessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySessionSubtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  exercisesList: {
    gap: 12,
  },

  /* EXPANDED CARD */
  expandedCard: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#3A3531',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  expandedHeaderLeft: {
    flex: 1,
    gap: 3,
    paddingRight: 8,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  exerciseTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.primary,
  },
  calcIconButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  exerciseNoteText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  exerciseMuscleText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  colSerie: {
    width: 44,
    alignItems: 'flex-start',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  colAnterior: {
    flex: 1.1,
    alignItems: 'flex-start',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  colCarga: {
    flex: 1.2,
    alignItems: 'center',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  colReps: {
    flex: 1.1,
    alignItems: 'center',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  colCheck: {
    width: 48,
    alignItems: 'center',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  setsTable: {
    gap: 8,
  },
  setRowWrapper: {
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 23, 21, 0.4)',
  },
  setRowDone: {
    backgroundColor: 'rgba(26, 23, 21, 0.6)',
  },
  setRowCurrent: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 122, 89, 0.5)',
  },
  setRowPending: {
    opacity: 0.7,
  },
  setIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#352F28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndexCircleDone: {
    backgroundColor: '#352F28',
  },
  setIndexCircleCurrent: {
    backgroundColor: colors.primary,
  },
  setIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  previousLogText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  microStepButton: {
    width: 22,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBox: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBoxText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDone: {
    backgroundColor: colors.primary,
  },
  checkButtonCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
  },
  checkButtonPending: {
    borderWidth: 1,
    borderColor: '#4D463E',
  },
  rpeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  rpeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  rpeScroll: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  rpeChip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rpeChipSelected: {
    backgroundColor: 'rgba(255, 122, 89, 0.18)',
    borderColor: colors.primary,
  },
  rpeChipText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  rpeChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  addSetButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },

  /* COLLAPSED CARD */
  collapsedCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#352F28',
  },
  collapsedCardComplete: {
    borderColor: 'rgba(255, 122, 89, 0.3)',
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  collapsedIndexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#352F28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedIndexCircleComplete: {
    backgroundColor: colors.primary,
  },
  collapsedIndexText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  collapsedInfo: {
    flex: 1,
    gap: 2,
  },
  collapsedNameText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  collapsedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExerciseFooterButton: {
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addExerciseFooterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  /* FIXED REST BOTTOM BAR */
  restFloatingFooter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  restCard: {
    backgroundColor: '#3A251F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.6)',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  restTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 122, 89, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  restCountdownText: {
    fontSize: 24,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 28,
  },
  restActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restPillButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: '#23201D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restPillButtonCoral: {
    backgroundColor: '#23201D',
  },
  restPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  restPillTextCoral: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  restSkipButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restSkipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  restProgressBarTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#23201D',
    borderRadius: 2,
    overflow: 'hidden',
  },
  restProgressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  /* MODAL NUMÉRICO POPUP */
  numberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  numberModalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  numberModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  numberModalInput: {
    height: 52,
    backgroundColor: colors.background,
    borderRadius: radii.input,
    paddingHorizontal: 16,
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  numberModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
