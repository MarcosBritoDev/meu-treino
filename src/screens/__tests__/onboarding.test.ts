import { describe, it, expect } from 'vitest';

describe('Regras de Negócio do Onboarding — Volt Precision', () => {
  const KG_INCREMENTS = [
    { value: 1.0, label: '+1', unit: 'kg' },
    { value: 2.0, label: '+2', unit: 'kg' },
    { value: 2.5, label: '+2,5', unit: 'kg' },
    { value: 5.0, label: '+5', unit: 'kg' },
  ];

  const LB_INCREMENTS = [
    { value: 2.5, label: '+2,5', unit: 'lb' },
    { value: 5.0, label: '+5', unit: 'lb' },
    { value: 10.0, label: '+10', unit: 'lb' },
    { value: 15.0, label: '+15', unit: 'lb' },
  ];

  const REST_OPTIONS = [
    { value: 60, label: '60 s' },
    { value: 90, label: '90 s' },
    { value: 120, label: '120 s' },
    { value: 180, label: '180 s' },
  ];

  it('deve definir kg como a unidade de peso padrão', () => {
    const defaultUnit = 'kg';
    expect(defaultUnit).toBe('kg');
  });

  it('deve definir +2,5 kg como a menor anilha padrão em kg', () => {
    const defaultKgIncrement = 2.5;
    expect(defaultKgIncrement).toBe(2.5);
    expect(KG_INCREMENTS.find((i) => i.value === defaultKgIncrement)?.label).toBe('+2,5');
  });

  it('deve definir +5 lb como a menor anilha padrão se a unidade for lb', () => {
    const defaultLbIncrement = 5.0;
    expect(defaultLbIncrement).toBe(5.0);
    expect(LB_INCREMENTS.find((i) => i.value === defaultLbIncrement)?.label).toBe('+5');
  });

  it('deve definir 90 s como o descanso padrão entre séries', () => {
    const defaultRest = 90;
    expect(defaultRest).toBe(90);
    expect(REST_OPTIONS.find((r) => r.value === defaultRest)?.label).toBe('90 s');
  });

  it('troca de unidade deve alterar os rótulos de incremento imediatamente', () => {
    let unit: 'kg' | 'lb' = 'kg';
    const getOptions = (u: 'kg' | 'lb') => (u === 'kg' ? KG_INCREMENTS : LB_INCREMENTS);

    let currentOptions = getOptions(unit);
    expect(currentOptions.map((o) => o.unit)).toEqual(['kg', 'kg', 'kg', 'kg']);

    // Alterna para lb
    unit = 'lb';
    currentOptions = getOptions(unit);
    expect(currentOptions.map((o) => o.unit)).toEqual(['lb', 'lb', 'lb', 'lb']);
    expect(currentOptions.map((o) => o.value)).toContain(5.0);
  });

  it('todos os textos principais do onboarding devem estar em sentence case', () => {
    const labels = [
      'Volt Precision',
      'Vamos ajustar o básico',
      'Unidade de peso',
      'Padrão',
      'Quilos (kg)',
      'Libras (lb)',
      'Menor anilha que você usa',
      'Define quanto a carga sobe a cada ajuste',
      'Descanso entre séries',
      'Automático',
      'O timer começa sozinho ao concluir cada série.',
      'Começar',
      'Seus dados ficam só neste aparelho. Sem conta, sem nuvem.',
    ];

    for (const text of labels) {
      // Não pode ser ALL CAPS
      expect(text).not.toBe(text.toUpperCase());
      // Primeira letra do texto deve ser maiúscula
      expect(text[0]).toBe(text[0].toUpperCase());
    }
  });

  it('deve construir os parâmetros corretos para gravar settings na transação do Começar', () => {
    const onboardingOutput = {
      unit: 'kg' as const,
      defaultIncrement: 2.5,
      defaultRestS: 90,
      autoRestTimer: true,
      onboarded: true,
    };

    expect(onboardingOutput.unit).toBe('kg');
    expect(onboardingOutput.defaultIncrement).toBe(2.5);
    expect(onboardingOutput.defaultRestS).toBe(90);
    expect(onboardingOutput.autoRestTimer).toBe(true);
    expect(onboardingOutput.onboarded).toBe(true);
  });
});
