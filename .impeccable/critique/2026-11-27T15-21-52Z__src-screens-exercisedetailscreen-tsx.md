---
target: src/screens/ExerciseDetailScreen.tsx e src/screens/NewExerciseScreen.tsx
total_score: 39
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ExerciseDetailScreen.tsx"
target_fingerprint: "sha256:68a0cf06b45e8104a1d0715b7c9c268c54d8a1d5e03e802a3ae4f7bd45775e5f"
target_path: "C:\\Users\\tinho\\Documents\\app treino\\src\\screens\\ExerciseDetailScreen.tsx"
timestamp: 2026-11-27T15-21-52Z
slug: src-screens-exercisedetailscreen-tsx
---
# Critique: ExerciseDetailScreen & NewExerciseScreen (Validação Pós-Refatoração e Consistência)

Method: design review only (detector not applicable, native platform)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Feedback tátil consistente, Outfit tabular em todos os dados e eixos do gráfico de evolução |
| 2 | Match System / Real World | 4 | Vocabulário nativo de musculação (carga, repetições, volume, 2× para halteres, divisão muscular) |
| 3 | User Control and Freedom | 4 | Modais temáticos ConfirmModal padronizados para descarte e exclusão com feedback de segurança |
| 4 | Consistency and Standards | 4 | Altura canônica de 56dp padronizada via Button em ambas as telas, zero elementos descompassados |
| 5 | Error Prevention | 4 | Touch targets >= 48dp garantidos com trilho ergonômico e hitSlop no gráfico de evolução |
| 6 | Recognition Rather Than Recall | 4 | Primeira dobra limpa em 360px: chips essenciais no topo e metadados secundários em linha de apoio |
| 7 | Flexibility and Efficiency of Use | 3 | Filtro temporal rápido no gráfico; histórico de sessões focado e sem ruído de RPE realizado |
| 8 | Aesthetic and Minimalist Design | 4 | Fim do aperto em 360px, zero cardception, safe area perfeita no iOS sem espaços mortos |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 4 | Validação inline de campos obrigatórios, bloqueio de duplicatas e diálogos de confirmação |
| 10 | Help and Documentation | 4 | Dicas posturais técnicas contextualizadas e empty state acolhedor para novos exercícios |
| **Total** | | **39/40** | **Excellent (97.5%)** |

### Design Specificity Verdict

**LLM assessment**: As telas agora atingiram excelência ergonômica e plena maturidade visual dentro do sistema Volt Precision Warm. A visualização de recordes e histórico em `ExerciseDetailScreen` mantém a consagração absoluta do âmbar (#FFC46B) estritamente nos recordes e troféu, com números tabulares em Outfit de alta legibilidade. Os filtros do gráfico agora oferecem alvos de toque seguros e confortáveis (>= 48dp com minHeight de 40dp e hitSlop), e a primeira dobra em 360px respira com folga após a consolidação dos chips secundários em metadados de texto. Em `NewExerciseScreen`, o formulário com safe area corrigida, rolagem folgada, botões de 56dp e ConfirmModal unificado entrega uma experiência sólida, segura e fluida tanto no Android quanto no iOS.

**Deterministic scan**: not applicable (native platform)

### Overall Impression
Refatoração impecável. As inconsistências ergonômicas de safe area, teclado e touch targets foram 100% sanadas sem introduzir quebras ou regressões. O aplicativo ganha um padrão de acabamento tátil de alto nível, pronto para uso em ambiente real de academia.

### What's Working
1. **Consagração absoluta do âmbar (#FFC46B) e Outfit tabular**: O âmbar é exclusivo do troféu e do `PRBadge` histórico. Cargas, repetições, volumes e datas curtas adotam Outfit tabular milimétrico sem poluição em outros cards.
2. **Ergonomia e responsividade em 360px**: A primeira dobra agora exibe de imediato o nome, os chips principais e o Bento Grid completo sem truncamento. Em 360px, o Bento Grid reduz o padding para 12px e escala fontes com `adjustsFontSizeToFit`.
3. **Formulário limpo e padronizado em NewExerciseScreen**: Botões de 56dp (`Button` do sistema), `ConfirmModal` temático para descarte e exclusão, e limite visual inteligente de músculos secundários (até 3 chips + indicador `+N`).

### Priority Issues
- **[P3] Oportunidade de Paginação/Colapso no Histórico Longo**:
  - *What*: Quando o exercício acumular mais de 10 a 15 sessões de treino, a lista vertical pode gerar uma rolagem excessivamente longa.
  - *Why it matters*: Atletas experientes com meses de treino gastam mais tempo rolando para alcançar as dicas técnicas no final da tela.
  - *Fix*: Exibir por padrão as últimas 5 sessões com um botão "Ver histórico completo" ou agrupamento por meses.
  - *Suggested command*: /impeccable layout src/screens/ExerciseDetailScreen.tsx

### Persona Red Flags
- **Alex (Power User)**: Sem impedimentos. Acessa recordes e evolução imediatamente na primeira dobra e consegue alternar períodos no gráfico sem erros de toque.
- **Casey (Mobile com Uma Mão / Mãos Suadas)**: Experiência perfeita. O botão do rodapé está exatamente na zona do polegar (sem o duplo padding inferior no iOS), e os chips do gráfico têm alvos confortáveis.
- **Jordan (Iniciante)**: Compreensão cristalina. Músculo e equipamento são identificados de imediato, enquanto as notas de execução orientam a postura sem jargões confusos.

### Minor Observations
- O SVG do gráfico possui transição vetorial suave e eixos com tipografia nítida.
- O campo de notas de execução em NewExerciseScreen preserva margem inferior suficiente para nunca colidir com o rodapé fixo.

### Questions to Consider
- Deseja manter o histórico de sessões em lista contínua ou prefere limitar a 5 sessões com expansor sob demanda em uma versão futura?
- Gostaria de adicionar um atalho de compartilhamento ou exportação de PR quando o usuário bater um novo recorde pessoal?
