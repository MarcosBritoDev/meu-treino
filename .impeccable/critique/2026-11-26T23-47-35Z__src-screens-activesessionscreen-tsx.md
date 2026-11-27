---
target: src/screens/ActiveSessionScreen.tsx
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ActiveSessionScreen.tsx"
target_fingerprint: "sha256:783295099b1b1646ce4074df2678cf7afd9979c3d81146bd9fa372b794ba9671"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ActiveSessionScreen.tsx"
timestamp: 2026-11-26T23-47-35Z
slug: src-screens-activesessionscreen-tsx
---
# Critique: src/screens/ActiveSessionScreen.tsx

Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Timer e descanso claros; risco de overflow em durações longas no cabeçalho em 360px |
| 2 | Match System / Real World | 4 | Excelente vocabulário de treino ("Série", "Anterior", "Descanso", "Anilhas", "Pular") |
| 3 | User Control and Freedom | 4 | Fácil alternar conclusão de séries, ajustar descanso (-15s/+30s) e cancelar |
| 4 | Consistency and Standards | 3 | Alvos de toque despadronizados: 30dp na barra superior e 42dp nos inputs vs 48dp no rodapé |
| 5 | Error Prevention | 3 | Botão de pausa (30dp) colado a 10px do botão Finalizar; perigo de toque acidental com mãos trêmulas |
| 6 | Recognition Rather Than Recall | 4 | Coluna anterior com carga × reps exibida diretamente abaixo da meta da série |
| 7 | Flexibility and Efficiency | 3 | Entrada rápida disponível, mas inputs com altura 42dp reduzem eficiência sob fadiga |
| 8 | Aesthetic and Minimalist Design | 4 | Tema Volt Precision Warm sóbrio, números tabulares Outfit nítidos sem poluição visual |
| 9 | Error Recovery | 4 | Desmarcação instantânea de séries com retorno de PR e confirmação ao finalizar incompleto |
| 10 | Help and Documentation | 3 | Placeholders contextuais claros para notas de exercício e sessão |
| **Total** | | **32/40** | **Good** |

### Design Specificity Verdict

**LLM assessment**: A tela possui forte identidade voltada para musculação ("The Warm Iron Sanctuary"), com tipografia tabular em Outfit, contraste escuro acolhedor (#1A1715) e foco absoluto no registro ágil de séries. Contudo, em dispositivos compactos de 360px (muito comuns no mercado Android brasileiro de entrada), a densidade horizontal da tabela comprime a coluna "Meta e anterior" para ~104px, gerando truncamento de esforço (RPE/Drop). Além disso, a ergonomia da barra superior não respeita o padrão de 48dp para uso no salão com mãos suadas.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression
A arquitetura visual da sessão ativa é extremamente competente e focada em performance atlética. O rodapé de descanso flutuante (`RestFooter`) resolve perfeitamente a leitura do cronômetro regressivo com botões de 48dp. Os pontos críticos residem no cabeçalho superior (touch targets subdimensionados e proximidade arriscada entre Pausar e Finalizar), no aperto da coluna de meta em 360px e na ausência de insets dinâmicos de safe area inferior para a barra de navegação do sistema Android.

### What's Working
1. **Rodapé de descanso (`RestFooter`) ergonômico e sem quebra**: Os botões de ajuste (−15s e +30s com 56×48dp) e pular (70×48dp) mantêm o padrão mínimo de 48dp na zona do polegar, com `flexWrap: 'nowrap'` estável em 360px e 390px.
2. **Visualização de carga/reps anteriores no fluxo da série**: Apresentar `Ant: 80 kg × 10` sob a meta evita que o praticante precise alternar telas ou recorrer à memória durante a fadiga física.
3. **Checkmark com feedback háptico e hitSlop ampliado**: O gatilho de conclusão possui hitSlop que expande a área de toque para 60×58dp, garantindo registro confiável.

### Priority Issues

- **[P1] Touch targets subdimensionados na barra superior (< 48dp) e risco de toque acidental**
  - **Why it matters**: Os botões de ferramentas ("Descanso", "Anilhas"), pílula do cronômetro (30dp) e botão "Finalizar" (30dp) possuem altura inferior aos 48dp mínimos exigidos pela ergonomia Android e pelo DESIGN.md. No salão, com dedos suados e tremor pós-esforço, há risco real de tocar em "Finalizar" ao tentar apenas pausar/retomar o cronômetro (distância de apenas 10px).
  - **Fix**: Elevar a altura de toque para 48dp com `hitSlop` ou padding estrutural, separar claramente a pílula do timer do botão Finalizar e aplicar espaçamento de segurança (mínimo 16dp).
  - **Suggested command**: `/impeccable adapt src/screens/ActiveSessionScreen.tsx`

- **[P1] Truncamento da coluna "Meta e anterior" em telas estreitas de 360px**
  - **Why it matters**: Em 360px, descontando margens laterais (32px), padding do cartão (28px) e colunas fixas de série, carga, reps e check (196px), restam apenas ~104px para a coluna central. Metas descritivas como `8-10 reps • RPE 8` ou `10 reps • -20% drop` sofrem elipse e truncamento, forçando o usuário a adivinhar o RPE planejado.
  - **Fix**: Otimizar a distribuição horizontal em 360px: reduzir a coluna de série para 28px, carga para 56px, reps para 48px, liberando ~120px para a meta, ou permitir quebra sutil de 2 linhas dedicadas (uma para Reps/Esforço e outra para Histórico Anterior).
  - **Suggested command**: `/impeccable layout src/ui/session/SetTable.tsx`

- **[P2] Inset inferior do rodapé flutuante vulnerável à barra de navegação do Android**
  - **Why it matters**: O `RestFooter` usa `bottom: 12` fixo e a `SafeAreaView` da tela ativa declara apenas `edges={['top', 'left', 'right']}`. Em aparelhos Android com barra de navegação por 3 botões ou pílula gestual, o rodapé de descanso pode sobrepor os botões do sistema, causando acionamento involuntário da tela inicial ao tentar apertar "−15 s" ou "Pular".
  - **Fix**: Integrar `useSafeAreaInsets().bottom` dinamicamente no cálculo do `bottomOffset` do `RestFooter` e somar ao padding inferior do `ScrollView` quando o timer estiver ativo.
  - **Suggested command**: `/impeccable adapt src/screens/ActiveSessionScreen.tsx`

- **[P2] Altura dos inputs numéricos na tabela de séries abaixo de 48dp (42dp)**
  - **Why it matters**: As caixas de texto de carga e repetições (`activeBoxInput`) têm altura de 42dp. Embora aceitáveis visualmente, no ambiente de musculação exigem precisão motora desnecessária para focar e abrir o teclado ou number pad.
  - **Fix**: Elevar `minHeight` do input para 46–48dp e garantir padding vertical neutro sem alterar o alinhamento da linha de 52dp.
  - **Suggested command**: `/impeccable polish src/ui/session/SetTable.tsx`

### Persona Red Flags

- **Lucas (Atleta focado/suado no salão)**:
  - Ao concluir a última série de agachamento com as mãos trêmulas, tenta pausar o cronômetro no topo direito da tela (altura 30dp) e quase encosta no botão "Finalizar" a 10px de distância.
  - Ao iniciar o descanso, o rodapé surge a 12px da borda inferior e colide visualmente com a barra gestual do seu Galaxy A54 (360px de largura).
- **Alex (Power User focado em sobrecarga)**:
  - Em seu aparelho com largura de 360px, o texto da série "10 reps • RPE 8" trunca para "10 reps • RP...", impedindo a leitura imediata do esforço sem tocar na linha.
  - Tenta clicar rapidamente no campo de peso e erra o toque devido aos 42dp de altura da caixa de texto.
- **Sam (Acessibilidade / Baixa Visão no Salão)**:
  - Com escala de fonte em 120%, o cabeçalho superior estoura a largura útil de 328px (101px à esquerda + 213px à direita = 314px base, ultrapassando 350px com fonte ampliada).

### Minor Observations
- O `ScrollView` tem `paddingBottom: restActive ? 140 : 40`. Quando `restActive` é false, 40px é suficiente, mas caso o timer dispare automaticamente ao marcar uma série perto do fim da tela, o rodapé pode cobrir temporariamente o conteúdo até o usuário rolar manualmente.
- No `RestFooter`, o display numérico `time` com 28px Outfit Bold tabular ocupa ~80px. Em 360px sobram ~90px para ele, funcionando sem quebras, mas com margem de segurança de apenas 10px.
- O botão "Adicionar notas aqui…" no meta-section tem texto em itálico com 13px e contraste atenuado (#8E8E93), com leitura difícil sob luz fluorescente direta de academia.

### Questions to Consider
- O botão "Finalizar treino" precisa disputar espaço no cabeçalho superior ou deveria residir como ação de fechamento clara ao final da lista ou em posição inferior ergonômica?
- Por que manter os botões de ferramentas secundárias ("Descanso" e "Anilhas") no cabeçalho superior quando o descanso já possui automação e rodapé próprio, e a calculadora de anilhas já existe dentro de cada exercício?
