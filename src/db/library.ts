import { getExpoDb } from './client';
import { ExerciseItemData } from '../domain/search';

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
    }));
  } catch (error) {
    console.warn('Erro ao carregar exercícios com PR:', error);
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
}

/**
 * Cria um novo exercício personalizado no banco SQLite com is_custom = 1
 */
export function createCustomExercise(input: CreateExerciseInput): ExerciseItemData {
  const rawDb = getExpoDb();
  const id = `ex_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const kind = input.kind || 'composto';
  const notes = input.notes?.trim() || null;

  rawDb.runSync(
    `INSERT INTO exercises (
      id, name, muscle_group, equipment, kind, default_increment, default_rest_s, notes, is_custom, archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [
      id,
      input.name.trim(),
      input.muscleGroup,
      input.equipment,
      kind,
      input.defaultIncrement,
      input.defaultRestS,
      notes,
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
  };
}

