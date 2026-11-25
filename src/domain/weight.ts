import { WeightUnit } from './types';

export const KG_TO_LB = 2.20462262185;
export const LB_TO_KG = 1 / KG_TO_LB;

/**
 * Formata um valor de peso em kg para a unidade desejada ('kg' ou 'lb').
 * Pesos são sempre armazenados internamente em kg com 2 casas decimais.
 * 
 * @param kg Peso em quilogramas
 * @param unidade Unidade de exibição ('kg' ou 'lb')
 * @returns String formatada, ex: "80 kg", "82,5 kg", "176 lb"
 */
export function formatarPeso(kg: number, unidade: WeightUnit = 'kg'): string {
  const numKg = Number(kg) || 0;

  if (unidade === 'lb') {
    const inLb = numKg * KG_TO_LB;
    const rounded = Math.round(inLb * 10) / 10;
    const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',');
    return `${formatted} lb`;
  }

  // Formato kg
  const rounded = Math.round(numKg * 100) / 100;
  if (rounded % 1 === 0) {
    return `${rounded.toFixed(0)} kg`;
  }

  // Remove zeros à direita irrelevantes após a vírgula
  const str = rounded.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  return `${str} kg`;
}

/**
 * Converte valor de lb para kg (para inserção de dados)
 */
export function converterLbParaKg(lb: number): number {
  return Math.round((Number(lb) * LB_TO_KG) * 100) / 100;
}

/**
 * Calcula a próxima carga com base no incremento e na direção.
 * 
 * @param atual Carga atual em kg
 * @param incremento Valor do incremento (ex: 2.5)
 * @param direcao 'up' para aumentar, 'down' para diminuir
 * @returns Novo valor de carga (mínimo 0)
 */
export function proximaCarga(
  atual: number,
  incremento: number,
  direcao: 'up' | 'down'
): number {
  const base = Number(atual) || 0;
  const inc = Number(incremento) > 0 ? Number(incremento) : 2.5;

  let result = direcao === 'up' ? base + inc : base - inc;
  if (result < 0) {
    result = 0;
  }

  return Math.round(result * 100) / 100;
}
