import { describe, it, expect } from 'vitest';
import {
  EQUIPMENTS,
  ALL_MUSCLES,
  MUSCLE_REGIONS,
  sanitizeSecondaryMuscles,
  filterExercisesByMuscle,
  parseSecondaryMuscles,
  serializeSecondaryMuscles,
  normalizeMuscleName,
  normalizeEquipmentName,
  isDumbbellEquipment,
  getMuscleRegion,
} from '../exerciseCatalog';
import { calcularVolume } from '../volume';

describe('Catálogo Central de Exercícios — Volt Precision', () => {
  describe('Constantes de Equipamentos e Músculos', () => {
    it('deve possuir exatamente 10 equipamentos', () => {
      expect(EQUIPMENTS.length).toBe(10);
      expect(EQUIPMENTS).toEqual([
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
      ]);
    });

    it('deve possuir exatamente 20 músculos agrupados em 4 regiões', () => {
      expect(ALL_MUSCLES.length).toBe(20);
      expect(Object.keys(MUSCLE_REGIONS)).toEqual([
        'Superiores — Empurrar',
        'Superiores — Puxar',
        'Inferiores',
        'Core e gerais',
      ]);

      expect(MUSCLE_REGIONS['Superiores — Empurrar']).toEqual([
        'Peito',
        'Ombro anterior',
        'Ombro lateral',
        'Ombro posterior',
        'Tríceps',
      ]);

      expect(MUSCLE_REGIONS['Superiores — Puxar']).toEqual([
        'Dorsais',
        'Costas superiores',
        'Lombar',
        'Pescoço / Trapézio',
        'Bíceps',
        'Antebraço',
      ]);

      expect(MUSCLE_REGIONS['Inferiores']).toEqual([
        'Quadríceps',
        'Posterior de coxa',
        'Glúteos',
        'Panturrilha',
        'Adutores',
        'Abdutores',
      ]);

      expect(MUSCLE_REGIONS['Core e gerais']).toEqual([
        'Abdômen',
        'Corpo inteiro',
        'Outro',
      ]);
    });

    it('getMuscleRegion deve identificar a região correta para cada músculo', () => {
      expect(getMuscleRegion('Peito')).toBe('Superiores — Empurrar');
      expect(getMuscleRegion('Dorsais')).toBe('Superiores — Puxar');
      expect(getMuscleRegion('Quadríceps')).toBe('Inferiores');
      expect(getMuscleRegion('Abdômen')).toBe('Core e gerais');
    });
  });

  describe('sanitizeSecondaryMuscles', () => {
    it('remove duplicatas mantendo a primeira ocorrência', () => {
      const result = sanitizeSecondaryMuscles('Peito', [
        'Ombro anterior',
        'Tríceps',
        'Ombro anterior',
        'Tríceps',
      ]);
      expect(result).toEqual(['Ombro anterior', 'Tríceps']);
    });

    it('nunca permite o músculo principal dentro dos secundários (case-insensitive e com trim)', () => {
      const result = sanitizeSecondaryMuscles('Peito', [
        'Peito',
        ' peito ',
        'PEITO',
        'Ombro anterior',
        'Tríceps',
      ]);
      expect(result).toEqual(['Ombro anterior', 'Tríceps']);
    });

    it('remove strings vazias e com apenas espaços', () => {
      const result = sanitizeSecondaryMuscles('Dorsais', [
        '',
        '   ',
        'Bíceps',
        'Costas superiores',
      ]);
      expect(result).toEqual(['Bíceps', 'Costas superiores']);
    });

    it('retorna array vazio quando secondaries é nulo, indefinido ou inválido', () => {
      expect(sanitizeSecondaryMuscles('Peito', null)).toEqual([]);
      expect(sanitizeSecondaryMuscles('Peito', undefined)).toEqual([]);
      expect(sanitizeSecondaryMuscles('Peito', [] as any)).toEqual([]);
      expect(sanitizeSecondaryMuscles('Peito', 'invalid' as any)).toEqual([]);
    });
  });

  describe('filterExercisesByMuscle', () => {
    const sampleExercises = [
      {
        id: '1',
        name: 'Supino reto com barra',
        muscleGroup: 'Peito',
        secondaryMuscles: ['Ombro anterior', 'Tríceps'],
      },
      {
        id: '2',
        name: 'Desenvolvimento militar com barra',
        muscleGroup: 'Ombro anterior',
        secondaryMuscles: ['Ombro lateral', 'Tríceps'],
      },
      {
        id: '3',
        name: 'Tríceps testa com barra',
        muscleGroup: 'Tríceps',
        secondaryMuscles: ['Antebraço'],
      },
      {
        id: '4',
        name: 'Flexão de braço',
        muscleGroup: 'Peito',
        secondaryMuscles: ['Ombro anterior', 'Tríceps', 'Abdômen'],
      },
    ];

    it('separa em { primary, secondary } quando o filtro está ativo', () => {
      // Filtrando por "Tríceps"
      const result = filterExercisesByMuscle(sampleExercises, 'Tríceps');

      // Exercício onde Tríceps é principal
      expect(result.primary.map((e) => e.name)).toEqual(['Tríceps testa com barra']);

      // Exercícios onde Tríceps é secundário
      expect(result.secondary.map((e) => e.name)).toEqual([
        'Supino reto com barra',
        'Desenvolvimento militar com barra',
        'Flexão de braço',
      ]);
    });

    it('separa corretamente quando filtrado por "Ombro anterior"', () => {
      const result = filterExercisesByMuscle(sampleExercises, 'Ombro anterior');

      expect(result.primary.map((e) => e.name)).toEqual([
        'Desenvolvimento militar com barra',
      ]);
      expect(result.secondary.map((e) => e.name)).toEqual([
        'Supino reto com barra',
        'Flexão de braço',
      ]);
    });

    it('retorna todos os exercícios em primary e secondary vazio se o filtro estiver inativo ou "Todos"', () => {
      const resTodos = filterExercisesByMuscle(sampleExercises, 'Todos');
      expect(resTodos.primary.length).toBe(sampleExercises.length);
      expect(resTodos.secondary).toEqual([]);

      const resEmpty = filterExercisesByMuscle(sampleExercises, '');
      expect(resEmpty.primary.length).toBe(sampleExercises.length);
      expect(resEmpty.secondary).toEqual([]);

      const resNull = filterExercisesByMuscle(sampleExercises, null);
      expect(resNull.primary.length).toBe(sampleExercises.length);
      expect(resNull.secondary).toEqual([]);
    });
  });

  describe('parseSecondaryMuscles e serializeSecondaryMuscles', () => {
    it('parseSecondaryMuscles faz parse de string JSON array', () => {
      expect(parseSecondaryMuscles('["Ombro anterior", "Tríceps"]')).toEqual([
        'Ombro anterior',
        'Tríceps',
      ]);
      expect(parseSecondaryMuscles('[]')).toEqual([]);
    });

    it('parseSecondaryMuscles lida com lista separada por vírgula', () => {
      expect(parseSecondaryMuscles('Ombro anterior, Tríceps')).toEqual([
        'Ombro anterior',
        'Tríceps',
      ]);
    });

    it('parseSecondaryMuscles preserva array de strings e lida com dados corrompidos', () => {
      expect(parseSecondaryMuscles(['Glúteos', 'Lombar'])).toEqual(['Glúteos', 'Lombar']);
      expect(parseSecondaryMuscles('{invalid json}')).toEqual([]);
      expect(parseSecondaryMuscles(null)).toEqual([]);
      expect(parseSecondaryMuscles(undefined)).toEqual([]);
    });

    it('serializeSecondaryMuscles serializa array para string JSON válida', () => {
      expect(serializeSecondaryMuscles(['Ombro anterior', 'Tríceps'])).toBe(
        '["Ombro anterior","Tríceps"]'
      );
      expect(serializeSecondaryMuscles([])).toBe('[]');
      expect(serializeSecondaryMuscles(null)).toBe('[]');
    });
  });

  describe('Normalização e Regra Halteres = 2x no volume', () => {
    it('normalizeMuscleName mapeia nomes legados para o catálogo de 20 músculos', () => {
      expect(normalizeMuscleName('Costas')).toBe('Dorsais');
      expect(normalizeMuscleName('Pernas')).toBe('Quadríceps');
      expect(normalizeMuscleName('Ombros')).toBe('Ombro anterior');
      expect(normalizeMuscleName('Braços')).toBe('Bíceps');
      expect(normalizeMuscleName('Peito')).toBe('Peito');
      expect(normalizeMuscleName('Abdômen')).toBe('Abdômen');
      expect(normalizeMuscleName('Desconhecido')).toBe('Outro');
    });

    it('normalizeEquipmentName mapeia nomes legados para os 10 equipamentos', () => {
      expect(normalizeEquipmentName('Cabo')).toBe('Cabo / Polia');
      expect(normalizeEquipmentName('cabo')).toBe('Cabo / Polia');
      expect(normalizeEquipmentName('Barra')).toBe('Barra');
      expect(normalizeEquipmentName('Halteres')).toBe('Halteres');
    });

    it('isDumbbellEquipment reconhece halteres de forma robusta', () => {
      expect(isDumbbellEquipment('Halteres')).toBe(true);
      expect(isDumbbellEquipment('halteres')).toBe(true);
      expect(isDumbbellEquipment('halter')).toBe(true);
      expect(isDumbbellEquipment('Barra')).toBe(false);
      expect(isDumbbellEquipment(null)).toBe(false);
    });

    it('garante que a regra Halteres = 2x no volume continue intacta', () => {
      const sets = [
        { weight: 20, reps: 10, isWarmup: false, completedAt: 123 },
        { weight: 20, reps: 10, isWarmup: false, completedAt: 124 },
      ];

      // Com barra: 20 * 10 + 20 * 10 = 400
      expect(calcularVolume(sets, 'Barra')).toBe(400);

      // Com halteres: (20 * 2 * 10) + (20 * 2 * 10) = 800
      expect(calcularVolume(sets, 'Halteres')).toBe(800);
      expect(calcularVolume(sets, 'halteres')).toBe(800);
    });
  });
});
