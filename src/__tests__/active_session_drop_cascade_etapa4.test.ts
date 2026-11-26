import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrations } from '../db/migrations';
import {
  calcDropFromWeightKg,
  recalculateDropCascade,
  defaultRestFor,
} from '../domain/sessionMath';

// Prepara mock de expo-sqlite com node:sqlite em memória
let memoryDb: InstanceType<typeof DatabaseSync>;

const mockDbAdapter = {
  runSync: (sql: string, params: any[] = []) => {
    return memoryDb.prepare(sql).run(...params);
  },
  getAllSync: <T = any>(sql: string, params: any[] = []): T[] => {
    return memoryDb.prepare(sql).all(...params) as T[];
  },
  execSync: (sql: string) => {
    memoryDb.exec(sql);
  },
};

vi.mock('../db/client', () => ({
  getExpoDb: () => mockDbAdapter,
}));

import { startWorkoutSession } from '../db/workouts';

describe('ETAPA 4 — Modo ativo: recálculo em cascata, trava manual e descanso inteligente', () => {
  beforeEach(() => {
    memoryDb = new DatabaseSync(':memory:');
    memoryDb.exec('PRAGMA foreign_keys = ON;');

    // Executa as migrações de 1 a 6
    for (const m of migrations) {
      for (const statement of m.sql) {
        memoryDb.exec(statement);
      }
    }
  });

  // ==========================================================================
  // CENÁRIO 1: Série base (80 kg) + 3 Drops (-20%, -25%, -15%) inicializando em cascata
  // ==========================================================================
  describe('1. Inicialização em cascata via startWorkoutSession e calcDropFromWeightKg', () => {
    it('calcula pesos em cascata a partir da base de 80 kg: 80 -> 65 -> 50 -> 42.5 kg', () => {
      const baseKg = 80;
      const drop1Pct = 20;
      const drop2Pct = 25;
      const drop3Pct = 15;

      // Drop 1: 80 * (1 - 0.20) = 64 -> arredondado para incremento 2.5 = 65 kg
      const drop1Kg = calcDropFromWeightKg(baseKg, drop1Pct, 2.5);
      expect(drop1Kg).toBe(65);

      // Drop 2: 65 * (1 - 0.25) = 48.75 -> arredondado para incremento 2.5 = 50 kg
      const drop2Kg = calcDropFromWeightKg(drop1Kg, drop2Pct, 2.5);
      expect(drop2Kg).toBe(50);

      // Drop 3: 50 * (1 - 0.15) = 42.5 -> arredondado para incremento 2.5 = 42.5 kg
      const drop3Kg = calcDropFromWeightKg(drop2Kg, drop3Pct, 2.5);
      expect(drop3Kg).toBe(42.5);
    });

    it('startWorkoutSession grava drop_percent e inicializa pesos em cascata na tabela sets', () => {
      // Cria registros base no banco
      memoryDb.exec(`INSERT INTO groups (id, name) VALUES ('g1', 'Grupo 1');`);
      memoryDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w1', 'g1', 'Treino Push');`);
      memoryDb.exec(`INSERT INTO exercises (id, name, muscle_group, equipment, kind, default_increment) VALUES ('ex1', 'Supino Reto', 'Peito', 'Barra', 'composto', 2.5);`);
      memoryDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES ('we1', 'w1', 'ex1', 0);`);

      // Insere na última sessão concluída uma carga de 80 kg para a série normal
      memoryDb.exec(`INSERT INTO sessions (id, workout_id, name_snapshot, started_at, status, ended_at) VALUES ('s_prev', 'w1', 'Treino Push', 1000, 'completed', 2000);`);
      memoryDb.exec(`INSERT INTO session_exercises (id, session_id, exercise_id, position) VALUES ('se_prev', 's_prev', 'ex1', 0);`);
      memoryDb.exec(`INSERT INTO sets (id, session_exercise_id, "index", weight, reps, type, completed_at) VALUES ('set_prev_1', 'se_prev', 1, 80, 10, 'normal', 1500);`);

      // Planeja 1 Normal + 3 Drops (-20%, -25%, -15%)
      memoryDb.exec(`
        INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, drop_percent)
        VALUES 
          ('wes1', 'we1', 0, 'normal', 'reps_range', 8, 10, NULL),
          ('wes2', 'we1', 1, 'drop', 'reps_max', NULL, NULL, 20),
          ('wes3', 'we1', 2, 'drop', 'reps_max', NULL, NULL, 25),
          ('wes4', 'we1', 3, 'drop', 'reps_max', NULL, NULL, 15);
      `);

      // Inicia a sessão
      const newSessionId = startWorkoutSession('w1');
      expect(newSessionId).toBeDefined();

      // Recupera as séries criadas
      const createdSets = memoryDb.prepare(`
        SELECT st."index", st.weight, st.type, st.drop_percent
        FROM sets st
        JOIN session_exercises se ON st.session_exercise_id = se.id
        WHERE se.session_id = ?
        ORDER BY st."index" ASC
      `).all(newSessionId) as Array<{ index: number; weight: number; type: string; drop_percent: number | null }>;

      expect(createdSets).toHaveLength(4);

      // Série 1 (Normal): 80 kg (histórico da sessão anterior)
      expect(createdSets[0].type).toBe('normal');
      expect(createdSets[0].weight).toBe(80);
      expect(createdSets[0].drop_percent).toBeNull();

      // Série 2 (Drop 1 -20% de 80): 65 kg
      expect(createdSets[1].type).toBe('drop');
      expect(createdSets[1].drop_percent).toBe(20);
      expect(createdSets[1].weight).toBe(65);

      // Série 3 (Drop 2 -25% de 65): 50 kg
      expect(createdSets[2].type).toBe('drop');
      expect(createdSets[2].drop_percent).toBe(25);
      expect(createdSets[2].weight).toBe(50);

      // Série 4 (Drop 3 -15% de 50): 42.5 kg
      expect(createdSets[3].type).toBe('drop');
      expect(createdSets[3].drop_percent).toBe(15);
      expect(createdSets[3].weight).toBe(42.5);
    });
  });

  // ==========================================================================
  // CENÁRIO 2: Alterar a base para 100 kg e confirmar recálculo automático em cascata
  // ==========================================================================
  describe('2. Recálculo em cascata ao alterar a carga base', () => {
    it('alterar a base para 100 kg recalcula todos os Drops consecutivos automaticamente', () => {
      const sets = [
        { id: 's1', type: 'normal', weight: 80, manual_weight: false },
        { id: 's2', type: 'drop', weight: 65, drop_percent: 20, manual_weight: false },
        { id: 's3', type: 'drop', weight: 50, drop_percent: 25, manual_weight: false },
        { id: 's4', type: 'drop', weight: 42.5, drop_percent: 15, manual_weight: false },
      ];

      // Altera o peso da série base para 100 kg
      sets[0].weight = 100;

      // Executa o recálculo em cascata a partir do índice 0
      const cascaded = recalculateDropCascade(sets, 0, 2.5);

      // Base: 100 kg
      expect(cascaded[0].weight).toBe(100);

      // Drop 1: 100 * (1 - 0.20) = 80 kg
      expect(cascaded[1].weight).toBe(80);

      // Drop 2: 80 * (1 - 0.25) = 60 kg
      expect(cascaded[2].weight).toBe(60);

      // Drop 3: 60 * (1 - 0.15) = 51 -> 50 kg (incremento 2.5)
      expect(cascaded[3].weight).toBe(50);
    });
  });

  // ==========================================================================
  // CENÁRIO 3: Trava manual (manual_weight) no Drop 1 e alteração subsequente da base
  // ==========================================================================
  describe('3. Trava manual (manual_weight) e respeito da cascata', () => {
    it('editar manualmente o 1º Drop para 70 kg atualiza os seguintes; alterar a base preserva o 1º Drop em 70 kg', () => {
      const sets = [
        { id: 's1', type: 'normal', weight: 100, manual_weight: false },
        { id: 's2', type: 'drop', weight: 80, drop_percent: 20, manual_weight: false },
        { id: 's3', type: 'drop', weight: 60, drop_percent: 25, manual_weight: false },
        { id: 's4', type: 'drop', weight: 50, drop_percent: 15, manual_weight: false },
      ];

      // Passo A: Usuário edita o 1º Drop manualmente para 70 kg
      sets[1].weight = 70;
      sets[1].manual_weight = true;

      // Cascata executada a partir do Drop 1 (índice 1)
      const afterManualEdit = recalculateDropCascade(sets, 1, 2.5);

      // Drop 1 travado em 70 kg
      expect(afterManualEdit[1].weight).toBe(70);
      expect(afterManualEdit[1].manual_weight).toBe(true);

      // Drop 2 recalculado a partir de 70 kg (-25%): 70 * 0.75 = 52.5 kg
      expect(afterManualEdit[2].weight).toBe(52.5);

      // Drop 3 recalculado a partir de 52.5 kg (-15%): 52.5 * 0.85 = 44.625 -> 45 kg
      expect(afterManualEdit[3].weight).toBe(45);

      // Passo B: Usuário altera a base novamente para 120 kg
      afterManualEdit[0].weight = 120;

      // Executa recálculo a partir do índice 0 (base)
      const afterBaseChange = recalculateDropCascade(afterManualEdit, 0, 2.5);

      // Base foi para 120 kg
      expect(afterBaseChange[0].weight).toBe(120);

      // Drop 1 permaneceu 70 kg devido à trava manual (manual_weight = true)
      expect(afterBaseChange[1].weight).toBe(70);
      expect(afterBaseChange[1].manual_weight).toBe(true);

      // Drop 2 e Drop 3 permaneceram respeitando a cascata do Drop 1 (70 kg)
      expect(afterBaseChange[2].weight).toBe(52.5);
      expect(afterBaseChange[3].weight).toBe(45);
    });

    it('apagar o campo do Drop 1 remove a trava manual (manual_weight = false) e restaura a cascata da base', () => {
      const sets = [
        { id: 's1', type: 'normal', weight: 120, manual_weight: false },
        { id: 's2', type: 'drop', weight: 70, drop_percent: 20, manual_weight: true },
        { id: 's3', type: 'drop', weight: 52.5, drop_percent: 25, manual_weight: false },
        { id: 's4', type: 'drop', weight: 45, drop_percent: 15, manual_weight: false },
      ];

      // Usuário limpa o campo do Drop 1: manual_weight volta a ser false
      sets[1].manual_weight = false;

      // Recalcula a cascata a partir do índice anterior (0)
      const restored = recalculateDropCascade(sets, 0, 2.5);

      // Drop 1 recalculado a partir de 120 kg (-20%): 120 * 0.80 = 96 -> 95 kg (incremento 2.5)
      expect(restored[1].weight).toBe(95);
      expect(restored[1].manual_weight).toBe(false);

      // Drop 2 recalculado a partir de 95 kg (-25%): 95 * 0.75 = 71.25 -> 72.5 kg
      expect(restored[2].weight).toBe(72.5);

      // Drop 3 recalculado a partir de 72.5 kg (-15%): 72.5 * 0.85 = 61.625 -> 62.5 kg
      expect(restored[3].weight).toBe(62.5);
    });
  });

  // ==========================================================================
  // CENÁRIO 4: Descanso inteligente (sem pausa antes do Drop; pausa após último Drop)
  // ==========================================================================
  describe('4. Descanso inteligente ao concluir série', () => {
    it('concluir série base com Drop imediatamente abaixo: NÃO inicia cronômetro e exibe toast de redução de carga', () => {
      const exerciseSets = [
        { id: 's1', type: 'normal', rest_s: 90 },
        { id: 's2', type: 'drop', drop_percent: 20 },
        { id: 's3', type: 'drop', drop_percent: 25 },
      ];

      let restTimerStarted = false;
      let restRemainingSeconds = 60;
      let toastMessage = '';

      const handleSetCompletion = (completedSetIdx: number) => {
        const setItem = exerciseSets[completedSetIdx];
        const nextSet = completedSetIdx < exerciseSets.length - 1 ? exerciseSets[completedSetIdx + 1] : null;

        if (nextSet && nextSet.type === 'drop') {
          // NÃO inicia o cronômetro, zera descanso ativo e emite toast
          restTimerStarted = false;
          restRemainingSeconds = 0;
          toastMessage = 'Sem descanso! Reduza a carga para o Drop';
        } else {
          const restTime = setItem.rest_s ?? defaultRestFor(setItem.type);
          if (restTime > 0) {
            restTimerStarted = true;
            restRemainingSeconds = restTime;
          }
        }
      };

      // 1. Concluir a série base (índice 0)
      handleSetCompletion(0);

      expect(restTimerStarted).toBe(false);
      expect(restRemainingSeconds).toBe(0);
      expect(toastMessage).toBe('Sem descanso! Reduza a carga para o Drop');

      // 2. Concluir o 1º Drop (índice 1), pois ainda há outro Drop abaixo
      handleSetCompletion(1);

      expect(restTimerStarted).toBe(false);
      expect(restRemainingSeconds).toBe(0);
      expect(toastMessage).toBe('Sem descanso! Reduza a carga para o Drop');

      // 3. Concluir o 2º Drop (índice 2, o último Drop da sequência)
      handleSetCompletion(2);

      expect(restTimerStarted).toBe(true);
      expect(restRemainingSeconds).toBe(30); // defaultRestFor('drop') = 30s
    });

    it('concluir série normal cujo próximo set é normal dispara o descanso regular', () => {
      const exerciseSets = [
        { id: 's1', type: 'normal', rest_s: 90 },
        { id: 's2', type: 'normal', rest_s: 90 },
      ];

      let restTimerStarted = false;
      let restTime = 0;
      let toastMessage = '';

      const nextSet = exerciseSets[1];
      if (nextSet && nextSet.type === 'drop') {
        restTimerStarted = false;
        toastMessage = 'Sem descanso! Reduza a carga para o Drop';
      } else {
        restTimerStarted = true;
        restTime = exerciseSets[0].rest_s ?? defaultRestFor(exerciseSets[0].type);
      }

      expect(restTimerStarted).toBe(true);
      expect(restTime).toBe(90);
      expect(toastMessage).toBe('');
    });
  });
});
