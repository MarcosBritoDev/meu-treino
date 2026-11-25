import { describe, it, expect } from 'vitest';
import {
  formatTempoRelativoLog,
  calculateNextScheduledWorkoutIndex,
  formatSequenceChips,
} from '../../domain/workouts';

describe('Tela 3.3 - Detalhe do Grupo (Lógica de Domínio e Regras do Ciclo)', () => {
  describe('Cálculo do Próximo Treino do Ciclo ("Programado para hoje")', () => {
    const mockWorkouts = [
      { id: 'w_push', name: 'Push A', position: 0 },
      { id: 'w_pull', name: 'Pull A', position: 1 },
      { id: 'w_legs', name: 'Legs A', position: 2 },
    ];

    it('define o primeiro treino (Push A) como "Programado para hoje" quando nunca treinado', () => {
      const idx = calculateNextScheduledWorkoutIndex(mockWorkouts, null);
      expect(idx).toBe(0);
      expect(mockWorkouts[idx].name).toBe('Push A');
    });

    it('avança "Programado para hoje" para Pull A após a conclusão de Push A (Critério de Pronto)', () => {
      const idx = calculateNextScheduledWorkoutIndex(mockWorkouts, 'w_push');
      expect(idx).toBe(1);
      expect(mockWorkouts[idx].name).toBe('Pull A');
    });

    it('avança para Legs A após a conclusão de Pull A', () => {
      const idx = calculateNextScheduledWorkoutIndex(mockWorkouts, 'w_pull');
      expect(idx).toBe(2);
      expect(mockWorkouts[idx].name).toBe('Legs A');
    });

    it('retorna ao início do ciclo (Push A) após a conclusão de Legs A', () => {
      const idx = calculateNextScheduledWorkoutIndex(mockWorkouts, 'w_legs');
      expect(idx).toBe(0);
      expect(mockWorkouts[idx].name).toBe('Push A');
    });

    it('retorna 0 se o id do último concluído não pertencer mais ao grupo', () => {
      const idx = calculateNextScheduledWorkoutIndex(mockWorkouts, 'w_outro');
      expect(idx).toBe(0);
    });

    it('retorna -1 se lista de treinos estiver vazia', () => {
      const idx = calculateNextScheduledWorkoutIndex([], null);
      expect(idx).toBe(-1);
    });
  });

  describe('Formatação de Último Log (formatTempoRelativoLog)', () => {
    const fixedNow = new Date('2026-11-25T12:00:00Z').getTime();
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;

    it('retorna "Nunca treinado" quando timestamp é nulo', () => {
      expect(formatTempoRelativoLog(null, fixedNow)).toBe('Nunca treinado');
    });

    it('retorna "Último log hoje" para treinos de menos de 24 horas atrás', () => {
      const fiveHoursAgo = fixedNow - 5 * hourMs;
      expect(formatTempoRelativoLog(fiveHoursAgo, fixedNow)).toBe('Último log hoje');
    });

    it('retorna "Último log ontem" para treinos de 1 dia atrás (24h a 48h)', () => {
      const oneDayAgo = fixedNow - 28 * hourMs;
      expect(formatTempoRelativoLog(oneDayAgo, fixedNow)).toBe('Último log ontem');
    });

    it('retorna "Último log há X dias" para 2 ou mais dias atrás', () => {
      const twoDaysAgo = fixedNow - 50 * hourMs;
      expect(formatTempoRelativoLog(twoDaysAgo, fixedNow)).toBe('Último log há 2 dias');

      const fiveDaysAgo = fixedNow - 5 * dayMs;
      expect(formatTempoRelativoLog(fiveDaysAgo, fixedNow)).toBe('Último log há 5 dias');
    });
  });

  describe('Sequência de Carga (Chips dos Primeiros Exercícios)', () => {
    it('formata 4 chips e indicador excedente para treino com 5 exercícios', () => {
      const exercises = [
        'Supino Inclinado',
        'Desenvolvimento Halteres',
        'Crucifixo Halteres',
        'Elevação Lateral',
        'Tríceps Corda',
      ];
      const result = formatSequenceChips(exercises);
      expect(result.chips).toHaveLength(4);
      expect(result.chips).toEqual([
        'Supino Inclinado',
        'Desenvolvimento Halteres',
        'Crucifixo Halteres',
        'Elevação Lateral',
      ]);
      expect(result.extraCount).toBe(1);
      expect(result.extraText).toBe('+1 exercício');
    });

    it('formata chips sem indicador excedente para treino com até 4 exercícios', () => {
      const exercises = ['Agachamento Livre', 'Leg Press 45', 'Cadeira Extensora'];
      const result = formatSequenceChips(exercises);
      expect(result.chips).toHaveLength(3);
      expect(result.extraCount).toBe(0);
      expect(result.extraText).toBeNull();
    });

    it('lida com lista vazia de exercícios', () => {
      const result = formatSequenceChips([]);
      expect(result.chips).toHaveLength(0);
      expect(result.extraCount).toBe(0);
      expect(result.extraText).toBeNull();
    });
  });
});
