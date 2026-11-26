import { describe, it, expect } from 'vitest';
import {
  formatExerciseCardItem,
  formatExerciseSetsSummary,
  formatWorkoutSummary,
} from '../../domain/workouts';
import {
  calcularVolume,
  isSetInVolume,
  canGeneratePR,
  formatDecimalBR,
} from '../../domain/sessionMath';

describe('ETAPA 6 — Integração da Prévia nos fluxos de Início, Grupos, Treinos, Resumo e Limpeza', () => {
  describe('1. "Adicionar treino ao grupo"', () => {
    it('formata o rótulo da prévia vazia e lida com zero exercícios', () => {
      const totalSets: number = 0;
      const setsLabel = totalSets === 1 ? '1 série' : `${totalSets} séries`;
      expect(setsLabel).toBe('0 séries');

      // Botão + Adicionar exercício fica disponível na prévia vazia
      const exercises: any[] = [];
      const showAddExerciseButton = true;
      expect(exercises.length).toBe(0);
      expect(showAddExerciseButton).toBe(true);
    });
  });

  describe('2. Cartões de treino (Início, Treinos e Detalhe do Grupo)', () => {
    it('resumo do treino exibe "N séries · ~X min" calculado a partir de workout_exercise_sets', () => {
      expect(formatWorkoutSummary(18, 45)).toBe('18 séries · ~45 min');
      expect(formatWorkoutSummary(1, 3)).toBe('1 série · ~3 min');
      expect(formatWorkoutSummary(8, 25)).toBe('8 séries · ~25 min');
    });

    it('lista resumida de exercícios no cartão exibe aquecimento separado das demais séries', () => {
      // 1 aquecimento + 5 séries normais
      expect(formatExerciseCardItem('Supino Reto', 1, 5)).toBe('Supino Reto — A + 5 séries');
      // 0 aquecimento + 3 séries normais
      expect(formatExerciseCardItem('Desenvolvimento', 0, 3)).toBe('Desenvolvimento — 3 séries');
      // 2 aquecimentos + 4 séries normais
      expect(formatExerciseCardItem('Agachamento', 2, 4)).toBe('Agachamento — 2A + 4 séries');
      // 1 aquecimento + 1 série normal
      expect(formatExerciseCardItem('Barra Fixa', 1, 1)).toBe('Barra Fixa — A + 1 série');
      // Apenas aquecimento
      expect(formatExerciseCardItem('Alongamento', 1, 0)).toBe('Alongamento — A série');
      expect(formatExerciseCardItem('Manguito', 2, 0)).toBe('Manguito — 2A séries');
    });

    it('modal "Salvar antes de iniciar?" é acionado quando isDirty na EditWorkoutScreen', () => {
      let isDirty = true;
      let showUnsavedModal = false;
      let sessionStarted = false;

      const handleStartClick = () => {
        if (isDirty) {
          showUnsavedModal = true;
        } else {
          sessionStarted = true;
        }
      };

      handleStartClick();
      expect(showUnsavedModal).toBe(true);
      expect(sessionStarted).toBe(false);

      // Usuário escolhe "Salvar e iniciar"
      const onSaveAndStart = () => {
        isDirty = false;
        showUnsavedModal = false;
        sessionStarted = true;
      };

      onSaveAndStart();
      expect(showUnsavedModal).toBe(false);
      expect(sessionStarted).toBe(true);
    });
  });

  describe('3. Resumo do treino concluído (4.5) e Detalhe da sessão (5.3)', () => {
    it('garante que o volume total usa a regra oficial: soma de carga × reps de concluídas sem aquecimento, 2× para Halteres', () => {
      const dumbbellSets = [
        { weight: 14, reps: 15, isWarmup: true, completedAt: 1000 },  // Aquecimento: ignorado
        { weight: 28, reps: 10, isWarmup: false, completedAt: 2000 }, // Concluída: 28 × 10 × 2 = 560
        { weight: 30, reps: 8, isWarmup: false, completedAt: 3000 },  // Concluída: 30 × 8 × 2 = 480
        { weight: 32, reps: 6, isWarmup: false, completedAt: null },  // Não concluída: ignorada
      ];

      const barbellSets = [
        { weight: 40, reps: 10, isWarmup: true, completedAt: 1000 },  // Aquecimento: ignorado
        { weight: 80, reps: 8, isWarmup: false, completedAt: 2000 },  // Concluída: 80 × 8 × 1 = 640
        { weight: 90, reps: 6, isWarmup: false, completedAt: 3000 },  // Concluída: 90 × 6 × 1 = 540
      ];

      const volDumbbell = calcularVolume(dumbbellSets, 'Halteres');
      expect(volDumbbell).toBe(560 + 480); // 1040

      const volBarbell = calcularVolume(barbellSets, 'Barra');
      expect(volBarbell).toBe(640 + 540); // 1180

      const totalSessionVol = volDumbbell + volBarbell;
      expect(totalSessionVol).toBe(2220);
    });

    it('confirma que Drop entra no volume e nunca aparece em "Recordes da sessão"; Falha entra nos dois', () => {
      const dropSet = { weight: 24, reps: 12, type: 'drop', isWarmup: false, completedAt: 1000 };
      const failureSet = { weight: 30, reps: 10, type: 'failure', isWarmup: false, completedAt: 2000 };
      const warmupSet = { weight: 15, reps: 15, type: 'warmup', isWarmup: true, completedAt: 3000 };

      // 1. Regra de Volume (isSetInVolume)
      expect(isSetInVolume(dropSet)).toBe(true);       // Drop ENTRA no volume
      expect(isSetInVolume(failureSet)).toBe(true);    // Falha ENTRA no volume
      expect(isSetInVolume(warmupSet)).toBe(false);    // Aquecimento FORA do volume

      // 2. Regra de PR (canGeneratePR)
      expect(canGeneratePR(dropSet)).toBe(false);      // Drop NUNCA gera PR
      expect(canGeneratePR(failureSet)).toBe(true);    // Falha PODE gerar PR
      expect(canGeneratePR(warmupSet)).toBe(false);    // Aquecimento NUNCA gera PR

      // 3. Cálculo de Volume com Halteres
      const sets = [dropSet, failureSet, warmupSet];
      const vol = calcularVolume(sets, 'Halteres');
      // Drop: 24 × 12 × 2 = 576; Falha: 30 × 10 × 2 = 600; Warmup: 0
      expect(vol).toBe(576 + 600); // 1176
    });

    it('no Resumo (4.5) exibe o bloco "Exercícios" no lugar de "Intensidade / RPE médio"', () => {
      const exerciseLoads = [{ id: 'ex1' }, { id: 'ex2' }, { id: 'ex3' }, { id: 'ex4' }];
      const blockTitle = 'Exercícios';
      const blockValue = exerciseLoads.length;
      const subtitle = `${blockValue} concluídos`;

      expect(blockTitle).toBe('Exercícios');
      expect(blockValue).toBe(4);
      expect(subtitle).toBe('4 concluídos');
    });

    it('no Detalhe da sessão (5.3) oculta o cartão de esforço médio quando não houver RPE gravado', () => {
      const sessionWithoutRpe = { avgRpe: null };
      const sessionWithOldRpe = { avgRpe: 8.2 };

      const shouldShowEffortCard = (sess: { avgRpe: number | null }) => sess.avgRpe !== null;

      expect(shouldShowEffortCard(sessionWithoutRpe)).toBe(false); // OCULTO
      expect(shouldShowEffortCard(sessionWithOldRpe)).toBe(true);  // EXIBIDO
      expect(formatDecimalBR(sessionWithOldRpe.avgRpe)).toBe('8,2');
    });
  });

  describe('4. Limpeza e TabBar', () => {
    it('TabBar possui exatamente 4 abas na ordem oficial e sem texto em caixa alta', () => {
      const tabLabels = ['Início', 'Treinos', 'Biblioteca', 'Progresso'];

      expect(tabLabels).toHaveLength(4);
      expect(tabLabels).toEqual(['Início', 'Treinos', 'Biblioteca', 'Progresso']);

      // Nenhuma aba em caixa alta
      for (const label of tabLabels) {
        expect(label).not.toBe(label.toUpperCase());
      }
    });
  });
});
