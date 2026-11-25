import { describe, it, expect } from 'vitest';
import {
  validateGroupName,
  GROUP_SPLIT_SUGGESTIONS,
} from '../../domain/workouts';

describe('Tela 3.4 - Editar Grupo Bottom Sheet (Regras de Domínio e Validações)', () => {
  describe('Validação de Nome do Grupo (validateGroupName)', () => {
    const existingGroupNames = ['PPL', 'Upper / Lower', 'Fullbody'];

    it('rejeita nome vazio ou contendo apenas espaços', () => {
      expect(validateGroupName('', existingGroupNames)).toEqual({
        isValid: false,
        error: 'O nome do grupo é obrigatório',
      });
      expect(validateGroupName('    ', existingGroupNames)).toEqual({
        isValid: false,
        error: 'O nome do grupo é obrigatório',
      });
    });

    it('rejeita nome com mais de 40 caracteres', () => {
      const longName = 'A'.repeat(41);
      expect(validateGroupName(longName, existingGroupNames)).toEqual({
        isValid: false,
        error: 'O nome deve ter no máximo 40 caracteres',
      });
    });

    it('rejeita nome duplicado ignorando caixa alta/baixa (ex.: "ppl" vs "PPL")', () => {
      expect(validateGroupName('ppl', existingGroupNames)).toEqual({
        isValid: false,
        error: 'Já existe um grupo com este nome',
      });
      expect(validateGroupName('Ppl', existingGroupNames)).toEqual({
        isValid: false,
        error: 'Já existe um grupo com este nome',
      });
    });

    it('rejeita nome duplicado ignorando acentos', () => {
      const listWithAccents = ['Divisão Força', 'Pernas & Abdômen'];
      expect(validateGroupName('divisao forca', listWithAccents)).toEqual({
        isValid: false,
        error: 'Já existe um grupo com este nome',
      });
    });

    it('aceita nome válido não duplicado com até 40 caracteres', () => {
      expect(validateGroupName('Arnold Split', existingGroupNames)).toEqual({
        isValid: true,
      });
      expect(validateGroupName('ABCDE', existingGroupNames)).toEqual({
        isValid: true,
      });
    });

    it('permite manter o mesmo nome durante a edição (quando o grupo atual é desconsiderado)', () => {
      // Ao editar "PPL", a lista de comparação exclui "PPL"
      const otherGroupNames = existingGroupNames.filter((n) => n.toLowerCase() !== 'ppl');
      expect(validateGroupName('PPL', otherGroupNames)).toEqual({
        isValid: true,
      });
    });
  });

  describe('Sugestões de Divisão (GROUP_SPLIT_SUGGESTIONS)', () => {
    it('contém as 5 divisões sugeridas no design: PPL, Upper / Lower, Fullbody, ABCDE, Arnold Split', () => {
      const names = GROUP_SPLIT_SUGGESTIONS.map((s) => s.name);
      expect(names).toContain('PPL');
      expect(names).toContain('Upper / Lower');
      expect(names).toContain('Fullbody');
      expect(names).toContain('ABCDE');
      expect(names).toContain('Arnold Split');
    });

    it('associa frequências recomendadas corretas para cada divisão', () => {
      const ppl = GROUP_SPLIT_SUGGESTIONS.find((s) => s.name === 'PPL');
      expect(ppl?.frequencyDays).toBe(6);

      const upperLower = GROUP_SPLIT_SUGGESTIONS.find((s) => s.name === 'Upper / Lower');
      expect(upperLower?.frequencyDays).toBe(4);

      const fullbody = GROUP_SPLIT_SUGGESTIONS.find((s) => s.name === 'Fullbody');
      expect(fullbody?.frequencyDays).toBe(3);

      const abcde = GROUP_SPLIT_SUGGESTIONS.find((s) => s.name === 'ABCDE');
      expect(abcde?.frequencyDays).toBe(5);

      const arnold = GROUP_SPLIT_SUGGESTIONS.find((s) => s.name === 'Arnold Split');
      expect(arnold?.frequencyDays).toBe(6);
    });

    it('todas as sugestões possuem descrição estratégica não vazia', () => {
      GROUP_SPLIT_SUGGESTIONS.forEach((sug) => {
        expect(sug.description).toBeTruthy();
        expect(sug.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Lógica de Alterações Não Salvas (Dirty State)', () => {
    const checkIsDirty = (
      mode: 'edit' | 'create',
      name: string,
      description: string,
      frequencyDays: number,
      initialData?: { name?: string; description?: string | null; frequencyDays?: number | null }
    ) => {
      const initName = initialData?.name ?? '';
      const initDesc = initialData?.description ?? '';
      const initFreq = initialData?.frequencyDays ?? 6;

      if (mode === 'create') {
        return name.trim().length > 0 || description.trim().length > 0 || frequencyDays !== 6;
      }
      return name !== initName || description !== initDesc || frequencyDays !== initFreq;
    };

    it('em modo de criação, campos vazios não são considerados alterados', () => {
      expect(checkIsDirty('create', '', '', 6)).toBe(false);
    });

    it('em modo de criação, digitar nome ativa dirty state', () => {
      expect(checkIsDirty('create', 'ABC', '', 6)).toBe(true);
    });

    it('em modo de edição, dados idênticos aos iniciais não ativam confirmação de descarte', () => {
      const initial = { name: 'PPL', description: 'Foco hipertrofia', frequencyDays: 6 };
      expect(checkIsDirty('edit', 'PPL', 'Foco hipertrofia', 6, initial)).toBe(false);
    });

    it('em modo de edição, alterar nome ativa dirty state', () => {
      const initial = { name: 'PPL', description: 'Foco hipertrofia', frequencyDays: 6 };
      expect(checkIsDirty('edit', 'PPL 2.0', 'Foco hipertrofia', 6, initial)).toBe(true);
    });

    it('em modo de edição, alterar frequência ativa dirty state', () => {
      const initial = { name: 'PPL', description: 'Foco hipertrofia', frequencyDays: 6 };
      expect(checkIsDirty('edit', 'PPL', 'Foco hipertrofia', 5, initial)).toBe(true);
    });
  });
});
