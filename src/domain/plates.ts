/**
 * Regras puras para a Calculadora de Divisão de Anilhas por lado da barra.
 * Volt Precision — Etapa 4.3
 */

export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateCalculationResult {
  targetWeight: number;
  barWeight: number;
  weightPerSide: number;
  platesPerSide: PlateCount[];
  totalActualWeight: number;
  remainder: number;
}

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5] as const;

/**
 * Calcula a quantidade de anilhas necessárias por lado da barra para atingir a carga alvo.
 */
export function calculatePlates(
  targetWeight: number,
  barWeight: number = 20,
  availablePlates: number[] = [25, 20, 15, 10, 5, 2.5, 1.25]
): PlateCalculationResult {
  const target = Math.max(0, targetWeight);
  const bar = Math.max(0, barWeight);

  if (target <= bar) {
    return {
      targetWeight: target,
      barWeight: bar,
      weightPerSide: 0,
      platesPerSide: [],
      totalActualWeight: bar,
      remainder: 0,
    };
  }

  let neededPerSide = Number(((target - bar) / 2).toFixed(2));
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  const platesPerSide: PlateCount[] = [];

  for (const plate of sortedPlates) {
    if (neededPerSide >= plate) {
      const count = Math.floor(neededPerSide / plate);
      platesPerSide.push({ plate, count });
      neededPerSide = Number((neededPerSide - count * plate).toFixed(2));
    }
  }

  const actualWeightPerSide = platesPerSide.reduce(
    (sum, p) => sum + p.plate * p.count,
    0
  );
  const totalActualWeight = Number((bar + actualWeightPerSide * 2).toFixed(2));
  const remainder = Number((target - totalActualWeight).toFixed(2));

  return {
    targetWeight: target,
    barWeight: bar,
    weightPerSide: actualWeightPerSide,
    platesPerSide,
    totalActualWeight,
    remainder,
  };
}
