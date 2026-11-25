/**
 * Regras puras de domínio para treinos, grupos e ciclos.
 * Zero dependências de banco de dados ou React Native.
 */

/**
 * Formata o tempo relativo da última sessão concluída.
 * Sentence case: "Último log há 2 dias", "Último log hoje", "Último log ontem", "Nunca treinado".
 */
export function formatTempoRelativoLog(timestamp: number | null, referenceNow?: number): string {
  if (!timestamp) return 'Nunca treinado';
  const now = referenceNow ?? Date.now();
  const diffMs = now - timestamp;
  if (diffMs < 0) return 'Último log hoje';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) {
    return 'Último log hoje';
  }
  if (diffDays === 1) {
    return 'Último log ontem';
  }
  return `Último log há ${diffDays} dias`;
}

/**
 * Calcula qual treino do ciclo está programado para hoje.
 * "Programado para hoje" = próximo treino do ciclo (o seguinte ao último concluído, em ordem de position, voltando ao primeiro).
 * Se nenhum foi concluído ainda, seleciona o primeiro treino (índice 0).
 */
export function calculateNextScheduledWorkoutIndex(
  workouts: { id: string }[],
  lastCompletedWorkoutId: string | null
): number {
  if (!workouts || workouts.length === 0) return -1;
  if (!lastCompletedWorkoutId) return 0;
  const lastIndex = workouts.findIndex((w) => w.id === lastCompletedWorkoutId);
  if (lastIndex === -1) return 0;
  return (lastIndex + 1) % workouts.length;
}

/**
 * Formata os chips da sequência de carga (até 4 primeiros exercícios + contador excedente).
 */
export function formatSequenceChips(exerciseNames: string[]): {
  chips: string[];
  extraCount: number;
  extraText: string | null;
} {
  const chips = exerciseNames.slice(0, 4);
  const extraCount = Math.max(0, exerciseNames.length - 4);
  const extraText =
    extraCount > 0 ? `+${extraCount} ${extraCount === 1 ? 'exercício' : 'exercícios'}` : null;

  return {
    chips,
    extraCount,
    extraText,
  };
}
