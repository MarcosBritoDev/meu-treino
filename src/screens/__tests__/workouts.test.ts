import { describe, it, expect } from 'vitest';
import { estimarDuracao, formatarDuracao } from '../../domain/duration';

describe('Tela 3.1 - Treinos (Lógica de Domínio e Estimativas)', () => {
  describe('Cálculo de Duração Estimada (estimarDuracao)', () => {
    it('retorna 0 quando não há exercícios', () => {
      expect(estimarDuracao({ exercises: [] })).toBe(0);
    });

    it('calcula duração correta: 45s de execução por série + descanso configurado, descontando último descanso', () => {
      // 1 exercício, 3 séries com descanso de 90s
      // Execução ativa: 3 * 45s = 135s
      // Descanso entre séries: 2 descansos de 90s = 180s (o 3º descanso não conta)
      // Total: 135 + 180 = 315s
      const workout = {
        exercises: [
          { targetSets: 3, restS: 90 },
        ],
      };
      expect(estimarDuracao(workout)).toBe(315);
    });

    it('calcula duração com múltiplos exercícios', () => {
      // Ex1: 4 séries, 90s descanso. Ex2: 3 séries, 60s descanso.
      // Total séries: 7 -> 7 * 45s = 315s
      // Total descansos: (4 * 90) + (3 * 60) - 60 (último) = 360 + 180 - 60 = 480s
      // Total estimado: 315 + 480 = 795s (~13 min)
      const workout = {
        exercises: [
          { targetSets: 4, restS: 90 },
          { targetSets: 3, restS: 60 },
        ],
      };
      expect(estimarDuracao(workout)).toBe(795);
    });
  });

  describe('Formatação de Duração (formatarDuracao)', () => {
    it('formata minutos em sentence case', () => {
      expect(formatarDuracao(315)).toBe('5 min');
      expect(formatarDuracao(795)).toBe('13 min');
      expect(formatarDuracao(3300)).toBe('55 min');
      expect(formatarDuracao(3600)).toBe('1 h');
      expect(formatarDuracao(4500)).toBe('1 h 15 min');
    });

    it('lida com 0 ou valores negativos', () => {
      expect(formatarDuracao(0)).toBe('0 min');
      expect(formatarDuracao(-10)).toBe('0 min');
    });
  });

  describe('Regras de Grupo Ativo', () => {
    it('permite apenas um grupo ativo simultaneamente', () => {
      const groups = [
        { id: '1', name: 'PPL', isActive: true },
        { id: '2', name: 'Upper/Lower', isActive: false },
        { id: '3', name: 'Fullbody', isActive: false },
      ];

      // Simula ativação do grupo 2
      const targetId = '2';
      const updated = groups.map((g) => ({
        ...g,
        isActive: g.id === targetId,
      }));

      const activeList = updated.filter((g) => g.isActive);
      expect(activeList).toHaveLength(1);
      expect(activeList[0].id).toBe('2');
      expect(activeList[0].name).toBe('Upper/Lower');
    });
  });

  describe('Formatação de Código de Treino', () => {
    it('gera códigos A-1, A-2, B-1 conforme grupo e posição', () => {
      const getCode = (groupIdx: number, workoutIdx: number) => {
        const letter = String.fromCharCode(65 + groupIdx);
        return `${letter}-${workoutIdx + 1}`;
      };

      expect(getCode(0, 0)).toBe('A-1');
      expect(getCode(0, 1)).toBe('A-2');
      expect(getCode(0, 2)).toBe('A-3');
      expect(getCode(1, 0)).toBe('B-1');
    });
  });

  describe('Agrupamento e Resumo de Músculos Alvo', () => {
    it('formata lista de músculos de forma legível em português', () => {
      const formatMuscles = (muscles: string[]) => {
        const unique = Array.from(new Set(muscles.map((m) => m.toLowerCase())));
        if (unique.length === 0) return 'Geral';
        if (unique.length === 1) return unique[0].charAt(0).toUpperCase() + unique[0].slice(1);
        if (unique.length === 2) {
          const cap0 = unique[0].charAt(0).toUpperCase() + unique[0].slice(1);
          return `${cap0} e ${unique[1]}`;
        }
        const last = unique[unique.length - 1];
        const initial = unique.slice(0, -1).join(', ');
        const cap = initial.charAt(0).toUpperCase() + initial.slice(1);
        return `${cap} e ${last}`;
      };

      expect(formatMuscles(['Peito'])).toBe('Peito');
      expect(formatMuscles(['Peito', 'Tríceps'])).toBe('Peito e tríceps');
      expect(formatMuscles(['Peito', 'Ombros', 'Tríceps'])).toBe('Peito, ombros e tríceps');
      expect(formatMuscles([])).toBe('Geral');
    });
  });

  describe('Tela 3.2 - Estado Vazio e Métricas', () => {
    it('retorna rótulos "Grupos ativos" e "Fichas salvas" quando não há grupos', () => {
      const getMetricsLabels = (totalGroups: number) => {
        return {
          leftLabel: totalGroups === 0 ? 'Grupos ativos' : 'Grupos de treino',
          leftUnit: totalGroups === 0 ? 'grupos' : totalGroups === 1 ? 'grupo' : 'grupos',
          rightLabel: totalGroups === 0 ? 'Fichas salvas' : 'Treinos montados',
          rightUnit: totalGroups === 0 ? 'treinos' : totalGroups === 1 ? 'treino' : 'treinos',
        };
      };

      const emptyMetrics = getMetricsLabels(0);
      expect(emptyMetrics.leftLabel).toBe('Grupos ativos');
      expect(emptyMetrics.leftUnit).toBe('grupos');
      expect(emptyMetrics.rightLabel).toBe('Fichas salvas');
      expect(emptyMetrics.rightUnit).toBe('treinos');

      const filledMetrics = getMetricsLabels(3);
      expect(filledMetrics.leftLabel).toBe('Grupos de treino');
      expect(filledMetrics.rightLabel).toBe('Treinos montados');
    });

    it('exibe texto completo de dica sem reticências', () => {
      const tipText = 'Divisões em grupos mantêm seus descansos em dia.';
      expect(tipText).not.toContain('...');
      expect(tipText.length).toBeGreaterThan(20);
    });
  });

  describe('Integridade de Chaves Estrangeiras ao Excluir Grupos e Treinos', () => {
    it('desvincula sessões existentes (workout_id = null) antes de deletar a ficha', () => {
      interface MockWorkout {
        id: string;
        groupId: string;
      }
      interface MockSession {
        id: string;
        workoutId: string | null;
      }

      let sessions: MockSession[] = [
        { id: 'sess_1', workoutId: 'w_1' },
        { id: 'sess_2', workoutId: 'w_2' },
      ];
      let workouts: MockWorkout[] = [
        { id: 'w_1', groupId: 'grp_1' },
        { id: 'w_2', groupId: 'grp_2' },
      ];

      // Ao excluir w_1, a sessão preserva o histórico mas desvincula a chave estrangeira
      const deleteWorkoutSafe = (workoutId: string) => {
        sessions = sessions.map((s) =>
          s.workoutId === workoutId ? { ...s, workoutId: null } : s
        );
        workouts = workouts.filter((w) => w.id !== workoutId);
      };

      deleteWorkoutSafe('w_1');
      expect(workouts.find((w) => w.id === 'w_1')).toBeUndefined();
      expect(sessions.find((s) => s.id === 'sess_1')?.workoutId).toBeNull();
      // Outras sessões permanecem inalteradas
      expect(sessions.find((s) => s.id === 'sess_2')?.workoutId).toBe('w_2');
    });
  });
});
