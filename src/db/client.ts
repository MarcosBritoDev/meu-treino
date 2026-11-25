import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { migrations } from './migrations';
import { seedExercises } from './seed';

export const DB_NAME = 'volt_precision.db';

let expoDbInstance: SQLite.SQLiteDatabase | null = null;
let drizzleDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Obtém ou inicializa a conexão nativa com expo-sqlite
 */
export function getExpoDb(): SQLite.SQLiteDatabase {
  if (!expoDbInstance) {
    expoDbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return expoDbInstance;
}

/**
 * Retorna o cliente Drizzle ORM configurado
 */
export function getDb() {
  if (!drizzleDbInstance) {
    const rawDb = getExpoDb();
    drizzleDbInstance = drizzle(rawDb, { schema });
  }
  return drizzleDbInstance;
}

/**
 * Inicializa o banco de dados, executa as migrações versionadas pendentes
 * e aplica o seed inicial de exercícios e configurações se necessário.
 */
export async function initializeDatabase(): Promise<void> {
  const rawDb = getExpoDb();

  // Executa pragmas recomendados para performance e integridade offline
  rawDb.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Garante tabela de migrações
  rawDb.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  // Lê migrações já aplicadas
  const appliedRows = rawDb.getAllSync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // Executa migrações pendentes em ordem
  for (const m of migrations) {
    if (!appliedVersions.has(m.version)) {
      for (const statement of m.sql) {
        rawDb.execSync(statement);
      }
      rawDb.runSync(
        'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [m.version, m.name, Date.now()]
      );
    }
  }

  // Garante linha de configurações padrão (id = 1)
  const existingSettings = rawDb.getAllSync(
    'SELECT id FROM settings WHERE id = 1 LIMIT 1'
  );
  if (existingSettings.length === 0) {
    rawDb.runSync(
      `INSERT INTO settings (id, unit, default_increment, default_rest_s, auto_rest_timer, rest_alert, onboarded)
       VALUES (1, 'kg', 2.5, 90, 1, 'vibrate', 0)`
    );
  }

  // Verifica se a biblioteca de exercícios está vazia para aplicar o seed
  const existingExercises = rawDb.getAllSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );
  const exerciseCount = existingExercises[0]?.count ?? 0;

  if (exerciseCount === 0) {
    // Insere seed em lote
    for (const ex of seedExercises) {
      rawDb.runSync(
        `INSERT INTO exercises (
          id, name, muscle_group, equipment, kind, default_increment, default_rest_s, notes, is_custom, archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ex.id,
          ex.name,
          ex.muscleGroup,
          ex.equipment,
          ex.kind,
          ex.defaultIncrement ?? 2.5,
          ex.defaultRestS ?? 90,
          ex.notes ?? null,
          ex.isCustom ? 1 : 0,
          ex.archived ? 1 : 0,
        ]
      );
    }
  }
}
