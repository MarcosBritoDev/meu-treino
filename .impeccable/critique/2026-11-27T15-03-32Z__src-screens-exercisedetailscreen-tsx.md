---
target: src/screens/ExerciseDetailScreen.tsx e src/screens/NewExerciseScreen.tsx
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ExerciseDetailScreen.tsx"
target_fingerprint: "sha256:7cf8905a793ddc0f0d814c1d47770be16d072044819a27a51341050100db39ca"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ExerciseDetailScreen.tsx"
timestamp: 2026-11-27T15-03-32Z
slug: src-screens-exercisedetailscreen-tsx
---
# Critique: ExerciseDetailScreen & NewExerciseScreen (Histórico/PR e Formulário Limpo)

Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Excelente feedback tátil, contadores e datas tabulares em Outfit, pico e gráfico de ciclo claros |
| 2 | Match System / Real World | 4 | Vocabulário nativo de musculação (carga, repetições, volume, 2× para halteres, divisão muscular) |
| 3 | User Control and Freedom | 3 | Modal de descarte seguro, mas exclusão usa Alert.alert nativo em vez de ConfirmModal padronizado |
| 4 | Consistency and Standards | 3 | Descompasso de botões: NewExerciseScreen usa minHeight: 52 inline em vez de Button de 56dp do sistema |
| 5 | Error Prevention | 3 | Chips de período do gráfico com míseros ~22dp de altura e sem hitSlop induzem a erro em uso real |
| 6 | Recognition Rather Than Recall | 4 | Ícones dedicados por equipamento, MuscleIcon na seleção anatômica e metadados contextuais claros |
| 7 | Flexibility and Efficiency of Use | 3 | Filtro temporal útil no gráfico; no entanto, histórico de sessões longo vira scroll monótono |
| 8 | Aesthetic and Minimalist Design | 3 | Zero cardception e paleta Volt Precision Warm exemplar, mas excesso de chips secundários na 1ª dobra em 360px |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 4 | Validação de nome obrigatório, detecção de duplicidade no mesmo grupo e mensagens de apoio claras |
| 10 | Help and Documentation | 3 | Dicas de execução técnicas a partir das anotações e empty state acolhedor para novos exercícios |
| **Total** | | **34/40** | **Strong (85%)** |

### Design Specificity Verdict

**LLM assessment**: As telas demonstram alto refinamento estético e aderência visceral ao "The Warm Iron Sanctuary" do Volt Precision Warm. A visualização de recordes e histórico em `ExerciseDetailScreen` respeita estritamente a "The Trophy Amber Rule" (âmbar #FFC46B consagrado exclusivamente aos recordes e troféu), os dados de sobrecarga progressiva usam números tabulares em Outfit e a interface é 100% sentence case. Em `NewExerciseScreen`, o agrupamento em `classificationContainer` resolve o formulário com elegância sem redundância visual. No entanto, há duas falhas técnicas e ergonômicas críticas: os botões de filtro de período do gráfico violam frontalmente o padrão mínimo de touch targets (medindo apenas ~22dp sem hitSlop), e a composição do `SafeAreaView` com rodapé fixo absoluto causa duplo padding inferior no iOS (~80dp de vazio) e corte de scroll no final do formulário.

**Deterministic scan**: not applicable (native platform)

### Overall Impression
Duas telas fundamentais do fluxo de treino com acabamento muito superior à média de mercado. O respeito à paleta grafite quente, a tipografia Outfit tabular e o design sem drop-shadows ou cardception dão um aspecto profissional de app nativo offline. Os ajustes necessários concentram-se na ergonomia tátil extrema (touch targets >= 48dp no gráfico), desobstrução da primeira dobra em 360px e correção da safe area / KeyboardAvoidingView no rodapé.

### What's Working
1. **Consagração absoluta do âmbar (#FFC46B) e Outfit tabular**: O âmbar surge exclusivamente no troféu e no `PRBadge` de recorde histórico. As cargas, repetições, volumes e datas curtas dos eixos adotam Outfit tabular milimétrico.
2. **Zero cardception e agrupamento de classificação limpo**: Em `NewExerciseScreen`, o `classificationContainer` agrupa Equipamento, Músculo Principal e Músculos Secundários com divisores discretos de 1px em fundo tonal #23201D, eliminando o ruído de caixas empilhadas.
3. **Resguardo de integridade de dados e prevenção de erros**: Bloqueio de duplicidade de nomes no mesmo grupo muscular, modal de confirmação ao tentar sair sem salvar alterações e dicas de execução dinâmicas.

### Priority Issues
- **[P1] Violação Crítica de Touch Target nos Chips de Período do Gráfico (~22dp)**:
  - *What*: Os botões de filtro temporal (`4 sem`, `3 meses`, `tudo`) no gráfico possuem `paddingVertical: 3` e `paddingHorizontal: 8`, gerando ~22dp de altura e espaçamento de 4dp, sem nenhum `hitSlop`.
  - *Why it matters*: Em ambiente real de academia, com dedos suados ou mãos trêmulas pós-série, o usuário erra repetidamente o toque ao tentar alternar períodos.
  - *Fix*: Expandir o alvo de toque para no mínimo 48×48dp através de `hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}` ou adotar um segmented control com `minHeight: 40-48dp`.
  - *Suggested command*: /impeccable harden src/screens/ExerciseDetailScreen.tsx
- **[P1] Duplo Safe Area e Risco de Sobreposição do Teclado no Formulário**:
  - *What*: `SafeAreaView` sem restrição de `edges` gera padding inferior duplicado com o `fixedFooter` no iOS (~80dp de vazio). Em `NewExerciseScreen`, `paddingBottom: 100` em modo criação deixa o contador de caracteres colado/encoberto pelo rodapé de 110dp.
  - *Why it matters*: Desperdiça viewport nobre no iOS, afasta o botão Salvar da zona confortável do polegar e corta o final do formulário no scroll.
  - *Fix*: Configurar `edges={['top', 'left', 'right']}` no `SafeAreaView`, ajustar o `contentContainerStyle` com `paddingBottom: isEditMode && isCustom ? 160 : 120`, e garantir `keyboardVerticalOffset` adequado.
  - *Suggested command*: /impeccable adapt src/screens/NewExerciseScreen.tsx
- **[P2] Estrangulamento Horizontal do Bento Grid e Chips Redundantes em 360px**:
  - *What*: Em telas compactas de 360px, o Bento Grid deixa apenas 124px de largura útil por card, quebrando "Maior carga" + "Halteres (2×)" e espremendo números altos de volume. No topo, 4 chips ("Meta: repetições", "Composto", etc.) quebram em 3 linhas e empurram o gráfico para longe da primeira dobra.
  - *Why it matters*: Poluição visual acima da dobra e quebra desnecessária de linhas em aparelhos compactos populares.
  - *Fix*: Ocultar chips de baixa relevância ("Meta: repetições" e "Composto") ou fundi-los em linha de metadados compacta; no Bento Card, calibrar padding para 12px em telas <= 360px.
  - *Suggested command*: /impeccable layout src/screens/ExerciseDetailScreen.tsx
- **[P2] Inconsistência nos Botões do Rodapé e Modal de Exclusão**:
  - *What*: `NewExerciseScreen` cria botões customizados com `minHeight: 52` (em vez de `spacing.buttonHeight: 56` do design system) e usa `Alert.alert` nativo para exclusão em vez do `ConfirmModal` temático do app.
  - *Why it matters*: Quebra a consistência do sistema Volt Precision Warm e destoa das outras telas (como GroupDetailScreen e WorkoutsScreen).
  - *Fix*: Padronizar a altura para 56dp (ou usar o componente `Button`), e substituir o `Alert.alert` por um `ConfirmModal` com `isDanger={true}`.
  - *Suggested command*: /impeccable polish src/screens/NewExerciseScreen.tsx

### Persona Red Flags
- **Alex (Power User)**: Frustrado ao ter que rolar excessivamente para ver o gráfico e histórico devido a chips redundantes na primeira dobra, e ao tentar alternar períodos no gráfico sem conseguir acertar o alvo minúsculo de 22dp.
- **Casey (Mobile com Uma Mão / Mãos Suadas)**: Sofre com o duplo padding inferior no iOS que joga o botão de salvar para cima ou para baixo, e erra os cliques nos filtros do gráfico em 360px.
- **Jordan (Iniciante)**: Aprecia muito a clareza da ficha (sem RPE confuso) e o vocabulário em português limpo, mas fica em dúvida se "Meta: repetições" e "Composto" são botões clicáveis, pois têm a mesma aparência visual de botões de filtro.

### Minor Observations
- No `ExerciseDetailScreen`, o rótulo de eixos do SVG (`SvgText` do react-native-svg) declara `fontFamily="Outfit"`, mas não inclui `fontVariant="tabular-nums"`.
- O botão "Adicionar a um treino" possui `style={styles.ctaButton}` com `minHeight: 52`, enquanto o componente `Button` primário já possui `height: 56` nativo em seu style base.
- No `NewExerciseScreen`, ao selecionar muitos músculos secundários, os chips podem expandir bastante a linha da tabela; uma rolagem horizontal de chips ou limite de exibição inline com contador "+X" evitaria expansão desproporcional.

### Questions to Consider
- E se condensássemos os metadados secundários ("Meta: repetições" e "Composto") em um único subtítulo sutil, permitindo que o topo do gráfico de evolução apareça acima da dobra em qualquer tela de 360px?
- O histórico de sessões não ficaria mais escaneável se agrupado por meses ou com paginação dos últimos 5 registros e botão "Ver histórico completo"?
- Por que não adotar o `<Button>` primário de 56dp com `ConfirmModal` no formulário para unificar 100% o comportamento com o resto do aplicativo?
