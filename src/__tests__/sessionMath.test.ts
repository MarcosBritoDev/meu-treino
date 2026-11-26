import { describe, it, expect } from 'vitest';
import {
  adjustRest, calcularVolume, cycleRest, detectarPR, displayToKg, formatClock,
  formatWeight, kgToDisplay, parseNumber, previousForSet, rowStates, setLabels,
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
