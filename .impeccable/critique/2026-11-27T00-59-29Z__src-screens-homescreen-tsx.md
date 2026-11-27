---
target: src/screens/HomeScreen.tsx
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\HomeScreen.tsx"
target_fingerprint: "sha256:ad72edebac2a6f4cb72a70c8f8109d1ef42d18f60e98a9b38264b99805e46b0e"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\HomeScreen.tsx"
timestamp: 2026-11-27T00-59-29Z
slug: src-screens-homescreen-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Treino ativo bem sinalizado, mas cronômetro não é tabular e semana não detalha treinos |
| 2 | Match System / Real World | 4 | Vocabulário impecável de musculação e rotinas em português (PT-BR) |
| 3 | User Control and Freedom | 4 | Excelente controle: confirmação em modal antes de descartar e link para alterar |
| 4 | Consistency and Standards | 2 | Cardception em metricsBox, quebra da regra do âmbar (#F6BC64) e botões < 48dp |
| 5 | Error Prevention | 4 | Modal de descarte destrutivo bem protegido com confirmação explícita |
| 6 | Recognition Rather Than Recall | 3 | Dados claros, mas redundância entre badge de resumo e métricas sobrecarrega a tela |
| 7 | Flexibility and Efficiency | 3 | Início em 1 toque ótimo, mas botão empurrado para fora da dobra em telas 360px |
| 8 | Aesthetic and Minimalist Design | 2 | Card herói sobrecarregado (510dp+) com 8 blocos de conteúdo e cardception |
| 9 | Error Recovery | 3 | Alertas e modais claros em linguagem natural |
| 10 | Help and Documentation | 3 | Card de Dica Volt contextual com privacidade offline concisa |
| **Total** | | **31/40** | **Base sólida com falhas de densidade e craft** |

## Design Specificity Verdict

**LLM assessment**: A tela possui forte identidade voltada ao público de musculação sob a estética Volt Precision Warm, mas sofre de acúmulo de elementos ("feature creep") dentro do cartão herói do treino recomendado. O desejo de exibir todas as facetas do treino de uma só vez (badge de resumo, barra de ciclo, 3 métricas tabulares, lista de exercícios com 4 linhas, botão e link de edição) gera um cartão de mais de 510dp de altura, criando "cardception" com o metricsBox e empurrando a ação mais importante (o botão "Iniciar treino") para fora da primeira dobra em dispositivos compactos de 360px. A linguagem visual acerta no grafite quente e no coral, mas tropeça em regras sagradas como a exclusividade do tom âmbar para PRs e a altura mínima de 48dp para alvos de toque.

**Deterministic scan**: not applicable (native platform)

## Overall Impression
Uma tela com excelente atmosfera e propósito claro de academia, mas que perde o foco do "1 toque para treinar" ao soterrar o botão primário embaixo de métricas redundantes e uma caixa aninhada (cardception). Em telas compactas, a dobra corta o botão; na barra semanal, os dias respiram com dificuldade.

## What's Working
- **Atmosfera noturna acolhedora**: O fundo grafite quente (#1A1715) com superfícies tonais e destaque em coral vivo (#FF7A59) cumpre perfeitamente o propósito de conforto visual no salão de musculação.
- **Microcópia exemplar em sentence case**: 100% dos textos seguem rigorosamente a regra do design system, com redação sóbria, sem caixa alta e sem afetação corporativa.
- **Feedback tátil e estados claros**: Uso consistente de hápticos e modais de confirmação seguros para descarte de sessão ativa.

## Priority Issues

- **[P1] Botão "Iniciar" empurrado para fora da primeira dobra em telas 360px**:
  - **What**: O cartão herói atinge ~516dp de altura devido à soma de 8 sub-blocos (badge de resumo, barra de progresso, caixa de métricas, lista de exercícios, etc.). Em telas de 360px (e 390px mais curtas), o botão "Iniciar treino" fica cortado ou completamente abaixo da dobra.
  - **Why it matters**: A principal razão de abrir o app na academia é começar o treino imediatamente; obrigar o atleta a rolar a tela com as mãos suadas adiciona atrito desnecessário.
  - **Fix**: Remover a redundância entre o badge de resumo e a caixa de métricas; compactar a lista de exercícios em uma linha de tags ou prévia de 1 linha; garantir que o botão primário "Iniciar treino" repouse confortavelmente acima da dobra (altura máxima do card ≤ 340dp).
  - **Suggested command**: /impeccable layout

- **[P1] Cardception no Hero Card (metricsBox aninhado com borda e fundo)**:
  - **What**: O container metricsBox dentro do heroCard possui borda própria (orderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)'), raio de 14px e fundo translúcido, configurando um cartão dentro de outro cartão.
  - **Why it matters**: Viola frontalmente a diretriz "Don't praticar cardception" e a "The Flat Tonal Rule" do DESIGN.md, poluindo a superfície do cartão com caixas desnecessárias.
  - **Fix**: Integrar as métricas diretamente no corpo do card herói sem caixa ou borda delimitadora, usando apenas divisores verticais sutis (#3A3531) ou espaçamento tabular puro.
  - **Suggested command**: /impeccable distill

- **[P2] Violação de Touch Targets (< 48dp) em múltiplos controles interativos**:
  - **What**: O botão de ajustes do cabeçalho mede apenas 36×36dp sem hitSlop; os links de texto "Ver ou alterar exercícios", "Descartar este treino", "Ver modelos" e "Detalhes" possuem altura de apenas ~32dp.
  - **Why it matters**: Viola a regra inegociável de acessibilidade de 48×48dp do DESIGN.md e PRODUCT.md, gerando toques errados com mãos trêmulas ou polegar largo durante o treino.
  - **Fix**: Aumentar settingsButton para 48×48dp com minWidth: 48, minHeight: 48; atribuir minHeight: 48 e alinhamento centrado a todos os botões/links de texto.
  - **Suggested command**: /impeccable polish

- **[P2] Quebra da The Trophy Amber Rule e The Flat Tonal Rule**:
  - **What**: Uso do tom âmbar #F6BC64 em ícones que não são troféus nem PRs (Moon de pausa e Zap no card de Pernas); uso de shadowColor, shadowOpacity e elevation: 4 no pauseBadge do empty state.
  - **Why it matters**: A regra sagrada do design system reserva o âmbar estritamente para Personal Records e troféus. O uso de drop-shadow decorativa quebra o conceito flat tonal do Volt.
  - **Fix**: Substituir #F6BC64 por colors.onSurfaceVariant ou tom neutro; remover propriedades de sombra e elevação, adotando borda sutil de 1px (#3A3531).
  - **Suggested command**: /impeccable clarify

- **[P3] Aperto horizontal na barra da semana em 360px de largura**:
  - **What**: Em telas de 360px, os 7 círculos de 38dp com padding lateral de 12dp no container deixam apenas ~5dp de vão entre si, comprimindo visualmente os círculos e os rótulos de dias.
  - **Why it matters**: Transmite sensação de aperto e reduz a escaneabilidade do progresso semanal.
  - **Fix**: Reduzir os círculos para 34-36dp e ajustar o padding lateral do container para 8dp, garantindo pelo menos 8-10dp de respiro entre as colunas diárias.
  - Suggested command: /impeccable adapt

## Persona Red Flags

- **Alex (Power User / Atleta Focado)**:
  "Entro na academia pronto para começar. Meu celular tem tela de 360px de largura. Quando abro o app, o botão 'Iniciar treino' sumiu da tela porque o card de hoje tem quase 600dp de altura com uma lista de exercícios enorme e métricas repetidas. Tenho que rolar a tela antes de dar o primeiro play."

- **Jordan (First-Timer / Iniciante)**:
  "Olho para o cartão e vejo a mesma informação duas vezes: em cima está escrito '16 séries · ~45 min' e logo embaixo tem outra caixa com '16 séries' e '45 min'. Fico confuso sem saber onde devo olhar. E quando tento abrir o menu de Ajustes lá no topo, meu dedo erra o botão porque ele é muito pequeno (36dp)."

- **Sam (Ergonomia / Celular Compacto)**:
  "Uso um Android compacto com uma mão. Na barra da semana, as bolinhas estão coladas umas nas outras (apenas 5dp de espaço), e o link 'Ver ou alterar exercícios' é tão fino que quase sempre clico no botão laranja por engano."

## Minor Observations
- O cronômetro do treino em andamento (ormattedElapsed) usa fonte de corpo DM Sans sem algarismos tabulares (ontVariant: ['tabular-nums']), causando oscilação horizontal de caracteres a cada segundo decorrido.
- O texto "1 de 3 no ciclo" e o número dos dias da semana não utilizam Outfit com algarismos tabulares como manda o DESIGN.md.
- O ScrollView tem paddingBottom: 40, o que pode deixar o último card de histórico muito colado à barra inferior de abas de 72px em aparelhos com barra de navegação por gestos ativa.

## Questions to Consider
- O que aconteceria se o card herói exibisse imediatamente o botão "Iniciar treino" com visual muscular de 64dp, deixando a prévia de exercícios para um simples toque ou resumo de 1 linha?
- Faz sentido manter o badge de resumo de tempo/séries se a caixa de métricas já exibe exatamente os mesmos dados logo abaixo?
- A barra da semana precisa de 38dp para círculos estáticos, ou 34dp com mais respiro horizontal comunicaria o progresso com muito mais elegância?
