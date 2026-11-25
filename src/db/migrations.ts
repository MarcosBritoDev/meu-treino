/**
 * Migrações SQLite Versionadas — Volt Precision
 * 
 * Permite que o banco de dados seja criado e atualizado incrementalmente,
 * mantendo compatibilidade total 100% offline.
 */

export interface Migration {
  version: number;
  name: string;
  sql: string[];
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: [
      // 1. settings
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        unit TEXT NOT NULL DEFAULT 'kg',
        default_increment REAL NOT NULL DEFAULT 2.5,
        auto_rest_timer INTEGER NOT NULL DEFAULT 1,
        rest_alert TEXT NOT NULL DEFAULT 'vibrate',
        onboarded INTEGER NOT NULL DEFAULT 0
      );`,

      // 2. exercises
      `CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment TEXT NOT NULL,
        kind TEXT NOT NULL,
        default_increment REAL NOT NULL DEFAULT 2.5,
        default_rest_s INTEGER NOT NULL DEFAULT 90,
        notes TEXT,
        is_custom INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0
      );`,

      // 3. groups
      `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        frequency_days INTEGER,
        position INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );`,

      // 4. workouts
      `CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        group_id TEXT REFERENCES groups(id),
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );`,

      // 5. workout_exercises
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER NOT NULL DEFAULT 3,
        rep_min INTEGER NOT NULL DEFAULT 8,
        rep_max INTEGER NOT NULL DEFAULT 12,
        rest_s INTEGER NOT NULL DEFAULT 90,
        note TEXT
      );`,

      // 6. sessions
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        workout_id TEXT REFERENCES workouts(id),
        name_snapshot TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        status TEXT NOT NULL DEFAULT 'in_progress',
        total_paused_s INTEGER NOT NULL DEFAULT 0
      );`,

      // 7. session_exercises
      `CREATE TABLE IF NOT EXISTS session_exercises (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER NOT NULL DEFAULT 3,
        rep_min INTEGER NOT NULL DEFAULT 8,
        rep_max INTEGER NOT NULL DEFAULT 12,
        rest_s INTEGER NOT NULL DEFAULT 90,
        note TEXT,
        is_session_only INTEGER NOT NULL DEFAULT 0
      );`,

      // 8. sets
      `CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY,
        session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
        "index" INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        rpe REAL,
        is_warmup INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        is_pr_weight INTEGER NOT NULL DEFAULT 0,
        is_pr_volume INTEGER NOT NULL DEFAULT 0
      );`,

      // Tabela interna para controle de migrações
      `CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 2,
    name: 'add_default_rest_s_to_settings',
    sql: [
      `ALTER TABLE settings ADD COLUMN default_rest_s INTEGER NOT NULL DEFAULT 90;`,
    ],
  },
];
