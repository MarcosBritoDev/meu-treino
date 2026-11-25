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

