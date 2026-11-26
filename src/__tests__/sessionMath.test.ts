import { describe, it, expect } from 'vitest';
import {
  adjustRest, calcularVolume, cycleRest, detectarPR, displayToKg, formatClock,
  formatWeight, kgToDisplay, parseNumber, previousForSet, rowStates, setLabels,
  formatDecimalBR, formatRepsTarget, formatRepsShort, formatEffort,
  suggestDropWeightKg, suggest1RmWeightKg, getSetDisplayLabel, sanitizePlannedSet,
  RPE_OPTIONS, RIR_OPTIONS, REPS_MODE_OPTIONS, EFFORT_MODE_OPTIONS,
} from '../domain/sessionMath';
import { GRID, GRID_FIXED_WIDTH, anteriorWidth } from '../ui/session/grid';

const done = (weight: number, reps: number, isWarmup = false) =>
  ({ weight, reps, isWarmup, completedAt: 1_700_000_000_000 });
const open = (weight: number, reps: number, isWarmup = false) =>
  ({ weight, reps, isWarmup, completedAt: null });

describe('grade da tabela (valores reais usados pela tela)', () => {
  it('colunas fixas somam 220', () => expect(GRID_FIXED_WIDTH).toBe(220));
  it('em 360px sobra espaço para "100,5 kg × 10" na coluna Anterior', () => {
    expect(anteriorWidth(360 - 60)).toBeGreaterThanOrEqual(GRID.anteriorMin);
  });
  it('linha e check têm no mínimo 48px de toque', () => {
    expect(GRID.rowHeight).toBeGreaterThanOrEqual(48);
    expect(GRID.check).toBeGreaterThanOrEqual(48);
  });
});

describe('unidades: banco em kg, exibição em kg ou lb', () => {
  it('kg não altera o valor', () => expect(formatWeight(62.5, 'kg')).toBe('62,5'));
  it('mantém 2 casas em kg (anilha de 1,25)', () => expect(formatWeight(1.25, 'kg')).toBe('1,25'));
  it('converte kg para lb na exibição', () => expect(formatWeight(45.36, 'lb')).toBe('100'));
  it('ida e volta lb → kg → lb não muda o que o usuário digitou', () => {
    for (const lb of [45, 100, 135, 225, 315]) {
      const kg = displayToKg(lb, 'lb');
      expect(Number(formatWeight(kg, 'lb').replace(',', '.'))).toBeCloseTo(lb, 1);
    }
  });
  it('digitar em kg grava o mesmo valor', () => expect(displayToKg(62.5, 'kg')).toBe(62.5));
  it('kgToDisplay em kg é identidade', () => expect(kgToDisplay(80, 'kg')).toBe(80));
  it('parseNumber aceita vírgula e rejeita lixo e negativos', () => {
    expect(parseNumber('62,5')).toBe(62.5);
    expect(parseNumber(' 8 ')).toBe(8);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('-3')).toBeNull();
    expect(parseNumber('')).toBe(0);
  });
});

describe('rótulos e estados das linhas', () => {
  it('aquecimento vira "A" e a numeração não conta aquecimentos', () => {
    const sets = [open(20, 12, true), open(40, 5, true), open(55, 8), open(55, 8), open(55, 8)];
    expect(setLabels(sets)).toEqual(['A', 'A', '1', '2', '3']);
  });
  it('a primeira série não concluída é a atual', () => {
    expect(rowStates([done(1, 1), open(1, 1), open(1, 1)])).toEqual(['done', 'current', 'pending']);
  });
  it('se desmarcar uma anterior, ela volta a ser a atual', () => {
    expect(rowStates([open(1, 1), done(1, 1), open(1, 1)])).toEqual(['current', 'done', 'pending']);
  });
  it('tudo concluído não tem série atual', () => {
    expect(rowStates([done(1, 1), done(1, 1)])).toEqual(['done', 'done']);
  });
});

describe('volume', () => {
  it('ignora aquecimento e séries não concluídas', () => {
    const sets = [done(20, 15, true), done(40, 10), done(40, 10), open(40, 10)];
    expect(calcularVolume(sets)).toBe(800);
  });
  it('halteres contam o par', () => {
    expect(calcularVolume([done(24, 12), done(32, 10)], 'Halteres')).toBe((24 * 12 + 32 * 10) * 2);
  });
  it('barra e polia contam 1x', () => {
    expect(calcularVolume([done(100, 8)], 'Barra')).toBe(800);
    expect(calcularVolume([done(35, 12)], 'Cabo')).toBe(420);
  });
  it('reproduz o Push A do design (8.964 kg)', () => {
    const incl = [done(24, 12), done(32, 10), done(34, 8), done(34, 8)]; // Halteres
    const reto = [done(80, 10), done(85, 8), done(90, 6)]; // Barra
    const desen = [done(20, 12), done(22, 10), done(24, 8), done(24, 8)]; // Halteres
    const elev = [done(12, 15), done(14, 12), done(14, 12), done(14, 10)]; // Halteres
    const tric = [done(30, 15), done(35, 12), done(35, 12), done(35, 10)]; // Cabo
    const total =
      calcularVolume(incl, 'Halteres') + calcularVolume(reto, 'Barra') +
      calcularVolume(desen, 'Halteres') + calcularVolume(elev, 'Halteres') +
      calcularVolume(tric, 'Cabo');
    expect(total).toBe(8964);
  });
});

describe('detectarPR (ordem dos argumentos: histórico, série)', () => {
  const hist = [{ weight: 32, reps: 10 }, { weight: 34, reps: 8 }];
  it('sem histórico não há PR', () => {
    expect(detectarPR([], { weight: 50, reps: 10 })).toEqual({ isPrWeight: false, isPrVolume: false });
  });
  it('carga maior é PR de carga', () => {
    expect(detectarPR(hist, { weight: 36, reps: 6 }).isPrWeight).toBe(true);
  });
  it('mesma carga e mesmas reps NÃO é PR', () => {
    expect(detectarPR(hist, { weight: 34, reps: 8 })).toEqual({ isPrWeight: false, isPrVolume: false });
  });
  it('mesma carga com mais reps é PR de carga (desempate)', () => {
    expect(detectarPR(hist, { weight: 34, reps: 9 }).isPrWeight).toBe(true);
  });
  it('carga menor com volume maior é só PR de volume', () => {
    expect(detectarPR(hist, { weight: 30, reps: 15 })).toEqual({ isPrWeight: false, isPrVolume: true });
  });
});

describe('Anterior por série', () => {
  const prev = [{ weight: 24, reps: 12 }, { weight: 32, reps: 10 }, { weight: 34, reps: 8 }];
  it('usa a série de mesmo índice', () => {
    expect(previousForSet(prev, 0)).toEqual({ weight: 24, reps: 12 });
    expect(previousForSet(prev, 2)).toEqual({ weight: 34, reps: 8 });
  });
  it('sem série correspondente retorna null', () => expect(previousForSet(prev, 3)).toBeNull());
});

describe('descanso e relógio', () => {
  it('cycleRest percorre os presets', () => {
    expect([60, 90, 120, 180].map(cycleRest)).toEqual([90, 120, 180, 60]);
  });
  it('cycleRest com valor fora dos presets vai ao próximo maior', () => {
    expect(cycleRest(75)).toBe(90);
    expect(cycleRest(300)).toBe(60);
  });
  it('adjustRest não fica negativo', () => {
    expect(adjustRest(45, -15)).toBe(30);
    expect(adjustRest(10, -15)).toBe(0);
    expect(adjustRest(45, 15)).toBe(60);
  });
  it('formatClock', () => {
    expect(formatClock(82)).toBe('01:22');
    expect(formatClock(3725)).toBe('01:02:05');
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('ETAPA 2 — Constantes e Opções', () => {
  it('RPE_OPTIONS cobre 6 a 10 em passos de 0,5', () => {
    expect(RPE_OPTIONS).toEqual([6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]);
  });

  it('RIR_OPTIONS cobre 0 a 5 em passos de 1', () => {
    expect(RIR_OPTIONS).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('REPS_MODE_OPTIONS cobre os 6 modos de repetições/tempo', () => {
    expect(REPS_MODE_OPTIONS).toEqual([
      'reps',
      'reps_range',
      'reps_max',
      'amrap',
      'time',
      'time_range',
    ]);
  });

  it('EFFORT_MODE_OPTIONS cobre os 8 modos de esforço/referência', () => {
    expect(EFFORT_MODE_OPTIONS).toEqual([
      'none',
      'rpe',
      'rpe_range',
      'rir',
      'percent_1rm',
      'percent_1rm_exercise',
      'last_week_plus',
      'last_session_plus',
    ]);
  });
});

describe('ETAPA 2 — Formatação com vírgula decimal e padrão pt-BR', () => {
  it('formatDecimalBR formata valores com vírgula e inteiros sem decimal', () => {
    expect(formatDecimalBR(8)).toBe('8');
    expect(formatDecimalBR(7.5)).toBe('7,5');
    expect(formatDecimalBR(2.5)).toBe('2,5');
    expect(formatDecimalBR(0)).toBe('0');
    expect(formatDecimalBR(null)).toBe('—');
    expect(formatDecimalBR(undefined)).toBe('—');
  });

  it('formatRepsTarget cobre todos os 6 reps_mode, falha e drop', () => {
    // Falha e Drop
    expect(formatRepsTarget({ type: 'failure' })).toBe('até a falha');
    expect(formatRepsTarget({ type: 'drop' })).toBe('até a falha');

    // 1. reps
    expect(formatRepsTarget({ type: 'normal', repsMode: 'reps', minReps: 10 })).toBe('10 reps');
    expect(formatRepsTarget({ type: 'normal', repsMode: 'reps', minReps: null })).toBe('—');

    // 2. reps_range
    expect(formatRepsTarget({ type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10 })).toBe('8–10 reps');
    expect(formatRepsTarget({ type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 8 })).toBe('8 reps');
    expect(formatRepsTarget({ type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: null })).toBe('8 reps');

    // 3. reps_max
    expect(formatRepsTarget({ type: 'normal', repsMode: 'reps_max' })).toBe('Reps Max');

    // 4. amrap
    expect(formatRepsTarget({ type: 'normal', repsMode: 'amrap' })).toBe('AMRAP');

    // 5. time
    expect(formatRepsTarget({ type: 'normal', repsMode: 'time', minReps: 45 })).toBe('45s');

    // 6. time_range
    expect(formatRepsTarget({ type: 'normal', repsMode: 'time_range', minReps: 30, maxReps: 45 })).toBe('30–45s');
    expect(formatRepsTarget({ type: 'normal', repsMode: 'time_range', minReps: 45, maxReps: 45 })).toBe('45s');
  });

  it('formatRepsShort formata de forma concisa para a coluna Reps da Prévia', () => {
    expect(formatRepsShort({ type: 'failure' })).toBe('Falha');
    expect(formatRepsShort({ type: 'drop' })).toBe('Falha');
    expect(formatRepsShort({ type: 'normal', repsMode: 'reps', minReps: 10 })).toBe('10');
    expect(formatRepsShort({ type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10 })).toBe('8–10');
    expect(formatRepsShort({ type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 8 })).toBe('8');
    expect(formatRepsShort({ type: 'normal', repsMode: 'reps_max' })).toBe('Max');
    expect(formatRepsShort({ type: 'normal', repsMode: 'amrap' })).toBe('AMRAP');
    expect(formatRepsShort({ type: 'normal', repsMode: 'time', minReps: 45 })).toBe('45s');
    expect(formatRepsShort({ type: 'normal', repsMode: 'time_range', minReps: 30, maxReps: 45 })).toBe('30–45s');
    expect(formatRepsShort({ type: 'normal', repsMode: 'time_range', minReps: 30, maxReps: 30 })).toBe('30s');
    expect(formatRepsShort({ type: 'normal', repsMode: 'reps', minReps: null })).toBe('—');
  });

  it('formatEffort cobre todos os 8 effort_mode e ignora séries que não são normais', () => {
    // Séries não-normais ou none retornam vazio
    expect(formatEffort({ type: 'warmup', effortMode: 'rpe', effortValue: 8 })).toBe('');
    expect(formatEffort({ type: 'failure', effortMode: 'rpe', effortValue: 8 })).toBe('');
    expect(formatEffort({ type: 'drop', effortMode: 'rpe', effortValue: 8 })).toBe('');
    expect(formatEffort({ type: 'normal', effortMode: 'none', effortValue: 8 })).toBe('');
    expect(formatEffort({ type: 'normal', effortMode: 'rpe', effortValue: null })).toBe('');

    // 1. rpe
    expect(formatEffort({ type: 'normal', effortMode: 'rpe', effortValue: 8 })).toBe('RPE 8');
    expect(formatEffort({ type: 'normal', effortMode: 'rpe', effortValue: 7.5 })).toBe('RPE 7,5');

    // 2. rpe_range
    expect(formatEffort({ type: 'normal', effortMode: 'rpe_range', effortValue: 7, effortValueMax: 8 })).toBe('7–8 RPE');

    // 3. rir
    expect(formatEffort({ type: 'normal', effortMode: 'rir', effortValue: 2 })).toBe('2 RIR');
    expect(formatEffort({ type: 'normal', effortMode: 'rir', effortValue: 0 })).toBe('0 RIR');

    // 4. percent_1rm
    expect(formatEffort({ type: 'normal', effortMode: 'percent_1rm', effortValue: 75 })).toBe('75% de 1RM');

    // 5. percent_1rm_exercise
    expect(
      formatEffort({ type: 'normal', effortMode: 'percent_1rm_exercise', effortValue: 66 }, 'kg', 'Agachamento')
    ).toBe('66% 1RM Agachamento');
    expect(
      formatEffort({ type: 'normal', effortMode: 'percent_1rm_exercise', effortValue: 66 }, 'kg')
    ).toBe('66% de 1RM');

    // 6. last_week_plus (com suporte a conversão de unidade)
    expect(formatEffort({ type: 'normal', effortMode: 'last_week_plus', effortValue: 2.5 }, 'kg')).toBe(
      'Sem. pass. +2,5 kg'
    );
    // 2.268 kg ~ 5 lb
    expect(formatEffort({ type: 'normal', effortMode: 'last_week_plus', effortValue: 2.268 }, 'lb')).toBe(
      'Sem. pass. +5 lb'
    );

    // 7. last_session_plus (com suporte a conversão de unidade)
    expect(formatEffort({ type: 'normal', effortMode: 'last_session_plus', effortValue: 2 }, 'kg')).toBe(
      'Sessão +2 kg'
    );
    // 4.536 kg ~ 10 lb
    expect(formatEffort({ type: 'normal', effortMode: 'last_session_plus', effortValue: 4.536 }, 'lb')).toBe(
      'Sessão +10 lb'
    );
  });
});

describe('ETAPA 2 — Cálculos de Domínio (Drop e 1RM)', () => {
  describe('suggestDropWeightKg', () => {
    it('calcula -20% arredondado para o incremento a partir da última série com peso e não-aquecimento', () => {
      const sets = [
        { type: 'warmup', weight: 40 },
        { type: 'normal', weight: 80 },
        { type: 'drop', weight: null },
      ];
      // 80 * 0.8 = 64 -> arredondado para passo 2.5 = 65
      expect(suggestDropWeightKg(sets, 2.5)).toBe(65);
    });

    it('ignora séries de aquecimento mesmo se tiverem carga maior', () => {
      const sets = [
        { type: 'normal', weight: 50 },
        { type: 'warmup', weight: 90 },
      ];
      // 50 * 0.8 = 40
      expect(suggestDropWeightKg(sets, 2.5)).toBe(40);
    });

    it('retorna null se a primeira série for drop (sem histórico anterior)', () => {
      expect(suggestDropWeightKg([{ type: 'drop', weight: null }])).toBeNull();
      expect(suggestDropWeightKg([])).toBeNull();
    });

    it('retorna null se todas as séries anteriores forem aquecimento ou sem peso', () => {
      const sets = [
        { type: 'warmup', weight: 50 },
        { type: 'normal', weight: null },
      ];
      expect(suggestDropWeightKg(sets)).toBeNull();
    });

    it('arredonda corretamente conforme o incremento configurado', () => {
      // 70 * 0.8 = 56 -> passo 2.5 -> 55
      expect(suggestDropWeightKg([{ type: 'normal', weight: 70 }], 2.5)).toBe(55);
      // 70 * 0.8 = 56 -> passo 1.0 -> 56
      expect(suggestDropWeightKg([{ type: 'normal', weight: 70 }], 1.0)).toBe(56);
    });
  });

  describe('suggest1RmWeightKg', () => {
    it('calcula porcentagem de 1RM arredondada ao incremento configurado', () => {
      // 100 kg * 75% = 75 kg
      expect(suggest1RmWeightKg(100, 75, 2.5)).toBe(75);
      // 140 kg * 80% = 112 kg -> passo 2.5 -> 112.5 kg
      expect(suggest1RmWeightKg(140, 80, 2.5)).toBe(112.5);
      // 65 kg * 66% = 42.9 kg -> passo 2.5 -> 42.5 kg
      expect(suggest1RmWeightKg(65, 66, 2.5)).toBe(42.5);
    });

    it('retorna null para valores nulos, zerados ou negativos', () => {
      expect(suggest1RmWeightKg(null, 75)).toBeNull();
      expect(suggest1RmWeightKg(100, null)).toBeNull();
      expect(suggest1RmWeightKg(0, 75)).toBeNull();
      expect(suggest1RmWeightKg(100, 0)).toBeNull();
      expect(suggest1RmWeightKg(-100, 75)).toBeNull();
    });
  });
});

describe('ETAPA 2 — Numeração visual vs position e sanitização', () => {
  describe('getSetDisplayLabel', () => {
    it('exibe A para aquecimento, F para falha, D para drop e numeração sequencial para normais', () => {
      const sets = [
        { type: 'warmup' },  // 0 -> 'A'
        { type: 'warmup' },  // 1 -> 'A'
        { type: 'normal' },  // 2 -> '1'
        { type: 'normal' },  // 3 -> '2'
        { type: 'failure' }, // 4 -> 'F'
        { type: 'drop' },    // 5 -> 'D'
        { type: 'normal' },  // 6 -> '5' (5ª série não-aquecimento)
      ];

      expect(getSetDisplayLabel(sets, 0)).toBe('A');
      expect(getSetDisplayLabel(sets, 1)).toBe('A');
      expect(getSetDisplayLabel(sets, 2)).toBe('1');
      expect(getSetDisplayLabel(sets, 3)).toBe('2');
      expect(getSetDisplayLabel(sets, 4)).toBe('F');
      expect(getSetDisplayLabel(sets, 5)).toBe('D');
      expect(getSetDisplayLabel(sets, 6)).toBe('5');
    });

    it('retorna string vazia para índices fora do intervalo', () => {
      expect(getSetDisplayLabel([], 0)).toBe('');
      expect(getSetDisplayLabel([{ type: 'normal' }], -1)).toBe('');
      expect(getSetDisplayLabel([{ type: 'normal' }], 5)).toBe('');
    });
  });

  describe('sanitizePlannedSet', () => {
    it('se warmup, failure ou drop, força effortMode = none e limpa valores de esforço', () => {
      const sanitizedWarmup = sanitizePlannedSet({
        type: 'warmup',
        effortMode: 'rpe',
        effortValue: 8,
        effortValueMax: 9,
        effortRefExerciseId: 'ex1',
        minReps: 10,
        maxReps: 12,
      });
      expect(sanitizedWarmup.effortMode).toBe('none');
      expect(sanitizedWarmup.effortValue).toBeNull();
      expect(sanitizedWarmup.effortValueMax).toBeNull();
      expect(sanitizedWarmup.effortRefExerciseId).toBeNull();
      // Warmup mantém minReps / maxReps
      expect(sanitizedWarmup.minReps).toBe(10);
      expect(sanitizedWarmup.maxReps).toBe(12);

      const sanitizedFailure = sanitizePlannedSet({
        type: 'failure',
        effortMode: 'rir',
        effortValue: 0,
        minReps: 8,
        maxReps: 10,
      });
      expect(sanitizedFailure.effortMode).toBe('none');
      expect(sanitizedFailure.effortValue).toBeNull();
      // Falha limpa minReps e maxReps
      expect(sanitizedFailure.minReps).toBeNull();
      expect(sanitizedFailure.maxReps).toBeNull();

      const sanitizedDrop = sanitizePlannedSet({
        type: 'drop',
        effortMode: 'percent_1rm',
        effortValue: 80,
        minReps: 10,
      });
      expect(sanitizedDrop.effortMode).toBe('none');
      expect(sanitizedDrop.effortValue).toBeNull();
      expect(sanitizedDrop.minReps).toBeNull();
    });

    it('se normal com modo reps_max ou amrap, limpa minReps e maxReps', () => {
      const sanitizedMax = sanitizePlannedSet({
        type: 'normal',
        repsMode: 'reps_max',
        minReps: 8,
        maxReps: 12,
        effortMode: 'none',
      });
      expect(sanitizedMax.minReps).toBeNull();
      expect(sanitizedMax.maxReps).toBeNull();

      const sanitizedAmrap = sanitizePlannedSet({
        type: 'normal',
        repsMode: 'amrap',
        minReps: 10,
        maxReps: 10,
        effortMode: 'none',
      });
      expect(sanitizedAmrap.minReps).toBeNull();
      expect(sanitizedAmrap.maxReps).toBeNull();
    });

    it('se normal com modo diferente de rpe_range, limpa effortValueMax', () => {
      const sanitized = sanitizePlannedSet({
        type: 'normal',
        effortMode: 'rpe',
        effortValue: 8,
        effortValueMax: 9,
      });
      expect(sanitized.effortValue).toBe(8);
      expect(sanitized.effortValueMax).toBeNull();
    });

    it('se normal com modo diferente de percent_1rm_exercise, limpa effortRefExerciseId', () => {
      const sanitized = sanitizePlannedSet({
        type: 'normal',
        effortMode: 'percent_1rm',
        effortValue: 75,
        effortRefExerciseId: 'ex_supino',
      });
      expect(sanitized.effortValue).toBe(75);
      expect(sanitized.effortRefExerciseId).toBeNull();
    });
  });
});

describe('ETAPA 2 — Regras de Volume e PR', () => {
  it('Volume: aquecimento fica fora; drop, falha e normal contam normalmente', () => {
    const sessionSets = [
      { weight: 20, reps: 10, completedAt: 12345, type: 'warmup' as const },
      { weight: 80, reps: 10, completedAt: 12345, type: 'normal' as const },  // 800
      { weight: 85, reps: 8, completedAt: 12345, type: 'failure' as const },  // 680
      { weight: 65, reps: 10, completedAt: 12345, type: 'drop' as const },    // 650
    ];

    // Total: 800 + 680 + 650 = 2130 (aquecimento de 200 fica fora)
    expect(calcularVolume(sessionSets, 'Barra')).toBe(2130);
  });

  it('PR: aquecimento NUNCA gera PR', () => {
    const history = [{ weight: 80, reps: 10 }];
    const warmupSet = { weight: 100, reps: 10, type: 'warmup' as const };
    expect(detectarPR(history, warmupSet)).toEqual({ isPrWeight: false, isPrVolume: false });
  });

  it('PR: drop NUNCA gera PR mesmo que tenha carga e reps superiores', () => {
    const history = [{ weight: 50, reps: 10 }];
    const dropSet = { weight: 120, reps: 15, type: 'drop' as const };
    expect(detectarPR(history, dropSet)).toEqual({ isPrWeight: false, isPrVolume: false });
  });

  it('PR: falha conta e gera PR normalmente se superar o histórico', () => {
    const history = [{ weight: 80, reps: 8 }];
    const failureSet = { weight: 85, reps: 8, type: 'failure' as const };
    const prResult = detectarPR(history, failureSet);
    expect(prResult.isPrWeight).toBe(true);
    expect(prResult.isPrVolume).toBe(true);
  });

  it('PR: normal conta e gera PR normalmente se superar o histórico', () => {
    const history = [{ weight: 80, reps: 8 }];
    const normalSet = { weight: 80, reps: 10, type: 'normal' as const };
    const prResult = detectarPR(history, normalSet);
    expect(prResult.isPrWeight).toBe(true);
  });
});

