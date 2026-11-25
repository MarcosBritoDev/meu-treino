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
