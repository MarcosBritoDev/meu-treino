/**
 * Volt Precision Warm — Tokens de cor
 * Fiel à seção em prosa de volt_precision_warm/DESIGN.md
 * 
 * Regra: Proibido azul, laranja queimado, fundo branco ou preto puro.
 */
export const colors = {
  // Fundos & Superfícies
  background: '#1A1715',             // Grafite quente, nunca preto puro
  surfaceDim: '#141210',
  surfaceBright: '#3A3531',
  surfaceContainerLowest: '#120F0D',
  surfaceContainerLow: '#1F1B19',
  surfaceContainer: '#23201D',        // Cartão nível 1
  surfaceContainerHigh: '#2D2925',    // Cartão nível 2 / botão secundário
  surfaceContainerHighest: '#38332F', // Campos de texto / inputs

  // Textos
  onSurface: '#F5EFE8',               // Texto primário
  onSurfaceVariant: '#B7ADA3',        // Texto secundário
  textMuted: '#7D746B',               // Texto mudo / placeholders

  // Bordas & Divisores
  outline: '#7D746B',
  outlineVariant: '#3A3531',          // Borda sutil de 1px

  // Primária (Coral quente)
  primary: '#FF7A59',                 // Ações primárias, aba ativa, chips selecionados
  onPrimary: '#1A1715',               // Texto escuro sobre coral
  primaryContainer: '#3A251F',        // Tint coral suave (timer de descanso, destaques)
  onPrimaryContainer: '#FFB4A0',
  accentPressed: '#E8654A',           // Estado pressionado da primária

  // Âmbar (EXCLUSIVO para Personal Record / Recorde pessoal e troféu)
  pr: '#FFC46B',                      // Âmbar exclusivo para PR
  onPr: '#1A1715',
  prContainer: '#3D2E12',

  // Status
  success: '#7BC98F',                 // Verde suave
  onSuccess: '#1A1715',
  error: '#FF6B6B',                   // Vermelho suave / perigo
  onError: '#1A1715',
  errorContainer: '#4A1F1F',
  onErrorContainer: '#FFB4B4',

  // Sobreposição (Modais e BottomSheets)
  overlay: 'rgba(0, 0, 0, 0.65)',     // Overlay preto 65%
  transparent: 'transparent',
} as const;

export type Colors = typeof colors;
