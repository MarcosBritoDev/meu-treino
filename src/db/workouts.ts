import { getExpoDb } from './client';
import { estimarDuracao } from '../domain/duration';
import {
  formatTempoRelativoLog,
  calculateNextScheduledWorkoutIndex,
  formatExerciseSetsSummary,
  formatExerciseCardItem,
  formatWorkoutSummary,
} from '../domain/workouts';
import { PlannedSet, SessionSet, SetType, RepsMode, EffortMode, Unit } from '../domain/types';
import { suggestDropWeightKg, suggest1RmWeightKg, calcDropFromWeightKg } from '../domain/sessionMath';

export {
  formatTempoRelativoLog,
  calculateNextScheduledWorkoutIndex,
  formatExerciseSetsSummary,
  formatExerciseCardItem,
  formatWorkoutSummary,
};
export type { PlannedSet, SessionSet, SetType, RepsMode, EffortMode, Unit };

/**
 * Consulta a unidade de peso configurada pelo usuário ('kg' | 'lb').
 */
export function getUserUnit(): Unit {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<{ unit: string }>('SELECT unit FROM settings WHERE id = 1 LIMIT 1');
    if (rows.length > 0 && (rows[0].unit === 'lb' || rows[0].unit === 'kg')) {
      return rows[0].unit as Unit;
    }
  } catch {
    // fallback seguro
  }
  return 'kg';
}

export interface WorkoutExerciseSummary {
  name: string;
  warmupCount: number;
  otherCount: number;
  setsSummary: string; // ex: "A + 5 séries" ou "3 séries"
  itemText: string;    // ex: "Supino Reto — A + 5 séries"
}

export interface WorkoutItemDetail {
  id: string;
  groupId: string | null;
  code: string;
  name: string;
  position: number;
  exerciseCount: number;
  totalSets: number;
  estimatedDurationMin: number;
  summaryText?: string;
  targetMuscles: string;
  previewExercises: string;
  exercises?: WorkoutExerciseSummary[];
}

export interface WorkoutGroupDetail {
  id: string;
  name: string;
  description: string | null;
  frequencyDays: number | null;
  frequencyText: string;
  position: number;
  isActive: boolean;
  badge: string;
  workoutCount: number;
  totalEstimatedMin: number;
  workouts: WorkoutItemDetail[];
}

export interface WorkoutSummaryResult {
  totalGroups: number;
  totalWorkouts: number;
  groups: WorkoutGroupDetail[];
}

/**
 * Consulta o resumo completo de grupos de treino, seus treinos e contadores reais.
 */
export function getWorkoutGroupsSummary(): WorkoutSummaryResult {
  try {
    const rawDb = getExpoDb();

    // 1. Grupos cadastrados (ativos primeiro, depois por posição)
    const groupRows = rawDb.getAllSync<{
      id: string;
      name: string;
      description: string | null;
      frequencyDays: number | null;
      position: number;
      isActive: number;
      badge: string | null;
    }>(
      `SELECT id, name, description, frequency_days AS frequencyDays, position, is_active AS isActive, badge
       FROM groups
       ORDER BY is_active DESC, position ASC, name ASC`
    );

    // 2. Total geral de treinos cadastrados (para métricas reais)
    const totalWorkoutsRows = rawDb.getAllSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM workouts WHERE is_active = 1`
    );
    const totalWorkouts = totalWorkoutsRows[0]?.count ?? 0;

    const groups: WorkoutGroupDetail[] = [];

    for (let gIdx = 0; gIdx < groupRows.length; gIdx++) {
      const g = groupRows[gIdx];
      const isGroupActive = Boolean(g.isActive);

      // Treinos deste grupo
      const workoutRows = rawDb.getAllSync<{
        id: string;
        groupId: string | null;
        name: string;
        position: number;
      }>(
        `SELECT id, group_id AS groupId, name, position
         FROM workouts
         WHERE group_id = ? AND is_active = 1
         ORDER BY position ASC, name ASC`,
        [g.id]
      );

      const workouts: WorkoutItemDetail[] = [];
      let groupTotalEstSeconds = 0;

      for (let wIdx = 0; wIdx < workoutRows.length; wIdx++) {
        const w = workoutRows[wIdx];
        const groupLetter = String.fromCharCode(65 + (gIdx % 26)); // A, B, C...
        const code = `${groupLetter}-${wIdx + 1}`;

        // Exercícios deste treino
        const exRows = rawDb.getAllSync<{
          workoutExerciseId: string;
          exerciseId: string;
          name: string;
          muscleGroup: string;
          targetSets: number;
          restS: number;
        }>(
          `SELECT 
            we.id AS workoutExerciseId,
            we.exercise_id AS exerciseId,
            e.name AS name,
            e.muscle_group AS muscleGroup,
            we.target_sets AS targetSets,
            we.rest_s AS restS
           FROM workout_exercises we
           JOIN exercises e ON e.id = we.exercise_id
           WHERE we.workout_id = ?
           ORDER BY we.position ASC`,
          [w.id]
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
            [w.id]
          );
        } catch {
          // fallback caso a tabela não exista ou haja erro
        }

        const exercises: WorkoutExerciseSummary[] = [];
        let totalSets = 0;
        const durExercises: { targetSets: number; restS: number }[] = [];

        for (const ex of exRows) {
          const matchingSets = setsRows.filter((s) => s.workoutExerciseId === ex.workoutExerciseId);
          let warmupCount = 0;
          let otherCount = 0;

          if (matchingSets.length > 0) {
            warmupCount = matchingSets.filter((s) => s.type === 'warmup').length;
            otherCount = matchingSets.filter((s) => s.type !== 'warmup').length;
            totalSets += matchingSets.length;
            const exRest = matchingSets[0]?.restS ?? ex.restS ?? 90;
            durExercises.push({ targetSets: matchingSets.length, restS: exRest });
          } else {
            otherCount = ex.targetSets || 3;
            totalSets += otherCount;
            durExercises.push({ targetSets: otherCount, restS: ex.restS || 90 });
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

        // Estimativa de duração pelo domínio
        const durationSeconds = estimarDuracao({
          exercises: durExercises,
        });
        groupTotalEstSeconds += durationSeconds;
        const estimatedDurationMin = Math.max(1, Math.round(durationSeconds / 60));
        const summaryText = formatWorkoutSummary(totalSets, estimatedDurationMin);

        // Músculos envolvidos (únicos e em minúsculas legíveis)
        const musclesSet = Array.from(new Set(exRows.map((r) => r.muscleGroup.toLowerCase())));
        let targetMuscles = 'Geral';
        if (musclesSet.length > 0) {
          if (musclesSet.length === 1) {
            targetMuscles = musclesSet[0].charAt(0).toUpperCase() + musclesSet[0].slice(1);
          } else if (musclesSet.length === 2) {
            targetMuscles = `${musclesSet[0]} e ${musclesSet[1]}`;
            targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
          } else {
            const last = musclesSet[musclesSet.length - 1];
            const initial = musclesSet.slice(0, -1).join(', ');
            targetMuscles = `${initial} e ${last}`;
            targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
          }
        }

        // Prévia dos primeiros exercícios formatados como "Nome — A + N séries"
        let previewExercises = '';
        if (exercises.length > 0) {
          const items = exercises.map((r) => r.itemText);
          if (items.length <= 3) {
            previewExercises = items.join(', ');
          } else {
            const firstThree = items.slice(0, 3).join(', ');
            const remaining = items.length - 3;
            previewExercises = `${firstThree} +${remaining}`;
          }
        }

        workouts.push({
          id: w.id,
          groupId: w.groupId,
          code,
          name: w.name,
          position: w.position,
          exerciseCount,
          totalSets,
          estimatedDurationMin,
          summaryText,
          targetMuscles,
          previewExercises,
          exercises,
        });
      }

      // Selo do grupo (Ativo para o ativo; Secundário/Manutenção para os demais)
      let badge = 'Secundário';
      if (isGroupActive) {
        badge = 'Ativo';
      } else if (g.badge && g.badge.trim()) {
        badge = g.badge.trim();
      } else if (gIdx === 1) {
        badge = 'Secundário';
      } else if (gIdx === 2) {
        badge = 'Manutenção';
      }

      // Frequência descritiva
      let frequencyText = '';
      if (g.frequencyDays) {
        frequencyText = `${g.frequencyDays} dias por semana`;
      } else if (isGroupActive) {
        frequencyText = '3 a 6 dias por semana';
      } else {
        frequencyText = `${workouts.length} ${workouts.length === 1 ? 'treino' : 'treinos'}`;
      }

      const totalEstimatedMin = Math.max(1, Math.round(groupTotalEstSeconds / 60));

      groups.push({
        id: g.id,
        name: g.name,
        description: g.description,
        frequencyDays: g.frequencyDays,
        frequencyText,
        position: g.position,
        isActive: isGroupActive,
        badge,
        workoutCount: workouts.length,
        totalEstimatedMin,
        workouts,
      });
    }

    return {
      totalGroups: groupRows.length,
      totalWorkouts,
      groups,
    };
  } catch (error) {
    console.warn('Erro ao consultar resumo de grupos de treino:', error);
    return { totalGroups: 0, totalWorkouts: 0, groups: [] };
  }
}

/**
 * Define um grupo como ativo e desativa os demais (regra: apenas 1 ativo por vez).
 */
export function setActiveGroup(groupId: string): void {
  const rawDb = getExpoDb();
  rawDb.execSync(`
    UPDATE groups SET is_active = 0;
  `);
  rawDb.runSync(`
    UPDATE groups SET is_active = 1 WHERE id = ?;
  `, [groupId]);
}

/**
 * Duplica um grupo com todas as suas fichas e exercícios associados.
 */
export function duplicateGroup(groupId: string): void {
  const rawDb = getExpoDb();

  const groupRows = rawDb.getAllSync<{
    name: string;
    description: string | null;
    frequencyDays: number | null;
    position: number;
    badge: string | null;
  }>(
    `SELECT name, description, frequency_days AS frequencyDays, position, badge
     FROM groups WHERE id = ? LIMIT 1`,
    [groupId]
  );

  if (groupRows.length === 0) return;
  const original = groupRows[0];
  const newGroupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Insere cópia do grupo
  rawDb.runSync(
    `INSERT INTO groups (id, name, description, frequency_days, position, is_active, badge)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      newGroupId,
      `${original.name} (Cópia)`,
      original.description,
      original.frequencyDays,
      original.position + 1,
      original.badge || 'Secundário',
    ]
  );

  // Consulta treinos originais
  const workoutRows = rawDb.getAllSync<{ id: string; name: string; position: number }>(
    `SELECT id, name, position FROM workouts WHERE group_id = ? AND is_active = 1`,
    [groupId]
  );

  for (const w of workoutRows) {
    const newWorkoutId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    rawDb.runSync(
      `INSERT INTO workouts (id, group_id, name, position, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [newWorkoutId, newGroupId, w.name, w.position]
    );

    // Consulta exercícios daquele treino
    const exRows = rawDb.getAllSync<{
      id: string;
      exerciseId: string;
      position: number;
      targetSets: number;
      repMin: number;
      repMax: number;
      restS: number;
      note: string | null;
    }>(
      `SELECT id, exercise_id AS exerciseId, position, target_sets AS targetSets, rep_min AS repMin, rep_max AS repMax, rest_s AS restS, note
       FROM workout_exercises WHERE workout_id = ?`,
      [w.id]
    );

    for (const ex of exRows) {
      const newWeId = `we_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      rawDb.runSync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newWeId,
          newWorkoutId,
          ex.exerciseId,
          ex.position,
          ex.targetSets,
          ex.repMin,
          ex.repMax,
          ex.restS,
          ex.note,
        ]
      );

      const existingSets = getWorkoutExerciseSets(ex.id);
      if (existingSets.length > 0) {
        saveWorkoutExerciseSets(
          newWeId,
          existingSets.map((s, sIdx) => ({ ...s, id: `wes_${newWeId}_${sIdx}` }))
        );
      }
    }
  }
}

/**
 * Exclui um grupo e seus treinos (o histórico de sessões anteriores é preservado).
 */
export function deleteGroup(groupId: string): void {
  const rawDb = getExpoDb();

  // Busca IDs dos treinos deste grupo
  const workouts = rawDb.getAllSync<{ id: string }>(
    `SELECT id FROM workouts WHERE group_id = ?`,
    [groupId]
  );

  for (const w of workouts) {
    rawDb.runSync(`DELETE FROM workout_exercises WHERE workout_id = ?`, [w.id]);
    rawDb.runSync(`UPDATE sessions SET workout_id = NULL WHERE workout_id = ?`, [w.id]);
    rawDb.runSync(`DELETE FROM workouts WHERE id = ?`, [w.id]);
  }

  rawDb.runSync(`DELETE FROM groups WHERE id = ?`, [groupId]);

  // Se o grupo deletado era ativo, ativa o primeiro grupo remanescente se houver
  const activeCount = rawDb.getAllSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM groups WHERE is_active = 1`
  );
  if ((activeCount[0]?.count ?? 0) === 0) {
    const firstGroup = rawDb.getAllSync<{ id: string }>(
      `SELECT id FROM groups ORDER BY position ASC LIMIT 1`
    );
    if (firstGroup.length > 0) {
      rawDb.runSync(`UPDATE groups SET is_active = 1 WHERE id = ?`, [firstGroup[0].id]);
    }
  }
}

/**
 * Cria o modelo PPL padrão com Push A, Pull A e Legs A preenchidos com exercícios reais.
 * É estritamente idempotente (não duplica se chamado mais de uma vez).
 */
export function seedDefaultPPLGroup(): string {
  const rawDb = getExpoDb();

  // Verifica idempotência: se já existir um grupo com o nome "PPL", ativa e retorna
  const existing = rawDb.getAllSync<{ id: string }>(
    `SELECT id FROM groups WHERE name = 'PPL' LIMIT 1`
  );
  if (existing.length > 0) {
    const existingId = existing[0].id;
    setActiveGroup(existingId);
    return existingId;
  }

  // Desativa outros grupos antes de criar o PPL ativo
  rawDb.execSync(`UPDATE groups SET is_active = 0;`);

  const groupId = `grp_ppl_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO groups (id, name, description, frequency_days, position, is_active, badge)
     VALUES (?, 'PPL', 'Push / Pull / Legs focada em progressão linear e controle de volume.', 6, 0, 1, 'Ativo')`,
    [groupId]
  );

  // 1. Push A
  const pushId = `w_push_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, 'Push A', 0, 1)`,
    [pushId, groupId]
  );

  const pushExercises = [
    { id: 'ex_peito_04', sets: 4, min: 8, max: 10, rest: 90 }, // Supino inclinado halteres
    { id: 'ex_ombros_02', sets: 3, min: 8, max: 12, rest: 90 }, // Desenv. halteres
    { id: 'ex_peito_05', sets: 3, min: 10, max: 12, rest: 60 }, // Crucifixo halteres
    { id: 'ex_ombros_03', sets: 4, min: 12, max: 15, rest: 60 }, // Elevação lateral
    { id: 'ex_bracos_04', sets: 4, min: 10, max: 12, rest: 60 }, // Tríceps corda
  ];

  pushExercises.forEach((item, pos) => {
    const weId = `we_push_${pos}_${Date.now()}`;
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [weId, pushId, item.id, pos, item.sets, item.min, item.max, item.rest]
    );
    for (let sIdx = 0; sIdx < item.sets; sIdx++) {
      rawDb.runSync(
        `INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s)
         VALUES (?, ?, ?, 'normal', 'reps_range', ?, ?, 'none', NULL)`,
        [`wes_${weId}_${sIdx}`, weId, sIdx, item.min, item.max]
      );
    }
  });

  // 2. Pull A
  const pullId = `w_pull_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, 'Pull A', 1, 1)`,
    [pullId, groupId]
  );

  const pullExercises = [
    { id: 'ex_costas_01', sets: 4, min: 8, max: 10, rest: 90 }, // Puxada alta pronada
    { id: 'ex_costas_02', sets: 4, min: 8, max: 10, rest: 90 }, // Remada curvada barra
    { id: 'ex_costas_04', sets: 3, min: 10, max: 12, rest: 60 }, // Remada baixa triângulo
    { id: 'ex_bracos_01', sets: 3, min: 8, max: 12, rest: 60 }, // Rosca direta barra
    { id: 'ex_bracos_03', sets: 3, min: 10, max: 12, rest: 60 }, // Rosca martelo halteres
  ];

  pullExercises.forEach((item, pos) => {
    const weId = `we_pull_${pos}_${Date.now()}`;
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [weId, pullId, item.id, pos, item.sets, item.min, item.max, item.rest]
    );
    for (let sIdx = 0; sIdx < item.sets; sIdx++) {
      rawDb.runSync(
        `INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s)
         VALUES (?, ?, ?, 'normal', 'reps_range', ?, ?, 'none', NULL)`,
        [`wes_${weId}_${sIdx}`, weId, sIdx, item.min, item.max]
      );
    }
  });

  // 3. Legs A
  const legsId = `w_legs_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, 'Legs A', 2, 1)`,
    [legsId, groupId]
  );

  const legsExercises = [
    { id: 'ex_pernas_01', sets: 4, min: 6, max: 8, rest: 120 }, // Agachamento livre
    { id: 'ex_pernas_02', sets: 4, min: 8, max: 12, rest: 90 }, // Leg press 45
    { id: 'ex_pernas_04', sets: 3, min: 10, max: 12, rest: 60 }, // Cadeira extensora
    { id: 'ex_pernas_05', sets: 4, min: 10, max: 12, rest: 60 }, // Mesa flexora
    { id: 'ex_pernas_07', sets: 4, min: 12, max: 15, rest: 45 }, // Panturrilha em pé
  ];

  legsExercises.forEach((item, pos) => {
    const weId = `we_legs_${pos}_${Date.now()}`;
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [weId, legsId, item.id, pos, item.sets, item.min, item.max, item.rest]
    );
    for (let sIdx = 0; sIdx < item.sets; sIdx++) {
      rawDb.runSync(
        `INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s)
         VALUES (?, ?, ?, 'normal', 'reps_range', ?, ?, 'none', NULL)`,
        [`wes_${weId}_${sIdx}`, weId, sIdx, item.min, item.max]
      );
    }
  });

  return groupId;
}

export interface InProgressSessionInfo {
  id: string;
  nameSnapshot: string;
  startedAt: number;
  workoutId: string | null;
}

/**
 * Verifica se já existe uma sessão de treino em andamento no banco local.
 */
export function getInProgressSession(): InProgressSessionInfo | null {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<{
      id: string;
      nameSnapshot: string;
      startedAt: number;
      workoutId: string | null;
    }>(
      `SELECT id, name_snapshot AS nameSnapshot, started_at AS startedAt, workout_id AS workoutId
       FROM sessions
       WHERE status = 'in_progress'
       ORDER BY started_at DESC
       LIMIT 1`
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.warn('Erro ao verificar sessão em andamento:', error);
    return null;
  }
}

/**
 * Descarta a sessão que estiver em andamento.
 */
export function discardInProgressSession(): void {
  try {
    const rawDb = getExpoDb();
    rawDb.runSync(
      `UPDATE sessions SET status = 'discarded', ended_at = ? WHERE status = 'in_progress'`,
      [Date.now()]
    );
  } catch (error) {
    console.warn('Erro ao descartar sessão em andamento:', error);
  }
}

/**
 * Estima a carga de 1RM do exercício a partir das séries concluídas no histórico.
 * Utiliza a fórmula de Epley: 1RM = peso * (1 + reps / 30).
 */
export function getExerciseEstimated1Rm(exerciseId: string): number | null {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<{ weight: number; reps: number }>(
      `SELECT st.weight, st.reps
       FROM sets st
       JOIN session_exercises se ON st.session_exercise_id = se.id
       JOIN sessions s ON se.session_id = s.id
       WHERE se.exercise_id = ? AND s.status = 'completed' AND st.completed_at IS NOT NULL AND st.is_warmup = 0 AND st.weight > 0 AND st.reps > 0`,
      [exerciseId]
    );
    if (rows.length === 0) return null;
    let max1Rm = 0;
    for (const r of rows) {
      const e1rm = r.reps === 1 ? r.weight : r.weight * (1 + r.reps / 30);
      if (e1rm > max1Rm) max1Rm = e1rm;
    }
    return max1Rm > 0 ? Math.round(max1Rm * 10) / 10 : null;
  } catch {
    return null;
  }
}

/**
 * Inicia uma nova sessão de treino e popula seus exercícios conforme o treino selecionado.
 * Clona workout_exercises -> session_exercises e cada linha de workout_exercise_sets -> sets,
 * aplicando as regras de pré-preenchimento de carga inicial:
 * 1. % de 1RM com 1RM estimado disponível
 * 2. Drop set (-20% da última série não-aquecimento)
 * 3. Carga da última sessão concluída (+ incremento se last_week_plus/last_session_plus)
 * 4. Fallback padrão caso não haja histórico
 */
export function startWorkoutSession(workoutId?: string, workoutName?: string): string {
  const rawDb = getExpoDb();
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const snapshot = workoutName || 'Treino livre';

  rawDb.runSync(
    `INSERT INTO sessions (id, workout_id, name_snapshot, started_at, status, total_paused_s)
     VALUES (?, ?, ?, ?, 'in_progress', 0)`,
    [sessionId, workoutId || null, snapshot, Date.now()]
  );

  if (workoutId) {
    const exRows = rawDb.getAllSync<{
      id: string;
      exerciseId: string;
      position: number;
      targetSets: number;
      repMin: number;
      repMax: number;
      restS: number;
      note: string | null;
      defaultIncrement: number | null;
    }>(
      `SELECT we.id, we.exercise_id AS exerciseId, we.position, we.target_sets AS targetSets,
              we.rep_min AS repMin, we.rep_max AS repMax, we.rest_s AS restS, we.note,
              e.default_increment AS defaultIncrement
       FROM workout_exercises we
       JOIN exercises e ON we.exercise_id = e.id
       WHERE we.workout_id = ?
       ORDER BY we.position ASC`,
      [workoutId]
    );

    for (const ex of exRows) {
      const seId = `se_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      rawDb.runSync(
        `INSERT INTO session_exercises (id, session_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note, is_session_only)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [seId, sessionId, ex.exerciseId, ex.position, ex.targetSets, ex.repMin, ex.repMax, ex.restS, ex.note]
      );

      // Clona cada linha de workout_exercise_sets para sets
      const plannedSets = rawDb.getAllSync<{
        id: string;
        position: number;
        type: string;
        reps_mode: string;
        min_reps: number | null;
        max_reps: number | null;
        effort_mode: string;
        effort_value: number | null;
        effort_value_max: number | null;
        effort_ref_exercise_id: string | null;
        rest_s: number | null;
        drop_percent: number | null;
      }>(
        `SELECT id, position, type, reps_mode, min_reps, max_reps, effort_mode,
                effort_value, effort_value_max, effort_ref_exercise_id, rest_s, drop_percent
         FROM workout_exercise_sets
         WHERE workout_exercise_id = ?
         ORDER BY position ASC`,
        [ex.id]
      );

      // Buscar séries da última sessão concluída do mesmo exercício
      const lastCompleted = rawDb.getAllSync<{ id: string }>(
        `SELECT s.id
         FROM sessions s
         JOIN session_exercises se ON se.session_id = s.id
         WHERE se.exercise_id = ? AND s.status = 'completed'
         ORDER BY s.ended_at DESC
         LIMIT 1`,
        [ex.exerciseId]
      );

      let prevSets: Array<{ weight: number; reps: number; isWarmup: boolean }> = [];
      if (lastCompleted.length > 0) {
        const rows = rawDb.getAllSync<{
          weight: number;
          reps: number;
          is_warmup: number;
          type?: string;
        }>(
          `SELECT st.weight, st.reps, st.is_warmup, st.type
           FROM sets st
           JOIN session_exercises se ON st.session_exercise_id = se.id
           WHERE se.exercise_id = ? AND se.session_id = ? AND st.completed_at IS NOT NULL
           ORDER BY st."index" ASC`,
          [ex.exerciseId, lastCompleted[0].id]
        );
        prevSets = rows.map((r) => ({
          weight: r.weight,
          reps: r.reps,
          isWarmup: Boolean(r.is_warmup || r.type === 'warmup'),
        }));
      }

      const estimated1Rm = getExerciseEstimated1Rm(ex.exerciseId);
      const initializedSets: Array<{ type: string; isWarmup: boolean; weight: number | null }> = [];

      if (plannedSets.length > 0) {
        let normalIdx = 0;
        let warmupIdx = 0;

        for (let p = 0; p < plannedSets.length; p++) {
          const ps = plannedSets[p];
          const isWarmup = ps.type === 'warmup';
          let initialKg: number | null = null;

          // Regra 1: Se effort_mode for percent_1rm ou percent_1rm_exercise e houver 1RM estimado disponível
          if (
            (ps.effort_mode === 'percent_1rm' || ps.effort_mode === 'percent_1rm_exercise') &&
            ps.effort_value !== null &&
            ps.effort_value !== undefined &&
            ps.effort_value > 0
          ) {
            let ref1Rm = estimated1Rm;
            if (ps.effort_mode === 'percent_1rm_exercise' && ps.effort_ref_exercise_id) {
              ref1Rm = getExerciseEstimated1Rm(ps.effort_ref_exercise_id) ?? estimated1Rm ?? 100;
            } else if (!ref1Rm) {
              ref1Rm = 100;
            }
            if (ref1Rm && ref1Rm > 0) {
              initialKg = suggest1RmWeightKg(ref1Rm, ps.effort_value, ex.defaultIncrement ?? 2.5);
            }
          }
          // Regra 2: Se type === 'drop', calcular em cascata a partir da série imediatamente anterior usando calcDropFromWeightKg
          else if (ps.type === 'drop') {
            const prevSet = initializedSets[initializedSets.length - 1];
            const prevKg = prevSet?.weight ?? null;
            const dropPct = ps.drop_percent ?? 20;
            initialKg = calcDropFromWeightKg(prevKg, dropPct, ex.defaultIncrement ?? 2.5);
          }
          // Regra 3: Buscar na última sessão completed carga compatível
          else {
            if (isWarmup) {
              const prevWarmups = prevSets.filter((s) => s.isWarmup);
              const prevW = prevWarmups[warmupIdx] ?? prevWarmups[prevWarmups.length - 1];
              if (prevW) {
                initialKg = prevW.weight;
              }
            } else {
              const prevNormals = prevSets.filter((s) => !s.isWarmup);
              const prevN = prevNormals[normalIdx] ?? prevNormals[prevNormals.length - 1];
              if (prevN) {
                initialKg = prevN.weight;
                if (
                  (ps.effort_mode === 'last_week_plus' || ps.effort_mode === 'last_session_plus') &&
                  ps.effort_value
                ) {
                  initialKg = Number((initialKg + ps.effort_value).toFixed(2));
                }
              }
            }
          }

          // Regra 4: Fallback se não houver histórico
          if (initialKg === null || initialKg === undefined || Number.isNaN(initialKg)) {
            initialKg = 20.0;
          }

          const initialReps =
            (ps.reps_mode === 'reps_max' ? ps.max_reps : ps.min_reps) ??
            ps.min_reps ??
            ps.max_reps ??
            (isWarmup
              ? 10
              : prevSets.filter((s) => !s.isWarmup)[normalIdx]?.reps ?? ex.repMin ?? 10);

          const setType = ps.type || 'normal';
          const dropPercent = setType === 'drop' ? (ps.drop_percent ?? 20) : null;

          const setId = `set_${Date.now()}_${p}_${Math.random().toString(36).substring(2, 6)}`;
          rawDb.runSync(
            `INSERT INTO sets (
               id, session_exercise_id, "index", weight, reps, rpe, is_warmup,
               completed_at, is_pr_weight, is_pr_volume, type, reps_mode,
               min_reps, max_reps, effort_mode, effort_value, effort_value_max,
               effort_ref_exercise_id, rest_s, is_session_only, drop_percent
             ) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [
              setId,
              seId,
              p + 1,
              initialKg,
              initialReps,
              isWarmup ? 1 : 0,
              setType,
              ps.reps_mode,
              ps.min_reps,
              ps.max_reps,
              ps.effort_mode,
              ps.effort_value,
              ps.effort_value_max,
              ps.effort_ref_exercise_id,
              ps.rest_s,
              dropPercent,
            ]
          );

          initializedSets.push({
            type: ps.type,
            isWarmup,
            weight: initialKg,
          });

          if (isWarmup) {
            warmupIdx++;
          } else {
            normalIdx++;
          }
        }
      } else {
        // Fallback para exercícios sem workout_exercise_sets
        const targetCount = ex.targetSets || 3;
        const prevNormals = prevSets.filter((s) => !s.isWarmup);
        const initialWeight = prevNormals.length > 0 ? prevNormals[0].weight : 20.0;
        const initialReps = prevNormals.length > 0 ? prevNormals[0].reps : ex.repMin || 10;

        for (let idx = 1; idx <= targetCount; idx++) {
          const setId = `set_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
          rawDb.runSync(
            `INSERT INTO sets (
               id, session_exercise_id, "index", weight, reps, rpe, is_warmup,
               completed_at, is_pr_weight, is_pr_volume, type, reps_mode,
               min_reps, max_reps, effort_mode, is_session_only, drop_percent
             ) VALUES (?, ?, ?, ?, ?, NULL, 0, NULL, 0, 0, 'normal', 'reps_range', ?, ?, 'none', 0, NULL)`,
            [setId, seId, idx, initialWeight, initialReps, ex.repMin, ex.repMax]
          );
        }
      }
    }
  }

  return sessionId;
}

/**
 * Cria um novo grupo de treino.
 */
export function createWorkoutGroup(
  name: string,
  description?: string,
  frequencyDays?: number,
  badge?: string
): string {
  const rawDb = getExpoDb();
  const id = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Se for o primeiro grupo cadastrado, define como ativo por padrão
  const existingGroups = rawDb.getAllSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM groups`
  );
  const isFirst = (existingGroups[0]?.count ?? 0) === 0;

  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM groups`
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `INSERT INTO groups (id, name, description, frequency_days, position, is_active, badge)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name.trim(),
      description?.trim() || null,
      frequencyDays || null,
      nextPos,
      isFirst ? 1 : 0,
      badge?.trim() || (isFirst ? 'Ativo' : 'Secundário'),
    ]
  );

  return id;
}

/**
 * Adiciona um treino a um grupo existente.
 */
export function addWorkoutToGroup(groupId: string, name: string): string {
  const rawDb = getExpoDb();
  const id = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM workouts WHERE group_id = ?`,
    [groupId]
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [id, groupId, name.trim(), nextPos]
  );

  return id;
}

/**
 * Cria um treino com base em um dos modelos populares da tela 4.2 Início:
 * - 'superior_a': Superior A (Peito, ombros e tríceps)
 * - 'pernas_core': Pernas e core (Quadríceps e panturrilha)
 */
export function createWorkoutFromPopularTemplate(templateType: 'superior_a' | 'pernas_core'): string {
  const rawDb = getExpoDb();

  // 1. Obtém ou cria o grupo ativo
  const groupRows = rawDb.getAllSync<{ id: string }>(
    `SELECT id FROM groups WHERE is_active = 1 LIMIT 1`
  );
  let groupId: string;
  if (groupRows.length > 0) {
    groupId = groupRows[0].id;
  } else {
    const anyGroup = rawDb.getAllSync<{ id: string }>(`SELECT id FROM groups LIMIT 1`);
    if (anyGroup.length > 0) {
      groupId = anyGroup[0].id;
    } else {
      groupId = createWorkoutGroup('Meu treino', 'Divisão inicial de treinos', 4, 'Ativo');
    }
  }

  // 2. Define o nome do treino e os exercícios do modelo
  const workoutName = templateType === 'superior_a' ? 'Superior A' : 'Pernas e core';
  const workoutId = addWorkoutToGroup(groupId, workoutName);

  const targetExerciseNames =
    templateType === 'superior_a'
      ? [
          'Supino reto com barra',
          'Supino inclinado com halteres',
          'Desenvolvimento com halteres',
          'Elevação lateral com halteres',
          'Tríceps corda no cabo',
        ]
      : [
          'Agachamento livre com barra',
          'Leg press 45°',
          'Cadeira extensora',
          'Mesa flexora',
          'Panturrilha em pé na máquina',
          'Abdominal supra no solo',
        ];

  let currentPos = 0;
  for (const name of targetExerciseNames) {
    const exRows = rawDb.getAllSync<{ id: string; default_rest_s: number }>(
      `SELECT id, default_rest_s FROM exercises WHERE name LIKE ? LIMIT 1`,
      [`%${name}%`]
    );
    if (exRows.length > 0) {
      const ex = exRows[0];
      const weId = `we_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      rawDb.runSync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
         VALUES (?, ?, ?, ?, 3, 8, 12, ?)`,
        [weId, workoutId, ex.id, currentPos++, ex.default_rest_s || 90]
      );
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        rawDb.runSync(
          `INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s)
           VALUES (?, ?, ?, 'normal', 'reps_range', 8, 12, 'none', NULL)`,
          [`wes_${weId}_${sIdx}`, weId, sIdx]
        );
      }
    }
  }

  return workoutId;
}


export interface GroupDetailWorkoutItem extends WorkoutItemDetail {
  lastLogText: string;
  isScheduledForToday: boolean;
  exerciseChips: string[];
  extraExerciseCount: number;
}

export interface GroupDetailResult {
  group: WorkoutGroupDetail;
  workouts: GroupDetailWorkoutItem[];
  otherGroups: { id: string; name: string }[];
}

/**
 * Obtém os detalhes completos de um grupo específico para a tela 3.3.
 */
export function getGroupDetail(groupId: string): GroupDetailResult | null {
  try {
    const rawDb = getExpoDb();

    // 1. Grupo
    const groupRows = rawDb.getAllSync<{
      id: string;
      name: string;
      description: string | null;
      frequencyDays: number | null;
      position: number;
      isActive: number;
      badge: string | null;
    }>(
      `SELECT id, name, description, frequency_days AS frequencyDays, position, is_active AS isActive, badge
       FROM groups WHERE id = ? LIMIT 1`,
      [groupId]
    );

    if (groupRows.length === 0) return null;
    const g = groupRows[0];
    const isGroupActive = Boolean(g.isActive);

    // 2. Outros grupos disponíveis para transferência
    const otherGroups = rawDb.getAllSync<{ id: string; name: string }>(
      `SELECT id, name FROM groups WHERE id != ? ORDER BY position ASC, name ASC`,
      [groupId]
    );

    // 3. Fichas de treino do grupo
    const workoutRows = rawDb.getAllSync<{
      id: string;
      groupId: string | null;
      name: string;
      position: number;
    }>(
      `SELECT id, group_id AS groupId, name, position
       FROM workouts
       WHERE group_id = ? AND is_active = 1
       ORDER BY position ASC, name ASC`,
      [groupId]
    );

    // 4. Último treino concluído dentro deste grupo (para determinar "Programado para hoje")
    const lastSessionRow = rawDb.getAllSync<{ workoutId: string }>(
      `SELECT s.workout_id AS workoutId
       FROM sessions s
       JOIN workouts w ON s.workout_id = w.id
       WHERE w.group_id = ? AND s.status = 'completed'
       ORDER BY s.ended_at DESC, s.started_at DESC
       LIMIT 1`,
      [groupId]
    );

    let scheduledWorkoutIndex = 0;
    if (workoutRows.length > 0) {
      if (lastSessionRow.length > 0) {
        const lastWId = lastSessionRow[0].workoutId;
        const lastIdx = workoutRows.findIndex((w) => w.id === lastWId);
        if (lastIdx !== -1) {
          scheduledWorkoutIndex = (lastIdx + 1) % workoutRows.length;
        }
      }
    }

    const workouts: GroupDetailWorkoutItem[] = [];
    let groupTotalEstSeconds = 0;

    for (let wIdx = 0; wIdx < workoutRows.length; wIdx++) {
      const w = workoutRows[wIdx];
      const code = `Rotina A-${wIdx + 1}`;

      // Exercícios
      const exRows = rawDb.getAllSync<{
        workoutExerciseId: string;
        exerciseId: string;
        name: string;
        muscleGroup: string;
        targetSets: number;
        restS: number;
      }>(
        `SELECT 
          we.id AS workoutExerciseId,
          we.exercise_id AS exerciseId,
          e.name AS name,
          e.muscle_group AS muscleGroup,
          we.target_sets AS targetSets,
          we.rest_s AS restS
         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = ?
         ORDER BY we.position ASC`,
        [w.id]
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
          [w.id]
        );
      } catch {
        // fallback
      }

      const exercises: WorkoutExerciseSummary[] = [];
      let totalSets = 0;
      const durExercises: { targetSets: number; restS: number }[] = [];

      for (const ex of exRows) {
        const matchingSets = setsRows.filter((s) => s.workoutExerciseId === ex.workoutExerciseId);
        let warmupCount = 0;
        let otherCount = 0;

        if (matchingSets.length > 0) {
          warmupCount = matchingSets.filter((s) => s.type === 'warmup').length;
          otherCount = matchingSets.filter((s) => s.type !== 'warmup').length;
          totalSets += matchingSets.length;
          const exRest = matchingSets[0]?.restS ?? ex.restS ?? 90;
          durExercises.push({ targetSets: matchingSets.length, restS: exRest });
        } else {
          otherCount = ex.targetSets || 3;
          totalSets += otherCount;
          durExercises.push({ targetSets: otherCount, restS: ex.restS || 90 });
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

      const durationSeconds = estimarDuracao({
        exercises: durExercises,
      });
      groupTotalEstSeconds += durationSeconds;
      const estimatedDurationMin = Math.max(1, Math.round(durationSeconds / 60));
      const summaryText = formatWorkoutSummary(totalSets, estimatedDurationMin);

      // Músculos
      const musclesSet = Array.from(new Set(exRows.map((r) => r.muscleGroup.toLowerCase())));
      let targetMuscles = 'Geral';
      if (musclesSet.length > 0) {
        if (musclesSet.length === 1) {
          targetMuscles = musclesSet[0].charAt(0).toUpperCase() + musclesSet[0].slice(1);
        } else if (musclesSet.length === 2) {
          targetMuscles = `${musclesSet[0]} e ${musclesSet[1]}`;
          targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
        } else {
          const last = musclesSet[musclesSet.length - 1];
          const initial = musclesSet.slice(0, -1).join(', ');
          targetMuscles = `${initial} e ${last}`;
          targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
        }
      }

      // Chips da "Sequência de carga": primeiros 4 formatados com "Nome — A + N séries" + contador excedente
      const exerciseChips = exercises.slice(0, 4).map((r) => r.itemText);
      const extraExerciseCount = Math.max(0, exercises.length - 4);

      // Último log desta ficha específica
      const lastWorkoutLog = rawDb.getAllSync<{ endedAt: number | null }>(
        `SELECT ended_at AS endedAt
         FROM sessions
         WHERE workout_id = ? AND status = 'completed'
         ORDER BY ended_at DESC
         LIMIT 1`,
        [w.id]
      );
      const lastLogText = formatTempoRelativoLog(lastWorkoutLog[0]?.endedAt ?? null);

      const isScheduledForToday = wIdx === scheduledWorkoutIndex;

      workouts.push({
        id: w.id,
        groupId: w.groupId,
        code,
        name: w.name,
        position: w.position,
        exerciseCount,
        totalSets,
        estimatedDurationMin,
        summaryText,
        targetMuscles,
        previewExercises: exerciseChips.join(', '),
        lastLogText,
        isScheduledForToday,
        exerciseChips,
        extraExerciseCount,
        exercises,
      });
    }

    const totalEstimatedMin = Math.max(1, Math.round(groupTotalEstSeconds / 60));

    const groupDetail: WorkoutGroupDetail = {
      id: g.id,
      name: g.name,
      description: g.description,
      frequencyDays: g.frequencyDays,
      frequencyText: g.frequencyDays ? `Ciclo de ${g.frequencyDays} dias` : 'Ciclo de 6 dias',
      position: g.position,
      isActive: isGroupActive,
      badge: isGroupActive ? 'Ativo' : (g.badge || 'Secundário'),
      workoutCount: workouts.length,
      totalEstimatedMin,
      workouts,
    };

    return {
      group: groupDetail,
      workouts,
      otherGroups,
    };
  } catch (error) {
    console.warn('Erro ao obter detalhes do grupo:', error);
    return null;
  }
}

/**
 * Duplica um treino específico dentro do mesmo grupo.
 */
export function duplicateWorkout(workoutId: string): string {
  const rawDb = getExpoDb();
  const rows = rawDb.getAllSync<{ groupId: string; name: string; position: number }>(
    `SELECT group_id AS groupId, name, position FROM workouts WHERE id = ? LIMIT 1`,
    [workoutId]
  );
  if (rows.length === 0) return '';
  const original = rows[0];

  const newId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [newId, original.groupId, `${original.name} (Cópia)`, original.position + 1]
  );

  const exRows = rawDb.getAllSync<{
    id: string;
    exerciseId: string;
    position: number;
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
    note: string | null;
  }>(
    `SELECT id, exercise_id AS exerciseId, position, target_sets AS targetSets, rep_min AS repMin, rep_max AS repMax, rest_s AS restS, note
     FROM workout_exercises WHERE workout_id = ?`,
    [workoutId]
  );

  for (const ex of exRows) {
    const newWeId = `we_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newWeId, newId, ex.exerciseId, ex.position, ex.targetSets, ex.repMin, ex.repMax, ex.restS, ex.note]
    );

    const origSets = getWorkoutExerciseSets(ex.id);
    if (origSets.length > 0) {
      saveWorkoutExerciseSets(
        newWeId,
        origSets.map((s, sIdx) => ({ ...s, id: `wes_${newWeId}_${sIdx}` }))
      );
    }
  }

  return newId;
}

/**
 * Exclui uma ficha de treino.
 */
export function deleteWorkout(workoutId: string): void {
  const rawDb = getExpoDb();
  rawDb.runSync(`DELETE FROM workout_exercises WHERE workout_id = ?`, [workoutId]);
  rawDb.runSync(`UPDATE sessions SET workout_id = NULL WHERE workout_id = ?`, [workoutId]);
  rawDb.runSync(`DELETE FROM workouts WHERE id = ?`, [workoutId]);
}

/**
 * Move um treino para outro grupo de treino.
 */
export function moveWorkoutToGroup(workoutId: string, targetGroupId: string): void {
  const rawDb = getExpoDb();
  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM workouts WHERE group_id = ?`,
    [targetGroupId]
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `UPDATE workouts SET group_id = ?, position = ? WHERE id = ?`,
    [targetGroupId, nextPos, workoutId]
  );
}

/**
 * Reordena um treino para cima ou para baixo na lista.
 */
export function reorderWorkout(workoutId: string, direction: 'up' | 'down'): void {
  const rawDb = getExpoDb();
  const current = rawDb.getAllSync<{ id: string; groupId: string; position: number }>(
    `SELECT id, group_id AS groupId, position FROM workouts WHERE id = ? LIMIT 1`,
    [workoutId]
  );
  if (current.length === 0) return;
  const curr = current[0];

  const siblings = rawDb.getAllSync<{ id: string; position: number }>(
    `SELECT id, position FROM workouts WHERE group_id = ? ORDER BY position ASC`,
    [curr.groupId]
  );

  const idx = siblings.findIndex((s) => s.id === workoutId);
  if (idx === -1) return;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length) return;

  const neighbor = siblings[targetIdx];

  // Troca de posição
  rawDb.runSync(`UPDATE workouts SET position = ? WHERE id = ?`, [neighbor.position, curr.id]);
  rawDb.runSync(`UPDATE workouts SET position = ? WHERE id = ?`, [curr.position, neighbor.id]);
}

/**
 * Atualiza os dados de um grupo de treino (nome, descrição, frequência).
 */
export function updateWorkoutGroup(
  groupId: string,
  name: string,
  description?: string,
  frequencyDays?: number
): void {
  const rawDb = getExpoDb();
  rawDb.runSync(
    `UPDATE groups SET name = ?, description = ?, frequency_days = ? WHERE id = ?`,
    [name.trim(), description?.trim() || null, frequencyDays || null, groupId]
  );
}

/**
 * Retorna todos os nomes de grupos existentes para validação de unicidade.
 */
export function getExistingGroupNames(excludeGroupId?: string): string[] {
  const rawDb = getExpoDb();
  if (excludeGroupId) {
    const rows = rawDb.getAllSync<{ name: string }>(
      `SELECT name FROM groups WHERE id != ?`,
      [excludeGroupId]
    );
    return rows.map((r) => r.name);
  }
  const rows = rawDb.getAllSync<{ name: string }>(`SELECT name FROM groups`);
  return rows.map((r) => r.name);
}

export interface WorkoutExerciseForEdit {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  position: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restS: number;
  note?: string | null;
  sets?: PlannedSet[];
}

export interface WorkoutForEdit {
  id: string;
  groupId: string | null;
  groupName: string;
  code: string;
  name: string;
  isActive: boolean;
  exercises: WorkoutExerciseForEdit[];
  allGroups: { id: string; name: string }[];
}

/**
 * Consulta todas as séries planejadas de um exercício da ficha.
 * Caso não haja registros ainda, realiza backfill automático com base em target_sets.
 */
export function getWorkoutExerciseSets(workoutExerciseId: string): PlannedSet[] {
  const rawDb = getExpoDb();
  const rows = rawDb.getAllSync<{
    id: string;
    workoutExerciseId: string;
    position: number;
    type: SetType;
    repsMode: RepsMode;
    minReps: number | null;
    maxReps: number | null;
    effortMode: EffortMode;
    effortValue: number | null;
    effortValueMax: number | null;
    effortRefExerciseId: string | null;
    restS: number | null;
    drop_percent: number | null;
    dropPercent: number | null;
  }>(
    `SELECT 
       id,
       workout_exercise_id AS workoutExerciseId,
       position,
       type,
       reps_mode AS repsMode,
       min_reps AS minReps,
       max_reps AS maxReps,
       effort_mode AS effortMode,
       effort_value AS effortValue,
       effort_value_max AS effortValueMax,
       effort_ref_exercise_id AS effortRefExerciseId,
       rest_s AS restS,
       drop_percent AS dropPercent,
       drop_percent AS drop_percent
     FROM workout_exercise_sets
     WHERE workout_exercise_id = ?
     ORDER BY position ASC`,
    [workoutExerciseId]
  );

  if (rows.length === 0) {
    const weRows = rawDb.getAllSync<{
      targetSets: number;
      repMin: number;
      repMax: number;
    }>(
      `SELECT target_sets AS targetSets, rep_min AS repMin, rep_max AS repMax
       FROM workout_exercises WHERE id = ? LIMIT 1`,
      [workoutExerciseId]
    );

    if (weRows.length > 0) {
      const we = weRows[0];
      const count = we.targetSets > 0 ? we.targetSets : 3;
      const generated: PlannedSet[] = [];
      for (let pos = 0; pos < count; pos++) {
        const setId = `wes_${workoutExerciseId}_${pos}`;
        rawDb.runSync(
          `INSERT INTO workout_exercise_sets (
             id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s, drop_percent
           ) VALUES (?, ?, ?, 'normal', 'reps_range', ?, ?, 'none', NULL, NULL)`,
          [setId, workoutExerciseId, pos, we.repMin, we.repMax]
        );
        generated.push({
          id: setId,
          workoutExerciseId,
          position: pos,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: we.repMin,
          maxReps: we.repMax,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
          drop_percent: null,
          dropPercent: null,
        });
      }
      return generated;
    }
  }

  return rows;
}

/**
 * Salva a lista de séries planejadas de um exercício, garantindo reindexação
 * contígua de position (0..N-1) sem buracos. Força drop_percent como NULL se type !== 'drop'.
 */
export function saveWorkoutExerciseSets(
  workoutExerciseId: string,
  sets: Array<Omit<PlannedSet, 'position'> | PlannedSet | any>
): void {
  const rawDb = getExpoDb();
  rawDb.runSync(`DELETE FROM workout_exercise_sets WHERE workout_exercise_id = ?`, [workoutExerciseId]);

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const id =
      s.id && !s.id.startsWith('new_')
        ? s.id
        : `wes_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

    const setType: SetType = s.type || 'normal';
    const rawDrop = s.dropPercent ?? s.drop_percent;
    const dropPercent =
      setType === 'drop'
        ? rawDrop !== undefined && rawDrop !== null
          ? Number(rawDrop)
          : 20
        : null;

    rawDb.runSync(
      `INSERT INTO workout_exercise_sets (
         id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps,
         effort_mode, effort_value, effort_value_max, effort_ref_exercise_id, rest_s, drop_percent
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workoutExerciseId,
        i, // Reindexação contígua garantida 0..N-1
        setType,
        s.repsMode || s.reps_mode || 'reps_range',
        s.minReps ?? s.min_reps ?? null,
        s.maxReps ?? s.max_reps ?? null,
        s.effortMode || s.effort_mode || 'none',
        s.effortValue ?? s.effort_value ?? null,
        s.effortValueMax ?? s.effort_value_max ?? null,
        s.effortRefExerciseId ?? s.effort_ref_exercise_id ?? null,
        s.restS ?? s.rest_s ?? null,
        dropPercent,
      ]
    );
  }
}

/**
 * Consulta todas as séries de um exercício da sessão ativa.
 */
export function getSessionSets(sessionExerciseId: string): SessionSet[] {
  const rawDb = getExpoDb();
  return rawDb.getAllSync<{
    id: string;
    sessionExerciseId: string;
    index: number;
    weight: number;
    reps: number;
    rpe: number | null;
    isWarmup: number;
    completedAt: number | null;
    isPrWeight: number;
    isPrVolume: number;
    type: SetType;
    repsMode: RepsMode;
    minReps: number | null;
    maxReps: number | null;
    effortMode: EffortMode;
    effortValue: number | null;
    effortValueMax: number | null;
    effortRefExerciseId: string | null;
    restS: number | null;
    isSessionOnly: number;
    drop_percent: number | null;
    dropPercent: number | null;
  }>(
    `SELECT 
       id,
       session_exercise_id AS sessionExerciseId,
       "index",
       weight,
       reps,
       rpe,
       is_warmup AS isWarmup,
       completed_at AS completedAt,
       is_pr_weight AS isPrWeight,
       is_pr_volume AS isPrVolume,
       type,
       reps_mode AS repsMode,
       min_reps AS minReps,
       max_reps AS maxReps,
       effort_mode AS effortMode,
       effort_value AS effortValue,
       effort_value_max AS effortValueMax,
       effort_ref_exercise_id AS effortRefExerciseId,
       rest_s AS restS,
       is_session_only AS isSessionOnly,
       drop_percent AS dropPercent,
       drop_percent AS drop_percent
     FROM sets
     WHERE session_exercise_id = ?
     ORDER BY "index" ASC`,
    [sessionExerciseId]
  ).map((r) => ({
    ...r,
    isWarmup: Boolean(r.isWarmup),
    isPrWeight: Boolean(r.isPrWeight),
    isPrVolume: Boolean(r.isPrVolume),
    isSessionOnly: Boolean(r.isSessionOnly),
  }));
}

/**
 * Salva ou atualiza uma série de sessão, persistindo drop_percent
 * e forçando NULL quando type !== 'drop'.
 */
export function saveSessionSet(set: {
  id: string;
  sessionExerciseId: string;
  index: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  isWarmup?: boolean;
  completedAt?: number | null;
  isPrWeight?: boolean;
  isPrVolume?: boolean;
  type?: SetType | string;
  repsMode?: RepsMode | string;
  minReps?: number | null;
  maxReps?: number | null;
  effortMode?: EffortMode | string;
  effortValue?: number | null;
  effortValueMax?: number | null;
  effortRefExerciseId?: string | null;
  restS?: number | null;
  isSessionOnly?: boolean;
  drop_percent?: number | null;
  dropPercent?: number | null;
}): void {
  const rawDb = getExpoDb();
  const setType = (set.type || 'normal') as SetType;
  const rawDrop = set.dropPercent ?? set.drop_percent;
  const dropPercent =
    setType === 'drop'
      ? rawDrop !== undefined && rawDrop !== null
        ? Number(rawDrop)
        : 20
      : null;

  rawDb.runSync(
    `INSERT INTO sets (
       id, session_exercise_id, "index", weight, reps, rpe, is_warmup,
       completed_at, is_pr_weight, is_pr_volume, type, reps_mode,
       min_reps, max_reps, effort_mode, effort_value, effort_value_max,
       effort_ref_exercise_id, rest_s, is_session_only, drop_percent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       "index" = excluded."index",
       weight = excluded.weight,
       reps = excluded.reps,
       rpe = excluded.rpe,
       is_warmup = excluded.is_warmup,
       completed_at = excluded.completed_at,
       is_pr_weight = excluded.is_pr_weight,
       is_pr_volume = excluded.is_pr_volume,
       type = excluded.type,
       reps_mode = excluded.reps_mode,
       min_reps = excluded.min_reps,
       max_reps = excluded.max_reps,
       effort_mode = excluded.effort_mode,
       effort_value = excluded.effort_value,
       effort_value_max = excluded.effort_value_max,
       effort_ref_exercise_id = excluded.effort_ref_exercise_id,
       rest_s = excluded.rest_s,
       is_session_only = excluded.is_session_only,
       drop_percent = excluded.drop_percent`,
    [
      set.id,
      set.sessionExerciseId,
      set.index,
      set.weight,
      set.reps,
      set.rpe ?? null,
      set.isWarmup ? 1 : 0,
      set.completedAt ?? null,
      set.isPrWeight ? 1 : 0,
      set.isPrVolume ? 1 : 0,
      setType,
      set.repsMode || 'reps_range',
      set.minReps ?? null,
      set.maxReps ?? null,
      set.effortMode || 'none',
      set.effortValue ?? null,
      set.effortValueMax ?? null,
      set.effortRefExerciseId ?? null,
      set.restS ?? null,
      set.isSessionOnly ? 1 : 0,
      dropPercent,
    ]
  );
}

/**
 * Consulta os dados completos de um treino para a tela 3.5 Editar treino.
 */
export function getWorkoutForEdit(workoutId: string): WorkoutForEdit | null {
  const rawDb = getExpoDb();

  const workoutRows = rawDb.getAllSync<{
    id: string;
    groupId: string | null;
    name: string;
    position: number;
    isActive: number;
    groupName: string | null;
  }>(
    `SELECT 
       w.id,
       w.group_id AS groupId,
       w.name,
       w.position,
       w.is_active AS isActive,
       g.name AS groupName
     FROM workouts w
     LEFT JOIN groups g ON g.id = w.group_id
     WHERE w.id = ?
     LIMIT 1`,
    [workoutId]
  );

  if (workoutRows.length === 0) return null;
  const w = workoutRows[0];

  // Identifica código do treino (ex.: A-1, A-2)
  let code = `A-${w.position + 1}`;
  if (w.groupId) {
    const groupWorkouts = rawDb.getAllSync<{ id: string }>(
      `SELECT id FROM workouts WHERE group_id = ? ORDER BY position ASC`,
      [w.groupId]
    );
    const pos = groupWorkouts.findIndex((item) => item.id === w.id);
    if (pos !== -1) {
      code = `A-${pos + 1}`;
    }
  }

  // Exercícios da ficha
  const exRows = rawDb.getAllSync<{
    id: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
    equipment: string;
    position: number;
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
    note: string | null;
  }>(
    `SELECT 
       we.id,
       we.exercise_id AS exerciseId,
       e.name,
       e.muscle_group AS muscleGroup,
       e.equipment,
       we.position,
       we.target_sets AS targetSets,
       we.rep_min AS repMin,
       we.rep_max AS repMax,
       we.rest_s AS restS,
       we.note
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.position ASC`,
    [workoutId]
  );

  const exercises: WorkoutExerciseForEdit[] = exRows.map((ex) => ({
    ...ex,
    sets: getWorkoutExerciseSets(ex.id),
  }));

  const allGroups = rawDb.getAllSync<{ id: string; name: string }>(
    `SELECT id, name FROM groups ORDER BY position ASC`
  );

  return {
    id: w.id,
    groupId: w.groupId,
    groupName: w.groupName || 'Personalizada',
    code,
    name: w.name,
    isActive: w.isActive === 1,
    exercises,
    allGroups,
  };
}

/**
 * Salva as alterações de um treino (nome, grupo, status ativo, exercícios e séries planejadas).
 * Conforme regra: não altera sessões passadas já concluídas.
 */
export function saveWorkout(
  workoutId: string,
  data: {
    name: string;
    groupId?: string | null;
    isActive?: boolean;
    exercises: WorkoutExerciseForEdit[];
  }
): void {
  const rawDb = getExpoDb();

  rawDb.runSync(
    `UPDATE workouts 
     SET name = ?, group_id = ?, is_active = ? 
     WHERE id = ?`,
    [
      data.name.trim(),
      data.groupId ?? null,
      data.isActive !== false ? 1 : 0,
      workoutId,
    ]
  );

  // Armazena as séries para reinserir se já existirem
  const setsByExerciseIndex: (PlannedSet[] | undefined)[] = data.exercises.map((ex) => {
    if (ex.sets && ex.sets.length > 0) return ex.sets;
    if (ex.id) {
      const existing = getWorkoutExerciseSets(ex.id);
      if (existing.length > 0) return existing;
    }
    return undefined;
  });

  // Substitui os exercícios da ficha mantendo integridade
  rawDb.runSync(`DELETE FROM workout_exercises WHERE workout_id = ?`, [workoutId]);

  for (let i = 0; i < data.exercises.length; i++) {
    const ex = data.exercises[i];
    const newId =
      ex.id && !ex.id.startsWith('new_')
        ? ex.id
        : `we_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

    const setsToSave = setsByExerciseIndex[i];
    const targetSets = setsToSave && setsToSave.length > 0 ? setsToSave.length : (ex.targetSets || 3);

    rawDb.runSync(
      `INSERT INTO workout_exercises (
         id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        workoutId,
        ex.exerciseId,
        i, // Nova posição reordenada
        targetSets,
        ex.repMin,
        ex.repMax,
        ex.restS,
        ex.note || null,
      ]
    );

    if (setsToSave && setsToSave.length > 0) {
      saveWorkoutExerciseSets(newId, setsToSave);
    } else {
      const defaultSets: PlannedSet[] = [];
      for (let sIdx = 0; sIdx < targetSets; sIdx++) {
        defaultSets.push({
          id: `wes_${newId}_${sIdx}`,
          workoutExerciseId: newId,
          position: sIdx,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: ex.repMin,
          maxReps: ex.repMax,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        });
      }
      saveWorkoutExerciseSets(newId, defaultSets);
    }
  }
}

/**
 * Retorna todos os exercícios disponíveis no catálogo para adição à ficha de treino.
 */
export function getAllExercisesForSelector(): {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  defaultRestS: number;
}[] {
  const rawDb = getExpoDb();
  return rawDb.getAllSync<{
    id: string;
    name: string;
    muscleGroup: string;
    equipment: string;
    defaultRestS: number;
  }>(
    `SELECT id, name, muscle_group AS muscleGroup, equipment, default_rest_s AS defaultRestS 
     FROM exercises 
     WHERE archived = 0 
     ORDER BY name ASC`
  );
}



