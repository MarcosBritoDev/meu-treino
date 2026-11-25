/**
 * Volt Precision Warm — Raios de arredondamento
 * 
 * Formas muito arredondadas e acolhedoras.
 * Cartões 24px, inputs 16px, bottom sheets 28px no topo.
 * Botões e chips são totalmente pílula (9999px).
 */
export const radii = {
  sm: 8,
  input: 16,   // Campos de texto (16px)
  card: 24,    // Cartões (24px)
  sheet: 28,   // Topo dos BottomSheets (28px)
  pill: 9999,  // Botões, chips, segmented controls (pílula)
} as const;

export type Radii = typeof radii;
