import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrations } from '../migrations';
import { workoutExerciseSets, sets } from '../schema';
import type { PlannedSet, SessionSet } from '../../domain/types';

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

vi.mock('../client', () => ({
  getExpoDb: () => mockDbAdapter,
}));

// Importa os métodos de repositório após o mock
import {
  saveWorkoutExerciseSets,
  getWorkoutExerciseSets,
  saveSessionSet,
  getSessionSets,
  startWorkoutSession,
} from '../workouts';

describe('ETAPA 1 — Suporte a drop_percent no banco SQLite e tipos', () => {
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

  describe('1. Migração 0004 (drop_percent)', () => {
    it('deve conter a migração 0004 versionada na lista de migrações', () => {
      const m0004 = migrations.find((m) => m.name.includes('0004') || m.name.includes('drop_percent'));
      expect(m0004).toBeDefined();
      expect(m0004?.version).toBe(6);
    });

    it('deve adicionar a coluna drop_percent REAL às tabelas workout_exercise_sets e sets', () => {
      const m0004 = migrations.find((m) => m.name.includes('0004') || m.name.includes('drop_percent'))!;
      const sqlFull = m0004.sql.join('\n');

      expect(sqlFull).toMatch(/ALTER TABLE workout_exercise_sets ADD COLUMN drop_percent REAL/i);
      expect(sqlFull).toMatch(/ALTER TABLE sets ADD COLUMN drop_percent REAL/i);
    });

    it('deve conter queries de backfill definindo drop_percent = 20 para séries drop com drop_percent IS NULL', () => {
      const m0004 = migrations.find((m) => m.name.includes('0004') || m.name.includes('drop_percent'))!;
      const sqlFull = m0004.sql.join('\n');

      expect(sqlFull).toContain("UPDATE workout_exercise_sets SET drop_percent = 20 WHERE type = 'drop' AND drop_percent IS NULL;");
      expect(sqlFull).toContain("UPDATE sets SET drop_percent = 20 WHERE type = 'drop' AND drop_percent IS NULL;");
    });

    it('deve aplicar o backfill corretamente em dados pré-existentes no SQLite', () => {
      const freshDb = new DatabaseSync(':memory:');
      // Aplica migrações 1 a 5
      for (let i = 0; i < 5; i++) {
        for (const st of migrations[i].sql) {
          freshDb.exec(st);
        }
      }

      // Insere exercício de teste para satisfazer foreign key
      freshDb.exec(`INSERT INTO groups (id, name) VALUES ('g1', 'Grupo 1');`);
      freshDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w1', 'g1', 'Treino 1');`);
      freshDb.exec(`INSERT INTO exercises (id, name, muscle_group, equipment, kind) VALUES ('ex1', 'Supino', 'Peito', 'Barra', 'composto');`);
      freshDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id) VALUES ('we1', 'w1', 'ex1');`);
      freshDb.exec(`INSERT INTO sessions (id, workout_id, name_snapshot, started_at) VALUES ('sess1', 'w1', 'Treino 1', 1000);`);
      freshDb.exec(`INSERT INTO session_exercises (id, session_id, exercise_id) VALUES ('se1', 'sess1', 'ex1');`);

      // Insere dados antes da migração 6 (sem a coluna drop_percent)
      freshDb.exec(`
        INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode)
        VALUES ('wes_drop_1', 'we1', 0, 'drop', 'reps_range'),
               ('wes_normal_1', 'we1', 1, 'normal', 'reps_range');
      `);
      freshDb.exec(`
        INSERT INTO sets (id, session_exercise_id, "index", weight, reps, type)
        VALUES ('set_drop_1', 'se1', 1, 50, 10, 'drop'),
               ('set_normal_1', 'se1', 2, 60, 10, 'normal');
      `);

      // Agora aplica migração 6
      const m6 = migrations[5];
      for (const st of m6.sql) {
        freshDb.exec(st);
      }

      // Verifica backfill em workout_exercise_sets
      const wesRows = freshDb.prepare('SELECT id, type, drop_percent FROM workout_exercise_sets ORDER BY position ASC').all() as any[];
      expect(wesRows[0].id).toBe('wes_drop_1');
      expect(wesRows[0].type).toBe('drop');
      expect(wesRows[0].drop_percent).toBe(20); // Backfill aplicado!

      expect(wesRows[1].id).toBe('wes_normal_1');
      expect(wesRows[1].type).toBe('normal');
      expect(wesRows[1].drop_percent).toBeNull(); // Outros tipos mantêm NULL!

      // Verifica backfill em sets
      const setRows = freshDb.prepare('SELECT id, type, drop_percent FROM sets ORDER BY "index" ASC').all() as any[];
      expect(setRows[0].id).toBe('set_drop_1');
      expect(setRows[0].type).toBe('drop');
      expect(setRows[0].drop_percent).toBe(20); // Backfill aplicado!

      expect(setRows[1].id).toBe('set_normal_1');
      expect(setRows[1].type).toBe('normal');
      expect(setRows[1].drop_percent).toBeNull(); // Outros tipos mantêm NULL!
    });
  });

  describe('2. Drizzle Schema e Tipagens TypeScript', () => {
    it('o schema Drizzle deve mapear a coluna drop_percent em workoutExerciseSets e sets', () => {
      expect(workoutExerciseSets.dropPercent).toBeDefined();
      expect(workoutExerciseSets.dropPercent.name).toBe('drop_percent');

      expect(sets.dropPercent).toBeDefined();
      expect(sets.dropPercent.name).toBe('drop_percent');
    });

    it('deve validar tipos TypeScript de PlannedSet e SessionSet aceitando drop_percent', () => {
      const planned: PlannedSet = {
        id: 'wes_test',
        position: 0,
        type: 'drop',
        repsMode: 'reps_max',
        effortMode: 'none',
        drop_percent: 25,
        dropPercent: 25,
      };
      expect(planned.drop_percent).toBe(25);
      expect(planned.dropPercent).toBe(25);

      const sessionSet: SessionSet = {
        id: 'set_test',
        index: 1,
        weight: 60,
        reps: 10,
        type: 'drop',
        drop_percent: 15,
        dropPercent: 15,
      };
      expect(sessionSet.drop_percent).toBe(15);
      expect(sessionSet.dropPercent).toBe(15);
    });
  });

  describe('3. Repositórios e Métodos de Leitura/Escrita', () => {
    beforeEach(() => {
      // Cria registros base no banco em memória para foreign keys
      memoryDb.exec(`INSERT INTO groups (id, name) VALUES ('g1', 'Grupo 1');`);
      memoryDb.exec(`INSERT INTO workouts (id, group_id, name) VALUES ('w1', 'g1', 'Treino A');`);
      memoryDb.exec(`INSERT INTO exercises (id, name, muscle_group, equipment, kind) VALUES ('ex1', 'Supino Reto', 'Peito', 'Barra', 'composto');`);
      memoryDb.exec(`INSERT INTO workout_exercises (id, workout_id, exercise_id) VALUES ('we1', 'w1', 'ex1');`);
      memoryDb.exec(`INSERT INTO sessions (id, workout_id, name_snapshot, started_at) VALUES ('sess1', 'w1', 'Treino A', 1000);`);
      memoryDb.exec(`INSERT INTO session_exercises (id, session_id, exercise_id) VALUES ('se1', 'sess1', 'ex1');`);
    });

    it('saveWorkoutExerciseSets deve persistir drop_percent para séries do tipo drop e forçar NULL para outros tipos', () => {
      const setsToSave: PlannedSet[] = [
        {
          id: 's1',
          position: 0,
          type: 'drop',
          repsMode: 'reps_max',
          effortMode: 'none',
          drop_percent: 30, // Valor configurado livremente (1 a 90)
        },
        {
          id: 's2',
          position: 1,
          type: 'drop',
          repsMode: 'reps_max',
          effortMode: 'none',
          // Sem drop_percent informado -> deve assumir padrão 20
        },
        {
          id: 's3',
          position: 2,
          type: 'normal',
          repsMode: 'reps_range',
          effortMode: 'none',
          drop_percent: 25, // Fornecido inadvertidamente -> deve ser forçado a NULL
        },
        {
          id: 's4',
          position: 3,
          type: 'warmup',
          repsMode: 'reps_range',
          effortMode: 'none',
          drop_percent: 20, // Fornecido inadvertidamente -> deve ser forçado a NULL
        },
        {
          id: 's5',
          position: 4,
          type: 'failure',
          repsMode: 'reps_max',
          effortMode: 'none',
          drop_percent: 15, // Fornecido inadvertidamente -> deve ser forçado a NULL
        },
      ];

      saveWorkoutExerciseSets('we1', setsToSave);

      const loaded = getWorkoutExerciseSets('we1');
      expect(loaded).toHaveLength(5);

      // Série 1: drop com 30%
      expect(loaded[0].type).toBe('drop');
      expect(loaded[0].drop_percent).toBe(30);

      // Série 2: drop padrão (20%)
      expect(loaded[1].type).toBe('drop');
      expect(loaded[1].drop_percent).toBe(20);

      // Séries não-drop: devem ter drop_percent estritamente NULL
      expect(loaded[2].type).toBe('normal');
      expect(loaded[2].drop_percent).toBeNull();

      expect(loaded[3].type).toBe('warmup');
      expect(loaded[3].drop_percent).toBeNull();

      expect(loaded[4].type).toBe('failure');
      expect(loaded[4].drop_percent).toBeNull();
    });

    it('saveSessionSet e getSessionSets devem persistir drop_percent para drop e forçar NULL para outros tipos', () => {
      // 1. Série drop com drop_percent customizado
      saveSessionSet({
        id: 'set_1',
        sessionExerciseId: 'se1',
        index: 1,
        weight: 80,
        reps: 10,
        type: 'drop',
        drop_percent: 35,
      });

      // 2. Série drop sem drop_percent explícito (assume padrão 20)
      saveSessionSet({
        id: 'set_2',
        sessionExerciseId: 'se1',
        index: 2,
        weight: 70,
        reps: 10,
        type: 'drop',
      });

      // 3. Série normal com drop_percent passado (deve ser forçado a NULL)
      saveSessionSet({
        id: 'set_3',
        sessionExerciseId: 'se1',
        index: 3,
        weight: 90,
        reps: 8,
        type: 'normal',
        drop_percent: 20,
      });

      const loaded = getSessionSets('se1');
      expect(loaded).toHaveLength(3);

      expect(loaded[0].id).toBe('set_1');
      expect(loaded[0].type).toBe('drop');
      expect(loaded[0].drop_percent).toBe(35);

      expect(loaded[1].id).toBe('set_2');
      expect(loaded[1].type).toBe('drop');
      expect(loaded[1].drop_percent).toBe(20);

      expect(loaded[2].id).toBe('set_3');
      expect(loaded[2].type).toBe('normal');
      expect(loaded[2].drop_percent).toBeNull();
    });

    it('startWorkoutSession deve clonar drop_percent de workout_exercise_sets para sets', () => {
      // Configura ficha com 1 normal e 1 drop com 25%
      saveWorkoutExerciseSets('we1', [
        {
          id: 'wes_1',
          position: 0,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 12,
          effortMode: 'none',
        },
        {
          id: 'wes_2',
          position: 1,
          type: 'drop',
          repsMode: 'reps_max',
          effortMode: 'none',
          drop_percent: 25,
        },
      ]);

      const newSessionId = startWorkoutSession('w1');
      expect(newSessionId).toBeDefined();

      // Busca session_exercises criados
      const seRows = memoryDb.prepare('SELECT id FROM session_exercises WHERE session_id = ?').all(newSessionId) as any[];
      expect(seRows).toHaveLength(1);

      const sessionSets = getSessionSets(seRows[0].id);
      expect(sessionSets).toHaveLength(2);

      // Série 1 (normal): drop_percent deve ser null
      expect(sessionSets[0].type).toBe('normal');
      expect(sessionSets[0].drop_percent).toBeNull();

      // Série 2 (drop): drop_percent deve ser clonado como 25
      expect(sessionSets[1].type).toBe('drop');
      expect(sessionSets[1].drop_percent).toBe(25);
    });
  });
});
