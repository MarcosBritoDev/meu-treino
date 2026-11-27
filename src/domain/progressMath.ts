import { normalizeMuscleName, parseSecondaryMuscles, sanitizeSecondaryMuscles } from './exerciseCatalog';

/**
 * Interface de entrada para apuração de séries por grupo muscular.
 * Suporta tanto as propriedades em camelCase quanto snake_case do SQLite.
 */
export interface MuscleDistributionInputSet {
  completedAt?: number | null | boolean;
  completed_at?: number | null;
  type?: string | null;
  isWarmup?: boolean | null;
  is_warmup?: boolean | number | null;
  muscleGroup?: string | null;
  muscle_group?: string | null;
  secondaryMuscles?: string[] | string | null;
  secondary_muscles?: string[] | string | null;
}

/**
 * Item resultante da distribuição de séries por músculo.
 */
export interface MuscleDistributionItem {
  muscle: string;
  sets: number;
  primarySets: number;
  secondarySets: number;
}

/**
 * Calcula o 1RM estimado pela fórmula clássica de Epley:
 * 1RM = Carga × (1 + Reps / 30)
 *
 * Regras:
 * - Se weightKg <= 0 ou reps <= 0 (ou nulos/NaN), retorna 0.
 * - Se reps === 1, retorna weightKg arredondado a 1 casa decimal.
 * - Para reps > 1, calcula weightKg * (1 + reps / 30) arredondado a 1 casa decimal.
 *
 * @param weightKg Carga em kg
 * @param reps Número de repetições realizadas
 * @returns 1RM estimado em kg com 1 casa decimal
 */
export function calcEpley1RM(
  weightKg: number | null | undefined,
  reps: number | null | undefined
): number {
  if (weightKg == null || reps == null) return 0;
  const w = Number(weightKg);
  const r = Number(reps);
  if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return 0;

  if (r === 1) {
    return Math.round(w * 10) / 10;
  }

  const raw1RM = w * (1 + r / 30);
  return Math.round(raw1RM * 10) / 10;
}

/**
 * Verifica se uma série é elegível para cálculo de 1RM estimado.
 * Regra: ignora séries 'warmup' e 'drop' (aceita apenas 'normal' e 'failure' concluídas).
 */
export function isSetEligibleForE1RM(set: {
  completedAt?: number | null | boolean;
  completed_at?: number | null;
  type?: string | null;
  isWarmup?: boolean | null;
  is_warmup?: boolean | number | null;
  weight?: number | null;
  reps?: number | null;
}): boolean {
  if (!set) return false;

  // Série deve estar concluída
  const completed =
    (set.completedAt !== null &&
      set.completedAt !== undefined &&
      set.completedAt !== false) ||
    (set.completed_at !== null && set.completed_at !== undefined);
  if (!completed) return false;

  // Ignora aquecimento
  if (set.isWarmup || set.is_warmup === 1 || set.is_warmup === true) {
    return false;
  }

  const type = (set.type || 'normal').trim().toLowerCase();
  if (type === 'warmup' || type === 'drop') {
    return false;
  }

  const w = Number(set.weight) || 0;
  const r = Number(set.reps) || 0;
  return w > 0 && r >= 1;
}

/**
 * Calcula a variação percentual entre dois volumes:
 * Δ% = Math.round(((currentVol - previousVol) / previousVol) * 100)
 *
 * Regras:
 * - Se previousVol <= 0 (ou nulo/NaN), retorna null (nunca Infinity ou NaN).
 * - Caso contrário, retorna a porcentagem arredondada para número inteiro.
 */
export function calcVolumeDeltaPercent(
  currentVol: number | null | undefined,
  previousVol: number | null | undefined
): number | null {
  if (previousVol == null) return null;
  const prev = Number(previousVol);
  if (isNaN(prev) || prev <= 0) return null;

  const cur = currentVol == null ? 0 : Number(currentVol);
  if (isNaN(cur)) return null;

  const delta = ((cur - prev) / prev) * 100;
  return Math.round(delta);
}

/**
 * Calcula a distribuição de séries por músculo.
 *
 * Regras:
 * - Considera apenas séries concluídas (completed_at != null).
 * - Ignora aquecimento (type !== 'warmup' e !isWarmup). Séries 'normal', 'failure' e 'drop' entram.
 * - Soma +1.0 série para o músculo principal (muscle_group).
 * - Soma +0.5 série para cada músculo secundário seguro (secondary_muscles).
 * - Retorna array ordenado do maior para o menor número de séries.
 */
export function calcMuscleSetsDistribution(
  setsWithExercise: MuscleDistributionInputSet[]
): MuscleDistributionItem[] {
  if (!setsWithExercise || !Array.isArray(setsWithExercise)) {
    return [];
  }

  // Mapa de agrupamento: muscle -> { sets, primarySets, secondarySets }
  const muscleMap = new Map<
    string,
    { sets: number; primarySets: number; secondarySets: number }
  >();

  for (const set of setsWithExercise) {
    // 1. Checa se está concluída
    const isCompleted =
      (set.completedAt !== null && set.completedAt !== undefined && set.completedAt !== false) ||
      (set.completed_at !== null && set.completed_at !== undefined);
    if (!isCompleted) continue;

    // 2. Checa se é aquecimento
    const isWarmup =
      set.isWarmup === true ||
      set.is_warmup === 1 ||
      set.is_warmup === true ||
      (set.type && set.type.trim().toLowerCase() === 'warmup');
    if (isWarmup) continue;

    // 3. Músculo principal (+1.0 série)
    const rawPrimary = set.muscleGroup || set.muscle_group;
    if (!rawPrimary || typeof rawPrimary !== 'string' || !rawPrimary.trim()) {
      continue;
    }
    const primaryNorm = normalizeMuscleName(rawPrimary);

    const primaryEntry = muscleMap.get(primaryNorm) || {
      sets: 0,
      primarySets: 0,
      secondarySets: 0,
    };
    primaryEntry.sets += 1.0;
    primaryEntry.primarySets += 1.0;
    muscleMap.set(primaryNorm, primaryEntry);

    // 4. Músculos secundários (+0.5 série cada)
    const rawSecondary = set.secondaryMuscles ?? set.secondary_muscles;
    const rawParsed = parseSecondaryMuscles(rawSecondary);
    const sanitizedSecs = sanitizeSecondaryMuscles(primaryNorm, rawParsed);

    for (const sec of sanitizedSecs) {
      const secNorm = normalizeMuscleName(sec);
      // Garante que não é o mesmo que o principal
      if (secNorm === primaryNorm) continue;

      const secEntry = muscleMap.get(secNorm) || {
        sets: 0,
        primarySets: 0,
        secondarySets: 0,
      };
      secEntry.sets += 0.5;
      secEntry.secondarySets += 0.5;
      muscleMap.set(secNorm, secEntry);
    }
  }

  // Converter para array e ordenar do maior para o menor total de séries
  const result: MuscleDistributionItem[] = Array.from(muscleMap.entries()).map(
    ([muscle, data]) => ({
      muscle,
      sets: Math.round(data.sets * 10) / 10,
      primarySets: Math.round(data.primarySets * 10) / 10,
      secondarySets: Math.round(data.secondarySets * 10) / 10,
    })
  );

  result.sort((a, b) => {
    if (b.sets !== a.sets) {
      return b.sets - a.sets;
    }
    if (b.primarySets !== a.primarySets) {
      return b.primarySets - a.primarySets;
    }
    return a.muscle.localeCompare(b.muscle, 'pt-BR');
  });

  return result;
}

/**
 * Retorna os limites timestamp [start, end] de uma semana (Segunda a Domingo)
 * com deslocamento de semanas em relação a uma data base.
 * weekOffset = 0: semana atual
 * weekOffset = -1: semana anterior
 */
function getWeekRange(
  referenceDate: Date,
  weekOffset: number = 0
): { start: number; end: number } {
  const current = new Date(referenceDate);
  const currentDayOfWeek = current.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
  // Segunda-feira é o dia 1. Se Domingo (0), distância é -6.
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + distanceToMonday + weekOffset * 7,
    0,
    0,
    0,
    0
  );
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
    23,
    59,
    59,
    999
  );

  return { start: monday.getTime(), end: sunday.getTime() };
}

/**
 * Calcula quantas semanas consecutivas (Segunda a Domingo) o usuário atingiu
 * pelo menos targetDaysPerWeek treinos concluídos.
 *
 * Regras:
 * - Se targetDaysPerWeek <= 0 ou nulo, adota padrão 3.
 * - Semana atual em andamento:
 *   - Se a semana atual ainda NÃO bateu a meta, NÃO zera o streak prematuramente.
 *     Conta a sequência a partir da última semana fechada (semana -1).
 *   - Se a semana atual JÁ bateu a meta, inclui a semana atual na contagem.
 * - Conta consecutivamente semanas anteriores até encontrar uma semana abaixo da meta.
 *
 * @param completedSessionDates Lista de timestamps ou objetos Date de sessões concluídas
 * @param targetDaysPerWeek Meta de treinos por semana (padrão frequency_days ou 3)
 * @param now Data de referência (padrão new Date())
 * @returns Número de semanas consecutivas na meta
 */
export function calcWeeklyStreak(
  completedSessionDates: (number | Date | string | null | undefined)[],
  targetDaysPerWeek: number = 3,
  now: Date = new Date()
): number {
  const target =
    typeof targetDaysPerWeek === 'number' && targetDaysPerWeek > 0
      ? Math.floor(targetDaysPerWeek)
      : 3;

  if (!completedSessionDates || completedSessionDates.length === 0) {
    return 0;
  }

  // Normaliza timestamps válidos
  const timestamps: number[] = [];
  for (const item of completedSessionDates) {
    if (item == null) continue;
    let t: number;
    if (item instanceof Date) {
      t = item.getTime();
    } else if (typeof item === 'number') {
      t = item;
    } else {
      t = new Date(item).getTime();
    }
    if (!isNaN(t) && t > 0) {
      timestamps.push(t);
    }
  }

  if (timestamps.length === 0) {
    return 0;
  }

  // Helper para contar treinos dentro de uma janela de tempo
  const countInWeek = (range: { start: number; end: number }) => {
    let count = 0;
    for (const t of timestamps) {
      if (t >= range.start && t <= range.end) {
        count++;
      }
    }
    return count;
  };

  // Semana 0 (atual)
  const currentWeekRange = getWeekRange(now, 0);
  const currentWeekCount = countInWeek(currentWeekRange);

  let streak = 0;
  let startOffset = -1;

  if (currentWeekCount >= target) {
    // Semana atual já bateu a meta: inclui na contagem
    streak = 1;
    startOffset = -1;
  } else {
    // Semana atual ainda não bateu a meta: avalia a partir da semana fechada anterior (-1)
    const prevWeekRange = getWeekRange(now, -1);
    const prevWeekCount = countInWeek(prevWeekRange);
    if (prevWeekCount < target) {
      return 0;
    }
    streak = 1;
    startOffset = -2;
  }

  // Avalia semanas anteriores consecutivas (até 520 semanas = ~10 anos)
  for (let offset = startOffset; offset >= -520; offset--) {
    const range = getWeekRange(now, offset);
    const count = countInWeek(range);
    if (count >= target) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Formata quantidade de séries para exibição (ex.: "14 séries", "9,5 séries", "1 série")
 */
export function formatMuscleSeriesCount(sets: number): string {
  if (sets <= 0) return '0 séries';
  const numStr = sets % 1 === 0 ? String(sets) : sets.toFixed(1).replace('.', ',');
  return `${numStr} ${sets === 1 ? 'série' : 'séries'}`;
}
