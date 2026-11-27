import { formatarPeso } from './weight';

export interface ExerciseItemData {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  kind: 'composto' | 'isolamento';
  defaultIncrement: number;
  defaultRestS: number;
  notes?: string | null;
  isCustom: boolean;
  archived: boolean;
  bestWeight?: number | null;
  bestReps?: number | null;
  secondaryMuscles?: string[] | string;
  defaultTargetType?: 'reps' | 'time' | string;
}

export const ORDERED_MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Braços',
  'Abdômen',
] as const;

export const FILTER_CHIPS = [
  'Todos',
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Braços',
  'Abdômen',
] as const;

export type FilterChip = (typeof FILTER_CHIPS)[number];

/**
 * Remove acentos, caracteres diacríticos e converte para minúsculas
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Formata o cabeçalho de seção de grupo muscular estritamente em sentence case.
 * Exemplo: "Peito · 2 exercícios", "Pernas · 1 exercício".
 */
export function formatGroupHeader(group: string, count: number): string {
  const noun = count === 1 ? 'exercício' : 'exercícios';
  return `${group} · ${count} ${noun}`;
}

/**
 * Formata a melhor marca (PR) em Outfit com algarismos tabulares e unidade ativa.
 * Retorna null se o exercício nunca tiver sido treinado com séries válidas.
 */
export function formatExercisePR(
  bestWeight: number | null | undefined,
  bestReps: number | null | undefined,
  unit: 'kg' | 'lb'
): string | null {
  if (bestWeight == null || bestReps == null || bestReps <= 0) {
    return null;
  }
  return `${formatarPeso(bestWeight, unit)} × ${bestReps}`;
}

export interface ExerciseSection {
  group: string;
  data: ExerciseItemData[];
}

/**
 * Filtra e agrupa exercícios respeitando a ordem oficial dos chips e ordenação alfabética dos nomes.
 * Combina busca (sem acentos / caixa alta) e chip por lógica E.
 * Exercícios arquivados são desconsiderados.
 */
export function filterAndGroupExercises(
  exercises: ExerciseItemData[],
  selectedGroup: string,
  searchQuery: string
): ExerciseSection[] {
  const q = normalizeSearchText(searchQuery);

  // Filtra exercícios
  const filtered = exercises.filter((ex) => {
    if (ex.archived) return false;

    // Filtro por chip
    if (selectedGroup !== 'Todos' && ex.muscleGroup !== selectedGroup) {
      return false;
    }

    // Filtro por texto de busca (nome ou grupo muscular)
    if (q.length > 0) {
      const nameNorm = normalizeSearchText(ex.name);
      const muscleNorm = normalizeSearchText(ex.muscleGroup);
      if (!nameNorm.includes(q) && !muscleNorm.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Agrupa na ordem exata dos chips
  const sections: ExerciseSection[] = [];

  for (const group of ORDERED_MUSCLE_GROUPS) {
    const itemsInGroup = filtered.filter((ex) => ex.muscleGroup === group);
    if (itemsInGroup.length > 0) {
      itemsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      sections.push({
        group,
        data: itemsInGroup,
      });
    }
  }

  // Grupos adicionais / customizados que não estejam na lista padrão
  const customGroups = Array.from(
    new Set(
      filtered
        .map((e) => e.muscleGroup)
        .filter((g) => !ORDERED_MUSCLE_GROUPS.includes(g as any))
    )
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  for (const group of customGroups) {
    const itemsInGroup = filtered.filter((ex) => ex.muscleGroup === group);
    if (itemsInGroup.length > 0) {
      itemsInGroup.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      sections.push({
        group,
        data: itemsInGroup,
      });
    }
  }

  return sections;
}

/**
 * Retorna o título da tela de estado vazio conforme a biblioteca ter ou não itens.
 */
export function getEmptyStateTitle(isLibraryEmpty: boolean): string {
  if (isLibraryEmpty) {
    return 'Sua biblioteca está vazia';
  }
  return 'Nenhum exercício encontrado';
}

/**
 * Retorna a mensagem descritiva do estado vazio.
 * Formato especificado: Não encontramos "<termo>" na sua biblioteca.
 */
export function getEmptyStateDescription(
  isLibraryEmpty: boolean,
  searchQuery: string,
  selectedGroup: string
): string {
  if (isLibraryEmpty) {
    return 'Cadastre seu primeiro exercício para começar a montar seus treinos.';
  }
  const q = searchQuery.trim();
  if (q.length > 0) {
    return `Não encontramos "${q}" na sua biblioteca.`;
  }
  if (selectedGroup !== 'Todos') {
    return `Não encontramos exercícios para o grupo "${selectedGroup}" na sua biblioteca.`;
  }
  return 'Não encontramos resultados para os filtros selecionados na sua biblioteca.';
}

/**
 * Verifica se já existe um exercício ativo com o mesmo nome no mesmo grupo muscular,
 * ignorando acentos e maiúsculas/minúsculas.
 */
export function isExerciseNameDuplicate(
  name: string,
  muscleGroup: string,
  existingExercises: { name: string; muscleGroup: string; archived?: boolean }[]
): boolean {
  const normName = normalizeSearchText(name);
  if (!normName || !muscleGroup) return false;

  return existingExercises.some((ex) => {
    if (ex.archived) return false;
    return (
      ex.muscleGroup.trim().toLowerCase() === muscleGroup.trim().toLowerCase() &&
      normalizeSearchText(ex.name) === normName
    );
  });
}

/**
 * Deriva a região corporal a partir do grupo muscular:
 * Peito, Costas, Ombros, Braços -> "Membros superiores"
 * Pernas -> "Membros inferiores"
 * Abdômen -> "Core e abdômen"
 */
export function deriveBodyRegion(muscleGroup: string): string {
  const norm = normalizeSearchText(muscleGroup);
  if (
    norm.includes('peito') ||
    norm.includes('costas') ||
    norm.includes('ombro') ||
    norm.includes('braco') ||
    norm.includes('triceps') ||
    norm.includes('biceps')
  ) {
    return 'Membros superiores';
  }
  if (
    norm.includes('perna') ||
    norm.includes('quadriceps') ||
    norm.includes('posterior') ||
    norm.includes('gluteo') ||
    norm.includes('panturrilha')
  ) {
    return 'Membros inferiores';
  }
  if (norm.includes('abdomen') || norm.includes('core') || norm.includes('lombar')) {
    return 'Core e abdômen';
  }
  return 'Geral';
}

export interface ExecutionTip {
  title: string;
  text: string;
}

/**
 * Converte as notas do exercício em até 3 cartões de dicas de execução.
 * Se notes for vazio ou nulo, retorna array vazio para ocultar a seção.
 */
export function parseExecutionTips(notes?: string | null): ExecutionTip[] {
  if (!notes || !notes.trim()) return [];

  const raw = notes.trim();
  // Divide por quebras de linha ou frases terminadas em ponto/ponto-e-vírgula
  const sentences = raw
    .split(/(?<=[.;\n])\s+/)
    .map((s) => s.trim().replace(/^[•\-\*]\s*/, ''))
    .filter((s) => s.length > 3);

  if (sentences.length === 0) {
    return [{ title: 'Instrução técnica', text: raw }];
  }

  const defaultTitles = [
    'Postura e alinhamento',
    'Trajetória e controle',
    'Amplitude completa',
  ];

  return sentences.slice(0, 3).map((sent, idx) => {
    // Se a frase contiver dois pontos (ex: "Banco a 30°: Inclinação ideal"), usa a primeira parte como título
    if (sent.includes(':')) {
      const parts = sent.split(':');
      return {
        title: parts[0].trim(),
        text: parts.slice(1).join(':').trim(),
      };
    }
    return {
      title: defaultTitles[idx] || 'Dica técnica',
      text: sent,
    };
  });
}

export interface EvolutionPoint {
  date: number; // timestamp ms
  weight: number; // peso em kg
}

export interface EvolutionStats {
  points: EvolutionPoint[];
  cycleChangePercent: number;
  peakWeight: number;
}

/**
 * Filtra pontos de evolução por período (4 semanas, 3 meses ou tudo)
 * e calcula a variação percentual no ciclo e o pico de carga.
 */
export function filterEvolutionByPeriod(
  allPoints: EvolutionPoint[],
  period: '4 sem' | '3 meses' | 'tudo',
  now: number = Date.now()
): EvolutionStats {
  if (!allPoints || allPoints.length === 0) {
    return { points: [], cycleChangePercent: 0, peakWeight: 0 };
  }

  let minDate = 0;
  if (period === '4 sem') {
    minDate = now - 28 * 24 * 60 * 60 * 1000;
  } else if (period === '3 meses') {
    minDate = now - 90 * 24 * 60 * 60 * 1000;
  }

  const filtered = minDate > 0
    ? allPoints.filter((p) => p.date >= minDate)
    : allPoints;

  // Se o filtro deixou vazio mas há pontos anteriores, mostra os pontos disponíveis
  const effectivePoints = filtered.length > 0 ? filtered : allPoints.slice(-4);

  const peakWeight = Math.max(...effectivePoints.map((p) => p.weight));

  let cycleChangePercent = 0;
  if (effectivePoints.length >= 2) {
    const first = effectivePoints[0].weight;
    const last = effectivePoints[effectivePoints.length - 1].weight;
    if (first > 0) {
      cycleChangePercent = ((last - first) / first) * 100;
    }
  }

  return {
    points: effectivePoints,
    cycleChangePercent,
    peakWeight,
  };
}

const SHORT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const LONG_MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

/**
 * Formata data no estilo "24 de out"
 */
export function formatPtBrDateMedium(timestamp: number | null): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()] || '';
  return `${day} de ${month}`;
}

/**
 * Formata data no estilo "24 de outubro"
 */
export function formatPtBrDateLong(timestamp: number | null): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = LONG_MONTHS[d.getMonth()] || '';
  return `${day} de ${month}`;
}

/**
 * Formata data curta no estilo "24 Out" (para eixos de gráficos)
 */
export function formatPtBrDateDayMonth(timestamp: number | null): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS[d.getMonth()] || '';
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  return `${day} ${monthCap}`;
}



