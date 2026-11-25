import { describe, it, expect } from 'vitest';
import { seedExercises } from '../seed';
import { migrations } from '../migrations';
import { settings } from '../schema';

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

  it('o schema Drizzle de settings deve mapear default_rest_s', () => {
    expect(settings.defaultRestS).toBeDefined();
    expect(settings.defaultRestS.name).toBe('default_rest_s');
  });
});
