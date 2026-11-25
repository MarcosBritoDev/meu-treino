import { describe, it, expect } from 'vitest';
import {
  deriveBodyRegion,
  parseExecutionTips,
  filterEvolutionByPeriod,
  formatPtBrDateMedium,
  formatPtBrDateLong,
  formatPtBrDateDayMonth,
} from '../../domain/search';
import { formatarPeso } from '../../domain/weight';

describe('Tela 2.4 - Detalhes do Exercício (Lógica de Domínio)', () => {
  describe('deriveBodyRegion', () => {
    it('deriva Membros superiores para Peito, Costas, Ombros e Braços', () => {
      expect(deriveBodyRegion('Peito')).toBe('Membros superiores');
      expect(deriveBodyRegion('Costas')).toBe('Membros superiores');
      expect(deriveBodyRegion('Ombros')).toBe('Membros superiores');
      expect(deriveBodyRegion('Braços')).toBe('Membros superiores');
      expect(deriveBodyRegion('Tríceps')).toBe('Membros superiores');
      expect(deriveBodyRegion('Bíceps')).toBe('Membros superiores');
    });

    it('deriva Membros inferiores para Pernas, Quadríceps e Glúteos', () => {
      expect(deriveBodyRegion('Pernas')).toBe('Membros inferiores');
      expect(deriveBodyRegion('Quadríceps')).toBe('Membros inferiores');
      expect(deriveBodyRegion('Glúteo')).toBe('Membros inferiores');
      expect(deriveBodyRegion('Panturrilha')).toBe('Membros inferiores');
    });

    it('deriva Core e abdômen para Abdômen e Core', () => {
      expect(deriveBodyRegion('Abdômen')).toBe('Core e abdômen');
      expect(deriveBodyRegion('Core')).toBe('Core e abdômen');
    });

    it('retorna Geral para grupos não classificados', () => {
      expect(deriveBodyRegion('Alongamento')).toBe('Geral');
      expect(deriveBodyRegion('')).toBe('Geral');
    });
  });

  describe('parseExecutionTips', () => {
    it('retorna array vazio quando notas são nulas, indefinidas ou em branco', () => {
      expect(parseExecutionTips(null)).toEqual([]);
      expect(parseExecutionTips(undefined)).toEqual([]);
      expect(parseExecutionTips('')).toEqual([]);
      expect(parseExecutionTips('   ')).toEqual([]);
    });

    it('extrai título antes de dois pontos e texto subsequente', () => {
      const notes = 'Banco a 30°: Inclinação ideal para focar no feixe clavicular.\nCotovelos a 45°: Mantenha ângulo seguro.';
      const tips = parseExecutionTips(notes);
      expect(tips).toHaveLength(2);
      expect(tips[0]).toEqual({
        title: 'Banco a 30°',
        text: 'Inclinação ideal para focar no feixe clavicular.',
      });
      expect(tips[1]).toEqual({
        title: 'Cotovelos a 45°',
        text: 'Mantenha ângulo seguro.',
      });
    });

    it('usa títulos técnicos padrão quando não houver dois pontos', () => {
      const notes = 'Manter escápulas retraídas. Descer até a linha do peito. Não bater os halteres no topo.';
      const tips = parseExecutionTips(notes);
      expect(tips.length).toBeGreaterThanOrEqual(1);
      expect(tips[0].title).toBe('Postura e alinhamento');
    });

    it('limita a no máximo 3 dicas', () => {
      const notes = 'Dica 1: Texto 1.\nDica 2: Texto 2.\nDica 3: Texto 3.\nDica 4: Texto 4.\nDica 5: Texto 5.';
      const tips = parseExecutionTips(notes);
      expect(tips).toHaveLength(3);
      expect(tips[0].title).toBe('Dica 1');
      expect(tips[1].title).toBe('Dica 2');
      expect(tips[2].title).toBe('Dica 3');
    });
  });

  describe('filterEvolutionByPeriod', () => {
    const fixedNow = new Date('2026-11-25T12:00:00Z').getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const samplePoints = [
      { date: fixedNow - 120 * dayMs, weight: 26 }, // 4 meses atrás
      { date: fixedNow - 60 * dayMs, weight: 28 },  // 2 meses atrás
      { date: fixedNow - 21 * dayMs, weight: 30 },  // 3 semanas atrás
      { date: fixedNow - 14 * dayMs, weight: 32 },  // 2 semanas atrás
      { date: fixedNow - 7 * dayMs, weight: 32 },   // 1 semana atrás
      { date: fixedNow, weight: 34 },               // hoje
    ];

    it('filtra corretamente para o período "4 sem"', () => {
      const stats = filterEvolutionByPeriod(samplePoints, '4 sem', fixedNow);
      expect(stats.points).toHaveLength(4); // 21d, 14d, 7d, 0d
      expect(stats.peakWeight).toBe(34);
      // Variação de 30 para 34: (34 - 30) / 30 = +13.33%
      expect(stats.cycleChangePercent).toBeCloseTo(13.33, 1);
    });

    it('filtra corretamente para o período "3 meses"', () => {
      const stats = filterEvolutionByPeriod(samplePoints, '3 meses', fixedNow);
      expect(stats.points).toHaveLength(5); // 60d, 21d, 14d, 7d, 0d
      expect(stats.peakWeight).toBe(34);
      // Variação de 28 para 34: (34 - 28) / 28 = +21.43%
      expect(stats.cycleChangePercent).toBeCloseTo(21.43, 1);
    });

    it('retorna todos os pontos para "tudo"', () => {
      const stats = filterEvolutionByPeriod(samplePoints, 'tudo', fixedNow);
      expect(stats.points).toHaveLength(6);
      expect(stats.peakWeight).toBe(34);
      // Variação de 26 para 34: (34 - 26) / 26 = +30.77%
      expect(stats.cycleChangePercent).toBeCloseTo(30.77, 1);
    });

    it('lida com lista vazia graciosamente', () => {
      const stats = filterEvolutionByPeriod([], '4 sem', fixedNow);
      expect(stats.points).toEqual([]);
      expect(stats.peakWeight).toBe(0);
      expect(stats.cycleChangePercent).toBe(0);
    });

    it('lida com apenas um ponto', () => {
      const stats = filterEvolutionByPeriod([{ date: fixedNow, weight: 30 }], '4 sem', fixedNow);
      expect(stats.points).toHaveLength(1);
      expect(stats.peakWeight).toBe(30);
      expect(stats.cycleChangePercent).toBe(0);
    });
  });

  describe('Formatação de datas em português do Brasil', () => {
    // 24 de outubro de 2026
    const testDate = new Date(2026, 9, 24, 10, 0, 0).getTime();

    it('formatPtBrDateMedium formata no estilo "24 de out"', () => {
      expect(formatPtBrDateMedium(testDate)).toBe('24 de out');
      expect(formatPtBrDateMedium(null)).toBe('—');
    });

    it('formatPtBrDateLong formata no estilo "24 de outubro"', () => {
      expect(formatPtBrDateLong(testDate)).toBe('24 de outubro');
      expect(formatPtBrDateLong(null)).toBe('—');
    });

    it('formatPtBrDateDayMonth formata no estilo "24 Out"', () => {
      expect(formatPtBrDateDayMonth(testDate)).toBe('24 Out');
      expect(formatPtBrDateDayMonth(null)).toBe('—');
    });
  });

  describe('Formatação de carga e unidades', () => {
    it('formata valores de kg e lb corretamente', () => {
      expect(formatarPeso(34, 'kg')).toBe('34 kg');
      expect(formatarPeso(32.5, 'kg')).toBe('32,5 kg');
      expect(formatarPeso(34, 'lb')).toBe('75 lb');
    });
  });
});
