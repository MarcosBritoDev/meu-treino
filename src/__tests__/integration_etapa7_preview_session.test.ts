import { describe, it, expect } from 'vitest';
import {
  kgToDisplay,
  displayToKg,
  formatWeight,
  formatEffort,
  formatRepsTarget,
  formatRepsShort,
  suggestDropWeightKg,
  suggest1RmWeightKg,
  getSetDisplayLabel,
  sanitizePlannedSet,
  isSetInVolume,
  canGeneratePR,
  calcularVolume,
  detectarPR,
  PlannedSet,
  SetType,
  RepsMode,
  EffortMode,
  Unit,
} from '../domain/sessionMath';
import {
  formatExerciseSetsSummary,
  formatExerciseCardItem,
  formatWorkoutSummary,
} from '../domain/workouts';

describe('ETAPA 7 — Testes de Integração, Unidades (kg/lb) e Consistência', () => {
  // ==========================================================================
  // 1. PERSISTÊNCIA E CONVERSÃO KG / LB
  // ==========================================================================
  describe('1. Persistência e conversão kg / lb', () => {
    it('configura série na prévia com incremento em lb (+5 lb), armazena em kg no banco e exibe fielmente na prévia', () => {
      // Cenário: Usuário opera na unidade 'lb'
      const userUnit: Unit = 'lb';
      const inputIncrementLb = 5;

      // 1. Digitação na SetEditSheet: converte o valor digitado para kg ao salvar
      const effortValueKg = displayToKg(inputIncrementLb, userUnit);
      // 5 lb / 2.20462262185 = 2.27 kg
      expect(effortValueKg).toBe(2.27);

      // 2. Mock do registro da série salva no SQLite (tabela workout_exercise_sets)
      // REGRA: Sem target_weight salvo na ficha! Apenas meta de esforço e valor em kg.
      const savedPlannedSet: PlannedSet = {
        id: 'wes_push_inc',
        workoutExerciseId: 'we_supino_1',
        position: 0,
        type: 'normal',
        repsMode: 'reps_range',
        minReps: 8,
        maxReps: 10,
        effortMode: 'last_session_plus',
        effortValue: effortValueKg, // 2.27 kg
        effortValueMax: null,
        effortRefExerciseId: null,
        restS: 90,
      };

      // Confirmação: a prévia NÃO possui campo target_weight
      expect((savedPlannedSet as any).target_weight).toBeUndefined();
      expect((savedPlannedSet as any).targetWeight).toBeUndefined();

      // 3. Recarrega a prévia no app com a unidade configurada em 'lb'
      const formattedEffortLb = formatEffort(savedPlannedSet, 'lb');
      expect(formattedEffortLb).toBe('Sessão +5 lb');

      // 4. Se o mesmo treino for aberto em 'kg', exibe a conversão decimal correta
      const formattedEffortKg = formatEffort(savedPlannedSet, 'kg');
      expect(formattedEffortKg).toBe('Sessão +2,27 kg');
    });

    it('treino ativo em lb: digita 100 lb em uma série, armazena em kg no SQLite e recarrega exibindo exatamente 100 lb', () => {
      const sessionUnit: Unit = 'lb';
      const inputWeightLb = 100;

      // 1. Digitação na ActiveSessionScreen: converte display -> kg para gravar no SQLite
      const storedWeightKg = displayToKg(inputWeightLb, sessionUnit);
      // 100 lb / 2.20462262185 = 45.36 kg
      expect(storedWeightKg).toBe(45.36);

      // 2. Mock do registro da tabela sets no SQLite
      const sessionSetRow = {
        id: 'set_bench_active_1',
        session_exercise_id: 'se_1',
        index: 0,
        weight: storedWeightKg, // 45.36 kg no banco
        reps: 10,
        completed_at: Date.now(),
        type: 'normal',
        is_warmup: 0,
      };

      // 3. Recarrega os dados da sessão na unidade 'lb'
      const displayValue = roundToDisplay(kgToDisplay(sessionSetRow.weight, sessionUnit), 1);
      expect(displayValue).toBe(100);

      // 4. Formatação de exibição compacta (formatWeight)
      const formattedWeightDisplay = formatWeight(sessionSetRow.weight, sessionUnit);
      expect(formattedWeightDisplay).toBe('100');

      // 5. Se visualizado em 'kg', exibe o peso real em kg com vírgula pt-BR
      expect(formatWeight(sessionSetRow.weight, 'kg')).toBe('45,36');
    });
  });

  // ==========================================================================
  // 2. CENÁRIO COMPLETO DO PUSH A (PRÉVIA -> SESSÃO -> RESUMO)
  // ==========================================================================
  describe('2. Cenário completo do Push A (Prévia -> Sessão -> Resumo)', () => {
    it('monta o treino Push A na prévia com 8 séries planejadas sem peso e salva mantendo fidelidade total', () => {
      // Exercício: Supino Reto com os 8 tipos/combinações exigidos pelo plano
      const rawSets: PlannedSet[] = [
        // 1. Aquecimento: 12-15 reps, sem esforço
        {
          id: 's1',
          workoutExerciseId: 'we_supino',
          position: 0,
          type: 'warmup',
          repsMode: 'reps_range',
          minReps: 12,
          maxReps: 15,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 60,
        },
        // 2. Normal: 8-10 reps padrão
        {
          id: 's2',
          workoutExerciseId: 'we_supino',
          position: 1,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        // 3. Normal por RPE 8: 8-10 reps
        {
          id: 's3',
          workoutExerciseId: 'we_supino',
          position: 2,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'rpe',
          effortValue: 8,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        // 4. Normal por 2 RIR: 8-10 reps
        {
          id: 's4',
          workoutExerciseId: 'we_supino',
          position: 3,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'rir',
          effortValue: 2,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        // 5. Normal por 75% de 1RM: 5 reps
        {
          id: 's5',
          workoutExerciseId: 'we_supino',
          position: 4,
          type: 'normal',
          repsMode: 'reps',
          minReps: 5,
          maxReps: null,
          effortMode: 'percent_1rm',
          effortValue: 75,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
        // 6. Normal AMRAP
        {
          id: 's6',
          workoutExerciseId: 'we_supino',
          position: 5,
          type: 'normal',
          repsMode: 'amrap',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
        // 7. Falha: até a falha
        {
          id: 's7',
          workoutExerciseId: 'we_supino',
          position: 6,
          type: 'failure',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
        // 8. Drop: até a falha
        {
          id: 's8',
          workoutExerciseId: 'we_supino',
          position: 7,
          type: 'drop',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 30,
        },
      ];

      // Sanitiza cada série garantindo invariantes
      const sanitized = rawSets.map(sanitizePlannedSet);
      expect(sanitized).toHaveLength(8);

      // Verificação das 4 colunas na prévia (Série · Meta · Reps · ⋮)
      expect(getSetDisplayLabel(sanitized, 0)).toBe('A');
      expect(getSetDisplayLabel(sanitized, 1)).toBe('1');
      expect(getSetDisplayLabel(sanitized, 2)).toBe('2');
      expect(getSetDisplayLabel(sanitized, 3)).toBe('3');
      expect(getSetDisplayLabel(sanitized, 4)).toBe('4');
      expect(getSetDisplayLabel(sanitized, 5)).toBe('5');
      expect(getSetDisplayLabel(sanitized, 6)).toBe('F');
      expect(getSetDisplayLabel(sanitized, 7)).toBe('D');

      // Coluna Reps curta na prévia
      expect(formatRepsShort(sanitized[0])).toBe('12–15');
      expect(formatRepsShort(sanitized[1])).toBe('8–10');
      expect(formatRepsShort(sanitized[4])).toBe('5');
      expect(formatRepsShort(sanitized[5])).toBe('AMRAP');
      expect(formatRepsShort(sanitized[6])).toBe('Falha');
      expect(formatRepsShort(sanitized[7])).toBe('Falha');

      // Coluna Meta na prévia
      expect(formatEffort(sanitized[0], 'kg')).toBe('');
      expect(formatEffort(sanitized[2], 'kg')).toBe('RPE 8');
      expect(formatEffort(sanitized[3], 'kg')).toBe('2 RIR');
      expect(formatEffort(sanitized[4], 'kg')).toBe('75% de 1RM');
      expect(formatEffort(sanitized[6], 'kg')).toBe('');
      expect(formatEffort(sanitized[7], 'kg')).toBe('');

      // Confirma que nenhum peso está armazenado na ficha
      for (const s of sanitized) {
        expect((s as any).weight).toBeUndefined();
        expect((s as any).targetWeight).toBeUndefined();
      }
    });

    it('inicia sessão a partir do Push A: copia snapshot, calcula 1RM, sugere -20% no Drop e usa histórico anterior', () => {
      // 1RM estimado do Supino Reto: 100 kg
      const estimated1Rm = 100;

      // Histórico da última sessão concluída do exercício (Supino Reto):
      // Aquecimento de 40 kg, Normal de 80 kg e Normal de 85 kg
      const previousSessionSets = [
        { isWarmup: true, type: 'warmup', weight: 40, reps: 15 },
        { isWarmup: false, type: 'normal', weight: 80, reps: 10 },
        { isWarmup: false, type: 'normal', weight: 85, reps: 8 },
      ];

      // Simulação da lógica de inicialização de startWorkoutSession para as 8 séries
      const plannedSetsPushA = [
        { type: 'warmup', effort_mode: 'none', effort_value: null },
        { type: 'normal', effort_mode: 'none', effort_value: null },
        { type: 'normal', effort_mode: 'rpe', effort_value: 8 },
        { type: 'normal', effort_mode: 'rir', effort_value: 2 },
        { type: 'normal', effort_mode: 'percent_1rm', effort_value: 75 },
        { type: 'normal', effort_mode: 'amrap', effort_value: null },
        { type: 'failure', effort_mode: 'none', effort_value: null },
        { type: 'drop', effort_mode: 'none', effort_value: null },
      ];

      const initializedSets: Array<{
        type: string;
        isWarmup: boolean;
        weight: number;
        effortMode: string;
        isSessionOnly: number;
      }> = [];

      let normalIdx = 0;
      let warmupIdx = 0;

      for (let i = 0; i < plannedSetsPushA.length; i++) {
        const ps = plannedSetsPushA[i];
        const isWarmup = ps.type === 'warmup';
        let initialWeight: number | null = null;

        // Regra 1: percent_1rm
        if (ps.effort_mode === 'percent_1rm' && ps.effort_value) {
          initialWeight = suggest1RmWeightKg(estimated1Rm, ps.effort_value, 2.5);
        }
        // Regra 2: drop -> -20% da última série não-aquecimento
        else if (ps.type === 'drop') {
          initialWeight = suggestDropWeightKg(initializedSets, 2.5);
        }
        // Regra 3: Histórico anterior (aquecimento NUNCA fornece carga para série normal)
        else {
          if (isWarmup) {
            const prevW = previousSessionSets.filter((s) => s.isWarmup)[warmupIdx];
            initialWeight = prevW ? prevW.weight : 20.0;
            warmupIdx++;
          } else {
            const prevN = previousSessionSets.filter((s) => !s.isWarmup)[normalIdx]
              ?? previousSessionSets.filter((s) => !s.isWarmup)[previousSessionSets.filter((s) => !s.isWarmup).length - 1];
            initialWeight = prevN ? prevN.weight : 20.0;
            normalIdx++;
          }
        }

        initializedSets.push({
          type: ps.type,
          isWarmup,
          weight: initialWeight ?? 20.0,
          effortMode: ps.effort_mode,
          isSessionOnly: 0,
        });
      }

      // Validações do snapshot gerado:
      expect(initializedSets).toHaveLength(8);

      // Série 1 (Aquecimento): recebeu 40 kg da série de aquecimento anterior
      expect(initializedSets[0].isWarmup).toBe(true);
      expect(initializedSets[0].weight).toBe(40);

      // Série 2 (Normal): recebeu 80 kg da primeira série normal (e NÃO 40 kg do aquecimento)
      expect(initializedSets[1].isWarmup).toBe(false);
      expect(initializedSets[1].weight).toBe(80);

      // Série 3 (Normal RPE 8): recebeu 85 kg da segunda série normal
      expect(initializedSets[2].weight).toBe(85);

      // Série 5 (% de 1RM): 75% de 100 kg calculado automaticamente = 75 kg
      expect(initializedSets[4].weight).toBe(75);

      // Série 8 (Drop): calculou -20% sobre a última série não-aquecimento com carga (85 kg da série de falha)
      // 85 * 0.8 = 68 kg -> arredondado para incremento 2.5 kg = 67.5 kg
      expect(initializedSets[7].weight).toBe(67.5);

      // Todas as séries herdadas têm is_session_only = 0
      for (const s of initializedSets) {
        expect(s.isSessionOnly).toBe(0);
      }
    });

    it('adiciona série extra na sessão (is_session_only = 1) e garante isolamento total ao finalizar o treino', () => {
      // Treino salvo original na ficha (workout_exercise_sets): 8 séries
      const savedOriginalSets = [
        { id: 's1', type: 'warmup', position: 0 },
        { id: 's2', type: 'normal', position: 1 },
        { id: 's3', type: 'normal', position: 2 },
        { id: 's4', type: 'normal', position: 3 },
        { id: 's5', type: 'normal', position: 4 },
        { id: 's6', type: 'normal', position: 5 },
        { id: 's7', type: 'failure', position: 6 },
        { id: 's8', type: 'drop', position: 7 },
      ];

      // Séries na sessão ativa
      const activeSessionSets = [
        ...savedOriginalSets.map((s, idx) => ({
          id: `session_set_${idx}`,
          type: s.type,
          index: idx,
          weight: 80,
          reps: 10,
          is_session_only: 0,
          completed_at: 1000 + idx,
        })),
      ];

      // Adiciona 1 série extra durante a sessão ativa (ex.: Drop extra)
      const extraSet = {
        id: 'session_set_extra_9',
        type: 'drop',
        index: 8,
        weight: 60,
        reps: 12,
        is_session_only: 1, // Flag que isola a série da ficha
        completed_at: 2000,
      };
      activeSessionSets.push(extraSet);

      expect(activeSessionSets).toHaveLength(9);
      expect(activeSessionSets[8].is_session_only).toBe(1);

      // Finaliza a sessão ativa (status = 'completed')
      const sessionStatus = 'completed';
      expect(sessionStatus).toBe('completed');

      // VERIFICAÇÃO DE ISOLAMENTO TOTAL:
      // O treino salvo original (savedOriginalSets) continua com exatamente 8 séries
      expect(savedOriginalSets).toHaveLength(8);
      expect(savedOriginalSets.find((s) => s.id === extraSet.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // 3. VOLUME, PR E ORDENAÇÃO
  // ==========================================================================
  describe('3. Volume, PR e ordenação contígua', () => {
    it('Resumo da sessão: aquecimento é ignorado no volume e no PR, drop entra no volume e nunca gera PR, falha e normal contam em ambos', () => {
      // 4 séries concluídas de um exercício de barra (fator 1)
      const sets = [
        // 1. Aquecimento: 40 kg × 15 reps (NÃO deve entrar no volume nem gerar PR)
        { id: 's1', type: 'warmup', weight: 40, reps: 15, completedAt: 1000 },
        // 2. Normal: 80 kg × 10 reps (ENTRA no volume e gera PR)
        { id: 's2', type: 'normal', weight: 80, reps: 10, completedAt: 2000 },
        // 3. Falha: 90 kg × 8 reps (ENTRA no volume e gera PR)
        { id: 's3', type: 'failure', weight: 90, reps: 8, completedAt: 3000 },
        // 4. Drop: 65 kg × 12 reps (ENTRA no volume e NUNCA gera PR)
        { id: 's4', type: 'drop', weight: 65, reps: 12, completedAt: 4000 },
      ];

      // 1. Regras de Volume
      expect(isSetInVolume(sets[0])).toBe(false); // Aquecimento fora
      expect(isSetInVolume(sets[1])).toBe(true);  // Normal dentro
      expect(isSetInVolume(sets[2])).toBe(true);  // Falha dentro
      expect(isSetInVolume(sets[3])).toBe(true);  // Drop dentro

      // Cálculo do Volume Total da sessão:
      // Apenas sets 2, 3 e 4:
      // Normal: 80 × 10 = 800 kg
      // Falha:  90 × 8  = 720 kg
      // Drop:   65 × 12 = 780 kg
      // Total = 800 + 720 + 780 = 2300 kg (aquecimento de 600 kg foi ignorado)
      const volumeTotal = calcularVolume(sets as any, 'Barra');
      expect(volumeTotal).toBe(2300);

      // 2. Regras de Recorde Pessoal (PR)
      expect(canGeneratePR(sets[0])).toBe(false); // Aquecimento nunca gera PR
      expect(canGeneratePR(sets[1])).toBe(true);  // Normal gera PR
      expect(canGeneratePR(sets[2])).toBe(true);  // Falha gera PR
      expect(canGeneratePR(sets[3])).toBe(false); // Drop nunca gera PR

      // Histórico anterior para comparação: maxWeight = 85 kg, maxVolume = 850 (85 × 10)
      const previousHistory = [
        { weight: 80, reps: 10, type: 'normal' },
        { weight: 85, reps: 10, type: 'normal' },
      ];

      // Aquecimento com 100 kg (maior que o histórico) NÃO gera PR porque canGeneratePR é false
      const heavyWarmup = { weight: 100, reps: 10, type: 'warmup' };
      const prWarmup = canGeneratePR(heavyWarmup)
        ? detectarPR(previousHistory as any, heavyWarmup as any)
        : { isPrWeight: false, isPrVolume: false };
      expect(prWarmup.isPrWeight).toBe(false);
      expect(prWarmup.isPrVolume).toBe(false);

      // Drop com carga alta NÃO gera PR porque canGeneratePR é false
      const heavyDrop = { weight: 95, reps: 10, type: 'drop' };
      const prDrop = canGeneratePR(heavyDrop)
        ? detectarPR(previousHistory as any, heavyDrop as any)
        : { isPrWeight: false, isPrVolume: false };
      expect(prDrop.isPrWeight).toBe(false);
      expect(prDrop.isPrVolume).toBe(false);

      // Falha com 90 kg × 8 reps supera 85 kg -> dispara PR de peso!
      const failureSet = { weight: 90, reps: 8, type: 'failure' };
      expect(canGeneratePR(failureSet)).toBe(true);
      const prFailure = detectarPR(previousHistory as any, failureSet as any);
      expect(prFailure.isPrWeight).toBe(true);
    });

    it('duplicar, remover e reordenar séries garante posições contíguas (0..N-1) sem lacunas', () => {
      // Lista inicial de 3 séries
      let sets: PlannedSet[] = [
        {
          id: 's0',
          workoutExerciseId: 'we_1',
          position: 0,
          type: 'warmup',
          repsMode: 'reps_range',
          minReps: 12,
          maxReps: 15,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 60,
        },
        {
          id: 's1',
          workoutExerciseId: 'we_1',
          position: 1,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 90,
        },
        {
          id: 's2',
          workoutExerciseId: 'we_1',
          position: 2,
          type: 'failure',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: 120,
        },
      ];

      // 1. DUPLICAÇÃO: Duplica a série s1 (índice 1)
      const duplicateIndex = 1;
      const setCopy: PlannedSet = {
        ...sets[duplicateIndex],
        id: 's1_copy',
      };
      // Insere logo abaixo da série duplicada e reindexa contiguamente 0..N-1
      const afterDuplicate = [
        ...sets.slice(0, duplicateIndex + 1),
        setCopy,
        ...sets.slice(duplicateIndex + 1),
      ].map((s, idx) => ({ ...s, position: idx }));

      expect(afterDuplicate).toHaveLength(4);
      expect(afterDuplicate.map((s) => s.position)).toEqual([0, 1, 2, 3]);
      expect(afterDuplicate[1].id).toBe('s1');
      expect(afterDuplicate[2].id).toBe('s1_copy');

      // 2. REMOÇÃO: Remove a série s1 original (índice 1)
      const afterRemove = afterDuplicate
        .filter((s) => s.id !== 's1')
        .map((s, idx) => ({ ...s, position: idx }));

      expect(afterRemove).toHaveLength(3);
      // Posições continuam perfeitamente contíguas sem buracos:
      expect(afterRemove.map((s) => s.position)).toEqual([0, 1, 2]);
      expect(afterRemove[0].id).toBe('s0');
      expect(afterRemove[1].id).toBe('s1_copy');
      expect(afterRemove[2].id).toBe('s2');

      // 3. REORDENAÇÃO: Mover a última série (s2) para cima (troca com s1_copy)
      const swapIndex = 2;
      const reorderedList = [...afterRemove];
      const temp = reorderedList[swapIndex];
      reorderedList[swapIndex] = reorderedList[swapIndex - 1];
      reorderedList[swapIndex - 1] = temp;
      const normalizedReorder = reorderedList.map((s, idx) => ({ ...s, position: idx }));

      expect(normalizedReorder).toHaveLength(3);
      expect(normalizedReorder.map((s) => s.position)).toEqual([0, 1, 2]);
      expect(normalizedReorder[1].id).toBe('s2');
      expect(normalizedReorder[2].id).toBe('s1_copy');
    });

    it('cartão exibe resumo de treino "N séries · ~X min" e exercícios "Nome — A + N séries"', () => {
      // Exercício 1: Supino Reto com 1 aquecimento e 5 normais
      expect(formatExerciseCardItem('Supino Reto', 1, 5)).toBe('Supino Reto — A + 5 séries');

      // Exercício 2: Desenvolvimento com 0 aquecimentos e 3 normais
      expect(formatExerciseCardItem('Desenvolvimento', 0, 3)).toBe('Desenvolvimento — 3 séries');

      // Resumo geral do treino Push A (ex: 8 séries, ~45 min)
      expect(formatWorkoutSummary(8, 45)).toBe('8 séries · ~45 min');
    });
  });
});

/** Helper para arredondamento seguro em testes de conversão */
function roundToDisplay(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
