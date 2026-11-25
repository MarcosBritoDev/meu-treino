import { describe, it, expect } from 'vitest';
import {
  calcularVolume,
  detectarPR,
  formatarPeso,
  proximaCarga,
  estimarDuracao,
  formatarDuracao,
  converterLbParaKg,
} from '../index';

describe('Serviços de Domínio — Volt Precision', () => {
  describe('calcularVolume', () => {
    it('deve retornar 0 para lista de séries vazia', () => {
      expect(calcularVolume([])).toBe(0);
    });

    it('deve somar carga x reps para séries normais concluídas', () => {
      const sets = [
        { weight: 80, reps: 10, isWarmup: false, completedAt: 1700000000 },
        { weight: 85, reps: 8, isWarmup: false, completedAt: 1700000100 },
      ];
      // 80*10 + 85*8 = 800 + 680 = 1480
      expect(calcularVolume(sets, 'Barra')).toBe(1480);
    });

    it('deve ignorar séries de aquecimento', () => {
      const sets = [
        { weight: 40, reps: 15, isWarmup: true, completedAt: 1700000000 },
        { weight: 80, reps: 10, isWarmup: false, completedAt: 1700000100 },
      ];
      // Apenas a segunda: 80*10 = 800
      expect(calcularVolume(sets, 'Barra')).toBe(800);
    });

    it('deve ignorar séries não concluídas (completedAt nulo ou falso)', () => {
      const sets = [
        { weight: 80, reps: 10, isWarmup: false, completedAt: 1700000000 },
        { weight: 85, reps: 8, isWarmup: false, completedAt: null },
      ];
      expect(calcularVolume(sets, 'Barra')).toBe(800);
    });

    it('deve multiplicar a carga por 2 quando o equipamento for Halteres', () => {
      const sets = [
        { weight: 24, reps: 10, isWarmup: false, completedAt: 1700000000 }, // 24kg cada halter = 48kg * 10 = 480
        { weight: 26, reps: 8, isWarmup: false, completedAt: 1700000100 },  // 26kg cada halter = 52kg * 8 = 416
      ];
      // 480 + 416 = 896
      expect(calcularVolume(sets, 'Halteres')).toBe(896);
    });

    it('deve arredondar o volume a 2 casas decimais', () => {
      const sets = [
        { weight: 32.5, reps: 7, isWarmup: false, completedAt: 1700000000 },
      ];
      expect(calcularVolume(sets, 'Barra')).toBe(227.5);
    });
  });

  describe('detectarPR', () => {
    it('deve considerar a primeira série válida como PR de carga e volume se não houver histórico', () => {
      const novaSerie = { weight: 100, reps: 5 };
      const resultado = detectarPR([], novaSerie);
      expect(resultado.isPrWeight).toBe(true);
      expect(resultado.isPrVolume).toBe(true);
    });

    it('não deve considerar PR para séries com carga zero ou repetições zero', () => {
      expect(detectarPR([], { weight: 0, reps: 10 })).toEqual({ isPrWeight: false, isPrVolume: false });
      expect(detectarPR([], { weight: 100, reps: 0 })).toEqual({ isPrWeight: false, isPrVolume: false });
    });

    it('deve identificar PR de carga quando a nova série supera a maior carga anterior', () => {
      const historico = [
        { weight: 100, reps: 5 },
        { weight: 90, reps: 8 },
      ];
      const novaSerie = { weight: 105, reps: 3 };
      const resultado = detectarPR(historico, novaSerie);
      expect(resultado.isPrWeight).toBe(true);
    });

    it('deve desempatar por repetições quando a carga for igual à maior carga anterior', () => {
      const historico = [
        { weight: 100, reps: 5 },
        { weight: 90, reps: 8 },
      ];
      // Mesma carga 100, mais reps (6 > 5) -> PR!
      const serieComMaisReps = { weight: 100, reps: 6 };
      expect(detectarPR(historico, serieComMaisReps).isPrWeight).toBe(true);

      // Mesma carga 100, menos reps (4 < 5) -> Não é PR de carga
      const serieComMenosReps = { weight: 100, reps: 4 };
      expect(detectarPR(historico, serieComMenosReps).isPrWeight).toBe(false);

      // Mesma carga 100, reps iguais (5 == 5) -> Não é PR novo
      const serieComMesmasReps = { weight: 100, reps: 5 };
      expect(detectarPR(historico, serieComMesmasReps).isPrWeight).toBe(false);
    });

    it('deve detectar PR de volume unitário mesmo quando a carga não for PR de peso', () => {
      const historico = [
        { weight: 120, reps: 2 }, // vol: 240
        { weight: 100, reps: 5 }, // vol: 500
      ];
      // Carga 90kg (não é PR de carga), mas 8 reps = 720kg de volume (> 500)
      const novaSerie = { weight: 90, reps: 8 };
      const resultado = detectarPR(historico, novaSerie);
      expect(resultado.isPrWeight).toBe(false);
      expect(resultado.isPrVolume).toBe(true);
    });
  });

  describe('formatarPeso', () => {
    it('deve formatar valores inteiros em kg com unidade', () => {
      expect(formatarPeso(80, 'kg')).toBe('80 kg');
    });

    it('deve formatar valores com casas decimais usando vírgula', () => {
      expect(formatarPeso(82.5, 'kg')).toBe('82,5 kg');
      expect(formatarPeso(82.25, 'kg')).toBe('82,25 kg');
    });

    it('deve converter para lb quando a unidade for lb', () => {
      // 100 kg * 2.2046226 = 220.46... -> 220,5 lb
      expect(formatarPeso(100, 'lb')).toBe('220,5 lb');
    });

    it('deve converter lb de volta para kg corretamente', () => {
      // 220.46 lb -> ~100 kg
      expect(converterLbParaKg(220.462)).toBe(100);
    });
  });

  describe('proximaCarga', () => {
    it('deve somar incremento ao subir', () => {
      expect(proximaCarga(80, 2.5, 'up')).toBe(82.5);
      expect(proximaCarga(82.5, 2.5, 'up')).toBe(85);
    });

    it('deve subtrair incremento ao descer', () => {
      expect(proximaCarga(80, 2.5, 'down')).toBe(77.5);
      expect(proximaCarga(2.5, 2.5, 'down')).toBe(0);
    });

    it('nunca deve retornar carga negativa', () => {
      expect(proximaCarga(1, 2.5, 'down')).toBe(0);
      expect(proximaCarga(0, 2.5, 'down')).toBe(0);
    });

    it('deve evitar erros de ponto flutuante do JavaScript', () => {
      // Ex: 10.1 + 0.2 em JS puro costuma dar 10.300000000000002
      expect(proximaCarga(10.1, 0.2, 'up')).toBe(10.3);
    });
  });

  describe('estimarDuracao e formatarDuracao', () => {
    it('deve retornar 0 para treino vazio', () => {
      expect(estimarDuracao({ exercises: [] })).toBe(0);
    });

    it('deve calcular execução ativa + descansos descontando o último descanso', () => {
      const workout = {
        exercises: [
          { targetSets: 3, restS: 90 }, // 3 sets * 45s = 135s
          { targetSets: 3, restS: 60 }, // 3 sets * 45s = 135s
        ],
      };
      // Total sets = 6. Execução ativa = 6 * 45 = 270s
      // Total descansos = 3*90 + 3*60 = 270 + 180 = 450s
      // Desconta o último descanso (60s) = 390s de descanso
      // Duração = 270 + 390 = 660s (11 min)
      expect(estimarDuracao(workout)).toBe(660);
    });

    it('deve formatar durações em português sentence case', () => {
      expect(formatarDuracao(0)).toBe('0 min');
      expect(formatarDuracao(45)).toBe('1 min');
      expect(formatarDuracao(660)).toBe('11 min');
      expect(formatarDuracao(3600)).toBe('1 h');
      expect(formatarDuracao(4500)).toBe('1 h 15 min');
    });
  });
});
