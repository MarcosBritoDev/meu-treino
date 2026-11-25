import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  formatGroupHeader,
  formatExercisePR,
  filterAndGroupExercises,
  ORDERED_MUSCLE_GROUPS,
  FILTER_CHIPS,
  ExerciseItemData,
  getEmptyStateTitle,
  getEmptyStateDescription,
} from '../../domain/search';
import { seedExercises } from '../../db/seed';

describe('Biblioteca de Exercícios — Tela 2.1 (Volt Precision)', () => {
  const mockExercises: ExerciseItemData[] = [
    {
      id: 'ex_1',
      name: 'Supino reto com barra',
      muscleGroup: 'Peito',
      equipment: 'Barra',
      kind: 'composto',
      defaultIncrement: 2.5,
      defaultRestS: 120,
      isCustom: false,
      archived: false,
      bestWeight: 100,
      bestReps: 8,
    },
    {
      id: 'ex_2',
      name: 'Supino inclinado com halteres',
      muscleGroup: 'Peito',
      equipment: 'Halteres',
      kind: 'composto',
      defaultIncrement: 2.0,
      defaultRestS: 90,
      isCustom: false,
      archived: false,
      bestWeight: 34,
      bestReps: 8,
    },
    {
      id: 'ex_3',
      name: 'Crucifixo reto',
      muscleGroup: 'Peito',
      equipment: 'Halteres',
      kind: 'isolamento',
      defaultIncrement: 2.0,
      defaultRestS: 60,
      isCustom: false,
      archived: false,
      bestWeight: null,
      bestReps: null,
    },
    {
      id: 'ex_4',
      name: 'Remada curvada',
      muscleGroup: 'Costas',
      equipment: 'Barra',
      kind: 'composto',
      defaultIncrement: 2.5,
      defaultRestS: 120,
      isCustom: false,
      archived: false,
      bestWeight: 85,
      bestReps: 6,
    },
    {
      id: 'ex_5',
      name: 'Puxada alta no pulley',
      muscleGroup: 'Costas',
      equipment: 'Cabo',
      kind: 'composto',
      defaultIncrement: 5.0,
      defaultRestS: 90,
      isCustom: false,
      archived: false,
      bestWeight: 75,
      bestReps: 10,
    },
    {
      id: 'ex_6',
      name: 'Agachamento livre',
      muscleGroup: 'Pernas',
      equipment: 'Barra',
      kind: 'composto',
      defaultIncrement: 5.0,
      defaultRestS: 180,
      isCustom: false,
      archived: false,
      bestWeight: 140,
      bestReps: 5,
    },
    {
      id: 'ex_7',
      name: 'Elevação lateral',
      muscleGroup: 'Ombros',
      equipment: 'Halteres',
      kind: 'isolamento',
      defaultIncrement: 1.0,
      defaultRestS: 60,
      isCustom: false,
      archived: false,
      bestWeight: 16,
      bestReps: 12,
    },
    {
      id: 'ex_8',
      name: 'Tríceps corda',
      muscleGroup: 'Braços',
      equipment: 'Cabo',
      kind: 'isolamento',
      defaultIncrement: 2.5,
      defaultRestS: 60,
      isCustom: false,
      archived: false,
      bestWeight: 35,
      bestReps: 12,
    },
    {
      id: 'ex_9',
      name: 'Abdominal infra',
      muscleGroup: 'Abdômen',
      equipment: 'Peso corporal',
      kind: 'isolamento',
      defaultIncrement: 0,
      defaultRestS: 45,
      isCustom: false,
      archived: false,
      bestWeight: null,
      bestReps: null,
    },
    {
      id: 'ex_archived',
      name: 'Supino declinado antigo',
      muscleGroup: 'Peito',
      equipment: 'Barra',
      kind: 'composto',
      defaultIncrement: 2.5,
      defaultRestS: 90,
      isCustom: false,
      archived: true, // Arquivado não pode aparecer
      bestWeight: 80,
      bestReps: 10,
    },
  ];

  describe('Busca normalizada (acentos e caixa)', () => {
    it('ignora acentos e caixa alta na consulta', () => {
      expect(normalizeSearchText('SUPINO')).toBe('supino');
      expect(normalizeSearchText('Elevação')).toBe('elevacao');
      expect(normalizeSearchText('Braços')).toBe('bracos');
      expect(normalizeSearchText('Abdômen')).toBe('abdomen');
      expect(normalizeSearchText('  Crucifixo  ')).toBe('crucifixo');
    });

    it('encontra exercícios por busca sem acentos', () => {
      const results = filterAndGroupExercises(mockExercises, 'Todos', 'elevacao');
      expect(results.length).toBe(1);
      expect(results[0].group).toBe('Ombros');
      expect(results[0].data[0].name).toBe('Elevação lateral');
    });

    it('encontra exercícios pelo nome do grupo muscular', () => {
      const results = filterAndGroupExercises(mockExercises, 'Todos', 'bracos');
      expect(results.length).toBe(1);
      expect(results[0].group).toBe('Braços');
      expect(results[0].data[0].name).toBe('Tríceps corda');
    });
  });

  describe('Combinação E (Chip + Busca)', () => {
    it('buscar "supino" filtrando "Peito" retorna 2 exercícios', () => {
      const results = filterAndGroupExercises(mockExercises, 'Peito', 'supino');
      expect(results.length).toBe(1);
      expect(results[0].group).toBe('Peito');
      expect(results[0].data.length).toBe(2);
      expect(results[0].data.map((e) => e.name)).toEqual([
        'Supino inclinado com halteres',
        'Supino reto com barra',
      ]);
    });

    it('buscar "remada" filtrando "Peito" retorna lista vazia', () => {
      const results = filterAndGroupExercises(mockExercises, 'Peito', 'remada');
      expect(results.length).toBe(0);
    });

    it('buscar "remada" com "Todos" retorna 1 exercício em Costas', () => {
      const results = filterAndGroupExercises(mockExercises, 'Todos', 'remada');
      expect(results.length).toBe(1);
      expect(results[0].group).toBe('Costas');
      expect(results[0].data[0].name).toBe('Remada curvada');
    });
  });

  describe('Ordenação e Agrupamento', () => {
    it('ordem dos grupos deve seguir rigorosamente ORDERED_MUSCLE_GROUPS', () => {
      expect(ORDERED_MUSCLE_GROUPS).toEqual([
        'Peito',
        'Costas',
        'Pernas',
        'Ombros',
        'Braços',
        'Abdômen',
      ]);

      const results = filterAndGroupExercises(mockExercises, 'Todos', '');
      const groupNames = results.map((r) => r.group);
      expect(groupNames).toEqual([
        'Peito',
        'Costas',
        'Pernas',
        'Ombros',
        'Braços',
        'Abdômen',
      ]);
    });

    it('ordem dos exercícios dentro de cada grupo deve ser alfabética', () => {
      const results = filterAndGroupExercises(mockExercises, 'Costas', '');
      expect(results.length).toBe(1);
      const names = results[0].data.map((e) => e.name);
      // 'Puxada alta no pulley' vem antes de 'Remada curvada'
      expect(names).toEqual(['Puxada alta no pulley', 'Remada curvada']);
    });

    it('não inclui exercícios arquivados', () => {
      const results = filterAndGroupExercises(mockExercises, 'Peito', '');
      const ids = results[0].data.map((e) => e.id);
      expect(ids).not.toContain('ex_archived');
    });
  });

  describe('Cabeçalhos de Seção em Sentence Case', () => {
    it('formata título no singular quando houver 1 exercício', () => {
      expect(formatGroupHeader('Pernas', 1)).toBe('Pernas · 1 exercício');
      expect(formatGroupHeader('Pernas', 1)).not.toBe('PERNAS · 1 EXERCÍCIO');
    });

    it('formata título no plural quando houver múltiplos exercícios', () => {
      expect(formatGroupHeader('Peito', 2)).toBe('Peito · 2 exercícios');
      expect(formatGroupHeader('Costas', 8)).toBe('Costas · 8 exercícios');
    });
  });

  describe('Melhor Marca (PR)', () => {
    it('formata PR em kg corretamente com algarismos tabulares', () => {
      expect(formatExercisePR(100, 8, 'kg')).toBe('100 kg × 8');
      expect(formatExercisePR(34, 8, 'kg')).toBe('34 kg × 8');
      expect(formatExercisePR(12.5, 12, 'kg')).toBe('12,5 kg × 12');
    });

    it('converte e formata PR em lb quando a unidade for lb', () => {
      // 100 kg = 220.46 lb -> formatado como 220,5 lb
      const prLb = formatExercisePR(100, 8, 'lb');
      expect(prLb).toBe('220,5 lb × 8');
    });

    it('retorna null se nunca treinou (bestWeight ou bestReps nulo)', () => {
      expect(formatExercisePR(null, null, 'kg')).toBeNull();
      expect(formatExercisePR(null, 10, 'kg')).toBeNull();
      expect(formatExercisePR(50, null, 'kg')).toBeNull();
      expect(formatExercisePR(0, 0, 'kg')).toBeNull();
    });
  });

  describe('Compatibilidade com Seed Completo', () => {
    it('filtra e agrupa todos os 46 exercícios do seed sem falhas', () => {
      const seedAsItems: ExerciseItemData[] = seedExercises.map((s) => ({
        ...s,
        kind: s.kind as 'composto' | 'isolamento',
        defaultIncrement: s.defaultIncrement ?? 2.5,
        defaultRestS: s.defaultRestS ?? 90,
        isCustom: Boolean(s.isCustom),
        archived: Boolean(s.archived),
        bestWeight: null,
        bestReps: null,
      }));

      const sections = filterAndGroupExercises(seedAsItems, 'Todos', '');
      expect(sections.length).toBe(6);

      let totalExercises = 0;
      for (const sec of sections) {
        expect(ORDERED_MUSCLE_GROUPS).toContain(sec.group);
        expect(sec.data.length).toBeGreaterThan(0);
        totalExercises += sec.data.length;
      }
      expect(totalExercises).toBe(seedExercises.length);
    });

    it('os chips de filtro contêm "Todos" e os 6 grupos em ordem', () => {
      expect(FILTER_CHIPS).toEqual([
        'Todos',
        'Peito',
        'Costas',
        'Pernas',
        'Ombros',
        'Braços',
        'Abdômen',
      ]);
    });
  });

  describe('Estado Vazio da Biblioteca — Tela 2.2', () => {
    it('retorna título apropriado quando a biblioteca inteira está vazia', () => {
      expect(getEmptyStateTitle(true)).toBe('Sua biblioteca está vazia');
    });

    it('retorna título padrão quando houver busca sem resultados', () => {
      expect(getEmptyStateTitle(false)).toBe('Nenhum exercício encontrado');
    });

    it('buscar "Kettlebell Swing" formata o texto exato com aspas', () => {
      const desc = getEmptyStateDescription(false, 'Kettlebell Swing', 'Todos');
      expect(desc).toBe('Não encontramos "Kettlebell Swing" na sua biblioteca.');
    });

    it('faz trim de espaços no termo buscado para a mensagem', () => {
      const desc = getEmptyStateDescription(false, '   Kettlebell Swing   ', 'Todos');
      expect(desc).toBe('Não encontramos "Kettlebell Swing" na sua biblioteca.');
    });

    it('retorna mensagem de grupo quando apenas o chip estiver filtrado', () => {
      const desc = getEmptyStateDescription(false, '', 'Ombros');
      expect(desc).toBe('Não encontramos exercícios para o grupo "Ombros" na sua biblioteca.');
    });

    it('retorna mensagem de biblioteca vazia quando isLibraryEmpty for true', () => {
      const desc = getEmptyStateDescription(true, '', 'Todos');
      expect(desc).toBe('Cadastre seu primeiro exercício para começar a montar seus treinos.');
    });

    it('buscar "Kettlebell Swing" nos exercícios do seed retorna lista vazia acionando o estado 2.2', () => {
      const seedAsItems: ExerciseItemData[] = seedExercises.map((s) => ({
        ...s,
        kind: s.kind as 'composto' | 'isolamento',
        defaultIncrement: s.defaultIncrement ?? 2.5,
        defaultRestS: s.defaultRestS ?? 90,
        isCustom: Boolean(s.isCustom),
        archived: Boolean(s.archived),
        bestWeight: null,
        bestReps: null,
      }));

      const sections = filterAndGroupExercises(seedAsItems, 'Todos', 'Kettlebell Swing');
      expect(sections.length).toBe(0);
    });

    it('limpar busca ("") restaura a lista completa', () => {
      const seedAsItems: ExerciseItemData[] = seedExercises.map((s) => ({
        ...s,
        kind: s.kind as 'composto' | 'isolamento',
        defaultIncrement: s.defaultIncrement ?? 2.5,
        defaultRestS: s.defaultRestS ?? 90,
        isCustom: Boolean(s.isCustom),
        archived: Boolean(s.archived),
        bestWeight: null,
        bestReps: null,
      }));

      // Busca sem resultado
      const emptySections = filterAndGroupExercises(seedAsItems, 'Todos', 'Kettlebell Swing');
      expect(emptySections.length).toBe(0);

      // Limpar busca restaura
      const restoredSections = filterAndGroupExercises(seedAsItems, 'Todos', '');
      expect(restoredSections.length).toBe(6);
    });
  });
});
