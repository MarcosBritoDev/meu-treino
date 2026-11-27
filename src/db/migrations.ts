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
  {
    version: 3,
    name: 'add_badge_to_groups',
    sql: [
      `ALTER TABLE groups ADD COLUMN badge TEXT;`,
    ],
  },
  {
    version: 4,
    name: 'add_user_name_to_settings',
    sql: [
      `ALTER TABLE settings ADD COLUMN user_name TEXT;`,
    ],
  },
  {
    version: 5,
    name: '0003_planned_sets',
    sql: [
      `CREATE TABLE IF NOT EXISTS workout_exercise_sets (
        id TEXT PRIMARY KEY,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('warmup','normal','failure','drop')) DEFAULT 'normal',
        reps_mode TEXT NOT NULL CHECK (reps_mode IN ('reps','reps_range','reps_max','amrap','time','time_range')) DEFAULT 'reps_range',
        min_reps INTEGER,
        max_reps INTEGER,
        effort_mode TEXT NOT NULL CHECK (effort_mode IN ('none','rpe','rpe_range','rir','percent_1rm','percent_1rm_exercise','last_week_plus','last_session_plus')) DEFAULT 'none',
        effort_value REAL,
        effort_value_max REAL,
        effort_ref_exercise_id TEXT,
        rest_s INTEGER
      );`,
      `ALTER TABLE sets ADD COLUMN type TEXT NOT NULL DEFAULT 'normal';`,
      `ALTER TABLE sets ADD COLUMN reps_mode TEXT NOT NULL DEFAULT 'reps_range';`,
      `ALTER TABLE sets ADD COLUMN min_reps INTEGER;`,
      `ALTER TABLE sets ADD COLUMN max_reps INTEGER;`,
      `ALTER TABLE sets ADD COLUMN effort_mode TEXT NOT NULL DEFAULT 'none';`,
      `ALTER TABLE sets ADD COLUMN effort_value REAL;`,
      `ALTER TABLE sets ADD COLUMN effort_value_max REAL;`,
      `ALTER TABLE sets ADD COLUMN effort_ref_exercise_id TEXT;`,
      `ALTER TABLE sets ADD COLUMN rest_s INTEGER;`,
      `ALTER TABLE sets ADD COLUMN is_session_only INTEGER NOT NULL DEFAULT 0;`,
      `UPDATE sets SET type = 'warmup' WHERE is_warmup = 1;`,
      `INSERT INTO workout_exercise_sets (id, workout_exercise_id, position, type, reps_mode, min_reps, max_reps, effort_mode, rest_s)
       SELECT 
         'wes_' || we.id || '_' || n.pos AS id,
         we.id AS workout_exercise_id,
         n.pos AS position,
         'normal' AS type,
         'reps_range' AS reps_mode,
         we.rep_min AS min_reps,
         we.rep_max AS max_reps,
         'none' AS effort_mode,
         NULL AS rest_s
       FROM workout_exercises we
       JOIN (
         WITH RECURSIVE cnt(pos) AS (
           SELECT 0
           UNION ALL
           SELECT pos + 1 FROM cnt WHERE pos < 100
         )
         SELECT pos FROM cnt
       ) n ON n.pos < we.target_sets
       WHERE NOT EXISTS (
         SELECT 1 FROM workout_exercise_sets wes WHERE wes.workout_exercise_id = we.id
       );`,
    ],
  },
  {
    version: 6,
    name: '0004_drop_percent',
    sql: [
      `ALTER TABLE workout_exercise_sets ADD COLUMN drop_percent REAL NULL;`,
      `ALTER TABLE sets ADD COLUMN drop_percent REAL NULL;`,
      `UPDATE workout_exercise_sets SET drop_percent = 20 WHERE type = 'drop' AND drop_percent IS NULL;`,
      `UPDATE sets SET drop_percent = 20 WHERE type = 'drop' AND drop_percent IS NULL;`,
    ],
  },
  {
    version: 7,
    name: '0005_expanded_exercise_catalog',
    sql: [
      `ALTER TABLE exercises ADD COLUMN secondary_muscles TEXT NOT NULL DEFAULT '[]';`,
      `ALTER TABLE exercises ADD COLUMN default_target_type TEXT NOT NULL DEFAULT 'reps';`,
      `UPDATE exercises SET default_target_type = 'time' WHERE id IN ('ex_abdomen_03', 'ex_cardio_01');`,
    ],
  },
];
