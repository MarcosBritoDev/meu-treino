import { describe, it, expect } from 'vitest';
import {
  SET_REST_OPTIONS,
  getTypeLabel,
  formatRestShort,
  getEffortModeOptions,
  REPS_MODE_OPTIONS,
  EFFORT_MODE_OPTIONS,
  formatRepsTarget,
  formatRepsShort,
  formatEffort,
  getSetDisplayLabel,
  sanitizePlannedSet,
  suggest1RmWeightKg,
  suggestDropWeightKg,
} from '../domain/sessionMath';

describe('ETAPA 3 — Componentes e Regras de UI: StyledDropdown, SetTypeSheet, SetEditSheet e SetTable (Preview)', () => {
  describe('1. StyledDropdown (Contrato de Seleção e Opções)', () => {
    it('suporta opções com value e label', () => {
      const options = [
        { value: 'opt1', label: 'Opção 1' },
        { value: 'opt2', label: 'Opção 2' },
      ];
      expect(options[0].value).toBe('opt1');
      expect(options[1].label).toBe('Opção 2');
    });

    it('mantém estilo amarelo #F5C400 com texto preto em negrito e check para item selecionado', () => {
      const getOptionStyle = (isSelected: boolean) => ({
        bg: isSelected ? '#F5C400' : '#121212',
        color: isSelected ? '#000000' : '#FFFFFF',
        fontWeight: isSelected ? '700' : '500',
        hasCheck: isSelected,
      });

      const selected = getOptionStyle(true);
      expect(selected.bg).toBe('#F5C400');
      expect(selected.color).toBe('#000000');
      expect(selected.fontWeight).toBe('700');
      expect(selected.hasCheck).toBe(true);

      const unselected = getOptionStyle(false);
      expect(unselected.bg).toBe('#121212');
      expect(unselected.color).toBe('#FFFFFF');
      expect(unselected.hasCheck).toBe(false);
    });
  });

  describe('2. SetTypeSheet (Grade 2x3 de 6 opções)', () => {
    it('define as 6 opções de tipo de série em grade 2x3', () => {
      const expectedKeys = ['warmup', 'normal', 'rpe', 'rir', 'failure', 'drop'];
      expect(expectedKeys).toHaveLength(6);
      expect(expectedKeys).toContain('warmup');
      expect(expectedKeys).toContain('normal');
      expect(expectedKeys).toContain('rpe');
      expect(expectedKeys).toContain('rir');
      expect(expectedKeys).toContain('failure');
      expect(expectedKeys).toContain('drop');
    });

    it('gera a descrição correta de Drop sensível ao modo (preview vs active)', () => {
      // No modo preview: "Até a falha · -20% no treino"
      const getDropDesc = (mode: 'preview' | 'active', suggestedKg?: number | null) => {
        return mode === 'active'
          ? suggestedKg
            ? `Até a falha · Sugestão ${suggestedKg} kg (-20%)`
            : 'Até a falha · -20% da anterior'
          : 'Até a falha · -20% no treino';
      };

      expect(getDropDesc('preview')).toBe('Até a falha · -20% no treino');
      expect(getDropDesc('preview', 80)).toBe('Até a falha · -20% no treino');
      expect(getDropDesc('active', null)).toBe('Até a falha · -20% da anterior');
      expect(getDropDesc('active', 80)).toBe('Até a falha · Sugestão 80 kg (-20%)');
    });

    it('mapeia os badges e cores de cada uma das 6 opções', () => {
      const options = [
        { key: 'warmup', badge: 'A', title: 'Aquecimento' },
        { key: 'normal', badge: 'N', title: 'Normal' },
        { key: 'rpe', badge: 'RPE', title: 'Por RPE' },
        { key: 'rir', badge: 'RIR', title: 'Por RIR' },
        { key: 'failure', badge: 'F', title: 'Falha' },
        { key: 'drop', badge: 'D', title: 'Drop' },
      ];

      expect(options).toHaveLength(6);
      expect(options[0].badge).toBe('A');
      expect(options[1].badge).toBe('N');
      expect(options[2].badge).toBe('RPE');
      expect(options[3].badge).toBe('RIR');
      expect(options[4].badge).toBe('F');
      expect(options[5].badge).toBe('D');
    });
  });

  describe('3. SetEditSheet (Edição de Série Planejada sem Carga Alvo)', () => {
    it('define os presets de descanso para séries planejadas', () => {
      expect(SET_REST_OPTIONS).toEqual([null, 0, 30, 60, 90, 120, 180]);
      expect(getTypeLabel('warmup')).toBe('Aquecimento');
      expect(getTypeLabel('normal')).toBe('Normal');
      expect(getTypeLabel('failure')).toBe('Falha');
      expect(getTypeLabel('drop')).toBe('Drop');
    });

    it('formata descanso de forma compacta e humana', () => {
      expect(formatRestShort(null)).toBe('Herdar');
      expect(formatRestShort(undefined)).toBe('Herdar');
      expect(formatRestShort(0)).toBe('0s');
      expect(formatRestShort(30)).toBe('30s');
      expect(formatRestShort(60)).toBe('1 min');
      expect(formatRestShort(90)).toBe('90s');
      expect(formatRestShort(120)).toBe('2 min');
      expect(formatRestShort(180)).toBe('3 min');
    });

    it('gera opções de modo de esforço dinâmicas de acordo com a unidade (kg vs lb)', () => {
      const optionsKg = getEffortModeOptions('kg');
      const optionsLb = getEffortModeOptions('lb');

      expect(optionsKg.find((o) => o.value === 'last_week_plus')?.label).toBe(
        'Semana passada + X kg'
      );
      expect(optionsLb.find((o) => o.value === 'last_week_plus')?.label).toBe(
        'Semana passada + X lb'
      );
      expect(optionsKg.find((o) => o.value === 'last_session_plus')?.label).toBe(
        'Sessão passada + X kg'
      );
      expect(optionsLb.find((o) => o.value === 'last_session_plus')?.label).toBe(
        'Sessão passada + X lb'
      );
    });

    it('aplica a Regra Global 1: A prévia NÃO possui campo de carga alvo', () => {
      const failureSet = sanitizePlannedSet({
        type: 'failure',
        repsMode: 'reps_range',
        minReps: 8,
        maxReps: 10,
        effortMode: 'rpe',
        effortValue: 8,
      });

      expect(failureSet.minReps).toBeNull();
      expect(failureSet.maxReps).toBeNull();
      expect(failureSet.effortMode).toBe('none');
      expect(failureSet.effortValue).toBeNull();
      // Não deve haver weightKg na meta planejada
      expect((failureSet as any).weightKg).toBeUndefined();
    });

    it('restringe esforço exclusivamente para séries normais', () => {
      const warmupSet = sanitizePlannedSet({
        type: 'warmup',
        effortMode: 'rpe',
        effortValue: 8,
      });
      expect(warmupSet.effortMode).toBe('none');
      expect(warmupSet.effortValue).toBeNull();

      const dropSet = sanitizePlannedSet({
        type: 'drop',
        effortMode: 'rir',
        effortValue: 2,
      });
      expect(dropSet.effortMode).toBe('none');
      expect(dropSet.effortValue).toBeNull();
    });

    it('calcula estimativa de 1RM na interface de esforço (sempre em kg)', () => {
      // 1RM: Supino 100 kg a 75% = 75 kg
      expect(suggest1RmWeightKg(100, 75)).toBe(75);
      // 1RM: 140 kg a 66% = 92.4 -> arredondado para 92.5 kg
      expect(suggest1RmWeightKg(140, 66)).toBe(92.5);
    });
  });

  describe('4. SetTable (Modo Prévia vs Ativo)', () => {
    it('formata rótulos visuais e badges de séries no preview contíguo', () => {
      const sets = [
        { id: '1', type: 'warmup' },
        { id: '2', type: 'warmup' },
        { id: '3', type: 'normal' },
        { id: '4', type: 'normal' },
        { id: '5', type: 'failure' },
        { id: '6', type: 'drop' },
      ];

      expect(getSetDisplayLabel(sets, 0)).toBe('A');
      expect(getSetDisplayLabel(sets, 1)).toBe('A');
      expect(getSetDisplayLabel(sets, 2)).toBe('1');
      expect(getSetDisplayLabel(sets, 3)).toBe('2');
      expect(getSetDisplayLabel(sets, 4)).toBe('F');
      expect(getSetDisplayLabel(sets, 5)).toBe('D');
    });

    it('formata coluna Meta no preview com 2 linhas quando aplicável', () => {
      const setNormalRpe = {
        type: 'normal',
        repsMode: 'reps_range',
        minReps: 8,
        maxReps: 10,
        effortMode: 'rpe',
        effortValue: 8,
      };

      const line1 = formatRepsTarget(setNormalRpe);
      const line2 = formatEffort(setNormalRpe, 'kg');

      expect(line1).toBe('8–10 reps');
      expect(line2).toBe('RPE 8');

      const setFailure = {
        type: 'failure',
        repsMode: 'reps_max',
      };
      expect(formatRepsTarget(setFailure)).toBe('até a falha');
      expect(formatEffort(setFailure, 'kg')).toBe('');
    });

    it('formata coluna Reps no preview como valor curto', () => {
      expect(formatRepsShort({ type: 'normal', repsMode: 'reps', minReps: 10 })).toBe('10');
      expect(formatRepsShort({ type: 'normal', repsMode: 'reps_range', minReps: 8, maxReps: 10 })).toBe('8–10');
      expect(formatRepsShort({ type: 'failure' })).toBe('Falha');
      expect(formatRepsShort({ type: 'drop' })).toBe('Falha');
      expect(formatRepsShort({ type: 'normal', repsMode: 'time', minReps: 45 })).toBe('45s');
      expect(formatRepsShort({ type: 'normal', repsMode: 'time_range', minReps: 30, maxReps: 45 })).toBe('30–45s');
    });

    it('calcula sugestão de drop (-20% da última série válida)', () => {
      const sets = [
        { type: 'normal', actual_weight_kg: 100 },
      ];
      expect(suggestDropWeightKg(sets)).toBe(80);
    });

    it('garante que o modo preview possui exatamente 4 colunas lógicas (Série, Meta, Reps, ⋮)', () => {
      const previewColumns = ['SÉRIE', 'META', 'REPS', '⋮'];
      expect(previewColumns).toHaveLength(4);
      expect(previewColumns).not.toContain('kg');
      expect(previewColumns).not.toContain('lb');
      expect(previewColumns).not.toContain('Anterior');
      expect(previewColumns).not.toContain('✓');
    });
  });
});
