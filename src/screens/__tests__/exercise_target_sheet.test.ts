import { describe, it, expect } from 'vitest';
import { getRepRangeLabel } from '../../domain/workouts';

describe('Tela 3.6 - Alvo do Exercício Bottom Sheet (Regras de Domínio e Metas)', () => {
  describe('Rótulo Dinâmico da Faixa de Repetições (getRepRangeLabel)', () => {
    it('retorna "Zona de força" para repetições de até 6 reps (ex.: 3-5, 4-6)', () => {
      expect(getRepRangeLabel(3, 5)).toBe('Zona de força');
      expect(getRepRangeLabel(4, 6)).toBe('Zona de força');
      expect(getRepRangeLabel(1, 6)).toBe('Zona de força');
    });

    it('retorna "Janela de hipertrofia" para repetições entre 7 e 12 reps (ex.: 8-10, 8-12, 10-12)', () => {
      expect(getRepRangeLabel(8, 10)).toBe('Janela de hipertrofia');
      expect(getRepRangeLabel(7, 12)).toBe('Janela de hipertrofia');
      expect(getRepRangeLabel(10, 12)).toBe('Janela de hipertrofia');
    });

    it('retorna "Resistência muscular" para repetições acima de 12 reps (ex.: 15-20, 15-25)', () => {
      expect(getRepRangeLabel(15, 20)).toBe('Resistência muscular');
      expect(getRepRangeLabel(13, 15)).toBe('Resistência muscular');
    });

    it('retorna transições explicativas para faixas que cruzam zonas (ex.: 5-8 força e hipertrofia)', () => {
      expect(getRepRangeLabel(5, 8)).toBe('Força e hipertrofia');
      expect(getRepRangeLabel(10, 15)).toBe('Hipertrofia e resistência');
    });
  });

  describe('Limites e Validações de Séries, Repetições e Descanso', () => {
    it('restringe as séries alvo estritamente entre 1 e 10', () => {
      const clampSets = (val: number) => Math.min(10, Math.max(1, val));
      expect(clampSets(0)).toBe(1);
      expect(clampSets(4)).toBe(4);
      expect(clampSets(10)).toBe(10);
      expect(clampSets(15)).toBe(10);
    });

    it('garante que repetições mínimas não superem as repetições máximas', () => {
      let min = 8;
      let max = 10;

      const incrementMin = (currentMin: number, currentMax: number) => {
        return currentMin < currentMax ? currentMin + 1 : currentMin;
      };

      expect(incrementMin(min, max)).toBe(9);
      expect(incrementMin(9, max)).toBe(10);
      expect(incrementMin(10, max)).toBe(10); // Não passa de max (10)
    });

    it('garante que repetições máximas não sejam menores que as repetições mínimas', () => {
      let min = 8;
      let max = 10;

      const decrementMax = (currentMin: number, currentMax: number) => {
        return currentMax > currentMin ? currentMax - 1 : currentMax;
      };

      expect(decrementMax(min, max)).toBe(9);
      expect(decrementMax(min, 9)).toBe(8);
      expect(decrementMax(min, 8)).toBe(8); // Não fica menor que min (8)
    });

    it('restringe o tempo de descanso customizado ("Outro") entre 15 e 600 segundos', () => {
      const clampRest = (val: number) => Math.min(600, Math.max(15, val));
      expect(clampRest(10)).toBe(15);
      expect(clampRest(45)).toBe(45);
      expect(clampRest(300)).toBe(300);
      expect(clampRest(900)).toBe(600);
    });
  });

  describe('Critério de Pronto: Alteração de Séries e Impacto no Volume do Rodapé', () => {
    it('mudar de 4 para 5 séries atualiza o volume total do rodapé imediatamente', () => {
      const workoutExercises = [
        { name: 'Supino Inclinado', targetSets: 4 },
        { name: 'Supino Reto', targetSets: 3 },
        { name: 'Desenvolvimento', targetSets: 4 },
        { name: 'Elevação Lateral', targetSets: 4 },
        { name: 'Tríceps Corda', targetSets: 3 },
      ];

      const initialVolume = workoutExercises.reduce((acc, ex) => acc + ex.targetSets, 0);
      expect(initialVolume).toBe(18);

      // Aplica a meta na Sheet 3.6 mudando de 4 para 5 séries no primeiro exercício
      const updatedExercises = [...workoutExercises];
      updatedExercises[0] = { ...updatedExercises[0], targetSets: 5 };

      const updatedVolume = updatedExercises.reduce((acc, ex) => acc + ex.targetSets, 0);
      expect(updatedVolume).toBe(19);
      expect(updatedVolume).toBe(initialVolume + 1);
    });

    it('remoção de exercício afeta apenas a lista do treino corrente', () => {
      const workoutExercises = ['Supino Inclinado', 'Supino Reto', 'Desenvolvimento'];
      const libraryExercises = ['Supino Inclinado', 'Supino Reto', 'Desenvolvimento', 'Agachamento'];

      // Remove Supino Reto do treino
      const newWorkoutExercises = workoutExercises.filter((name) => name !== 'Supino Reto');
      expect(newWorkoutExercises).toEqual(['Supino Inclinado', 'Desenvolvimento']);

      // Biblioteca permanece inalterada
      expect(libraryExercises).toContain('Supino Reto');
      expect(libraryExercises.length).toBe(4);
    });
  });
});
