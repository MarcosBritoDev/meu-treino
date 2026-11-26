export type Unit = 'kg' | 'lb';

const KG_TO_LB = 2.20462262185;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** O banco guarda SEMPRE kg. Converta só na exibição e na digitação. */
export const kgToDisplay = (kg: number, unit: Unit): number =>
  unit === 'kg' ? kg : kg * KG_TO_LB;

export const displayToKg = (value: number, unit: Unit): number =>
  round2(unit === 'kg' ? value : value / KG_TO_LB);

/** "62,5" (pt-BR). kg com até 2 casas; lb com até 1. */
export function formatWeight(kg: number, unit: Unit): string {
  const v = unit === 'kg' ? round2(kg) : round1(kgToDisplay(kg, unit));
  return String(v).replace('.', ',');
}

/** Aceita "62,5" ou "62.5". Retorna null se inválido ou negativo. */
export function parseNumber(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface SetLike {
  weight: number; // kg
  reps: number;
  isWarmup: boolean;
  completedAt: number | null; // epoch ms
}

/** Rótulo da série: "A" para aquecimento; as demais numeram sem contar aquecimentos. */
export function setLabels(sets: Pick<SetLike, 'isWarmup'>[]): string[] {
  let n = 0;
  return sets.map((s) => (s.isWarmup ? 'A' : String(++n)));
}

export type RowState = 'done' | 'current' | 'pending';

/** "current" é a primeira série ainda não concluída. */
export function rowStates(sets: Pick<SetLike, 'completedAt'>[]): RowState[] {
  const firstOpen = sets.findIndex((s) => s.completedAt === null);
  return sets.map((s, i) =>
    s.completedAt !== null ? 'done' : i === firstOpen ? 'current' : 'pending',
  );
}

/** Carga total: carga × reps das séries concluídas, sem aquecimento. Halteres contam o par. */
export function calcularVolume(sets: SetLike[], equipment?: string): number {
  const factor = equipment?.trim().toLowerCase() === 'halteres' ? 2 : 1;
  return round2(
    sets
      .filter((s) => s.completedAt !== null && !s.isWarmup)
      .reduce((sum, s) => sum + s.weight * s.reps * factor, 0),
  );
}

export interface PRResult {
  isPrWeight: boolean;
  isPrVolume: boolean;
}

/**
 * PR de carga: maior carga já feita (empate de carga vence quem tem mais reps).
 * PR de volume: maior carga × reps de uma série.
 * Sem histórico não há PR (primeira vez que faz o exercício).
 * `history` deve conter só séries concluídas e que não são aquecimento.
 */
export function detectarPR(
  history: { weight: number; reps: number }[],
  set: { weight: number; reps: number },
): PRResult {
  if (history.length === 0) return { isPrWeight: false, isPrVolume: false };

  const maxW = Math.max(...history.map((h) => h.weight));
  const maxRepsAtMaxW = Math.max(
    ...history.filter((h) => h.weight === maxW).map((h) => h.reps),
  );
  const maxVol = Math.max(...history.map((h) => h.weight * h.reps));

  return {
    isPrWeight: set.weight > maxW || (set.weight === maxW && set.reps > maxRepsAtMaxW),
    isPrVolume: set.weight * set.reps > maxVol,
  };
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

export const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;
export const formatRpe = (v: number): string => String(v).replace('.', ',');
