import { SetData } from './types';
import { isDumbbellEquipment } from './exerciseCatalog';

/**
 * Calcula o volume total de uma lista de séries.
 * 
 * Regra:
 * Volume = soma de (carga x reps) das séries concluídas sem aquecimento,
 * com carga x 2 quando o equipamento for 'Halteres'.
 * 
 * @param sets Lista de séries
 * @param equipment Tipo de equipamento utilizado
 * @returns Volume total em kg arredondado a 2 casas decimais
 */
export function calcularVolume(
  sets: SetData[],
  equipment?: string
): number {
  if (!sets || sets.length === 0) {
    return 0;
  }

  const isDumbbell = isDumbbellEquipment(equipment);
  const multiplier = isDumbbell ? 2 : 1;

  let totalVolume = 0;

  for (const set of sets) {
    // Ignora séries de aquecimento
    if (set.isWarmup || (set as any).type === 'warmup') {
      continue;
    }

    // Se completedAt foi fornecido explicitamente como nulo ou falso, ignora
    if (set.completedAt === null || set.completedAt === false) {
      continue;
    }

    const weight = Number(set.weight) || 0;
    const reps = Number(set.reps) || 0;

    if (weight > 0 && reps > 0) {
      totalVolume += weight * multiplier * reps;
    }
  }

  return Math.round(totalVolume * 100) / 100;
}
