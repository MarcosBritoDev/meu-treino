import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Clock,
  Trophy,
  Flame,
  Trash2,
  FileText,
  ChevronRight,
  Edit3,
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
import { QuickNumberPadSheet } from '../ui/QuickNumberPadSheet';
import { ExerciseCard } from '../ui/ExerciseCard';
import { SetTypeSheet, SetTypeOptionKey } from '../ui/SetTypeSheet';
import { triggerHaptic } from '../ui/haptics';
import { useSettingsStore } from '../store/useSettingsStore';
import { getExpoDb } from '../db/client';
import { SetTable } from '../ui/session/SetTable';
import { RestFooter } from '../ui/session/RestFooter';
import {
  Unit,
  formatWeight,
  parseNumber,
  displayToKg,
  detectarPR,
  cycleRest,
  adjustRest,
  defaultRestFor,
  suggestDropWeightKg,
  calcDropFromWeightKg,
  recalculateDropCascade,
  canGeneratePR,
  SetType,
  RepsMode,
  EffortMode,
} from '../domain/sessionMath';

type RouteParams = RouteProp<RootStackParamList, 'ActiveSession'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SetItem {
  id: string;
  sessionExerciseId: string;
  index: number;
  weight: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  completedAt: number | null;
  isPrWeight: boolean;
  isPrVolume: boolean;
  type: SetType;
  repsMode: RepsMode;
  minReps?: number | null;
  maxReps?: number | null;
  effortMode: EffortMode;
  effortValue?: number | null;
  effortValueMax?: number | null;
  effortRefExerciseId?: string | null;
  restS?: number | null;
  is_session_only: boolean;
  drop_percent?: number | null;
  manual_weight?: boolean;
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
  previousSets: { weight: number; reps: number }[];
  sets: SetItem[];
}

export const ActiveSessionScreen: React.FC = () => {
  // Mantém a tela acesa durante todo o treino em andamento
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const sessionId = route.params?.sessionId;

  const { unit, defaultIncrement, defaultRestS, autoRestTimer, restAlert } = useSettingsStore();

  // Estados principais da sessão
  const [sessionName, setSessionName] = useState('Treino em andamento');
  const [groupName, setGroupName] = useState<string | null>(null);
  const [sessionNote, setSessionNote] = useState<string>('');
  const [sessionNoteModalVisible, setSessionNoteModalVisible] = useState(false);
  const [sessionNoteInput, setSessionNoteInput] = useState('');
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [totalPausedS, setTotalPausedS] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [exercises, setExercises] = useState<ActiveExerciseItem[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

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
  const [numberModalType, setNumberModalType] = useState<'weight' | 'reps'>('weight');
  const [numberModalCallback, setNumberModalCallback] = useState<(val: number) => void>(() => () => {});

  // Linha de RPE aberta para a série selecionada


  // Sheet de Adicionar Série (SetTypeSheet com 6 opções)
  const [setTypeSheetVisible, setSetTypeSheetVisible] = useState(false);
  const [addSetExerciseId, setAddSetExerciseId] = useState<string | null>(null);

  // Menu de opções da série (toque longo: aquecimento / remover)
  const [setMenuVisible, setSetMenuVisible] = useState(false);
  const [selectedSetForMenu, setSelectedSetForMenu] = useState<{
    exercise: ActiveExerciseItem;
    set: SetItem;
  } | null>(null);

  // Edição rápida de notas do exercício
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedExerciseForNote, setSelectedExerciseForNote] = useState<ActiveExerciseItem | null>(null);
  const [noteModalValue, setNoteModalValue] = useState('');

  // Toast para notificações de PR e avisos
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. CARREGAMENTO COMPLETO DA SESSÃO ATIVA
  const loadSession = useCallback(() => {
    if (!sessionId) return;
    try {
      const rawDb = getExpoDb();

      // Garantir coluna de notas da sessão
      try {
        rawDb.runSync(`ALTER TABLE sessions ADD COLUMN note TEXT;`);
      } catch {}

      // Sessão
      const sessRows = rawDb.getAllSync<{
        id: string;
        workout_id: string | null;
        name_snapshot: string;
        started_at: number;
        total_paused_s: number;
        note?: string | null;
      }>(
        `SELECT id, workout_id, name_snapshot, started_at, total_paused_s, note
         FROM sessions
         WHERE id = ?`,
        [sessionId]
      );

      if (sessRows.length === 0) return;

      const s = sessRows[0];
      setSessionName(s.name_snapshot);
      setStartedAt(s.started_at);
      setTotalPausedS(s.total_paused_s || 0);
      setSessionNote(s.note || '');

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
        // Histórico anterior deste exercício para a coluna "Anterior" (todas as séries sem aquecimento da última sessão concluída)
        const lastSessRow = rawDb.getAllSync<{ id: string }>(
          `SELECT s.id
           FROM sessions s
           JOIN session_exercises se ON se.session_id = s.id
           WHERE se.exercise_id = ? AND s.status = 'completed'
           ORDER BY s.ended_at DESC
           LIMIT 1`,
          [ex.exercise_id]
        );

        let previousSets: { weight: number; reps: number }[] = [];
        if (lastSessRow.length > 0) {
          const prevRows = rawDb.getAllSync<{ weight: number; reps: number }>(
            `SELECT st.weight, st.reps
             FROM sets st
             JOIN session_exercises se ON st.session_exercise_id = se.id
             WHERE se.exercise_id = ? AND se.session_id = ? AND st.completed_at IS NOT NULL AND st.is_warmup = 0
             ORDER BY st."index" ASC`,
            [ex.exercise_id, lastSessRow[0].id]
          );
          previousSets = prevRows.map((r) => ({ weight: r.weight, reps: r.reps }));
        }

        const previousLog =
          previousSets.length > 0
            ? `${formatWeight(previousSets[0].weight, unit)} ${unit} × ${previousSets[0].reps}`
            : '—';

        // Séries salvas desta sessão
        let setRows = rawDb.getAllSync<{
          id: string;
          session_exercise_id: string;
          index: number;
          weight: number;
          reps: number;
          rpe: number | null;
          is_warmup: number;
          completed_at: number | null;
          is_pr_weight: number;
          is_pr_volume: number;
          type?: string;
          reps_mode?: string;
          min_reps?: number | null;
          max_reps?: number | null;
          effort_mode?: string;
          effort_value?: number | null;
          effort_value_max?: number | null;
          effort_ref_exercise_id?: string | null;
          rest_s?: number | null;
          is_session_only?: number;
          drop_percent?: number | null;
        }>(
          `SELECT id, session_exercise_id, "index", weight, reps, rpe, is_warmup, completed_at, is_pr_weight, is_pr_volume,
                  type, reps_mode, min_reps, max_reps, effort_mode, effort_value, effort_value_max, effort_ref_exercise_id, rest_s, is_session_only, drop_percent
           FROM sets
           WHERE session_exercise_id = ?
           ORDER BY "index" ASC`,
          [ex.id]
        );

        // Se nenhuma série existia ainda, inicializa com target_sets
        if (setRows.length === 0) {
          const setsCount = ex.target_sets || 3;
          const initialWeight = previousSets.length > 0 ? previousSets[0].weight : 20.0;
          const initialReps = previousSets.length > 0 ? previousSets[0].reps : (ex.rep_min || 10);

          for (let idx = 1; idx <= setsCount; idx++) {
            const newSetId = `set_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
            rawDb.runSync(
              `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume, type, reps_mode, min_reps, max_reps, effort_mode, is_session_only, drop_percent)
               VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'normal', 'reps_range', ?, ?, 'none', 0, NULL)`,
              [newSetId, ex.id, idx, initialWeight, initialReps, ex.rep_min || 8, ex.rep_max || 12]
            );
          }

          setRows = rawDb.getAllSync(
            `SELECT id, session_exercise_id, "index", weight, reps, rpe, is_warmup, completed_at, is_pr_weight, is_pr_volume,
                    type, reps_mode, min_reps, max_reps, effort_mode, effort_value, effort_value_max, effort_ref_exercise_id, rest_s, is_session_only, drop_percent
             FROM sets
             WHERE session_exercise_id = ?
             ORDER BY "index" ASC`,
            [ex.id]
          );
        }

        const sets: SetItem[] = setRows.map((r) => {
          const prevManual = exercises.find((e) => e.id === ex.id)?.sets.find((s) => s.id === r.id)?.manual_weight;
          return {
            id: r.id,
            sessionExerciseId: r.session_exercise_id,
            index: r.index,
            weight: r.weight,
            reps: r.reps,
            rpe: r.rpe,
            isWarmup: Boolean(r.is_warmup || r.type === 'warmup'),
            completedAt: r.completed_at,
            isPrWeight: Boolean(r.is_pr_weight),
            isPrVolume: Boolean(r.is_pr_volume),
            type: (r.type as SetType) || (r.is_warmup ? 'warmup' : 'normal'),
            repsMode: (r.reps_mode as RepsMode) || 'reps_range',
            minReps: r.min_reps,
            maxReps: r.max_reps,
            effortMode: (r.effort_mode as EffortMode) || 'none',
            effortValue: r.effort_value,
            effortValueMax: r.effort_value_max,
            effortRefExerciseId: r.effort_ref_exercise_id,
            restS: r.rest_s,
            is_session_only: Boolean(r.is_session_only),
            drop_percent: r.drop_percent,
            manual_weight: prevManual ?? false,
          };
        });

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
          previousSets,
          sets,
        });
      }

      setExercises(items);

      // Opção B: Inicializa mapa de expansão para cada exercício (iniciam abertos)
      setExpandedMap((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = true;
          }
        });
        return next;
      });

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
    setRestRemaining((prev) => adjustRest(prev, deltaSeconds));
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
      // Conclui a série imediatamente (sem RPE realizado)
      const completedTime = Date.now();

      // Regra de PR: Warmup e Drop NUNCA geram PR
      let isPrW = false;
      let isPrV = false;

      if (canGeneratePR(setItem)) {
        const historyRows = rawDb.getAllSync<{ weight: number; reps: number; is_warmup: number; type?: string }>(
          `SELECT st.weight, st.reps, st.is_warmup, st.type
           FROM sets st
           JOIN session_exercises se ON st.session_exercise_id = se.id
           WHERE se.exercise_id = ? AND st.completed_at IS NOT NULL AND st.id != ? AND st.is_warmup = 0`,
          [exercise.exerciseId, setItem.id]
        );

        const pr = detectarPR(
          historyRows.map((h) => ({
            weight: h.weight,
            reps: h.reps,
            isWarmup: Boolean(h.is_warmup),
            type: h.type,
          })),
          {
            weight: setItem.weight,
            reps: setItem.reps,
            type: setItem.type,
            isWarmup: setItem.isWarmup,
          }
        );
        isPrW = pr.isPrWeight;
        isPrV = pr.isPrVolume;
      }

      rawDb.runSync(
        `UPDATE sets 
         SET completed_at = ?, is_pr_weight = ?, is_pr_volume = ?
         WHERE id = ?`,
        [completedTime, isPrW ? 1 : 0, isPrV ? 1 : 0, setItem.id]
      );

      if (isPrW || isPrV) {
        triggerHaptic('success');
        setToastMessage(`Novo recorde: ${formatWeight(setItem.weight, unit)} ${unit} × ${setItem.reps}`);
        setToastVisible(true);
      } else {
        triggerHaptic('light');
      }

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
                        isPrWeight: isPrW,
                        isPrVolume: isPrV,
                      }
                    : s
                ),
              }
            : ex
        )
      );

      // Dispara o cronômetro de descanso ou aplica descanso inteligente para Drop
      const currentIdx = exercise.sets.findIndex((s) => s.id === setItem.id);
      const nextSet =
        currentIdx >= 0 && currentIdx < exercise.sets.length - 1
          ? exercise.sets[currentIdx + 1]
          : null;

      if (nextSet && nextSet.type === 'drop') {
        // Se a próxima série for drop: NÃO inicia o cronômetro, zera descanso ativo e exibe toast
        setRestActive(false);
        setRestRemaining(0);
        setRestTotalSeconds(0);
        setToastMessage('Sem descanso! Reduza a carga para o Drop');
        setToastVisible(true);
      } else {
        const restTime = setItem.restS ?? exercise.restS ?? defaultRestFor(setItem.type);
        if (autoRestTimer && restTime > 0) {
          startRestTimer(restTime);
        }
      }

      // Se todas as séries deste exercício forem concluídas, expande o próximo
      const allOtherCompleted = exercise.sets
        .filter((s) => s.id !== setItem.id)
        .every((s) => s.completedAt !== null);

      if (allOtherCompleted) {
        const currentIdx = exercises.findIndex((e) => e.id === exercise.id);
        if (currentIdx >= 0 && currentIdx < exercises.length - 1) {
          const nextExId = exercises[currentIdx + 1].id;
          setExpandedExerciseId(nextExId);
          setExpandedMap((prev) => ({
            ...prev,
            [nextExId]: true,
          }));
        }
      }
    }
  };

  // Atualiza carga de série com suporte a cascata de Drop Sets e trava manual
  const updateExerciseSetWeight = (
    exerciseId: string,
    setId: string,
    weightKg: number | null,
    isClear = false
  ) => {
    const rawDb = getExpoDb();
    setExercises((prev) => {
      const exIdx = prev.findIndex((e) => e.id === exerciseId);
      if (exIdx === -1) return prev;
      const ex = prev[exIdx];
      const setIdx = ex.sets.findIndex((s) => s.id === setId);
      if (setIdx === -1) return prev;

      const targetSet = ex.sets[setIdx];
      const updatedSets = ex.sets.map((s) => ({ ...s }));

      if (isClear) {
        if (targetSet.type === 'drop') {
          updatedSets[setIdx].manual_weight = false;
          const cascaded = recalculateDropCascade(
            updatedSets,
            setIdx - 1,
            ex.defaultIncrement ?? defaultIncrement ?? 2.5
          );
          for (let i = setIdx; i < cascaded.length; i++) {
            const s = cascaded[i];
            rawDb.runSync(`UPDATE sets SET weight = ? WHERE id = ?`, [s.weight, s.id]);
          }
          return prev.map((e, idx) => (idx === exIdx ? { ...e, sets: cascaded } : e));
        }
        return prev;
      }

      if (weightKg !== null) {
        const finalKg = Math.max(0, Number(weightKg.toFixed(2)));
        updatedSets[setIdx].weight = finalKg;
        if (targetSet.type === 'drop') {
          updatedSets[setIdx].manual_weight = true;
        }

        const cascaded = recalculateDropCascade(
          updatedSets,
          setIdx,
          ex.defaultIncrement ?? defaultIncrement ?? 2.5
        );

        for (let i = setIdx; i < cascaded.length; i++) {
          const s = cascaded[i];
          rawDb.runSync(`UPDATE sets SET weight = ? WHERE id = ?`, [s.weight, s.id]);
        }

        return prev.map((e, idx) => (idx === exIdx ? { ...e, sets: cascaded } : e));
      }

      return prev;
    });
  };

  // Alteração direta de carga ou repetições
  const handleActiveChange = (exerciseId: string, setId: string, field: string, value: any) => {
    const rawDb = getExpoDb();
    if (field === 'weight') {
      if (value === '' || value === null || (typeof value === 'string' && value.trim() === '')) {
        updateExerciseSetWeight(exerciseId, setId, null, true);
      } else {
        const parsed = typeof value === 'number' ? value : parseNumber(String(value));
        if (parsed !== null) {
          const kg = unit === 'kg' ? parsed : displayToKg(parsed, unit);
          updateExerciseSetWeight(exerciseId, setId, kg, false);
        }
      }
    } else if (field === 'reps') {
      const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        rawDb.runSync(`UPDATE sets SET reps = ? WHERE id = ?`, [parsed, setId]);
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s) => (s.id === setId ? { ...s, reps: parsed } : s)),
                }
              : ex
          )
        );
      }
    }
  };

  // Adicionar série via SetTypeSheet (com isolamento: is_session_only = 1)
  const handleAddSetFromOption = (optionKey: SetTypeOptionKey) => {
    if (!addSetExerciseId) return;
    const targetExercise = exercises.find((e) => e.id === addSetExerciseId);
    if (!targetExercise) return;

    const rawDb = getExpoDb();
    const nextIdx = targetExercise.sets.length + 1;
    const newSetId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let setType: SetType = 'normal';
    let repsMode: RepsMode = 'reps_range';
    let minReps: number | null = targetExercise.repMin || 8;
    let maxReps: number | null = targetExercise.repMax || 10;
    let effortMode: EffortMode = 'none';
    let effortValue: number | null = null;
    let initialKg: number | null = null;

    if (optionKey === 'warmup') {
      setType = 'warmup';
      minReps = 8;
      maxReps = 12;
      initialKg = 20.0;
    } else if (optionKey === 'rpe') {
      effortMode = 'rpe';
      effortValue = 8;
    } else if (optionKey === 'rir') {
      effortMode = 'rir';
      effortValue = 2;
    } else if (optionKey === 'failure') {
      setType = 'failure';
      repsMode = 'reps_max';
      minReps = null;
      maxReps = null;
    } else if (optionKey === 'drop') {
      setType = 'drop';
      repsMode = 'reps_max';
      minReps = null;
      maxReps = null;
      effortMode = 'none';
      effortValue = null;
      const prevSet = targetExercise.sets[targetExercise.sets.length - 1];
      const prevKg = prevSet?.weight ?? null;
      initialKg = calcDropFromWeightKg(prevKg, 20, targetExercise.defaultIncrement ?? 2.5);
    }

    if (initialKg === null) {
      const lastNonWarmup = [...targetExercise.sets].reverse().find((s) => !s.isWarmup && s.weight > 0);
      initialKg = lastNonWarmup?.weight ?? (targetExercise.previousSets?.[0]?.weight || 20.0);
    }

    const initialReps =
      (repsMode === 'reps_max' ? maxReps : minReps) ??
      minReps ??
      maxReps ??
      (targetExercise.previousSets?.[0]?.reps || 10);

    const dropPercent = setType === 'drop' ? 20 : null;

    rawDb.runSync(
      `INSERT INTO sets (
         id, session_exercise_id, "index", weight, reps, rpe, is_warmup,
         completed_at, is_pr_weight, is_pr_volume, type, reps_mode,
         min_reps, max_reps, effort_mode, effort_value, effort_value_max,
         effort_ref_exercise_id, rest_s, is_session_only, drop_percent
       ) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, 0, 0, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 1, ?)`,
      [
        newSetId,
        targetExercise.id,
        nextIdx,
        initialKg,
        initialReps,
        setType === 'warmup' ? 1 : 0,
        setType,
        repsMode,
        minReps,
        maxReps,
        effortMode,
        effortValue,
        dropPercent,
      ]
    );

    triggerHaptic('light');
    setToastMessage('Série adicionada à sessão');
    setToastVisible(true);
    setSetTypeSheetVisible(false);
    setAddSetExerciseId(null);
    loadSession();
  };

  const handleRemoveExerciseById = (sessionExerciseId: string) => {
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`DELETE FROM session_exercises WHERE id = ?`, [sessionExerciseId]);
      triggerHaptic('medium');
      setToastMessage('Exercício removido deste treino');
      setToastVisible(true);
      loadSession();
    } catch (err) {
      console.warn('Erro ao remover exercício:', err);
    }
  };

  const handleUpdateExerciseNote = (sessionExerciseId: string, note: string) => {
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE session_exercises SET note = ? WHERE id = ?`, [note, sessionExerciseId]);
      setExercises((prev) =>
        prev.map((e) => (e.id === sessionExerciseId ? { ...e, note } : e))
      );
    } catch {}
  };

  const handleMoveExercise = (sessionExerciseId: string, direction: 'up' | 'down') => {
    const idx = exercises.findIndex((e) => e.id === sessionExerciseId);
    if (idx === -1) return;
    const rawDb = getExpoDb();
    if (direction === 'up' && idx > 0) {
      const cur = exercises[idx];
      const prev = exercises[idx - 1];
      rawDb.runSync(`UPDATE session_exercises SET position = ? WHERE id = ?`, [idx - 1, cur.id]);
      rawDb.runSync(`UPDATE session_exercises SET position = ? WHERE id = ?`, [idx, prev.id]);
      triggerHaptic('light');
      loadSession();
    } else if (direction === 'down' && idx < exercises.length - 1) {
      const cur = exercises[idx];
      const next = exercises[idx + 1];
      rawDb.runSync(`UPDATE session_exercises SET position = ? WHERE id = ?`, [idx + 1, cur.id]);
      rawDb.runSync(`UPDATE session_exercises SET position = ? WHERE id = ?`, [idx, next.id]);
      triggerHaptic('light');
      loadSession();
    }
  };

  const handleMenuAction = (exerciseId: string, action: string, setId: string) => {
    const rawDb = getExpoDb();
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    const idx = ex.sets.findIndex((s) => s.id === setId);
    if (idx === -1) return;

    if (action === 'remove') {
      rawDb.runSync(`DELETE FROM sets WHERE id = ?`, [setId]);
      const remaining = ex.sets.filter((s) => s.id !== setId);
      remaining.forEach((s, i) => {
        rawDb.runSync(`UPDATE sets SET "index" = ? WHERE id = ?`, [i + 1, s.id]);
      });
      triggerHaptic('medium');
      setToastMessage('Série removida');
      setToastVisible(true);
      loadSession();
    } else if (action === 'duplicate') {
      const src = ex.sets[idx];
      const newId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nextIdx = ex.sets.length + 1;
      rawDb.runSync(
        `INSERT INTO sets (
           id, session_exercise_id, "index", weight, reps, rpe, is_warmup,
           completed_at, is_pr_weight, is_pr_volume, type, reps_mode,
           min_reps, max_reps, effort_mode, effort_value, effort_value_max,
           effort_ref_exercise_id, rest_s, is_session_only
         ) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          newId,
          ex.id,
          nextIdx,
          src.weight,
          src.reps,
          src.isWarmup ? 1 : 0,
          src.type,
          src.repsMode,
          src.minReps ?? null,
          src.maxReps ?? null,
          src.effortMode,
          src.effortValue ?? null,
          src.effortValueMax ?? null,
          src.effortRefExerciseId ?? null,
          src.restS ?? null,
        ]
      );
      triggerHaptic('light');
      setToastMessage('Série duplicada');
      setToastVisible(true);
      loadSession();
    } else if (action === 'up' && idx > 0) {
      const cur = ex.sets[idx];
      const prev = ex.sets[idx - 1];
      rawDb.runSync(`UPDATE sets SET "index" = ? WHERE id = ?`, [idx, cur.id]);
      rawDb.runSync(`UPDATE sets SET "index" = ? WHERE id = ?`, [idx + 1, prev.id]);
      triggerHaptic('light');
      loadSession();
    } else if (action === 'down' && idx < ex.sets.length - 1) {
      const cur = ex.sets[idx];
      const next = ex.sets[idx + 1];
      rawDb.runSync(`UPDATE sets SET "index" = ? WHERE id = ?`, [idx + 2, cur.id]);
      rawDb.runSync(`UPDATE sets SET "index" = ? WHERE id = ?`, [idx + 1, next.id]);
      triggerHaptic('light');
      loadSession();
    }
  };

  // Ajustes de carga e reps (steppers)
  const handleUpdateWeight = (exerciseId: string, setId: string, newWeight: number) => {
    updateExerciseSetWeight(exerciseId, setId, newWeight, false);
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
      isWarmup: false,
      completedAt: null,
      isPrWeight: false,
      isPrVolume: false,
      type: 'normal',
      repsMode: 'reps_range',
      minReps: exercise.repMin || 8,
      maxReps: exercise.repMax || 12,
      effortMode: 'none',
      is_session_only: true,
    };

    setExercises((prev) =>
      prev.map((ex) => (ex.id === exercise.id ? { ...ex, sets: [...ex.sets, newSet] } : ex))
    );
  };

  // Alternar marcação de aquecimento na série
  const handleToggleWarmup = () => {
    if (!selectedSetForMenu) return;
    const { exercise, set } = selectedSetForMenu;
    const newWarmup = !set.isWarmup;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(
        `UPDATE sets SET is_warmup = ?, is_pr_weight = 0, is_pr_volume = 0 WHERE id = ?`,
        [newWarmup ? 1 : 0, set.id]
      );
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === set.id
                    ? { ...s, isWarmup: newWarmup, isPrWeight: false, isPrVolume: false }
                    : s
                ),
              }
            : ex
        )
      );
      triggerHaptic('selection');
      setToastMessage(newWarmup ? 'Série marcada como aquecimento' : 'Série marcada como normal');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao alternar aquecimento:', err);
    }
    setSetMenuVisible(false);
    setSelectedSetForMenu(null);
  };

  // Remover série individual
  const handleDeleteSet = () => {
    if (!selectedSetForMenu) return;
    const { exercise, set } = selectedSetForMenu;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`DELETE FROM sets WHERE id = ?`, [set.id]);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? {
                ...ex,
                sets: ex.sets.filter((s) => s.id !== set.id),
              }
            : ex
        )
      );
      triggerHaptic('medium');
      setToastMessage('Série removida');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao remover série:', err);
    }
    setSetMenuVisible(false);
    setSelectedSetForMenu(null);
  };

  // Salvar nota rápida do exercício
  const handleSaveNote = () => {
    if (!selectedExerciseForNote) return;
    const noteVal = noteModalValue.trim() || null;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE session_exercises SET note = ? WHERE id = ?`, [
        noteVal,
        selectedExerciseForNote.id,
      ]);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === selectedExerciseForNote.id ? { ...ex, note: noteVal } : ex
        )
      );
      triggerHaptic('success');
    } catch (err) {
      console.warn('Erro ao salvar nota:', err);
    }
    setNoteModalVisible(false);
    setSelectedExerciseForNote(null);
  };

  // Salvar anotações da sessão como um todo
  const handleSaveSessionNote = () => {
    if (!sessionId) return;
    triggerHaptic('light');
    try {
      const rawDb = getExpoDb();
      const trimmed = sessionNoteInput.trim();
      rawDb.runSync(`UPDATE sessions SET note = ? WHERE id = ?`, [
        trimmed || null,
        sessionId,
      ]);
      setSessionNote(trimmed);
      setToastMessage('Anotações do treino salvas');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao salvar notas da sessão:', err);
    }
    setSessionNoteModalVisible(false);
  };

  // Ciclar descanso pré-definido só deste exercício
  const handleCycleExerciseRest = (exercise: ActiveExerciseItem) => {
    triggerHaptic('selection');
    const nextRest = cycleRest(exercise.restS);
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(`UPDATE session_exercises SET rest_s = ? WHERE id = ?`, [
        nextRest,
        exercise.id,
      ]);
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exercise.id ? { ...ex, restS: nextRest } : ex))
      );
      const formatted =
        nextRest >= 60
          ? `${Math.floor(nextRest / 60)} min${nextRest % 60 ? ` ${nextRest % 60}s` : ''}`
          : `${nextRest}s`;
      setToastMessage(`Descanso de ${exercise.name}: ${formatted}`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao atualizar descanso:', err);
    }
  };

  const findSet = (exercise: ActiveExerciseItem, setId: string) => {
    return exercise.sets.find((s) => s.id === setId)!;
  };

  const openSetMenu = (exercise: ActiveExerciseItem, setId: string) => {
    const set = exercise.sets.find((s) => s.id === setId);
    if (!set) return;
    triggerHaptic('selection');
    setSelectedSetForMenu({ exercise, set });
    setSetMenuVisible(true);
  };

  const openNumberModal = (
    type: 'weight' | 'reps',
    exercise: ActiveExerciseItem,
    setId: string
  ) => {
    const setItem = exercise.sets.find((s) => s.id === setId);
    if (!setItem) return;

    setNumberModalType(type);
    if (type === 'weight') {
      const label = setItem.isWarmup ? 'W' : String(setItem.index);
      setNumberModalTitle(`Carga (${unit}) • Série ${label}`);
      setNumberModalValue(formatWeight(setItem.weight, unit));
      setNumberModalCallback(() => (val: number) => {
        const kg = displayToKg(val, unit);
        handleUpdateWeight(exercise.id, setId, kg);
      });
    } else {
      const label = setItem.isWarmup ? 'W' : String(setItem.index);
      setNumberModalTitle(`Repetições • Série ${label}`);
      setNumberModalValue(String(setItem.reps));
      setNumberModalCallback(() => (val: number) => {
        handleUpdateReps(exercise.id, setId, val);
      });
    }
    setNumberModalVisible(true);
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
      const nextExId = exercises[currentIdx + 1].id;
      setExpandedExerciseId(nextExId);
      setExpandedMap((prev) => ({
        ...prev,
        [nextExId]: true,
      }));
    }
  };

  const handleToggleExerciseExpand = (exerciseId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId] === false ? true : false,
    }));
    setExpandedExerciseId(exerciseId);
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
      {/* 1. BARRA SUPERIOR (ESTILO STITCH) */}
      <View style={styles.topBar}>
        {/* Esquerda: Botão de Descanso manual com touch target >= 48dp */}
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            startRestTimer(defaultRestS || 90);
          }}
          style={styles.topToolButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Iniciar descanso manual"
        >
          <Timer size={18} color="#B7ADA3" strokeWidth={2} />
          <Text style={styles.topToolLabel}>Descanso</Text>
        </Pressable>

        {/* Direita: Pílula de Tempo + Botão Finalizar Coral com separação segura (16dp) */}
        <View style={styles.topBarRightControls}>
          <Pressable
            onPress={handleTogglePause}
            style={styles.liveTimerPill}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Retomar treino' : 'Pausar treino'}
          >
            {isPaused ? (
              <Play size={13} color="#FF7A59" fill="#FF7A59" />
            ) : (
              <Pause size={13} color="#F5EFE8" strokeWidth={2.4} />
            )}
            <Text style={styles.liveTimerText}>{formattedTimer}</Text>
          </Pressable>

          <Pressable
            onPress={() => setFinishModalVisible(true)}
            style={styles.finishCoralButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Finalizar treino"
          >
            <Text style={styles.finishCoralText}>Finalizar</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: restActive
              ? 140 + insets.bottom
              : 48 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. TÍTULO E NOTAS (ESTILO STITCH) */}
        <View style={styles.workoutMetaSection}>
          <Text style={styles.workoutMetaTitle} numberOfLines={2}>
            {sessionName}
          </Text>

          <Text style={styles.workoutMetaSubtitle}>
            {groupName
              ? `${groupName} · ${completedExercisesCount} de ${exercises.length} exercícios`
              : `${completedExercisesCount} de ${exercises.length} exercícios`}
          </Text>

          {/* Barra de progresso fina coral */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(progressRatio * 100)}%` },
              ]}
            />
          </View>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setSessionNoteInput(sessionNote);
              setSessionNoteModalVisible(true);
            }}
            style={styles.addNotesRow}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Anotações gerais do treino"
          >
            <Edit3 size={14} color={sessionNote ? '#B7ADA3' : '#7D746B'} strokeWidth={2} />
            <Text
              style={[
                styles.addNotesText,
                !sessionNote && styles.addNotesPlaceholder,
              ]}
              numberOfLines={2}
            >
              {sessionNote ? sessionNote : 'Adicionar notas aqui...'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.stitchDivider} />

        {/* 3. LISTA DE EXERCÍCIOS (ACCORDION: 1 EXPANDIDO POR VEZ) */}
        {exercises.length === 0 ? (
          /* Sessão livre avulsa sem exercícios */
          <Card variant="surface" style={styles.emptySessionCard}>
            <Dumbbell size={36} color="#FF7A59" strokeWidth={1.75} style={{ marginBottom: 8 }} />
            <Text variant="headline" style={styles.emptySessionTitle}>
              Nenhum exercício adicionado
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.emptySessionSubtitle}>
              Monte sua sessão livre adicionando os exercícios que deseja registrar hoje.
            </Text>
            <Button
              title="Adicionar exercício"
              variant="primary"
              icon={<Plus size={20} color="#000000" strokeWidth={2.4} />}
              onPress={() =>
                navigation.navigate('AddExercises', {
                  sessionId,
                  existingExerciseIds: [],
                  fromScreen: 'ActiveSession',
                })
              }
              style={{ marginTop: 12, height: 48, borderRadius: radii.pill, backgroundColor: '#FF7A59' }}
            />
          </Card>
        ) : (
          <View style={styles.exercisesList}>
            {exercises.map((exercise, exIndex) => (
              <View key={exercise.id} style={styles.exerciseBlockContainer}>
                <ExerciseCard
                  index={exIndex}
                  exercise={{
                    id: exercise.id,
                    exerciseId: exercise.exerciseId,
                    name: exercise.name,
                    restS: exercise.restS,
                    defaultRest: exercise.restS,
                    defaultRestS: exercise.restS,
                    note: exercise.note,
                    sets: exercise.sets.map((s, sIdx) => ({
                      id: s.id,
                      weightKg: s.weight,
                      reps: s.reps,
                      rpe: s.rpe,
                      isWarmup: s.isWarmup,
                      isFailure: s.type === 'failure',
                      completedAt: s.completedAt,
                      isPr: s.isPrWeight || s.isPrVolume,
                      type: s.type,
                      repsMode: s.repsMode,
                      minReps: s.minReps,
                      maxReps: s.maxReps,
                      effortMode: s.effortMode,
                      effortValue: s.effortValue,
                      effortValueMax: s.effortValueMax,
                      effortRefExerciseId: s.effortRefExerciseId,
                      rest_s: s.restS,
                      is_session_only: s.is_session_only,
                      completed: s.completedAt !== null,
                      manual_weight: s.manual_weight,
                      drop_percent: s.drop_percent,
                      dropPercent: s.drop_percent,
                      previous: exercise.previousSets?.[sIdx]
                        ? { weightKg: exercise.previousSets[sIdx].weight, reps: exercise.previousSets[sIdx].reps }
                        : null,
                    })),
                  }}
                  mode="active"
                  unit={unit}
                  isExpanded={expandedMap[exercise.id] !== false}
                  onToggleExpand={() => handleToggleExerciseExpand(exercise.id)}
                  canMoveUp={exIndex > 0}
                  canMoveDown={exIndex < exercises.length - 1}
                  onCycleRest={() => handleCycleExerciseRest(exercise)}
                  onUpdateNote={(exId, note) => handleUpdateExerciseNote(exId, note)}
                  onOpenAddSet={() => {
                    setAddSetExerciseId(exercise.id);
                    setSetTypeSheetVisible(true);
                  }}
                  onSwapExercise={() => {
                    navigation.navigate('AddExercises', {
                      sessionId,
                      replaceTargetWorkoutExerciseId: exercise.id,
                      existingExerciseIds: exercises
                        .map((e) => e.exerciseId)
                        .filter((id) => id !== exercise.exerciseId),
                      fromScreen: 'ActiveSession',
                    });
                  }}
                  onRemoveExercise={() => handleRemoveExerciseById(exercise.id)}
                  onMoveUp={() => handleMoveExercise(exercise.id, 'up')}
                  onMoveDown={() => handleMoveExercise(exercise.id, 'down')}
                  onOpenPlateCalculator={(exId) => {
                    const ex = exercises.find((e) => e.id === exId);
                    const currentSet = ex?.sets.find((s) => s.completedAt === null) || ex?.sets[0];
                    setPlateExerciseName(ex?.name || 'Exercício com barra');
                    setPlateInitialWeight(currentSet ? currentSet.weight : 60);
                    setPlateSheetVisible(true);
                  }}
                  onToggleComplete={(exId, setVm) => {
                    const found = exercise.sets.find((s) => s.id === setVm.id);
                    if (found) handleToggleSetCheck(exercise, found);
                  }}
                  onActiveChange={(exId, setId, field, val) => {
                    handleActiveChange(exId, setId, field, val);
                  }}
                  onHeaderPress={() => {
                    setSelectedExerciseForAction(exercise);
                    setActionSheetVisible(true);
                  }}
                  onMenuAction={(exId, action, setId) => {
                    handleMenuAction(exId, action, setId);
                  }}
                />
              </View>
            ))}

            {/* BOTÃO PARA ADICIONAR EXERCÍCIO ADICIONAL AO TREINO */}
            <Pressable
              onPress={() =>
                navigation.navigate('AddExercises', {
                  sessionId,
                  existingExerciseIds: exercises.map((e) => e.exerciseId),
                  fromScreen: 'ActiveSession',
                })
              }
              style={({ pressed }) => [
                styles.addExerciseFooterButton,
                pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Adicionar exercício a este treino"
            >
              <Plus size={18} color="#FF7A59" strokeWidth={2.4} />
              <Text variant="bodyMedium" style={styles.addExerciseFooterText}>
                Adicionar exercício
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 4. RODAPÉ FIXO DE DESCANSO (APARECE SOMENTE DURANTE O DESCANSO) */}
      {restActive && (
        <RestFooter
          remainingS={restRemaining}
          totalS={restTotalSeconds}
          onAdjust={handleAdjustRest}
          onSkip={() => {
            triggerHaptic('light');
            setRestActive(false);
            setRestRemaining(0);
          }}
          bottomOffset={Math.max(insets.bottom, 12) + 8}
        />
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
        onOpenPlateCalculator={() => {
          if (selectedExerciseForAction) {
            const currentSet =
              selectedExerciseForAction.sets.find((s) => s.completedAt === null) ||
              selectedExerciseForAction.sets[0];
            setPlateExerciseName(selectedExerciseForAction.name);
            setPlateInitialWeight(currentSet ? currentSet.weight : 60);
            setPlateSheetVisible(true);
          }
        }}
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

      {/* 6. MODAL SELETOR DE TIPO DE SÉRIE (+ Adicionar Série com isolamento) */}
      <SetTypeSheet
        visible={setTypeSheetVisible}
        mode="active"
        unit={unit}
        sets={exercises.find((e) => e.id === addSetExerciseId)?.sets || []}
        suggestedDropKg={(() => {
          const targetEx = exercises.find((e) => e.id === addSetExerciseId);
          return targetEx ? suggestDropWeightKg(targetEx.sets, targetEx.defaultIncrement ?? 2.5) : null;
        })()}
        onClose={() => {
          setSetTypeSheetVisible(false);
          setAddSetExerciseId(null);
        }}
        onSelect={(optKey) => handleAddSetFromOption(optKey)}
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
        discardLabel="Descartar treino"
        isDanger={false}
        onConfirm={handleConfirmFinish}
        onCancel={() => setFinishModalVisible(false)}
        onDiscard={handleConfirmDiscard}
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

      {/* BOTTOM SHEET ERGONÔMICO PARA ENTRADA NUMÉRICA RÁPIDA (STITCH) */}
      <QuickNumberPadSheet
        visible={numberModalVisible}
        onClose={() => setNumberModalVisible(false)}
        title={numberModalTitle}
        initialValue={numberModalValue}
        type={numberModalType}
        unit={unit}
        onConfirm={(val) => {
          numberModalCallback(val);
        }}
      />

      {/* MODAL PARA ADICIONAR / EDITAR ANOTAÇÕES GERAIS DO TREINO */}
      <Modal
        visible={sessionNoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionNoteModalVisible(false)}
      >
        <View style={styles.numberModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSessionNoteModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar anotações"
          />
          <View style={styles.noteModalContent}>
            <Text variant="headline" style={styles.noteModalTitle}>
              Anotações do treino
            </Text>
            <TextInput
              style={styles.noteModalInput}
              value={sessionNoteInput}
              onChangeText={setSessionNoteInput}
              placeholder="Como foi a sessão de hoje? Ex: Foco em sobrecarga, energia alta..."
              placeholderTextColor="#7D746B"
              multiline
              autoFocus
            />
            <View style={styles.noteModalActions}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setSessionNoteModalVisible(false)}
                style={{ flex: 1, height: 44, borderRadius: radii.pill }}
              />
              <Button
                title="Salvar"
                variant="primary"
                onPress={handleSaveSessionNote}
                style={{ flex: 1, height: 44, borderRadius: radii.pill }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE OPÇÕES DA SÉRIE (TOQUE LONGO NO NÚMERO) */}
      <Modal
        visible={setMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSetMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSetMenuVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar opções"
          />
          <View style={styles.menuSheet}>
            <Text variant="headline" style={styles.menuTitle}>
              {selectedSetForMenu?.set.isWarmup
                ? 'Série de aquecimento'
                : `Série ${selectedSetForMenu?.set.index}`}
            </Text>

            <Pressable
              onPress={handleToggleWarmup}
              style={styles.menuOption}
              accessibilityRole="button"
              accessibilityLabel="Alternar série de aquecimento"
            >
              <Flame size={20} color="#FF7A59" strokeWidth={2} />
              <Text variant="bodyLarge" style={styles.menuOptionText}>
                {selectedSetForMenu?.set.isWarmup
                  ? 'Desmarcar aquecimento'
                  : 'Marcar como aquecimento'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteSet}
              style={styles.menuOption}
              accessibilityRole="button"
              accessibilityLabel="Remover série"
            >
              <Trash2 size={20} color={colors.error} strokeWidth={2} />
              <Text
                variant="bodyLarge"
                style={[styles.menuOptionText, { color: colors.error }]}
              >
                Remover série
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA ADICIONAR / EDITAR NOTAS DO EXERCÍCIO */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.numberModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setNoteModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar notas"
          />
          <View style={styles.noteModalContent}>
            <Text variant="headline" style={styles.noteModalTitle}>
              Notas do exercício
            </Text>
            <TextInput
              style={styles.noteModalInput}
              value={noteModalValue}
              onChangeText={setNoteModalValue}
              placeholder="Ex: Banco a 30°, pegada pronada..."
              placeholderTextColor="#7D746B"
              multiline
              autoFocus
            />
            <View style={styles.noteModalActions}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => setNoteModalVisible(false)}
                style={{ flex: 1, height: 44, borderRadius: radii.pill }}
              />
              <Button
                title="Salvar"
                variant="primary"
                onPress={handleSaveNote}
                style={{ flex: 1, height: 44, borderRadius: radii.pill }}
              />
            </View>
          </View>
        </View>
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
    backgroundColor: '#1A1715',
  },
  stitchTopBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1A1715',
  },
  topBarLeftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  topToolButton: {
    minHeight: 48,
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  topToolLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.outfitSemiBold,
    fontWeight: '600',
    color: '#B7ADA3',
  },
  topBarRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  liveTimerPill: {
    height: 44,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2D2925',
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  liveTimerText: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitSemiBold,
    fontWeight: '600',
    color: '#F5EFE8',
    fontVariant: ['tabular-nums'],
  },
  finishCoralButton: {
    height: 44,
    minWidth: 84,
    backgroundColor: '#FF7A59',
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishCoralText: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#1A1715',
  },

  // 2. Título e Notas
  workoutMetaSection: {
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 4,
  },
  workoutMetaTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  workoutMetaSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitSemiBold,
    color: '#B7ADA3',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: '#2D2925',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF7A59',
    borderRadius: 2,
  },
  addNotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 2,
  },
  addNotesText: {
    fontSize: 13,
    color: '#B7ADA3',
  },
  addNotesPlaceholder: {
    color: '#7D746B',
  },
  stitchDivider: {
    height: 1,
    backgroundColor: '#23201D',
    marginVertical: 12,
  },

  // 3. Blocos de Exercício
  exerciseBlockContainer: {
    width: '100%',
  },
  expandedBlock: {
    gap: 10,
  },
  stitchExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  stitchExerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stitchExerciseIndex: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stitchExerciseNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  stitchExerciseNameText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#FF7A59',
  },
  exerciseTimerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#23201D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchCollapsedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
    opacity: 0.95,
  },

  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#1A1715',
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
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3A3531',
    backgroundColor: colors.surfaceContainer,
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
  expandedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  exerciseTitleCoral: {
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#FF7A59',
  },
  exerciseSubtitleText: {
    fontSize: 13,
    color: '#B7ADA3',
  },
  notePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  noteContentText: {
    fontSize: 13,
    color: '#B7ADA3',
  },
  notePlaceholderText: {
    color: '#7D746B',
    fontStyle: 'italic',
  },
  restLinePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  restLineText: {
    fontSize: 13,
    color: '#B7ADA3',
  },
  calcIconButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* TABELA DE SÉRIES: Série 44, Anterior flex, kg 64, Reps 64, Check 48 */
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  colHeaderSerie: {
    width: 44,
    fontSize: 12,
    color: '#7D746B',
    textAlign: 'left',
  },
  colHeaderAnterior: {
    flex: 1,
    fontSize: 12,
    color: '#7D746B',
    textAlign: 'left',
  },
  colHeaderKg: {
    width: 64,
    fontSize: 12,
    color: '#7D746B',
    textAlign: 'center',
  },
  colHeaderReps: {
    width: 64,
    fontSize: 12,
    color: '#7D746B',
    textAlign: 'center',
  },
  colHeaderCheck: {
    width: 48,
    fontSize: 12,
    color: '#7D746B',
    textAlign: 'center',
  },

  setsTable: {
    gap: 2,
  },
  setRowWrapper: {
    marginVertical: 2,
  },
  setRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  setRowDone: {
    backgroundColor: 'rgba(123, 201, 143, 0.14)',
  },
  setRowCurrent: {
    borderWidth: 1,
    borderColor: '#FF7A59',
  },
  colSerie: {
    width: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 52,
  },
  serieIndexText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  warmupText: {
    color: '#B7ADA3',
  },
  doneSerieText: {
    color: '#7BC98F',
  },
  prTrophyIcon: {
    marginLeft: 3,
  },
  colAnterior: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    paddingRight: 4,
  },
  previousLogText: {
    fontSize: 13,
    color: '#7D746B',
  },
  colKg: {
    width: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colReps: {
    width: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pureNumberText: {
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    textAlign: 'center',
  },
  currentNumberText: {
    color: colors.primary,
  },
  colCheck: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTouchArea: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: '#7BC98F',
  },
  checkCircleCurrent: {
    borderWidth: 2,
    borderColor: '#FF7A59',
    backgroundColor: 'transparent',
  },
  checkCirclePending: {
    borderWidth: 2,
    borderColor: '#3A3531',
    backgroundColor: 'transparent',
  },

  /* RPE STRIP */
  rpeStripContainer: {
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#1C1917',
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  rpeStripLabel: {
    fontSize: 11,
    color: '#B7ADA3',
    fontWeight: '600',
  },
  rpeStripScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  rpeChipButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: '#2D2925',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeChipButtonSelected: {
    backgroundColor: '#FF7A59',
  },
  rpeChipBtnText: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitBold,
    color: '#EDE0D5',
  },
  rpeChipBtnTextSelected: {
    color: '#1A1715',
  },

  /* ADICIONAR SÉRIE BUTTON */
  addSetButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2D2925',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: fontFamilies.outfitSemiBold,
    color: '#EDE0D5',
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
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: '#23201D',
    borderWidth: 1,
    borderColor: '#38332F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  addExerciseFooterText: {
    fontSize: 14,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: '#FF7A59',
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
  restAdjustButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restAdjustText: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.primary,
  },
  restCountdownTextOutfit: {
    fontSize: 28,
    fontFamily: fontFamilies.outfitBold,
    color: '#EDE0D5',
  },
  restRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restSkipPill: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 100,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restSkipPillText: {
    fontSize: 13,
    fontFamily: fontFamilies.outfitBold,
    color: '#1A1715',
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

  /* SET ACTION MODAL */
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.outlineVariant,
  },
  menuTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    marginBottom: 6,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuOptionText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },

  /* NOTE MODAL */
  noteModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  noteModalTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  noteModalInput: {
    minHeight: 80,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    color: colors.onSurface,
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  noteModalActions: {
    flexDirection: 'row',
    gap: 12,
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
