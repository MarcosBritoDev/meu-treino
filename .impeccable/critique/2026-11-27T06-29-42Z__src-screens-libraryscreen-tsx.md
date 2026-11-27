---
target: src/screens/LibraryScreen.tsx
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\LibraryScreen.tsx"
target_fingerprint: "sha256:d7ff27ce60db0c4ae3e74a4a85eef3c1169826113e57dc6270c6f3d3d68b5a1e"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\LibraryScreen.tsx"
timestamp: 2026-11-27T06-29-42Z
slug: src-screens-libraryscreen-tsx
---
Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Feedback rápido na busca, mas ausência de contador total de resultados e estado de PR vazio à direita |
| 2 | Match System / Real World | 3 | Nomenclatura anatômica e de academia correta, mas ícones focados em equipamento e rótulos de filtro assimétricos |
| 3 | User Control and Freedom | 2 | Botão "Limpar" apaga filtros e texto de busca simultaneamente; sem limpeza individual rápida por chip |
| 4 | Consistency and Standards | 2 | Violação da "Trophy Amber Rule" (PR exibido em branco comum) e cabeçalho customizado divergente do ScreenHeader |
| 5 | Error Prevention | 3 | Busca normalizada e tratamento de arquivados robusto; risco baixo de perda de dados |
| 6 | Recognition Rather Than Recall | 2 | Subtítulo longo truncado com perda do equipamento; ícones de equipamento semelhantes e sem destaque anatômico |
| 7 | Flexibility and Efficiency | 2 | Sem índice alfabético A-Z ou salto rápido de grupo muscular; falta keyboardDismissMode no scroll da lista |
| 8 | Aesthetic and Minimalist Design | 3 | Tema grafite quente elegante, mas poluído por "parede de coral" nos 46 ícones e engrenagem supérflua no topo |
| 9 | Error Recovery | 4 | Excelente empty state de busca: ilustração contextual, texto claro e atalho direto "+ Cadastrar exercício" |
| 10 | Help and Documentation | 2 | Sem contextualização do critério de PR ou diferença prática entre foco principal e secundário |
| **Total** | | **26/40** | **Acceptable** |

### Design Specificity Verdict

**LLM assessment**: A tela `LibraryScreen` possui uma base funcional sólida e atende ao propósito de catálogo de movimentos com suporte a SQLite local, normalização fonética e diferenciação entre foco primário e secundário. No entanto, ela apresenta desvios importantes em relação à identidade visual *The Warm Iron Sanctuary* e às diretrizes estritas do sistema de design:
1. **Violação da "Trophy Amber Rule"**: O token âmbar (`#FFC46B`) é a alma das conquistas no Volt Precision. Ao renderizar o PR histórico em texto comum (`colors.onSurface`), a tela nivela a maior conquista do praticante ao texto comum de interface, perdendo o impacto emocional do recorde.
2. **Poluição Visual por Coral Passivo**: Ao pintar todos os 46 ícones de equipamento com `colors.primary` (`#FF7A59`), a tela dilui a hierarquia cromática. O coral deve ser reservado a ações e destaques, não a ícones decorativos repetidos em cada linha.
3. **Ergonomia e Assimetria no Cabeçalho/Filtros**: O cabeçalho foi construído de forma ad-hoc com o botão de Ajustes (Settings) redundante, enquanto a barra de filtros possui assimetria textual ("Músculo: Todos" vs "Equipamento") e um botão "Limpar" com efeito colateral destrutivo sobre a busca digitada.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression
Uma tela de catálogo robusta e responsiva, com excelente performance e suporte a busca instantânea, mas que sofre de diluição da paleta de cores (excesso de coral e ausência de âmbar nos PRs), truncamento de informações vitais de equipamento e pequenas fricções na ergonomia dos filtros.

### What's Working
- **Empty state de busca exemplar**: Quando nenhum exercício corresponde aos critérios, a tela oferece uma ilustração temática, mensagem amigável e um botão de ação primária que pré-preenche o termo buscado na criação de um novo exercício.
- **Divisão biomecânica primária vs secundária**: Ao filtrar por um músculo específico, a separação em "Foco principal" e "Também trabalham (secundário)" reflete entendimento profundo do treino de força e sobrecarga seletiva.
- **Arquitetura de renderização com FlashList**: Virtualização eficiente e carregamento reativo via `useFocusEffect` garantem fluidez e zero atrito com banco local.

### Priority Issues

- **[P1] Quebra da "Trophy Amber Rule" na exibição de Recordes Pessoais (PR)**
  - **Why it matters**: O sistema de design define o âmbar (`#FFC46B`) como exclusivo e sagrado para Personal Records e troféus. Em `LibraryScreen`, a melhor marca histórica do exercício é renderizada em branco/creme comum (`colors.onSurface`), sem destaque visual e sem ícone de troféu. Isso faz com que recordes passem despercebidos durante a navegação pelo catálogo.
  - **Fix**: Estilizar o bloco de PR com o tom canônico de âmbar (`colors.pr` / `#FFC46B`), acompanhado de ícone de troféu ou formato de badge sutil, permitindo ao praticante identificar instantaneamente quais movimentos já possuem histórico de carga máxima.
  - **Suggested command**: `/impeccable colorize src/screens/LibraryScreen.tsx`

- **[P1] Diluição da cor primária (Coral) nos 46 ícones de equipamento**
  - **Why it matters**: Todas as linhas da lista exibem um ícone de equipamento colorido em coral primário (`#FF7A59`). Em uma lista com dezenas de itens, isso cria uma "parede de coral" que polui a visão e esvazia o significado semântico da cor primária, que deveria sinalizar ações interativas. Além disso, praticantes de musculação buscam exercícios pelo músculo-alvo, não pelo equipamento.
  - **Fix**: Usar tons neutros para os ícones de equipamento (`colors.onSurfaceVariant` ou `colors.textMuted`) ou substituir/complementar pelo componente anatômico `MuscleIcon`, preservando o coral exclusivamente para elementos acionáveis e filtros ativos.
  - **Suggested command**: `/impeccable quieter src/screens/LibraryScreen.tsx`

- **[P1] Truncamento severo do subtítulo com perda do equipamento e músculos secundários**
  - **Why it matters**: A fórmula de subtítulo `${ex.muscleGroup} · ${secondary.join(', ')} · ${ex.equipment}` em uma linha única (`numberOfLines={1}`) é frequentemente cortada em telas móveis devido ao comprimento dos nomes em português (ex.: "Costas superiores · Ombro posterior..."). Como o equipamento fica no final da string, o usuário não consegue saber se o exercício é com barra, halteres ou máquina sem abrir a tela de detalhes.
  - **Fix**: Reestruturar as informações do card: mover o equipamento para um chip ou tag dedicada, ou separar visualmente o músculo primário do secundário e do equipamento, garantindo que o tipo de equipamento nunca seja truncado.
  - **Suggested command**: `/impeccable layout src/screens/LibraryScreen.tsx`

- **[P2] Cabeçalho fora do padrão do sistema e presença redundante da engrenagem de Ajustes**
  - **Why it matters**: `LibraryScreen` constrói um cabeçalho customizado em vez de reutilizar o `<ScreenHeader />` padrão do projeto. Além disso, inclui o ícone de Ajustes (Settings), que já está presente em `HomeScreen` e `WorkoutsScreen`. Na tela de biblioteca, esse botão compete com a ação primária "+ Novo", reduz a ergonomia do polegar e gera poluição visual desnecessária no topo.
  - **Fix**: Alinhar o cabeçalho com o padrão `ScreenHeader`, remover a engrenagem redundante de Ajustes e destacar a criação de novos exercícios com melhor ergonomia tátil (ex.: FAB no canto inferior ou botão claro no topo).
  - **Suggested command**: `/impeccable polish src/screens/LibraryScreen.tsx`

- **[P2] Filtros com rótulos assimétricos e botão "Limpar" com efeito colateral destrutivo**
  - **Why it matters**: O botão de músculo exibe "Músculo: Todos" enquanto o de equipamento exibe apenas "Equipamento", gerando assimetria textual. Quando um filtro é ativado e a busca por texto também está ativa, o botão "Limpar" reseta ambos os filtros e apaga o texto digitado na busca, frustrando o usuário que só queria trocar de equipamento. Além disso, o botão de limpar a busca dentro do input tem 36×36dp, violando a regra de 48dp mínimo no Android.
  - **Fix**: Padronizar os rótulos dos filtros ("Músculo: X" e "Equipamento: Y"), permitir limpar filtros individualmente com um botão "x" no próprio chip ativo, e elevar o touch target do botão de busca para 48dp (com `hitSlop`).
  - **Suggested command**: `/impeccable clarify src/screens/LibraryScreen.tsx`

### Persona Red Flags
- **Alex (Power User)**: Ao rolar uma lista de 46 exercícios, sente falta de um índice alfabético rápido (A-Z) ou chips de salto rápido entre grupos musculares. O teclado não é fechado automaticamente ao rolar a lista (`keyboardDismissMode="on-drag"` ausente), cobrindo metade da tela e retardando a navegação.
- **Jordan (First-Timer)**: O subtítulo do card é cortado e não mostra o equipamento no final; Jordan não sabe se o exercício precisa de uma máquina específica ou de halteres antes de tocar em cada item. Os ícones geométricos de equipamento (Sliders, Cable, Boxes) são abstratos demais e não ajudam a identificar o movimento.
- **Sam (Accessibility-Dependent User)**: O botão de limpar texto na busca (`clearButton`) possui apenas 36×36dp sem `hitSlop`, dificultando o toque preciso para quem possui tremor motor pós-série. O badge "secundário" tem texto em 10sp, abaixo do mínimo confortável de leitura para baixa visão sob a luz do salão de academia.
- **Riley (Deliberate Stress Tester)**: Digita um nome de exercício na busca, ativa o filtro de equipamento "Halteres" e, ao clicar em "Limpar" para ver outros equipamentos, perde todo o texto da busca digitado.

### Minor Observations
- O componente `FlashList` não possui `estimatedItemSize={72}`, o que pode provocar pequenos saltos de renderização no Android durante a rolagem rápida.
- Não há um contador global no topo indicando o total de exercícios catalogados ou filtrados (ex.: "46 exercícios" ou "8 encontrados").
- No estado vazio de busca, quando há filtros de músculo e equipamento aplicados, a descrição menciona apenas o músculo, omitindo o equipamento filtrado.

### Questions to Consider
- O card de exercício deve destacar o grupo muscular (com `MuscleIcon` em miniatura) ou o equipamento como identificador visual principal?
- Devemos adotar uma barra de chips horizontais deslizáveis com os grupos musculares no topo (como em `AddExercisesScreen`), reduzindo a necessidade de abrir um modal sheet para alternar entre Peito, Costas e Pernas?
