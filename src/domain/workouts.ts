/**
 * Regras puras de domínio para treinos, grupos e ciclos.
 * Zero dependências de banco de dados ou React Native.
 */

import { normalizeSearchText } from './search';

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

export interface GroupSplitSuggestion {
  name: string;
  frequencyDays: number;
  description: string;
}

/**
 * Sugestões padrão de divisão de treino (Split Suggestions).
 * Sentence case e descrições estratégicas.
 */
export const GROUP_SPLIT_SUGGESTIONS: readonly GroupSplitSuggestion[] = [
  {
    name: 'PPL',
    frequencyDays: 6,
    description: 'Siga a sequência alternando os dias de empurrar, puxar e pernas.',
  },
  {
    name: 'Upper / Lower',
    frequencyDays: 4,
    description: 'Membros superiores e inferiores alternados com dias de descanso intermediários.',
  },
  {
    name: 'Fullbody',
    frequencyDays: 3,
    description: 'Treino de corpo inteiro 3 vezes na semana com foco em grandes compostos.',
  },
  {
    name: 'ABCDE',
    frequencyDays: 5,
    description: 'Um grupo muscular isolado por dia da semana para alto volume por região.',
  },
  {
    name: 'Arnold Split',
    frequencyDays: 6,
    description: 'Peito/Costas, Ombros/Braços e Pernas — alta intensidade e volume sinérgico.',
  },
] as const;

/**
 * Validação do nome do grupo de treino:
 * - Obrigatório (não vazio)
 * - Máximo de 40 caracteres
 * - Único (ignora maiúsculas/minúsculas e acentos entre grupos existentes)
 */
export function validateGroupName(
  name: string,
  existingNames: string[]
): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: 'O nome do grupo é obrigatório' };
  }
  if (trimmed.length > 40) {
    return { isValid: false, error: 'O nome deve ter no máximo 40 caracteres' };
  }
  const norm = normalizeSearchText(trimmed);
  const isDuplicate = existingNames.some(
    (existing) => normalizeSearchText(existing) === norm
  );
  if (isDuplicate) {
    return { isValid: false, error: 'Já existe um grupo com este nome' };
  }
  return { isValid: true };
}

/**
 * Rótulo dinâmico da faixa de repetições (Tela 3.6):
 * - Força: até 6 reps
 * - Janela de hipertrofia: 7 a 12 reps
 * - Resistência: acima de 12 reps
 */
export function getRepRangeLabel(minReps: number, maxReps: number): string {
  if (maxReps <= 6) return 'Zona de força';
  if (minReps >= 7 && maxReps <= 12) return 'Janela de hipertrofia';
  if (minReps >= 13) return 'Resistência muscular';
  if (minReps <= 6 && maxReps >= 7 && maxReps <= 12) return 'Força e hipertrofia';
  return 'Hipertrofia e resistência';
}

