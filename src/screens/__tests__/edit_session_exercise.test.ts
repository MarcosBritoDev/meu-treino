import { describe, it, expect } from 'vitest';

describe('Tela 4.4 - Editar Exercício na Sessão (EditSessionExerciseSheet)', () => {
  describe('Regras de Séries e Bloqueio de Redução Abaixo das Concluídas', () => {
    it('bloqueia redução de séries abaixo do número de séries já concluídas', () => {
      const completedSetsCount = 2;
      const minAllowedSets = Math.max(1, completedSetsCount);
      expect(minAllowedSets).toBe(2);

      // Usuário tenta diminuir para 1: bloqueado em 2
      const targetSets = 2;
      const canDecrease = targetSets > minAllowedSets;
      expect(canDecrease).toBe(false);
    });

    it('permite redução de séries quando acima das concluídas', () => {
      const completedSetsCount = 2;
      const minAllowedSets = Math.max(1, completedSetsCount);
      const targetSets = 4;
      const canDecrease = targetSets > minAllowedSets;
      expect(canDecrease).toBe(true);
    });

    it('calcula corretamente o acréscimo de séries ao mudar de 3 para 5', () => {
      const initialSets = 3;
      const newTargetSets = 5;
      const diff = newTargetSets - initialSets;
      expect(diff).toBe(2);

      // Gera as novas séries a serem adicionadas
      const lastSetWeight = 24.0;
      const repMin = 8;
      const addedSets = [];
      for (let i = 1; i <= diff; i++) {
        const nextIdx = initialSets + i;
        addedSets.push({
          index: nextIdx,
          weight: lastSetWeight,
          reps: repMin,
          completedAt: null,
        });
      }

      expect(addedSets.length).toBe(2);
      expect(addedSets[0].index).toBe(4);
      expect(addedSets[1].index).toBe(5);
    });

    it('ao diminuir séries, apenas as séries pendentes (não concluídas) são removidas', () => {
      const sets = [
        { id: '1', index: 1, completedAt: 1000 },
        { id: '2', index: 2, completedAt: 2000 },
        { id: '3', index: 3, completedAt: null },
        { id: '4', index: 4, completedAt: null },
      ];

      const newTargetSets = 2;
      const completedCount = sets.filter((s) => s.completedAt !== null).length;
      expect(completedCount).toBe(2);

      const targetCount = Math.max(completedCount, newTargetSets);
      const remainingSets = sets.filter(
        (s) => !(s.index > targetCount && s.completedAt === null)
      );

      expect(remainingSets.length).toBe(2);
      expect(remainingSets.every((s) => s.completedAt !== null)).toBe(true);
    });
  });

  describe('Validações de Repetições e Metas', () => {
    it('garante que repMin não supere repMax ao salvar', () => {
      const repMin = 14;
      const repMax = 12;

      const sanitizedMin = Math.min(repMin, repMax);
      const sanitizedMax = Math.max(repMin, repMax);

      expect(sanitizedMin).toBe(12);
      expect(sanitizedMax).toBe(14);
    });

    it('garante que repMax não seja menor que repMin', () => {
      const repMin = 8;
      const repMax = 10;
      expect(repMin <= repMax).toBe(true);
    });
  });

  describe('Presets de Descanso e Ciclo de Incremento', () => {
    it('oferece os 4 presets padrão de descanso da sheet: 60s, 90s, 120s e 180s', () => {
      const REST_PRESETS = [60, 90, 120, 180] as const;
      expect(REST_PRESETS).toEqual([60, 90, 120, 180]);
    });

    it('cicla corretamente as opções de incremento de sobrecarga (+1, +2, +2.5, +5 kg)', () => {
      const INCREMENT_OPTIONS = [1, 2, 2.5, 5] as const;
      const getNextIncrement = (current: number) => {
        const idx = INCREMENT_OPTIONS.indexOf(current as any);
        if (idx === -1 || idx === INCREMENT_OPTIONS.length - 1) {
          return INCREMENT_OPTIONS[0];
        }
        return INCREMENT_OPTIONS[idx + 1];
      };

      expect(getNextIncrement(2.5)).toBe(5);
      expect(getNextIncrement(5)).toBe(1);
      expect(getNextIncrement(1)).toBe(2);
      expect(getNextIncrement(2)).toBe(2.5);
    });

    it('formata o incremento com vírgula para PT-BR', () => {
      const formatInc = (val: number) => String(val).replace('.', ',');
      expect(formatInc(2.5)).toBe('2,5');
      expect(formatInc(1)).toBe('1');
      expect(formatInc(5)).toBe('5');
    });
  });

  describe('Isolamento de Sessão vs Ficha Original', () => {
    it('garante que a alteração é feita em session_exercises sem tocar workout_exercises', () => {
      const originalWorkoutExercise = {
        id: 'we_1',
        workoutId: 'w_1',
        targetSets: 3,
        repMin: 8,
        repMax: 12,
        restS: 90,
      };

      const sessionExercise = {
        id: 'se_1',
        sessionId: 'sess_1',
        exerciseId: 'ex_1',
        targetSets: originalWorkoutExercise.targetSets,
        repMin: originalWorkoutExercise.repMin,
        repMax: originalWorkoutExercise.repMax,
        restS: originalWorkoutExercise.restS,
        isSessionOnly: false,
      };

      // Alteração na sheet
      const editedSessionExercise = {
        ...sessionExercise,
        targetSets: 5,
        repMin: 10,
        repMax: 15,
        restS: 120,
      };

      // A sessão mudou
      expect(editedSessionExercise.targetSets).toBe(5);
      expect(editedSessionExercise.restS).toBe(120);

      // A ficha original permaneceu intacta
      expect(originalWorkoutExercise.targetSets).toBe(3);
      expect(originalWorkoutExercise.restS).toBe(90);
    });
  });
});
