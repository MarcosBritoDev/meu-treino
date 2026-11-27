---
target: src/screens/ProgressScreen.tsx
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ProgressScreen.tsx"
target_fingerprint: "sha256:75567aff546b8187c7574ab32c32ce8416686c6a5787efdbe5ee6b63ab642f1c"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ProgressScreen.tsx"
timestamp: 2026-11-27T17-49-39Z
slug: src-screens-progressscreen-tsx
---
Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Feedback de toque nas barras é sutil (borda de 1px em 14dp de largura) |
| 2 | Match System / Real World | 4 | Vocabulário nativo de musculação brasileiro, formatação de carga e datas impecáveis |
| 3 | User Control and Freedom | 3 | Segmentação clara e drill-down completos, mas histórico carece de filtros por rotina |
| 4 | Consistency and Standards | 4 | Rigorosa obediência aos tokens Volt Precision Warm; âmbar estritamente em recordes |
| 5 | Error Prevention | 4 | Cálculos protegidos contra divisão por zero, NaN e tela de erro robusta com retry |
| 6 | Recognition Rather Than Recall | 3 | Ícones musculares e resumo de dia selecionado, mas barras sem valores visíveis diretos |
| 7 | Flexibility and Efficiency | 3 | Drill-down ágil para ExerciseDetail e SessionDetail; falta busca ou filtro de histórico |
| 8 | Aesthetic and Minimalist Design | 3 | Cartões elegantes em grafite quente, porém densidade vertical acumulada na aba Resumo |
| 9 | Error Recovery | 4 | Estado de erro acolhedor que tranquiliza o usuário sobre a integridade dos dados locais |
| 10 | Help and Documentation | 3 | Microcópia contextual clara sobre cálculo de séries musculares e 1RM estimado |
| **Total** | | **34/40** | **Good** |

### Design Specificity Verdict

**LLM assessment**: A evolução da tela ProgressScreen em relação ao protótipo anterior é notável: a tela deixou de ser um stub vazio e se tornou um verdadeiro centro de comando de sobrecarga progressiva e histórico local-first. A arquitetura de dados integra consultas SQLite eficientes, respeita a identidade Volt Precision Warm (grafite quente #1A1715, coral #FF7A59, âmbar #FFC46B estritamente para PRs, Outfit tabular para números) e fornece métricas de alto valor esportivo (volume acumulado com Δ%, atividade semanal com streak, séries por grupo muscular com ponderação 1x/0,5x e evolução de 1RM estimado por Epley). Os pontos de melhoria concentram-se na ergonomia de visualização em ambiente de treino: contraste do gráfico sob luz forte, desacoplamento do filtro temporal e organização do histórico à medida que a massa de dados cresce.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression
Uma tela madura, rápida e altamente específica para musculação séria. Transmite a sensação de precisão mecânica sem frieza corporativa. O desafio agora é refinar a ergonomia sob uso real na academia (contraste e foco no essencial) e clarear o escopo temporal das métricas.

### What's Working
- **Aderência absoluta aos compromissos de marca**: O âmbar (#FFC46B) é respeitado como elemento sagrado e exclusivo de Recorde Pessoal (PRBadge). O streak semanal utiliza coral e grafite, evitando contaminação semântica.
- **Riqueza de métricas relevantes de domínio**: A implementação de 1RM estimado (Epley), séries por grupo muscular com peso de músculos secundários (0,5x) e comparação de volume delta percentual colocam o app no nível dos melhores rastreadores globais.
- **Feedback e estados de exceção**: Pull-to-refresh com feedback tátil (triggerHaptic), seleção interativa de dias no gráfico e tela de erro com garantia explícita de segurança dos dados locais.

### Priority Issues

- **[P1] Desconexão de escopo entre o filtro de período e o gráfico semanal de atividade**
  - **Why it matters**: O seletor superior (7 dias, 30 dias, Tudo) controla o volume acumulado e os músculos, mas o card imediatamente seguinte (Atividade na semana) permanece estático na semana corrente (Seg a Dom). O usuário que seleciona 30 dias espera ver a atividade do mês, gerando confusão de escopo.
  - **Fix**: Reorganizar o layout: encapsular o filtro de período no card de métricas de volume (escopo local) ou rotular explicitamente o card de atividade como rastreador de frequência semanal independente (Weekly Habit Tracker).
  - **Suggested command**: /impeccable layout src/screens/ProgressScreen.tsx

- **[P1] Baixa saliência e contraste no gráfico de barras sob luz de academia**
  - **Why it matters**: A barra inativa (#3A3531) sobre o fundo do trilho (#38332F) tem contraste quase nulo (ΔE < 2). O estado selecionado depende de uma borda de 1px ao redor de uma barra de 14px. Sob luz forte de academia ou com a tela em brilho reduzido, dias de descanso parecem invisíveis e o dia selecionado é difícil de identificar.
  - **Fix**: Elevar o contraste da barra inativa (tom de superfície mais diferenciado), adicionar um indicador mais evidente para o dia selecionado (como um dot coral abaixo do número da data ou fundo destacado na coluna) e reforçar o marcador de 'Hoje'.
  - **Suggested command**: /impeccable bolder src/screens/ProgressScreen.tsx

- **[P2] Fadiga de rolagem e densidade informacional na aba Resumo**
  - **Why it matters**: A aba Resumo empilha 5 cards verticais densos. No contexto de treino rápido, o praticante precisa rolar várias telas para checar a evolução de 1RM nos exercícios principais.
  - **Fix**: Agrupar e dosar a cadência visual: priorizar no topo os dados de consistência imediata (Meta semanal + 1RM principais) e permitir visualização condensada ou colapsável dos blocos secundários.
  - **Suggested command**: /impeccable distill src/screens/ProgressScreen.tsx

- **[P2] Ausência de filtros ou agrupamento no Histórico de Sessões**
  - **Why it matters**: A aba Histórico lista todas as sessões em ordem cronológica reversa. Com 50+ sessões acumuladas, encontrar treinos anteriores de uma rotina específica (ex.: Costas ou Treino B) exige rolagem longa e cansativa.
  - **Fix**: Adicionar chips de filtro rápido por rotina ou agrupamento por mês com divisores de data.
  - **Suggested command**: /impeccable shape src/screens/ProgressScreen.tsx

### Persona Red Flags
- **Alex (Power User)**: Busca progressão de carga nos exercícios fundamentais. Na aba Resumo, precisa rolar através de 3 grandes blocos para acessar a Evolução de força. No Histórico, não tem como filtrar apenas suas sessões de pernas para comparar cargas passadas.
- **Casey (Distracted Gym User)**: Segura o aparelho com as mãos trêmulas após uma série pesada sob lâmpadas fluorescentes. Tenta entender no gráfico quais dias treinou na semana, mas a distinção entre a barra inativa e o fundo do trilho é quase imperceptível.
- **Riley (Stress Tester)**: Alterna entre os períodos de 7d, 30d e Tudo e constata que o gráfico de barras permanece idêntico exibindo os 7 dias da semana atual, apontando incoerência na arquitetura de filtros.

### Minor Observations
- O texto condicional do badge de streak semanal (data.weeklyStreak >= 1) repete a mesma string no singular e plural: data.weeklyStreak === 1 ? 'sem na meta' : 'sem na meta'.
- As linhas de exercício na Evolução de força não possuem feedback visual de toque (pressed style), dependendo exclusivamente da resposta háptica.
- Quando o volumeDeltaPercent é negativo (ex.: -12%), o badge é estilizado em cinza neutro em vez de usar um tom informativo que contextualize a redução de volume.

### Questions to Consider
- O seletor de período (7d / 30d / Tudo) deveria ser movido para dentro do card de Volume, consolidando o gráfico semanal como um cartão permanente de hábito no topo?
- A aba Histórico deveria incluir filtros rápidos por rotina (ex.: Treino A, B, C) e agrupamento visual por mês?
- Seria vantajoso exibir pequenos marcadores de volume ou carga diretamente sobre as barras do dia ativo para evitar a necessidade de toque para consulta?
