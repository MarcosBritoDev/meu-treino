# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Praticantes de musculação focados em sobrecarga progressiva, RPE e registro rápido de treinos sem atrito, que valorizam privacidade total e independência de conexão ou contas. O app é utilizado no ambiente de academia, durante os intervalos entre séries, exigindo toques rápidos, alvos grandes e resposta imediata.

## Product Purpose

O Volt Precision existe para oferecer uma experiência de registro de treinos de musculação rápida, precisa e sem distrações. O sucesso do produto significa que o praticante consegue registrar cargas, repetições, RPE e tempo de descanso com o mínimo de esforço mental e motor, tendo controle absoluto de seu histórico e progresso sem depender de nuvem, assinaturas ou conectividade.

## Positioning

Diferente da maioria dos apps de treino comerciais que exigem login, exibem anúncios ou empurram recursos sociais e planos pagos na nuvem, o Volt Precision é 100% offline, local-first (SQLite), sem conta, sem rede e sem telemetria. É uma ferramenta de precisão focada exclusivamente no treino do usuário.

## Operating Context

- Ambiente: Salão de academia, durante sessões de treino ativas.
- Condições: Mãos frequentemente suadas ou trêmulas após esforço físico, iluminação variável de academia, necessidade de foco no exercício e descanso temporizado.
- Rituais: Abertura da sessão de treino, consulta das séries anteriores daquele exercício para ajuste de carga, registro imediato pós-série (peso e repetições), acionamento automático de timer de descanso com feedback háptico, e encerramento com resumo da sessão e recordes (PRs) batidos.

## Capabilities and Constraints

- Funcionalidades confirmadas:
  - Registro de sessões de treino com exercícios, séries normais, aquecimento, drop sets e escala RPE.
  - Temporizador de descanso integrado com alertas hápticos e prevenção de suspensão de tela (`expo-keep-awake`).
  - Detecção automática de Recordes Pessoais (PR) por carga e volume.
  - Calculadora de anilhas integrada.
  - Biblioteca com 46 exercícios categorizados por grupo muscular e equipamento, com suporte a exercícios customizados.
  - Organização de treinos por rotinas/grupos (ex.: PPL, ABC) e reordenação rápida de exercícios.
  - Visualização de progresso e histórico de treinos anteriores.
  - Backup e restauração local de dados em formato JSON/SQLite.
- Restrições técnicas:
  - 100% offline: sem chamadas de rede, sem SDKs de telemetria ou analytics.
  - Cargas armazenadas invariavelmente em kg com 2 casas decimais no SQLite (`drizzle-orm`), convertidas apenas na camada de exibição para a unidade preferida do usuário (kg ou lb).
  - Volume de halteres calculado considerando o par (carga × 2).
  - Padrões de interação e navegação do Android: suporte integral ao gesto de voltar do sistema (Predictive Back), insets de janela (edge-to-edge), e touch targets mínimos de 48×48 dp.

## Brand Commitments

- Nome: Volt Precision.
- Idioma da interface: Português do Brasil, estritamente em sentence case (nunca CAIXA ALTA / all-caps).
- Paleta visual: "Volt Precision Warm" — base escura e quente (superfície #1A1715, cartões #23201D e #2D2925, campos #38332F, bordas #3A3531), primária coral #FF7A59 com texto #1A1715, âmbar #FFC46B estritamente reservado para recordes (PR), verde sucesso #7BC98F, vermelho erro #FF6B6B. Proibido azul, laranja queimado genérico, fundo branco ou preto puro (#000000).
- Tipografia: Outfit (600/700) para títulos e todos os números (cargas, repetições, timers, totais) com algarismos tabulares; DM Sans (400/500) para corpo de texto, rótulos e controles.
- Ícones: Lucide Icons (`lucide-react-native`) com traço 1.75.

## Evidence on Hand

- Código-fonte funcional em React Native + Expo com arquitetura modular em `src/`.
- Banco de dados SQLite estruturado com Drizzle ORM em `src/db/schema.ts` e migrations versionadas.
- Seed de 46 exercícios cadastrados em português em `src/db/seed.ts`.
- Módulos de domínio testados com Vitest em `src/domain/` cobrindo cálculo de volume, PRs, conversões e formatações de carga.
- Documentação de design e especificações por etapa em `design/`.
- Ausência deliberada: sem dados ou depoimentos de usuários fictícios; todos os registros de treino pertencem estritamente ao banco de dados local do dispositivo.

## Product Principles

1. **Velocidade e atrito zero**: Cada toque conta no treino; registrar carga e repetições deve requerer a menor quantidade de gestos e atenção possível.
2. **Soberania local e privacidade absoluta**: Os dados pertencem única e exclusivamente ao dispositivo do usuário; nunca haverá dependência de servidores remotos ou contas de terceiros.
3. **Clareza de alta densidade sem poluição**: Números grandes, legíveis e tabulares em Outfit, contraste calibrado e ausência de elementos decorativos supérfluos durante a execução do treino.
4. **Precisão matemática e consistência métrica**: Dados fundamentais (cargas, repetições, volumes, tempos) são tratados com regras de domínio estritas e invariantes.

## Accessibility & Inclusion

- Alvos de toque (touch targets) com dimensão mínima estrita de 48×48 dp e espaçamento de ao menos 8 dp entre controles adjacentes.
- Contraste visual atendendo aos requisitos mínimos WCAG AA em esquema escuro tonal.
- Inclusão de `accessibilityLabel` em todos os botões de ícone e controles interativos.
- Suporte a dimensionamento dinâmico de texto do sistema operacional Android (até 130%) sem truncar títulos ou controles vitais.
- Conformidade com os gestos e botões de navegação do sistema Android.
