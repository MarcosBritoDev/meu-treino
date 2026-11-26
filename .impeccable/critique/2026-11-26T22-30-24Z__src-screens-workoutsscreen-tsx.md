---
target: src/screens/WorkoutsScreen.tsx
total_score: 35
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\WorkoutsScreen.tsx"
target_fingerprint: "sha256:07fc6a75336db9d80def46b3161b58cb5db8a18f85dbb0f35ab484bdc3f1cfec"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\WorkoutsScreen.tsx"
timestamp: 2026-11-26T22-30-24Z
slug: src-screens-workoutsscreen-tsx
closed: true
---
Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Selo ativo com pulso e indicador "Próximo" integrado ao histórico de sessões |
| 2 | Match System / Real World | 3 | Linguagem de musculação precisa; apenas os contadores do topo ("Grupos de treino", "Treinos montados") soam como dados de sistema |
| 3 | User Control and Freedom | 4 | Controle completo de expansão, edição, duplicação e descarte/continuação de treinos em andamento |
| 4 | Consistency and Standards | 4 | Padrão nativo Android estabelecido: botões pílula consistentes, touch targets >= 48dp com hitSlop e ausência de bordas tracejadas |
| 5 | Error Prevention | 4 | Confirmações para ações destrutivas, proteção de conflito de sessão e espaçamento seguro contra toques acidentais |
| 6 | Recognition Rather Than Recall | 4 | Métricas tabulares claras em Outfit, músculos-alvo visíveis e selo "Próximo" que elimina a necessidade de lembrar o ciclo |
| 7 | Flexibility and Efficiency | 3 | Fichas compactas (~76dp) dobram a densidade útil da tela; único ponto é o card de treino avulso no final da rolagem |
| 8 | Aesthetic and Minimalist Design | 3 | Fim do cardception, remoção da linha decorativa superior e eliminação dos itálicos; resta apenas o bloco de métricas do topo |
| 9 | Error Recovery | 3 | Toasts contextuais e confirmações modais claras preservando o histórico |
| 10 | Help and Documentation | 3 | Estado vazio bem ilustrado com gerador de modelo PPL em 1 toque |
| **Total** | | **35/40** | **Good** |

### Design Specificity Verdict

**LLM assessment**: A tela evoluiu consideravelmente após as intervenções ergonômicas. O "cardception" (super-card englobando sub-cards com bordas sobrepostas e linha de acento superior) foi completamente desmantelado em favor de uma seção limpa com cabeçalho de grupo nativo. Os itens de treino foram reduzidos de ~170dp para ~76dp, removendo a prévia poluída de exercícios em itálico e unificando a interação (toque no corpo abre edição/prévia; botão coral "Iniciar" isolado à direita). O controle de toque agora cumpre estritamente o piso de 48×48dp em 360px e 390px, com resposta visual ativa ao toque (`pressed`).

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression

A interface atingiu um padrão de acabamento e usabilidade de alto nível (*Volt Precision Warm*). A densidade vertical melhorou radicalmente: o usuário agora visualiza múltiplos treinos sem rolagem excessiva e tem clareza imediata sobre qual treino deve executar hoje ("Próximo"). O único resíduo notável de "dashboard web" é o bloco de métricas de vaidade no topo (`metricsRow`), que ainda consome ~90dp de espaço nobre.

### What's Working

- **Eliminação do Cardception**: O grupo ativo agora é uma seção fluida e coesa, sem caixas aninhadas, sem bordas pesadas de 1px e sem o antigo botão tracejado.
- **Leitura instantânea em ~76dp**: Nome do treino, músculos-alvo sem cortes e métricas tabulares consolidadas (`exercícios · séries · duração`).
- **Selo "Próximo"**: Elimina esforço cognitivo ao indicar qual é a próxima ficha recomendada com base no histórico real de sessões.
- **Ergonomia de toque (>= 48dp)**: O botão "Iniciar" e os ícones de ação (`MoreVertical`, `Chevron`, engrenagem e `Novo grupo`) respondem de forma ágil com `hitSlop` e estados pressionados sem risco de toques acidentais.

### Priority Issues

#### [P1] Desperdício vertical residual com bloco de métricas (`metricsRow`)
- **Why it matters**: Consome ~90dp do topo com informações estáticas ("1 grupo", "3 treinos") que não auxiliam em nenhuma decisão prática no salão de musculação, empurrando as fichas reais para baixo.
- **Fix**: Remover os dois cartões de métricas do topo ou condensá-los em um contador inline discreto no subtítulo do cabeçalho (ex.: "Meus treinos • 3 fichas").
- **Suggested command**: `/impeccable layout src/screens/WorkoutsScreen.tsx`

#### [P2] Falta de separador temático para grupos inativos
- **Why it matters**: Quando o usuário possui mais de uma divisão cadastrada, os grupos secundários recolhidos aparecem logo abaixo do grupo ativo sem um divisor de seção ("Outras divisões"), podendo ser confundidos com novos treinos.
- **Fix**: Adicionar um divisor ou título de seção discreto antes da lista de grupos inativos.
- **Suggested command**: `/impeccable layout src/screens/WorkoutsScreen.tsx`

#### [P2] Descoberta do "Treino avulso" em listas longas
- **Why it matters**: O cartão "Treino avulso ou rápido?" fica posicionado no fim do ScrollView. Em grupos com muitas fichas ou múltiplos grupos expandidos, o acesso exige rolagem até o rodapé.
- **Fix**: Integrar um atalho rápido no cabeçalho ou permitir iniciar treino livre a partir do menu de opções.
- **Suggested command**: `/impeccable clarify src/screens/WorkoutsScreen.tsx`

### Persona Red Flags

- **Alex (Impatient Power User / Lifter)**:
  - *Experiência*: Entra no app e identifica imediatamente a ficha recomendada através do selo "Próximo". Toca em "Iniciar" com precisão instantânea.
  - *Atrito restante*: Ainda precisa ignorar os dois blocos de métricas do topo antes de ver todos os treinos da semana de uma só vez.
- **Jordan (First-Timer)**:
  - *Experiência*: A tela agora é acolhedora, sem excesso de caixas ou jargões visuais. A ação principal ("Iniciar" em coral) guia o olhar sem hesitação.
- **Sam (Acessibilidade / Motor)**:
  - *Experiência*: Todos os controles interativos possuem área de toque generosa (52 a 56dp com `hitSlop`) e resposta de feedback tátil e visual ao toque, prevenindo erros motores.

### Minor Observations

- A compactação do botão "+ Novo grupo" e da engrenagem garantiu folga confortável para o título "Meus treinos" mesmo em telas de 360px de largura.
- A paleta *Volt Precision Warm* agora é respeitada de ponta a ponta, com ausência total de itálicos e textos em maiúsculas.

### Questions to Consider

- Deseja remover o bloco de métricas do topo (`metricsRow`) para que as fichas de treino comecem logo na primeira dobra da tela?
- Faria sentido incluir uma divisória visual identificando "Outras divisões" antes dos grupos inativos?
