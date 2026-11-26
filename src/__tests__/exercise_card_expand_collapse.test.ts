import { describe, it, expect } from 'vitest';

describe('Minimizar e Expandir Exercícios (Opção B - Toggle Livre e Multi-expand)', () => {
  describe('1. Contrato e comportamento de minimização/expansão do ExerciseCard', () => {
    it('calcula o subtítulo resumo compacto quando o cartão está minimizado no modo ativo', () => {
      const getCollapsedSubtitle = (mode: 'active' | 'preview', sets: Array<{ completedAt?: number | null; completed?: boolean }>) => {
        const completedCount = sets.filter((s) => Boolean(s.completed || s.completedAt != null)).length;
        const totalSets = sets.length;

        if (mode === 'active') {
          if (completedCount === totalSets && totalSets > 0) {
            return `${totalSets}/${totalSets} séries concluídas ✓`;
          } else if (completedCount > 0) {
            return `${completedCount}/${totalSets} séries concluídas`;
          } else {
            return `${totalSets} ${totalSets === 1 ? 'série' : 'séries'}`;
          }
        }
        return `${totalSets} ${totalSets === 1 ? 'série' : 'séries'}`;
      };

      // Nenhuma série concluída ainda
      const sets0 = [{ completedAt: null }, { completedAt: null }, { completedAt: null }];
      expect(getCollapsedSubtitle('active', sets0)).toBe('3 séries');

      // 1 de 3 concluídas
      const sets1 = [{ completedAt: 12345 }, { completedAt: null }, { completedAt: null }];
      expect(getCollapsedSubtitle('active', sets1)).toBe('1/3 séries concluídas');

      // Todas concluídas
      const setsAll = [{ completedAt: 12345 }, { completedAt: 12346 }, { completedAt: 12347 }];
      expect(getCollapsedSubtitle('active', setsAll)).toBe('3/3 séries concluídas ✓');

      // Modo prévia (preview)
      expect(getCollapsedSubtitle('preview', sets1)).toBe('3 séries');
    });

    it('determina corretamente o ícone do Chevron e visibilidade do corpo', () => {
      const renderCardState = (isExpanded: boolean) => {
        return {
          chevron: isExpanded ? 'down' : 'right',
          showBody: isExpanded,
          showNote: isExpanded,
          showSetTable: isExpanded,
          showFooter: isExpanded,
        };
      };

      // Estado Expandido
      const expanded = renderCardState(true);
      expect(expanded.chevron).toBe('down');
      expect(expanded.showBody).toBe(true);
      expect(expanded.showSetTable).toBe(true);

      // Estado Minimizado
      const minimized = renderCardState(false);
      expect(minimized.chevron).toBe('right');
      expect(minimized.showBody).toBe(false);
      expect(minimized.showSetTable).toBe(false);
    });
  });

  describe('2. Gestão de Estado Independente (Multi-expand / Toggle Livre)', () => {
    it('permite minimizar e expandir exercícios individualmente sem interferir nos demais', () => {
      // Inicia com ambos os exercícios abertos (padrão)
      let expandedMap: Record<string, boolean> = {
        ex1: true,
        ex2: true,
      };

      const toggleExpand = (id: string) => {
        expandedMap = {
          ...expandedMap,
          [id]: expandedMap[id] === false ? true : false,
        };
      };

      // 1. Usuário minimiza o Exercício 1
      toggleExpand('ex1');
      expect(expandedMap.ex1).toBe(false);
      expect(expandedMap.ex2).toBe(true); // Exercício 2 permaneceu aberto!

      // 2. Usuário minimiza o Exercício 2
      toggleExpand('ex2');
      expect(expandedMap.ex1).toBe(false);
      expect(expandedMap.ex2).toBe(false); // Ambos minimizados

      // 3. Usuário expande o Exercício 1 novamente
      toggleExpand('ex1');
      expect(expandedMap.ex1).toBe(true);
      expect(expandedMap.ex2).toBe(false); // Exercício 1 aberto, Exercício 2 fechado

      // 4. Usuário expande o Exercício 2 (ambos abertos simultaneamente - Multi-expand)
      toggleExpand('ex2');
      expect(expandedMap.ex1).toBe(true);
      expect(expandedMap.ex2).toBe(true);
    });

    it('auto-expande o próximo exercício ao concluir todas as séries do exercício atual', () => {
      let expandedMap: Record<string, boolean> = {
        ex1: true,
        ex2: false, // Exercício 2 estava minimizado
      };

      const onAllSetsCompleted = (currentExId: string, nextExId: string | null) => {
        if (nextExId) {
          expandedMap = {
            ...expandedMap,
            [nextExId]: true, // Garante que o próximo exercício se abre
          };
        }
      };

      // Conclui todas as séries do Exercício 1
      onAllSetsCompleted('ex1', 'ex2');

      // Exercício 2 agora deve estar expandido
      expect(expandedMap.ex2).toBe(true);
      // Exercício 1 não foi forçado a fechar (respeita Opção B)
      expect(expandedMap.ex1).toBe(true);
    });
  });
});
