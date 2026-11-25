import { describe, it, expect } from 'vitest';
import {
  isExerciseNameDuplicate,
  filterAndGroupExercises,
  ExerciseItemData,
} from '../../domain/search';

describe('Novo Exercício — Tela 2.3 (Volt Precision)', () => {
  const existingExercises: ExerciseItemData[] = [
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
    },
    {
      id: 'ex_2',
      name: 'Elevação lateral',
      muscleGroup: 'Ombros',
      equipment: 'Halteres',
      kind: 'isolamento',
      defaultIncrement: 1.0,
      defaultRestS: 60,
      isCustom: false,
      archived: false,
    },
    {
      id: 'ex_3',
      name: 'Remada curvada antiga',
      muscleGroup: 'Costas',
      equipment: 'Barra',
      kind: 'composto',
      defaultIncrement: 2.5,
      defaultRestS: 90,
      isCustom: false,
      archived: true, // Arquivado
    },
  ];

  describe('Validação de Nome Duplicado (isExerciseNameDuplicate)', () => {
    it('detecta duplicata com nome idêntico no mesmo grupo', () => {
      const isDup = isExerciseNameDuplicate(
        'Supino reto com barra',
        'Peito',
        existingExercises
      );
      expect(isDup).toBe(true);
    });

    it('detecta duplicata ignorando maiúsculas e minúsculas', () => {
      const isDup = isExerciseNameDuplicate(
        'SUPINO RETO COM BARRA',
        'Peito',
        existingExercises
      );
      expect(isDup).toBe(true);
    });

    it('detecta duplicata ignorando acentuação (ex: elevacao vs Elevação)', () => {
      const isDup = isExerciseNameDuplicate(
        'Elevacao lateral',
        'Ombros',
        existingExercises
      );
      expect(isDup).toBe(true);
    });

    it('permite o mesmo nome em um grupo muscular diferente', () => {
      const isDup = isExerciseNameDuplicate(
        'Supino reto com barra',
        'Costas',
        existingExercises
      );
      expect(isDup).toBe(false);
    });

    it('não considera exercícios arquivados como duplicatas ativas', () => {
      const isDup = isExerciseNameDuplicate(
        'Remada curvada antiga',
        'Costas',
        existingExercises
      );
      expect(isDup).toBe(false);
    });

    it('retorna false para nomes novos e únicos', () => {
      const isDup = isExerciseNameDuplicate(
        'Remada cavalinho',
        'Costas',
        existingExercises
      );
      expect(isDup).toBe(false);
    });

    it('retorna false para string vazia ou em branco', () => {
      expect(isExerciseNameDuplicate('', 'Peito', existingExercises)).toBe(false);
      expect(isExerciseNameDuplicate('   ', 'Peito', existingExercises)).toBe(false);
    });
  });

  describe('Integração com a Biblioteca', () => {
    it('exercício criado com isCustom = true aparece no grupo correto da Biblioteca', () => {
      const customExercise: ExerciseItemData = {
        id: 'ex_custom_123',
        name: 'Remada cavalinho',
        muscleGroup: 'Costas',
        equipment: 'Barra',
        kind: 'composto',
        defaultIncrement: 2.5,
        defaultRestS: 90,
        notes: 'Manter a coluna neutra e puxar com os cotovelos fechados.',
        isCustom: true,
        archived: false,
        bestWeight: null,
        bestReps: null,
      };

      const allExercises = [...existingExercises, customExercise];

      // Busca na biblioteca filtrando por "Costas"
      const sections = filterAndGroupExercises(allExercises, 'Costas', '');
      expect(sections.length).toBe(1);
      expect(sections[0].group).toBe('Costas');

      const names = sections[0].data.map((e) => e.name);
      expect(names).toContain('Remada cavalinho');
    });

    it('exercício recém criado pode ser encontrado pela busca global', () => {
      const customExercise: ExerciseItemData = {
        id: 'ex_custom_456',
        name: 'Kettlebell swing',
        muscleGroup: 'Pernas',
        equipment: 'Halteres',
        kind: 'composto',
        defaultIncrement: 2.0,
        defaultRestS: 60,
        isCustom: true,
        archived: false,
        bestWeight: null,
        bestReps: null,
      };

      const allExercises = [...existingExercises, customExercise];

      const sections = filterAndGroupExercises(allExercises, 'Todos', 'kettlebell');
      expect(sections.length).toBe(1);
      expect(sections[0].group).toBe('Pernas');
      expect(sections[0].data[0].name).toBe('Kettlebell swing');
      expect(sections[0].data[0].isCustom).toBe(true);
    });
  });
});
