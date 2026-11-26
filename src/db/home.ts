import { getExpoDb } from './client';
import { estimarDuracao } from '../domain/duration';
import { calcularVolume } from '../domain/sessionMath';
import {
  calculateNextScheduledWorkoutIndex,
  formatExerciseSetsSummary,
  formatExerciseCardItem,
  formatWorkoutSummary,
} from '../domain/workouts';
import {
  ActiveSessionData,
  RecommendedWorkoutData,
  RecommendedWorkoutExercise,
  WeekDayStatus,
  WeekStatusData,
  LastCompletedSessionData,
  HomeScreenData,
  getGreeting,
  formatHeaderDate,
  getCurrentWeekDays,
  formatUltimoTreinoData,
} from '../domain/home';

export * from '../domain/home';

/**
 * Busca todas as informações necessárias para renderizar a tela 4.1 Início.
 */
export function getHomeScreenData(referenceDate: Date = new Date()): HomeScreenData {
  const rawDb = getExpoDb();
  const now = referenceDate.getTime();

  // 1. Configurações de usuário e unidade
  let userName: string | null = null;
  let unit = 'kg';
  try {
    const sRows = rawDb.getAllSync<{ user_name?: string | null; unit?: string }>(
      'SELECT user_name, unit FROM settings WHERE id = 1 LIMIT 1'
    );
    if (sRows.length > 0) {
      userName = sRows[0].user_name || null;
      unit = sRows[0].unit || 'kg';
    }
  } catch {
    // fallback
  }

  const greeting = getGreeting(referenceDate);
  const formattedDate = formatHeaderDate(referenceDate);

  // 2. Verifica se há treino em andamento
  let activeSession: ActiveSessionData | null = null;
  try {
    const actRows = rawDb.getAllSync<{
      id: string;
      workout_id: string | null;
      name_snapshot: string;
      started_at: number;
    }>(
      `SELECT id, workout_id, name_snapshot, started_at
       FROM sessions
       WHERE status = 'in_progress'
       ORDER BY started_at DESC
       LIMIT 1`
    );

    if (actRows.length > 0) {
      const act = actRows[0];
      activeSession = {
        id: act.id,
        name: act.name_snapshot,
        startedAt: act.started_at,
        workoutId: act.workout_id,
        elapsedSeconds: Math.max(0, Math.floor((now - act.started_at) / 1000)),
      };
    }
  } catch (err) {
    console.warn('Erro ao verificar treino em andamento:', err);
  }

  // 3. Grupo ativo e recomendação de treino do dia
  let hasActiveGroup = false;
  let hasWorkouts = false;
  let recommendedWorkout: RecommendedWorkoutData | null = null;
  let activeGroupFrequency = 5;

  try {
    // Busca o grupo ativo (is_active = 1), ou o primeiro cadastrado
    const groupRows = rawDb.getAllSync<{
      id: string;
      name: string;
      frequency_days: number | null;
      is_active: number;
    }>(
      `SELECT id, name, frequency_days, is_active
       FROM groups
       ORDER BY is_active DESC, position ASC, name ASC`
    );

    if (groupRows.length > 0) {
      hasActiveGroup = true;
      const activeGroup = groupRows[0];
      activeGroupFrequency = activeGroup.frequency_days || 5;

      // Busca treinos do grupo ativo
      const workoutRows = rawDb.getAllSync<{
        id: string;
        group_id: string | null;
        name: string;
        position: number;
      }>(
        `SELECT id, group_id, name, position
         FROM workouts
         WHERE group_id = ? AND is_active = 1
         ORDER BY position ASC, name ASC`,
        [activeGroup.id]
      );

      if (workoutRows.length > 0) {
        hasWorkouts = true;

        // Último treino concluído deste grupo para avançar o ciclo
        const lastInGroupRows = rawDb.getAllSync<{ workout_id: string }>(
          `SELECT workout_id
           FROM sessions
           WHERE status = 'completed' AND workout_id IN (
             SELECT id FROM workouts WHERE group_id = ?
           )
           ORDER BY ended_at DESC, started_at DESC
           LIMIT 1`,
          [activeGroup.id]
        );

        const lastWorkoutId = lastInGroupRows[0]?.workout_id || null;
        const nextIndex = calculateNextScheduledWorkoutIndex(workoutRows, lastWorkoutId);
        const selectedWorkout = workoutRows[nextIndex >= 0 ? nextIndex : 0];

        // Busca exercícios do treino selecionado
        const exRows = rawDb.getAllSync<{
          workout_exercise_id: string;
          exercise_id: string;
          name: string;
          muscle_group: string;
          target_sets: number;
          rest_s: number;
        }>(
          `SELECT 
            we.id AS workout_exercise_id,
            we.exercise_id,
            e.name,
            e.muscle_group,
            we.target_sets,
            we.rest_s
           FROM workout_exercises we
           JOIN exercises e ON e.id = we.exercise_id
           WHERE we.workout_id = ?
           ORDER BY we.position ASC`,
          [selectedWorkout.id]
        );

        // Busca séries individuais em workout_exercise_sets
        let setsRows: { workoutExerciseId: string; type: string; restS: number | null }[] = [];
        try {
          setsRows = rawDb.getAllSync<{
            workoutExerciseId: string;
            type: string;
            restS: number | null;
          }>(
            `SELECT 
              wes.workout_exercise_id AS workoutExerciseId,
              wes.type AS type,
              wes.rest_s AS restS
             FROM workout_exercise_sets wes
             JOIN workout_exercises we ON we.id = wes.workout_exercise_id
             WHERE we.workout_id = ?
             ORDER BY wes.position ASC`,
            [selectedWorkout.id]
          );
        } catch {
          // fallback
        }

        const exercises: RecommendedWorkoutExercise[] = [];
        let totalSets = 0;
        const durExercises: { targetSets: number; restS: number }[] = [];

        for (const ex of exRows) {
          const matchingSets = setsRows.filter((s) => s.workoutExerciseId === ex.workout_exercise_id);
          let warmupCount = 0;
          let otherCount = 0;

          if (matchingSets.length > 0) {
            warmupCount = matchingSets.filter((s) => s.type === 'warmup').length;
            otherCount = matchingSets.filter((s) => s.type !== 'warmup').length;
            totalSets += matchingSets.length;
            const exRest = matchingSets[0]?.restS ?? ex.rest_s ?? 90;
            durExercises.push({ targetSets: matchingSets.length, restS: exRest });
          } else {
            otherCount = ex.target_sets || 3;
            totalSets += otherCount;
            durExercises.push({ targetSets: otherCount, restS: ex.rest_s || 90 });
          }

          const setsSummary = formatExerciseSetsSummary(warmupCount, otherCount);
          const itemText = formatExerciseCardItem(ex.name, warmupCount, otherCount);
          exercises.push({
            name: ex.name,
            warmupCount,
            otherCount,
            setsSummary,
            itemText,
          });
        }

        const exerciseCount = exRows.length;
        const durSec = estimarDuracao({
          exercises: durExercises,
        });
        const estimatedDurationMin = Math.max(1, Math.round(durSec / 60));
        const summaryText = formatWorkoutSummary(totalSets, estimatedDurationMin);

        // Músculos envolvidos
        const muscleList = Array.from(new Set(exRows.map((r) => r.muscle_group.toLowerCase())));
        let targetMuscles = 'Geral';
        if (muscleList.length === 1) {
          targetMuscles = muscleList[0].charAt(0).toUpperCase() + muscleList[0].slice(1);
        } else if (muscleList.length === 2) {
          targetMuscles = `${muscleList[0]} e ${muscleList[1]}`;
          targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
        } else if (muscleList.length > 2) {
          const last = muscleList[muscleList.length - 1];
          const prev = muscleList.slice(0, -1).join(', ');
          targetMuscles = `${prev} e ${last}`;
          targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
        }

        recommendedWorkout = {
          id: selectedWorkout.id,
          groupId: activeGroup.id,
          groupName: activeGroup.name,
          name: selectedWorkout.name,
          targetMuscles,
          cycleIndex: (nextIndex >= 0 ? nextIndex : 0) + 1,
          cycleTotal: workoutRows.length,
          exerciseCount,
          totalSets,
          estimatedDurationMin,
          summaryText,
          exercises,
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar recomendação de treino:', err);
  }

  // 4. Seção "Sua semana"
  const rawWeekDays = getCurrentWeekDays(referenceDate);
  const mondayStart = rawWeekDays[0].startOfDay;
  const sundayEnd = rawWeekDays[6].endOfDay;

  let weekCompletedSessions: { started_at: number; ended_at: number | null }[] = [];
  try {
    weekCompletedSessions = rawDb.getAllSync<{ started_at: number; ended_at: number | null }>(
      `SELECT started_at, ended_at
       FROM sessions
       WHERE status = 'completed' AND (
         (ended_at IS NOT NULL AND ended_at >= ? AND ended_at <= ?)
         OR (ended_at IS NULL AND started_at >= ? AND started_at <= ?)
       )`,
      [mondayStart, sundayEnd, mondayStart, sundayEnd]
    );
  } catch (err) {
    console.warn('Erro ao consultar sessões da semana:', err);
  }

  const weekDays: WeekDayStatus[] = rawWeekDays.map((d) => {
    const hasCompletedWorkout = weekCompletedSessions.some((s) => {
      const t = s.ended_at || s.started_at;
      return t >= d.startOfDay && t <= d.endOfDay;
    });

    return {
      index: d.index,
      label: d.label,
      dayOfMonth: d.dayOfMonth,
      isToday: d.isToday,
      hasCompletedWorkout,
      startOfDay: d.startOfDay,
      endOfDay: d.endOfDay,
    };
  });

  const completedDaysCount = weekDays.filter((d) => d.hasCompletedWorkout).length;
  const weekStatus: WeekStatusData = {
    completedCount: completedDaysCount,
    frequencyGoal: activeGroupFrequency,
    days: weekDays,
  };

  // 5. Seção "Último treino"
  let lastCompletedSession: LastCompletedSessionData | null = null;
  try {
    const lastRows = rawDb.getAllSync<{
      id: string;
      workout_id: string | null;
      name_snapshot: string;
      started_at: number;
      ended_at: number | null;
    }>(
      `SELECT id, workout_id, name_snapshot, started_at, ended_at
       FROM sessions
       WHERE status = 'completed'
       ORDER BY ended_at DESC, started_at DESC
       LIMIT 1`
    );

    if (lastRows.length > 0) {
      const sess = lastRows[0];
      const endTimestamp = sess.ended_at || sess.started_at;

      // Consulta carga e séries usando a regra oficial (exclui aquecimento, 2x para Halteres)
      const exVolRows = rawDb.getAllSync<{
        id: string;
        equipment: string;
      }>(
        `SELECT se.id, e.equipment
         FROM session_exercises se
         JOIN exercises e ON se.exercise_id = e.id
         WHERE se.session_id = ?`,
        [sess.id]
      );

      let totalVolume = 0;
      let setsCount = 0;

      for (const ex of exVolRows) {
        const sRows = rawDb.getAllSync<{
          weight: number;
          reps: number;
          is_warmup: number;
          type?: string;
          completed_at: number | null;
        }>(
          `SELECT weight, reps, is_warmup, type, completed_at FROM sets WHERE session_exercise_id = ?`,
          [ex.id]
        );

        totalVolume += calcularVolume(
          sRows.map((r) => ({
            weight: r.weight,
            reps: r.reps,
            isWarmup: Boolean(r.is_warmup),
            type: r.type,
            completedAt: r.completed_at,
          })),
          ex.equipment
        );

        const completedNonWarmup = sRows.filter(
          (r) => r.completed_at !== null && (r.type ? r.type !== 'warmup' : !r.is_warmup)
        );
        setsCount += completedNonWarmup.length;
      }

      // Se não houver séries registradas individualmente, busca soma dos alvos
      if (setsCount === 0) {
        const targetRows = rawDb.getAllSync<{ totalTargetSets: number }>(
          `SELECT COALESCE(SUM(target_sets), 0) AS totalTargetSets
           FROM session_exercises
           WHERE session_id = ?`,
          [sess.id]
        );
        setsCount = targetRows[0]?.totalTargetSets ?? 0;
      }

      const durationMs = Math.max(60000, (sess.ended_at || now) - sess.started_at);
      const durationMin = Math.max(1, Math.round(durationMs / 60000));

      const totalVolumeText =
        totalVolume > 0
          ? `${Math.round(totalVolume).toLocaleString('pt-BR')} ${unit}`
          : `0 ${unit}`;

      const relativeDate = formatUltimoTreinoData(endTimestamp, referenceDate);

      lastCompletedSession = {
        id: sess.id,
        workoutId: sess.workout_id,
        name: sess.name_snapshot,
        relativeDate,
        totalVolumeText,
        durationMin,
        totalSets: setsCount,
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar último treino:', err);
  }

  return {
    greeting,
    formattedDate,
    userName,
    hasActiveGroup,
    hasWorkouts,
    activeSession,
    recommendedWorkout,
    weekStatus,
    lastCompletedSession,
  };
}
