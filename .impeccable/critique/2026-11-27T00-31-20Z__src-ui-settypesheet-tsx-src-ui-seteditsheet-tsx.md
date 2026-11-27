---
target: src/ui/SetTypeSheet.tsx src/ui/SetEditSheet.tsx
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\ui\\SetTypeSheet.tsx src\\ui\\SetEditSheet.tsx"
timestamp: 2026-11-27T00-31-20Z
slug: src-ui-settypesheet-tsx-src-ui-seteditsheet-tsx
---
### Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Feedback tátil presente, mas sem estado de foco visual destacado nos inputs e sem indicador de alterações pendentes |
| 2 | Match System / Real World | 2 | Jargões com parênteses em inglês nos dropdowns ("Reps Range", "Time Range") vazam da especificação para a interface PT-BR |
| 3 | User Control and Freedom | 2 | Botão "Remover série" destrutivo sem confirmação; ausência de botão "Cancelar" na zona inferior do polegar |
| 4 | Consistency and Standards | 2 | Divergência de modelo mental entre SetTypeSheet (RPE/RIR como tipo primário) e SetEditSheet (RPE/RIR como sub-esforço); cores fora da paleta (azul/roxo) |
| 5 | Error Prevention | 2 | Exclusão de série imediata com 1 toque logo abaixo de "Aplicar"; falta de validação de campo vazio nos text inputs |
| 6 | Recognition Rather Than Recall | 3 | Presets de descanso e drop ajudam, mas o menu dropdown esconde 8 opções de esforço em lista recolhida |
| 7 | Flexibility and Efficiency | 2 | Steppers sem incremento contínuo por pressão prolongada (long-press); exige dezenas de toques individuais |
| 8 | Aesthetic and Minimalist Design | 2 | SetEditSheet sobrecarregado (5 seções, múltiplos inputs, cards aninhados); faltam tokens Outfit tabular e DM Sans |
| 9 | Error Recovery | 2 | Sem mecanismo de desfazer (Undo) para série apagada acidentalmente |
| 10 | Help and Documentation | 3 | Textos de apoio contextuais e discretos para drop set e falha são objetivos e claros |
| **Total** | | **23/40** | **Acceptable (57.5%)** |

---

### Design Specificity Verdict

**LLM assessment**: Os componentes foram desenvolvidos com boa intenção para o domínio de musculação (apoio a RPE, RIR, drop sets com cálculo automático de -20%, descansos padronizados), mas apresentam fortes sinais de fragmentação arquitetural e de "desenho por especificação técnica" em vez de desenho ergonômico focado no atleta em treino. O `SetTypeSheet` adota uma grade visual 2×3 rápida e legível, porém usa cores de acento externas ao design system (azul celeste `#38BDF8` e roxo `#C084FC`, em violação direta à *Warm Night Rule* do `DESIGN.md`). Já o `SetEditSheet` sofre de densidade excessiva e fadiga de controles: combina chips, steppers, dropdowns com rolagem interna aninhada (`StyledDropdown`), campos numéricos livres e botão destrutivo, sem hierarquização visual clara. Crucialmente, faltam os pilares tipográficos do Volt Precision: nenhum dos números usa `Outfit` com algarismos tabulares (`tabular-nums`), e os alvos de toque descumprem gravemente a regra nativa do Android de 48×48 dp (botões de fechar e steppers com 30–32 dp).

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

---

### Overall Impression

Ambos os sheets resolvem a lógica funcional do treino, mas falham no teste real do salão de musculação: um atleta entre séries, ofegante e com mãos suadas, terá grande dificuldade de acertar botões de stepper de 30dp, navegará por menus dropdown complexos em vez de controles diretos, e corre o risco iminente de apagar uma série ao errar o botão "Aplicar" por milímetros.

---

### What's Working

1. **Apoio contextual a regras de domínio**: As mensagens auxiliares explicativas (ex.: "Drop exige uma série de trabalho antes dele", "-20% da anterior") orientam o usuário exatamente no momento da decisão sem poluir a tela.
2. **Presets rápidos de descanso e porcentagem de drop**: O uso de chips pré-calculados (0s, 30s, 60s, 90s, 120s, 180s e -15%, -20%, -25%, -30%) reduz o atrito motor para as escolhas mais comuns.
3. **Feedback háptico integrado**: Chamadas consistentes a `triggerHaptic('selection')` e `triggerHaptic('light')` proporcionam confirmação tátil crucial para interfaces móveis em uso ativo.

---

### Priority Issues

- **[P0] Alvos de toque minúsculos (30–32 dp) violando o padrão Android de 48×48 dp**  
  *Why it matters*: Botões de fechar (32×32 dp), botões `+`/`-` dos steppers (30×30 dp), chips de descanso/RPE (~30 dp de altura) e campos de texto (32–34 dp) são difíceis de acionar sob fadiga física, gerando toques fantasmas e frustração extrema.  
  *Fix*: Redimensionar todos os controles interativos para altura mínima de 48 dp (ou adicionar `hitSlop`), e converter os steppers para o componente circular de 48×48 dp previsto em `DESIGN.md`.  
  *Suggested command*: `/impeccable adapt`

- **[P1] Exclusão destrutiva acidental ("Remover série") sem diálogo de confirmação**  
  *Why it matters*: O botão "Remover série" está imediatamente adjacente a "Aplicar". Um toque impreciso deleta a série instantaneamente, sem confirmação e sem opção de desfazer, destruindo o histórico recém-anotado do exercício.  
  *Fix*: Inserir `Alert.alert` de confirmação nativo antes de disparar `onRemove`, ou exigir confirmação em dois toques com cor e espaçamento de segurança.  
  *Suggested command*: `/impeccable harden`

- **[P1] Inconsistência de modelo mental entre SetTypeSheet e SetEditSheet**  
  *Why it matters*: No `SetTypeSheet`, RPE e RIR são tipos de série de primeira classe ("Por RPE", "Por RIR"). No `SetEditSheet`, os tipos são apenas 4 (Aquecimento, Normal, Falha, Drop), e RPE/RIR foram rebaixados a um dropdown secundário dentro de Normal. Isso quebra a continuidade cognitiva do usuário.  
  *Fix*: Harmonizar o modelo mental entre as duas telas: ou RPE/RIR são tipos diretos de série, ou são metas de esforço de série normal em ambos os pontos de entrada.  
  *Suggested command*: `/impeccable distill`

- **[P1] Violação das diretrizes visuais e tipográficas (Warm Night Rule & Outfit Tabular)**  
  *Why it matters*: O uso de azul (`#38BDF8`), roxo (`#C084FC`) e cinzas iOS (`#A1A1A6`, `#636366`) quebra a identidade acolhedora do Volt Precision Warm. Além disso, a ausência de `Outfit` tabular nos steppers faz os números oscilarem de largura e perderem impacto visual.  
  *Fix*: Eliminar tons frios e adotar os tokens de superfície/coral da marca; aplicar `fontFamily: 'Outfit'`, `fontWeight: '700'` e `fontVariant: ['tabular-nums']` nos valores de carga, repetições e tempos.  
  *Suggested command*: `/impeccable colorize`

- **[P2] Ausência de KeyboardAvoidingView e tratamento de insets nativos**  
  *Why it matters*: Ao focar nos campos de entrada numéricos de incremento ou porcentagem customizada de drop, o teclado virtual cobre a parte inferior do sheet e o botão "Aplicar" em dispositivos Android compactos. Além disso, a margem inferior fixa de 28 dp pode conflitar com a barra de navegação por 3 botões do sistema.  
  *Fix*: Envolver o conteúdo em `KeyboardAvoidingView` e aplicar insets dinâmicos via `react-native-safe-area-context`.  
  *Suggested command*: `/impeccable adapt`

---

### Persona Red Flags

- **Alex (Power User focado em sobrecarga progressiva)**: Fica bloqueado no stepper: para ajustar tempo de 30s para 90s precisa tocar 12 vezes individualmente, pois não há repetição contínua por toque longo. Ao cadastrar uma série como "Por RPE" no `SetTypeSheet`, fica confuso ao reabri-la e vê-la marcada como "Normal". Risco alto de abandonar a edição detalhada.
- **Jordan (Praticante iniciante no salão)**: Abre o dropdown de esforço no `SetEditSheet` e se depara com termos técnicos em inglês misturados ("Reps Range", "Time Range", "% de 1RM de X Exercício"), ficando inseguro sobre qual opção escolher. Quase toca em "Remover série" ao tentar salvar.
- **Sam (Usuário dependente de acessibilidade e precisão motora)**: Não consegue acionar com segurança os botões de stepper de 30×30 dp nem os chips compactos. Leitores de tela no Android (TalkBack) encontram dropdown customizado com rolagem aninhada que não anuncia adequadamente o estado de expansão padrão do sistema operacional.

---

### Minor Observations

- No `SetTypeSheet`, a animação do modal é `fade`, enquanto em `SetEditSheet` é `slide`. Devem padronizar para `slide` com alça de arrasto.
- O `backdrop` em ambos os sheets tem `accessibilityLabel="Fechar"`, mas não define `accessibilityRole="button"`.
- Textos em inglês entre parênteses nos dropdowns devem ser removidos em favor de português natural (ex.: "Faixa de repetições", "Tempo em segundos").
- O botão `X` de fechar no topo direito é redundante com o toque no backdrop e o botão de voltar nativo do Android, mas se mantido, deve ter 48×48 dp.

---

### Questions to Consider

- O usuário realmente precisa de um dropdown de 8 modos de esforço durante o treino, ou a maioria absoluta usa apenas RPE ou carga fixa?
- Faz sentido manter dois sheets separados (`SetTypeSheet` e `SetEditSheet`), ou um único sheet progressivo atenderia tanto a criação quanto a edição?
- Como garantir que o atleta nunca perca dados por um toque acidental entre os botões de ação?
