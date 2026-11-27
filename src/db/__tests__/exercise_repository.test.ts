import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrations } from '../migrations';

// Mock de expo-sqlite com node:sqlite em memória
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

// Métodos de repositório após o mock
import {
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  getExerciseById,
  listExercises,
  getExercisesForAddSelection,
  getExercisesWithPR,
  addExerciseToWorkout,
  addExerciseToSession,
} from '../library';
import { getWorkoutExerciseSets } from '../workouts';

describe('Repositório de Exercícios — Volt Precision (ETAPA 1)', () => {
  beforeEach(() => {
    memoryDb = new DatabaseSync(':memory:');
    memoryDb.exec('PRAGMA foreign_keys = ON;');

    // Executa todas as migrações (1 a 7)
    for (const m of migrations) {
      for (const statement of m.sql) {
        memoryDb.exec(statement);
      }
    }
  });

  describe('Criação e persistência de exercício customizado', () => {
    it('cria exercício com muscle_group principal, secondary_muscles sanitizados e default_target_type = reps', () => {
      const created = createCustomExercise({
        name: 'Supino declinado com halteres',
        muscleGroup: 'Peito',
        equipment: 'Halteres',
        kind: 'composto',
        defaultIncrement: 2.0,
        defaultRestS: 90,
        notes: 'Foco na porção inferior do peitoral',
        secondaryMuscles: ['Peito', 'Ombro anterior', 'Tríceps', 'Ombro anterior'], // Contém duplicata e principal
        defaultTargetType: 'reps',
      });

      expect(created.id).toMatch(/^ex_custom_/);
      expect(created.name).toBe('Supino declinado com halteres');
      expect(created.muscleGroup).toBe('Peito');
      expect(created.equipment).toBe('Halteres');
      expect(created.defaultTargetType).toBe('reps');
      // Deve ter sanitizado: sem 'Peito' e sem duplicatas
      expect(created.secondaryMuscles).toEqual(['Ombro anterior', 'Tríceps']);

      // Consulta direta no SQLite para verificar armazenamento raw
      const rawRows = memoryDb
        .prepare('SELECT * FROM exercises WHERE id = ?')
        .all(created.id) as any[];

      expect(rawRows.length).toBe(1);
      const raw = rawRows[0];
      expect(raw.muscle_group).toBe('Peito');
      expect(raw.secondary_muscles).toBe('["Ombro anterior","Tríceps"]');
      expect(raw.default_target_type).toBe('reps');
      expect(raw.is_custom).toBe(1);
    });

    it('cria exercício com default_target_type = time para isometrias/cardio', () => {
      const created = createCustomExercise({
        name: 'Prancha lateral isométrica',
        muscleGroup: 'Abdômen',
        equipment: 'Peso corporal',
        kind: 'isolamento',
        defaultIncrement: 0,
        defaultRestS: 45,
        secondaryMuscles: ['Lombar'],
        defaultTargetType: 'time',
      });

      expect(created.defaultTargetType).toBe('time');

      // Verifica via getExerciseById
      const loaded = getExerciseById(created.id);
      expect(loaded).toBeDefined();
      expect(loaded?.defaultTargetType).toBe('time');
      expect(loaded?.secondaryMuscles).toEqual(['Lombar']);
    });
  });

  describe('Edição de exercício (updateCustomExercise)', () => {
    it('atualiza dados, higieniza músculos secundários se o grupo principal mudar e persiste', () => {
      const created = createCustomExercise({
        name: 'Exercício teste',
        muscleGroup: 'Costas superiores',
        equipment: 'Cabo / Polia',
        kind: 'composto',
        defaultIncrement: 2.5,
        defaultRestS: 90,
        secondaryMuscles: ['Bíceps', 'Dorsais'],
      });

      // Atualiza para ter Dorsais como principal
      const updated = updateCustomExercise(created.id, {
        name: 'Exercício teste renomeado',
        muscleGroup: 'Dorsais',
        // Se passarmos ['Dorsais', 'Bíceps'], 'Dorsais' não deve entrar como secundário
        secondaryMuscles: ['Dorsais', 'Bíceps', 'Costas superiores'],
        defaultTargetType: 'time',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Exercício teste renomeado');
      expect(updated?.muscleGroup).toBe('Dorsais');
      expect(updated?.secondaryMuscles).toEqual(['Bíceps', 'Costas superiores']);
      expect(updated?.defaultTargetType).toBe('time');

      // Verifica no SQLite
      const reloaded = getExerciseById(created.id);
      expect(reloaded?.name).toBe('Exercício teste renomeado');
      expect(reloaded?.muscleGroup).toBe('Dorsais');
      expect(reloaded?.secondaryMuscles).toEqual(['Bíceps', 'Costas superiores']);
      expect(reloaded?.defaultTargetType).toBe('time');
    });

    it('retorna null se tentar atualizar exercício inexistente', () => {
      const result = updateCustomExercise('id_fantasma', { name: 'Novo nome' });
      expect(result).toBeNull();
    });
  });

  describe('Exclusão de exercício customizado (deleteCustomExercise)', () => {
    it('permite excluir exercício marcado como is_custom = 1', () => {
      const created = createCustomExercise({
        name: 'Exercício temporário',
        muscleGroup: 'Ombro lateral',
        equipment: 'Halteres',
        defaultIncrement: 1.0,
        defaultRestS: 60,
      });

      const deleted = deleteCustomExercise(created.id);
      expect(deleted).toBe(true);

      const check = getExerciseById(created.id);
      expect(check).toBeNull();
    });

    it('rejeita exclusão de exercício padrão do sistema (is_custom = 0)', () => {
      // Insere um exercício padrão do sistema
      memoryDb.prepare(
        `INSERT INTO exercises (id, name, muscle_group, equipment, kind, default_increment, default_rest_s, is_custom, archived, secondary_muscles, default_target_type)
         VALUES ('ex_sistema_01', 'Supino padrão', 'Peito', 'Barra', 'composto', 2.5, 90, 0, 0, '[]', 'reps')`
      ).run();

      const deleted = deleteCustomExercise('ex_sistema_01');
      expect(deleted).toBe(false);

      const check = getExerciseById('ex_sistema_01');
      expect(check).not.toBeNull();
    });
  });

  describe('Listagem e consultas (listExercises, getExercisesForAddSelection, getExercisesWithPR)', () => {
    it('retorna secondaryMuscles como array parseado e defaultTargetType em todas as listagens', () => {
      createCustomExercise({
        name: 'Prancha teste',
        muscleGroup: 'Abdômen',
        equipment: 'Peso corporal',
        defaultIncrement: 0,
        defaultRestS: 45,
        secondaryMuscles: ['Lombar'],
        defaultTargetType: 'time',
      });

      const list = listExercises();
      expect(list.length).toBeGreaterThan(0);
      const prancha = list.find((e) => e.name === 'Prancha teste');
      expect(prancha).toBeDefined();
      expect(Array.isArray(prancha?.secondaryMuscles)).toBe(true);
      expect(prancha?.secondaryMuscles).toEqual(['Lombar']);
      expect(prancha?.defaultTargetType).toBe('time');

      const addSelection = getExercisesForAddSelection();
      const pranchaSelection = addSelection.find((e) => e.name === 'Prancha teste');
      expect(pranchaSelection).toBeDefined();
      expect(pranchaSelection?.defaultTargetType).toBe('time');
      expect(pranchaSelection?.secondaryMuscles).toEqual(['Lombar']);

      const withPr = getExercisesWithPR();
      const pranchaPR = withPr.find((e) => e.name === 'Prancha teste');
      expect(pranchaPR).toBeDefined();
      expect(pranchaPR?.defaultTargetType).toBe('time');
      expect(pranchaPR?.secondaryMuscles).toEqual(['Lombar']);
    });
  });

  describe('Integração com criação de séries padrão (addExerciseToWorkout e fallback)', () => {
    let workoutId: string;

    beforeEach(() => {
      // Cria grupo e treino
      memoryDb.prepare(`INSERT INTO groups (id, name, position, is_active) VALUES ('g1', 'Grupo Teste', 0, 1)`).run();
      memoryDb.prepare(`INSERT INTO workouts (id, group_id, name, position, is_active) VALUES ('w1', 'g1', 'Treino Teste', 0, 1)`).run();
      workoutId = 'w1';
    });

    it('ao adicionar exercício com default_target_type = reps, cria séries normais com reps_mode = reps_range (8-12)', () => {
      const exReps = createCustomExercise({
        name: 'Rosca martelo custom',
        muscleGroup: 'Bíceps',
        equipment: 'Halteres',
        defaultIncrement: 2.0,
        defaultRestS: 60,
        defaultTargetType: 'reps',
      });

      addExerciseToWorkout(workoutId, exReps.id);

      // Consulta workout_exercises
      const weRows = memoryDb.prepare('SELECT id, rep_min, rep_max FROM workout_exercises WHERE workout_id = ?').all(workoutId) as any[];
      expect(weRows.length).toBe(1);
      expect(weRows[0].rep_min).toBe(8);
      expect(weRows[0].rep_max).toBe(12);

      // Consulta workout_exercise_sets
      const setsRows = memoryDb.prepare('SELECT * FROM workout_exercise_sets WHERE workout_exercise_id = ?').all(weRows[0].id) as any[];
      expect(setsRows.length).toBe(3);
      for (const s of setsRows) {
        expect(s.reps_mode).toBe('reps_range');
        expect(s.min_reps).toBe(8);
        expect(s.max_reps).toBe(12);
      }
    });

    it('ao adicionar exercício com default_target_type = time, cria séries com reps_mode = time (ex: 45s)', () => {
      const exTime = createCustomExercise({
        name: 'Prancha isométrica custom',
        muscleGroup: 'Abdômen',
        equipment: 'Peso corporal',
        defaultIncrement: 0,
        defaultRestS: 45,
        defaultTargetType: 'time',
      });

      addExerciseToWorkout(workoutId, exTime.id);

      const weRows = memoryDb.prepare('SELECT id, rep_min, rep_max FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?').all(workoutId, exTime.id) as any[];
      expect(weRows.length).toBe(1);
      expect(weRows[0].rep_min).toBe(45);
      expect(weRows[0].rep_max).toBe(45);

      const setsRows = memoryDb.prepare('SELECT * FROM workout_exercise_sets WHERE workout_exercise_id = ?').all(weRows[0].id) as any[];
      expect(setsRows.length).toBe(3);
      for (const s of setsRows) {
        expect(s.reps_mode).toBe('time');
        expect(s.min_reps).toBe(45);
        expect(s.max_reps).toBe(45);
      }
    });

    it('fallback getWorkoutExerciseSets gera séries com reps_mode = time quando exercício tiver default_target_type = time', () => {
      const exTime = createCustomExercise({
        name: 'Isometria sem sets salvos',
        muscleGroup: 'Quadríceps',
        equipment: 'Peso corporal',
        defaultIncrement: 0,
        defaultRestS: 60,
        defaultTargetType: 'time',
      });

      // Insere workout_exercise sem workout_exercise_sets
      const weId = 'we_manual_time';
      memoryDb.prepare(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
         VALUES (?, ?, ?, 0, 3, 45, 45, 60)`
      ).run(weId, workoutId, exTime.id);

      // getWorkoutExerciseSets deve cair no fallback e gerar reps_mode = 'time'
      const generated = getWorkoutExerciseSets(weId);
      expect(generated.length).toBe(3);
      for (const s of generated) {
        expect(s.repsMode).toBe('time');
        expect(s.minReps).toBe(45);
        expect(s.maxReps).toBe(45);
      }
    });

    it('addExerciseToSession gera séries em sets com reps_mode = time (45s)', () => {
      // Cria sessão de teste
      memoryDb.prepare(`INSERT INTO sessions (id, name_snapshot, started_at, status) VALUES ('s1', 'Sessão Teste', 12345678, 'in_progress')`).run();

      const exTime = createCustomExercise({
        name: 'Prancha na sessão',
        muscleGroup: 'Abdômen',
        equipment: 'Peso corporal',
        defaultIncrement: 0,
        defaultRestS: 45,
        defaultTargetType: 'time',
      });

      const seId = addExerciseToSession('s1', exTime.id);

      const sets = memoryDb.prepare('SELECT * FROM sets WHERE session_exercise_id = ?').all(seId) as any[];
      expect(sets.length).toBe(3);
      for (const s of sets) {
        expect(s.reps_mode).toBe('time');
        expect(s.min_reps).toBe(45);
        expect(s.max_reps).toBe(45);
        expect(s.reps).toBe(45);
      }
    });
  });
});
