import { PRResult } from './types';

/**
 * Detecta se uma nova série constitui Recorde Pessoal (PR).
 * 
 * Regra:
 * PR de carga = maior carga; empate desempata por repetições.
 * PR de volume = maior volume unitário em uma única série (carga x reps).
 * 
 * @param historico Lista de séries anteriores concluídas (sem aquecimento) do mesmo exercício
 * @param novaSerie A série recém-concluída
 * @returns { isPrWeight: boolean, isPrVolume: boolean }
 */
export function detectarPR(
  historico: Array<{ weight: number; reps: number }>,
  novaSerie: { weight: number; reps: number }
): PRResult {
  const weight = Number(novaSerie.weight) || 0;
  const reps = Number(novaSerie.reps) || 0;

  // Séries sem carga, sem repetições, ou do tipo aquecimento/drop não geram PR
  if (
    weight <= 0 ||
    reps <= 0 ||
    (novaSerie as any).isWarmup ||
    (novaSerie as any).type === 'warmup' ||
    (novaSerie as any).type === 'drop'
  ) {
    return { isPrWeight: false, isPrVolume: false };
  }

  // Filtrar histórico válido
  const validHistory = (historico || []).filter(
    (s) => Number(s.weight) > 0 && Number(s.reps) > 0
  );

  // Se não há histórico anterior, a primeira série válida é PR
  if (validHistory.length === 0) {
    return { isPrWeight: true, isPrVolume: true };
  }

  // Encontra a maior carga e as repetições correspondentes
  let maxWeight = 0;
  let maxRepsAtMaxWeight = 0;
  let maxSingleSetVolume = 0;

  for (const s of validHistory) {
    const sWeight = Number(s.weight);
    const sReps = Number(s.reps);
    const sVol = sWeight * sReps;

    if (sVol > maxSingleSetVolume) {
      maxSingleSetVolume = sVol;
    }

    if (sWeight > maxWeight) {
      maxWeight = sWeight;
      maxRepsAtMaxWeight = sReps;
    } else if (Math.abs(sWeight - maxWeight) < 0.001) {
      if (sReps > maxRepsAtMaxWeight) {
        maxRepsAtMaxWeight = sReps;
      }
    }
  }

  // PR de carga: carga maior ou (carga igual com mais repetições)
  let isPrWeight = false;
  if (weight > maxWeight) {
    isPrWeight = true;
  } else if (Math.abs(weight - maxWeight) < 0.001 && reps > maxRepsAtMaxWeight) {
    isPrWeight = true;
  }

  // PR de volume: volume da série unitária superior ao maior volume unitário registrado
  const currentVolume = weight * reps;
  const isPrVolume = currentVolume > maxSingleSetVolume;

  return { isPrWeight, isPrVolume };
}
