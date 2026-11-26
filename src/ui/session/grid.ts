// Grade fixa da tabela de séries (estilo Stitch com touch targets >= 48px).
export const GRID = {
  serie: 44,
  kg: 64,
  reps: 64,
  check: 48,
  rowHeight: 52,
  anteriorMin: 70,
} as const;

export const GRID_FIXED_WIDTH = GRID.serie + GRID.kg + GRID.reps + GRID.check;

/** Largura que sobra para "Anterior" dado a largura útil do cartão. */
export function anteriorWidth(cardInnerWidth: number): number {
  return cardInnerWidth - GRID_FIXED_WIDTH;
}
