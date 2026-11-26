---
target: src/screens/EditWorkoutScreen.tsx
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\EditWorkoutScreen.tsx"
target_fingerprint: "sha256:1a1e333ae6548d30558a3bbb512739e0aacf1558137ba9b9a28ef67d59845507"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\EditWorkoutScreen.tsx"
timestamp: 2026-11-26T23-27-21Z
slug: src-screens-editworkoutscreen-tsx
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Indicador de alterações não salvas funcional, mas salvamento com nome vazio falha silenciosamente apenas com vibração tátil. |
| 2 | Match System / Real World | 3 | Linguagem esportiva natural (séries, min, exercícios); contudo, metadados de rotina/grupo (PPL, ABC) ficam invisíveis na tela. |
| 3 | User Control and Freedom | 2 | "Iniciar sem salvar" descarta silenciosamente modificações da prévia iniciando versão do banco; reordenação exige múltiplos modais. |
| 4 | Consistency and Standards | 2 | Violação de DESIGN.md com botão tracejado (`dashed`); ícone branco sobre texto escuro em botão coral; modais duplicados fora do padrão ConfirmModal. |
| 5 | Error Prevention | 3 | Modal de conflito e alerta de alterações não salvas previnem perdas; falta validação preventiva no campo de nome. |
| 6 | Recognition Rather Than Recall | 2 | Campo de nome parece texto estático sem affordance de edição; grupo da ficha oculto; rodapé desbalanceado quando não há alterações. |
| 7 | Flexibility and Efficiency | 2 | Ação principal "Iniciar" relegada ao topo direito com altura de apenas 28dp; rodapé monopolizado por "Salvar" mesmo sem edições. |
| 8 | Aesthetic and Minimalist Design | 2 | Contraste de ícone insuficiente (2.6:1 WCAG fail); borda tracejada web desktop; raios arbitrários (6, 8, 12, 14px) fora da escala de tokens. |
| 9 | Error Recovery | 2 | Falta mensagem de erro acionável quando o usuário limpa o nome da ficha e tenta salvar. |
| 10 | Help and Documentation | 2 | Estado vazio com texto cinza seco sem orientação prática sobre como estruturar o primeiro treino. |
| **Total** | | **23/40** | **Acceptable (57.5%)** |

### Design Specificity Verdict

**LLM assessment**: O `EditWorkoutScreen` cumpre seu papel mecânico de intermediar a prévia e edição da ficha de treino, mas sofre de uma grave inversão de prioridades ergonômicas para uso real em academia. Em vez de privilegiar a transição rápida "revisar ficha → iniciar treino no salão", a tela trata o treino como um formulário administrativo web desktop: coloca um botão "Salvar treino" gigante e primário na zona do polegar (mesmo quando nada foi alterado) e empurra o botão "Iniciar" para o canto superior direito com dimensões minúsculas de 28dp (muito abaixo dos 48dp mínimos exigidos). Além disso, apresenta quebras literais de regras do sistema de design (borda tracejada em `addExerciseButton`, ícone branco sobre fundo coral com contraste 2.6:1 e múltiplos raios de borda fora dos tokens).

**Deterministic scan**: not applicable (native platform)

### Overall Impression
Uma tela funcionalmente robusta na integração com SQLite e folhas de séries, mas ergonômica e visualmente desconectada do "Warm Iron Sanctuary". O praticante no salão precisa esticar o polegar até o topo para iniciar o treino em um botão minúsculo, enquanto o rodapé o convida repetidamente a "Salvar" o que ele nem sequer editou. Resolver a hierarquia da Thumb Zone, eliminar as bordas tracejadas e unificar os componentes aos tokens do DESIGN.md elevará imediatamente a nota da tela para o patamar Good/Excellent.

### What's Working
1. **Integração Fluida com Sheets de Séries**: O fluxo de tocar na linha da série e abrir o `SetEditSheet` ou acionar o `SetTypeSheet` com 1 toque preserva o contexto do treino sem navegar para outra tela.
2. **Prevenção Confiável de Conflitos**: A detecção de sessões em andamento via `getInProgressSession()` com modal dedicado de confirmação impede que o usuário descarte treinos ativos acidentalmente.
3. **Resumo Estimado em Tempo Real**: O cálculo dinâmico de séries totais e tempo estimado (`~X min`) no rodapé atualiza instantaneamente à medida que séries são adicionadas ou descansos são alterados.

### Priority Issues

- **[P1] Inversão de hierarquia na Thumb Zone: "Iniciar treino" minúsculo no topo vs "Salvar" monopolizando o rodapé**
  - **Why it matters**: A intenção primária de quem abre uma ficha de treino é quase sempre iniciar a sessão. Colocar "Iniciar" no topo direito com altura de apenas ~28dp (paddingVertical: 6) força o usuário a usar as duas mãos ou realizar contorção motora com mãos suadas/trêmulas. Manter "Salvar treino" como botão coral primário gigante mesmo quando `isDirty` é falso induz cliques redundantes e confusão mental.
  - **Fix**: Reestruturar o rodapé fixo para ser contextual: quando `!isDirty`, o botão de herói no rodapé deve ser "Iniciar treino" (coral, 56dp, texto e ícone escuros `#1A1715`). Quando `isDirty`, exibir "Salvar alterações" e uma opção clara de "Salvar e iniciar", liberando o cabeçalho para foco exclusivo no título e retorno.
  - **Suggested command**: `/impeccable layout`

- **[P1] Quebra de regras de DESIGN.md: Borda tracejada (`dashed`), ícone branco sobre coral e raios fora de escala**
  - **Why it matters**: `DESIGN.md` proíbe explicitamente bordas tracejadas em botões nativos (`borderStyle: 'dashed'`), que transmitem estética web desktop amadora. Além disso, o botão de salvar usa ícone `<Save color="#FFFFFF" />` ao lado de texto `#1A1715`: o branco sobre o coral `#FF7A59` tem taxa de contraste de apenas 2.6:1 (reprovado no WCAG AA, que exige 3:1 para ícones e 4.5:1 para texto). Por fim, raios arbitrários (6, 8, 12, 14px) desrespeitam os tokens do design system (`radii.card: 24`, `radii.input: 16`, `radii.pill: 9999`).
  - **Fix**: Remover `borderStyle: 'dashed'` de `addExerciseButton` e adotar estilo de superfície sólida (`#23201D` com borda sutil `#3A3531`); padronizar o ícone do botão primário para `#1A1715` e altura de 56dp com `radii.pill: 9999px`; alinhar todos os raios aos tokens oficiais.
  - **Suggested command**: `/impeccable polish`

- **[P1] Alvos de toque (touch targets) abaixo do piso de 48×48 dp no cabeçalho e modais**
  - **Why it matters**: O botão de voltar (`styles.backButton`) tem 32×32 dp sem `hitSlop`; o botão "Iniciar" tem altura de 28dp sem `hitSlop`; o botão "Cancelar" do modal unsaved tem paddingVertical de 8dp. Em ambiente de treino de musculação, alvos abaixo de 48dp geram toques perdidos e frustração física imediata.
  - **Fix**: Aplicar `minWidth: 48, minHeight: 48` e `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` aos controles do cabeçalho e garantir que todas as áreas clicáveis atendam rigorosamente ao padrão Android de 48×48 dp.
  - **Suggested command**: `/impeccable audit`

- **[P2] Modal customizado duplicado e falha silenciosa na validação do nome**
  - **Why it matters**: O modal "Salvar antes de iniciar?" foi montado manualmente com JSX e estilos inline duplicados (`modalOverlay`, `unsavedModalCard`, `modalPrimaryBtn`), em vez de reutilizar o componente padrão `ConfirmModal` (que já possui suporte nativo a `hasDiscard`/`actionsStacked`). Além disso, ao tentar salvar com o campo de nome vazio, a função apenas executa `triggerHaptic('error')` e não exibe nenhuma mensagem ou aviso ao usuário, parecendo uma trava de aplicativo.
  - **Fix**: Substituir o `<Modal>` customizado por `ConfirmModal` unificado; adicionar feedback visual (Toast ou mensagem inline vermelha) alertando que o nome do treino é obrigatório.
  - **Suggested command**: `/impeccable harden`

- **[P2] Invisibilidade da rotina/divisão (Group) e atrito severo na reordenação de exercícios**
  - **Why it matters**: A tela carrega e persiste `groupId` e `isActive`, mas não há nenhum indicador visual ou chip que mostre a qual grupo/divisão (ex.: "Push", "PPL", "ABC") o treino pertence. Adicionalmente, para reordenar a sequência de exercícios, o usuário precisa abrir o menu `•••`, tocar em "Mover para cima/baixo" e fechar o modal para cada posição desejada.
  - **Fix**: Adicionar uma tag/chip elegante no topo indicando o grupo atual (com possibilidade de alteração); oferecer alças de ordenação direta ou botões de subida/descida visíveis sem depender de modais aninhados.
  - **Suggested command**: `/impeccable shape`

### Persona Red Flags

- **Alex (Power User / Focado em Cargas)**: **Reprovado.** Alex quer entrar na ficha, verificar a ordem dos exercícios e iniciar a sessão em menos de 3 segundos. Ter que erguer a mão para o canto superior direito para clicar em um botão de 28dp, enquanto o botão gigante de rodapé quer forçá-lo a salvar o que não mudou, causa irritação imediata. Reordenar 2 exercícios exige abrir e fechar 4 modais sucessivos.
- **Jordan (Iniciante no Salão)**: **Reprovado.** Jordan não sabe que o nome do treino no topo é editável porque ele não tem aparência de input (parece um texto fixo). Ao tentar limpar o nome e salvar, o app vibra e não diz por que não salvou. Ao ver "Salvar antes de iniciar?", Jordan teme perder o treino e não entende a diferença entre "Salvar e iniciar" e "Iniciar sem salvar".
- **Sam (Baixa Visão / Fadiga Motora)**: **Reprovado.** O ícone de salvar em branco sobre fundo coral tem contraste 2.6:1, tornando-se invisível para quem tem sensibilidade a contraste. O botão de voltar com 32dp e o botão de iniciar com 28dp são alvos pequenos demais para dedos fatigados ou trêmulos após levantamento de peso pesado.
- **Riley (Testador Metódico)**: **Reprovado.** Riley apaga o nome do treino e clica em "Salvar treino": nada acontece na interface além de uma vibração de erro. Riley adiciona exercícios na prévia e escolhe "Iniciar sem salvar": o app inicia a sessão a partir do banco de dados antigo e descarta as adições sem avisar claramente que o treino de hoje não terá aqueles exercícios.

### Minor Observations
- O campo de nome no cabeçalho divide espaço com o botão de voltar, a tag de código ("A") e o botão de iniciar; nomes longos como "Treino A - Peito, Tríceps e Deltoide Anterior" sofrem compressão sem quebras elegantes.
- Os números de estatísticas do rodapé (`X séries · ~Y min`) não utilizam a variante `tabular` do componente `Text`, arriscando pequenos saltos visuais na renderização de dígitos.
- As cores `#636366` e `#8E8E93` usadas em placeholders e ícones são resquícios do iOS System Gray, que destoam dos tons acolhedores de terra `#7D746B` e `#B7ADA3` do tema.

### Questions to Consider
- O que acha de transformarmos o botão primário do rodapé em "Iniciar treino" por padrão, reservando o destaque de "Salvar treino" apenas quando houver alterações pendentes na ficha?
- Gostaria de substituir o modal customizado de alterações pelo `ConfirmModal` padrão e adicionar validação explícita de nome com Toast de erro?
- Faz sentido exibir no topo o grupo muscular/rotina (ex.: PPL, ABC) a que este treino pertence?
