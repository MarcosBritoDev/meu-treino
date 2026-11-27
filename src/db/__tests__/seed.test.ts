import { describe, it, expect } from 'vitest';
import { seedExercises } from '../seed';
import { migrations } from '../migrations';
import { settings, exercises } from '../schema';
import { parseSecondaryMuscles } from '../../domain/exerciseCatalog';

describe('Seed e Migrações — Volt Precision', () => {
  it('deve possuir ao menos 40 exercícios cadastrados no seed', () => {
    expect(seedExercises.length).toBeGreaterThanOrEqual(40);
  });

  it('deve possuir IDs únicos para todos os exercícios do seed', () => {
    const ids = seedExercises.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('deve cobrir todos os 6 grupos musculares requeridos', () => {
    const requiredGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen'];
    const presentGroups = new Set(seedExercises.map((e) => e.muscleGroup));

    for (const group of requiredGroups) {
      expect(presentGroups.has(group)).toBe(true);
    }
  });

  it('deve cobrir todos os 5 tipos de equipamentos requeridos', () => {
    const requiredEquipments = ['Barra', 'Halteres', 'Cabo', 'Máquina', 'Peso corporal'];
    const presentEquipments = new Set(seedExercises.map((e) => e.equipment));

    for (const eq of requiredEquipments) {
      expect(presentEquipments.has(eq)).toBe(true);
    }
  });

  it('todos os nomes de exercícios devem respeitar sentence case (sem caixa alta indevida)', () => {
    for (const ex of seedExercises) {
      expect(ex.name).not.toBe(ex.name.toUpperCase());
      expect(ex.name[0]).toBe(ex.name[0].toUpperCase());
    }
  });

  it('todos os exercícios do seed devem possuir secondary_muscles e default_target_type válidos', () => {
    for (const ex of seedExercises) {
      expect(['reps', 'time']).toContain(ex.defaultTargetType);
      const secondaries = parseSecondaryMuscles(ex.secondaryMuscles);
      expect(Array.isArray(secondaries)).toBe(true);
      // Nenhum secundário deve ser igual ao músculo principal
      expect(secondaries).not.toContain(ex.muscleGroup);
    }

    // Prancha isométrica deve ter target time
    const plank = seedExercises.find((e) => e.id === 'ex_abdomen_03');
    expect(plank?.defaultTargetType).toBe('time');
  });

  it('deve conter a migração inicial com todas as 8 tabelas do schema e tabela de controle', () => {
    expect(migrations.length).toBeGreaterThanOrEqual(1);
    const m1 = migrations[0];
    expect(m1.version).toBe(1);
    const sqlText = m1.sql.join(' ');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS settings');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS exercises');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS groups');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS workouts');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS workout_exercises');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS session_exercises');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS sets');
    expect(sqlText).toContain('CREATE TABLE IF NOT EXISTS _migrations');
  });

  it('deve conter migração versionada adicionando default_rest_s à tabela settings', () => {
    expect(migrations.length).toBeGreaterThanOrEqual(2);
    const m2 = migrations.find((m) => m.version === 2);
    expect(m2).toBeDefined();
    expect(m2?.sql.join(' ')).toContain('ALTER TABLE settings ADD COLUMN default_rest_s');
  });

  it('deve conter migração 7 versionada adicionando secondary_muscles e default_target_type a exercises', () => {
    expect(migrations.length).toBeGreaterThanOrEqual(7);
    const m7 = migrations.find((m) => m.version === 7);
    expect(m7).toBeDefined();
    const sql = m7?.sql.join(' ');
    expect(sql).toContain('ALTER TABLE exercises ADD COLUMN secondary_muscles');
    expect(sql).toContain('ALTER TABLE exercises ADD COLUMN default_target_type');
  });

  it('o schema Drizzle de settings e exercises deve mapear as novas colunas', () => {
    expect(settings.defaultRestS).toBeDefined();
    expect(settings.defaultRestS.name).toBe('default_rest_s');
    expect(exercises.secondaryMuscles).toBeDefined();
    expect(exercises.secondaryMuscles.name).toBe('secondary_muscles');
    expect(exercises.defaultTargetType).toBeDefined();
    expect(exercises.defaultTargetType.name).toBe('default_target_type');
  });
});
