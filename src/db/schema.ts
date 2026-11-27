import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * 1. Settings (Configurações do usuário)
 * unit: 'kg' | 'lb'
 * default_increment: real (padrão 2.5)
 * auto_rest_timer: boolean (1 ou 0)
 * rest_alert: 'vibrate' | 'sound' | 'both' | 'none'
 * onboarded: boolean
 */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  userName: text('user_name'),
  unit: text('unit').notNull().default('kg'),
  defaultIncrement: real('default_increment').notNull().default(2.5),
  defaultRestS: integer('default_rest_s').notNull().default(90),
  autoRestTimer: integer('auto_rest_timer', { mode: 'boolean' }).notNull().default(true),
  restAlert: text('rest_alert').notNull().default('vibrate'),
  onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
});

/**
 * 2. Exercises (Biblioteca de exercícios)
 * muscle_group: 'Peito' | 'Costas' | 'Pernas' | 'Ombros' | 'Braços' | 'Abdômen'
 * equipment: 'Barra' | 'Halteres' | 'Cabo' | 'Máquina' | 'Peso corporal'
 * kind: 'composto' | 'isolamento'
 */
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group').notNull(),
  equipment: text('equipment').notNull(),
  kind: text('kind').notNull(), // 'composto' | 'isolamento'
  defaultIncrement: real('default_increment').notNull().default(2.5),
  defaultRestS: integer('default_rest_s').notNull().default(90),
  notes: text('notes'),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  secondaryMuscles: text('secondary_muscles').notNull().default('[]'),
  defaultTargetType: text('default_target_type').notNull().default('reps'),
});

/**
 * 3. Groups (Divisões de treino / Rotinas / Splits, ex: ABC, Push/Pull/Legs)
 */
export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  frequencyDays: integer('frequency_days'),
  position: integer('position').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  badge: text('badge'),
});

/**
 * 4. Workouts (Fichas de treino, ex: Treino A, Treino B)
 */
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  groupId: text('group_id').references(() => groups.id),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

/**
 * 5. Workout Exercises (Exercícios pertencentes a um treino modelo)
 */
export const workoutExercises = sqliteTable('workout_exercises', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id').notNull().references(() => workouts.id),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  position: integer('position').notNull().default(0),
  targetSets: integer('target_sets').notNull().default(3),
  repMin: integer('rep_min').notNull().default(8),
  repMax: integer('rep_max').notNull().default(12),
  restS: integer('rest_s').notNull().default(90),
  note: text('note'),
});

/**
 * 5.1. Workout Exercise Sets (Séries planejadas individuais de um exercício na ficha)
 * type: 'warmup' | 'normal' | 'failure' | 'drop'
 * reps_mode: 'reps' | 'reps_range' | 'reps_max' | 'amrap' | 'time' | 'time_range'
 * effort_mode: 'none' | 'rpe' | 'rpe_range' | 'rir' | 'percent_1rm' | 'percent_1rm_exercise' | 'last_week_plus' | 'last_session_plus'
 */
export const workoutExerciseSets = sqliteTable('workout_exercise_sets', {
  id: text('id').primaryKey(),
  workoutExerciseId: text('workout_exercise_id')
    .notNull()
    .references(() => workoutExercises.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  type: text('type').notNull().default('normal'),
  repsMode: text('reps_mode').notNull().default('reps_range'),
  minReps: integer('min_reps'),
  maxReps: integer('max_reps'),
  effortMode: text('effort_mode').notNull().default('none'),
  effortValue: real('effort_value'),
  effortValueMax: real('effort_value_max'),
  effortRefExerciseId: text('effort_ref_exercise_id'),
  restS: integer('rest_s'),
  dropPercent: real('drop_percent'),
});

/**
 * 6. Sessions (Sessões de treino executadas ou em andamento)
 * status: 'in_progress' | 'completed' | 'discarded'
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  workoutId: text('workout_id').references(() => workouts.id),
  nameSnapshot: text('name_snapshot').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  status: text('status').notNull().default('in_progress'), // 'in_progress' | 'completed' | 'discarded'
  totalPausedS: integer('total_paused_s').notNull().default(0),
});

/**
 * 7. Session Exercises (Exercícios executados em uma sessão específica)
 */
export const sessionExercises = sqliteTable('session_exercises', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  position: integer('position').notNull().default(0),
  targetSets: integer('target_sets').notNull().default(3),
  repMin: integer('rep_min').notNull().default(8),
  repMax: integer('rep_max').notNull().default(12),
  restS: integer('rest_s').notNull().default(90),
  note: text('note'),
  isSessionOnly: integer('is_session_only', { mode: 'boolean' }).notNull().default(false),
});

/**
 * 8. Sets (Séries realizadas em cada exercício da sessão)
 * weight: real (Sempre armazenado em kg com 2 casas decimais)
 */
export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  sessionExerciseId: text('session_exercise_id').notNull().references(() => sessionExercises.id),
  index: integer('index').notNull(),
  weight: real('weight').notNull(),
  reps: integer('reps').notNull(),
  rpe: real('rpe'),
  isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at'),
  isPrWeight: integer('is_pr_weight', { mode: 'boolean' }).notNull().default(false),
  isPrVolume: integer('is_pr_volume', { mode: 'boolean' }).notNull().default(false),

  // Snapshot do planejamento de treino
  type: text('type').notNull().default('normal'),
  repsMode: text('reps_mode').notNull().default('reps_range'),
  minReps: integer('min_reps'),
  maxReps: integer('max_reps'),
  effortMode: text('effort_mode').notNull().default('none'),
  effortValue: real('effort_value'),
  effortValueMax: real('effort_value_max'),
  effortRefExerciseId: text('effort_ref_exercise_id'),
  restS: integer('rest_s'),
  isSessionOnly: integer('is_session_only', { mode: 'boolean' }).notNull().default(false),
  dropPercent: real('drop_percent'),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type InsertWorkoutExercise = typeof workoutExercises.$inferInsert;
export type WorkoutExerciseSet = typeof workoutExerciseSets.$inferSelect;
export type InsertWorkoutExerciseSet = typeof workoutExerciseSets.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type InsertSessionExercise = typeof sessionExercises.$inferInsert;
export type WorkoutSet = typeof sets.$inferSelect;
export type InsertWorkoutSet = typeof sets.$inferInsert;
