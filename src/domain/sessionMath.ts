import { PlannedSet, SetType, RepsMode, EffortMode } from './types';

export type Unit = 'kg' | 'lb';

export const KG_TO_LB = 2.20462262185;
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round1 = (n: number) => Math.round(n * 10) / 10;

// ============================================================================
// 1. CONSTANTES E OPÇÕES
// ============================================================================

export const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export const RIR_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

export const REPS_MODE_OPTIONS = [
  'reps',
  'reps_range',
  'reps_max',
  'amrap',
  'time',
  'time_range',
] as const;

export const EFFORT_MODE_OPTIONS = [
  'none',
  'rpe',
  'rpe_range',
  'rir',
  'percent_1rm',
  'percent_1rm_exercise',
  'last_week_plus',
  'last_session_plus',
] as const;

// ============================================================================
// 2. CONVERSÃO E FORMATAÇÃO DE PESOS
// ============================================================================

/** O banco guarda SEMPRE kg. Converta só na exibição e na digitação. */
export const kgToDisplay = (kg: number, unit: Unit): number =>
  unit === 'kg' ? kg : kg * KG_TO_LB;

export const displayToKg = (value: number, unit: Unit): number =>
  round2(unit === 'kg' ? value : value / KG_TO_LB);

/** "62,5" (pt-BR). kg com até 2 casas; lb com até 1. */
export function formatWeight(kg: number | null | undefined, unit: Unit): string {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—';
  const v = unit === 'kg' ? round2(kg) : round1(kgToDisplay(kg, unit));
  return String(v).replace('.', ',');
}

/** Formata número com vírgula decimal pt-BR (ex: 7,5 ou 8). */
export function formatDecimalBR(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  const rounded = Math.round(val * 10) / 10;
  return String(rounded).replace('.', ',');
}

/** Aceita "62,5" ou "62.5". Retorna null se inválido ou negativo. */
export function parseNumber(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ============================================================================
// 3. FORMATAÇÃO DE SÉRIES PLANEJADAS
// ============================================================================

interface SetTargetLike {
  type?: SetType | string;
  repsMode?: RepsMode | string;
  reps_mode?: RepsMode | string;
  minReps?: number | null;
  min_reps?: number | null;
  maxReps?: number | null;
  max_reps?: number | null;
}

/**
 * Formata a meta de repetições/tempo de forma descritiva.
 * Ex: "até a falha", "10 reps", "8–10 reps", "Reps Max", "AMRAP", "45s", "30–45s".
 */
export function formatRepsTarget(set: SetTargetLike): string {
  const type = set.type || 'normal';
  if (type === 'failure' || type === 'drop') {
    return 'até a falha';
  }

  const mode = (set.repsMode || set.reps_mode || 'reps_range') as RepsMode;
  const min = set.minReps ?? set.min_reps ?? null;
  const max = set.maxReps ?? set.max_reps ?? null;

  if (mode === 'reps') {
    return min !== null ? `${min} reps` : '—';
  }
  if (mode === 'reps_range') {
    if (min !== null && max !== null) {
      return min === max ? `${min} reps` : `${min}–${max} reps`;
    }
    return min !== null ? `${min} reps` : '—';
  }
  if (mode === 'reps_max') {
    return 'Reps Max';
  }
  if (mode === 'amrap') {
    return 'AMRAP';
  }
  if (mode === 'time') {
    return min !== null ? `${min}s` : '—';
  }
  if (mode === 'time_range') {
    if (min !== null && max !== null) {
      return min === max ? `${min}s` : `${min}–${max}s`;
    }
    return min !== null ? `${min}s` : '—';
  }

  return '—';
}

/**
 * Formatação curta para a coluna Reps na Prévia.
 * Ex: "Falha", "8–10", "10", "Max", "AMRAP", "45s", "30–45s" ou "—".
 */
export function formatRepsShort(set: SetTargetLike): string {
  const type = set.type || 'normal';
  if (type === 'failure' || type === 'drop') {
    return 'Falha';
  }

  const mode = (set.repsMode || set.reps_mode || 'reps_range') as RepsMode;
  const min = set.minReps ?? set.min_reps ?? null;
  const max = set.maxReps ?? set.max_reps ?? null;

  if (mode === 'reps') {
    return min !== null ? String(min) : '—';
  }
  if (mode === 'reps_range') {
    if (min !== null && max !== null) {
      return min === max ? String(min) : `${min}–${max}`;
    }
    return min !== null ? String(min) : '—';
  }
  if (mode === 'reps_max') {
    return 'Max';
  }
  if (mode === 'amrap') {
    return 'AMRAP';
  }
  if (mode === 'time') {
    return min !== null ? `${min}s` : '—';
  }
  if (mode === 'time_range') {
    if (min !== null && max !== null) {
      return min === max ? `${min}s` : `${min}–${max}s`;
    }
    return min !== null ? `${min}s` : '—';
  }

  return '—';
}

interface SetEffortLike {
  type?: SetType | string;
  effortMode?: EffortMode | string;
  effort_mode?: EffortMode | string;
  effortValue?: number | null;
  effort_value?: number | null;
  effortValueMax?: number | null;
  effort_value_max?: number | null;
  effortRefExerciseId?: string | null;
  effort_ref_exercise_id?: string | null;
}

/**
 * Formata a meta de esforço ou referência pré-definida.
 * Retorna string vazia para tipos que não são "normal" ou quando esforço for "none".
 */
export function formatEffort(
  set: SetEffortLike,
  unit: Unit = 'kg',
  refExerciseName?: string
): string {
  const type = set.type || 'normal';
  if (type !== 'normal') return '';

  const mode = (set.effortMode || set.effort_mode || 'none') as EffortMode;
  const val = set.effortValue ?? set.effort_value ?? null;
  const valMax = set.effortValueMax ?? set.effort_value_max ?? null;

  if (mode === 'none' || val === null || val === undefined) {
    return '';
  }

  if (mode === 'rpe') {
    return `RPE ${formatDecimalBR(val)}`;
  }
  if (mode === 'rpe_range') {
    if (valMax !== null && valMax !== undefined) {
      return `${formatDecimalBR(val)}–${formatDecimalBR(valMax)} RPE`;
    }
    return `RPE ${formatDecimalBR(val)}`;
  }
  if (mode === 'rir') {
    return `${formatDecimalBR(val)} RIR`;
  }
  if (mode === 'percent_1rm') {
    return `${formatDecimalBR(val)}% de 1RM`;
  }
  if (mode === 'percent_1rm_exercise') {
    return refExerciseName
      ? `${formatDecimalBR(val)}% 1RM ${refExerciseName}`
      : `${formatDecimalBR(val)}% de 1RM`;
  }
  if (mode === 'last_week_plus') {
    return `Sem. pass. +${formatWeight(val, unit)} ${unit}`;
  }
  if (mode === 'last_session_plus') {
    return `Sessão +${formatWeight(val, unit)} ${unit}`;
  }

  return '';
}

// ============================================================================
// 4. CÁLCULOS E REGRAS DE DOMÍNIO
// ============================================================================

/**
 * Sugere carga para Drop (-20% da última série não-aquecimento com peso definido).
 * Arredonda para o incremento configurado (ex: 2.5 kg).
 */
export function suggestDropWeightKg(
  sessionSets: Array<{
    type?: SetType | string;
    isWarmup?: boolean;
    weight?: number | null;
    actual_weight_kg?: number | null;
  }>,
  incrementKg = 2.5
): number | null {
  for (let i = sessionSets.length - 1; i >= 0; i--) {
    const s = sessionSets[i];
    const isWarmup = s.type === 'warmup' || s.isWarmup === true;
    const w = s.weight ?? s.actual_weight_kg;
    if (!isWarmup && w !== null && w !== undefined && w > 0) {
      const reduced = w * 0.8;
      const rounded = Math.max(incrementKg, Math.round(reduced / incrementKg) * incrementKg);
      return Math.round(rounded * 100) / 100;
    }
  }
  return null;
}

/**
 * Calcula a carga sugerida com base na % de 1RM estimada do exercício.
 * Arredonda para o incremento configurado (ex: 2.5 kg).
 */
export function suggest1RmWeightKg(
  oneRmKg: number | null | undefined,
  percent: number | null | undefined,
  incrementKg = 2.5
): number | null {
  if (oneRmKg === null || oneRmKg === undefined || percent === null || percent === undefined) {
    return null;
  }
  if (oneRmKg <= 0 || percent <= 0) {
    return null;
  }
  const raw = (oneRmKg * percent) / 100;
  const rounded = Math.max(incrementKg, Math.round(raw / incrementKg) * incrementKg);
  return Math.round(rounded * 100) / 100;
}

/**
 * Retorna o rótulo de exibição da série:
 * 'A' (warmup), 'F' (failure), 'D' (drop) ou contagem sequencial ('1', '2', ...) ignorando aquecimento.
 */
export function getSetDisplayLabel(
  sets: Array<{ type?: SetType | string; isWarmup?: boolean }>,
  index: number
): string {
  if (!sets || index < 0 || index >= sets.length) return '';
  const set = sets[index];
  const type = (set.type || (set.isWarmup ? 'warmup' : 'normal')) as SetType;

  if (type === 'warmup') return 'A';
  if (type === 'failure') return 'F';
  if (type === 'drop') return 'D';

  let normalCount = 0;
  for (let i = 0; i <= index; i++) {
    const t = (sets[i].type || (sets[i].isWarmup ? 'warmup' : 'normal')) as SetType;
    if (t !== 'warmup') {
      normalCount++;
    }
  }
  return String(normalCount);
}

/**
 * Mantém compatibilidade com a função legada setLabels.
 */
export function setLabels(sets: Array<{ isWarmup?: boolean; type?: SetType | string }>): string[] {
  return sets.map((_, i) => getSetDisplayLabel(sets, i));
}

/**
 * Garante invariantes de uma série planejada:
 * - Se warmup, failure ou drop: força effort_mode = 'none' e limpa valores de esforço.
 * - Se failure ou drop: limpa min_reps e max_reps.
 * - Se normal: limpa valores incompatíveis com o modo selecionado.
 */
export function sanitizePlannedSet<T extends Record<string, any>>(set: T): T {
  const s: any = { ...set };
  const type = (s.type || 'normal') as SetType;

  if (type === 'warmup' || type === 'failure' || type === 'drop') {
    s.effortMode = 'none';
    if ('effort_mode' in s) (s as any).effort_mode = 'none';
    s.effortValue = null;
    if ('effort_value' in s) (s as any).effort_value = null;
    s.effortValueMax = null;
    if ('effort_value_max' in s) (s as any).effort_value_max = null;
    s.effortRefExerciseId = null;
    if ('effort_ref_exercise_id' in s) (s as any).effort_ref_exercise_id = null;
  }

  if (type === 'failure' || type === 'drop') {
    s.minReps = null;
    if ('min_reps' in s) (s as any).min_reps = null;
    s.maxReps = null;
    if ('max_reps' in s) (s as any).max_reps = null;
  }

  if (type === 'normal') {
    const effortMode = s.effortMode ?? (s as any).effort_mode ?? 'none';
    if (effortMode === 'none') {
      s.effortValue = null;
      if ('effort_value' in s) (s as any).effort_value = null;
      s.effortValueMax = null;
      if ('effort_value_max' in s) (s as any).effort_value_max = null;
      s.effortRefExerciseId = null;
      if ('effort_ref_exercise_id' in s) (s as any).effort_ref_exercise_id = null;
    } else if (effortMode !== 'rpe_range') {
      s.effortValueMax = null;
      if ('effort_value_max' in s) (s as any).effort_value_max = null;
    }
    if (effortMode !== 'percent_1rm_exercise') {
      s.effortRefExerciseId = null;
      if ('effort_ref_exercise_id' in s) (s as any).effort_ref_exercise_id = null;
    }

    const repsMode = s.repsMode ?? (s as any).reps_mode ?? 'reps_range';
    if (repsMode === 'reps_max' || repsMode === 'amrap') {
      s.minReps = null;
      if ('min_reps' in s) (s as any).min_reps = null;
      s.maxReps = null;
      if ('max_reps' in s) (s as any).max_reps = null;
    } else if (repsMode === 'reps' || repsMode === 'time') {
      s.maxReps = null;
      if ('max_reps' in s) (s as any).max_reps = null;
    }
  }

  return s;
}

// ============================================================================
// 5. REGRAS DE VOLUME E PR
// ============================================================================

/**
 * Verifica se a série conta para o volume de treino:
 * - warmup: NÃO conta
 * - drop, failure, normal: CONTAM
 */
export function isSetInVolume(set: { type?: SetType | string; isWarmup?: boolean }): boolean {
  if (set.type) {
    return set.type !== 'warmup';
  }
  return !set.isWarmup;
}

/**
 * Verifica se a série é elegível a gerar Recorde Pessoal (PR):
 * - warmup: NUNCA gera PR
 * - drop: NUNCA gera PR
 * - normal e failure: PODEM gerar PR
 */
export function canGeneratePR(set: { type?: SetType | string; isWarmup?: boolean }): boolean {
  if (set.type) {
    return set.type === 'normal' || set.type === 'failure';
  }
  return !set.isWarmup;
}

export interface SetLike {
  weight: number; // kg
  reps: number;
  isWarmup?: boolean;
  type?: SetType | string;
  completedAt?: number | null | boolean; // epoch ms
}

/**
 * Carga total: carga × reps das séries concluídas, sem aquecimento.
 * Halteres contam o par. Drop e falha entram normalmente no volume.
 */
export function calcularVolume(sets: SetLike[], equipment?: string): number {
  const factor = equipment?.trim().toLowerCase() === 'halteres' ? 2 : 1;
  return round2(
    sets
      .filter((s) => s.completedAt !== null && s.completedAt !== false && isSetInVolume(s))
      .reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0) * factor, 0),
  );
}

export interface PRResult {
  isPrWeight: boolean;
  isPrVolume: boolean;
}

/**
 * PR de carga: maior carga já feita (empate de carga vence quem tem mais reps).
 * PR de volume: maior carga × reps de uma série.
 * - Aquecimento e Drop NUNCA geram PR.
 * - Falha e Normal contam no PR.
 * - Sem histórico válido não há PR.
 */
export function detectarPR(
  history: Array<{ weight: number; reps: number; type?: SetType | string; isWarmup?: boolean }>,
  set: { weight: number; reps: number; type?: SetType | string; isWarmup?: boolean },
): PRResult {
  // Aquecimento e drop nunca geram PR
  if (!canGeneratePR(set)) {
    return { isPrWeight: false, isPrVolume: false };
  }

  const weight = Number(set.weight) || 0;
  const reps = Number(set.reps) || 0;

  if (weight <= 0 || reps <= 0) {
    return { isPrWeight: false, isPrVolume: false };
  }

  const validHistory = (history || []).filter(
    (h) => Number(h.weight) > 0 && Number(h.reps) > 0 && canGeneratePR(h)
  );

  if (validHistory.length === 0) {
    return { isPrWeight: false, isPrVolume: false };
  }

  const maxW = Math.max(...validHistory.map((h) => h.weight));
  const maxRepsAtMaxW = Math.max(
    ...validHistory.filter((h) => h.weight === maxW).map((h) => h.reps),
  );
  const maxVol = Math.max(...validHistory.map((h) => h.weight * h.reps));

  return {
    isPrWeight: weight > maxW || (Math.abs(weight - maxW) < 0.001 && reps > maxRepsAtMaxW),
    isPrVolume: weight * reps > maxVol,
  };
}

// ============================================================================
// 6. DEMAIS FUNÇÕES DE SESSÃO E TIMER
// ============================================================================

export type RowState = 'done' | 'current' | 'pending';

/** "current" é a primeira série ainda não concluída. */
export function rowStates(sets: Pick<SetLike, 'completedAt'>[]): RowState[] {
  const firstOpen = sets.findIndex(
    (s) => s.completedAt === null || s.completedAt === false
  );
  return sets.map((s, i) =>
    s.completedAt !== null && s.completedAt !== false
      ? 'done'
      : i === firstOpen
      ? 'current'
      : 'pending'
  );
}

/** "Anterior" por série: a série de mesmo índice da sessão anterior. */
export function previousForSet<T>(prevSets: T[], index: number): T | null {
  return prevSets[index] ?? null;
}

export const REST_PRESETS = [60, 90, 120, 180] as const;

/** Próximo preset; se o valor atual não for um preset, o primeiro maior que ele. */
export function cycleRest(current: number): number {
  const i = REST_PRESETS.indexOf(current as (typeof REST_PRESETS)[number]);
  if (i >= 0) return REST_PRESETS[(i + 1) % REST_PRESETS.length];
  return REST_PRESETS.find((p) => p > current) ?? REST_PRESETS[0];
}

export const adjustRest = (remainingS: number, deltaS: number): number =>
  Math.max(0, remainingS + deltaS);

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

export const formatRpe = (v: number): string => String(v).replace('.', ',');

