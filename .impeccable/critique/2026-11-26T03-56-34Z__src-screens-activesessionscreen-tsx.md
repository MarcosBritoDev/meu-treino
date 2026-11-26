---
target: src/screens/ActiveSessionScreen.tsx
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ActiveSessionScreen.tsx"
target_fingerprint: "sha256:bfd947c2f22b5d001337ea6da0e57b2ed10081fc6c766d0ad9ef1c7005962a06"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ActiveSessionScreen.tsx"
timestamp: 2026-11-26T03-56-34Z
slug: src-screens-activesessionscreen-tsx
closed: true
---
# Critique: ActiveSessionScreen.tsx

Method: design review only (detector not applicable, native platform)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Timer e séries ativas nítidos; falta feedback imediato ao ciclar descanso no header |
| 2 | Match System / Real World | 3 | Notas sob o título do treino salvam no exercício em vez de na sessão |
| 3 | User Control and Freedom | 3 | Descarte e término protegidos; falta desfazer rápido se apagar série |
| 4 | Consistency and Standards | 4 | Coesão total com padrão Stitch e paleta escura (#000000, #242426, #F5A623) |
| 5 | Error Prevention | 3 | Guardrails de término e descarte sólidos; modal numérico aceita digitação livre |
| 6 | Recognition Rather Than Recall | 4 | Colunas Anterior e Alvo lado a lado eliminam cálculo mental sob fadiga |
| 7 | Flexibility and Efficiency | 3 | Modal central de peso/reps exige 4 toques; steppers diretos seriam mais ágeis |
| 8 | Aesthetic and Minimalist Design | 4 | Dark mode OLED limpo, sem faixas verdes ou poluição visual |
| 9 | Error Recovery | 3 | Toasts e confirmações claras; validação de inputs sem destaque visual de erro |
| 10 | Help and Documentation | 3 | Badges contextuais e empty states claros; hints de acessibilidade presentes |
| **Total** | | **33/40** | **Good (82.5%)** |

## Design Specificity Verdict

A tela possui excelente especificidade para o domínio de musculação e rastreamento de alta performance. A paleta dark com detalhes em dourado âmbar (#F5A623), combinada com as colunas Anterior e Alvo e os badges de aquecimento (W) e falha (F), transmite autoridade e precisão de equipamento de ginásio. O layout resolveu os problemas graves de quebra de tabela da versão anterior.

## Overall Impression

A reformulação para o estilo Stitch elevou drasticamente a usabilidade e a estética da sessão ativa. A leitura é rápida, o contraste é adequado para telas sob iluminação de academia e o fluxo de marcação de séries é gratificante. A principal oportunidade de refinamento está na ergonomia de edição de peso/reps (substituir o modal central por steppers rápidos ou teclado numérico inferior).

## What's Working
1. **Contraste e Clareza Térmica**: O fundo preto puro com caixas #242426 e acento dourado âmbar (#F5A623) proporciona legibilidade instantânea mesmo com brilho reduzido ou fadiga ocular.
2. **Arquitetura da Tabela em 6 Colunas**: A convivência de Anterior e Alvo em linhas duplas sem quebrar o alinhamento das caixas de input entrega inteligência de treino sem sobrecarregar a memória de trabalho.
3. **Micro-badge de RPE e Checkmark Gold**: A eliminação da barra expansiva de RPE manteve a integridade estrutural da tabela.

## Priority Issues
- **[P1] Centro de Edição Numérica (Modal Bloqueante)**: Toque em peso ou reps abre modal centralizado com botões Cancelar/Salvar, exigindo 3 a 4 toques para mudar um único valor durante o descanso.
  - *Fix*: Implementar bottom sheet numérico ou botões incrementais rápidos (+/- 1kg, +/- 1 rep).
  - *Comando*: /impeccable polish
- **[P2] Ambiguidade no Campo de Notas Superior**: O sub-cabeçalho 'Adicionar notas aqui...' sob o título da sessão vincula-se ao primeiro exercício em vez da sessão inteira.
  - *Fix*: Vincular notas do topo diretamente a sessions.notes e isolar notas do exercício no menu de ação do exercício.
  - *Comando*: /impeccable clarify
- **[P3] Touch Target do Botão de Descanso do Exercício**: O botão 32x32px com ícone de relógio no cabeçalho fica muito próximo da área de toque do título.
  - *Fix*: Expandir área de toque para 44x44px com hitSlop ampliado e feedback imediato por toast.
  - *Comando*: /impeccable adapt

## Persona Red Flags
- **Alex (Power User / Atleta Avançado)**: Fricção alta na edição de carga/reps via modal com teclado do sistema; em treinos pesados, necessita de steppers de 1 toque.
- **Jordan (Iniciante)**: Pode se confundir ao escrever anotações no topo da sessão e encontrá-las atreladas a um exercício isolado.
- **Sam (Baixa Destreza sob Fadiga)**: O botão de relógio 32x32px corre risco de toque acidental no accordion do exercício vizinho.

## Minor Observations
- O botão flutuante de configurações (do Expo Go em desenvolvimento) sobrepõe parte do rodapé no emulador, mas não existirá no build final de produção.
- O timer de descanso fixo inferior (RestFooter) possui contraste exemplar e botões de +/- 15s muito práticos.
