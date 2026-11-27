/**
 * Catálogo central de exercícios, equipamentos e grupos musculares — Volt Precision
 *
 * Suporta 10 equipamentos, 20 músculos agrupados em 4 regiões anatômicas,
 * múltiplos músculos secundários e tipo de meta padrão ('reps' ou 'time').
 */

export const EQUIPMENTS = [
  'Barra',
  'Halteres',
  'Máquina',
  'Cabo / Polia',
  'Peso corporal',
  'Smith',
  'Kettlebell',
  'Barra de segurança',
  'Cardio',
  'Outro',
] as const;

export type Equipment = (typeof EQUIPMENTS)[number] | 'Cabo'; // 'Cabo' para compatibilidade legada

export type MuscleRegion =
  | 'Superiores — Empurrar'
  | 'Superiores — Puxar'
  | 'Inferiores'
  | 'Core e gerais';

export const MUSCLE_REGIONS = {
  'Superiores — Empurrar': [
    'Peito',
    'Ombro anterior',
    'Ombro lateral',
    'Ombro posterior',
    'Tríceps',
  ],
  'Superiores — Puxar': [
    'Dorsais',
    'Costas superiores',
    'Lombar',
    'Pescoço / Trapézio',
    'Bíceps',
    'Antebraço',
  ],
  'Inferiores': [
    'Quadríceps',
    'Posterior de coxa',
    'Glúteos',
    'Panturrilha',
    'Adutores',
    'Abdutores',
  ],
  'Core e gerais': [
    'Abdômen',
    'Corpo inteiro',
    'Outro',
  ],
} as const satisfies Record<MuscleRegion, readonly string[]>;

export const ALL_MUSCLES = [
  ...MUSCLE_REGIONS['Superiores — Empurrar'],
  ...MUSCLE_REGIONS['Superiores — Puxar'],
  ...MUSCLE_REGIONS['Inferiores'],
  ...MUSCLE_REGIONS['Core e gerais'],
] as const;

export type Muscle = (typeof ALL_MUSCLES)[number];

export type DefaultTargetType = 'reps' | 'time';

/**
 * Mapeamento de retrocompatibilidade para grupos musculares e equipamentos legados
 */
const LEGACY_MUSCLE_MAP: Record<string, Muscle> = {
  'peito': 'Peito',
  'costas': 'Dorsais',
  'pernas': 'Quadríceps',
  'ombros': 'Ombro anterior',
  'bracos': 'Bíceps',
  'braços': 'Bíceps',
  'abdomen': 'Abdômen',
  'abdômen': 'Abdômen',
};

const LEGACY_EQUIPMENT_MAP: Record<string, Equipment> = {
  'cabo': 'Cabo / Polia',
  'polia': 'Cabo / Polia',
  'cabo / polia': 'Cabo / Polia',
  'barra': 'Barra',
  'halteres': 'Halteres',
  'halter': 'Halteres',
  'maquina': 'Máquina',
  'máquina': 'Máquina',
  'peso corporal': 'Peso corporal',
  'smith': 'Smith',
  'kettlebell': 'Kettlebell',
  'barra de seguranca': 'Barra de segurança',
  'barra de segurança': 'Barra de segurança',
  'cardio': 'Cardio',
  'outro': 'Outro',
};

/**
 * Normaliza o nome do músculo, mapeando registros antigos para o catálogo de 20 músculos.
 */
export function normalizeMuscleName(rawMuscle?: string | null): Muscle {
  if (!rawMuscle || typeof rawMuscle !== 'string') return 'Outro';
  const trimmed = rawMuscle.trim();
  const lower = trimmed.toLowerCase();

  const exactMatch = ALL_MUSCLES.find((m) => m.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  if (LEGACY_MUSCLE_MAP[lower]) {
    return LEGACY_MUSCLE_MAP[lower];
  }

  return 'Outro';
}

/**
 * Normaliza o equipamento, mapeando registros antigos ('Cabo' -> 'Cabo / Polia').
 */
export function normalizeEquipmentName(rawEquipment?: string | null): Equipment {
  if (!rawEquipment || typeof rawEquipment !== 'string') return 'Outro';
  const trimmed = rawEquipment.trim();
  const lower = trimmed.toLowerCase();

  const exactMatch = EQUIPMENTS.find((e) => e.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  if (LEGACY_EQUIPMENT_MAP[lower]) {
    return LEGACY_EQUIPMENT_MAP[lower];
  }

  return 'Outro';
}

/**
 * Verifica se o equipamento é halteres (utilizado na regra Halteres = 2x no volume).
 */
export function isDumbbellEquipment(equipment?: string | null): boolean {
  if (!equipment) return false;
  const lower = equipment.trim().toLowerCase();
  return lower === 'halteres' || lower === 'halter';
}

/**
 * Obtém a região anatômica de um músculo.
 */
export function getMuscleRegion(muscle: string): MuscleRegion {
  const norm = normalizeMuscleName(muscle);
  for (const [region, muscles] of Object.entries(MUSCLE_REGIONS)) {
    if ((muscles as readonly string[]).includes(norm)) {
      return region as MuscleRegion;
    }
  }
  return 'Core e gerais';
}

/**
 * Sanitiza músculos secundários:
 * - Remove duplicatas preservando a primeira ocorrência
 * - Remove valores vazios
 * - NUNCA permite o músculo principal dentro dos secundários
 */
export function sanitizeSecondaryMuscles(
  primary: string,
  secondaries: string[] | null | undefined
): string[] {
  if (!Array.isArray(secondaries)) return [];
  const primaryTrimmed = (primary || '').trim().toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of secondaries) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    // Não permite o músculo principal entre os secundários
    if (lower === primaryTrimmed) continue;

    // Remove duplicatas
    if (seen.has(lower)) continue;

    seen.add(lower);
    result.push(trimmed);
  }

  return result;
}

/**
 * Filtra exercícios pelo músculo especificado:
 * Quando muscleFilter está ativo, separa exercícios onde o músculo é principal
 * primeiro ({ primary }) e onde entra como secundário abaixo ({ secondary }).
 */
export function filterExercisesByMuscle<
  T extends { muscleGroup: string; secondaryMuscles?: string[] | string | null }
>(
  exercises: T[],
  muscleFilter?: string | null
): { primary: T[]; secondary: T[] } {
  if (!muscleFilter || muscleFilter.trim() === '' || muscleFilter === 'Todos') {
    return { primary: [...exercises], secondary: [] };
  }

  const filterNorm = muscleFilter.trim().toLowerCase();
  const primary: T[] = [];
  const secondary: T[] = [];

  for (const ex of exercises) {
    const pNorm = (ex.muscleGroup || '').trim().toLowerCase();

    if (pNorm === filterNorm) {
      primary.push(ex);
    } else {
      const secList = parseSecondaryMuscles(ex.secondaryMuscles);
      const hasSecondary = secList.some(
        (sec) => typeof sec === 'string' && sec.trim().toLowerCase() === filterNorm
      );

      if (hasSecondary) {
        secondary.push(ex);
      }
    }
  }

  return { primary, secondary };
}

/**
 * Converte com segurança uma entrada arbitrária (string JSON, array ou delimitada) em string[]
 */
export function parseSecondaryMuscles(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]') return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0
        );
      }
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return [];
      }
    } catch {
      // Se era para ser JSON (começa com '{' ou '['), é JSON corrompido: retorna []
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return [];
      }

      // Se não for JSON, tenta vírgulas
      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [trimmed];
    }
  }

  return [];
}

/**
 * Serializa de forma segura uma lista de músculos secundários para string JSON array.
 */
export function serializeSecondaryMuscles(muscles: unknown): string {
  if (!muscles) return '[]';

  if (Array.isArray(muscles)) {
    const cleanList = muscles
      .filter((m): m is string => typeof m === 'string')
      .map((m) => m.trim())
      .filter(Boolean);
    return JSON.stringify(cleanList);
  }

  if (typeof muscles === 'string') {
    const trimmed = muscles.trim();
    if (!trimmed || trimmed === '[]') return '[]';
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return JSON.stringify(
          parsed
            .filter((m): m is string => typeof m === 'string')
            .map((m) => m.trim())
            .filter(Boolean)
        );
      }
    } catch {
      if (trimmed.includes(',')) {
        const list = trimmed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return JSON.stringify(list);
      }
      return JSON.stringify([trimmed]);
    }
  }

  return '[]';
}
