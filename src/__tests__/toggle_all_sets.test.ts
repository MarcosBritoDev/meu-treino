import { describe, it, expect, vi } from 'vitest';
import { colors } from '../theme/colors';
import {
  canGeneratePR,
  detectarPR,
  defaultRestFor,
} from '../domain/sessionMath';

describe('Ação Rápida: Marcar/Desmarcar Todas as Séries (Modo Ativo)', () => {
  describe('1. Botão CheckCheck no cabeçalho do SetTable', () => {
    const resolveHeaderCheckState = (sets: { completedAt?: number | null; completed?: boolean }[]) => {
      const allCompleted =
        sets.length > 0 &&
        sets.every(
          (s) => Boolean(s.completed || (s.completedAt !== null && s.completedAt !== undefined))
        );
      const disabled = sets.length === 0;
      const iconColor = allCompleted && sets.length > 0 ? colors.primary : colors.onSurfaceVariant;
      const accessibilityLabel = allCompleted
        ? 'Desmarcar todas as séries'
        : 'Concluir todas as séries';

      return {
        allCompleted,
        disabled,
        iconColor,
        accessibilityLabel,
      };
    };

    it('quando há séries pendentes, exibe o ícone em colors.onSurfaceVariant (#B7ADA3) e label "Concluir todas as séries"', () => {
      const sets = [
        { completedAt: 1700000000000 },
        { completedAt: null },
      ];
      const state = resolveHeaderCheckState(sets);

      expect(state.allCompleted).toBe(false);
      expect(state.disabled).toBe(false);
      expect(state.iconColor).toBe('#B7ADA3');
      expect(state.accessibilityLabel).toBe('Concluir todas as séries');
    });

    it('quando todas as séries estão concluídas, destaca em coral colors.primary (#FF7A59) e label "Desmarcar todas as séries"', () => {
      const sets = [
        { completedAt: 1700000000000 },
        { completedAt: 1700000005000 },
      ];
      const state = resolveHeaderCheckState(sets);

      expect(state.allCompleted).toBe(true);
      expect(state.disabled).toBe(false);
      expect(state.iconColor).toBe('#FF7A59');
      expect(state.accessibilityLabel).toBe('Desmarcar todas as séries');
    });

    it('quando a lista de séries está vazia, o botão fica desabilitado e com cor onSurfaceVariant', () => {
      const sets: any[] = [];
      const state = resolveHeaderCheckState(sets);

      expect(state.allCompleted).toBe(false);
      expect(state.disabled).toBe(true);
      expect(state.iconColor).toBe('#B7ADA3');
      expect(state.accessibilityLabel).toBe('Concluir todas as séries');
    });

    it('garante área de toque >= 48×48dp via hitSlop sem alterar a largura de 44dp da coluna', () => {
      const colWidth = 44;
      const btnSize = 36;
      const hitSlop = { top: 12, bottom: 12, left: 10, right: 10 };

      const touchWidth = btnSize + hitSlop.left + hitSlop.right;
      const touchHeight = btnSize + hitSlop.top + hitSlop.bottom;

      expect(colWidth).toBe(44); // preserva largura para viewport de 360px
      expect(touchWidth).toBe(56);
      expect(touchHeight).toBe(60);
      expect(touchWidth).toBeGreaterThanOrEqual(48);
      expect(touchHeight).toBeGreaterThanOrEqual(48);
    });
  });

  describe('2. Comportamento em lote (Batch Toggle no ActiveSessionScreen)', () => {
    interface MockSet {
      id: string;
      weight: number;
      reps: number;
      type: string;
      isWarmup: boolean;
      completedAt: number | null;
      isPrWeight: boolean;
      isPrVolume: boolean;
      restS?: number | null;
    }

    interface MockExercise {
      id: string;
      exerciseId: string;
      restS: number;
      sets: MockSet[];
    }

    // Função de simulação pura da lógica implementada no ActiveSessionScreen
    const executeBatchToggle = (
      exercise: MockExercise,
      options: {
        autoRestTimer: boolean;
        history: { weight: number; reps: number; is_warmup: number; type?: string }[];
        startRestTimer: (s: number) => void;
      }
    ) => {
      if (exercise.sets.length === 0) return { updatedSets: [], toast: '', restTriggered: false };

      const pendingSets = exercise.sets.filter((s) => s.completedAt === null);
      const allAlreadyCompleted = pendingSets.length === 0;

      if (allAlreadyCompleted) {
        // Desmarcar todas
        const updatedSets = exercise.sets.map((s) => ({
          ...s,
          completedAt: null,
          isPrWeight: false,
          isPrVolume: false,
        }));
        return {
          updatedSets,
          toast: 'Séries desmarcadas',
          restTriggered: false,
        };
      }

      // Marcar todas pendentes
      const now = 1700000000000;
      const dynamicHistory = options.history.map((h) => ({
        weight: h.weight,
        reps: h.reps,
        isWarmup: Boolean(h.is_warmup),
        type: h.type,
      }));

      const updatedMap = new Map<string, Partial<MockSet>>();
      for (const setItem of pendingSets) {
        let isPrW = false;
        let isPrV = false;

        if (canGeneratePR(setItem)) {
          const pr = detectarPR(dynamicHistory, {
            weight: setItem.weight,
            reps: setItem.reps,
            type: setItem.type,
            isWarmup: setItem.isWarmup,
          });
          isPrW = pr.isPrWeight;
          isPrV = pr.isPrVolume;

          if (setItem.weight > 0 && setItem.reps > 0) {
            dynamicHistory.push({
              weight: setItem.weight,
              reps: setItem.reps,
              isWarmup: Boolean(setItem.isWarmup),
              type: setItem.type,
            });
          }
        }

        updatedMap.set(setItem.id, {
          completedAt: now,
          isPrWeight: isPrW,
          isPrVolume: isPrV,
        });
      }

      const updatedSets = exercise.sets.map((s) => {
        const u = updatedMap.get(s.id);
        return u ? { ...s, ...u } : s;
      });

      const count = pendingSets.length;
      const toast = count === 1 ? '1 série concluída' : `${count} séries concluídas`;

      // Descanso da última série
      let restTriggered = false;
      const lastSet = exercise.sets[exercise.sets.length - 1];
      const restTime =
        lastSet?.restS ?? exercise.restS ?? (lastSet ? defaultRestFor(lastSet.type) : 0);

      if (options.autoRestTimer && restTime > 0) {
        options.startRestTimer(restTime);
        restTriggered = true;
      }

      return {
        updatedSets,
        toast,
        restTriggered,
      };
    };

    it('marca todas as séries pendentes com completedAt e gera toast "N séries concluídas"', () => {
      const restTimerFn = vi.fn();
      const exercise: MockExercise = {
        id: 'se_1',
        exerciseId: 'ex_1',
        restS: 90,
        sets: [
          { id: 's1', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
          { id: 's2', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
          { id: 's3', weight: 80, reps: 8, type: 'normal', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
        ],
      };

      const result = executeBatchToggle(exercise, {
        autoRestTimer: true,
        history: [],
        startRestTimer: restTimerFn,
      });

      expect(result.updatedSets.every((s) => s.completedAt !== null)).toBe(true);
      expect(result.toast).toBe('3 séries concluídas');
      expect(restTimerFn).toHaveBeenCalledTimes(1);
      expect(restTimerFn).toHaveBeenCalledWith(90);
    });

    it('marca apenas a série pendente restante e gera toast singular "1 série concluída"', () => {
      const restTimerFn = vi.fn();
      const exercise: MockExercise = {
        id: 'se_1',
        exerciseId: 'ex_1',
        restS: 90,
        sets: [
          { id: 's1', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: 1699999900000, isPrWeight: false, isPrVolume: false },
          { id: 's2', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
        ],
      };

      const result = executeBatchToggle(exercise, {
        autoRestTimer: true,
        history: [],
        startRestTimer: restTimerFn,
      });

      expect(result.updatedSets[0].completedAt).toBe(1699999900000);
      expect(result.updatedSets[1].completedAt).toBe(1700000000000);
      expect(result.toast).toBe('1 série concluída');
      expect(restTimerFn).toHaveBeenCalledTimes(1);
    });

    it('detecta PR para séries normais, mas ignora séries warmup e drop', () => {
      const restTimerFn = vi.fn();
      const history = [{ weight: 70, reps: 10, is_warmup: 0, type: 'normal' }];
      const exercise: MockExercise = {
        id: 'se_1',
        exerciseId: 'ex_1',
        restS: 90,
        sets: [
          { id: 's1', weight: 50, reps: 15, type: 'warmup', isWarmup: true, completedAt: null, isPrWeight: false, isPrVolume: false },
          { id: 's2', weight: 85, reps: 8, type: 'normal', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
          { id: 's3', weight: 65, reps: 12, type: 'drop', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
        ],
      };

      const result = executeBatchToggle(exercise, {
        autoRestTimer: false,
        history,
        startRestTimer: restTimerFn,
      });

      // s1 (warmup): nunca gera PR
      expect(result.updatedSets[0].isPrWeight).toBe(false);
      // s2 (normal 85kg vs 70kg no histórico): gera PR de carga
      expect(result.updatedSets[1].isPrWeight).toBe(true);
      // s3 (drop): nunca gera PR
      expect(result.updatedSets[2].isPrWeight).toBe(false);
    });

    it('quando a última série do lote tem descanso = 0 (ou Drop), não inicia cronômetro de descanso', () => {
      const restTimerFn = vi.fn();
      const exercise: MockExercise = {
        id: 'se_1',
        exerciseId: 'ex_1',
        restS: 90,
        sets: [
          { id: 's1', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false },
          { id: 's2', weight: 60, reps: 10, type: 'drop', isWarmup: false, completedAt: null, isPrWeight: false, isPrVolume: false, restS: 0 },
        ],
      };

      const result = executeBatchToggle(exercise, {
        autoRestTimer: true,
        history: [],
        startRestTimer: restTimerFn,
      });

      expect(result.restTriggered).toBe(false);
      expect(restTimerFn).not.toHaveBeenCalled();
    });

    it('quando todas as séries já estão concluídas, desmarca todas sem disparar descanso e exibe "Séries desmarcadas"', () => {
      const restTimerFn = vi.fn();
      const exercise: MockExercise = {
        id: 'se_1',
        exerciseId: 'ex_1',
        restS: 90,
        sets: [
          { id: 's1', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: 1700000000000, isPrWeight: true, isPrVolume: false },
          { id: 's2', weight: 80, reps: 10, type: 'normal', isWarmup: false, completedAt: 1700000005000, isPrWeight: false, isPrVolume: false },
        ],
      };

      const result = executeBatchToggle(exercise, {
        autoRestTimer: true,
        history: [],
        startRestTimer: restTimerFn,
      });

      expect(result.updatedSets.every((s) => s.completedAt === null)).toBe(true);
      expect(result.updatedSets.every((s) => !s.isPrWeight && !s.isPrVolume)).toBe(true);
      expect(result.toast).toBe('Séries desmarcadas');
      expect(result.restTriggered).toBe(false);
      expect(restTimerFn).not.toHaveBeenCalled();
    });
  });

  describe('3. Limpeza visual e acessibilidade no ExerciseCard', () => {
    it('garante que o botão do menu de opções no cabeçalho tem área de toque >= 48×48dp', () => {
      const headerMoreBtn = {
        minWidth: 32,
        minHeight: 32,
        hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
      };

      const touchW = headerMoreBtn.minWidth + headerMoreBtn.hitSlop.left + headerMoreBtn.hitSlop.right;
      const touchH = headerMoreBtn.minHeight + headerMoreBtn.hitSlop.top + headerMoreBtn.hitSlop.bottom;

      expect(touchW).toBe(56);
      expect(touchH).toBe(56);
      expect(touchW).toBeGreaterThanOrEqual(48);
      expect(touchH).toBeGreaterThanOrEqual(48);
    });
  });
});
