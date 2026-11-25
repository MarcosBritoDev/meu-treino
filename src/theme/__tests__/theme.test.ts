import { describe, it, expect } from 'vitest';
import { colors, typography, radii, spacing } from '../index';

describe('Tokens de Design — Volt Precision Warm', () => {
  describe('Cores e Contraste', () => {
    it('deve possuir as cores exatas da seção em prosa do DESIGN.md', () => {
      expect(colors.background).toBe('#1A1715');
      expect(colors.surfaceContainer).toBe('#23201D');
      expect(colors.surfaceContainerHigh).toBe('#2D2925');
      expect(colors.surfaceContainerHighest).toBe('#38332F');
      expect(colors.outlineVariant).toBe('#3A3531');
      expect(colors.primary).toBe('#FF7A59');
      expect(colors.onPrimary).toBe('#1A1715');
      expect(colors.accentPressed).toBe('#E8654A');
      expect(colors.primaryContainer).toBe('#3A251F');
      expect(colors.pr).toBe('#FFC46B');
      expect(colors.onSurface).toBe('#F5EFE8');
      expect(colors.onSurfaceVariant).toBe('#B7ADA3');
      expect(colors.textMuted).toBe('#7D746B');
      expect(colors.success).toBe('#7BC98F');
      expect(colors.error).toBe('#FF6B6B');
      expect(colors.overlay).toBe('rgba(0, 0, 0, 0.65)');
    });

    it('não deve conter preto puro (#000000), branco puro (#ffffff), azul ou laranja queimado', () => {
      const colorValues = Object.values(colors).filter((c) => typeof c === 'string' && c.startsWith('#'));

      for (const hex of colorValues) {
        const lower = hex.toLowerCase();
        expect(lower).not.toBe('#000000');
        expect(lower).not.toBe('#ffffff');
      }
    });
  });

  describe('Tipografia e Escala', () => {
    it('deve conter a escala tipográfica exata (48/52, 28/34, 20/26, 17/24, 15/22, 13/18, 12/16)', () => {
      expect(typography.displayLarge.fontSize).toBe(48);
      expect(typography.displayLarge.lineHeight).toBe(52);

      expect(typography.displayMedium.fontSize).toBe(28);
      expect(typography.displayMedium.lineHeight).toBe(34);

      expect(typography.headline.fontSize).toBe(20);
      expect(typography.headline.lineHeight).toBe(26);

      expect(typography.bodyLarge.fontSize).toBe(17);
      expect(typography.bodyLarge.lineHeight).toBe(24);

      expect(typography.bodyMedium.fontSize).toBe(15);
      expect(typography.bodyMedium.lineHeight).toBe(22);

      expect(typography.bodySmall.fontSize).toBe(13);
      expect(typography.bodySmall.lineHeight).toBe(18);

      expect(typography.labelSmall.fontSize).toBe(12);
      expect(typography.labelSmall.lineHeight).toBe(16);
    });

    it('todos os títulos e números de destaque devem ter tabular-nums habilitado', () => {
      expect(typography.displayLarge.fontVariant).toContain('tabular-nums');
      expect(typography.displayMedium.fontVariant).toContain('tabular-nums');
      expect(typography.headline.fontVariant).toContain('tabular-nums');
      expect(typography.numberMedium.fontVariant).toContain('tabular-nums');
      expect(typography.numberSmall.fontVariant).toContain('tabular-nums');
    });
  });

  describe('Raios e Espaçamentos', () => {
    it('deve ter raios corretos para cartões (24), inputs (16), sheet (28) e pílula (9999)', () => {
      expect(radii.card).toBe(24);
      expect(radii.input).toBe(16);
      expect(radii.sheet).toBe(28);
      expect(radii.pill).toBe(9999);
    });

    it('deve respeitar acessibilidade de alvo mínimo (48px) e alturas de botão/tab', () => {
      expect(spacing.touchTargetMin).toBe(48);
      expect(spacing.tabBarHeight).toBe(72);
      expect(spacing.buttonHeight).toBe(56);
      expect(spacing.buttonLargeHeight).toBe(64);
      expect(spacing.margin).toBe(20);
      expect(spacing.gutter).toBe(12);
    });
  });
});
