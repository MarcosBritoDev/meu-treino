---
target: src/screens/ProgressScreen.tsx
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ProgressScreen.tsx"
target_fingerprint: "sha256:47ccdb2a013bd7533856032d2e6f4505fc36b4b624ac8f42709c9ff198417f2d"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ProgressScreen.tsx"
timestamp: 2026-11-27T03-05-41Z
slug: src-screens-progressscreen-tsx
---
Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Estado vazio estático exibido permanentemente, sem sincronização com o banco de dados |
| 2 | Match System / Real World | 2 | Cópia técnica ("volume unitário") e ausência de dados reais de progressão |
| 3 | User Control and Freedom | 2 | Sem filtros temporais, sem busca, sem pull-to-refresh e sem navegação de drill-down |
| 4 | Consistency and Standards | 3 | Tokens canônicos respeitados, mas PRBadge utilizado como rótulo decorativo estático |
| 5 | Error Prevention | 2 | Risco alto de falso alarme: usuário com treinos ativos pensa que perdeu seus dados |
| 6 | Recognition Rather Than Recall | 1 | Zero métricas visíveis; usuário é obrigado a lembrar de cabeça seus recordes |
| 7 | Flexibility and Efficiency | 1 | Sem aceleradores, atalhos para exercícios favoritos ou comparações históricas |
| 8 | Aesthetic and Minimalist Design | 3 | Paleta noturna grafite quente correta, porém a tela é vazia em vez de minimalista funcional |
| 9 | Error Recovery | 2 | Sem tratamento de erros de banco ou estado de recuperação |
| 10 | Help and Documentation | 2 | Explicação vaga sobre âmbar sem contextualizar o cálculo de PR e sobrecarga |
| **Total** | | **19/40** | **Poor** |

### Design Specificity Verdict

**LLM assessment**: A tela `ProgressScreen` atual é um protótipo estático (stub) e não uma tela de produto funcional. Embora utilize os componentes base da identidade *Volt Precision Warm* (`ScreenHeader`, `Card`, `Text`, `PRBadge`, `EmptyState`), ela falha no propósito fundamental de um app de musculação focado em sobrecarga progressiva:
1. **Desconexão com a Realidade Local-First**: O app armazena sessões, séries, cargas e recordes no SQLite com Drizzle ORM, mas `ProgressScreen` não executa nenhuma consulta ao banco de dados. Um praticante que acabou de completar seu vigésimo treino e abre a aba "Progresso" se depara com a mensagem "Sem histórico registrado".
2. **Dead End Cognitivo**: O `EmptyState` informa para "completar o primeiro treino", mas não oferece botão para iniciar sessão ou escolher um treino na aba de treinos, gerando abandono.
3. **Ausência de Arquitetura de Informação de Progresso**: Faltam métricas de consolidação semanal/mensal de volume, grade/lista de recordes pessoais (PRs) recentes em âmbar sagrado (`#FFC46B`), evolução de cargas dos exercícios principais (supino, agachamento, terra) e histórico de sessões anteriores.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression
Um placeholder estático numa aba de primeira ordem da navegação. O visual respeita o tema escuro quente e a tipografia do sistema, mas a ausência total de conexão com o banco e a carência de métricas de evolução tornam a tela inútil e enganosa para o usuário ativo.

### What's Working
- **Aderência aos tokens visuais**: Utiliza as cores canônicas (`colors.background`, `colors.primary`), tipografia do design system e estrutura limpa com `ScreenHeader`.
- **Intenção semântica da paleta**: O texto explicativo documenta corretamente que recordes são destacados em âmbar, alinhado à diretriz *The Trophy Amber Rule*.
- **Estrutura de SafeAreaView e ScrollView**: Layout responsivo com espaçamento inferior seguro (`spacing.tabBarHeight + spacing.xl`).

### Priority Issues

- **[P0] Ausência de conexão com o banco de dados (Tela estática/mockada em aba primária)**
  - **Why it matters**: Sendo uma das 4 abas mestras da barra de navegação, a tela ignora completamente as sessões salvas no SQLite. Usuários ativos que entram na aba veem "Sem histórico registrado" e acreditam que seus dados foram corrompidos ou apagados.
  - **Fix**: Integrar consultas SQLite reativas (`useFocusEffect`) para carregar o histórico real de treinos, lista de PRs ativos e totalizadores de volume.
  - **Suggested command**: `/impeccable shape src/screens/ProgressScreen.tsx`

- **[P1] Falta de visualização de métricas e evolução de sobrecarga progressiva**
  - **Why it matters**: A proposta de valor do app é precisão e sobrecarga progressiva. Sem cards de volume acumulado, comparativo semanal, lista de PRs conquistados e atalhos para detalhes de evolução dos exercícios, a aba não entrega utilidade.
  - **Fix**: Adicionar métricas de alto impacto (Volume total do mês/semana, total de treinos concluídos, troféus de PR por exercício com datas) com Outfit tabular.
  - **Suggested command**: `/impeccable layout src/screens/ProgressScreen.tsx`

- **[P1] EmptyState inerte sem chamada para ação (Dead End)**
  - **Why it matters**: No primeiro uso, a mensagem encoraja o usuário a treinar, mas não oferece ação imediata. O usuário precisa adivinhar que deve tocar na aba "Treinos" ou "Início".
  - **Fix**: Adicionar botão de ação primária (pílula coral de 56dp) no `EmptyState` com rótulo "Iniciar um treino" ou "Explorar treinos".
  - **Suggested command**: `/impeccable onboard src/screens/ProgressScreen.tsx`

- **[P2] Ausência de filtros temporais e segmentação**
  - **Why it matters**: À medida que o praticante acumula semanas de treino, uma visualização sem filtros se torna confusa ou sobrecarregada.
  - **Fix**: Implementar `SegmentedControl` ou `Chip` para alternar entre visões (Recordes de carga, Histórico de treinos, Volume por grupo muscular) e períodos (1 mês, 3 meses, Todo o tempo).
  - **Suggested command**: `/impeccable distill src/screens/ProgressScreen.tsx`

- **[P2] Explicação de jargões técnicos e linguagem de domínio**
  - **Why it matters**: O termo "volume unitário são destacados em âmbar" é técnico e pouco intuitivo. Usuários de academia entendem "Carga máxima" e "Recorde de peso × reps".
  - **Fix**: Reformular o texto explicativo para termos práticos e acessíveis em português do Brasil em padrão sentence case.
  - **Suggested command**: `/impeccable clarify src/screens/ProgressScreen.tsx`

### Persona Red Flags
- **Alex (Power User)**: Concluiu semanas de treino e clica em "Progresso" esperando ver seu 1RM estimado e troféus de supino. Ao ver "Sem histórico registrado", acredita que o app apagou seus registros locais. Frustração imediata e risco de abandono.
- **Jordan (First-Timer)**: Chega na tela e lê sobre "volume unitário destacado em âmbar". Não entende o que isso significa e não encontra nenhum botão para iniciar seu primeiro treino a partir do aviso vazio.
- **Riley (Deliberate Stress Tester)**: Completa treinos na sessão ativa, valida que constam na tabela `sessions` e ao voltar para a aba "Progresso", nota que o componente é estático e ignora completamente o SQLite.
- **Sam (Accessibility-Dependent User)**: O leitor de tela lê o card como texto estático e o EmptyState sem controles interativos ou botões focáveis para avançar.

### Minor Observations
- O ícone `Trophy` importado da `lucide-react-native` na linha 19 não está sendo utilizado no JSX.
- O card superior possui título "Recordes pessoais" com o badge "PRs ativos" fixo ao lado, funcionando como adorno em vez de indicador dinâmico.

### Questions to Consider
- Como deve ser a hierarquia principal da tela de Progresso: priorizar a lista de Recordes Pessoais (PRs) no topo ou métricas de volume e consistência semanal?
- Deve haver navegação direta ao tocar em um exercício da lista de recordes para abrir a tela de histórico detalhado (`ExerciseDetailScreen`)?
