import { describe, it, expect } from 'vitest';
import { estimarDuracao, formatarDuracao } from '../../domain/duration';

describe('Tela 3.5 - Editar Treino (Regras de Domínio, Rascunho e Metas)', () => {
  interface ExerciseItem {
    id: string;
    exerciseId: string;
    name: string;
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
  }

  const initialExercises: ExerciseItem[] = [
    {
      id: 'we_1',
      exerciseId: 'ex_supino_inc',
      name: 'Supino Inclinado com Halteres',
      targetSets: 4,
      repMin: 8,
      repMax: 10,
      restS: 90,
    },
    {
      id: 'we_2',
      exerciseId: 'ex_supino_reto',
      name: 'Supino Reto com Barra',
      targetSets: 3,
      repMin: 6,
      repMax: 8,
      restS: 120,
    },
    {
      id: 'we_3',
      exerciseId: 'ex_desenv',
      name: 'Desenvolvimento com Halteres',
      targetSets: 4,
      repMin: 10,
      repMax: 12,
      restS: 90,
    },
    {
      id: 'we_4',
      exerciseId: 'ex_elev_lat',
      name: 'Elevação Lateral',
      targetSets: 4,
      repMin: 12,
      repMax: 15,
      restS: 60,
    },
    {
      id: 'we_5',
      exerciseId: 'ex_triceps',
      name: 'Tríceps Corda',
      targetSets: 3,
      repMin: 10,
      repMax: 12,
      restS: 60,
    },
  ];

  describe('Cálculos de Volume e Duração Estimada (Rodapé Fixo)', () => {
    it('calcula o volume total como a soma exata de target_sets de todos os exercícios', () => {
      // 4 + 3 + 4 + 4 + 3 = 18 séries
      const totalVolume = initialExercises.reduce((sum, ex) => sum + ex.targetSets, 0);
      expect(totalVolume).toBe(18);
    });

    it('calcula a duração estimada usando estimarDuracao com descanso ajustado', () => {
      // estimarDuracao: 18 séries * 45s trabalho (810s) + descanso ajustado
      const totalSecs = estimarDuracao({
        exercises: initialExercises.map((e) => ({
          targetSets: e.targetSets,
          restS: e.restS,
        })),
      });

      // 18 séries * 45s trabalho (810s) + descansos ajustados (1440s) = 2250s = 38 min
      const minutos = Math.round(totalSecs / 60);
      expect(minutos).toBe(38);

      const formatted = formatarDuracao(totalSecs);
      expect(formatted).toBe('38 min');
    });
  });

  describe('Lógica de Reordenação de Exercícios', () => {
    const moveUp = (list: ExerciseItem[], index: number) => {
      if (index <= 0) return list;
      const copy = [...list];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    };

    const moveDown = (list: ExerciseItem[], index: number) => {
      if (index >= list.length - 1) return list;
      const copy = [...list];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    };

    it('move item para cima na lista mantendo integridade', () => {
      // Move Supino Reto (index 1) para cima (index 0)
      const reordered = moveUp(initialExercises, 1);
      expect(reordered[0].name).toBe('Supino Reto com Barra');
      expect(reordered[1].name).toBe('Supino Inclinado com Halteres');
      expect(reordered.length).toBe(5);
    });

    it('não altera a lista se tentar mover o primeiro item para cima', () => {
      const reordered = moveUp(initialExercises, 0);
      expect(reordered).toEqual(initialExercises);
    });

    it('move item para baixo na lista mantendo integridade', () => {
      // Move Supino Inclinado (index 0) para baixo (index 1)
      const reordered = moveDown(initialExercises, 0);
      expect(reordered[0].name).toBe('Supino Reto com Barra');
      expect(reordered[1].name).toBe('Supino Inclinado com Halteres');
    });

    it('não altera a lista se tentar mover o último item para baixo', () => {
      const lastIndex = initialExercises.length - 1;
      const reordered = moveDown(initialExercises, lastIndex);
      expect(reordered).toEqual(initialExercises);
    });
  });

  describe('Sheet 3.6 - Edição de Metas do Exercício', () => {
    it('atualiza séries, reps e descanso do exercício selecionado', () => {
      const copy = [...initialExercises];
      const updatedExercise = {
        ...copy[0],
        targetSets: 5,
        repMin: 6,
        repMax: 8,
        restS: 120,
      };
      copy[0] = updatedExercise;

      expect(copy[0].targetSets).toBe(5);
      expect(copy[0].repMin).toBe(6);
      expect(copy[0].repMax).toBe(8);
      expect(copy[0].restS).toBe(120);

      // Volume total atualiza de 18 para 19
      const newVolume = copy.reduce((sum, ex) => sum + ex.targetSets, 0);
      expect(newVolume).toBe(19);
    });

    it('garante que repMin não ultrapasse repMax', () => {
      let repMin = 8;
      let repMax = 10;

      // Ao tentar subir repMin além de repMax
      const tryIncrementMin = (newMin: number, currentMax: number) => {
        return Math.min(newMin, currentMax);
      };

      expect(tryIncrementMin(11, repMax)).toBe(10);
      expect(tryIncrementMin(9, repMax)).toBe(9);
    });
  });

  describe('Controle de Rascunho Local e Alterações Pendentes (Dirty State)', () => {
    const serializeExercises = (list: ExerciseItem[]) =>
      JSON.stringify(
        list.map((e) => ({
          id: e.exerciseId,
          s: e.targetSets,
          min: e.repMin,
          max: e.repMax,
          r: e.restS,
        }))
      );

    const initialSnapshot = {
      name: 'Push A',
      groupId: 'grp_ppl',
      isActive: true,
      exercisesJson: serializeExercises(initialExercises),
    };

    const isDirty = (
      name: string,
      groupId: string | null,
      isActive: boolean,
      list: ExerciseItem[]
    ) => {
      return (
        name.trim() !== initialSnapshot.name.trim() ||
        groupId !== initialSnapshot.groupId ||
        isActive !== initialSnapshot.isActive ||
        serializeExercises(list) !== initialSnapshot.exercisesJson
      );
    };

    it('inicia sem alterações pendentes (clean state)', () => {
      expect(isDirty('Push A', 'grp_ppl', true, initialExercises)).toBe(false);
    });

    it('marca como alterado se o nome for modificado', () => {
      expect(isDirty('Push A - Peito Foco', 'grp_ppl', true, initialExercises)).toBe(true);
    });

    it('marca como alterado se a divisão for alterada', () => {
      expect(isDirty('Push A', 'grp_outro', true, initialExercises)).toBe(true);
      expect(isDirty('Push A', null, true, initialExercises)).toBe(true);
    });

    it('marca como alterado se a ordem dos exercícios mudar (Critério de Pronto)', () => {
      const reordered = [...initialExercises].reverse();
      expect(isDirty('Push A', 'grp_ppl', true, reordered)).toBe(true);
    });

    it('marca como alterado se uma meta for modificada', () => {
      const modified = [...initialExercises];
      modified[0] = { ...modified[0], targetSets: 5 };
      expect(isDirty('Push A', 'grp_ppl', true, modified)).toBe(true);
    });

    it('marca como alterado se um exercício for removido ou adicionado', () => {
      const removed = initialExercises.slice(0, 4);
      expect(isDirty('Push A', 'grp_ppl', true, removed)).toBe(true);
    });
  });
});
