import { WorkoutEstimateInput } from './types';

// Duração média estimada para a execução ativa de uma série (em segundos)
export const AVG_SET_DURATION_S = 45;

/**
 * Estima a duração total de um treino em segundos.
 * 
 * Cada série tem ~45s de execução ativa + o tempo de descanso configurado (`restS`).
 * O último descanso após a série final do treino é desconsiderado.
 * 
 * @param workout Treino contendo lista de exercícios com targetSets e restS
 * @returns Duração total estimada em segundos
 */
export function estimarDuracao(workout: WorkoutEstimateInput): number {
  if (!workout || !workout.exercises || workout.exercises.length === 0) {
    return 0;
  }

  let totalSets = 0;
  let totalRestS = 0;
  let lastRestS = 0;

  for (const ex of workout.exercises) {
    const sets = Math.max(0, Number(ex.targetSets) || 0);
    const rest = Math.max(0, Number(ex.restS) || 0);

    if (sets > 0) {
      totalSets += sets;
      totalRestS += sets * rest;
      lastRestS = rest;
    }
  }

  if (totalSets === 0) {
    return 0;
  }

  const workTime = totalSets * AVG_SET_DURATION_S;
  // Desconta o descanso após a última série do treino
  const adjustedRest = Math.max(0, totalRestS - lastRestS);

  return workTime + adjustedRest;
}

/**
 * Formata duração em segundos para texto legível em português.
 * Sentence case: "45 min", "1 h 15 min", "< 1 min".
 */
export function formatarDuracao(segundos: number): string {
  if (segundos <= 0) return '0 min';
  const minutos = Math.round(segundos / 60);

  if (minutos < 1) {
    return '1 min';
  }

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const minRestantes = minutos % 60;

  if (minRestantes === 0) {
    return `${horas} h`;
  }

  return `${horas} h ${minRestantes} min`;
}
