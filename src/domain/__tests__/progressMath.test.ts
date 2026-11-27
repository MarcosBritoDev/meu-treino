import { describe, it, expect } from 'vitest';
import {
  calcEpley1RM,
  isSetEligibleForE1RM,
  calcVolumeDeltaPercent,
  calcMuscleSetsDistribution,
  calcWeeklyStreak,
  formatMuscleSeriesCount,
} from '../progressMath';

describe('Serviços de Domínio — Métricas de Progresso (progressMath)', () => {
  describe('calcEpley1RM', () => {
    it('deve retornar 0 quando carga ou repetições forem menores ou iguais a zero', () => {
      expect(calcEpley1RM(0, 10)).toBe(0);
      expect(calcEpley1RM(-50, 10)).toBe(0);
      expect(calcEpley1RM(80, 0)).toBe(0);
      expect(calcEpley1RM(80, -2)).toBe(0);
    });

    it('deve retornar 0 para valores nulos, indefinidos ou NaN', () => {
      expect(calcEpley1RM(null, 10)).toBe(0);
      expect(calcEpley1RM(80, null)).toBe(0);
      expect(calcEpley1RM(undefined, undefined)).toBe(0);
      expect(calcEpley1RM(NaN, 5)).toBe(0);
      expect(calcEpley1RM(80, NaN)).toBe(0);
    });

    it('deve retornar a própria carga quando repetições forem exatamente 1', () => {
      expect(calcEpley1RM(100, 1)).toBe(100);
      expect(calcEpley1RM(82.5, 1)).toBe(82.5);
    });

    it('deve calcular Epley: carga * (1 + reps / 30) arredondado a 1 casa decimal para reps > 1', () => {
      // 85 * (1 + 8 / 30) = 85 * (1 + 0.26666...) = 107.6666... -> 107.7
      expect(calcEpley1RM(85, 8)).toBe(107.7);

      // 100 * (1 + 10 / 30) = 100 * (1 + 0.33333...) = 133.3333... -> 133.3
      expect(calcEpley1RM(100, 10)).toBe(133.3);

      // 60 * (1 + 12 / 30) = 60 * 1.4 = 84.0 -> 84
      expect(calcEpley1RM(60, 12)).toBe(84);

      // 70 * (1 + 5 / 30) = 70 * 1.16666... = 81.6666... -> 81.7
      expect(calcEpley1RM(70, 5)).toBe(81.7);
    });

    describe('isSetEligibleForE1RM', () => {
      it('deve aceitar séries normais e até a falha concluídas com peso e repetições válidos', () => {
        expect(
          isSetEligibleForE1RM({
            type: 'normal',
            completedAt: 1700000000,
            weight: 80,
            reps: 8,
          })
        ).toBe(true);

        expect(
          isSetEligibleForE1RM({
            type: 'failure',
            completedAt: 1700000000,
            weight: 70,
            reps: 10,
          })
        ).toBe(true);

        // Quando type for omitido/nulo, padrão é normal
        expect(
          isSetEligibleForE1RM({
            type: null,
            completedAt: 1700000000,
            weight: 50,
            reps: 12,
          })
        ).toBe(true);

        // Suporte a completed_at em snake_case (SQLite)
        expect(
          isSetEligibleForE1RM({
            type: 'normal',
            completed_at: 1700000000,
            weight: 80,
            reps: 8,
          })
        ).toBe(true);
      });

      it('deve ignorar séries do tipo warmup e drop', () => {
        expect(
          isSetEligibleForE1RM({
            type: 'warmup',
            completedAt: 1700000000,
            weight: 40,
            reps: 15,
          })
        ).toBe(false);

        expect(
          isSetEligibleForE1RM({
            type: 'drop',
            completedAt: 1700000000,
            weight: 60,
            reps: 10,
          })
        ).toBe(false);

        expect(
          isSetEligibleForE1RM({
            type: 'normal',
            isWarmup: true,
            completedAt: 1700000000,
            weight: 50,
            reps: 12,
          })
        ).toBe(false);
      });

      it('deve rejeitar séries não concluídas ou sem carga/repetições', () => {
        expect(
          isSetEligibleForE1RM({
            type: 'normal',
            completedAt: null,
            weight: 80,
            reps: 8,
          })
        ).toBe(false);

        expect(
          isSetEligibleForE1RM({
            type: 'normal',
            completedAt: 1700000000,
            weight: 0,
            reps: 10,
          })
        ).toBe(false);

        expect(
          isSetEligibleForE1RM({
            type: 'normal',
            completedAt: 1700000000,
            weight: 80,
            reps: 0,
          })
        ).toBe(false);
      });
    });
  });

  describe('calcVolumeDeltaPercent', () => {
    it('deve retornar null se previousVol for zero, negativo ou nulo (sem Infinity nem NaN)', () => {
      expect(calcVolumeDeltaPercent(1000, 0)).toBeNull();
      expect(calcVolumeDeltaPercent(1000, -500)).toBeNull();
      expect(calcVolumeDeltaPercent(1000, null)).toBeNull();
      expect(calcVolumeDeltaPercent(1000, undefined)).toBeNull();
      expect(calcVolumeDeltaPercent(1000, NaN)).toBeNull();
    });

    it('deve calcular variação percentual positiva corretamente', () => {
      // (1120 - 1000) / 1000 * 100 = 12%
      expect(calcVolumeDeltaPercent(1120, 1000)).toBe(12);

      // (1500 - 1000) / 1000 * 100 = 50%
      expect(calcVolumeDeltaPercent(1500, 1000)).toBe(50);

      // Arredondamento
      // (1025 - 1000) / 1000 * 100 = 2.5% -> 3%
      expect(calcVolumeDeltaPercent(1025, 1000)).toBe(3);
    });

    it('deve calcular variação percentual negativa corretamente', () => {
      // (900 - 1000) / 1000 * 100 = -10%
      expect(calcVolumeDeltaPercent(900, 1000)).toBe(-10);

      // (0 - 1000) / 1000 * 100 = -100%
      expect(calcVolumeDeltaPercent(0, 1000)).toBe(-100);
      expect(calcVolumeDeltaPercent(null, 1000)).toBe(-100);
    });

    it('deve retornar 0 para volumes iguais', () => {
      expect(calcVolumeDeltaPercent(1000, 1000)).toBe(0);
    });
  });

  describe('calcMuscleSetsDistribution', () => {
    it('deve retornar array vazio para entrada vazia ou nula', () => {
      expect(calcMuscleSetsDistribution([])).toEqual([]);
      expect(calcMuscleSetsDistribution(null as any)).toEqual([]);
    });

    it('deve ignorar séries não concluídas e de aquecimento', () => {
      const sets = [
        {
          completed_at: null,
          type: 'normal',
          muscle_group: 'Peito',
        },
        {
          completed_at: 1700000000,
          type: 'warmup',
          muscle_group: 'Peito',
        },
        {
          completed_at: 1700000000,
          type: 'normal',
          is_warmup: 1,
          muscle_group: 'Peito',
        },
      ];
      expect(calcMuscleSetsDistribution(sets)).toEqual([]);
    });

    it('deve contabilizar séries normal, failure e drop', () => {
      const sets = [
        { completed_at: 1700000001, type: 'normal', muscle_group: 'Peito' },
        { completed_at: 1700000002, type: 'failure', muscle_group: 'Peito' },
        { completed_at: 1700000003, type: 'drop', muscle_group: 'Peito' },
      ];
      const result = calcMuscleSetsDistribution(sets);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        muscle: 'Peito',
        sets: 3,
        primarySets: 3,
        secondarySets: 0,
      });
    });

    it('deve somar 1.0 para músculo principal e 0.5 para cada músculo secundário', () => {
      // Supino reto: Peito (principal 1x), Tríceps (secundário 0.5x), Ombro anterior (secundário 0.5x)
      const sets = [
        {
          completed_at: 1700000001,
          type: 'normal',
          muscle_group: 'Peito',
          secondary_muscles: JSON.stringify(['Tríceps', 'Ombro anterior']),
        },
        {
          completed_at: 1700000002,
          type: 'normal',
          muscle_group: 'Peito',
          secondary_muscles: JSON.stringify(['Tríceps', 'Ombro anterior']),
        },
        // Tríceps corda: Tríceps (principal 1x)
        {
          completed_at: 1700000003,
          type: 'normal',
          muscle_group: 'Tríceps',
          secondary_muscles: '[]',
        },
      ];

      const result = calcMuscleSetsDistribution(sets);

      // Peito: 2 séries principais = 2.0
      // Tríceps: 2 secundárias (0.5 + 0.5) + 1 principal (1.0) = 2.0 (empate, Peito tem 2 primárias vs 1 de Tríceps)
      // Ombro anterior: 2 secundárias (0.5 + 0.5) = 1.0
      expect(result[0].muscle).toBe('Peito');
      expect(result[0].sets).toBe(2);
      expect(result[0].primarySets).toBe(2);
      expect(result[0].secondarySets).toBe(0);

      expect(result[1].muscle).toBe('Tríceps');
      expect(result[1].sets).toBe(2);
      expect(result[1].primarySets).toBe(1);
      expect(result[1].secondarySets).toBe(1);

      expect(result[2].muscle).toBe('Ombro anterior');
      expect(result[2].sets).toBe(1);
      expect(result[2].primarySets).toBe(0);
      expect(result[2].secondarySets).toBe(1);
    });

    it('não deve duplicar se o músculo principal constar indevidamente nos secundários', () => {
      const sets = [
        {
          completed_at: 1700000001,
          type: 'normal',
          muscle_group: 'Peito',
          secondary_muscles: JSON.stringify(['Peito', 'Tríceps']),
        },
      ];
      const result = calcMuscleSetsDistribution(sets);
      const peito = result.find((r) => r.muscle === 'Peito');
      expect(peito?.sets).toBe(1);
      expect(peito?.primarySets).toBe(1);
      expect(peito?.secondarySets).toBe(0);
    });

    it('deve suportar propriedades camelCase (muscleGroup, secondaryMuscles, completedAt)', () => {
      const sets = [
        {
          completedAt: 1700000001,
          type: 'normal',
          muscleGroup: 'Dorsais',
          secondaryMuscles: ['Bíceps'],
        },
      ];
      const result = calcMuscleSetsDistribution(sets);
      expect(result).toEqual([
        { muscle: 'Dorsais', sets: 1, primarySets: 1, secondarySets: 0 },
        { muscle: 'Bíceps', sets: 0.5, primarySets: 0, secondarySets: 0.5 },
      ]);
    });
  });

  describe('calcWeeklyStreak', () => {
    // Helper para gerar datas em relação a uma referência
    function createDateOffset(baseDate: Date, dayOffset: number, hour: number = 10): number {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + dayOffset);
      d.setHours(hour, 0, 0, 0);
      return d.getTime();
    }

    it('deve retornar 0 quando não houver treinos', () => {
      expect(calcWeeklyStreak([])).toBe(0);
      expect(calcWeeklyStreak(null as any)).toBe(0);
    });

    it('deve usar meta padrão de 3 dias quando targetDaysPerWeek for <= 0 ou nulo', () => {
      // Criando uma semana passada com 3 treinos
      const now = new Date(2026, 10, 27); // Uma sexta-feira
      // Semana passada (7 dias atrás)
      const prevWeekDates = [
        createDateOffset(now, -7),
        createDateOffset(now, -8),
        createDateOffset(now, -9),
      ];
      expect(calcWeeklyStreak(prevWeekDates, 0, now)).toBe(1);
      expect(calcWeeklyStreak(prevWeekDates, -1, now)).toBe(1);
    });

    it('não deve zerar o streak prematuramente se a semana atual ainda não bateu a meta', () => {
      // Referência: Quarta-feira, 25/11/2026
      const now = new Date(2026, 10, 25); // Quarta-feira
      const target = 3;

      // Semana atual: 1 treino (ainda não bateu a meta de 3)
      const currentWeekSession = createDateOffset(now, 0);

      // Semana passada (-1): 3 treinos (bateu a meta)
      const prevWeekSessions = [
        createDateOffset(now, -7),
        createDateOffset(now, -8),
        createDateOffset(now, -9),
      ];

      // Semana retrasada (-2): 4 treinos (bateu a meta)
      const twoWeeksAgoSessions = [
        createDateOffset(now, -14),
        createDateOffset(now, -15),
        createDateOffset(now, -16),
        createDateOffset(now, -17),
      ];

      // Semana (-3): 1 treino (quebrou a sequência)
      const threeWeeksAgoSessions = [createDateOffset(now, -21)];

      const allDates = [
        currentWeekSession,
        ...prevWeekSessions,
        ...twoWeeksAgoSessions,
        ...threeWeeksAgoSessions,
      ];

      // A semana atual não zera; conta semanas -1 e -2 -> streak = 2!
      expect(calcWeeklyStreak(allDates, target, now)).toBe(2);
    });

    it('deve incluir a semana atual na contagem quando ela já bateu a meta', () => {
      // Referência: Sexta-feira
      const now = new Date(2026, 10, 27);
      const target = 3;

      // Semana atual: 3 treinos já concluídos
      const currentWeekSessions = [
        createDateOffset(now, 0),
        createDateOffset(now, -2),
        createDateOffset(now, -4),
      ];

      // Semana passada: 3 treinos
      const prevWeekSessions = [
        createDateOffset(now, -7),
        createDateOffset(now, -8),
        createDateOffset(now, -9),
      ];

      const allDates = [...currentWeekSessions, ...prevWeekSessions];

      // Semana atual (1) + semana passada (1) = streak 2
      expect(calcWeeklyStreak(allDates, target, now)).toBe(2);
    });

    it('deve retornar 0 se a última semana fechada não bateu a meta e a atual também não', () => {
      const now = new Date(2026, 10, 27);
      const target = 3;

      // Semana atual: 1 treino
      const currentWeekSessions = [createDateOffset(now, 0)];

      // Semana passada: apenas 2 treinos (meta era 3)
      const prevWeekSessions = [createDateOffset(now, -7), createDateOffset(now, -8)];

      const allDates = [...currentWeekSessions, ...prevWeekSessions];
      expect(calcWeeklyStreak(allDates, target, now)).toBe(0);
    });

    it('deve retornar 1 se a semana atual bateu a meta, mesmo que a semana anterior não tenha batido', () => {
      const now = new Date(2026, 10, 27);
      const target = 3;

      // Semana atual: 3 treinos
      const currentWeekSessions = [
        createDateOffset(now, 0),
        createDateOffset(now, -2),
        createDateOffset(now, -3),
      ];

      // Semana passada: 1 treino
      const prevWeekSessions = [createDateOffset(now, -8)];

      const allDates = [...currentWeekSessions, ...prevWeekSessions];
      expect(calcWeeklyStreak(allDates, target, now)).toBe(1);
    });
  });

  describe('formatMuscleSeriesCount', () => {
    it('deve formatar séries com singular e plural', () => {
      expect(formatMuscleSeriesCount(1)).toBe('1 série');
      expect(formatMuscleSeriesCount(14)).toBe('14 séries');
      expect(formatMuscleSeriesCount(0)).toBe('0 séries');
    });

    it('deve formatar valores fracionados com vírgula pt-BR', () => {
      expect(formatMuscleSeriesCount(9.5)).toBe('9,5 séries');
      expect(formatMuscleSeriesCount(1.5)).toBe('1,5 séries');
      expect(formatMuscleSeriesCount(0.5)).toBe('0,5 séries');
    });
  });
});
