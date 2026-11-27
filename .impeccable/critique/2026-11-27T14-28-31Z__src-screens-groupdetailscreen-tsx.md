---
target: src/screens/GroupDetailScreen.tsx e src/screens/AddExercisesScreen.tsx
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\GroupDetailScreen.tsx"
target_fingerprint: "sha256:680cafbdc438010bd9bc90191a5d65875fc5aacb1d987d352d3c61da7fb42e4a"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\GroupDetailScreen.tsx"
timestamp: 2026-11-27T14-28-31Z
slug: src-screens-groupdetailscreen-tsx
---
# Critique: GroupDetailScreen & AddExercisesScreen (Consistência com WorkoutsScreen)

Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Estados e toasts claros, mas sem transição/animação em contadores e dot estático em AddExercises |
| 2 | Match System / Real World | 4 | Excelente vocabulário de musculação (séries, repetições, RPE, PPL, divisões musculares em PT-BR) |
| 3 | User Control and Freedom | 3 | Boas confirmações, mas ação de 'Limpar seleção' com touch target inadequado (~18dp) |
| 4 | Consistency and Standards | 2 | Descompasso com WorkoutsScreen: cards verticais gigantes vs cards horizontais de 76dp, botões com formatos e textos divergentes |
| 5 | Error Prevention | 3 | Bons diálogos de confirmação; no entanto, touch targets < 48dp induzem a toques acidentais na academia |
| 6 | Recognition Rather Than Recall | 3 | Ícones de equipamentos e grupos úteis; filtros e subtítulos truncam agressivamente em 360px |
| 7 | Flexibility and Efficiency of Use | 2 | Sem seleção rápida em lote em AddExercises; reordenação de treinos escondida em menu modal |
| 8 | Aesthetic and Minimalist Design | 2 | Ruído visual em GroupDetail (cardception, chips redundantes); barra flutuante de AddExercises consome > 20% do viewport |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 3 | Mensagens de conflito de sessão e toasts informativos em português claro |
| 10 | Help and Documentation | 3 | Empty states com ilustrações, dicas de periodização e atalhos úteis |
| **Total** | | **28/40** | **Good** |

### Design Specificity Verdict

**LLM assessment**: As telas possuem alta identidade temática orientada ao universo de treino tátil, offline e sem firulas do Volt Precision Warm. No entanto, há um descompasso estrutural evidente: enquanto a nova WorkoutsScreen atingiu maturidade de design (cards compactos de 76dp, ausência de bordas tracejadas, botões pílula de 56dp e alvos >= 48dp), GroupDetailScreen permaneceu presa a um padrão vertical verboso de protótipo. Além disso, AddExercisesScreen falha no teste de responsividade extrema em 360px de largura, sofrendo com truncamentos e uma barra flutuante desproporcional.

**Deterministic scan**: not applicable (native platform)

### Overall Impression
O aplicativo possui fundações sólidas e linguagem visual bem definida pelo sistema Volt Precision Warm. No entanto, a discrepância entre WorkoutsScreen e GroupDetailScreen faz com que navegar entre elas pareça usar duas versões diferentes do app. O refinamento ergonômico em telas compactas (360px) e o ajuste dos touch targets para 48dp são mandatórios para o uso real em ambiente de academia.

### What's Working
1. **Fidelidade à paleta e eliminação de bordas tracejadas**: Ambas as telas respeitam as cores do Volt Precision Warm (superfície grafite #1A1715, cartões #23201D, contornos sólidos #3A3531) sem recorrer a bordas tracejadas descartadas.
2. **FlashList com categorização inteligente em AddExercisesScreen**: Agrupamento em foco principal vs secundário com debounce de 150ms na busca e proteção contra duplicação ('Já no treino').
3. **Resguardo de segurança e continuidade de sessão**: Modais de confirmação claros para exclusão e salvamento de estado com detecção de treinos em andamento.

### Priority Issues
- **[P1] Inconsistência Crítica de Cards entre GroupDetailScreen e WorkoutsScreen**:
  - *What*: Em WorkoutsScreen os cards têm 76dp de altura e botão 'Iniciar' à direita; em GroupDetailScreen são monolitos verticais de ~220dp com cards aninhados e botão 'Iniciar' de largura inteira.
  - *Why it matters*: Quebra o padrão mental do usuário para a mesma entidade 'Treino'.
  - *Fix*: Padronizar o card de treino de GroupDetailScreen com o formato simplificado e moderno de WorkoutsScreen.
  - *Suggested command*: /impeccable layout src/screens/GroupDetailScreen.tsx
- **[P1] Violação de Touch Targets Críticos (< 48dp)**:
  - *What*: Botões essenciais estão abaixo de 48dp e sem hitSlop: cardMenuButton (30x30), newWorkoutPill (~30dp), editGroupButton (~34dp), clearSearchBtn (24x24) e 'Limpar seleção' (~18dp).
  - *Why it matters*: Dedos suados ou trêmulos após séries erram toques repetidamente.
  - *Fix*: Expandir touch targets para no mínimo 48x48dp via padding ou hitSlop.
  - *Suggested command*: /impeccable harden src/screens/GroupDetailScreen.tsx
- **[P1] Estrangulamento de Layout em 360px e Seleção Lenta em AddExercisesScreen**:
  - *What*: Em 360px, a barra de filtros trunca texto ('Músculo: T...'), o badge 'secundário' inline trunca o nome do exercício e a barra flutuante de duas linhas consome ~140dp (>20% da tela).
  - *Why it matters*: Dificulta selecionar exercícios em aparelhos compactos populares.
  - *Fix*: Usar chips de filtro horizontais ou rótulos compactos, mover o badge secundário para a linha de suporte e unificar a barra de ações em uma única linha enxuta de 56dp.
  - *Suggested command*: /impeccable adapt src/screens/AddExercisesScreen.tsx
- **[P2] Tipografia de Cabeçalho Desproporcional em GroupDetailScreen**:
  - *What*: Uso de displayLarge (48px) no título do grupo espreme o botão 'Editar' e quebra linhas de forma agressiva.
  - *Why it matters*: Ocupa metade da primeira dobra com um nome longo.
  - *Fix*: Usar variant='headline' ou 'title' (24-28px) como no novo WorkoutsScreen.
  - *Suggested command*: /impeccable typeset src/screens/GroupDetailScreen.tsx
- **[P2] Tokenização Inconsistente e Estilos Hardcoded**:
  - *What*: AddExercisesScreen usa strings rgba hardcoded e acessa fontFamilies diretamente.
  - *Why it matters*: Fragiliza manutenção e quebra coerência com os tokens semânticos do DESIGN.md.
  - *Fix*: Migrar para tokens centralizados de colors e typography.
  - *Suggested command*: /impeccable polish src/screens/AddExercisesScreen.tsx

### Persona Red Flags
- **Alex (Power User)**: Atrasado por cards verticais gigantes que exigem scroll excessivo e pela barra flutuante de duas linhas que cobre a lista em AddExercises.
- **Casey (Mobile com Uma Mão / Mãos Suadas)**: Frustrado ao errar o botão 'X' de busca (24dp) e o menu de opções (30dp) nos aparelhos de 360px.
- **Jordan (Iniciante)**: Desorientado pela mudança radical de aparência da ficha de treino entre WorkoutsScreen e GroupDetailScreen.

### Minor Observations
- O pulsingDot em AddExercisesScreen não possui animação de pulso.
- O botão inferior em GroupDetailScreen usa 'Adicionar outro treino a este grupo' e ícone PlusCircle, destoando de WorkoutsScreen ('Adicionar treino' com Plus).

### Questions to Consider
- Devemos adotar o card de treino horizontal com botão coral 'Iniciar' à direita exatamente como no WorkoutsScreen?
- Como podemos condensar a barra flutuante inferior de AddExercisesScreen em uma linha para liberar a visualização da lista em 360px?
