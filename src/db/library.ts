import { getExpoDb } from './client';
import { ExerciseItemData } from '../domain/search';
import {
  parseSecondaryMuscles,
  serializeSecondaryMuscles,
  sanitizeSecondaryMuscles,
  DefaultTargetType,
} from '../domain/exerciseCatalog';

/**
 * Consulta todos os exercícios ativos no banco SQLite, associando
 * a melhor marca histórica (PR) de peso/repetições de séries concluídas.
 */
export function getExercisesWithPR(): ExerciseItemData[] {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<ExerciseItemData>(`
      SELECT 
        e.id,
        e.name,
        e.muscle_group AS muscleGroup,
        e.equipment,
        e.kind,
        e.default_increment AS defaultIncrement,
        e.default_rest_s AS defaultRestS,
        e.notes,
        e.is_custom AS isCustom,
        e.archived,
        e.secondary_muscles AS secondaryMuscles,
        e.default_target_type AS defaultTargetType,
        (
          SELECT s.weight 
          FROM sets s 
          JOIN session_exercises se ON s.session_exercise_id = se.id 
          WHERE se.exercise_id = e.id 
            AND s.completed_at IS NOT NULL 
            AND s.is_warmup = 0 
          ORDER BY s.weight DESC, s.reps DESC 
          LIMIT 1
        ) AS bestWeight,
        (
          SELECT s.reps 
          FROM sets s 
          JOIN session_exercises se ON s.session_exercise_id = se.id 
          WHERE se.exercise_id = e.id 
            AND s.completed_at IS NOT NULL 
            AND s.is_warmup = 0 
          ORDER BY s.weight DESC, s.reps DESC 
          LIMIT 1
        ) AS bestReps
      FROM exercises e
      WHERE e.archived = 0
      ORDER BY e.name ASC
    `);

    return rows.map((r) => ({
      ...r,
      isCustom: Boolean(r.isCustom),
      archived: Boolean(r.archived),
      bestWeight: r.bestWeight != null ? Number(r.bestWeight) : null,
      bestReps: r.bestReps != null ? Number(r.bestReps) : null,
      secondaryMuscles: parseSecondaryMuscles(r.secondaryMuscles),
      defaultTargetType: ((r.defaultTargetType as DefaultTargetType) || 'reps'),
    }));
  } catch (error) {
    console.warn('Erro ao carregar exercícios com PR:', error);
    return [];
  }
}

export interface ExerciseSelectionItem {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  kind: string;
  defaultIncrement: number;
  defaultRestS: number;
  lastWeight: number | null;
  lastReps: number | null;
  secondaryMuscles?: string[];
  defaultTargetType?: DefaultTargetType;
}

/**
 * Consulta os exercícios disponíveis para adição à ficha de treino (Tela 3.7),
 * trazendo o último registro concluído de carga e repetições.
 */
export function getExercisesForAddSelection(): ExerciseSelectionItem[] {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<ExerciseSelectionItem>(`
      SELECT 
        e.id,
        e.name,
        e.muscle_group AS muscleGroup,
        e.equipment,
        e.kind,
        e.default_increment AS defaultIncrement,
        e.default_rest_s AS defaultRestS,
        e.secondary_muscles AS secondaryMuscles,
        e.default_target_type AS defaultTargetType,
        (
          SELECT s.weight 
          FROM sets s 
          JOIN session_exercises se ON s.session_exercise_id = se.id 
          JOIN sessions sess ON se.session_id = sess.id
          WHERE se.exercise_id = e.id 
            AND s.completed_at IS NOT NULL 
            AND s.is_warmup = 0 
          ORDER BY sess.started_at DESC, s.completed_at DESC 
          LIMIT 1
        ) AS lastWeight,
        (
          SELECT s.reps 
          FROM sets s 
          JOIN session_exercises se ON s.session_exercise_id = se.id 
          JOIN sessions sess ON se.session_id = sess.id
          WHERE se.exercise_id = e.id 
            AND s.completed_at IS NOT NULL 
            AND s.is_warmup = 0 
          ORDER BY sess.started_at DESC, s.completed_at DESC 
          LIMIT 1
        ) AS lastReps
      FROM exercises e
      WHERE e.archived = 0
      ORDER BY e.name ASC
    `);

    return rows.map((r) => ({
      ...r,
      defaultIncrement: Number(r.defaultIncrement) || 2.5,
      defaultRestS: Number(r.defaultRestS) || 90,
      lastWeight: r.lastWeight != null ? Number(r.lastWeight) : null,
      lastReps: r.lastReps != null ? Number(r.lastReps) : null,
      secondaryMuscles: parseSecondaryMuscles(r.secondaryMuscles),
      defaultTargetType: ((r.defaultTargetType as DefaultTargetType) || 'reps'),
    }));
  } catch (error) {
    console.warn('Erro ao carregar exercícios para seleção:', error);
    return [];
  }
}

export interface CreateExerciseInput {
  name: string;
  muscleGroup: string;
  equipment: string;
  kind?: 'composto' | 'isolamento';
  defaultIncrement: number;
  defaultRestS: number;
  notes?: string;
  secondaryMuscles?: string[];
  defaultTargetType?: DefaultTargetType;
}

/**
 * Cria um novo exercício personalizado no banco SQLite com is_custom = 1
 */
export function createCustomExercise(input: CreateExerciseInput): ExerciseItemData {
  const rawDb = getExpoDb();
  const id = `ex_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const kind = input.kind || 'composto';
  const notes = input.notes?.trim() || null;
  const cleanSecondary = sanitizeSecondaryMuscles(input.muscleGroup, input.secondaryMuscles || []);
  const defaultTargetType: DefaultTargetType = input.defaultTargetType === 'time' ? 'time' : 'reps';
  const serializedSecondary = serializeSecondaryMuscles(cleanSecondary);

  rawDb.runSync(
    `INSERT INTO exercises (
      id, name, muscle_group, equipment, kind, default_increment, default_rest_s, notes, is_custom, archived, secondary_muscles, default_target_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.muscleGroup,
      input.equipment,
      kind,
      input.defaultIncrement,
      input.defaultRestS,
      notes,
      serializedSecondary,
      defaultTargetType,
    ]
  );

  return {
    id,
    name: input.name.trim(),
    muscleGroup: input.muscleGroup,
    equipment: input.equipment,
    kind,
    defaultIncrement: input.defaultIncrement,
    defaultRestS: input.defaultRestS,
    notes,
    isCustom: true,
    archived: false,
    bestWeight: null,
    bestReps: null,
    secondaryMuscles: cleanSecondary,
    defaultTargetType,
  };
}

export interface UpdateExerciseInput {
  name?: string;
  muscleGroup?: string;
  equipment?: string;
  kind?: 'composto' | 'isolamento';
  defaultIncrement?: number;
  defaultRestS?: number;
  notes?: string | null;
  secondaryMuscles?: string[];
  defaultTargetType?: DefaultTargetType;
}

/**
 * Atualiza um exercício existente no banco de dados SQLite.
 */
export function updateCustomExercise(
  id: string,
  input: UpdateExerciseInput
): ExerciseItemData | null {
  const existing = getExerciseById(id);
  if (!existing) return null;

  const rawDb = getExpoDb();
  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const muscleGroup = input.muscleGroup !== undefined ? input.muscleGroup : existing.muscleGroup;
  const equipment = input.equipment !== undefined ? input.equipment : existing.equipment;
  const kind = input.kind !== undefined ? input.kind : existing.kind;
  const defaultIncrement =
    input.defaultIncrement !== undefined ? input.defaultIncrement : existing.defaultIncrement;
  const defaultRestS =
    input.defaultRestS !== undefined ? input.defaultRestS : existing.defaultRestS;
  const notes = input.notes !== undefined ? input.notes?.trim() || null : existing.notes ?? null;
  const rawSecondaries = parseSecondaryMuscles(
    input.secondaryMuscles !== undefined ? input.secondaryMuscles : existing.secondaryMuscles
  );
  const cleanSecondary = sanitizeSecondaryMuscles(muscleGroup, rawSecondaries);
  const defaultTargetType: DefaultTargetType =
    input.defaultTargetType !== undefined
      ? input.defaultTargetType === 'time'
        ? 'time'
        : 'reps'
      : existing.defaultTargetType === 'time'
      ? 'time'
      : 'reps';

  rawDb.runSync(
    `UPDATE exercises
     SET name = ?, muscle_group = ?, equipment = ?, kind = ?, default_increment = ?,
         default_rest_s = ?, notes = ?, secondary_muscles = ?, default_target_type = ?
     WHERE id = ?`,
    [
      name,
      muscleGroup,
      equipment,
      kind,
      defaultIncrement,
      defaultRestS,
      notes,
      serializeSecondaryMuscles(cleanSecondary),
      defaultTargetType,
      id,
    ]
  );

  return {
    ...existing,
    name,
    muscleGroup,
    equipment,
    kind,
    defaultIncrement,
    defaultRestS,
    notes,
    secondaryMuscles: cleanSecondary,
    defaultTargetType,
  };
}

/**
 * Exclui um exercício personalizado do banco de dados (se for customizado).
 */
export function deleteCustomExercise(id: string): boolean {
  try {
    const rawDb = getExpoDb();
    const ex = getExerciseById(id);
    if (!ex || !ex.isCustom) return false;

    rawDb.runSync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', [id]);
    return true;
  } catch (err) {
    console.warn('Erro ao excluir exercício customizado:', err);
    return false;
  }
}

/**
 * Lista todos os exercícios cadastrados no banco de dados.
 */
export function listExercises(options?: { includeArchived?: boolean }): ExerciseItemData[] {
  try {
    const rawDb = getExpoDb();
    const whereClause = options?.includeArchived ? '' : 'WHERE archived = 0';
    const rows = rawDb.getAllSync<ExerciseItemData>(
      `SELECT 
        id,
        name,
        muscle_group AS muscleGroup,
        equipment,
        kind,
        default_increment AS defaultIncrement,
        default_rest_s AS defaultRestS,
        notes,
        is_custom AS isCustom,
        archived,
        secondary_muscles AS secondaryMuscles,
        default_target_type AS defaultTargetType
      FROM exercises
      ${whereClause}
      ORDER BY name ASC`
    );

    return rows.map((r) => ({
      ...r,
      isCustom: Boolean(r.isCustom),
      archived: Boolean(r.archived),
      secondaryMuscles: parseSecondaryMuscles(r.secondaryMuscles),
      defaultTargetType: ((r.defaultTargetType as DefaultTargetType) || 'reps'),
    }));
  } catch (err) {
    console.warn('Erro ao listar exercícios:', err);
    return [];
  }
}

/**
 * Busca os dados de um exercício específico por ID
 */
export function getExerciseById(id: string): ExerciseItemData | null {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<ExerciseItemData>(
      `SELECT 
        id,
        name,
        muscle_group AS muscleGroup,
        equipment,
        kind,
        default_increment AS defaultIncrement,
        default_rest_s AS defaultRestS,
        notes,
        is_custom AS isCustom,
        archived,
        secondary_muscles AS secondaryMuscles,
        default_target_type AS defaultTargetType
      FROM exercises
      WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      isCustom: Boolean(r.isCustom),
      archived: Boolean(r.archived),
      secondaryMuscles: parseSecondaryMuscles(r.secondaryMuscles),
      defaultTargetType: ((r.defaultTargetType as DefaultTargetType) || 'reps'),
    };
  } catch (error) {
    console.warn('Erro ao buscar exercício por ID:', error);
    return null;
  }
}

export interface ExerciseRecords {
  maxWeight: { weight: number; reps: number; completedAt: number | null } | null;
  maxVolume: { volume: number; weight: number; reps: number; completedAt: number | null } | null;
}

/**
 * Consulta os recordes pessoais (Maior carga e Melhor volume de série) do exercício
 */
export function getExerciseRecords(exerciseId: string): ExerciseRecords {
  try {
    const rawDb = getExpoDb();

    // Maior carga
    const maxWeightRows = rawDb.getAllSync<{ weight: number; reps: number; completedAt: number | null }>(
      `SELECT s.weight, s.reps, s.completed_at AS completedAt
       FROM sets s
       JOIN session_exercises se ON s.session_exercise_id = se.id
       WHERE se.exercise_id = ? AND s.completed_at IS NOT NULL AND s.is_warmup = 0
       ORDER BY s.weight DESC, s.reps DESC
       LIMIT 1`,
      [exerciseId]
    );

    // Melhor volume de uma única série
    const maxVolumeRows = rawDb.getAllSync<{ weight: number; reps: number; volume: number; completedAt: number | null }>(
      `SELECT s.weight, s.reps, (s.weight * s.reps) AS volume, s.completed_at AS completedAt
       FROM sets s
       JOIN session_exercises se ON s.session_exercise_id = se.id
       WHERE se.exercise_id = ? AND s.completed_at IS NOT NULL AND s.is_warmup = 0
       ORDER BY (s.weight * s.reps) DESC, s.weight DESC
       LIMIT 1`,
      [exerciseId]
    );

    return {
      maxWeight: maxWeightRows.length > 0 ? maxWeightRows[0] : null,
      maxVolume: maxVolumeRows.length > 0 ? maxVolumeRows[0] : null,
    };
  } catch (error) {
    console.warn('Erro ao consultar recordes do exercício:', error);
    return { maxWeight: null, maxVolume: null };
  }
}

export interface ExerciseSessionHistoryItem {
  sessionId: string;
  date: number; // started_at
  bestWeight: number;
  bestReps: number;
  totalVolume: number;
  avgRpe: number | null;
  setCount: number;
  isAllTimePR: boolean;
}

/**
 * Consulta o histórico de sessões em que o exercício foi executado (mais recente primeiro)
 */
export function getExerciseSessionHistory(
  exerciseId: string,
  allTimeMaxWeight?: number | null
): ExerciseSessionHistoryItem[] {
  try {
    const rawDb = getExpoDb();

    const exRows = rawDb.getAllSync<{ equipment: string }>(
      `SELECT equipment FROM exercises WHERE id = ?`,
      [exerciseId]
    );
    const isDumbbell = exRows[0]?.equipment?.trim().toLowerCase() === 'halteres';
    const multiplier = isDumbbell ? 2 : 1;

    // Sessões distintas onde o exercício esteve presente
    const sessionRows = rawDb.getAllSync<{
      sessionId: string;
      startedAt: number;
      sessionExerciseId: string;
    }>(
      `SELECT 
        s.id AS sessionId,
        s.started_at AS startedAt,
        se.id AS sessionExerciseId
      FROM sessions s
      JOIN session_exercises se ON se.session_id = s.id
      WHERE se.exercise_id = ? AND s.status = 'completed'
      ORDER BY s.started_at DESC`,
      [exerciseId]
    );

    const history: ExerciseSessionHistoryItem[] = [];

    for (const sRow of sessionRows) {
      // Séries concluídas dessa sessão
      const setRows = rawDb.getAllSync<{
        weight: number;
        reps: number;
        rpe: number | null;
      }>(
        `SELECT weight, reps, rpe
         FROM sets
         WHERE session_exercise_id = ? AND completed_at IS NOT NULL AND is_warmup = 0
         ORDER BY weight DESC, reps DESC`,
        [sRow.sessionExerciseId]
      );

      if (setRows.length === 0) continue;

      const bestSet = setRows[0];
      const totalVolume = setRows.reduce((acc, curr) => acc + curr.weight * multiplier * curr.reps, 0);
      const rpeValues = setRows.map((r) => r.rpe).filter((r): r is number => r !== null && r > 0);
      const avgRpe = rpeValues.length > 0
        ? Number((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1))
        : null;

      const isAllTimePR = Boolean(
        allTimeMaxWeight && bestSet.weight >= allTimeMaxWeight
      );

      history.push({
        sessionId: sRow.sessionId,
        date: sRow.startedAt,
        bestWeight: bestSet.weight,
        bestReps: bestSet.reps,
        totalVolume,
        avgRpe,
        setCount: setRows.length,
        isAllTimePR,
      });
    }

    return history;
  } catch (error) {
    console.warn('Erro ao consultar histórico de sessões:', error);
    return [];
  }
}

/**
 * Consulta pontos cronológicos de carga máxima por sessão para o gráfico de evolução
 */
export function getExerciseEvolutionPoints(exerciseId: string): { date: number; weight: number }[] {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<{ date: number; weight: number }>(
      `SELECT 
        s.started_at AS date,
        MAX(st.weight) AS weight
      FROM sessions s
      JOIN session_exercises se ON se.session_id = s.id
      JOIN sets st ON st.session_exercise_id = se.id
      WHERE se.exercise_id = ? 
        AND st.completed_at IS NOT NULL 
        AND st.is_warmup = 0
        AND s.status = 'completed'
      GROUP BY s.id
      ORDER BY s.started_at ASC`,
      [exerciseId]
    );

    return rows.map((r) => ({
      date: Number(r.date),
      weight: Number(r.weight),
    }));
  } catch (error) {
    console.warn('Erro ao buscar pontos de evolução:', error);
    return [];
  }
}

export interface WorkoutOption {
  id: string;
  name: string;
  exerciseCount: number;
}

/**
 * Retorna os treinos ativos no sistema
 */
export function getActiveWorkouts(): WorkoutOption[] {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<{ id: string; name: string; exerciseCount: number }>(
      `SELECT 
        w.id,
        w.name,
        COUNT(we.id) AS exerciseCount
      FROM workouts w
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      WHERE w.is_active = 1
      GROUP BY w.id
      ORDER BY w.position ASC, w.name ASC`
    );
    return rows;
  } catch (error) {
    console.warn('Erro ao buscar treinos ativos:', error);
    return [];
  }
}

/**
 * Adiciona um exercício a um treino com metas padrão.
 * Se default_target_type === 'time', as séries nascem com reps_mode = 'time' (45s).
 */
export function addExerciseToWorkout(workoutId: string, exerciseId: string): void {
  const rawDb = getExpoDb();
  const id = `we_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Obtém o descanso padrão e default_target_type do exercício
  const exRow = rawDb.getAllSync<{ defaultRestS: number; defaultTargetType: string }>(
    'SELECT default_rest_s AS defaultRestS, default_target_type AS defaultTargetType FROM exercises WHERE id = ? LIMIT 1',
    [exerciseId]
  );
  const defaultRestS = exRow[0]?.defaultRestS ?? 90;
  const isTime = exRow[0]?.defaultTargetType === 'time';
  const repsMode = isTime ? 'time' : 'reps_range';
  const repMin = isTime ? 45 : 8;
  const repMax = isTime ? 45 : 12;

  // Próxima posição no treino
  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    'SELECT MAX(position) AS maxPos FROM workout_exercises WHERE workout_id = ?',
    [workoutId]
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `INSERT INTO workout_exercises (
      id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note
    ) VALUES (?, ?, ?, ?, 3, ?, ?, ?, NULL)`,
    [id, workoutId, exerciseId, nextPos, repMin, repMax, defaultRestS]
  );

  for (let sIdx = 0; sIdx < 3; sIdx++) {
    rawDb.runSync(
      `INSERT INTO workout_exercise_sets (
        id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s
      ) VALUES (?, ?, ?, 'normal', ?, ?, ?, 'none', NULL)`,
      [`wes_${id}_${sIdx}`, id, sIdx, repsMode, repMin, repMax]
    );
  }
}

/**
 * Adiciona um exercício a uma sessão ativa com metas padrão.
 * Se default_target_type === 'time', as séries nascem com reps_mode = 'time' (45s).
 */
export function addExerciseToSession(sessionId: string, exerciseId: string): string {
  const rawDb = getExpoDb();
  const seId = `se_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const exRow = rawDb.getAllSync<{ defaultRestS: number; defaultTargetType: string }>(
    'SELECT default_rest_s AS defaultRestS, default_target_type AS defaultTargetType FROM exercises WHERE id = ? LIMIT 1',
    [exerciseId]
  );
  const defaultRestS = exRow[0]?.defaultRestS ?? 90;
  const isTime = exRow[0]?.defaultTargetType === 'time';
  const repsMode = isTime ? 'time' : 'reps_range';
  const repMin = isTime ? 45 : 8;
  const repMax = isTime ? 45 : 12;
  const initialReps = isTime ? 45 : 10;
  const initialWeight = isTime ? 0 : 20.0;

  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM session_exercises WHERE session_id = ?`,
    [sessionId]
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `INSERT INTO session_exercises (id, session_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, is_session_only)
     VALUES (?, ?, ?, ?, 3, ?, ?, ?, 1)`,
    [seId, sessionId, exerciseId, nextPos, repMin, repMax, defaultRestS]
  );

  for (let s = 1; s <= 3; s++) {
    const setId = `set_${Date.now()}_${s}_${Math.random().toString(36).substring(2, 6)}`;
    rawDb.runSync(
      `INSERT INTO sets (id, session_exercise_id, "index", weight, reps, is_warmup, is_pr_weight, is_pr_volume, type, reps_mode, min_reps, max_reps, effort_mode, is_session_only)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'normal', ?, ?, ?, 'none', 1)`,
      [setId, seId, s, initialWeight, initialReps, repsMode, repMin, repMax]
    );
  }

  return seId;
}

/**
 * Cria um treino rápido se a lista de treinos estiver vazia
 */
export function createQuickWorkout(name: string): WorkoutOption {
  const rawDb = getExpoDb();
  const id = `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, name, position, is_active) VALUES (?, ?, 0, 1)`,
    [id, name]
  );
  return { id, name, exerciseCount: 0 };
}

/**
 * Arquiva um exercício (remove da biblioteca ativa preservando o histórico)
 */
export function archiveExercise(exerciseId: string): void {
  const rawDb = getExpoDb();
  rawDb.runSync(
    'UPDATE exercises SET archived = 1 WHERE id = ?',
    [exerciseId]
  );
}


