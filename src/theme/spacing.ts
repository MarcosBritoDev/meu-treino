/**
 * Volt Precision Warm — Espaçamentos
 * 
 * Mobile first base de 390px, grid base de 4px.
 * Margem lateral 20px, espaço entre cartões 12px, padding interno 16 a 20px.
 * Alvos de toque de no mínimo 48px.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  gutter: 12,           // Espaço entre cartões
  md: 16,               // Padding padrão mínimo do cartão
  margin: 20,           // Margem lateral da tela (20px)
  lg: 24,
  xl: 32,
  xxl: 40,
  touchTargetMin: 48,   // Alvo mínimo de toque acessível (48px)
  cardPadding: 18,      // Padding ideal entre 16 e 20px
  tabBarHeight: 72,     // Altura da barra inferior de navegação (72px)
  buttonHeight: 56,     // Altura do botão primário (56px)
  buttonLargeHeight: 64 // Altura do botão principal de treino ativo (64px)
} as const;

export type Spacing = typeof spacing;
