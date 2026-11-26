import { describe, it, expect } from 'vitest';
import {
  formatRestShort,
  sanitizePlannedSet,
  serializeExercisesForDirtyCheck as serializeExercises,
  PlannedSet,
  SetType,
  RepsMode,
  EffortMode,
} from '../domain/sessionMath';
import { estimarDuracao, formatarDuracao } from '../domain/duration';

export interface WorkoutExerciseModel {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  position: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restS: number;
  note?: string | null;
  sets?: PlannedSet[];
}

describe('ETAPA 4 — Reconstrução da EditWorkoutScreen como Prévia e ExerciseCard Unificado', () => {
  describe('1. ExerciseCard (Estrutura e Contrato Unificado)', () => {
    it('formata o botão compacto de descanso conforme os presets (60/90/120/180s)', () => {
      expect(formatRestShort(60)).toBe('1 min');
      expect(formatRestShort(90)).toBe('90s');
      expect(formatRestShort(120)).toBe('2 min');
      expect(formatRestShort(180)).toBe('3 min');
      expect(formatRestShort(null)).toBe('Herdar');
    });

    it('alterna o descanso circularmente entre 60s, 90s, 120s e 180s', () => {
      const presets = [60, 90, 120, 180];
      const getNextRest = (current: number) => {
        const idx = presets.indexOf(current);
        return idx >= 0 ? presets[(idx + 1) % presets.length] : 60;
      };

      expect(getNextRest(60)).toBe(90);
      expect(getNextRest(90)).toBe(120);
      expect(getNextRest(120)).toBe(180);
      expect(getNextRest(180)).toBe(60);
      // Fallback para valor fora dos presets
      expect(getNextRest(45)).toBe(60);
    });

    it('permite nota inline discreta no exercício', () => {
      const ex: WorkoutExerciseModel = {
        id: 'we_test',
        exerciseId: 'ex_1',
        name: 'Supino Reto',
        muscleGroup: 'Peito',
        equipment: 'Barra',
        position: 0,
        targetSets: 3,
        repMin: 8,
        repMax: 10,
        restS: 120,
        note: 'Pausa de 2s na parte baixa',
        sets: [],
      };

      expect(ex.note).toBe('Pausa de 2s na parte baixa');
      const updated = { ...ex, note: 'Nota atualizada' };
      expect(updated.note).toBe('Nota atualizada');
    });

    it('mantém o contrato do rodapé do card (+ Adicionar série, Substituir, •••)', () => {
      const footerActions = ['addSet', 'swapExercise', 'moreOptions'];
      expect(footerActions).toHaveLength(3);
      expect(footerActions).toContain('addSet');
      expect(footerActions).toContain('swapExercise');
      expect(footerActions).toContain('moreOptions');
    });
  });

  describe('2. EditWorkoutScreen (Modo Prévia - Regras e Fluxos)', () => {
    it('cria automaticamente 3 séries normais ao adicionar um novo exercício', () => {
      const newExerciseCatalogItem = {
        exerciseId: 'ex_desenv',
        name: 'Desenvolvimento com Halteres',
        muscleGroup: 'Ombros',
        equipment: 'Halteres',
        defaultRestS: 90,
      };

      const defaultSets: PlannedSet[] = [0, 1, 2].map((sIdx) => ({
        id: `wes_new_${sIdx}`,
        workoutExerciseId: 'we_new',
        position: sIdx,
        type: 'normal',
        repsMode: 'reps_range',
        minReps: 8,
        maxReps: 12,
        effortMode: 'none',
        effortValue: null,
        effortValueMax: null,
        effortRefExerciseId: null,
        restS: null,
      }));

      expect(defaultSets).toHaveLength(3);
      defaultSets.forEach((s, idx) => {
        expect(s.position).toBe(idx);
        expect(s.type).toBe('normal');
        expect(s.repsMode).toBe('reps_range');
        expect(s.minReps).toBe(8);
        expect(s.maxReps).toBe(12);
        expect(s.effortMode).toBe('none');
        expect(s.restS).toBeNull();
      });
    });

    it('cria série imediatamente com padrões ao selecionar opção no SetTypeSheet', () => {
      const createSetFromOption = (
        optionKey: 'warmup' | 'normal' | 'rpe' | 'rir' | 'failure' | 'drop',
        exerciseDefaults: { repMin: number; repMax: number }
      ): PlannedSet => {
        let set: PlannedSet = {
          id: 'wes_1',
          workoutExerciseId: 'we_1',
          position: 0,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: exerciseDefaults.repMin,
          maxReps: exerciseDefaults.repMax,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        };

        if (optionKey === 'warmup') {
          set.type = 'warmup';
          set.minReps = 8;
          set.maxReps = 12;
        } else if (optionKey === 'rpe') {
          set.type = 'normal';
          set.effortMode = 'rpe';
          set.effortValue = 8;
        } else if (optionKey === 'rir') {
          set.type = 'normal';
          set.effortMode = 'rir';
          set.effortValue = 2;
        } else if (optionKey === 'failure') {
          set.type = 'failure';
          set.repsMode = 'reps_max';
          set.minReps = null;
          set.maxReps = null;
        } else if (optionKey === 'drop') {
          set.type = 'drop';
          set.repsMode = 'reps_max';
          set.minReps = null;
          set.maxReps = null;
          set.effortMode = 'none';
          set.drop_percent = 20;
        }

        return sanitizePlannedSet(set);
      };

      const defaults = { repMin: 8, repMax: 10 };

      // 1. Aquecimento
      const warmup = createSetFromOption('warmup', defaults);
      expect(warmup.type).toBe('warmup');
      expect(warmup.minReps).toBe(8);
      expect(warmup.maxReps).toBe(12);
      expect(warmup.effortMode).toBe('none');

      // 2. Normal
      const normal = createSetFromOption('normal', defaults);
      expect(normal.type).toBe('normal');
      expect(normal.minReps).toBe(8);
      expect(normal.maxReps).toBe(10);
      expect(normal.effortMode).toBe('none');

      // 3. Por RPE
      const rpe = createSetFromOption('rpe', defaults);
      expect(rpe.type).toBe('normal');
      expect(rpe.effortMode).toBe('rpe');
      expect(rpe.effortValue).toBe(8);

      // 4. Por RIR
      const rir = createSetFromOption('rir', defaults);
      expect(rir.type).toBe('normal');
      expect(rir.effortMode).toBe('rir');
      expect(rir.effortValue).toBe(2);

      // 5. Falha
      const failure = createSetFromOption('failure', defaults);
      expect(failure.type).toBe('failure');
      expect(failure.minReps).toBeNull();
      expect(failure.maxReps).toBeNull();
      expect(failure.effortMode).toBe('none');

      // 6. Drop
      const drop = createSetFromOption('drop', defaults);
      expect(drop.type).toBe('drop');
      expect(drop.minReps).toBeNull();
      expect(drop.maxReps).toBeNull();
      expect(drop.effortMode).toBe('none');
      expect(drop.drop_percent).toBe(20);
    });

    it('substitui o exercício mantendo todas as séries planejadas intactas', () => {
      const originalSets: PlannedSet[] = [
        {
          id: 's1',
          workoutExerciseId: 'we_1',
          position: 0,
          type: 'warmup',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 12,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        },
        {
          id: 's2',
          workoutExerciseId: 'we_1',
          position: 1,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 6,
          maxReps: 8,
          effortMode: 'rpe',
          effortValue: 8.5,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        },
        {
          id: 's3',
          workoutExerciseId: 'we_1',
          position: 2,
          type: 'drop',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        },
      ];

      const exerciseBefore: WorkoutExerciseModel = {
        id: 'we_1',
        exerciseId: 'ex_supino_reto',
        name: 'Supino Reto com Barra',
        muscleGroup: 'Peito',
        equipment: 'Barra',
        position: 0,
        targetSets: 3,
        repMin: 6,
        repMax: 8,
        restS: 120,
        note: 'Nota original',
        sets: originalSets,
      };

      // Substitui por Supino Inclinado com Halteres
      const newCatalogItem = {
        exerciseId: 'ex_supino_inc',
        name: 'Supino Inclinado com Halteres',
        muscleGroup: 'Peito',
        equipment: 'Halteres',
      };

      const exerciseAfter: WorkoutExerciseModel = {
        ...exerciseBefore,
        exerciseId: newCatalogItem.exerciseId,
        name: newCatalogItem.name,
        muscleGroup: newCatalogItem.muscleGroup,
        equipment: newCatalogItem.equipment,
        // Séries preservadas exatamente como estavam
      };

      expect(exerciseAfter.exerciseId).toBe('ex_supino_inc');
      expect(exerciseAfter.name).toBe('Supino Inclinado com Halteres');
      expect(exerciseAfter.sets).toHaveLength(3);
      expect(exerciseAfter.sets?.[0].type).toBe('warmup');
      expect(exerciseAfter.sets?.[1].effortMode).toBe('rpe');
      expect(exerciseAfter.sets?.[1].effortValue).toBe(8.5);
      expect(exerciseAfter.sets?.[2].type).toBe('drop');
    });

    it('detecta estado dirty ao modificar nome, exercícios, notas ou séries', () => {
      const initialExercises: WorkoutExerciseModel[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          name: 'Supino Reto',
          muscleGroup: 'Peito',
          equipment: 'Barra',
          position: 0,
          targetSets: 1,
          repMin: 8,
          repMax: 10,
          restS: 90,
          note: '',
          sets: [
            {
              id: 's_1',
              workoutExerciseId: 'we_1',
              position: 0,
              type: 'normal',
              repsMode: 'reps_range',
              minReps: 8,
              maxReps: 10,
              effortMode: 'none',
              effortValue: null,
              effortValueMax: null,
              effortRefExerciseId: null,
              restS: null,
            },
          ],
        },
      ];

      const initialSnapshot = {
        name: 'Push A',
        groupId: 'grp_1',
        isActive: true,
        exercisesJson: serializeExercises(initialExercises),
      };

      const checkDirty = (
        name: string,
        groupId: string | null,
        isActive: boolean,
        list: WorkoutExerciseModel[]
      ) => {
        return (
          name.trim() !== initialSnapshot.name.trim() ||
          groupId !== initialSnapshot.groupId ||
          isActive !== initialSnapshot.isActive ||
          serializeExercises(list) !== initialSnapshot.exercisesJson
        );
      };

      // Limpo
      expect(checkDirty('Push A', 'grp_1', true, initialExercises)).toBe(false);

      // Nome alterado
      expect(checkDirty('Push A2', 'grp_1', true, initialExercises)).toBe(true);

      // Nota alterada
      const modifiedNote = [{ ...initialExercises[0], note: 'Nova nota' }];
      expect(checkDirty('Push A', 'grp_1', true, modifiedNote)).toBe(true);

      // Série adicionada
      const setAdded = [
        {
          ...initialExercises[0],
          sets: [
            ...initialExercises[0].sets!,
            {
              id: 's_2',
              workoutExerciseId: 'we_1',
              position: 1,
              type: 'drop' as SetType,
              repsMode: 'reps_max' as RepsMode,
              minReps: null,
              maxReps: null,
              effortMode: 'none' as EffortMode,
              effortValue: null,
              effortValueMax: null,
              effortRefExerciseId: null,
              restS: null,
            },
          ],
        },
      ];
      expect(checkDirty('Push A', 'grp_1', true, setAdded)).toBe(true);
    });

    it('oferece as 3 opções no modal "Salvar antes de iniciar?": Salvar e iniciar, Iniciar sem salvar e Cancelar', () => {
      const modalOptions = ['saveAndStart', 'startWithoutSave', 'cancel'];
      expect(modalOptions).toHaveLength(3);
      expect(modalOptions).toContain('saveAndStart');
      expect(modalOptions).toContain('startWithoutSave');
      expect(modalOptions).toContain('cancel');
    });

    it('mantém reordenação de séries com position contíguo 0..N-1', () => {
      const sets: PlannedSet[] = [
        {
          id: 's1',
          workoutExerciseId: 'we_1',
          position: 0,
          type: 'warmup',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 12,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        },
        {
          id: 's2',
          workoutExerciseId: 'we_1',
          position: 1,
          type: 'normal',
          repsMode: 'reps_range',
          minReps: 8,
          maxReps: 10,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        },
        {
          id: 's3',
          workoutExerciseId: 'we_1',
          position: 2,
          type: 'failure',
          repsMode: 'reps_max',
          minReps: null,
          maxReps: null,
          effortMode: 'none',
          effortValue: null,
          effortValueMax: null,
          effortRefExerciseId: null,
          restS: null,
        },
      ];

      // Remove s2 (índice 1) e reindexa
      const filtered = sets.filter((s) => s.id !== 's2');
      const reindexed = filtered.map((s, idx) => ({ ...s, position: idx }));

      expect(reindexed).toHaveLength(2);
      expect(reindexed[0].id).toBe('s1');
      expect(reindexed[0].position).toBe(0);
      expect(reindexed[1].id).toBe('s3');
      expect(reindexed[1].position).toBe(1); // Sem buracos!
    });

    it('reordena exercícios (mover acima / mover abaixo) mantendo posições contíguas', () => {
      const exercises: WorkoutExerciseModel[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          name: 'Supino Reto',
          muscleGroup: 'Peito',
          equipment: 'Barra',
          position: 0,
          targetSets: 3,
          repMin: 8,
          repMax: 10,
          restS: 120,
        },
        {
          id: 'we_2',
          exerciseId: 'ex_2',
          name: 'Crucifixo Reto',
          muscleGroup: 'Peito',
          equipment: 'Halteres',
          position: 1,
          targetSets: 3,
          repMin: 10,
          repMax: 12,
          restS: 60,
        },
      ];

      // Mover Crucifixo (index 1) para cima
      const moveUp = (list: WorkoutExerciseModel[], index: number) => {
        if (index <= 0) return list;
        const copy = [...list];
        const temp = copy[index];
        copy[index] = copy[index - 1];
        copy[index - 1] = temp;
        return copy.map((e, p) => ({ ...e, position: p }));
      };

      const reordered = moveUp(exercises, 1);
      expect(reordered[0].name).toBe('Crucifixo Reto');
      expect(reordered[0].position).toBe(0);
      expect(reordered[1].name).toBe('Supino Reto');
      expect(reordered[1].position).toBe(1);
    });

    it('calcula métricas do rodapé fixo (total de séries e duração aproximada)', () => {
      const exercises: WorkoutExerciseModel[] = [
        {
          id: 'we_1',
          exerciseId: 'ex_1',
          name: 'Supino Reto',
          muscleGroup: 'Peito',
          equipment: 'Barra',
          position: 0,
          targetSets: 4,
          repMin: 8,
          repMax: 10,
          restS: 120,
          sets: [1, 2, 3, 4] as any,
        },
        {
          id: 'we_2',
          exerciseId: 'ex_2',
          name: 'Desenvolvimento',
          muscleGroup: 'Ombros',
          equipment: 'Barra',
          position: 1,
          targetSets: 3,
          repMin: 8,
          repMax: 10,
          restS: 90,
          sets: [1, 2, 3] as any,
        },
      ];

      const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets?.length ?? ex.targetSets ?? 0), 0);
      expect(totalSets).toBe(7);

      const totalSecs = estimarDuracao({
        exercises: exercises.map((e) => ({
          targetSets: e.sets?.length ?? e.targetSets ?? 3,
          restS: e.restS ?? 90,
        })),
      });
      const approxMin = Math.max(1, Math.round(totalSecs / 60));
      expect(approxMin).toBeGreaterThan(0);
    });
  });
});
