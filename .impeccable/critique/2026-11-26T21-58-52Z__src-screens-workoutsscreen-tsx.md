---
target: src/screens/WorkoutsScreen.tsx
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\WorkoutsScreen.tsx"
target_fingerprint: "sha256:7e171497d00285b03dd4b89fb00bc8528b7a7bd8fe319526880c1916e48981fa"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\WorkoutsScreen.tsx"
timestamp: 2026-11-26T21-58-52Z
slug: src-screens-workoutsscreen-tsx
closed: true
---
Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Estado ativo tem bom indicador com pulso, mas falta clareza rápida de qual treino é a sequência lógica recomendada |
| 2 | Match System / Real World | 3 | Vocabulário correto de academia, mas métricas do topo ("Fichas salvas", "Grupos de treino") soam como contadores de banco de dados |
| 3 | User Control and Freedom | 4 | Excelente controle: expandir/recolher, editar, duplicar, excluir e gerenciar conflito de treino em andamento |
| 4 | Consistency and Standards | 2 | Cartões aninhados com bordas 1px, botões tracejados estilo web desktop e touch targets inconsistentes (30x30, 34x34 vs 48x48) |
| 5 | Error Prevention | 4 | Ótima prevenção: confirmação antes de excluir, detecção de treino em andamento e bloqueio de nomes vazios |
| 6 | Recognition Rather Than Recall | 3 | Exibe prévia de exercícios, mas comprime excessivamente o layout e trunca informações vitais em 360px |
| 7 | Flexibility and Efficiency | 2 | Leitura lenta no salão de musculação: cards muito altos (160dp+) forçam scroll longo para achar treinos como C ou D |
| 8 | Aesthetic and Minimalist Design | 1 | "Cardception" severo (cartões dentro de cartões), bordas em tudo, métricas de vaidade ocupando o topo e itálicos desnecessários |
| 9 | Error Recovery | 3 | Toasts pontuais e preservação transparente do histórico ao excluir grupos |
| 10 | Help and Documentation | 3 | Estado vazio bem trabalhado com dica de periodização e criação guiada do modelo PPL |
| **Total** | | **27/40** | **Acceptable** |

### Design Specificity Verdict

**LLM assessment**: A tela possui boa identidade de cores e tipografia (Volt Precision Warm), mas a composição estrutural foi transplantada de um dashboard web analítico: blocos de métricas com ícones quadrados no topo, um "super-card" para o grupo ativo contendo outros cards internos para cada treino, bordas de 1px desenhadas ao redor de quase todos os blocos e até um botão com borda tracejada (`dashed`), típico de interfaces desktop. No ambiente de treino, onde o praticante precisa de visualização rápida e escaneabilidade em menos de 2 segundos, a densidade visual e o aninhamento de caixas pesam contra a ergonomia nativa do Android.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression

A base funcional e os fluxos de banco de dados do Volt Precision são sólidos e completos, mas a interface sofre de **"cardception"** (cartões dentro de cartões) e mentalidade de dashboard web. No mobile, especialmente em 360px e 390px, metade do primeiro viewport é consumida por métricas decorativas e molduras visuais, deixando apenas 1 ou 1.5 treinos visíveis por vez.

---

### O Que Faz Parecer "Cartão de Web" ou Poluída

1. **Cardception (Aninhamento multinível de caixas com bordas)**:
   - Um cartão externo (`activeGroupCard`) com fundo `surfaceContainer`, borda coral e raio de 24px.
   - Dentro dele, cada treino é outro cartão completo (`workoutItemCard`) com fundo `surfaceContainerHigh`, borda `outlineVariant` e raio de 24px.
   - Dentro de cada treino, há uma caixa quadrada com raio de 8px para a letra/código (`workoutCodeBox`).
   - Essa estrutura de "caixa dentro de caixa" com bordas de 1px em tudo é o clássico padrão de painéis administrativos web, e cria ruído visual desnecessário no mobile escuro.
2. **Linha de acento decorativa superior (Top Accent Stripe)**:
   - A barra de 2px no topo do card (`activeGroupAccentLine`) com opacidade de 0.8 é um padrão popularizado por cartões de dashboard web (ex.: Stripe/Tailwind UI), incomum e redundante em Material Design 3.
3. **Botão com borda tracejada (`dashed`)**:
   - `addWorkoutToGroupButton` utiliza `borderStyle: 'dashed'` e fundo cinza elevado. Em web é comum para upload de arquivos ou inserção de cards em Kanban, mas em mobile nativo soa como componente web cru ou rascunho.
4. **Métricas de vaidade no topo (KPI Dashboard Cards)**:
   - Dois cartões no topo ocupando ~90dp de altura apenas para exibir "1 grupo / Grupos de treino" e "3 treinos / Treinos montados". Nenhum atleta na academia precisa de um painel de indicadores sobre a quantidade de treinos que possui salvos.

---

### Onde Há Desperdício de Espaço Vertical

1. **Topo da tela (primeiros 270dp bloqueados)**:
   - Header (56dp) + Métricas (90dp) + Cabeçalho do Grupo Ativo (120dp com badge, título grande, frequência e descrição).
   - O primeiro treino real só começa a aparecer abaixo da metade da tela de um smartphone de 360×780dp.
2. **Altura excessiva por treino (~170dp por ficha)**:
   - Cada `workoutItemCard` gasta espaço com 4 linhas verticais:
     1. Linha do título, código e botões.
     2. Linha de resumo: "18 séries · ~55 min • 5 exercícios".
     3. 3 linhas inteiras listando exercícios prévios ("Supino Reto...").
     4. Linha "+N exercícios".
   - Um grupo com 3 ou 4 treinos (PPL ou ABCD) exige múltiplos scrolls completos para visualização.
3. **Card de treino avulso no rodapé (76dp+)**:
   - O banner "Treino avulso ou rápido?" tem altura generosa com ícone 44x44, ocupando espaço fixo que poderia ser um item contextual de lista ou botão compacto.

---

### O Que Atrapalha a Leitura Rápida no Treino (Mobile 360px e 390px)

1. **Sobrecarga de texto e tipografia em itálico**:
   - A prévia de 3 exercícios dentro de cada card (`workoutPreviewText`) usa `fontStyle: 'italic'` e cor secundária atenuada. Na tela do celular sob iluminação de academia, texto pequeno em itálico tem baixa legibilidade e gera poluição visual.
2. **Touch targets subdimensionados e colados**:
   - O botão de edição (ícone de lápis) mede apenas 30×30dp e fica a 6dp do botão "Iniciar". O padrão mínimo para Android (Material) é 48×48dp com 8dp de separação. Com mãos trêmulas ou suadas após uma série pesada, o risco de toque acidental é real.
   - Os ícones de menu (`MoreVertical`) e expansão (`ChevronUp/Down`) medem 34×34dp, também abaixo dos 48dp mínimos.
3. **Truncamento agressivo em telas compactas (360px)**:
   - Em 360px, o card de treino tem apenas 296dp de largura interna. O lado direito consome ~110dp (Lápis + Iniciar), restando apenas ~140dp para o código, nome do treino e músculos-alvo. O texto `targetMuscles` é cortado com reticências imediatamente.
   - As métricas no topo ficam com apenas ~158dp de largura por coluna, espremendo os rótulos secundários.

---

### What's Working

- **Selo de status do grupo ativo**: A pílula coral com ponto indicador (`activeDot`) comunica de imediato qual divisão de treino está em vigor.
- **Hierarquia de chamada para ação no botão Iniciar**: O botão "Iniciar" como pílula coral com ícone de Play dá foco claro à ação principal do card.
- **Tratamento do estado vazio (3.2)**: A ilustração customizada com o botão direto de semear o PPL padrão é acolhedora e acelera o primeiro uso sem frustração.

---

### Priority Issues

#### [P1] "Cardception" e acúmulo de bordas no layout
- **Why it matters**: A sobreposição de cartões com bordas e fundos em camadas rouba largura útil (especialmente em 360px), cansa a vista e dá ao app uma aparência pesada de dashboard web antigo.
- **Fix**: Remover o container de cartão externo do grupo ativo ou simplificá-lo como um cabeçalho de seção nativo (Group Section Header). Transformar os treinos em linhas de lista limpas com separadores sutis ou elevação tonal sem bordas pesadas. Substituir o botão tracejado por um botão de ação de lista nativo ou FAB.
- **Suggested command**: `/impeccable distill src/screens/WorkoutsScreen.tsx`

#### [P1] Desperdício de espaço vertical com métricas de vaidade
- **Why it matters**: Consome ~90dp do topo com informações que não apoiam nenhuma decisão imediata do treino, empurrando as fichas reais para fora da primeira dobra da tela.
- **Fix**: Eliminar os dois cartões de métricas (`metricsRow`) ou convertê-los em um contador contextual inline discreto no subtítulo do cabeçalho (ex.: "Meus treinos • 3 fichas").
- **Suggested command**: `/impeccable layout src/screens/WorkoutsScreen.tsx`

#### [P1] Lista de exercícios inline inflando o card de treino
- **Why it matters**: Listar 3 exercícios em itálico mais a tag "+X exercícios" adiciona ruído visual desnecessário para quem só quer identificar qual treino fará hoje ("Push A" vs "Pull B").
- **Fix**: Manter o card do treino compacto: Nome, músculos-alvo e resumo métrico ("18 séries · ~55 min"). Deixar o detalhamento completo dos exercícios para o clique/toque de prévia ou para a tela de detalhes.
- **Suggested command**: `/impeccable clarify src/screens/WorkoutsScreen.tsx`

#### [P2] Touch targets subdimensionados e botões colados
- **Why it matters**: Botão de editar com 30×30dp viola a diretriz de 48×48dp do Android, gerando frustração motora no salão de musculação.
- **Fix**: Aumentar a área de toque para 48×48dp (utilizando `hitSlop` ou padding adequado) e unificar o toque do card para abrir a prévia/edição, deixando apenas o botão "Iniciar" como ação explícita.
- **Suggested command**: `/impeccable polish src/screens/WorkoutsScreen.tsx`

---

### Persona Red Flags

- **Alex (Impatient Power User / Lifter)**:
  - *Red flag*: Entra no app pronto para treinar, mas precisa rolar a tela duas vezes para encontrar o "Treino C" porque o topo está ocupado por cartões de estatísticas e cada card de treino tem 170dp de altura.
  - *Frustração*: Botão de Iniciar pequeno e colado no botão de editar, com risco de abrir a tela de edição por engano.
- **Jordan (First-Timer)**:
  - *Red flag*: Fica confuso com a quantidade de bordas e informações concorrentes (código da ficha, músculos, séries, minutos, lista de exercícios em itálico).
  - *Frustração*: O botão tracejado "+ Adicionar treino ao grupo" parece desabilitado ou um rascunho de desenvolvimento.
- **Sam (Acessibilidade / Motor)**:
  - *Red flag*: Botões de ação secundária de 30×30dp e 34×34dp causam falhas de toque frequentes com mãos trêmulas pós-treino ou em usuários com destreza reduzida.

---

### Minor Observations

- A letra do treino (`workoutCodeBox`, ex.: "A") fica duplicada visualmente quando o treino já se chama "Push A".
- O botão "+ Novo grupo" no cabeçalho superior disputa atenção com o ícone de Ajustes e espreme o título "Meus treinos" em telas de 360px.
- O card de "Treino avulso" no final da lista pode ser facilmente ignorado quando o usuário tem múltiplos grupos e a tela fica longa.

---

### Questions to Consider

- E se a lista de treinos mostrasse 3 a 4 treinos inteiros na primeira tela sem necessidade de scroll?
- As métricas de "total de grupos" e "total de treinos" agregam algum valor real a quem está no meio da academia?
- O que aconteceria se o toque em qualquer parte do card abrisse a prévia/edição, deixando apenas o botão "Iniciar" como ação dedicada?
