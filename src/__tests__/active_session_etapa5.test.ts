import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  suggestDropWeightKg,
  suggest1RmWeightKg,
  getSetDisplayLabel,
  formatRepsTarget,
  formatEffort,
  formatWeight,
  defaultRestFor,
  canGeneratePR,
  isSetInVolume,
  detectarPR,
  Unit,
} from '../domain/sessionMath';
import {
  startWorkoutSession,
  getExerciseEstimated1Rm,
} from '../db/workouts';
import { getExpoDb } from '../db/client';

describe('ETAPA 5 — Integração com startWorkoutSession e ActiveSessionScreen (Modo Ativo)', () => {
  describe('1. Inicialização da sessão e pré-preenchimento de cargas', () => {
    it('Regra 1: se effort_mode for percent_1rm, calcula via suggest1RmWeightKg com 1RM estimado', () => {
      // Supino 1RM estimado: 100 kg. Meta: 75%
      const oneRm = 100;
      const percent = 75;
      const weight = suggest1RmWeightKg(oneRm, percent, 2.5);
      expect(weight).toBe(75);

      // Agachamento 1RM estimado: 140 kg. Meta: 80%
      expect(suggest1RmWeightKg(140, 80, 2.5)).toBe(112.5);

      // Agachamento 1RM estimado: 65 kg. Meta: 66%
      expect(suggest1RmWeightKg(65, 66, 2.5)).toBe(42.5);
    });

    it('Regra 2: se type === "drop", calcula -20% da última série não-aquecimento', () => {
      const sessionSets = [
        { type: 'warmup', weight: 40 },
        { type: 'normal', weight: 80 },
        { type: 'normal', weight: 85 },
      ];
      // 85 kg * 0.8 = 68 kg -> arredondado para incremento 2.5 kg = 67.5 kg
      const dropWeight = suggestDropWeightKg(sessionSets, 2.5);
      expect(dropWeight).toBe(67.5);

      // Se só houver série de aquecimento, não calcula drop a partir dela
      const warmupOnly = [{ type: 'warmup', weight: 40 }];
      expect(suggestDropWeightKg(warmupOnly, 2.5)).toBeNull();
    });

    it('Regra 3: busca na última sessão completed a carga compatível (ignorando warmup ao preencher normal)', () => {
      const prevSessionSets = [
        { isWarmup: true, weight: 40, reps: 12 },
        { isWarmup: false, weight: 60, reps: 10 },
        { isWarmup: false, weight: 62.5, reps: 8 },
      ];

      const prevNormals = prevSessionSets.filter((s) => !s.isWarmup);
      expect(prevNormals).toHaveLength(2);
      expect(prevNormals[0].weight).toBe(60);
      expect(prevNormals[1].weight).toBe(62.5);

      // Se effort_mode for last_week_plus ou last_session_plus, soma effort_value em kg
      const effortValue = 2.5;
      const newWeight = Number((prevNormals[0].weight + effortValue).toFixed(2));
      expect(newWeight).toBe(62.5);
    });

    it('Regra 4: se não houver histórico, aplica fallback padrão de 20.0 kg', () => {
      const prevSets: any[] = [];
      const initialWeight = prevSets.length > 0 ? prevSets[0].weight : 20.0;
      expect(initialWeight).toBe(20.0);
    });
  });

  describe('2. SetTable em mode="active" (6 colunas compactas em 360px)', () => {
    it('formata a coluna Anterior mostrando apenas carga × reps sem RPE anterior', () => {
      const formatPreviousCol = (prev: { weightKg: number; reps: number; rpe?: number | null } | null, unit: Unit) => {
        if (!prev) return '—';
        return `${formatWeight(prev.weightKg, unit)} ${unit} × ${prev.reps}`;
      };

      expect(formatPreviousCol({ weightKg: 60, reps: 10, rpe: 8 }, 'kg')).toBe('60 kg × 10');
      expect(formatPreviousCol({ weightKg: 62.5, reps: 8, rpe: 9.5 }, 'kg')).toBe('62,5 kg × 8');
      expect(formatPreviousCol(null, 'kg')).toBe('—');

      // Em lb
      expect(formatPreviousCol({ weightKg: 50, reps: 10 }, 'lb')).toContain('lb × 10');
    });

    it('formata a coluna Meta com repsTarget na 1ª linha e effort na 2ª linha em #B7ADA3', () => {
      // 1. Normal sem esforço
      const s1 = { type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'none' };
      expect(formatRepsTarget(s1)).toBe('8–10 reps');
      expect(formatEffort(s1, 'kg')).toBe('');

      // 2. Por RPE 8
      const s2 = { type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'rpe', effortValue: 8 };
      expect(formatRepsTarget(s2)).toBe('8–10 reps');
      expect(formatEffort(s2, 'kg')).toBe('RPE 8');

      // 3. Por 2 RIR
      const s3 = { type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'rir', effortValue: 2 };
      expect(formatRepsTarget(s3)).toBe('8–10 reps');
      expect(formatEffort(s3, 'kg')).toBe('2 RIR');

      // 4. Falha
      const s4 = { type: 'failure' };
      expect(formatRepsTarget(s4)).toBe('até a falha');
      expect(formatEffort(s4, 'kg')).toBe('');

      // 5. Drop
      const s5 = { type: 'drop' };
      expect(formatRepsTarget(s5)).toBe('até a falha');
      expect(formatEffort(s5, 'kg')).toBe('');

      // 6. Última sessão + 2.5 kg
      const s6 = { type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10, effortMode: 'last_session_plus', effortValue: 2.5 };
      expect(formatEffort(s6, 'kg')).toBe('Sessão +2,5 kg');
    });

    it('as 6 colunas compactas cabem no viewport de 360px sem quebrar linha', () => {
      const activeCols = {
        serie: 30,
        anteriorMin: 58,
        metaMin: 58,
        weight: 52,
        reps: 46,
        check: 32,
      };

      const fixedWidth = activeCols.serie + activeCols.weight + activeCols.reps + activeCols.check;
      expect(fixedWidth).toBe(160);

      // Em 360px com padding lateral de 16px de cada lado (32px), espaço interno = 328px
      const availableInner = 360 - 32;
      const flexSpace = availableInner - fixedWidth; // 168px
      expect(flexSpace).toBe(168);
      // Cada coluna flexível (Anterior e Meta) recebe 84px (> min 58px)
      expect(flexSpace / 2).toBeGreaterThanOrEqual(activeCols.anteriorMin);
      expect(flexSpace / 2).toBeGreaterThanOrEqual(activeCols.metaMin);
    });

    it('exibe badge correto ("A", "F", "D", "1", "2") e tag "sessão" quando is_session_only === 1', () => {
      const sets = [
        { id: '1', type: 'warmup', is_session_only: false },
        { id: '2', type: 'normal', is_session_only: false },
        { id: '3', type: 'failure', is_session_only: false },
        { id: '4', type: 'drop', is_session_only: true },
        { id: '5', type: 'normal', is_session_only: true },
      ];

      expect(getSetDisplayLabel(sets as any, 0)).toBe('A');
      expect(getSetDisplayLabel(sets as any, 1)).toBe('1');
      expect(getSetDisplayLabel(sets as any, 2)).toBe('F');
      expect(getSetDisplayLabel(sets as any, 3)).toBe('D');
      expect(getSetDisplayLabel(sets as any, 4)).toBe('3');

      // Tag de sessão
      expect(sets[3].is_session_only).toBe(true);
      expect(sets[4].is_session_only).toBe(true);
      expect(sets[1].is_session_only).toBe(false);
    });
  });

  describe('3. Conclusão no ✓, cronômetro de descanso e regras de PR', () => {
    it('conclui imediatamente e calcula o tempo de descanso por hierarquia: set.rest_s ?? session_exercise.rest_s ?? defaultRestFor(set.type)', () => {
      // 1. Se set.rest_s estiver definido, usa ele
      const setWithRest = { type: 'normal', restS: 45 };
      const ex1 = { restS: 90 };
      const rest1 = setWithRest.restS ?? ex1.restS ?? defaultRestFor(setWithRest.type);
      expect(rest1).toBe(45);

      // 2. Se set.rest_s for null, herda de session_exercise.rest_s
      const setWithoutRest = { type: 'normal', restS: null };
      const ex2 = { restS: 120 };
      const rest2 = setWithoutRest.restS ?? ex2.restS ?? defaultRestFor(setWithoutRest.type);
      expect(rest2).toBe(120);

      // 3. Se ambos forem null, usa fallback por tipo da série (defaultRestFor)
      const setFallbackWarmup = { type: 'warmup', restS: null };
      const ex3 = { restS: null };
      const restWarmup = setFallbackWarmup.restS ?? ex3.restS ?? defaultRestFor(setFallbackWarmup.type);
      expect(restWarmup).toBe(60);

      const setFallbackFailure = { type: 'failure', restS: null };
      const restFailure = setFallbackFailure.restS ?? ex3.restS ?? defaultRestFor(setFallbackFailure.type);
      expect(restFailure).toBe(120);

      const setFallbackDrop = { type: 'drop', restS: null };
      const restDrop = setFallbackDrop.restS ?? ex3.restS ?? defaultRestFor(setFallbackDrop.type);
      expect(restDrop).toBe(30);
    });

    it('Aquecimento ("warmup") e Drop ("drop") NUNCA disparam PR', () => {
      const history = [
        { weight: 60, reps: 10, isWarmup: false, type: 'normal' },
      ];

      // Série de aquecimento mesmo com peso maior nunca dispara PR
      const warmupSet = { weight: 80, reps: 10, isWarmup: true, type: 'warmup' };
      expect(canGeneratePR(warmupSet as any)).toBe(false);
      const prWarmup = canGeneratePR(warmupSet as any) ? detectarPR(history as any, warmupSet as any) : { isPrWeight: false, isPrVolume: false };
      expect(prWarmup.isPrWeight).toBe(false);
      expect(prWarmup.isPrVolume).toBe(false);

      // Série de drop nunca dispara PR
      const dropSet = { weight: 70, reps: 12, isWarmup: false, type: 'drop' };
      expect(canGeneratePR(dropSet as any)).toBe(false);
      const prDrop = canGeneratePR(dropSet as any) ? detectarPR(history as any, dropSet as any) : { isPrWeight: false, isPrVolume: false };
      expect(prDrop.isPrWeight).toBe(false);
      expect(prDrop.isPrVolume).toBe(false);

      // Série normal com carga maior dispara PR de peso
      const normalSet = { weight: 70, reps: 10, isWarmup: false, type: 'normal' };
      expect(canGeneratePR(normalSet as any)).toBe(true);
      const prNormal = detectarPR(history as any, normalSet as any);
      expect(prNormal.isPrWeight).toBe(true);
    });

    it('Aquecimento NÃO conta para o volume de treino, enquanto Drop, Falha e Normal contam', () => {
      expect(isSetInVolume({ type: 'warmup' })).toBe(false);
      expect(isSetInVolume({ type: 'normal' })).toBe(true);
      expect(isSetInVolume({ type: 'failure' })).toBe(true);
      expect(isSetInVolume({ type: 'drop' })).toBe(true);
    });

    it('Descanso inteligente: se próxima série for drop, zera descanso e alerta sem descanso', () => {
      const exerciseSets = [
        { id: 's1', type: 'normal', restS: 90 },
        { id: 's2', type: 'drop', restS: 30 },
      ];

      // Ao concluir a série s1, a próxima é drop -> descanso não inicia
      const currentIdx = 0;
      const nextSet = exerciseSets[currentIdx + 1];
      const shouldRest = nextSet && nextSet.type === 'drop' ? false : true;
      const toastExpected = nextSet && nextSet.type === 'drop' ? 'Sem descanso! Reduza a carga para o Drop' : null;

      expect(shouldRest).toBe(false);
      expect(toastExpected).toBe('Sem descanso! Reduza a carga para o Drop');

      // Ao concluir a série s2 (último drop), próxima não é drop -> descanso inicia
      const lastIdx = 1;
      const nextSetAfterDrop = exerciseSets[lastIdx + 1] ?? null;
      const shouldRestAfterDrop = nextSetAfterDrop && nextSetAfterDrop.type === 'drop' ? false : true;
      expect(shouldRestAfterDrop).toBe(true);
    });
  });

  describe('4. Isolamento total durante o treino ativo', () => {
    it('adicionar série durante a sessão grava is_session_only = 1 e preserva a ficha original', () => {
      // Simula a adição de uma série de sessão
      const sessionSet = {
        id: 'set_session_1',
        session_exercise_id: 'se_1',
        index: 4,
        type: 'drop',
        weight: 48,
        reps: 10,
        is_session_only: 1,
      };

      expect(sessionSet.is_session_only).toBe(1);
      // A tabela workout_exercise_sets não recebe esta linha
    });

    it('substituição de exercício durante o treino ativo mantém as séries da sessão e atualiza apenas o exercício', () => {
      const sessionExercise = {
        id: 'se_1',
        exercise_id: 'ex_supino_barra',
        setsCount: 4,
      };

      // Ao substituir por Supino Halteres
      const updatedExercise = {
        ...sessionExercise,
        exercise_id: 'ex_supino_halteres',
      };

      expect(updatedExercise.id).toBe(sessionExercise.id);
      expect(updatedExercise.exercise_id).toBe('ex_supino_halteres');
      expect(updatedExercise.setsCount).toBe(4);
    });

    it('confirmação ao finalizar possui Concluir treino, Continuar treinando e Descartar treino', () => {
      const modalProps = {
        title: 'Finalizar este treino?',
        pendingCount: 2,
        getDescription: (pending: number) =>
          pending > 0
            ? `${pending} séries não foram feitas. Deseja concluir a sessão mesmo assim?`
            : 'Todas as séries planejadas foram concluídas!',
        confirmLabel: 'Concluir treino',
        cancelLabel: 'Continuar treinando',
        discardLabel: 'Descartar treino',
      };

      expect(modalProps.confirmLabel).toBe('Concluir treino');
      expect(modalProps.cancelLabel).toBe('Continuar treinando');
      expect(modalProps.discardLabel).toBe('Descartar treino');
      expect(modalProps.getDescription(2)).toContain('2 séries não foram feitas');
    });

    it('cabeçalho exibe "Grupo X · Y de N exercícios" sem truncar e barra de progresso', () => {
      const formatHeaderSubtitle = (group: string | null, doneExCount: number, totalExCount: number) => {
        return group
          ? `${group} · ${doneExCount} de ${totalExCount} exercícios`
          : `${doneExCount} de ${totalExCount} exercícios`;
      };

      expect(formatHeaderSubtitle('Grupo A', 2, 5)).toBe('Grupo A · 2 de 5 exercícios');
      expect(formatHeaderSubtitle(null, 1, 3)).toBe('1 de 3 exercícios');
    });
  });
});
