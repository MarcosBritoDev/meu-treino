---
target: src/ui/session/SetTable.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\ui\\session\\SetTable.tsx"
target_fingerprint: "sha256:9b756ff92ea34c8a62add7be2ea530df7917cd029642d6c845d456beebe60110"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\ui\\session\\SetTable.tsx"
timestamp: 2026-11-26T22-54-31Z
slug: src-ui-session-settable-tsx
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Série atual em andamento quase imperceptível visualmente (apenas 3% de opacidade branca). |
| 2 | Match System / Real World | 3 | Terminologia de musculação precisa e alinhada ao domínio pt-BR, mas sem peso previsto no preview. |
| 3 | User Control and Freedom | 3 | Boa flexibilidade de reordenação e expansão/colapso; remoção sem confirmação prévia. |
| 4 | Consistency and Standards | 2 | SetTable possui footer duplicado inativo; ExerciseCard usa raio 16px divergindo do DESIGN.md (24px). |
| 5 | Error Prevention | 1 | Checkmark minúsculo (28×28 dp) e inputs baixos (30dp) causam erros graves sob fadiga motora no treino. |
| 6 | Recognition Rather Than Recall | 2 | Truncamento da coluna "Anterior" em 360px obriga o praticante a depender da memória para carga. |
| 7 | Flexibility and Efficiency | 2 | Sem fluxo contínuo de foco no teclado numérico; conflito de toque entre a linha e o menu •••. |
| 8 | Aesthetic and Minimalist Design | 2 | Cardception excessivo (bordas dentro de bordas) e duplicação literal de dados no preview (Meta vs. Reps). |
| 9 | Error Recovery | 3 | Desmarcação de check e edição direta de valores são imediatas e sem fricção. |
| 10 | Help and Documentation | 2 | Ausência de dicas contextuais sobre notações de esforço (RPE, RIR, %1RM) para usuários novos. |
| **Total** | | **22/40** | **Acceptable (55%)** |

### Design Specificity Verdict

**LLM assessment**: A interface tem fundações sólidas no vocabulário de musculação e segue a cartilha de cores quentes definida em `PRODUCT.md`. Contudo, peca por transportar um modelo mental de tabela desktop/web para um contexto mobile extremo de 360px e salão de musculação. O modo preview sofre de redundância sintética (Meta repete Reps), enquanto o modo active sofre de compressão geométrica severa (6 colunas espremidas em ~290dp úteis), transformando uma ferramenta que deveria ser rápida e tátil em um exercício de precisão cirúrgica de mira com dedos trêmulos.

**Deterministic scan**: not applicable (native platform)

### Overall Impression
O conceito de registro sem atrito é excelente e o tema visual ("The Warm Iron Sanctuary") é autêntico e agradável. No entanto, a execução das tabelas falha exatamente nas duas promessas mais críticas para o salão de musculação: alvos de toque generosos para mãos cansadas (o checkmark tem apenas 28dp) e leitura instantânea a 50cm de distância (a coluna Anterior é truncada com elipses em 360px).

### What's Working
1. **Cabeçalho Expansível e Contador no ExerciseCard**: A transição entre minimizado ("3/3 séries concluídas ✓" em coral) e expandido economiza espaço vertical valioso e dá clareza de progresso global da sessão.
2. **Badges Semânticas de Séries**: O tratamento cromático diferenciado para séries normais, aquecimento (#FF7A59), falha (#FF6B6B) e drop set (#C084FC) é visualmente intuitivo e ajuda a antecipar o tipo de esforço antes de executar a série.
3. **Controle Rápido de Descanso**: O botão de ciclo de descanso no cabeçalho do card (`Clock` + segundos formatados) permite ajuste ágil sem precisar entrar em menus profundos.

### Priority Issues

- **[P0] Checkmark de conclusão (`checkCircle`) com alvo de toque de 28×28 dp sem `hitSlop`**
  - **Why it matters**: É a ação central mais repetida de toda a sessão de treino. O praticante acabou de completar uma série pesada, com mãos trêmulas e suadas, e precisa acertar um círculo minúsculo de 28dp no canto da tela. O padrão nativo do Android e do próprio `PRODUCT.md` exige touch target mínimo estrito de 48×48 dp.
  - **Fix**: Expandir a área de toque do `checkCircle` para no mínimo 48×48 dp (utilizando `hitSlop` generoso ou redimensionando a coluna para min 48dp de largura útil).
  - **Suggested command**: `/impeccable polish`

- **[P1] Colapso horizontal das 6 colunas em 360px: truncamento severo de "Anterior" e "Meta"**
  - **Why it matters**: Em telas de 360px (largura típica de smartphones compactos Android), após descontar margens de tela (20dp cada lado) e padding do card (14dp cada lado), restam ~290dp úteis. Com 160dp consumidos pelas colunas fixas (Série, Peso, Reps, Check), sobram apenas ~65dp para "Anterior" e ~65dp para "Meta". O texto `"100 kg × 12"` é cortado para `"100 kg × 1..."`, impedindo o atleta de consultar seu histórico imediato para aplicar sobrecarga progressiva.
  - **Fix**: Redesenhar a linha do modo ativo para fundir ou reposicionar o contexto histórico (ex.: colocar o dado anterior como subtexto/placeholder dentro ou logo abaixo dos campos de peso e reps, liberando a largura horizontal para apenas 4 colunas principais).
  - **Suggested command**: `/impeccable adapt`

- **[P1] Alvos de toque verticais dos campos de entrada (`activeBoxInput`) com apenas 30dp de altura**
  - **Why it matters**: Inputs com altura de 30dp violam a diretriz de 48dp de altura mínima. Tocar no campo para corrigir peso ou repetições exige mira visual precisa e interrompe o ritmo do treino.
  - **Fix**: Aumentar a altura dos inputs para no mínimo 40-44dp com área de toque de 48dp, alinhando com as dimensões de `input-field` definidas no `DESIGN.md`.
  - **Suggested command**: `/impeccable polish`

- **[P2] Redundância de informação no modo Preview (Meta vs. Reps duplicados)**
  - **Why it matters**: A coluna "Meta" exibe `formatRepsTarget` (ex: "8–10 reps") e a coluna "Reps" exibe `formatRepsShort` (ex: "8–10") dentro de uma pílula vizinha. São duas colunas exibindo o mesmo número de repetições, desperdiçando 64dp de espaço horizontal e gerando ruído cognitivo desnecessário.
  - **Fix**: Unificar as colunas ou redefinir papéis: coluna 2 para "Meta de Repetições / Esforço" e coluna 3 para "Carga Planejada" (ou remover a coluna Reps e dar destaque ao alvo completo com tipografia Outfit tabular).
  - **Suggested command**: `/impeccable distill`

- **[P2] Cardception e poluição de contornos retangulares (quebra da Flat Tonal Rule)**
  - **Why it matters**: `DESIGN.md` proíbe explicitamente o aninhamento de caixas com bordas ("Don't praticar cardception"). O visual atual empilha cartão com borda (`ExerciseCard`), pílulas com borda (`previewRepsPill`), badges com borda e campos com borda (`activeBoxInput`). Isso cria um visual de "grade de prisão" que distrai da leitura dos números.
  - **Fix**: Remover bordas de elementos internos secundários, adotando preenchimento plano tonal suave (`#2D2925` ou `#38332F`) sem contornos artificiais, reservando borda sutil apenas para o foco do input e para a borda externa do cartão.
  - **Suggested command**: `/impeccable quieter`

### Persona Red Flags

- **Alex (Power User / Atleta Focado em Sobrecarga)**: Ao olhar o celular entre séries de supino, a coluna "Anterior" exibe `"92,5 kg × ..."` truncada. Alex é forçado a clicar no campo ou adivinhar quantas repetições fez na semana passada. Ao tentar confirmar a série, erra o checkmark minúsculo de 28dp e clica sem querer no input de repetições, abrindo o teclado virtual no meio do descanso.
- **Jordan (Iniciante no Salão)**: No modo preview, Jordan olha a tabela e vê "8–10 reps" na coluna Meta e "8–10" dentro de um retângulo cinza na coluna Reps. Fica confuso se são duas coisas diferentes e não encontra onde fica a carga recomendada para iniciar o exercício.
- **Sam (Usuário sob Fadiga / Acessibilidade Motora)**: Mãos trêmulas pós-agachamento pesado. Os alvos de 28dp e 30dp geram múltiplos erros de toque, ativando campos indesejados. Sam precisa de três tentativas para concluir uma série.

### Minor Observations
- `SetTable` possui um bloco de rodapé (`footerRow` com `onAddSet`, `onSwapExercise`, `onOpenExerciseOptions`) totalmente duplicado e morto, pois o `ExerciseCard` já renderiza seu próprio rodapé externo.
- `ExerciseCard` utiliza `borderRadius: 16`, enquanto o `DESIGN.md` padroniza cartões em `radii.card: 24px`.
- Os cabeçalhos de coluna (`headText`) usam `#7D746B` em tamanho 11px, apresentando contraste de apenas 3.2:1 sobre o fundo `#23201D` (falhando no mínimo de 4.5:1 exigido pelo WCAG AA).
- A prop `mode` do `ExerciseCard` padrão é `'preview'`, mas não há distinção visual clara no cabeçalho entre estar em modo de edição de rotina ou em sessão de treino ao vivo.

### Questions to Consider
- E se o modo ativo abandonasse a tabela rígida de 6 colunas e usasse um layout de 4 colunas onde o dado "Anterior" ficasse como marca d'água/subrótulo diretamente acoplado aos campos de Peso e Repetições?
- Por que a carga planejada não aparece no modo Preview quando já existe um peso pré-determinado para o exercício?
- O que impediria o checkmark de ter 48×48 dp completos, ocupando toda a altura da linha como uma zona de toque confortável para o polegar?
