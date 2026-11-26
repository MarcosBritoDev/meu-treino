# Tabela de séries (layout tipo Strong, estilo Volt)

Arquivos (copie para o projeto mantendo as pastas):
- src/domain/sessionMath.ts     lógica pura (unidades, volume, PR, rótulos, descanso)
- src/ui/session/grid.ts        larguras das colunas
- src/ui/session/tokens.ts      cores e fontes (troque pelo seu tema se quiser)
- src/ui/session/SetTable.tsx   cabeçalho + linhas + faixa de RPE + "Adicionar série"
- src/ui/session/RestFooter.tsx rodapé de descanso
- src/__tests__/sessionMath.test.ts  testes que importam o código real

## Como ligar na ActiveSessionScreen

1. Dentro do cartão do exercício expandido, apague o cabeçalho de colunas e o
   `exercise.sets.map(...)` (linhas ~1110 a 1310 do arquivo atual) e use:

```tsx
<SetTable
  sets={exercise.sets.map((x) => ({
    id: x.id,
    weightKg: x.weight,          // vem do banco em kg, NÃO converta antes
    reps: x.reps,
    rpe: x.rpe,
    isWarmup: x.isWarmup,
    completedAt: x.completedAt,
    isPr: x.isPrWeight || x.isPrVolume,
  }))}
  previous={exercise.previousSets.map((p) => p && { weightKg: p.weight, reps: p.reps })}
  unit={unit}
  openRpeId={activeRpeSetId}
  onToggle={(id) => handleToggleSetCheck(exercise, findSet(exercise, id))}
  onEditWeight={(id) => openNumberModal('weight', exercise, id)}
  onEditReps={(id) => openNumberModal('reps', exercise, id)}
  onOpenMenu={(id) => openSetMenu(exercise, id)}
  onToggleRpe={(id) => setActiveRpeSetId((p) => (p === id ? null : id))}
  onChangeRpe={(id, v) => handleUpdateRpe(exercise.id, id, v)}
  onAddSet={() => handleAddSet(exercise)}
/>
```

2. Rodapé de descanso (fora do ScrollView, fim da tela):

```tsx
{restActive && (
  <RestFooter
    remainingS={restRemaining}
    totalS={restTotalSeconds}
    onAdjust={handleAdjustRest}
    onSkip={() => setRestActive(false)}
  />
)}
```
Dê `paddingBottom` de ~96 ao ScrollView enquanto o descanso estiver ativo.

3. Unidades (corrige o bug de lb): no modal de número, ao salvar a carga use
   `displayToKg(valorDigitado, unit)` antes de gravar, e no modal inicial mostre
   `formatWeight(set.weight, unit)`. Nunca grave o valor digitado direto.

4. "Anterior" por série: em loadSession troque o `LIMIT 1` por todas as séries
   (sem aquecimento) da última sessão concluída, ordenadas por "index", e guarde
   em `previousSets`. A linha usa a de mesmo índice (`previousForSet`).

5. Volume: use `calcularVolume(sets, equipment)` (halteres contam o par).

6. PR: `detectarPR(historico, { weight, reps })` (histórico primeiro).
