import { create } from 'zustand';
import { getExpoDb, initializeDatabase } from '../db';

export interface SettingsState {
  userName: string | null;
  unit: 'kg' | 'lb';
  defaultIncrement: number;
  defaultRestS: number;
  autoRestTimer: boolean;
  restAlert: string;
  onboarded: boolean;
  isReady: boolean;
  dbError: string | null;
  loadSettings: () => Promise<void>;
  setUserName: (name: string) => Promise<void>;
  setUnit: (unit: 'kg' | 'lb') => Promise<void>;
  setDefaultIncrement: (inc: number) => Promise<void>;
  setDefaultRestS: (sec: number) => Promise<void>;
  setAutoRestTimer: (enabled: boolean) => Promise<void>;
  setRestAlert: (alert: string) => Promise<void>;
  setOnboarded: (onboarded: boolean) => Promise<void>;
  completeOnboarding: (data: {
    unit: 'kg' | 'lb';
    defaultIncrement: number;
    defaultRestS: number;
  }) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  testRecordCount: number;
  insertTestRecord: () => Promise<void>;
  fetchTestRecordCount: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  userName: null,
  unit: 'kg',
  defaultIncrement: 2.5,
  defaultRestS: 90,
  autoRestTimer: true,
  restAlert: 'vibrate',
  onboarded: false,
  isReady: false,
  dbError: null,
  testRecordCount: 0,

  loadSettings: async () => {
    try {
      await initializeDatabase();
      const rawDb = getExpoDb();
      const rows = rawDb.getAllSync<{
        user_name?: string | null;
        unit: string;
        default_increment: number;
        default_rest_s?: number;
        auto_rest_timer: number;
        rest_alert: string;
        onboarded: number;
      }>('SELECT * FROM settings WHERE id = 1 LIMIT 1');

      if (rows.length > 0) {
        const row = rows[0];
        set({
          userName: row.user_name || null,
          unit: (row.unit as 'kg' | 'lb') || 'kg',
          defaultIncrement: row.default_increment ?? 2.5,
          defaultRestS: row.default_rest_s ?? 90,
          autoRestTimer: Boolean(row.auto_rest_timer),
          restAlert: row.rest_alert || 'vibrate',
          onboarded: Boolean(row.onboarded),
          isReady: true,
          dbError: null,
        });
      } else {
        set({ isReady: true });
      }

      await get().fetchTestRecordCount();
    } catch (err: any) {
      set({ dbError: err?.message || 'Erro ao carregar banco de dados', isReady: true });
    }
  },

  setUserName: async (name: string) => {
    const trimmed = name.trim();
    set({ userName: trimmed || null });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET user_name = ? WHERE id = 1', [trimmed || null]);
    } catch (err) {
      console.warn('Erro ao atualizar nome do usuário:', err);
    }
  },

  setUnit: async (unit: 'kg' | 'lb') => {
    set({ unit });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET unit = ? WHERE id = 1', [unit]);
    } catch (err) {
      console.warn('Erro ao atualizar unidade:', err);
    }
  },

  setDefaultIncrement: async (inc: number) => {
    set({ defaultIncrement: inc });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET default_increment = ? WHERE id = 1', [inc]);
    } catch (err) {
      console.warn('Erro ao atualizar incremento:', err);
    }
  },

  setDefaultRestS: async (sec: number) => {
    set({ defaultRestS: sec });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET default_rest_s = ? WHERE id = 1', [sec]);
    } catch (err) {
      console.warn('Erro ao atualizar descanso padrão:', err);
    }
  },

  setAutoRestTimer: async (enabled: boolean) => {
    set({ autoRestTimer: enabled });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET auto_rest_timer = ? WHERE id = 1', [enabled ? 1 : 0]);
    } catch (err) {
      console.warn('Erro ao atualizar auto rest timer:', err);
    }
  },

  setRestAlert: async (alert: string) => {
    set({ restAlert: alert });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET rest_alert = ? WHERE id = 1', [alert]);
    } catch (err) {
      console.warn('Erro ao atualizar alerta sonoro/vibração:', err);
    }
  },

  setOnboarded: async (onboarded: boolean) => {
    set({ onboarded });
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET onboarded = ? WHERE id = 1', [onboarded ? 1 : 0]);
    } catch (err) {
      console.warn('Erro ao atualizar onboarded:', err);
    }
  },

  completeOnboarding: async (data: {
    unit: 'kg' | 'lb';
    defaultIncrement: number;
    defaultRestS: number;
  }) => {
    const rawDb = getExpoDb();
    // Executa em transação única atômica
    rawDb.runSync(
      `UPDATE settings 
       SET unit = ?, default_increment = ?, default_rest_s = ?, auto_rest_timer = 1, onboarded = 1 
       WHERE id = 1`,
      [data.unit, data.defaultIncrement, data.defaultRestS]
    );

    set({
      unit: data.unit,
      defaultIncrement: data.defaultIncrement,
      defaultRestS: data.defaultRestS,
      autoRestTimer: true,
      onboarded: true,
    });
  },

  resetOnboarding: async () => {
    try {
      const rawDb = getExpoDb();
      rawDb.runSync('UPDATE settings SET onboarded = 0 WHERE id = 1');
      set({ onboarded: false });
    } catch (err) {
      console.warn('Erro ao resetar onboarding:', err);
    }
  },

  fetchTestRecordCount: async () => {
    try {
      const rawDb = getExpoDb();
      const result = rawDb.getAllSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sessions WHERE name_snapshot LIKE 'Treino de teste%'"
      );
      const count = result[0]?.count ?? 0;
      set({ testRecordCount: count });
    } catch (err) {
      console.warn('Erro ao buscar contagem de testes:', err);
    }
  },

  insertTestRecord: async () => {
    try {
      const rawDb = getExpoDb();
      const testId = `test_sess_${Date.now()}`;
      const now = Date.now();
      rawDb.runSync(
        `INSERT INTO sessions (id, name_snapshot, started_at, ended_at, status, total_paused_s)
         VALUES (?, ?, ?, ?, 'completed', 0)`,
        [testId, `Treino de teste #${Date.now().toString().slice(-4)}`, now, now + 1800000]
      );
      await get().fetchTestRecordCount();
    } catch (err) {
      console.warn('Erro ao inserir registro de teste:', err);
    }
  },
}));
