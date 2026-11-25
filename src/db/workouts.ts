import { getExpoDb } from './client';
import { estimarDuracao } from '../domain/duration';
import {
  formatTempoRelativoLog,
  calculateNextScheduledWorkoutIndex,
} from '../domain/workouts';

export { formatTempoRelativoLog, calculateNextScheduledWorkoutIndex };

export interface WorkoutItemDetail {
  id: string;
  groupId: string | null;
  code: string;
  name: string;
  position: number;
  exerciseCount: number;
  totalSets: number;
  estimatedDurationMin: number;
  targetMuscles: string;
  previewExercises: string;
}

export interface WorkoutGroupDetail {
  id: string;
  name: string;
  description: string | null;
  frequencyDays: number | null;
  frequencyText: string;
  position: number;
  isActive: boolean;
  badge: string;
  workoutCount: number;
  totalEstimatedMin: number;
  workouts: WorkoutItemDetail[];
}

export interface WorkoutSummaryResult {
  totalGroups: number;
  totalWorkouts: number;
  groups: WorkoutGroupDetail[];
}

/**
 * Consulta o resumo completo de grupos de treino, seus treinos e contadores reais.
 */
export function getWorkoutGroupsSummary(): WorkoutSummaryResult {
  try {
    const rawDb = getExpoDb();

    // 1. Grupos cadastrados (ativos primeiro, depois por posição)
    const groupRows = rawDb.getAllSync<{
      id: string;
      name: string;
      description: string | null;
      frequencyDays: number | null;
      position: number;
      isActive: number;
      badge: string | null;
    }>(
      `SELECT id, name, description, frequency_days AS frequencyDays, position, is_active AS isActive, badge
       FROM groups
       ORDER BY is_active DESC, position ASC, name ASC`
    );

    // 2. Total geral de treinos cadastrados (para métricas reais)
    const totalWorkoutsRows = rawDb.getAllSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM workouts WHERE is_active = 1`
    );
    const totalWorkouts = totalWorkoutsRows[0]?.count ?? 0;

    const groups: WorkoutGroupDetail[] = [];

    for (let gIdx = 0; gIdx < groupRows.length; gIdx++) {
      const g = groupRows[gIdx];
      const isGroupActive = Boolean(g.isActive);

      // Treinos deste grupo
      const workoutRows = rawDb.getAllSync<{
        id: string;
        groupId: string | null;
        name: string;
        position: number;
      }>(
        `SELECT id, group_id AS groupId, name, position
         FROM workouts
         WHERE group_id = ? AND is_active = 1
         ORDER BY position ASC, name ASC`,
        [g.id]
      );

      const workouts: WorkoutItemDetail[] = [];
      let groupTotalEstSeconds = 0;

      for (let wIdx = 0; wIdx < workoutRows.length; wIdx++) {
        const w = workoutRows[wIdx];
        const groupLetter = String.fromCharCode(65 + (gIdx % 26)); // A, B, C...
        const code = `${groupLetter}-${wIdx + 1}`;

        // Exercícios deste treino
        const exRows = rawDb.getAllSync<{
          exerciseId: string;
          name: string;
          muscleGroup: string;
          targetSets: number;
          restS: number;
        }>(
          `SELECT 
            we.exercise_id AS exerciseId,
            e.name AS name,
            e.muscle_group AS muscleGroup,
            we.target_sets AS targetSets,
            we.rest_s AS restS
           FROM workout_exercises we
           JOIN exercises e ON e.id = we.exercise_id
           WHERE we.workout_id = ?
           ORDER BY we.position ASC`,
          [w.id]
        );

        const exerciseCount = exRows.length;
        const totalSets = exRows.reduce((acc, curr) => acc + (curr.targetSets || 0), 0);

        // Estimativa de duração pelo domínio
        const durationSeconds = estimarDuracao({
          exercises: exRows.map((r) => ({
            targetSets: r.targetSets,
            restS: r.restS,
          })),
        });
        groupTotalEstSeconds += durationSeconds;
        const estimatedDurationMin = Math.max(1, Math.round(durationSeconds / 60));

        // Músculos envolvidos (únicos e em minúsculas legíveis)
        const musclesSet = Array.from(new Set(exRows.map((r) => r.muscleGroup.toLowerCase())));
        let targetMuscles = 'Geral';
        if (musclesSet.length > 0) {
          if (musclesSet.length === 1) {
            targetMuscles = musclesSet[0].charAt(0).toUpperCase() + musclesSet[0].slice(1);
          } else if (musclesSet.length === 2) {
            targetMuscles = `${musclesSet[0]} e ${musclesSet[1]}`;
            targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
          } else {
            const last = musclesSet[musclesSet.length - 1];
            const initial = musclesSet.slice(0, -1).join(', ');
            targetMuscles = `${initial} e ${last}`;
            targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
          }
        }

        // Prévia dos primeiros exercícios
        let previewExercises = '';
        if (exRows.length > 0) {
          const names = exRows.map((r) => r.name);
          if (names.length <= 3) {
            previewExercises = names.join(', ');
          } else {
            const firstThree = names.slice(0, 3).join(', ');
            const remaining = names.length - 3;
            previewExercises = `${firstThree} +${remaining}`;
          }
        }

        workouts.push({
          id: w.id,
          groupId: w.groupId,
          code,
          name: w.name,
          position: w.position,
          exerciseCount,
          totalSets,
          estimatedDurationMin,
          targetMuscles,
          previewExercises,
        });
      }

      // Selo do grupo (Ativo para o ativo; Secundário/Manutenção para os demais)
      let badge = 'Secundário';
      if (isGroupActive) {
        badge = 'Ativo';
      } else if (g.badge && g.badge.trim()) {
        badge = g.badge.trim();
      } else if (gIdx === 1) {
        badge = 'Secundário';
      } else if (gIdx === 2) {
        badge = 'Manutenção';
      }

      // Frequência descritiva
      let frequencyText = '';
      if (g.frequencyDays) {
        frequencyText = `${g.frequencyDays} dias por semana`;
      } else if (isGroupActive) {
        frequencyText = '3 a 6 dias por semana';
      } else {
        frequencyText = `${workouts.length} ${workouts.length === 1 ? 'treino' : 'treinos'}`;
      }

      const totalEstimatedMin = Math.max(1, Math.round(groupTotalEstSeconds / 60));

      groups.push({
        id: g.id,
        name: g.name,
        description: g.description,
        frequencyDays: g.frequencyDays,
        frequencyText,
        position: g.position,
        isActive: isGroupActive,
        badge,
        workoutCount: workouts.length,
        totalEstimatedMin,
        workouts,
      });
    }

    return {
      totalGroups: groupRows.length,
      totalWorkouts,
      groups,
    };
  } catch (error) {
    console.warn('Erro ao consultar resumo de grupos de treino:', error);
    return { totalGroups: 0, totalWorkouts: 0, groups: [] };
  }
}

/**
 * Define um grupo como ativo e desativa os demais (regra: apenas 1 ativo por vez).
 */
export function setActiveGroup(groupId: string): void {
  const rawDb = getExpoDb();
  rawDb.execSync(`
    UPDATE groups SET is_active = 0;
  `);
  rawDb.runSync(`
    UPDATE groups SET is_active = 1 WHERE id = ?;
  `, [groupId]);
}

/**
 * Duplica um grupo com todas as suas fichas e exercícios associados.
 */
export function duplicateGroup(groupId: string): void {
  const rawDb = getExpoDb();

  const groupRows = rawDb.getAllSync<{
    name: string;
    description: string | null;
    frequencyDays: number | null;
    position: number;
    badge: string | null;
  }>(
    `SELECT name, description, frequency_days AS frequencyDays, position, badge
     FROM groups WHERE id = ? LIMIT 1`,
    [groupId]
  );

  if (groupRows.length === 0) return;
  const original = groupRows[0];
  const newGroupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Insere cópia do grupo
  rawDb.runSync(
    `INSERT INTO groups (id, name, description, frequency_days, position, is_active, badge)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      newGroupId,
      `${original.name} (Cópia)`,
      original.description,
      original.frequencyDays,
      original.position + 1,
      original.badge || 'Secundário',
    ]
  );

  // Consulta treinos originais
  const workoutRows = rawDb.getAllSync<{ id: string; name: string; position: number }>(
    `SELECT id, name, position FROM workouts WHERE group_id = ? AND is_active = 1`,
    [groupId]
  );

  for (const w of workoutRows) {
    const newWorkoutId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    rawDb.runSync(
      `INSERT INTO workouts (id, group_id, name, position, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [newWorkoutId, newGroupId, w.name, w.position]
    );

    // Consulta exercícios daquele treino
    const exRows = rawDb.getAllSync<{
      exerciseId: string;
      position: number;
      targetSets: number;
      repMin: number;
      repMax: number;
      restS: number;
      note: string | null;
    }>(
      `SELECT exercise_id AS exerciseId, position, target_sets AS targetSets, rep_min AS repMin, rep_max AS repMax, rest_s AS restS, note
       FROM workout_exercises WHERE workout_id = ?`,
      [w.id]
    );

    for (const ex of exRows) {
      const newWeId = `we_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      rawDb.runSync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newWeId,
          newWorkoutId,
          ex.exerciseId,
          ex.position,
          ex.targetSets,
          ex.repMin,
          ex.repMax,
          ex.restS,
          ex.note,
        ]
      );
    }
  }
}

/**
 * Exclui um grupo e seus treinos (o histórico de sessões anteriores é preservado).
 */
export function deleteGroup(groupId: string): void {
  const rawDb = getExpoDb();

  // Busca IDs dos treinos deste grupo
  const workouts = rawDb.getAllSync<{ id: string }>(
    `SELECT id FROM workouts WHERE group_id = ?`,
    [groupId]
  );

  for (const w of workouts) {
    rawDb.runSync(`DELETE FROM workout_exercises WHERE workout_id = ?`, [w.id]);
    rawDb.runSync(`DELETE FROM workouts WHERE id = ?`, [w.id]);
  }

  rawDb.runSync(`DELETE FROM groups WHERE id = ?`, [groupId]);

  // Se o grupo deletado era ativo, ativa o primeiro grupo remanescente se houver
  const activeCount = rawDb.getAllSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM groups WHERE is_active = 1`
  );
  if ((activeCount[0]?.count ?? 0) === 0) {
    const firstGroup = rawDb.getAllSync<{ id: string }>(
      `SELECT id FROM groups ORDER BY position ASC LIMIT 1`
    );
    if (firstGroup.length > 0) {
      rawDb.runSync(`UPDATE groups SET is_active = 1 WHERE id = ?`, [firstGroup[0].id]);
    }
  }
}

/**
 * Cria o modelo PPL padrão com Push A, Pull A e Legs A preenchidos com exercícios reais.
 * É estritamente idempotente (não duplica se chamado mais de uma vez).
 */
export function seedDefaultPPLGroup(): string {
  const rawDb = getExpoDb();

  // Verifica idempotência: se já existir um grupo com o nome "PPL", ativa e retorna
  const existing = rawDb.getAllSync<{ id: string }>(
    `SELECT id FROM groups WHERE name = 'PPL' LIMIT 1`
  );
  if (existing.length > 0) {
    const existingId = existing[0].id;
    setActiveGroup(existingId);
    return existingId;
  }

  // Desativa outros grupos antes de criar o PPL ativo
  rawDb.execSync(`UPDATE groups SET is_active = 0;`);

  const groupId = `grp_ppl_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO groups (id, name, description, frequency_days, position, is_active, badge)
     VALUES (?, 'PPL', 'Push / Pull / Legs focada em progressão linear e controle de volume.', 6, 0, 1, 'Ativo')`,
    [groupId]
  );

  // 1. Push A
  const pushId = `w_push_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, 'Push A', 0, 1)`,
    [pushId, groupId]
  );

  const pushExercises = [
    { id: 'ex_peito_04', sets: 4, min: 8, max: 10, rest: 90 }, // Supino inclinado halteres
    { id: 'ex_ombros_02', sets: 3, min: 8, max: 12, rest: 90 }, // Desenv. halteres
    { id: 'ex_peito_05', sets: 3, min: 10, max: 12, rest: 60 }, // Crucifixo halteres
    { id: 'ex_ombros_03', sets: 4, min: 12, max: 15, rest: 60 }, // Elevação lateral
    { id: 'ex_bracos_04', sets: 4, min: 10, max: 12, rest: 60 }, // Tríceps corda
  ];

  pushExercises.forEach((item, pos) => {
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`we_push_${pos}_${Date.now()}`, pushId, item.id, pos, item.sets, item.min, item.max, item.rest]
    );
  });

  // 2. Pull A
  const pullId = `w_pull_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, 'Pull A', 1, 1)`,
    [pullId, groupId]
  );

  const pullExercises = [
    { id: 'ex_costas_01', sets: 4, min: 8, max: 10, rest: 90 }, // Puxada alta pronada
    { id: 'ex_costas_02', sets: 4, min: 8, max: 10, rest: 90 }, // Remada curvada barra
    { id: 'ex_costas_04', sets: 3, min: 10, max: 12, rest: 60 }, // Remada baixa triângulo
    { id: 'ex_bracos_01', sets: 3, min: 8, max: 12, rest: 60 }, // Rosca direta barra
    { id: 'ex_bracos_03', sets: 3, min: 10, max: 12, rest: 60 }, // Rosca martelo halteres
  ];

  pullExercises.forEach((item, pos) => {
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`we_pull_${pos}_${Date.now()}`, pullId, item.id, pos, item.sets, item.min, item.max, item.rest]
    );
  });

  // 3. Legs A
  const legsId = `w_legs_${Date.now()}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, 'Legs A', 2, 1)`,
    [legsId, groupId]
  );

  const legsExercises = [
    { id: 'ex_pernas_01', sets: 4, min: 6, max: 8, rest: 120 }, // Agachamento livre
    { id: 'ex_pernas_02', sets: 4, min: 8, max: 12, rest: 90 }, // Leg press 45
    { id: 'ex_pernas_04', sets: 3, min: 10, max: 12, rest: 60 }, // Cadeira extensora
    { id: 'ex_pernas_05', sets: 4, min: 10, max: 12, rest: 60 }, // Mesa flexora
    { id: 'ex_pernas_07', sets: 4, min: 12, max: 15, rest: 45 }, // Panturrilha em pé
  ];

  legsExercises.forEach((item, pos) => {
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`we_legs_${pos}_${Date.now()}`, legsId, item.id, pos, item.sets, item.min, item.max, item.rest]
    );
  });

  return groupId;
}

export interface InProgressSessionInfo {
  id: string;
  nameSnapshot: string;
  startedAt: number;
  workoutId: string | null;
}

/**
 * Verifica se já existe uma sessão de treino em andamento no banco local.
 */
export function getInProgressSession(): InProgressSessionInfo | null {
  try {
    const rawDb = getExpoDb();
    const rows = rawDb.getAllSync<{
      id: string;
      nameSnapshot: string;
      startedAt: number;
      workoutId: string | null;
    }>(
      `SELECT id, name_snapshot AS nameSnapshot, started_at AS startedAt, workout_id AS workoutId
       FROM sessions
       WHERE status = 'in_progress'
       ORDER BY started_at DESC
       LIMIT 1`
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.warn('Erro ao verificar sessão em andamento:', error);
    return null;
  }
}

/**
 * Descarta a sessão que estiver em andamento.
 */
export function discardInProgressSession(): void {
  try {
    const rawDb = getExpoDb();
    rawDb.runSync(
      `UPDATE sessions SET status = 'discarded', ended_at = ? WHERE status = 'in_progress'`,
      [Date.now()]
    );
  } catch (error) {
    console.warn('Erro ao descartar sessão em andamento:', error);
  }
}

/**
 * Inicia uma nova sessão de treino e popula seus exercícios conforme o treino selecionado.
 */
export function startWorkoutSession(workoutId?: string, workoutName?: string): string {
  const rawDb = getExpoDb();
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const snapshot = workoutName || 'Treino livre';

  rawDb.runSync(
    `INSERT INTO sessions (id, workout_id, name_snapshot, started_at, status, total_paused_s)
     VALUES (?, ?, ?, ?, 'in_progress', 0)`,
    [sessionId, workoutId || null, snapshot, Date.now()]
  );

  if (workoutId) {
    const exRows = rawDb.getAllSync<{
      exerciseId: string;
      position: number;
      targetSets: number;
      repMin: number;
      repMax: number;
      restS: number;
      note: string | null;
    }>(
      `SELECT exercise_id AS exerciseId, position, target_sets AS targetSets, rep_min AS repMin, rep_max AS repMax, rest_s AS restS, note
       FROM workout_exercises
       WHERE workout_id = ?
       ORDER BY position ASC`,
      [workoutId]
    );

    for (const ex of exRows) {
      const seId = `se_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      rawDb.runSync(
        `INSERT INTO session_exercises (id, session_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [seId, sessionId, ex.exerciseId, ex.position, ex.targetSets, ex.repMin, ex.repMax, ex.restS, ex.note]
      );
    }
  }

  return sessionId;
}

/**
 * Cria um novo grupo de treino.
 */
export function createWorkoutGroup(
  name: string,
  description?: string,
  frequencyDays?: number,
  badge?: string
): string {
  const rawDb = getExpoDb();
  const id = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Se for o primeiro grupo cadastrado, define como ativo por padrão
  const existingGroups = rawDb.getAllSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM groups`
  );
  const isFirst = (existingGroups[0]?.count ?? 0) === 0;

  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM groups`
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `INSERT INTO groups (id, name, description, frequency_days, position, is_active, badge)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name.trim(),
      description?.trim() || null,
      frequencyDays || null,
      nextPos,
      isFirst ? 1 : 0,
      badge?.trim() || (isFirst ? 'Ativo' : 'Secundário'),
    ]
  );

  return id;
}

/**
 * Adiciona um treino a um grupo existente.
 */
export function addWorkoutToGroup(groupId: string, name: string): string {
  const rawDb = getExpoDb();
  const id = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM workouts WHERE group_id = ?`,
    [groupId]
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [id, groupId, name.trim(), nextPos]
  );

  return id;
}


export interface GroupDetailWorkoutItem extends WorkoutItemDetail {
  lastLogText: string;
  isScheduledForToday: boolean;
  exerciseChips: string[];
  extraExerciseCount: number;
}

export interface GroupDetailResult {
  group: WorkoutGroupDetail;
  workouts: GroupDetailWorkoutItem[];
  otherGroups: { id: string; name: string }[];
}

/**
 * Obtém os detalhes completos de um grupo específico para a tela 3.3.
 */
export function getGroupDetail(groupId: string): GroupDetailResult | null {
  try {
    const rawDb = getExpoDb();

    // 1. Grupo
    const groupRows = rawDb.getAllSync<{
      id: string;
      name: string;
      description: string | null;
      frequencyDays: number | null;
      position: number;
      isActive: number;
      badge: string | null;
    }>(
      `SELECT id, name, description, frequency_days AS frequencyDays, position, is_active AS isActive, badge
       FROM groups WHERE id = ? LIMIT 1`,
      [groupId]
    );

    if (groupRows.length === 0) return null;
    const g = groupRows[0];
    const isGroupActive = Boolean(g.isActive);

    // 2. Outros grupos disponíveis para transferência
    const otherGroups = rawDb.getAllSync<{ id: string; name: string }>(
      `SELECT id, name FROM groups WHERE id != ? ORDER BY position ASC, name ASC`,
      [groupId]
    );

    // 3. Fichas de treino do grupo
    const workoutRows = rawDb.getAllSync<{
      id: string;
      groupId: string | null;
      name: string;
      position: number;
    }>(
      `SELECT id, group_id AS groupId, name, position
       FROM workouts
       WHERE group_id = ? AND is_active = 1
       ORDER BY position ASC, name ASC`,
      [groupId]
    );

    // 4. Último treino concluído dentro deste grupo (para determinar "Programado para hoje")
    const lastSessionRow = rawDb.getAllSync<{ workoutId: string }>(
      `SELECT s.workout_id AS workoutId
       FROM sessions s
       JOIN workouts w ON s.workout_id = w.id
       WHERE w.group_id = ? AND s.status = 'completed'
       ORDER BY s.ended_at DESC, s.started_at DESC
       LIMIT 1`,
      [groupId]
    );

    let scheduledWorkoutIndex = 0;
    if (workoutRows.length > 0) {
      if (lastSessionRow.length > 0) {
        const lastWId = lastSessionRow[0].workoutId;
        const lastIdx = workoutRows.findIndex((w) => w.id === lastWId);
        if (lastIdx !== -1) {
          scheduledWorkoutIndex = (lastIdx + 1) % workoutRows.length;
        }
      }
    }

    const workouts: GroupDetailWorkoutItem[] = [];
    let groupTotalEstSeconds = 0;

    for (let wIdx = 0; wIdx < workoutRows.length; wIdx++) {
      const w = workoutRows[wIdx];
      const code = `Rotina A-${wIdx + 1}`;

      // Exercícios
      const exRows = rawDb.getAllSync<{
        exerciseId: string;
        name: string;
        muscleGroup: string;
        targetSets: number;
        restS: number;
      }>(
        `SELECT 
          we.exercise_id AS exerciseId,
          e.name AS name,
          e.muscle_group AS muscleGroup,
          we.target_sets AS targetSets,
          we.rest_s AS restS
         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = ?
         ORDER BY we.position ASC`,
        [w.id]
      );

      const exerciseCount = exRows.length;
      const totalSets = exRows.reduce((acc, curr) => acc + (curr.targetSets || 0), 0);

      const durationSeconds = estimarDuracao({
        exercises: exRows.map((r) => ({
          targetSets: r.targetSets,
          restS: r.restS,
        })),
      });
      groupTotalEstSeconds += durationSeconds;
      const estimatedDurationMin = Math.max(1, Math.round(durationSeconds / 60));

      // Músculos
      const musclesSet = Array.from(new Set(exRows.map((r) => r.muscleGroup.toLowerCase())));
      let targetMuscles = 'Geral';
      if (musclesSet.length > 0) {
        if (musclesSet.length === 1) {
          targetMuscles = musclesSet[0].charAt(0).toUpperCase() + musclesSet[0].slice(1);
        } else if (musclesSet.length === 2) {
          targetMuscles = `${musclesSet[0]} e ${musclesSet[1]}`;
          targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
        } else {
          const last = musclesSet[musclesSet.length - 1];
          const initial = musclesSet.slice(0, -1).join(', ');
          targetMuscles = `${initial} e ${last}`;
          targetMuscles = targetMuscles.charAt(0).toUpperCase() + targetMuscles.slice(1);
        }
      }

      // Chips da "Sequência de carga": primeiros 4 + contador excedente
      const exerciseChips = exRows.slice(0, 4).map((r) => r.name);
      const extraExerciseCount = Math.max(0, exRows.length - 4);

      // Último log desta ficha específica
      const lastWorkoutLog = rawDb.getAllSync<{ endedAt: number | null }>(
        `SELECT ended_at AS endedAt
         FROM sessions
         WHERE workout_id = ? AND status = 'completed'
         ORDER BY ended_at DESC
         LIMIT 1`,
        [w.id]
      );
      const lastLogText = formatTempoRelativoLog(lastWorkoutLog[0]?.endedAt ?? null);

      const isScheduledForToday = wIdx === scheduledWorkoutIndex;

      workouts.push({
        id: w.id,
        groupId: w.groupId,
        code,
        name: w.name,
        position: w.position,
        exerciseCount,
        totalSets,
        estimatedDurationMin,
        targetMuscles,
        previewExercises: exerciseChips.join(', '),
        lastLogText,
        isScheduledForToday,
        exerciseChips,
        extraExerciseCount,
      });
    }

    const totalEstimatedMin = Math.max(1, Math.round(groupTotalEstSeconds / 60));

    const groupDetail: WorkoutGroupDetail = {
      id: g.id,
      name: g.name,
      description: g.description,
      frequencyDays: g.frequencyDays,
      frequencyText: g.frequencyDays ? `Ciclo de ${g.frequencyDays} dias` : 'Ciclo de 6 dias',
      position: g.position,
      isActive: isGroupActive,
      badge: isGroupActive ? 'Ativo' : (g.badge || 'Secundário'),
      workoutCount: workouts.length,
      totalEstimatedMin,
      workouts,
    };

    return {
      group: groupDetail,
      workouts,
      otherGroups,
    };
  } catch (error) {
    console.warn('Erro ao obter detalhes do grupo:', error);
    return null;
  }
}

/**
 * Duplica um treino específico dentro do mesmo grupo.
 */
export function duplicateWorkout(workoutId: string): string {
  const rawDb = getExpoDb();
  const rows = rawDb.getAllSync<{ groupId: string; name: string; position: number }>(
    `SELECT group_id AS groupId, name, position FROM workouts WHERE id = ? LIMIT 1`,
    [workoutId]
  );
  if (rows.length === 0) return '';
  const original = rows[0];

  const newId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  rawDb.runSync(
    `INSERT INTO workouts (id, group_id, name, position, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [newId, original.groupId, `${original.name} (Cópia)`, original.position + 1]
  );

  const exRows = rawDb.getAllSync<{
    exerciseId: string;
    position: number;
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
    note: string | null;
  }>(
    `SELECT exercise_id AS exerciseId, position, target_sets AS targetSets, rep_min AS repMin, rep_max AS repMax, rest_s AS restS, note
     FROM workout_exercises WHERE workout_id = ?`,
    [workoutId]
  );

  for (const ex of exRows) {
    const newWeId = `we_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    rawDb.runSync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newWeId, newId, ex.exerciseId, ex.position, ex.targetSets, ex.repMin, ex.repMax, ex.restS, ex.note]
    );
  }

  return newId;
}

/**
 * Exclui uma ficha de treino.
 */
export function deleteWorkout(workoutId: string): void {
  const rawDb = getExpoDb();
  rawDb.runSync(`DELETE FROM workout_exercises WHERE workout_id = ?`, [workoutId]);
  rawDb.runSync(`DELETE FROM workouts WHERE id = ?`, [workoutId]);
}

/**
 * Move um treino para outro grupo de treino.
 */
export function moveWorkoutToGroup(workoutId: string, targetGroupId: string): void {
  const rawDb = getExpoDb();
  const maxPosRow = rawDb.getAllSync<{ maxPos: number | null }>(
    `SELECT MAX(position) as maxPos FROM workouts WHERE group_id = ?`,
    [targetGroupId]
  );
  const nextPos = (maxPosRow[0]?.maxPos ?? -1) + 1;

  rawDb.runSync(
    `UPDATE workouts SET group_id = ?, position = ? WHERE id = ?`,
    [targetGroupId, nextPos, workoutId]
  );
}

/**
 * Reordena um treino para cima ou para baixo na lista.
 */
export function reorderWorkout(workoutId: string, direction: 'up' | 'down'): void {
  const rawDb = getExpoDb();
  const current = rawDb.getAllSync<{ id: string; groupId: string; position: number }>(
    `SELECT id, group_id AS groupId, position FROM workouts WHERE id = ? LIMIT 1`,
    [workoutId]
  );
  if (current.length === 0) return;
  const curr = current[0];

  const siblings = rawDb.getAllSync<{ id: string; position: number }>(
    `SELECT id, position FROM workouts WHERE group_id = ? ORDER BY position ASC`,
    [curr.groupId]
  );

  const idx = siblings.findIndex((s) => s.id === workoutId);
  if (idx === -1) return;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length) return;

  const neighbor = siblings[targetIdx];

  // Troca de posição
  rawDb.runSync(`UPDATE workouts SET position = ? WHERE id = ?`, [neighbor.position, curr.id]);
  rawDb.runSync(`UPDATE workouts SET position = ? WHERE id = ?`, [curr.position, neighbor.id]);
}

/**
 * Atualiza os dados de um grupo de treino (nome, descrição, frequência).
 */
export function updateWorkoutGroup(
  groupId: string,
  name: string,
  description?: string,
  frequencyDays?: number
): void {
  const rawDb = getExpoDb();
  rawDb.runSync(
    `UPDATE groups SET name = ?, description = ?, frequency_days = ? WHERE id = ?`,
    [name.trim(), description?.trim() || null, frequencyDays || null, groupId]
  );
}

/**
 * Retorna todos os nomes de grupos existentes para validação de unicidade.
 */
export function getExistingGroupNames(excludeGroupId?: string): string[] {
  const rawDb = getExpoDb();
  if (excludeGroupId) {
    const rows = rawDb.getAllSync<{ name: string }>(
      `SELECT name FROM groups WHERE id != ?`,
      [excludeGroupId]
    );
    return rows.map((r) => r.name);
  }
  const rows = rawDb.getAllSync<{ name: string }>(`SELECT name FROM groups`);
  return rows.map((r) => r.name);
}



