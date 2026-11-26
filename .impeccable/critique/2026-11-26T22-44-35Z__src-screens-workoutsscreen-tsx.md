---
target: src/screens/WorkoutsScreen.tsx
total_score: 38
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\WorkoutsScreen.tsx"
target_fingerprint: "sha256:4499cefbf768b200669f46f63238c3cd14c0327d0b35983ef7b323a172618cc6"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\WorkoutsScreen.tsx"
timestamp: 2026-11-26T22-44-35Z
slug: src-screens-workoutsscreen-tsx
---
Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Selo "Ativo" com ponto indicador, crachá "Próximo" integrado ao histórico de sessões e feedback tátil/visual imediato em todos os controles |
| 2 | Match System / Real World | 4 | Vocabulário 100% alinhado à rotina do salão de musculação; eliminação de contadores de vaidade no topo |
| 3 | User Control and Freedom | 4 | Controle completo e fluido: expandir/recolher, editar, duplicar, excluir e gerenciar conflitos de sessões em andamento |
| 4 | Consistency and Standards | 4 | Padrão nativo Android exemplar: touch targets >= 48dp com hitSlop, botões pílula consistentes e paleta Volt Precision Warm estrita |
| 5 | Error Prevention | 4 | Confirmações para ações destrutivas, proteção contra sobreposição de treinos e espaçamento seguro contra toques acidentais |
| 6 | Recognition Rather Than Recall | 4 | Resumo tabular em Outfit, músculos-alvo visíveis e selo "Próximo" que elimina a necessidade de memorizar a ordem do ciclo |
| 7 | Flexibility and Efficiency | 4 | Três treinos inteiros visíveis na primeira dobra da tela (360px e 390px); início imediato em 1 toque |
| 8 | Aesthetic and Minimalist Design | 4 | Minimalismo sóbrio tátil: sem cardception, sem bordas pesadas, sem métricas desnecessárias e sem itálicos |
| 9 | Error Recovery | 3 | Diálogos modais claros preservando o histórico e toasts informativos em todas as operações |
| 10 | Help and Documentation | 3 | Estado vazio acolhedor com ilustração, gerador de modelo PPL em 1 toque e dica de periodização |
| **Total** | | **38/40** | **Excellent** |

### Design Specificity Verdict

**LLM assessment**: A tela atingiu o padrão de excelência artesanal (*out-of-distribution craft*) estabelecido para o *Volt Precision Warm*. A remoção dos blocos de métricas de vaidade do topo (`metricsRow`) libertou o layout de qualquer resquício de dashboard web. Agora, ao abrir o aplicativo na academia, o atleta vê imediatamente o cabeçalho do grupo ativo seguido das 3 fichas completas de treino (Push, Pull e Legs) na primeira dobra em smartphones compactos (360px) e padrão (390px). O selo "Próximo" em coral guia a ação prioritária sem hesitação. A introdução do cabeçalho de seção "Outras divisões" resolveu a ambiguidade hierárquica dos grupos inativos, e a paleta de cores agora respeita rigorosamente a Regra de Ouro do Âmbar (estritamente exclusivo para PRs).

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression

A tela [WorkoutsScreen.tsx](file:///c:/Users/tinho/Documents/app%20treino/src/screens/WorkoutsScreen.tsx) passou de uma interface aceitável com sobrecarga de caixas e estética web para uma experiência mobile de referência: ultradensa, legível em menos de 2 segundos sob luz de academia e ergonômica para operação com uma mão só.

### What's Working

- **Primeira Dobra Completa**: A supressão dos cartões de métricas do topo trouxe o primeiro treino para a altura dos olhos e permitiu que uma divisão inteira de 3 fichas caiba sem rolagem em telas de 360×780dp.
- **Hierarquia Clara ("Outras divisões")**: Grupos secundários inativos são claramente separados da rotina ativa através do cabeçalho de seção dedicado.
- **Respeito aos Tokens de Design**: Correção das ocorrências de âmbar para coral, mantendo o `#FFC46B` consagrado exclusivamente para conquistas e recordes (PRs).
- **Ergonomia e Confiabilidade Motora**: Todos os controles interativos (botão "Iniciar", menu, expansão, novo grupo e ajustes) operam com áreas de toque efetivas de 52 a 56dp, com feedback tátil e de pressão.

### Priority Issues

#### [P2] Acesso ao treino avulso no final da rolagem
- **Why it matters**: Em cenários onde o usuário possui múltiplos grupos expandidos, o cartão "Treino avulso ou rápido?" fica no rodapé do ScrollView.
- **Fix**: Avaliar no futuro um atalho rápido no menu superior de opções ou um chip secundário caso o uso de treinos livres se torne frequente para o usuário.
- **Suggested command**: `/impeccable clarify src/screens/WorkoutsScreen.tsx`

### Persona Red Flags

- **Alex (Impatient Power User / Lifter)**:
  - *Veredito*: Zero atrito. Entra no app, bate o olho no selo "Próximo" em "Push A" no topo da tela e toca em "Iniciar" em menos de 1 segundo. Nenhuma rolagem necessária para iniciar a rotina.
- **Jordan (First-Timer)**:
  - *Veredito*: A interface é límpida e acolhedora. O modelo PPL padrão pode ser gerado em um único toque se não houver treinos cadastrados.
- **Sam (Ergonomia / Motor)**:
  - *Veredito*: Áreas de toque confortáveis (>= 48dp) e separação física entre abrir prévia e iniciar treino evitam cliques falsos mesmo com fadiga extrema pós-série.

### Minor Observations

- A transição visual ao recolher e expandir o grupo é suave e mantém a estabilidade do layout.
- A tipografia Outfit tabular nos números métricos (`5 exercícios · 18 séries · ~55 min`) garante alinhamento visual preciso.

### Questions to Consider

- Deseja manter esta tela estável e avançar para o refinamento da tela de execução ativa (`ActiveSessionScreen`) ou da prévia do treino (`EditWorkoutScreen`)?
