import { describe, it, expect } from 'vitest';
import {
  getSetDisplayLabel,
  setLabels,
  canAddDropAtEnd,
  canSetBeDrop,
  calcDropFromWeightKg,
  recalculateDropCascade,
  formatEffort,
  formatTarget,
} from '../domain/sessionMath';

describe('ETAPA 2 — Regras de domínio do Drop Set em cascata', () => {
  describe('1. Numeração visual sem pular', () => {
    it('exibe A para warmup, F para failure, D para drop e contagem sequencial para normais ignorando warmup e drop', () => {
      const sets = [
        { type: 'warmup' },  // 0 -> 'A'
        { type: 'normal' },  // 1 -> '1'
        { type: 'normal' },  // 2 -> '2'
        { type: 'failure' }, // 3 -> 'F'
        { type: 'drop' },    // 4 -> 'D'
        { type: 'drop' },    // 5 -> 'D'
      ];

      expect(getSetDisplayLabel(sets, 0)).toBe('A');
      expect(getSetDisplayLabel(sets, 1)).toBe('1');
      expect(getSetDisplayLabel(sets, 2)).toBe('2');
      expect(getSetDisplayLabel(sets, 3)).toBe('F');
      expect(getSetDisplayLabel(sets, 4)).toBe('D');
      expect(getSetDisplayLabel(sets, 5)).toBe('D');
      expect(setLabels(sets)).toEqual(['A', '1', '2', 'F', 'D', 'D']);
    });

    it('nunca pula número na série normal por causa de um D intermediário', () => {
      const sets = [
        { type: 'warmup' }, // 'A'
        { type: 'normal' }, // '1'
        { type: 'drop' },   // 'D'
        { type: 'normal' }, // '2' (não pula para '3')
        { type: 'drop' },   // 'D'
        { type: 'normal' }, // '3' (não pula para '5')
      ];

      expect(setLabels(sets)).toEqual(['A', '1', 'D', '2', 'D', '3']);
    });

    it('suporta múltiplos aquecimentos no início sem afetar a sequência', () => {
      const sets = [
        { isWarmup: true },
        { isWarmup: true },
        { type: 'normal' },
        { type: 'drop' },
        { type: 'drop' },
        { type: 'normal' },
      ];

      expect(setLabels(sets)).toEqual(['A', 'A', '1', 'D', 'D', '2']);
    });
  });

  describe('2. Regras de permissão do Drop', () => {
    describe('canAddDropAtEnd', () => {
      it('retorna false para lista vazia ou nula', () => {
        expect(canAddDropAtEnd([])).toBe(false);
        expect(canAddDropAtEnd(null as any)).toBe(false);
      });

      it('retorna false se houver apenas séries de aquecimento', () => {
        expect(canAddDropAtEnd([{ type: 'warmup' }])).toBe(false);
        expect(canAddDropAtEnd([{ isWarmup: true }, { type: 'warmup' }])).toBe(false);
      });

      it('retorna true apenas se existir pelo menos uma série com type !== "warmup"', () => {
        expect(canAddDropAtEnd([{ type: 'warmup' }, { type: 'normal' }])).toBe(true);
        expect(canAddDropAtEnd([{ type: 'normal' }])).toBe(true);
        expect(canAddDropAtEnd([{ type: 'failure' }])).toBe(true);
        expect(canAddDropAtEnd([{ type: 'normal' }, { type: 'drop' }])).toBe(true);
      });
    });

    describe('canSetBeDrop', () => {
      it('retorna false para a 1ª linha (index === 0)', () => {
        expect(canSetBeDrop([{ type: 'normal' }], 0)).toBe(false);
        expect(canSetBeDrop([{ type: 'normal' }, { type: 'normal' }], 0)).toBe(false);
        expect(canSetBeDrop([{ type: 'warmup' }], 0)).toBe(false);
      });

      it('retorna false para índices negativos ou fora do tamanho do array', () => {
        expect(canSetBeDrop([{ type: 'normal' }], -1)).toBe(false);
        expect(canSetBeDrop([{ type: 'normal' }], 5)).toBe(false);
        expect(canSetBeDrop([], 0)).toBe(false);
      });

      it('bloqueia transformar em drop imediatamente após séries de aquecimento sem série de trabalho anterior', () => {
        const sets = [
          { type: 'warmup' }, // index 0
          { type: 'warmup' }, // index 1
          { type: 'normal' }, // index 2
        ];

        // index 1: antes dele só há sets[0] (warmup) -> false
        expect(canSetBeDrop(sets, 1)).toBe(false);

        // index 2: antes dele há apenas warmup (sets[0] e sets[1]) -> false
        expect(canSetBeDrop(sets, 2)).toBe(false);
      });

      it('permite transformar em drop se existir pelo menos uma série não-aquecimento antes do índice', () => {
        const sets = [
          { type: 'warmup' }, // 0
          { type: 'normal' }, // 1
          { type: 'normal' }, // 2
          { type: 'failure' }, // 3
        ];

        // index 1: antes só tem warmup -> false
        expect(canSetBeDrop(sets, 1)).toBe(false);

        // index 2: antes tem sets[1] (normal) -> true
        expect(canSetBeDrop(sets, 2)).toBe(true);

        // index 3: antes tem sets[1] e sets[2] -> true
        expect(canSetBeDrop(sets, 3)).toBe(true);
      });
    });
  });

  describe('3. Cálculo em cascata e arredondamento', () => {
    describe('calcDropFromWeightKg', () => {
      it('retorna null se baseKg for null, undefined, menor ou igual a 0, ou NaN', () => {
        expect(calcDropFromWeightKg(null)).toBeNull();
        expect(calcDropFromWeightKg(undefined)).toBeNull();
        expect(calcDropFromWeightKg(0)).toBeNull();
        expect(calcDropFromWeightKg(-10)).toBeNull();
        expect(calcDropFromWeightKg(NaN)).toBeNull();
      });

      it('calcula redução padrão de 20% com incremento de 2.5 kg', () => {
        // 100 kg * 0.8 = 80 kg
        expect(calcDropFromWeightKg(100, 20, 2.5)).toBe(80);

        // 80 kg * 0.8 = 64 kg -> arredondado para múltiplo de 2.5 kg = 65 kg
        expect(calcDropFromWeightKg(80, 20, 2.5)).toBe(65);

        // 65 kg * 0.8 = 52 kg -> arredondado para múltiplo de 2.5 kg = 52.5 kg
        expect(calcDropFromWeightKg(65, 20, 2.5)).toBe(52.5);
      });

      it('calcula com porcentagem livre (ex: 12%, 35%)', () => {
        // 100 kg com 12% de redução = 88 kg -> arredondado para 2.5 kg = 87.5 kg
        expect(calcDropFromWeightKg(100, 12, 2.5)).toBe(87.5);

        // 100 kg com 35% de redução = 65 kg -> múltiplo exato de 2.5 kg = 65 kg
        expect(calcDropFromWeightKg(100, 35, 2.5)).toBe(65);

        // 60 kg com 15% de redução = 51 kg -> arredondado para 2.5 kg = 50 kg
        expect(calcDropFromWeightKg(60, 15, 2.5)).toBe(50);
      });

      it('limita dropPercent entre 1% e 90%', () => {
        // Menor que 1 é limitado a 1% (100 * 0.99 = 99 -> 100 kg)
        expect(calcDropFromWeightKg(100, -5, 2.5)).toBe(100);
        expect(calcDropFromWeightKg(100, 0, 2.5)).toBe(100);

        // Maior que 90 é limitado a 90% (100 * 0.10 = 10 -> 10 kg)
        expect(calcDropFromWeightKg(100, 95, 2.5)).toBe(10);
        expect(calcDropFromWeightKg(100, 200, 2.5)).toBe(10);
      });

      it('garante piso mínimo de incrementKg', () => {
        // Carga muito baixa com 90% de redução
        expect(calcDropFromWeightKg(2, 90, 2.5)).toBe(2.5);
      });
    });

    describe('recalculateDropCascade', () => {
      it('executa cascata de 3 drops consecutivas (ex: 100 -> 80 -> 65 -> 52.5 kg)', () => {
        const sets = [
          { type: 'normal', weight: 100 },
          { type: 'drop', drop_percent: 20 },
          { type: 'drop', drop_percent: 20 },
          { type: 'drop', drop_percent: 20 },
        ];

        const updated = recalculateDropCascade(sets, 0, 2.5);

        expect(updated[0].weight).toBe(100);
        expect(updated[1].weight).toBe(80);
        expect(updated[2].weight).toBe(65);
        expect(updated[3].weight).toBe(52.5);
      });

      it('para a cascata ao encontrar manual_weight === true e preserva o peso digitado pelo usuário', () => {
        const sets = [
          { type: 'normal', weight: 100 },
          { type: 'drop', drop_percent: 20 },
          { type: 'drop', drop_percent: 20, manual_weight: true, weight: 70 },
          { type: 'drop', drop_percent: 20, weight: 60 },
        ];

        const updated = recalculateDropCascade(sets, 0, 2.5);

        expect(updated[0].weight).toBe(100);
        expect(updated[1].weight).toBe(80);
        expect(updated[2].weight).toBe(70); // Preservado manual
        expect(updated[3].weight).toBe(60); // Cascata interrompida, preservou valor anterior
      });

      it('recalcula a partir de um drop manual modificado', () => {
        const sets = [
          { type: 'normal', weight: 100 },
          { type: 'drop', drop_percent: 20, weight: 80 },
          { type: 'drop', drop_percent: 20, manual_weight: true, weight: 70 },
          { type: 'drop', drop_percent: 20, weight: 60 },
        ];

        // Se o usuário alterou o peso do item 2 para 70 kg, dispara cascata a partir do índice 2
        const updated = recalculateDropCascade(sets, 2, 2.5);

        expect(updated[0].weight).toBe(100);
        expect(updated[1].weight).toBe(80);
        expect(updated[2].weight).toBe(70);
        // Item 3: 70 kg * 0.8 = 56 kg -> 55 kg
        expect(updated[3].weight).toBe(55);
      });

      it('para a cascata ao encontrar uma série que não seja drop', () => {
        const sets = [
          { type: 'normal', weight: 100 },
          { type: 'drop', drop_percent: 20 },
          { type: 'normal', weight: 90 }, // Não é drop
          { type: 'drop', drop_percent: 20, weight: 50 },
        ];

        const updated = recalculateDropCascade(sets, 0, 2.5);

        expect(updated[0].weight).toBe(100);
        expect(updated[1].weight).toBe(80);
        expect(updated[2].weight).toBe(90); // Normal preservado
        expect(updated[3].weight).toBe(50); // Não recalculado pois a cascata parou no normal
      });
    });
  });

  describe('4. Formatação para type === "drop"', () => {
    it('formatEffort exibe a redução configurada com vírgula decimal pt-BR', () => {
      expect(formatEffort({ type: 'drop', drop_percent: 20 })).toBe('-20% da anterior');
      expect(formatEffort({ type: 'drop', drop_percent: 15 })).toBe('-15% da anterior');
      expect(formatEffort({ type: 'drop', drop_percent: 12.5 })).toBe('-12,5% da anterior');
      expect(formatEffort({ type: 'drop', drop_percent: 33.33 })).toBe('-33,33% da anterior');
      expect(formatEffort({ type: 'drop', dropPercent: 35 })).toBe('-35% da anterior');
    });

    it('formatTarget exibe redução configurada ou assume 20% por padrão', () => {
      expect(formatTarget({ type: 'drop' })).toBe('-20% da anterior');
      expect(formatTarget({ type: 'drop', drop_percent: 15 })).toBe('-15% da anterior');
      expect(formatTarget({ type: 'drop', drop_percent: 25.5 })).toBe('-25,5% da anterior');
    });
  });
});
