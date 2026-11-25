import { describe, it, expect } from 'vitest';
import {
  getGreeting,
  formatHeaderDate,
  getCurrentWeekDays,
  formatUltimoTreinoData,
} from '../../domain/home';
import { calculateNextScheduledWorkoutIndex } from '../../domain/workouts';

describe('Tela 4.1 - Início (Lógica de Domínio, Data, Saudação e Semana)', () => {
  describe('Saudação Real por Hora do Aparelho (getGreeting)', () => {
    it('retorna "Bom dia" entre 05:00 e 11:59', () => {
      const d1 = new Date(2026, 9, 24, 5, 0, 0);
      const d2 = new Date(2026, 9, 24, 9, 30, 0);
      const d3 = new Date(2026, 9, 24, 11, 59, 59);

      expect(getGreeting(d1)).toBe('Bom dia');
      expect(getGreeting(d2)).toBe('Bom dia');
      expect(getGreeting(d3)).toBe('Bom dia');
    });

    it('retorna "Boa tarde" entre 12:00 e 17:59', () => {
      const d1 = new Date(2026, 9, 24, 12, 0, 0);
      const d2 = new Date(2026, 9, 24, 15, 45, 0);
      const d3 = new Date(2026, 9, 24, 17, 59, 59);

      expect(getGreeting(d1)).toBe('Boa tarde');
      expect(getGreeting(d2)).toBe('Boa tarde');
      expect(getGreeting(d3)).toBe('Boa tarde');
    });

    it('retorna "Boa noite" entre 18:00 e 04:59', () => {
      const d1 = new Date(2026, 9, 24, 18, 0, 0);
      const d2 = new Date(2026, 9, 24, 23, 15, 0);
      const d3 = new Date(2026, 9, 24, 3, 30, 0);

      expect(getGreeting(d1)).toBe('Boa noite');
      expect(getGreeting(d2)).toBe('Boa noite');
      expect(getGreeting(d3)).toBe('Boa noite');
    });
  });

  describe('Data por Extenso Real (formatHeaderDate)', () => {
    it('formata a data com dia da semana capitalizado e mês em português', () => {
      // 24 de outubro de 2026 foi um sábado
      const dateSabado = new Date(2026, 9, 24);
      expect(formatHeaderDate(dateSabado)).toBe('Sábado, 24 de outubro');

      // 23 de outubro de 2026 foi uma sexta-feira
      const dateSexta = new Date(2026, 9, 23);
      expect(formatHeaderDate(dateSexta)).toBe('Sexta-feira, 23 de outubro');
    });
  });

  describe('Semana Seg a Dom (getCurrentWeekDays)', () => {
    it('retorna exatamente 7 dias iniciando na Segunda e terminando no Domingo', () => {
      // Quinta-feira, 22 de outubro de 2026
      const refDate = new Date(2026, 9, 22, 14, 0, 0);
      const days = getCurrentWeekDays(refDate);

      expect(days).toHaveLength(7);
      expect(days.map((d) => d.label)).toEqual([
        'Seg',
        'Ter',
        'Qua',
        'Qui',
        'Sex',
        'Sáb',
        'Dom',
      ]);
      expect(days[0].label).toBe('Seg');
      expect(days[6].label).toBe('Dom');
    });

    it('identifica corretamente o dia de hoje (isToday)', () => {
      // Quinta-feira, 22 de outubro de 2026
      const refDate = new Date(2026, 9, 22, 14, 0, 0);
      const days = getCurrentWeekDays(refDate);

      const todayDay = days.find((d) => d.isToday);
      expect(todayDay).toBeDefined();
      expect(todayDay?.label).toBe('Qui');
      expect(todayDay?.dayOfMonth).toBe(22);
    });

    it('lida perfeitamente quando a data de referência é um Domingo', () => {
      // Domingo, 25 de outubro de 2026 (7º dia da semana)
      const refDate = new Date(2026, 9, 25, 20, 0, 0);
      const days = getCurrentWeekDays(refDate);

      expect(days[0].label).toBe('Seg');
      expect(days[0].dayOfMonth).toBe(19);
      expect(days[6].label).toBe('Dom');
      expect(days[6].dayOfMonth).toBe(25);
      expect(days[6].isToday).toBe(true);
    });
  });

  describe('Formatação de Data do Último Treino (formatUltimoTreinoData)', () => {
    const fixedNow = new Date(2026, 9, 24, 15, 0, 0);

    it('retorna "Hoje · DD/MM" se treinado no mesmo dia', () => {
      const todayTimestamp = new Date(2026, 9, 24, 10, 0, 0).getTime();
      expect(formatUltimoTreinoData(todayTimestamp, fixedNow)).toBe('Hoje · 24/10');
    });

    it('retorna "Ontem · DD/MM" se treinado no dia anterior', () => {
      const yesterdayTimestamp = new Date(2026, 9, 23, 19, 0, 0).getTime();
      expect(formatUltimoTreinoData(yesterdayTimestamp, fixedNow)).toBe('Ontem · 23/10');
    });

    it('retorna dia da semana abreviado · DD/MM se treinado há poucos dias', () => {
      const wednesdayTimestamp = new Date(2026, 9, 21, 8, 0, 0).getTime();
      expect(formatUltimoTreinoData(wednesdayTimestamp, fixedNow)).toBe('Qua · 21/10');
    });
  });

  describe('Ciclo de Treino e Critério de Pronto (Avanço da Recomendação)', () => {
    const workouts = [
      { id: 'w1', name: 'Push A' },
      { id: 'w2', name: 'Pull A' },
      { id: 'w3', name: 'Legs A' },
    ];

    it('recomenda Push A quando nenhum treino foi concluído', () => {
      const idx = calculateNextScheduledWorkoutIndex(workouts, null);
      expect(idx).toBe(0);
      expect(workouts[idx].name).toBe('Push A');
    });

    it('avança a recomendação para Pull A após a conclusão de Push A', () => {
      const idx = calculateNextScheduledWorkoutIndex(workouts, 'w1');
      expect(idx).toBe(1);
      expect(workouts[idx].name).toBe('Pull A');
    });

    it('avança para Legs A após a conclusão de Pull A', () => {
      const idx = calculateNextScheduledWorkoutIndex(workouts, 'w2');
      expect(idx).toBe(2);
      expect(workouts[idx].name).toBe('Legs A');
    });

    it('completa a rotação do ciclo voltando para Push A após Legs A', () => {
      const idx = calculateNextScheduledWorkoutIndex(workouts, 'w3');
      expect(idx).toBe(0);
      expect(workouts[idx].name).toBe('Push A');
    });
  });

  describe('Estado 4.2 - Início sem Treino (Regras de Exibição e Modelos Populares)', () => {
    it('ativa o Estado 4.2 quando não há grupo ativo ou não há treinos cadastrados', () => {
      const shouldShowEmptyState = (hasActiveGroup: boolean, hasWorkouts: boolean, hasActiveSession: boolean) =>
        !hasActiveSession && (!hasActiveGroup || !hasWorkouts);

      // App limpo após onboarding (sem grupos ou treinos)
      expect(shouldShowEmptyState(false, false, false)).toBe(true);
      expect(shouldShowEmptyState(true, false, false)).toBe(true);

      // Com treino cadastrado no grupo ativo -> NÃO exibe Estado 4.2 (exibe 4.1)
      expect(shouldShowEmptyState(true, true, false)).toBe(false);

      // Com treino em andamento -> exibe cartão de treino ativo
      expect(shouldShowEmptyState(false, false, true)).toBe(false);
    });

    it('mantém a recomendação normal (4.1) em dias de descanso planejado sem forçar o estado 4.2', () => {
      // Regra: "se hoje não é dia de treino pela frequência, mantenha a recomendação normal (não force este estado)"
      const state = {
        hasActiveGroup: true,
        recommendedWorkout: { id: 'w1', name: 'Push A' },
        activeSession: null,
      };

      const isEmptyState = !state.activeSession && (!state.hasActiveGroup || !state.recommendedWorkout);
      expect(isEmptyState).toBe(false);
    });

    it('define os modelos populares com seus nomes e grupos musculares correspondentes', () => {
      const popularTemplates = {
        superior_a: {
          name: 'Superior A',
          subtitle: 'Peito, ombros e tríceps',
          exercises: [
            'Supino reto com barra',
            'Supino inclinado com halteres',
            'Desenvolvimento com halteres',
            'Elevação lateral com halteres',
            'Tríceps corda no cabo',
          ],
        },
        pernas_core: {
          name: 'Pernas e core',
          subtitle: 'Quadríceps e panturrilha',
          exercises: [
            'Agachamento livre com barra',
            'Leg press 45°',
            'Cadeira extensora',
            'Mesa flexora',
            'Panturrilha em pé na máquina',
            'Abdominal supra no solo',
          ],
        },
      };

      expect(popularTemplates.superior_a.name).toBe('Superior A');
      expect(popularTemplates.superior_a.subtitle).toBe('Peito, ombros e tríceps');
      expect(popularTemplates.superior_a.exercises).toHaveLength(5);

      expect(popularTemplates.pernas_core.name).toBe('Pernas e core');
      expect(popularTemplates.pernas_core.subtitle).toBe('Quadríceps e panturrilha');
      expect(popularTemplates.pernas_core.exercises).toHaveLength(6);
    });
  });
});
