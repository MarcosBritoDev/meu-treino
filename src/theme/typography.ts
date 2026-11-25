import { TextStyle } from 'react-native';

/**
 * Volt Precision Warm — Tipografia
 * 
 * Outfit (600/700) para títulos e TODOS os números (carga, reps, timers, totais)
 * com algarismos tabulares ('tabular-nums') para alinhamento perfeito.
 * DM Sans (400/500) para textos de corpo e rótulos.
 * Sentence case em toda a interface (nunca caixa alta).
 * 
 * Escala exata: 48/52, 28/34, 20/26, 17/24, 15/22, 13/18, 12/16.
 */

export const fontFamilies = {
  outfitSemiBold: 'Outfit_600SemiBold',
  outfitBold: 'Outfit_700Bold',
  dmSansRegular: 'DMSans_400Regular',
  dmSansMedium: 'DMSans_500Medium',
} as const;

export const typography: Record<string, TextStyle> = {
  // 48/52: Outfit Bold com algarismos tabulares (exibição gigante, timers grandes, pesos de destaque)
  displayLarge: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 48,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },

  // 28/34: Outfit SemiBold (títulos grandes de tela, cabeçalhos principais)
  displayMedium: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },

  // 20/26: Outfit SemiBold (títulos de cartões, subtítulos de destaque, números de série)
  headline: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },

  // 17/24: DM Sans Medium (rótulos de botões primários, texto de destaque, tabs)
  bodyLarge: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 17,
    lineHeight: 24,
  },

  // 15/22: DM Sans Regular (corpo principal, campos de texto, descrições)
  bodyMedium: {
    fontFamily: fontFamilies.dmSansRegular,
    fontSize: 15,
    lineHeight: 22,
  },

  // 13/18: DM Sans Regular (detalhes secundários, metadados de exercícios, notas)
  bodySmall: {
    fontFamily: fontFamilies.dmSansRegular,
    fontSize: 13,
    lineHeight: 18,
  },

  // 12/16: DM Sans Medium (chips pequenos, badges, rótulos auxiliares)
  labelSmall: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 12,
    lineHeight: 16,
  },

  // Variante tabular para números menores (ex: reps em linha, cargas em tabelas)
  numberMedium: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 17,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },

  numberSmall: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 15,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
} as const;
