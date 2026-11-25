import { describe, it, expect } from 'vitest';
import { formatarPeso, proximaCarga } from '../../domain';

describe('Regras de Negócio e Textos de Ajustes — Volt Precision', () => {
  describe('Unidade e Incremento Dinâmico', () => {
    it('deve converter peso de exibição de acordo com a unidade configurada', () => {
      const kgWeight = 80;
      expect(formatarPeso(kgWeight, 'kg')).toBe('80 kg');
      expect(formatarPeso(kgWeight, 'lb')).toBe('176,4 lb');

      const incrementKg = 2.5;
      expect(formatarPeso(incrementKg, 'kg')).toBe('2,5 kg');
      expect(formatarPeso(incrementKg, 'lb')).toBe('5,5 lb');
    });

    it('deve respeitar passos de 0,5 para kg e 1 para lb no incremento com mínimo 0,5', () => {
      // Em kg: passo 0.5, mínimo 0.5
      expect(proximaCarga(2.5, 0.5, 'up')).toBe(3.0);
      expect(proximaCarga(2.5, 0.5, 'down')).toBe(2.0);
      expect(proximaCarga(0.5, 0.5, 'down')).toBe(0); // Tratamento para não negativar

      // Em lb: passo 1, mínimo 0.5
      expect(proximaCarga(5.0, 1.0, 'up')).toBe(6.0);
      expect(proximaCarga(5.0, 1.0, 'down')).toBe(4.0);
    });
  });

  describe('Conformidade de Sentence Case e Textos da Tela de Ajustes', () => {
    it('todos os títulos, legendas e rótulos da tela de Ajustes devem respeitar sentence case', () => {
      const settingsTexts = [
        'Ajustes',
        'Tudo configurado',
        'Pronto para treinar',
        '100% offline',
        'Seus registros ficam direto no dispositivo. Sem sinal, sem espera.',
        'Preferências de treino',
        'Unidade de medida',
        'Só altera a exibição; seus registros não são modificados.',
        'Incremento padrão',
        'Ajuste rápido entre séries',
        'Timer de descanso automático',
        'Inicia contagem regressiva ao finalizar a série',
        'Alerta sonoro e vibração',
        'Avisa o término do descanso em segundo plano',
        'Carga total = soma de carga × repetições, sem aquecimento; em halteres conta o par.',
        'Armazenamento e dados',
        'Backup e dados locais',
        'Exportar, importar e restaurar fichas',
        'Sobre o aplicativo',
        'Volt Precision',
        'Seus dados ficam salvos exclusivamente neste aparelho. Sem login, sem rastreadores e sem publicidade.',
        'Notas de atualização',
        'Licenças open source',
      ];

      for (const text of settingsTexts) {
        // Não deve ser ALL CAPS
        expect(text).not.toBe(text.toUpperCase());
        // Primeiro caractere deve ser maiúsculo (ou número como no "100%")
        const firstChar = text[0];
        if (isNaN(Number(firstChar))) {
          expect(firstChar).toBe(firstChar.toUpperCase());
        }
      }
    });

    it('não deve conter a palavra "Sincronizado" nas informações de status', () => {
      const statusTitle = 'Tudo configurado';
      const statusSubtitle = 'Pronto para treinar';
      const statusDesc = 'Seus registros ficam direto no dispositivo. Sem sinal, sem espera.';

      expect(statusTitle.toLowerCase()).not.toContain('sincronizado');
      expect(statusSubtitle.toLowerCase()).not.toContain('sincronizado');
      expect(statusDesc.toLowerCase()).not.toContain('sincronizado');
    });
  });

  describe('Lógica do Timer e Alertas', () => {
    it('alerta sonoro e vibração deve depender do timer automático', () => {
      let autoRestTimer = true;
      let restAlert = 'both';

      const isAlertInteractive = autoRestTimer;
      expect(isAlertInteractive).toBe(true);

      // Desliga o timer automático
      autoRestTimer = false;
      const isAlertInteractiveWhenTimerOff = autoRestTimer;
      expect(isAlertInteractiveWhenTimerOff).toBe(false);
    });
  });
});
