# Volt Precision — App de Registro de Treinos de Musculação

App mobile de registro de treinos de musculação, 100% offline, sem conta, sem rede, sem telemetria.
Idioma da interface: Português do Brasil, sempre em sentence case (nunca caixa alta).

---

## Prompt Original da Etapa 0 (Fundação)
```
Você é um engenheiro mobile sênior. Vamos construir o "Volt Precision", app de registro de treinos de musculação, 100% offline, sem conta, sem rede, sem telemetria. Idioma da interface: português do Brasil, sempre em sentence case (nunca caixa alta).

STACK: React Native + Expo (SDK atual), TypeScript estrito, expo-sqlite + Drizzle ORM, Zustand, React Navigation (bottom tabs + native stack), react-native-reanimated e gesture-handler, expo-haptics, expo-keep-awake, fontes Outfit e DM Sans via expo-font, ícones Lucide (lucide-react-native, traço 1.75).

ENTREGUE:
1. Tokens de design em src/theme (cores, tipografia, raios, espaçamento) copiados do arquivo volt_precision_warm/DESIGN.md. Use os valores da seção em prosa: fundo #1A1715; cartões #23201D e #2D2925; campos #38332F; borda #3A3531 1px; primária #FF7A59 com texto #1A1715; pressed #E8654A; tint coral #3A251F; âmbar #FFC46B somente para PR; textos #F5EFE8, #B7ADA3, #7D746B; sucesso #7BC98F; erro #FF6B6B. Proibido azul, laranja queimado, fundo branco ou preto puro.
2. Tipografia: Outfit 600/700 para títulos e TODOS os números (carga, reps, timers, totais) com algarismos tabulares; DM Sans 400/500 para o resto. Escala: 48/52, 28/34, 20/26, 17/24, 15/22, 13/18, 12/16.
3. Componentes base em src/ui, cada um com estados default, pressed, disabled: Button (primary 56px pílula coral; large 64px; secondary pílula #2D2925; danger vermelho suave; texto), Chip e SegmentedControl (pílula, selecionado coral), Stepper (botões redondos 48px − e + em volta de número Outfit grande, com press e segurar para repetir), Card (raio 24, padrão 16 a 20), TextField (raio 16, fundo #38332F, contador opcional), BottomSheet (raio 28 no topo, overlay preto 65%, alça de arrastar, fecha por arrasto/toque fora/botão), ConfirmModal, Toast (inferior, 4 s, role=status), PRBadge (chip âmbar com ícone de troféu), EmptyState (ilustração simples + título + texto + até 2 ações), ScreenHeader (título grande ou seta de voltar, ícone de engrenagem à direita que abre Ajustes), TabBar.
4. Navegação: TabBar de 4 abas na ordem Início, Treinos, Biblioteca, Progresso (72px, ícone preenchido + rótulo coral na ativa). Ajustes é tela empilhada aberta pela engrenagem; não é aba. Telas empilhadas e sheets sem a TabBar quando são fluxos de edição ou treino ativo.
5. Banco SQLite com migrações versionadas. Tabelas: settings (unit kg|lb, default_increment, auto_rest_timer, rest_alert, onboarded), exercises (id, name, muscle_group, equipment, kind composto|isolamento, default_increment, default_rest_s, notes, is_custom, archived), groups (id, name, description, frequency_days, position, is_active), workouts (id, group_id nullable, name, position, is_active), workout_exercises (id, workout_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note), sessions (id, workout_id nullable, name_snapshot, started_at, ended_at, status in_progress|completed|discarded, total_paused_s), session_exercises (id, session_id, exercise_id, position, target_sets, rep_min, rep_max, rest_s, note, is_session_only), sets (id, session_exercise_id, index, weight, reps, rpe nullable, is_warmup, completed_at, is_pr_weight, is_pr_volume). Guarde pesos sempre em kg com 2 casas e converta só na exibição.
6. Seed de ~40 exercícios em português cobrindo Peito, Costas, Pernas, Ombros, Braços e Abdômen, com equipamento (Barra, Halteres, Cabo, Máquina, Peso corporal).
7. Serviços puros e testados em src/domain: calcularVolume(sets), detectarPR(historico, novaSerie), formatarPeso(kg, unidade), proximaCarga(atual, incremento, direcao), estimarDuracao(workout). Volume = soma de carga x reps das séries concluídas sem aquecimento, com carga x 2 quando o equipamento for Halteres. PR = maior carga; empate desempata por reps.
8. Acessibilidade: alvos mínimos de 48px, contraste AA, accessibilityLabel em todo ícone, respeitar tamanho de fonte do sistema até 130% sem cortar títulos.

CRITÉRIO DE PRONTO: app abre em modo avião, mostra 4 abas com títulos corretos e placeholder, persiste e lê um registro de teste, testes unitários dos serviços do item 7 passando, tela de galeria interna (rota oculta em dev) exibindo todos os componentes em todos os estados.
```

---

## Arquitetura do Projeto

- `src/theme`: Cores (`colors.ts`), Tipografia (`typography.ts`), Raios (`radii.ts`), Espaçamentos (`spacing.ts`).
- `src/domain`: Regras de negócio puras (cálculo de volume, detecção de PR de peso e volume, conversão e formatação de pesos, incremento de carga, estimativa de duração).
- `src/db`: Schema Drizzle SQLite com 8 tabelas versionadas, migrações incrementais (`migrations.ts`), semente com 46 exercícios (`seed.ts`), cliente nativo (`client.ts`).
- `src/ui`: Componentes base reutilizáveis e acessíveis com estados default, pressed e disabled.
- `src/navigation`: TabBar inferior personalizada de 72px com 4 abas (Início, Treinos, Biblioteca, Progresso) e Native Stack para telas sobrepostas (Ajustes e DevGallery).
- `src/screens`: Telas principais e galeria interna para QA.
- `src/store`: Zustand para estado reativo conectado ao SQLite offline.

## Comandos Principais
- `npm test`: Executa a suíte de testes unitários com Vitest.
- `npx tsc --noEmit`: Verifica estritamente a tipagem TypeScript.
- `npm start`: Inicia o servidor de desenvolvimento Expo.
