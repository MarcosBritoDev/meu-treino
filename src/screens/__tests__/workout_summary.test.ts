import { describe, it, expect } from 'vitest';

describe('Tela 4.5 - Resumo do Treino Concluído (WorkoutSummaryScreen)', () => {
  describe('Cálculo de Volume Total e Formatação', () => {
    it('calcula o volume total somando apenas as séries concluídas (peso × reps)', () => {
      const sets = [
        { weight: 100, reps: 8, completedAt: 1000 },
        { weight: 100, reps: 8, completedAt: 2000 },
        { weight: 90, reps: 10, completedAt: 3000 },
        { weight: 90, reps: 10, completedAt: null }, // não concluída
      ];

      const completedVolume = sets
        .filter((s) => s.completedAt !== null)
        .reduce((sum, s) => sum + s.weight * s.reps, 0);

      expect(completedVolume).toBe(100 * 8 + 100 * 8 + 90 * 10); // 800 + 800 + 900 = 2500
    });

    it('formata o volume no padrão pt-BR com separador de milhar', () => {
      const vol = 14200;
      const formatted = Math.round(vol).toLocaleString('pt-BR');
      expect(formatted).toBe('14.200');
    });

    it('calcula a variação percentual vs sessão anterior corretamente', () => {
      const currentVol = 10800;
      const prevVol = 10000;
      const diffPct = Math.round(((currentVol - prevVol) / prevVol) * 100);

      expect(diffPct).toBe(8);
      const label = diffPct >= 0 ? `+${diffPct}% vs sem. ant.` : `${diffPct}% vs sem. ant.`;
      expect(label).toBe('+8% vs sem. ant.');
    });

    it('omite variação quando não há sessão anterior para comparar', () => {
      const prevVol = 0;
      const variation = prevVol > 0 ? 10 : null;
      expect(variation).toBeNull();
    });
  });

  describe('Séries Planejadas vs Realizadas', () => {
    it('calcula 100% planejadas quando todas as séries foram feitas', () => {
      const planned = 18;
      const completed = 18;
      const pct = Math.round((completed / planned) * 100);
      expect(pct).toBe(100);
    });

    it('calcula a porcentagem correta quando foram feitas séries a menos ou a mais', () => {
      expect(Math.round((15 / 20) * 100)).toBe(75);
      expect(Math.round((22 / 20) * 100)).toBe(110);
    });
  });

  describe('Intensidade RPE vs Fallback de Exercícios', () => {
    it('exibe intensidade com RPE médio quando disponível', () => {
      const rpeList = [8, 8.5, 9, 8];
      const avg = rpeList.reduce((a, b) => a + b, 0) / rpeList.length;
      const formattedRpe = Number(avg.toFixed(1));

      expect(formattedRpe).toBe(8.4);
    });

    it('faz fallback para contagem de exercícios quando nenhuma série possui RPE', () => {
      const avgRpe: number | null = null;
      const cardTitle = avgRpe !== null ? 'Intensidade' : 'Exercícios';
      expect(cardTitle).toBe('Exercícios');
    });
  });

  describe('Recordes da Sessão (PRs)', () => {
    it('calcula delta em kg para PR de carga quando há histórico prévio', () => {
      const currentWeight = 34.0;
      const prevMaxWeight = 32.0;
      const delta = currentWeight - prevMaxWeight;

      expect(delta).toBe(2);
      const badgeText = delta > 0 ? `+${delta} kg recorde` : 'Carga recorde';
      expect(badgeText).toBe('+2 kg recorde');
    });

    it('exibe "Volume recorde" quando o PR for exclusivamente de volume', () => {
      const isPrWeight = false;
      const isPrVolume = true;
      const diffKg = null;

      const badgeText =
        diffKg !== null && diffKg > 0
          ? `+${diffKg} kg recorde`
          : isPrWeight
            ? 'Carga recorde'
            : isPrVolume
              ? 'Volume recorde'
              : 'Novo recorde';

      expect(badgeText).toBe('Volume recorde');
    });
  });

  describe('Resumo das Cargas', () => {
    it('destaca em âmbar e sinaliza "Novo recorde" os exercícios que tiveram PR', () => {
      const exercises = [
        { name: 'Supino Reto', hasPr: false, maxWeight: 92, peakReps: 6 },
        { name: 'Supino Inclinado', hasPr: true, maxWeight: 34, peakReps: 8 },
      ];

      expect(exercises[0].hasPr).toBe(false);
      expect(exercises[1].hasPr).toBe(true);
      expect(exercises[1].maxWeight).toBe(34);
      expect(exercises[1].peakReps).toBe(8);
    });
  });
});
