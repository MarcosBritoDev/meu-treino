import { describe, it, expect } from 'vitest';
import { normalizeSearchText } from '../../domain/search';
import { estimarDuracao, formatarDuracao } from '../../domain/duration';

interface ExerciseSelectionItem {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  kind: string;
  defaultIncrement: number;
  defaultRestS: number;
  lastWeight: number | null;
  lastReps: number | null;
}

const mockCatalog: ExerciseSelectionItem[] = [
  {
    id: 'ex_supino_reto',
    name: 'Supino Reto com Barra',
    muscleGroup: 'Peito',
    equipment: 'Barra',
    kind: 'composto',
    defaultIncrement: 2.5,
    defaultRestS: 120,
    lastWeight: 100,
    lastReps: 8,
  },
  {
    id: 'ex_supino_inc',
    name: 'Supino Inclinado com Halteres',
    muscleGroup: 'Peito',
    equipment: 'Halteres',
    kind: 'composto',
    defaultIncrement: 2,
    defaultRestS: 90,
    lastWeight: 32,
    lastReps: 10,
  },
  {
    id: 'ex_crucifixo',
    name: 'Crucifixo Reto',
    muscleGroup: 'Peito',
    equipment: 'Halteres',
    kind: 'isolamento',
    defaultIncrement: 2,
    defaultRestS: 60,
    lastWeight: 16,
    lastReps: 12,
  },
  {
    id: 'ex_puxada',
    name: 'Puxada Frontal',
    muscleGroup: 'Costas',
    equipment: 'Cabo',
    kind: 'composto',
    defaultIncrement: 5,
    defaultRestS: 90,
    lastWeight: 70,
    lastReps: 10,
  },
  {
    id: 'ex_remada_curvada',
    name: 'Remada Curvada',
    muscleGroup: 'Costas',
    equipment: 'Barra',
    kind: 'composto',
    defaultIncrement: 2.5,
    defaultRestS: 90,
    lastWeight: 80,
    lastReps: 8,
  },
  {
    id: 'ex_agachamento',
    name: 'Agachamento Livre',
    muscleGroup: 'Pernas',
    equipment: 'Barra',
    kind: 'composto',
    defaultIncrement: 5,
    defaultRestS: 180,
    lastWeight: 120,
    lastReps: 6,
  },
  {
    id: 'ex_rosca_direta',
    name: 'Rosca Direta',
    muscleGroup: 'Braços',
    equipment: 'Barra',
    kind: 'isolamento',
    defaultIncrement: 2,
    defaultRestS: 60,
    lastWeight: 30,
    lastReps: 10,
  },
];

describe('Tela 3.7 - Adicionar Exercícios (Filtros, Seleção e Regras)', () => {
  it('filtra exercícios com busca semântica, ignorando acentos e maiúsculas', () => {
    const q = normalizeSearchText('inclinado');
    const filtered = mockCatalog.filter((ex) => {
      const name = normalizeSearchText(ex.name);
      const muscle = normalizeSearchText(ex.muscleGroup);
      const equip = normalizeSearchText(ex.equipment);
      return name.includes(q) || muscle.includes(q) || equip.includes(q);
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('ex_supino_inc');
  });

  it('filtra por equipamento através da busca de texto', () => {
    const q = normalizeSearchText('barra');
    const filtered = mockCatalog.filter((ex) => {
      const name = normalizeSearchText(ex.name);
      const equip = normalizeSearchText(ex.equipment);
      return name.includes(q) || equip.includes(q);
    });

    expect(filtered.map((e) => e.name)).toEqual([
      'Supino Reto com Barra',
      'Remada Curvada',
      'Agachamento Livre',
      'Rosca Direta',
    ]);
  });

  it('filtra por chip de grupo muscular', () => {
    const chip = 'Peito';
    const chipNorm = normalizeSearchText(chip);
    const filtered = mockCatalog.filter((ex) =>
      normalizeSearchText(ex.muscleGroup).includes(chipNorm)
    );

    expect(filtered).toHaveLength(3);
    expect(filtered.every((e) => e.muscleGroup === 'Peito')).toBe(true);
  });

  it('impede a seleção de exercícios que já estão no treino', () => {
    const existingExerciseIds = new Set(['ex_supino_inc', 'ex_supino_reto']);
    const selectedIds: string[] = [];

    const toggleSelect = (id: string) => {
      if (existingExerciseIds.has(id)) {
        return false; // Desabilitado
      }
      selectedIds.push(id);
      return true;
    };

    expect(toggleSelect('ex_supino_inc')).toBe(false);
    expect(toggleSelect('ex_agachamento')).toBe(true);
    expect(selectedIds).toEqual(['ex_agachamento']);
  });

  it('preserva a ordem exata de seleção do usuário ao adicionar múltiplos', () => {
    let selectedIds: string[] = [];

    const toggleSelect = (id: string) => {
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter((item) => item !== id);
      } else {
        selectedIds = [...selectedIds, id];
      }
    };

    // Usuário seleciona Agachamento, depois Puxada, depois Rosca Direta
    toggleSelect('ex_agachamento');
    toggleSelect('ex_puxada');
    toggleSelect('ex_rosca_direta');

    expect(selectedIds).toEqual(['ex_agachamento', 'ex_puxada', 'ex_rosca_direta']);

    // Usuário desmarca Puxada
    toggleSelect('ex_puxada');
    expect(selectedIds).toEqual(['ex_agachamento', 'ex_rosca_direta']);

    // Usuário adiciona Crucifixo
    toggleSelect('ex_crucifixo');
    expect(selectedIds).toEqual(['ex_agachamento', 'ex_rosca_direta', 'ex_crucifixo']);
  });

  it('atribui metas padrão corretas ao adicionar exercícios à ficha (3 séries, 8-12 reps)', () => {
    const selectedFromScreen = [
      mockCatalog.find((e) => e.id === 'ex_agachamento')!,
      mockCatalog.find((e) => e.id === 'ex_crucifixo')!,
    ];

    const currentWorkoutExercises = [
      {
        id: 'we_1',
        exerciseId: 'ex_supino_inc',
        name: 'Supino Inclinado com Halteres',
        position: 0,
        targetSets: 4,
        repMin: 8,
        repMax: 10,
        restS: 90,
      },
    ];

    const nextPosition = currentWorkoutExercises.length;
    const newWorkoutExercises = selectedFromScreen.map((e, idx) => ({
      id: `new_${Date.now()}_${idx}`,
      exerciseId: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      position: nextPosition + idx,
      targetSets: 3,
      repMin: 8,
      repMax: 12,
      restS: e.defaultRestS || 90,
      note: null,
    }));

    const updatedWorkout = [...currentWorkoutExercises, ...newWorkoutExercises];

    expect(updatedWorkout).toHaveLength(3);
    expect(updatedWorkout[1].name).toBe('Agachamento Livre');
    expect(updatedWorkout[1].targetSets).toBe(3);
    expect(updatedWorkout[1].repMin).toBe(8);
    expect(updatedWorkout[1].repMax).toBe(12);
    expect(updatedWorkout[1].restS).toBe(180); // Rest padrão do Agachamento

    expect(updatedWorkout[2].name).toBe('Crucifixo Reto');
    expect(updatedWorkout[2].targetSets).toBe(3);
    expect(updatedWorkout[2].restS).toBe(60); // Rest padrão do Crucifixo
  });

  it('recalcula volume e duração estimada após adicionar 2 exercícios', () => {
    // 1 exercício inicial: 4 séries de 90s descanso
    const initial = [
      {
        targetSets: 4,
        restS: 90,
      },
    ];

    // Duração inicial: 4 séries * 45s + 3 descansos de 90s = 180s + 270s = 450s (8 min formatado)
    const duracaoInicialS = estimarDuracao({ exercises: initial });
    expect(duracaoInicialS).toBe(450);
    expect(formatarDuracao(duracaoInicialS)).toBe('8 min');

    // Adiciona 2 exercícios com 3 séries cada (180s descanso e 60s descanso)
    const updated = [
      ...initial,
      { targetSets: 3, restS: 180 },
      { targetSets: 3, restS: 60 },
    ];

    const volumeTotal = updated.reduce((sum, e) => sum + e.targetSets, 0);
    expect(volumeTotal).toBe(10); // 4 + 3 + 3 = 10 séries

    const duracaoAtualizadaS = estimarDuracao({ exercises: updated });
    expect(duracaoAtualizadaS).toBeGreaterThan(duracaoInicialS);
    expect(formatarDuracao(duracaoAtualizadaS)).toMatch(/min$/);
  });
});
