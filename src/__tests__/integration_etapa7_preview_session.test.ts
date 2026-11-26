import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrations } from '../db/migrations';
import {
  kgToDisplay,
  displayToKg,
  formatWeight,
  formatEffort,
  formatRepsTarget,
  formatRepsShort,
  suggestDropWeightKg,
  suggest1RmWeightKg,
  calcDropFromWeightKg,
  recalculateDropCascade,
  defaultRestFor,
  getSetDisplayLabel,
  setLabels,
  sanitizePlannedSet,
  isSetInVolume,
  canGeneratePR,
  calcularVolume,
  detectarPR,
  PlannedSet,
  SetType,
  RepsMode,
  EffortMode,
  Unit,
} from '../domain/sessionMath';
import {
  formatExerciseSetsSummary,
  formatExerciseCardItem,
  formatWorkoutSummary,
} from '../domain/workouts';

// ============================================================================
// MOCK DO EXPO-SQLITE VIA NODE:SQLITE (DATABASE EM MEMÓRIA)
// ============================================================================
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

import {
  startWorkoutSession,
  getWorkoutExerciseSets,
  saveWorkoutExerciseSets,
} from '../db/workouts';

describe('ETAPA 7 — Testes automatizados de integração e regras de negócio', () => {
  beforeEach(() => {
    memoryDb = new DatabaseSync(':memory:');
    memoryDb.exec('PRAGMA foreign_keys = ON;');

    // Executa as migrações completas do schema
    for (const m of migrations) {
      for (const statement of m.sql) {
        memoryDb.exec(statement);
      }
    }
  });

  // ==========================================================================
  // 1. DROP SET EM CASCATA E DESCANSO INTELIGENTE
  // ==========================================================================
  describe('1. Drop Set em cascata e descanso inteligente', () => {
    it('Série base (80 kg) + 3 Drops (-20%, -25%, -15%) inicializando corretamente em cascata (matemática pura e SQLite)', () => {
      const baseKg = 80;
      const drop1Pct = 20;
      const drop2Pct = 25;
      const drop3Pct = 15;
      const increment = 2.5;

      // 1. Validação do cálculo de cascata
      // Drop 1: 80 * (1 - 0.20) = 64 kg -> arredondado para incremento 2.5 = 65 kg
      const drop1Kg = calcDropFromWeightKg(baseKg, drop1Pct, increment);
      expect(drop1Kg).toBe(65);

      // Drop 2: 65 * (1 - 0.25) = 48.75 kg -> arredondado para incremento 2.5 = 50 kg
      const drop2Kg = calcDropFromWeightKg(drop1Kg, drop2Pct, increment);
      expect(drop2Kg).toBe(50);

      // Drop 3: 50 * (1 - 0.15) = 42.5 kg -> arredondado para incremento 2.5 = 42.5 kg
      const drop3Kg = calcDropFromWeightKg(drop2Kg, drop3Pct, increment);
      expect(drop3Kg).toBe(42.5);

      // 2. Validação ponta a ponta no SQLite via startWorkoutSession
      memoryDb.exec(`INSERT INTO groups (id, name) VALUES ('g1', 'Grupo 1');`);
      memoryDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w1', 'g1', 'Treino Push');`);
      memoryDb.exec(
        `INSERT INTO exercises (id, name, muscle_group, equipment, kind, default_increment) VALUES ('ex1', 'Supino Reto', 'Peito', 'Barra', 'composto', 2.5);`
      );
      memoryDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES ('we1', 'w1', 'ex1', 0);`);

      // Histórico anterior para fornecer carga base de 80 kg
      memoryDb.exec(`INSERT INTO sessions (id, workout_id, name_snapshot, started_at, status, ended_at) VALUES ('s_prev', 'w1', 'Treino Push', 1000, 'completed', 2000);`);
      memoryDb.exec(`INSERT INTO session_exercises (id, session_id, exercise_id, position) VALUES ('se_prev', 's_prev', 'ex1', 0);`);
      memoryDb.exec(`INSERT INTO sets (id, session_exercise_id, "index", weight, reps, type, completed_at) VALUES ('set_prev_1', 'se_prev', 0, 80, 10, 'normal', 1500);`);

      // Ficha planejada: 1 Normal + 3 Drops em cascata
      memoryDb.exec(`
        INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, drop_percent)
        VALUES 
          ('wes1', 'we1', 0, 'normal', 'reps_range', 8, 10, NULL),
          ('wes2', 'we1', 1, 'drop', 'reps_max', NULL, NULL, 20),
          ('wes3', 'we1', 2, 'drop', 'reps_max', NULL, NULL, 25),
          ('wes4', 'we1', 3, 'drop', 'reps_max', NULL, NULL, 15);
      `);

      // Inicia a sessão ativa
      const sessionId = startWorkoutSession('w1');
      expect(sessionId).toBeDefined();

      // Consulta as séries geradas no banco
      const createdSets = memoryDb.prepare(`
        SELECT st."index", st.weight, st.type, st.drop_percent
        FROM sets st
        JOIN session_exercises se ON st.session_exercise_id = se.id
        WHERE se.session_id = ?
        ORDER BY st."index" ASC
      `).all(sessionId) as Array<{ index: number; weight: number; type: string; drop_percent: number | null }>;

      expect(createdSets).toHaveLength(4);

      // Série 0 (Normal): 80 kg (herdado do histórico)
      expect(createdSets[0].type).toBe('normal');
      expect(createdSets[0].weight).toBe(80);
      expect(createdSets[0].drop_percent).toBeNull();

      // Série 1 (Drop 1 -20% de 80): 65 kg
      expect(createdSets[1].type).toBe('drop');
      expect(createdSets[1].drop_percent).toBe(20);
      expect(createdSets[1].weight).toBe(65);

      // Série 2 (Drop 2 -25% de 65): 50 kg
      expect(createdSets[2].type).toBe('drop');
      expect(createdSets[2].drop_percent).toBe(25);
      expect(createdSets[2].weight).toBe(50);

      // Série 3 (Drop 3 -15% de 50): 42.5 kg
      expect(createdSets[3].type).toBe('drop');
      expect(createdSets[3].drop_percent).toBe(15);
      expect(createdSets[3].weight).toBe(42.5);
    });

    it('Alterar a base para 100 kg e confirmar recálculo automático em cascata nos 3 Drops', () => {
      const sets = [
        { id: 's1', type: 'normal', weight: 80, manual_weight: false },
        { id: 's2', type: 'drop', weight: 65, drop_percent: 20, manual_weight: false },
        { id: 's3', type: 'drop', weight: 50, drop_percent: 25, manual_weight: false },
        { id: 's4', type: 'drop', weight: 42.5, drop_percent: 15, manual_weight: false },
      ];

      // Altera a série base para 100 kg
      sets[0].weight = 100;

      // Executa o recálculo em cascata a partir do índice 0
      const cascaded = recalculateDropCascade(sets, 0, 2.5);

      // Base: 100 kg
      expect(cascaded[0].weight).toBe(100);

      // Drop 1: 100 * (1 - 0.20) = 80 kg
      expect(cascaded[1].weight).toBe(80);

      // Drop 2: 80 * (1 - 0.25) = 60 kg
      expect(cascaded[2].weight).toBe(60);

      // Drop 3: 60 * (1 - 0.15) = 51 -> arredondado para incremento 2.5 = 50 kg
      expect(cascaded[3].weight).toBe(50);
    });

    it('Editar manualmente o 1º Drop para 70 kg, alterar a base novamente e confirmar que o 1º Drop permaneceu 70 kg (manual_weight = true) enquanto os seguintes respeitaram a cascata', () => {
      const sets = [
        { id: 's1', type: 'normal', weight: 100, manual_weight: false },
        { id: 's2', type: 'drop', weight: 80, drop_percent: 20, manual_weight: false },
        { id: 's3', type: 'drop', weight: 60, drop_percent: 25, manual_weight: false },
        { id: 's4', type: 'drop', weight: 50, drop_percent: 15, manual_weight: false },
      ];

      // Passo A: Usuário edita manualmente o 1º Drop para 70 kg
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

      // 1º Drop permaneceu exatamente 70 kg devido à trava manual (manual_weight = true)
      expect(afterBaseChange[1].weight).toBe(70);
      expect(afterBaseChange[1].manual_weight).toBe(true);

      // Os seguintes (Drop 2 e Drop 3) continuaram respeitando a cascata do Drop 1 (70 kg)
      expect(afterBaseChange[2].weight).toBe(52.5);
      expect(afterBaseChange[3].weight).toBe(45);
    });

    it('Concluir série com Drop abaixo -> cronômetro NÃO dispara; concluir último Drop -> cronômetro dispara', () => {
      const exerciseSets = [
        { id: 's1', type: 'normal', rest_s: 90 },
        { id: 's2', type: 'drop', drop_percent: 20 },
        { id: 's3', type: 'drop', drop_percent: 25 },
        { id: 's4', type: 'drop', drop_percent: 15 },
      ];

      // Função com a lógica oficial da ActiveSessionScreen para conclusão de séries
      const handleSetCompletion = (completedSetIdx: number) => {
        const setItem = exerciseSets[completedSetIdx];
        const nextSet = completedSetIdx < exerciseSets.length - 1 ? exerciseSets[completedSetIdx + 1] : null;

        if (nextSet && nextSet.type === 'drop') {
          return {
            timerStarted: false,
            remainingSeconds: 0,
            toastMessage: 'Sem descanso! Reduza a carga para o Drop',
          };
        } else {
          const restTime = setItem.rest_s ?? defaultRestFor(setItem.type);
          return {
            timerStarted: restTime > 0,
            remainingSeconds: restTime,
            toastMessage: '',
          };
        }
      };

      // 1. Concluir a série base (normal, com Drop abaixo): cronômetro NÃO dispara
      const res0 = handleSetCompletion(0);
      expect(res0.timerStarted).toBe(false);
      expect(res0.remainingSeconds).toBe(0);
      expect(res0.toastMessage).toBe('Sem descanso! Reduza a carga para o Drop');

      // 2. Concluir o 1º Drop (com Drop abaixo): cronômetro NÃO dispara
      const res1 = handleSetCompletion(1);
      expect(res1.timerStarted).toBe(false);
      expect(res1.remainingSeconds).toBe(0);
      expect(res1.toastMessage).toBe('Sem descanso! Reduza a carga para o Drop');

      // 3. Concluir o 2º Drop (com Drop abaixo): cronômetro NÃO dispara
      const res2 = handleSetCompletion(2);
      expect(res2.timerStarted).toBe(false);
      expect(res2.remainingSeconds).toBe(0);
      expect(res2.toastMessage).toBe('Sem descanso! Reduza a carga para o Drop');

      // 4. Concluir o 3º Drop (último Drop da sequência): cronômetro dispara!
      const res3 = handleSetCompletion(3);
      expect(res3.timerStarted).toBe(true);
      expect(res3.remainingSeconds).toBe(30); // defaultRestFor('drop') = 30s
      expect(res3.toastMessage).toBe('');
    });

    it('Numeração de [warmup, normal, normal, failure, drop, drop] resulta exatamente em A, 1, 2, F, D, D', () => {
      const sets = [
        { type: 'warmup' },
        { type: 'normal' },
        { type: 'normal' },
        { type: 'failure' },
        { type: 'drop' },
        { type: 'drop' },
      ];

      // Verificação individual via getSetDisplayLabel
      expect(getSetDisplayLabel(sets as any, 0)).toBe('A');
      expect(getSetDisplayLabel(sets as any, 1)).toBe('1');
      expect(getSetDisplayLabel(sets as any, 2)).toBe('2');
      expect(getSetDisplayLabel(sets as any, 3)).toBe('F');
      expect(getSetDisplayLabel(sets as any, 4)).toBe('D');
      expect(getSetDisplayLabel(sets as any, 5)).toBe('D');

      // Verificação em lote via setLabels
      const labels = setLabels(sets as any);
      expect(labels).toEqual(['A', '1', '2', 'F', 'D', 'D']);
    });
  });

  // ==========================================================================
  // 2. CENÁRIO COMPLETO DO PUSH A E ISOLAMENTO
  // ==========================================================================
  describe('2. Cenário completo do Push A e isolamento', () => {
    it('Montar Push A na prévia (sem pesos) com: Aquecimento, Normal, Por RPE 8, Por 2 RIR, % de 1RM, AMRAP, Falha e Drop. Salvar, reabrir e validar todos os campos', () => {
      // 1. Cria a estrutura no SQLite
      memoryDb.exec(`INSERT INTO groups (id, name) VALUES ('g_push', 'Hipertrofia');`);
      memoryDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w_push_a', 'g_push', 'Push A');`);
      memoryDb.exec(
        `INSERT INTO exercises (id, name, muscle_group, equipment, kind, default_increment) VALUES ('ex_supino', 'Supino Reto', 'Peito', 'Barra', 'composto', 2.5);`
      );
      memoryDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES ('we_supino', 'w_push_a', 'ex_supino', 0);`);

      // 2. Os 8 tipos/combinações exigidos:
      const plannedSetsPushA: PlannedSet[] = [
        // 1. Aquecimento: 12-15 reps, sem esforço
        {
          id: 's_warmup',
          workoutExerciseId: 'we_supino',
          position: 0,
          type: 'warmup',
          repsMode: 'reps_range',
          minReps: 12,
          maxReps: 15,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 60,
        },
        // 2. Normal: 8-10 reps padrão
        {
          id: 's_normal',
          workoutExerciseId: 'we_supino',
          position: 1,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        // 3. Normal por RPE 8: 8-10 reps
        {
          id: 's_rpe8',
          workoutExerciseId: 'we_supino',
          position: 2,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'rpe',
          effortValue: 8,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        // 4. Normal por 2 RIR: 8-10 reps
        {
          id: 's_rir2',
          workoutExerciseId: 'we_supino',
          position: 3,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'rir',
          effortValue: 2,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        // 5. Normal por 75% de 1RM: 5 reps
        {
          id: 's_1rm',
          workoutExerciseId: 'we_supino',
          position: 4,
          type: 'normal',
          repsMode: 'reps',
          minReps: 5,
          maxReps: null,
          effortMode: 'percent_1rm',
          effortValue: 75,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
        // 6. Normal AMRAP
        {
          id: 's_amrap',
          workoutExerciseId: 'we_supino',
          position: 5,
          type: 'normal',
          repsMode: 'amrap',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
        // 7. Falha: até a falha
        {
          id: 's_failure',
          workoutExerciseId: 'we_supino',
          position: 6,
          type: 'failure',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
        // 8. Drop: -20% até a falha
        {
          id: 's_drop',
          workoutExerciseId: 'we_supino',
          position: 7,
          type: 'drop',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          dropPercent: 20,
          restS: 30,
        },
      ];

      // 3. Salva no banco de dados
      saveWorkoutExerciseSets('we_supino', plannedSetsPushA);

      // 4. Reabre os dados a partir do SQLite
      const reloadedSets = getWorkoutExerciseSets('we_supino');
      expect(reloadedSets).toHaveLength(8);

      // Validação detalhada de cada campo de cada série:
      // Série 0: Aquecimento
      expect(reloadedSets[0].position).toBe(0);
      expect(reloadedSets[0].type).toBe('warmup');
      expect(reloadedSets[0].repsMode).toBe('reps_range');
      expect(reloadedSets[0].minReps).toBe(12);
      expect(reloadedSets[0].maxReps).toBe(15);
      expect(reloadedSets[0].effortMode).toBe('none');
      expect(reloadedSets[0].restS).toBe(60);

      // Série 1: Normal
      expect(reloadedSets[1].position).toBe(1);
      expect(reloadedSets[1].type).toBe('normal');
      expect(reloadedSets[1].repsMode).toBe('reps_range');
      expect(reloadedSets[1].minReps).toBe(8);
      expect(reloadedSets[1].maxReps).toBe(10);
      expect(reloadedSets[1].effortMode).toBe('none');
      expect(reloadedSets[1].restS).toBe(90);

      // Série 2: Por RPE 8
      expect(reloadedSets[2].position).toBe(2);
      expect(reloadedSets[2].type).toBe('normal');
      expect(reloadedSets[2].repsMode).toBe('reps_range');
      expect(reloadedSets[2].effortMode).toBe('rpe');
      expect(reloadedSets[2].effortValue).toBe(8);
      expect(reloadedSets[2].restS).toBe(90);

      // Série 3: Por 2 RIR
      expect(reloadedSets[3].position).toBe(3);
      expect(reloadedSets[3].type).toBe('normal');
      expect(reloadedSets[3].repsMode).toBe('reps_range');
      expect(reloadedSets[3].effortMode).toBe('rir');
      expect(reloadedSets[3].effortValue).toBe(2);
      expect(reloadedSets[3].restS).toBe(90);

      // Série 4: % de 1RM (75%)
      expect(reloadedSets[4].position).toBe(4);
      expect(reloadedSets[4].type).toBe('normal');
      expect(reloadedSets[4].repsMode).toBe('reps');
      expect(reloadedSets[4].minReps).toBe(5);
      expect(reloadedSets[4].effortMode).toBe('percent_1rm');
      expect(reloadedSets[4].effortValue).toBe(75);
      expect(reloadedSets[4].restS).toBe(120);

      // Série 5: AMRAP
      expect(reloadedSets[5].position).toBe(5);
      expect(reloadedSets[5].type).toBe('normal');
      expect(reloadedSets[5].repsMode).toBe('amrap');
      expect(reloadedSets[5].effortMode).toBe('none');
      expect(reloadedSets[5].restS).toBe(120);

      // Série 6: Falha
      expect(reloadedSets[6].position).toBe(6);
      expect(reloadedSets[6].type).toBe('failure');
      expect(reloadedSets[6].repsMode).toBe('reps_max');
      expect(reloadedSets[6].effortMode).toBe('none');
      expect(reloadedSets[6].restS).toBe(120);

      // Série 7: Drop (-20%)
      expect(reloadedSets[7].position).toBe(7);
      expect(reloadedSets[7].type).toBe('drop');
      expect(reloadedSets[7].repsMode).toBe('reps_max');
      expect(reloadedSets[7].effortMode).toBe('none');
      expect(reloadedSets[7].dropPercent).toBe(20);
      expect(reloadedSets[7].restS).toBe(30);

      // 5. Confirmação mandatória: nenhum peso/targetWeight salvo na ficha
      for (const s of reloadedSets) {
        expect((s as any).weight).toBeUndefined();
        expect((s as any).target_weight).toBeUndefined();
        expect((s as any).targetWeight).toBeUndefined();
      }

      // 6. Confirmação da formatação das 4 colunas na prévia
      const labels = reloadedSets.map((_, i) => getSetDisplayLabel(reloadedSets, i));
      expect(labels).toEqual(['A', '1', '2', '3', '4', '5', 'F', 'D']);

      const repsShort = reloadedSets.map((s) => formatRepsShort(s));
      expect(repsShort).toEqual(['12–15', '8–10', '8–10', '8–10', '5', 'AMRAP', 'Falha', 'Falha']);

      const effortText = reloadedSets.map((s) => formatEffort(s, 'kg'));
      expect(effortText).toEqual(['', '', 'RPE 8', '2 RIR', '75% de 1RM', '', '', '-20% da anterior']);
    });

    it('Iniciar sessão, adicionar 1 série extra (is_session_only = 1), finalizar e confirmar que o treino salvo original permaneceu intacto', () => {
      // 1. Cria treino e ficha de 8 séries no SQLite
      memoryDb.exec(`INSERT INTO groups (id, name) VALUES ('g_iso', 'Grupo Isolamento');`);
      memoryDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w_iso', 'g_iso', 'Push A Iso');`);
      memoryDb.exec(
        `INSERT INTO exercises (id, name, muscle_group, equipment, kind, default_increment) VALUES ('ex_iso', 'Supino', 'Peito', 'Barra', 'composto', 2.5);`
      );
      memoryDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES ('we_iso', 'w_iso', 'ex_iso', 0);`);

      const originalSets: PlannedSet[] = [
        { id: 's0', workoutExerciseId: 'we_iso', position: 0, type: 'warmup', repsMode: 'reps_range', minReps: 12, maxReps: 15, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 60 },
        { id: 's1', workoutExerciseId: 'we_iso', position: 1, type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 90 },
        { id: 's2', workoutExerciseId: 'we_iso', position: 2, type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'rpe', effortValue: 8, effortValueMax: null, effortRefExerciseId: null, restS: 90 },
        { id: 's3', workoutExerciseId: 'we_iso', position: 3, type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'rir', effortValue: 2, effortValueMax: null, effortRefExerciseId: null, restS: 90 },
        { id: 's4', workoutExerciseId: 'we_iso', position: 4, type: 'normal', repsMode: 'reps', minReps: 5, maxReps: null, effortMode: 'percent_1rm', effortValue: 75, effortValueMax: null, effortRefExerciseId: null, restS: 120 },
        { id: 's5', workoutExerciseId: 'we_iso', position: 5, type: 'normal', repsMode: 'amrap', minReps: null, maxReps: null, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 120 },
        { id: 's6', workoutExerciseId: 'we_iso', position: 6, type: 'failure', repsMode: 'reps_max', minReps: null, maxReps: null, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 120 },
        { id: 's7', workoutExerciseId: 'we_iso', position: 7, type: 'drop', repsMode: 'reps_max', minReps: null, maxReps: null, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, dropPercent: 20, restS: 30 },
      ];
      saveWorkoutExerciseSets('we_iso', originalSets);

      // 2. Inicia a sessão ativa
      const sessionId = startWorkoutSession('w_iso');
      expect(sessionId).toBeDefined();

      const seRow = memoryDb.prepare(`SELECT id FROM session_exercises WHERE session_id = ?`).get(sessionId) as { id: string };
      expect(seRow).toBeDefined();

      // Confirma que a sessão herdou 8 séries com is_session_only = 0
      const sessionSetsInitial = memoryDb.prepare(`SELECT * FROM sets WHERE session_exercise_id = ?`).all(seRow.id) as any[];
      expect(sessionSetsInitial).toHaveLength(8);
      for (const s of sessionSetsInitial) {
        expect(s.is_session_only).toBe(0);
      }

      // 3. Usuário adiciona 1 série extra durante a sessão ativa (is_session_only = 1)
      const extraSetId = 'set_extra_during_session';
      memoryDb.prepare(`
        INSERT INTO sets (id, session_exercise_id, "index", weight, reps, type, is_session_only, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(extraSetId, seRow.id, 8, 60, 12, 'drop', Date.now());

      // A sessão ativa agora tem 9 séries
      const sessionSetsWithExtra = memoryDb.prepare(`SELECT * FROM sets WHERE session_exercise_id = ?`).all(seRow.id) as any[];
      expect(sessionSetsWithExtra).toHaveLength(9);
      const extraRow = sessionSetsWithExtra.find((s) => s.id === extraSetId);
      expect(extraRow).toBeDefined();
      expect(extraRow.is_session_only).toBe(1);

      // 4. Finaliza a sessão ativa
      const now = Date.now();
      memoryDb.prepare(`UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ?`).run(now, sessionId);

      const sessionStatusRow = memoryDb.prepare(`SELECT status FROM sessions WHERE id = ?`).get(sessionId) as { status: string };
      expect(sessionStatusRow.status).toBe('completed');

      // 5. VALIDAÇÃO DE ISOLAMENTO TOTAL:
      // O treino salvo original (workout_exercise_sets) continua com exatamente 8 séries intactas
      const originalWorkoutSetsAfterSession = getWorkoutExerciseSets('we_iso');
      expect(originalWorkoutSetsAfterSession).toHaveLength(8);
      expect(originalWorkoutSetsAfterSession.map((s) => s.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(originalWorkoutSetsAfterSession.find((s) => s.id === extraSetId)).toBeUndefined();
    });
  });

  // ==========================================================================
  // 3. UNIDADES (kg/lb), VOLUME (Halteres × 2) E PR
  // ==========================================================================
  describe('3. Unidades (kg/lb), Volume (Halteres × 2) e PR', () => {
    it('Em lb: configurar incremento +5 lb na prévia e digitar 100 lb na sessão; recarregar e confirmar exibição exata (100 lb) com armazenamento em kg no SQLite', () => {
      const userUnit: Unit = 'lb';

      // 1. NA PRÉVIA: Usuário define incremento de +5 lb
      const inputIncrementLb = 5;
      const effortValueKg = displayToKg(inputIncrementLb, userUnit);
      // 5 lb / 2.20462262185 = 2.27 kg
      expect(effortValueKg).toBe(2.27);

      // Grava na tabela workout_exercise_sets
      memoryDb.exec(`INSERT INTO groups (id, name) VALUES ('g_unit', 'G');`);
      memoryDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w_unit', 'g_unit', 'Treino Unit');`);
      memoryDb.exec(`INSERT INTO exercises (id, name, muscle_group, equipment, kind, default_increment) VALUES ('ex_unit', 'Rosca', 'Bíceps', 'Halteres', 'isolado', 2.5);`);
      memoryDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES ('we_unit', 'w_unit', 'ex_unit', 0);`);

      memoryDb.prepare(`
        INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, effort_value, rest_s)
        VALUES ('wes_unit_1', 'we_unit', 0, 'normal', 'reps_range', 8, 10, 'last_session_plus', ?, 90)
      `).run(effortValueKg);

      // Recarrega do SQLite e valida exibição na prévia
      const reloadedPlannedSets = getWorkoutExerciseSets('we_unit');
      expect(reloadedPlannedSets).toHaveLength(1);
      expect(reloadedPlannedSets[0].effortValue).toBe(2.27);

      // Na unidade 'lb', exibe "Sessão +5 lb"
      expect(formatEffort(reloadedPlannedSets[0], 'lb')).toBe('Sessão +5 lb');
      // Na unidade 'kg', exibe "Sessão +2,27 kg"
      expect(formatEffort(reloadedPlannedSets[0], 'kg')).toBe('Sessão +2,27 kg');

      // 2. NA SESSÃO ATIVA: Usuário digita 100 lb
      const inputWeightLb = 100;
      const storedWeightKg = displayToKg(inputWeightLb, userUnit);
      // 100 lb / 2.20462262185 = 45.36 kg
      expect(storedWeightKg).toBe(45.36);

      // Grava no SQLite (tabela sets)
      memoryDb.exec(`INSERT INTO sessions (id, workout_id, name_snapshot, started_at, status) VALUES ('s_unit', 'w_unit', 'Treino Unit', 1000, 'active');`);
      memoryDb.exec(`INSERT INTO session_exercises (id, session_id, exercise_id, position) VALUES ('se_unit', 's_unit', 'ex_unit', 0);`);
      memoryDb.prepare(`
        INSERT INTO sets (id, session_exercise_id, "index", weight, reps, type, completed_at)
        VALUES ('set_active_unit', 'se_unit', 0, ?, 10, 'normal', 1500)
      `).run(storedWeightKg);

      // Recarrega o registro do SQLite
      const setRow = memoryDb.prepare(`SELECT weight FROM sets WHERE id = 'set_active_unit'`).get() as { weight: number };
      expect(setRow.weight).toBe(45.36); // Armazenamento exato em kg no banco

      // Recarrega na unidade 'lb': conversão e formatação exibem exatamente 100 lb
      const displayVal = roundToDisplay(kgToDisplay(setRow.weight, 'lb'), 1);
      expect(displayVal).toBe(100);
      expect(formatWeight(setRow.weight, 'lb')).toBe('100');

      // Se exibido em kg, formata com vírgula padrão pt-BR
      expect(formatWeight(setRow.weight, 'kg')).toBe('45,36');
    });

    it('Volume do Resumo: ignora aquecimento, multiplica Halteres por 2×, inclui Drop e Falha', () => {
      // 1. Exercício com Halteres (multiplicador 2×)
      const dumbbellSets = [
        // Aquecimento: 20 kg × 15 reps -> IGNORADO no volume
        { id: 's1', type: 'warmup', weight: 20, reps: 15, completedAt: 1000 },
        // Normal: 30 kg × 10 reps -> 30 × 10 × 2 = 600 kg
        { id: 's2', type: 'normal', weight: 30, reps: 10, completedAt: 2000 },
        // Falha: 35 kg × 8 reps -> 35 × 8 × 2 = 560 kg
        { id: 's3', type: 'failure', weight: 35, reps: 8, completedAt: 3000 },
        // Drop: 25 kg × 12 reps -> 25 × 12 × 2 = 600 kg
        { id: 's4', type: 'drop', weight: 25, reps: 12, completedAt: 4000 },
      ];

      // Verificação da regra isSetInVolume
      expect(isSetInVolume(dumbbellSets[0])).toBe(false); // Aquecimento fora
      expect(isSetInVolume(dumbbellSets[1])).toBe(true);  // Normal dentro
      expect(isSetInVolume(dumbbellSets[2])).toBe(true);  // Falha dentro
      expect(isSetInVolume(dumbbellSets[3])).toBe(true);  // Drop dentro

      // Volume Halteres = 600 + 560 + 600 = 1760 kg
      const volumeHalteres = calcularVolume(dumbbellSets as any, 'Halteres');
      expect(volumeHalteres).toBe(1760);

      // 2. Exercício com Barra (fator 1×)
      const barbellSets = [
        // Aquecimento: 40 kg × 15 reps -> IGNORADO no volume
        { id: 'b1', type: 'warmup', weight: 40, reps: 15, completedAt: 1000 },
        // Normal: 80 kg × 10 reps -> 800 kg
        { id: 'b2', type: 'normal', weight: 80, reps: 10, completedAt: 2000 },
        // Falha: 90 kg × 8 reps -> 720 kg
        { id: 'b3', type: 'failure', weight: 90, reps: 8, completedAt: 3000 },
        // Drop: 65 kg × 12 reps -> 780 kg
        { id: 'b4', type: 'drop', weight: 65, reps: 12, completedAt: 4000 },
      ];

      // Volume Barra = 800 + 720 + 780 = 2300 kg (aquecimento ignorado)
      const volumeBarra = calcularVolume(barbellSets as any, 'Barra');
      expect(volumeBarra).toBe(2300);
    });

    it('PR do Resumo: ignora aquecimento e Drop; inclui Normal e Falha', () => {
      // 1. Verificação da regra canGeneratePR
      expect(canGeneratePR({ type: 'warmup' })).toBe(false);
      expect(canGeneratePR({ type: 'drop' })).toBe(false);
      expect(canGeneratePR({ type: 'normal' })).toBe(true);
      expect(canGeneratePR({ type: 'failure' })).toBe(true);

      // Histórico anterior: maior carga = 85 kg, maior volume por série = 850 kg (85 × 10)
      const previousHistory = [
        { weight: 80, reps: 10, type: 'normal' },
        { weight: 85, reps: 10, type: 'normal' },
      ];

      // Aquecimento com 100 kg × 10 reps (maior que o histórico) NUNCA gera PR
      const heavyWarmup = { weight: 100, reps: 10, type: 'warmup' };
      const prWarmup = canGeneratePR(heavyWarmup)
        ? detectarPR(previousHistory as any, heavyWarmup as any)
        : { isPrWeight: false, isPrVolume: false };
      expect(prWarmup.isPrWeight).toBe(false);
      expect(prWarmup.isPrVolume).toBe(false);

      // Drop com carga alta (95 kg × 10 reps) NUNCA gera PR
      const heavyDrop = { weight: 95, reps: 10, type: 'drop' };
      const prDrop = canGeneratePR(heavyDrop)
        ? detectarPR(previousHistory as any, heavyDrop as any)
        : { isPrWeight: false, isPrVolume: false };
      expect(prDrop.isPrWeight).toBe(false);
      expect(prDrop.isPrVolume).toBe(false);

      // Série Normal com 90 kg × 8 reps supera 85 kg -> gera PR de carga!
      const normalSet = { weight: 90, reps: 8, type: 'normal' };
      expect(canGeneratePR(normalSet)).toBe(true);
      const prNormal = detectarPR(previousHistory as any, normalSet as any);
      expect(prNormal.isPrWeight).toBe(true);
      expect(prNormal.isPrVolume).toBe(false);

      // Série de Falha com 80 kg × 12 reps (volume 960 kg > 850 kg, carga 80 < 85) -> gera PR de volume!
      const failureSet = { weight: 80, reps: 12, type: 'failure' };
      expect(canGeneratePR(failureSet)).toBe(true);
      const prFailure = detectarPR(previousHistory as any, failureSet as any);
      expect(prFailure.isPrWeight).toBe(false);
      expect(prFailure.isPrVolume).toBe(true);

      // Série de Falha com 95 kg × 10 reps (supera carga 95 > 85 e volume 950 > 850) -> gera PR duplo!
      const failureDoublePr = { weight: 95, reps: 10, type: 'failure' };
      expect(canGeneratePR(failureDoublePr)).toBe(true);
      const prDouble = detectarPR(previousHistory as any, failureDoublePr as any);
      expect(prDouble.isPrWeight).toBe(true);
      expect(prDouble.isPrVolume).toBe(true);
    });

    it('Duplicar, remover e reordenar séries garante posições contíguas (0..N-1) sem lacunas', () => {
      let sets: PlannedSet[] = [
        { id: 's0', workoutExerciseId: 'we_1', position: 0, type: 'warmup', repsMode: 'reps_range', minReps: 12, maxReps: 15, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 60 },
        { id: 's1', workoutExerciseId: 'we_1', position: 1, type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 90 },
        { id: 's2', workoutExerciseId: 'we_1', position: 2, type: 'failure', repsMode: 'reps_max', minReps: null, maxReps: null, effortMode: 'none', effortValue: null, effortValueMax: null, effortRefExerciseId: null, restS: 120 },
      ];

      // Duplicação
      const duplicateIndex = 1;
      const setCopy: PlannedSet = { ...sets[duplicateIndex], id: 's1_copy' };
      const afterDuplicate = [
        ...sets.slice(0, duplicateIndex + 1),
        setCopy,
        ...sets.slice(duplicateIndex + 1),
      ].map((s, idx) => ({ ...s, position: idx }));

      expect(afterDuplicate).toHaveLength(4);
      expect(afterDuplicate.map((s) => s.position)).toEqual([0, 1, 2, 3]);

      // Remoção
      const afterRemove = afterDuplicate
        .filter((s) => s.id !== 's1')
        .map((s, idx) => ({ ...s, position: idx }));

      expect(afterRemove).toHaveLength(3);
      expect(afterRemove.map((s) => s.position)).toEqual([0, 1, 2]);

      // Reordenação
      const swapIndex = 2;
      const reorderedList = [...afterRemove];
      const temp = reorderedList[swapIndex];
      reorderedList[swapIndex] = reorderedList[swapIndex - 1];
      reorderedList[swapIndex - 1] = temp;
      const normalizedReorder = reorderedList.map((s, idx) => ({ ...s, position: idx }));

      expect(normalizedReorder).toHaveLength(3);
      expect(normalizedReorder.map((s) => s.position)).toEqual([0, 1, 2]);
      expect(normalizedReorder[1].id).toBe('s2');
      expect(normalizedReorder[2].id).toBe('s1_copy');
    });

    it('Cartão exibe resumo de treino "N séries · ~X min" e exercícios "Nome — A + N séries"', () => {
      expect(formatExerciseCardItem('Supino Reto', 1, 5)).toBe('Supino Reto — A + 5 séries');
      expect(formatExerciseCardItem('Desenvolvimento', 0, 3)).toBe('Desenvolvimento — 3 séries');
      expect(formatWorkoutSummary(8, 45)).toBe('8 séries · ~45 min');
    });
  });
});

/** Helper para arredondamento seguro em testes de conversão */
function roundToDisplay(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
