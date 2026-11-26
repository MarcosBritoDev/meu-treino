export type Equipment = 'Barra' | 'Halteres' | 'Cabo' | 'Máquina' | 'Peso corporal';

export type MuscleGroup = 'Peito' | 'Costas' | 'Pernas' | 'Ombros' | 'Braços' | 'Abdômen';

export type ExerciseKind = 'composto' | 'isolamento';

export type WeightUnit = 'kg' | 'lb';

export interface SetData {
  weight: number;
  reps: number;
  isWarmup?: boolean;
  completedAt?: number | null | boolean;
}

export interface PRResult {
  isPrWeight: boolean;
  isPrVolume: boolean;
}

export interface WorkoutExerciseEstimate {
  targetSets: number;
  restS: number;
}

export interface WorkoutEstimateInput {
  exercises: WorkoutExerciseEstimate[];
}

export type SetType = 'warmup' | 'normal' | 'failure' | 'drop';

export type RepsMode =
  | 'reps'
  | 'reps_range'
  | 'reps_max'
  | 'amrap'
  | 'time'
  | 'time_range';

export type EffortMode =
  | 'none'
  | 'rpe'
  | 'rpe_range'
  | 'rir'
  | 'percent_1rm'
  | 'percent_1rm_exercise'
  | 'last_week_plus'
  | 'last_session_plus';

export interface PlannedSet {
  id: string;
  workoutExerciseId?: string;
  position: number;
  type: SetType;
  repsMode: RepsMode;
  minReps?: number | null;
  maxReps?: number | null;
  effortMode: EffortMode;
  effortValue?: number | null;
  effortValueMax?: number | null;
  effortRefExerciseId?: string | null;
  restS?: number | null;
}

