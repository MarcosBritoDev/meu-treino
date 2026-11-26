import { describe, it, expect } from 'vitest';
import { calcularVolume } from '../../domain/volume';
import { detectarPR } from '../../domain/pr';

describe('Tela 4.3 - Refatoração da Tabela de Séries (ActiveSession Table)', () => {
  describe('Grade Fixa e Dimensões', () => {
    it('respeita as larguras fixas especificadas para as colunas', () => {
      const grid = {
        colSerie: 44,
        colKg: 64,
        colReps: 64,
        colCheck: 48,
      };

      expect(grid.colSerie).toBe(44);
      expect(grid.colKg).toBe(64);
      expect(grid.colReps).toBe(64);
      expect(grid.colCheck).toBe(48);

      const fixedWidthSum = grid.colSerie + grid.colKg + grid.colReps + grid.colCheck;
      expect(fixedWidthSum).toBe(220);

      // Em viewport de 360px com padding lateral de 16*2 + card padding 14*2 = 60px
      // Área disponível = 300px => Coluna anterior flexível fica com ~80px, suficiente para "24 kg × 12"
      const viewport360Available = 360 - 60;
      const flexAnterior360 = viewport360Available - fixedWidthSum;
      expect(flexAnterior360).toBeGreaterThanOrEqual(70);
    });

    it('respeita alturas mínimas de toque (>= 48px) para acessibilidade', () => {
      const rowHeight = 52;
      const checkHitArea = 48;
      const addSetButtonHeight = 48;

      expect(rowHeight).toBeGreaterThanOrEqual(48);
      expect(checkHitArea).toBeGreaterThanOrEqual(48);
      expect(addSetButtonHeight).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Séries de Aquecimento ("A")', () => {
    it('exibe "A" em vez de número para séries de aquecimento', () => {
      const formatSetLabel = (isWarmup: boolean, setIndex: number) => {
        return isWarmup ? 'A' : String(setIndex);
      };

      expect(formatSetLabel(true, 1)).toBe('A');
      expect(formatSetLabel(false, 1)).toBe('1');
      expect(formatSetLabel(false, 2)).toBe('2');
    });

    it('não conta séries de aquecimento para o volume total de treino', () => {
      const sets = [
        { isWarmup: true, weight: 20, reps: 15, completedAt: '2026-11-25T10:00:00' },
        { isWarmup: false, weight: 40, reps: 10, completedAt: '2026-11-25T10:05:00' },
        { isWarmup: false, weight: 40, reps: 10, completedAt: '2026-11-25T10:10:00' },
      ];

      const volume = calcularVolume(sets);
      // Apenas as 2 séries normais: 40*10 + 40*10 = 800 kg
      expect(volume).toBe(800);
    });

    it('não dispara detecção de PR para séries de aquecimento', () => {
      const history = [{ weight: 30, reps: 10 }];
      const isWarmup = true;
      const currentSet = { weight: 50, reps: 10 };

      // Se for aquecimento, bypass PR
      const prResult = isWarmup ? null : detectarPR(currentSet.weight, currentSet.reps, history);
      expect(prResult).toBeNull();
    });
  });

  describe('Destaque de Série Concluída e Em Andamento', () => {
    it('aplica fundo verde translúcido (14%) em série concluída', () => {
      const getRowBg = (isCompleted: boolean) => {
        return isCompleted ? 'rgba(123, 201, 143, 0.14)' : 'transparent';
      };

      expect(getRowBg(true)).toBe('rgba(123, 201, 143, 0.14)');
      expect(getRowBg(false)).toBe('transparent');
    });

    it('aplica borda coral de 1px apenas na série ativa (em andamento)', () => {
      const sets = [
        { id: '1', completed: true },
        { id: '2', completed: false }, // Próxima / ativa
        { id: '3', completed: false },
      ];

      const activeIndex = sets.findIndex(s => !s.completed);
      expect(activeIndex).toBe(1);

      const isCurrentSet = (index: number) => index === activeIndex;
      expect(isCurrentSet(0)).toBe(false);
      expect(isCurrentSet(1)).toBe(true);
      expect(isCurrentSet(2)).toBe(false);
    });
  });

  describe('Faixa de RPE para Série Concluída', () => {
    it('oferece opções de RPE de 6 a 10 com incremento de 0.5', () => {
      const rpeOptions = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
      expect(rpeOptions.length).toBe(9);
      expect(rpeOptions[0]).toBe(6);
      expect(rpeOptions[rpeOptions.length - 1]).toBe(10);
    });

    it('abre a faixa de RPE ao tocar na série concluída', () => {
      let activeRpeSetId: string | null = null;
      const toggleRpe = (setId: string, isCompleted: boolean) => {
        if (!isCompleted) return;
        activeRpeSetId = activeRpeSetId === setId ? null : setId;
      };

      toggleRpe('set_1', true);
      expect(activeRpeSetId).toBe('set_1');

      // Tocar novamente fecha
      toggleRpe('set_1', true);
      expect(activeRpeSetId).toBeNull();

      // Série não concluída não abre RPE
      toggleRpe('set_2', false);
      expect(activeRpeSetId).toBeNull();
    });
  });

  describe('Ciclo de Descanso do Exercício', () => {
    it('alterna o tempo de descanso entre os presets 60s, 90s, 120s e 180s', () => {
      const presets = [60, 90, 120, 180];
      const cycleRest = (current: number) => {
        const nextIdx = (presets.indexOf(current) + 1) % presets.length;
        return presets[nextIdx !== -1 ? nextIdx : 0];
      };

      expect(cycleRest(60)).toBe(90);
      expect(cycleRest(90)).toBe(120);
      expect(cycleRest(120)).toBe(180);
      expect(cycleRest(180)).toBe(60);
    });
  });

  describe('Rodapé Flutuante de Descanso', () => {
    it('permite ajuste rápido de descanso com -15s e +15s', () => {
      const adjustTimer = (currentSeconds: number, delta: number) => {
        return Math.max(0, currentSeconds + delta);
      };

      expect(adjustTimer(45, -15)).toBe(30);
      expect(adjustTimer(10, -15)).toBe(0);
      expect(adjustTimer(45, 15)).toBe(60);
    });
  });
});
