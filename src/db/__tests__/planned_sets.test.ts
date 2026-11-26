import { describe, it, expect } from 'vitest';
import { migrations } from '../migrations';
import { workoutExerciseSets, sets, workoutExercises } from '../schema';
import type { PlannedSet, SetType, RepsMode, EffortMode } from '../../domain/types';

describe('ETAPA 1 — Migração 0003 e Camada de Dados (Séries Planejadas)', () => {
  describe('Migração 0003 (planned_sets)', () => {
    it('deve conter a migração 0003 versionada na lista de migrações', () => {
      const mPlanned = migrations.find((m) => m.name.includes('0003') || m.name.includes('planned_sets'));
      expect(mPlanned).toBeDefined();
      expect(mPlanned?.version).toBe(5);
    });

    it('deve criar a tabela workout_exercise_sets com ON DELETE CASCADE e todas as restrições CHECK requeridas', () => {
      const mPlanned = migrations.find((m) => m.name.includes('0003') || m.name.includes('planned_sets'))!;
      const sqlFull = mPlanned.sql.join('\n');

      expect(sqlFull).toContain('CREATE TABLE IF NOT EXISTS workout_exercise_sets');
      expect(sqlFull).toContain('workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE');
      expect(sqlFull).toContain('position INTEGER NOT NULL');

      // Tipos permitidos
      expect(sqlFull).toContain("CHECK (type IN ('warmup','normal','failure','drop'))");

      // Modos de reps/tempo permitidos
      expect(sqlFull).toContain("CHECK (reps_mode IN ('reps','reps_range','reps_max','amrap','time','time_range'))");

      // Metas de esforço permitidas
      expect(sqlFull).toContain(
        "CHECK (effort_mode IN ('none','rpe','rpe_range','rir','percent_1rm','percent_1rm_exercise','last_week_plus','last_session_plus'))"
      );

      // Colunas de esforço e descanso
      expect(sqlFull).toContain('effort_value REAL');
      expect(sqlFull).toContain('effort_value_max REAL');
      expect(sqlFull).toContain('effort_ref_exercise_id TEXT');
      expect(sqlFull).toContain('rest_s INTEGER');

      // Regra 1: NÃO criar coluna target_weight — a prévia não armazena pesos
      expect(sqlFull).not.toContain('target_weight');
    });

    it('deve adicionar à tabela sets as colunas para snapshot de planejamento e isolamento de sessão', () => {
      const mPlanned = migrations.find((m) => m.name.includes('0003') || m.name.includes('planned_sets'))!;
      const sqlFull = mPlanned.sql.join('\n');

      expect(sqlFull).toContain("ALTER TABLE sets ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'");
      expect(sqlFull).toContain("ALTER TABLE sets ADD COLUMN reps_mode TEXT NOT NULL DEFAULT 'reps_range'");
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN min_reps INTEGER');
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN max_reps INTEGER');
      expect(sqlFull).toContain("ALTER TABLE sets ADD COLUMN effort_mode TEXT NOT NULL DEFAULT 'none'");
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN effort_value REAL');
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN effort_value_max REAL');
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN effort_ref_exercise_id TEXT');
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN rest_s INTEGER');
      expect(sqlFull).toContain('ALTER TABLE sets ADD COLUMN is_session_only INTEGER NOT NULL DEFAULT 0');
    });

    it('deve preservar séries antigas na tabela sets mantendo sets.rpe e convertendo is_warmup para type', () => {
      const mPlanned = migrations.find((m) => m.name.includes('0003') || m.name.includes('planned_sets'))!;
      const sqlFull = mPlanned.sql.join('\n');

      expect(sqlFull).toContain("UPDATE sets SET type = 'warmup' WHERE is_warmup = 1");
      // Mantém rpe na tabela de sets (não exclui nem renomeia rpe)
      expect(sets.rpe).toBeDefined();
    });

    it('deve conter query de backfill para gerar target_sets séries para exercícios existentes sem séries planejadas', () => {
      const mPlanned = migrations.find((m) => m.name.includes('0003') || m.name.includes('planned_sets'))!;
      const sqlFull = mPlanned.sql.join('\n');

      expect(sqlFull).toContain('INSERT INTO workout_exercise_sets');
      expect(sqlFull).toContain('WITH RECURSIVE cnt(pos)');
      expect(sqlFull).toContain('WHERE NOT EXISTS');
      expect(sqlFull).toContain('FROM workout_exercise_sets wes WHERE wes.workout_exercise_id = we.id');
    });
  });

  describe('Drizzle Schema e Tipagens', () => {
    it('o schema Drizzle deve mapear workoutExerciseSets com todas as propriedades esperadas', () => {
      expect(workoutExerciseSets.id).toBeDefined();
      expect(workoutExerciseSets.workoutExerciseId).toBeDefined();
      expect(workoutExerciseSets.position).toBeDefined();
      expect(workoutExerciseSets.type).toBeDefined();
      expect(workoutExerciseSets.repsMode).toBeDefined();
      expect(workoutExerciseSets.minReps).toBeDefined();
      expect(workoutExerciseSets.maxReps).toBeDefined();
      expect(workoutExerciseSets.effortMode).toBeDefined();
      expect(workoutExerciseSets.effortValue).toBeDefined();
      expect(workoutExerciseSets.effortValueMax).toBeDefined();
      expect(workoutExerciseSets.effortRefExerciseId).toBeDefined();
      expect(workoutExerciseSets.restS).toBeDefined();
    });

    it('o schema Drizzle de sets deve mapear as novas colunas de planejamento e isolamento', () => {
      expect(sets.type).toBeDefined();
      expect(sets.repsMode).toBeDefined();
      expect(sets.minReps).toBeDefined();
      expect(sets.maxReps).toBeDefined();
      expect(sets.effortMode).toBeDefined();
      expect(sets.effortValue).toBeDefined();
      expect(sets.effortValueMax).toBeDefined();
      expect(sets.effortRefExerciseId).toBeDefined();
      expect(sets.restS).toBeDefined();
      expect(sets.isSessionOnly).toBeDefined();
      expect(sets.rpe).toBeDefined(); // Compatibilidade histórica
    });

    it('deve validar tipos de PlannedSet e tipos literais', () => {
      const validSet: PlannedSet = {
        id: 'wes_test_1',
        workoutExerciseId: 'we_1',
        position: 0,
        type: 'normal',
        repsMode: 'reps_range',
        minReps: 8,
        maxReps: 12,
        effortMode: 'rpe',
        effortValue: 8.5,
        effortValueMax: null,
        effortRefExerciseId: null,
        restS: 90,
      };

      expect(validSet.type).toBe('normal');
      expect(validSet.repsMode).toBe('reps_range');
      expect(validSet.effortMode).toBe('rpe');
    });

    it('reindexação contígua de position (0..N-1) sem buracos', () => {
      const inputSets: Array<Omit<PlannedSet, 'position'> & { position?: number }> = [
        { id: 's1', type: 'warmup', repsMode: 'reps_range', effortMode: 'none', position: 5 },
        { id: 's2', type: 'normal', repsMode: 'reps', effortMode: 'none', position: 2 },
        { id: 's3', type: 'failure', repsMode: 'reps_max', effortMode: 'none', position: 99 },
      ];

      const reindexed = inputSets.map((s, index) => ({
        ...s,
        position: index,
      }));

      expect(reindexed.map((s) => s.position)).toEqual([0, 1, 2]);
    });
  });
});
