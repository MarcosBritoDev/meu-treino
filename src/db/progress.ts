import { getExpoDb } from './client';
import { isDumbbellEquipment } from '../domain/exerciseCatalog';
import { getCurrentWeekDays } from '../domain/home';
import {
  calcEpley1RM,
  calcVolumeDeltaPercent,
  calcMuscleSetsDistribution,
  calcWeeklyStreak,
  MuscleDistributionItem,
} from '../domain/progressMath';

export type WeightUnit = 'kg' | 'lb';
export type QuickPeriod = '7d' | '30d' | '90d' | 'tudo';

export interface CustomDateRange {
  startTs: number;
  endTs: number;
  label: string;
}

export type PeriodFilter = QuickPeriod | CustomDateRange;

export function isCustomDateRange(filter: PeriodFilter): filter is CustomDateRange {
  return typeof filter === 'object' && filter !== null && 'startTs' in filter && 'endTs' in filter;
}

export interface SessionHistoryItem {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  durationMin: number;
  volumeKg: number;
  hasPr: boolean;
}

export interface PRItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  weight: number;
  reps: number;
  date: number;
  e1rmKg: number;
}

export interface DayBarItem {
  index: number;
  label: string;
  dayOfMonth: number;
  volumeKg: number;
  isToday: boolean;
  hasWorkout: boolean;
  workoutName: string;
  durationMin: number;
}

export interface StrengthProgressionItem {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  currentE1rmKg: number;
  deltaKg: number;
  bestWeightKg: number;
  bestReps: number;
  sessionCount: number;
}

export interface ProgressScreenData {
  unit: WeightUnit;
  sessions: SessionHistoryItem[];
  prs: PRItem[];
  weeklyBars: DayBarItem[];
  frequencyGoal: number;
  weeklyStreak: number;
  // Métricas do período selecionado
  periodVolumeKg: number;
  previousPeriodVolumeKg: number | null;
  volumeDeltaPercent: number | null;
  periodComparisonLabel: string | null;
  periodValidSetsCount: number;
  periodDurationMin: number;
  periodWorkoutCount: number;
  // Séries por músculo
  muscleDistribution: MuscleDistributionItem[];
  // Evolução de força (1RM estimado)
  strengthProgression: StrengthProgressionItem[];
}

/**
 * Carrega todos os dados necessários para a tela de Progresso com base no período selecionado.
 */
export function getProgressScreenData(
  period: PeriodFilter = '7d',
  referenceDate: Date = new Date()
): ProgressScreenData {
  const rawDb = getExpoDb();
  const now = referenceDate.getTime();

  // 1. Unidade configurada
  let unit: WeightUnit = 'kg';
  try {
    const sRows = rawDb.getAllSync<{ unit?: string }>(
      'SELECT unit FROM settings WHERE id = 1 LIMIT 1'
    );
    if (sRows.length > 0 && sRows[0].unit === 'lb') {
      unit = 'lb';
    }
  } catch {
    // fallback kg
  }

  // 2. Meta de frequência semanal do grupo ativo (padrão 3)
  let frequencyGoal = 3;
  try {
    const gRows = rawDb.getAllSync<{ frequency_days?: number | null }>(
      'SELECT frequency_days FROM groups WHERE is_active = 1 LIMIT 1'
    );
    if (gRows.length > 0 && gRows[0].frequency_days && gRows[0].frequency_days > 0) {
      frequencyGoal = gRows[0].frequency_days;
    }
  } catch {
    // fallback 3
  }

  // 3. Buscar todas as sessões concluídas
  const sessionRows = rawDb.getAllSync<{
    id: string;
    name_snapshot: string;
    started_at: number;
    ended_at: number | null;
    has_pr: number;
  }>(
    `SELECT 
      s.id,
      s.name_snapshot,
      s.started_at,
      s.ended_at,
      EXISTS (
        SELECT 1 
        FROM session_exercises se 
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE se.session_id = s.id 
          AND (st.is_pr_weight = 1 OR st.is_pr_volume = 1)
          AND (st.type IS NULL OR (st.type != 'warmup' AND st.type != 'drop'))
          AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
          AND st.completed_at IS NOT NULL
      ) AS has_pr
     FROM sessions s
     WHERE s.status = 'completed'
     ORDER BY COALESCE(s.ended_at, s.started_at) DESC`
  );

  // 4. Buscar todas as séries concluídas válidas para volume (Halteres = 2×)
  const setRows = rawDb.getAllSync<{
    session_id: string;
    equipment: string;
    weight: number;
    reps: number;
    type: string | null;
    is_warmup: number | null;
  }>(
    `SELECT 
      se.session_id,
      e.equipment,
      st.weight,
      st.reps,
      st.type,
      st.is_warmup
     FROM session_exercises se
     JOIN exercises e ON se.exercise_id = e.id
     JOIN sets st ON st.session_exercise_id = se.id
     JOIN sessions s ON se.session_id = s.id
     WHERE s.status = 'completed'
       AND st.completed_at IS NOT NULL
       AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
       AND (st.type IS NULL OR st.type != 'warmup')`
  );

  // Mapa de volume total por sessão (Halteres multiplicam por 2)
  // E contagem de séries válidas por sessão
  const sessionVolumeMap = new Map<string, number>();
  const sessionValidSetsMap = new Map<string, number>();

  for (const r of setRows) {
    const isDumbbell = isDumbbellEquipment(r.equipment);
    const multiplier = isDumbbell ? 2 : 1;
    const w = Number(r.weight) || 0;
    const reps = Number(r.reps) || 0;
    if (w > 0 && reps > 0) {
      const setVol = w * multiplier * reps;
      const current = sessionVolumeMap.get(r.session_id) || 0;
      sessionVolumeMap.set(r.session_id, current + setVol);
    }

    const curSets = sessionValidSetsMap.get(r.session_id) || 0;
    sessionValidSetsMap.set(r.session_id, curSets + 1);
  }

  const sessionList: SessionHistoryItem[] = sessionRows.map((s) => {
    const started = s.started_at;
    const ended = s.ended_at || s.started_at;
    const durMin = Math.max(1, Math.round(Math.max(60000, ended - started) / 60000));
    const vol = sessionVolumeMap.get(s.id) || 0;
    return {
      id: s.id,
      name: s.name_snapshot,
      startedAt: started,
      endedAt: ended,
      durationMin: durMin,
      volumeKg: Math.round(vol * 100) / 100,
      hasPr: Boolean(s.has_pr),
    };
  });

  // 5. Filtros de período (7d | 30d | 90d | tudo | intervalo personalizado)
  const MS_DAY = 24 * 60 * 60 * 1000;
  let startTs: number | null = null;
  let endTs: number | null = null;
  let prevStartTs: number | null = null;
  let prevEndTs: number | null = null;
  let periodComparisonLabel: string | null = null;

  if (isCustomDateRange(period)) {
    startTs = period.startTs;
    endTs = period.endTs;
    const diffDays = Math.max(1, Math.round((endTs - startTs) / MS_DAY));
    prevStartTs = startTs - diffDays * MS_DAY;
    prevEndTs = startTs;
    periodComparisonLabel = `${diffDays}d ant.`;
  } else if (period === '7d') {
    startTs = now - 7 * MS_DAY;
    endTs = now;
    prevStartTs = now - 14 * MS_DAY;
    prevEndTs = now - 7 * MS_DAY;
    periodComparisonLabel = '7d ant.';
  } else if (period === '30d') {
    startTs = now - 30 * MS_DAY;
    endTs = now;
    prevStartTs = now - 60 * MS_DAY;
    prevEndTs = now - 30 * MS_DAY;
    periodComparisonLabel = '30d ant.';
  } else if (period === '90d') {
    startTs = now - 90 * MS_DAY;
    endTs = now;
    prevStartTs = now - 180 * MS_DAY;
    prevEndTs = now - 90 * MS_DAY;
    periodComparisonLabel = '90d ant.';
  } else {
    // 'tudo'
    startTs = null;
    endTs = null;
    prevStartTs = null;
    prevEndTs = null;
    periodComparisonLabel = null;
  }

  const periodSessions = sessionList.filter((s) => {
    if (startTs !== null && s.endedAt < startTs) return false;
    if (endTs !== null && s.endedAt > endTs) return false;
    return true;
  });

  const periodVolumeKg = periodSessions.reduce((acc, curr) => acc + curr.volumeKg, 0);
  const periodDurationMin = periodSessions.reduce((acc, curr) => acc + curr.durationMin, 0);
  const periodWorkoutCount = periodSessions.length;

  let periodValidSetsCount = 0;
  for (const s of periodSessions) {
    periodValidSetsCount += sessionValidSetsMap.get(s.id) || 0;
  }

  let previousPeriodVolumeKg: number | null = null;
  let volumeDeltaPercent: number | null = null;

  if (prevStartTs !== null && prevEndTs !== null) {
    const prevSessions = sessionList.filter(
      (s) => s.endedAt >= prevStartTs! && s.endedAt < prevEndTs!
    );
    previousPeriodVolumeKg = prevSessions.reduce((acc, curr) => acc + curr.volumeKg, 0);
    volumeDeltaPercent = calcVolumeDeltaPercent(periodVolumeKg, previousPeriodVolumeKg);
  }

  // 6. Atividade na semana (Seg a Dom) + Sequência semanal (Streak)
  const weekDays = getCurrentWeekDays(referenceDate);
  const dayBars: DayBarItem[] = weekDays.map((wd) => {
    const daysSessions = sessionList.filter((sess) => {
      const time = sess.endedAt || sess.startedAt;
      return time >= wd.startOfDay && time <= wd.endOfDay;
    });
    const dayVol = daysSessions.reduce((acc, curr) => acc + curr.volumeKg, 0);
    const dayDur = daysSessions.reduce((acc, curr) => acc + curr.durationMin, 0);
    const dayName =
      daysSessions.length > 0
        ? daysSessions.map((s) => s.name).join(', ')
        : 'Descanso';

    return {
      index: wd.index,
      label: wd.label,
      dayOfMonth: wd.dayOfMonth,
      volumeKg: dayVol,
      isToday: wd.isToday,
      hasWorkout: daysSessions.length > 0,
      workoutName: dayName,
      durationMin: dayDur,
    };
  });

  // Sequência semanal (Streak)
  const allSessionDates = sessionList.map((s) => s.endedAt || s.startedAt);
  const weeklyStreak = calcWeeklyStreak(allSessionDates, frequencyGoal, referenceDate);

  // 7. Séries por músculo (distribuição com Principal 1× e Secundário 0,5×)
  const muscleSetRows = rawDb.getAllSync<{
    completed_at: number | null;
    type: string | null;
    is_warmup: number | null;
    muscle_group: string;
    secondary_muscles: string;
    session_time: number;
  }>(
    `SELECT 
      st.completed_at,
      st.type,
      st.is_warmup,
      e.muscle_group,
      e.secondary_muscles,
      COALESCE(s.ended_at, s.started_at) AS session_time
     FROM sets st
     JOIN session_exercises se ON st.session_exercise_id = se.id
     JOIN exercises e ON se.exercise_id = e.id
     JOIN sessions s ON se.session_id = s.id
     WHERE s.status = 'completed'
       AND st.completed_at IS NOT NULL
       AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
       AND (st.type IS NULL OR st.type != 'warmup')`
  );

  const filteredMuscleSets = muscleSetRows.filter((r) => {
    if (startTs !== null && r.session_time < startTs) return false;
    if (endTs !== null && r.session_time > endTs) return false;
    return true;
  });
  const muscleDistribution = calcMuscleSetsDistribution(filteredMuscleSets);

  // 8. Evolução de força (1RM estimado nos exercícios com >= 2 sessões)
  const e1rmSetRows = rawDb.getAllSync<{
    exercise_id: string;
    exercise_name: string;
    muscle_group: string;
    equipment: string;
    session_id: string;
    session_time: number;
    weight: number;
    reps: number;
    completed_at: number;
  }>(
    `SELECT 
      e.id AS exercise_id,
      e.name AS exercise_name,
      e.muscle_group,
      e.equipment,
      s.id AS session_id,
      COALESCE(s.ended_at, s.started_at) AS session_time,
      st.weight,
      st.reps,
      st.completed_at
     FROM sets st
     JOIN session_exercises se ON st.session_exercise_id = se.id
     JOIN exercises e ON se.exercise_id = e.id
     JOIN sessions s ON se.session_id = s.id
     WHERE s.status = 'completed'
       AND st.completed_at IS NOT NULL
       AND st.weight > 0
       AND st.reps >= 1
       AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
       AND (st.type IS NULL OR (st.type != 'warmup' AND st.type != 'drop'))
     ORDER BY session_time ASC, st.completed_at ASC`
  );

  // Agrupar por exercício
  interface ExerciseSessionBest {
    sessionTime: number;
    maxE1rmKg: number;
    bestWeightKg: number;
    bestReps: number;
  }

  const exerciseMap = new Map<
    string,
    {
      name: string;
      muscleGroup: string;
      equipment: string;
      sessions: Map<string, ExerciseSessionBest>;
    }
  >();

  for (const r of e1rmSetRows) {
    let entry = exerciseMap.get(r.exercise_id);
    if (!entry) {
      entry = {
        name: r.exercise_name,
        muscleGroup: r.muscle_group,
        equipment: r.equipment,
        sessions: new Map(),
      };
      exerciseMap.set(r.exercise_id, entry);
    }

    const setE1rm = calcEpley1RM(r.weight, r.reps);
    const existing = entry.sessions.get(r.session_id);
    if (!existing || setE1rm > existing.maxE1rmKg) {
      entry.sessions.set(r.session_id, {
        sessionTime: r.session_time,
        maxE1rmKg: setE1rm,
        bestWeightKg: r.weight,
        bestReps: r.reps,
      });
    }
  }

  // Filtrar exercícios com pelo menos 2 sessões distintas
  const eligibleProgression: StrengthProgressionItem[] = [];

  for (const [exerciseId, data] of exerciseMap.entries()) {
    if (data.sessions.size < 2) continue;

    // Ordena as sessões cronologicamente
    const chronoSessions = Array.from(data.sessions.values()).sort(
      (a, b) => a.sessionTime - b.sessionTime
    );

    // Se o filtro de período estiver ativo, tenta usar sessões do período ou compara com a primeira
    const periodSessionsForEx = chronoSessions.filter((s) => {
      if (startTs !== null && s.sessionTime < startTs) return false;
      if (endTs !== null && s.sessionTime > endTs) return false;
      return true;
    });

    let firstSession: ExerciseSessionBest;
    let recentSession: ExerciseSessionBest;

    if (periodSessionsForEx.length >= 2) {
      firstSession = periodSessionsForEx[0];
      recentSession = periodSessionsForEx[periodSessionsForEx.length - 1];
    } else if (periodSessionsForEx.length === 1) {
      firstSession = chronoSessions[0];
      recentSession = periodSessionsForEx[0];
    } else {
      firstSession = chronoSessions[0];
      recentSession = chronoSessions[chronoSessions.length - 1];
    }

    const currentE1rmKg = recentSession.maxE1rmKg;
    const deltaKg = Math.round((currentE1rmKg - firstSession.maxE1rmKg) * 10) / 10;

    eligibleProgression.push({
      exerciseId,
      name: data.name,
      muscleGroup: data.muscleGroup,
      equipment: data.equipment,
      currentE1rmKg,
      deltaKg,
      bestWeightKg: recentSession.bestWeightKg,
      bestReps: recentSession.bestReps,
      sessionCount: data.sessions.size,
    });
  }

  // Ordenar pelos exercícios mais frequentes (maior número de sessões com o exercício)
  eligibleProgression.sort((a, b) => b.sessionCount - a.sessionCount);
  const strengthProgression = eligibleProgression;

  // 9. Recordes pessoais (PRs) com e1rmKg
  const prRows = rawDb.getAllSync<{
    exercise_id: string;
    exercise_name: string;
    muscle_group: string;
    equipment: string;
    weight: number;
    reps: number;
    completed_at: number | null;
    ended_at: number | null;
    started_at: number;
  }>(
    `SELECT 
      e.id AS exercise_id,
      e.name AS exercise_name,
      e.muscle_group,
      e.equipment,
      st.weight,
      st.reps,
      st.completed_at,
      s.ended_at,
      s.started_at
     FROM sets st
     JOIN session_exercises se ON st.session_exercise_id = se.id
     JOIN exercises e ON se.exercise_id = e.id
     JOIN sessions s ON se.session_id = s.id
     WHERE s.status = 'completed'
       AND st.completed_at IS NOT NULL
       AND st.reps >= 1
       AND st.weight > 0
       AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
       AND (st.type IS NULL OR (st.type != 'warmup' AND st.type != 'drop'))
     ORDER BY e.name ASC, st.weight DESC, st.reps DESC, st.completed_at ASC`
  );

  const prMap = new Map<string, PRItem>();
  for (const r of prRows) {
    if (!prMap.has(r.exercise_id)) {
      const e1rm = calcEpley1RM(r.weight, r.reps);
      prMap.set(r.exercise_id, {
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        muscleGroup: r.muscle_group,
        equipment: r.equipment,
        weight: r.weight,
        reps: r.reps,
        date: r.completed_at || r.ended_at || r.started_at,
        e1rmKg: e1rm,
      });
    }
  }
  const prList = Array.from(prMap.values()).sort((a, b) => b.date - a.date);

  return {
    unit,
    sessions: sessionList,
    prs: prList,
    weeklyBars: dayBars,
    frequencyGoal,
    weeklyStreak,
    periodVolumeKg: Math.round(periodVolumeKg * 100) / 100,
    previousPeriodVolumeKg:
      previousPeriodVolumeKg !== null
        ? Math.round(previousPeriodVolumeKg * 100) / 100
        : null,
    volumeDeltaPercent,
    periodComparisonLabel,
    periodValidSetsCount,
    periodDurationMin,
    periodWorkoutCount,
    muscleDistribution,
    strengthProgression,
  };
}
