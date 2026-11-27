---
target: src/screens/SessionDetailScreen.tsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\SessionDetailScreen.tsx"
target_fingerprint: "sha256:53b2ff173d9201cab4572dbc4dcc005ab631c14df4884d59e1c251c01da41cdf"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\SessionDetailScreen.tsx"
timestamp: 2026-11-27T15-54-28Z
slug: src-screens-sessiondetailscreen-tsx
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Badge de status claro ("Sessão concluída"), mas falta clareza sobre séries reais registradas vs metas teóricas. |
| 2 | Match System / Real World | 2 | A tela intitula-se "Detalhes da sessão" mas oculta as séries, repetições e cargas reais efetuadas, exibindo apenas metas estáticas. |
| 3 | User Control and Freedom | 3 | Navegação de volta funcional, porém botão possui touch target irregular de 40×40dp sem hitSlop; sem filtros ou colapso de blocos. |
| 4 | Consistency and Standards | 2 | Quebra o padrão visual do `WorkoutSummaryScreen` (grade 2×2 vs linha espremida 3×1) e tokens de cor (verde Tailwind `#34D399` vs token `#7BC98F`). |
| 5 | Error Prevention | 3 | Somente-leitura com baixa margem para falha do usuário, mas sem tratamento de estado de erro na interface em caso de falha de query. |
| 6 | Recognition Rather Than Recall | 2 | O usuário é forçado a lembrar das cargas que levantou em cada série, pois a tela não apresenta as séries executadas. |
| 7 | Flexibility and Efficiency | 2 | Densidade acima da dobra degradada em telas 360px (cartões de métrica com ~78px úteis); layout estático sem ações contextuais. |
| 8 | Aesthetic and Minimalist Design | 2 | Cardception evidente com cartões aninhados para cada métrica e exercício; card solitário de RPE quebra o equilíbrio da grade. |
| 9 | Error Recovery | 2 | Em caso de falha no banco de dados local, a tela falha silenciosamente (console.warn) deixando a UI em branco sem botão de recarga. |
| 10 | Help and Documentation | 3 | Linguagem em sentence case clara, porém com vocabulário inconsistente (uso do termo "blocos" para exercícios). |
| **Total** | | **24/40** | **Needs Work (Necessita refinamento)** |

---

### Design Specificity Verdict

**LLM assessment**: A tela atual de detalhes da sessão parece ter sido concebida como um rascunho rápido prévio e não acompanhou o refinamento artesanal alcançado no `WorkoutSummaryScreen` e na `SetTable`. O Volt Precision Warm é fundado no "Santuário Noturno do Ferro" — superfícies acolhedoras em grafite quente, protagonismo absoluto dos números de treino em Outfit tabular e alvos de toque generosos para mãos cansadas de treino. No entanto, `SessionDetailScreen.tsx` entrega uma experiência incompleta: não renderiza as séries que o usuário realizou, quebra a paleta de cores com um verde Tailwind não mapeado (`#34D399`), desrespeita a regra de 48dp de toque no botão voltar (40×40dp), usa uma linha de 3 colunas propensa a truncamento em 360px e carece da tipografia tabular Outfit nos números de carga e volume.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

---

### Overall Impression

A tela cumpre a função básica de exibir os metadados de topo (nome, data, duração e totais matemáticos de volume), mas falha dramaticamente na sua promessa essencial: ser a visão detalhada de um treino realizado. Ao omitir as séries reais dos exercícios e confinar tudo em cartões genéricos com números sem Outfit tabular e alvos de toque subdimensionados, a tela parece um wireframe esquecido em vez de uma ferramenta de precisão.

---

### What's Working

1. **Sentence case rigoroso e estrutura de topo limpa**: Os textos respeitam consistentemente a regra de sentence case sem textos em caixa alta forçada, com hierarquia semântica compreensível entre título, data e duração.
2. **Cálculo de domínio robusto no backend**: O carregamento de dados reaproveita as regras oficiais de cálculo (`calcularVolume`, `isSetInVolume`, exclusão de aquecimento e tratamento de halteres), garantindo números de volume consistentes com o resumo do treino.
3. **Guarda condicional no RPE**: A tela evita renderizar um card de esforço vazio quando não há dados históricos de RPE (`averageRpe !== null`), prevenindo ruído desnecessário para treinos sem esse registro.

---

### Priority Issues

#### [P1] Omissão das séries realizadas e inconsistência com `WorkoutSummaryScreen` e `SetTable`
- **Por quê importa**: O usuário chega a esta tela a partir do botão "Ver registros da sessão" (ou do histórico de treinos) esperando ver exatamente o que realizou (cargas por série, repetições, se foi aquecimento, falha ou drop set, e PRs). Atualmente, a tela exibe apenas as metas teóricas estáticas de planejamento (`target_sets`, `rep_min-rep_max`), tornando a tela inútil como registro histórico de sobrecarga progressiva.
- **Correção**: Carregar as séries reais de cada exercício da sessão do banco de dados e exibi-las em uma tabela limpa e compacta inspirada no modo de leitura da `SetTable`, com badges de série (`1`, `2`, `A`, `D`), números em Outfit tabular, cargas levantadas e marcação de PR em Trophy Amber (`#FFC46B`).
- **Comando sugerido**: `/impeccable polish src/screens/SessionDetailScreen.tsx`

#### [P1] Touch target subdimensionado no botão voltar (40×40dp)
- **Por quê importa**: O botão de voltar possui `width: 40, height: 40` sem `hitSlop`. Isso viola frontalmente o requisito inviolável do `DESIGN.md` (mínimo de 48×48dp) e as normas de acessibilidade Android Material 3, dificultando o toque de retorno em contexto de academia com dedos suados ou trêmulos pós-treino.
- **Correção**: Ajustar o botão para dimensões mínimas de 48×48dp com `hitSlop={8}`, alinhado ao padrão do botão de fechar do `WorkoutSummaryScreen`, e atualizar o espaçador simétrico direito para a mesma largura.
- **Comando sugerido**: `/impeccable audit src/screens/SessionDetailScreen.tsx`

#### [P1] Falta de Outfit tabular e regressões tipográficas no Android
- **Por quê importa**: A regra "The Tabular Numbers Rule" do `DESIGN.md` exige que todos os números sejam renderizados em Outfit com `fontVariant: ['tabular-nums']`. Atualmente, `metricLargeNumber` e `effortValue` aplicam apenas `fontSize` e `fontWeight: '700'`, sem declarar `fontFamilies.outfitBold`. No React Native Android, aplicar `fontWeight: '700'` em componentes customizados sem o nome da fonte correspondente provoca fallback para a fonte padrão do sistema (Roboto).
- **Correção**: Empregar os tokens oficiais (`fontFamilies.outfitBold`, `fontFamilies.outfitSemiBold`) e a prop `tabular` nos componentes `<Text>` para todos os valores numéricos (cargas, repetições, totais e índices).
- **Comando sugerido**: `/impeccable typeset src/screens/SessionDetailScreen.tsx`

#### [P2] Cramping severo das métricas em 360px e layout quebrado com card de RPE
- **Por quê importa**: Em larguras compactas Android (360px), a linha de 3 cards (`metricsRow`) deixa míseros ~78px líquidos por card. Números de carga de 5 dígitos (ex.: "12.450 kg") inevitavelmente sofrem quebra de linha ou corte de texto. Além disso, quando há RPE, o card solitário de largura total quebra o ritmo visual da grade e empurra o conteúdo útil para baixo da dobra (mais de 390dp gastos antes do primeiro exercício).
- **Correção**: Migrar as métricas para a grade canônica 2×2 do `WorkoutSummaryScreen` (ou um layout responsivo de 2 colunas com `minWidth: 140`), integrando o RPE harmoniosamente quando existente (ou usando um chip elegante de esforço médio junto ao subtítulo da sessão), liberando espaço acima da dobra em telas compactas.
- **Comando sugerido**: `/impeccable layout src/screens/SessionDetailScreen.tsx`

#### [P2] Invasão de cor genérica fora da paleta (Tailwind `#34D399`) e ausência de insets dinâmicos
- **Por quê importa**: O badge "Sessão concluída" utiliza o verde Tailwind `#34D399` e fundo translúcido associado, violando a regra de ouro do `DESIGN.md` que estabelece Soft Mint Green (`#7BC98F` / `colors.success`). Além disso, o scroll possui `paddingBottom: 40` estático em vez de calcular dinamicamente a área segura inferior (`useSafeAreaInsets()`), provocando sobreposição da barra de navegação gestual do Android sobre o último exercício.
- **Correção**: Substituir as cores fixas por `colors.success` e integrar `useSafeAreaInsets` no padding inferior (`Math.max(36, insets.bottom + 24)`).
- **Comando sugerido**: `/impeccable colorize src/screens/SessionDetailScreen.tsx`

---

### Persona Red Flags

**Rafael (Praticante Focado / Power User)**:
- Clica em "Ver registros da sessão" após finalizar o treino para checar exatamente quantas repetições fez na última série pesada de supino e se bateu recorde. A tela mostra apenas "Supino reto - 4 séries · 8-12 reps" (as metas teóricas que ele já sabia antes de treinar), sem exibir as cargas e repetições reais executadas. Sensação imediata de frustração e sensação de bug.

**Tiago (Usuário com Smartphone Compacto de 360px - Android de entrada)**:
- Ao abrir a tela em seu aparelho de 360px de largura, o valor da carga total ("14.800 kg") quebra em duas linhas desordenando o alinhamento dos cartões vizinhos. Para tentar voltar ao início, tenta tocar no ícone da seta no canto superior esquerdo com o polegar: o alvo de 40×40dp falha no primeiro toque por ser estreito e não responder no canto da tela.

---

### Minor Observations

1. **Vocabulário "blocos"**: A métrica de exercícios usa a legenda "blocos" abaixo do número, enquanto em todo o resto do aplicativo o termo padrão é "exercícios" ou "concluídos".
2. **Ícone `Activity` em coral**: O card de esforço médio utiliza o ícone `Activity` com `colors.primary` (coral vivo). No Volt Precision Warm, o coral é exclusivo para chamadas primárias de ação; para métricas secundárias, tons neutros elevados ou acentos de status são mais adequados.
3. **Tratamento de erro silencioso**: Em caso de falha de consulta no banco de dados SQLite local, a tela apenas emite um `console.warn` e permanece vazia. Deveria incluir uma mensagem amigável com botão de tentar novamente, exatamente como implementado no `WorkoutSummaryScreen`.

---

### Questions to Consider

- "Por que 'Detalhes da sessão' esconde as séries reais do exercício, se o propósito primordial de quem abre o detalhe é conferir o que foi levantado?"
- "Como unificar a grade de métricas com a de `WorkoutSummaryScreen` para que o usuário sinta coerência estrutural imediata entre as duas telas?"
- "Seria o RPE uma métrica que pertence ao resumo superior em grade 2×2 ou um badge integrado à identificação da sessão quando presente?"
