---
name: Volt Precision Warm
description: Sistema de design tátil e minimalista para musculação, 100% offline em grafite quente e coral vivo.
colors:
  primary: "#FF7A59"
  primary-container: "#3A251F"
  on-primary: "#1A1715"
  on-primary-container: "#FFB4A0"
  accent-pressed: "#E8654A"
  tertiary-pr: "#FFC46B"
  tertiary-container: "#3D2E12"
  background: "#1A1715"
  surface-dim: "#141210"
  surface-bright: "#3A3531"
  surface-container-lowest: "#120F0D"
  surface-container-low: "#1F1B19"
  surface-container: "#23201D"
  surface-container-high: "#2D2925"
  surface-container-highest: "#38332F"
  on-surface: "#F5EFE8"
  on-surface-variant: "#B7ADA3"
  text-muted: "#7D746B"
  outline: "#7D746B"
  outline-variant: "#3A3531"
  status-success: "#7BC98F"
  status-error: "#FF6B6B"
typography:
  display:
    fontFamily: "Outfit"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "52px"
  title:
    fontFamily: "Outfit"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "34px"
  headline:
    fontFamily: "Outfit"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "26px"
  body:
    fontFamily: "DM Sans"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "DM Sans"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
rounded:
  sm: "8px"
  input: "16px"
  card: "24px"
  sheet: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  gutter: "12px"
  md: "16px"
  margin: "20px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
    height: "56px"
  button-large:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "18px 24px"
    height: "64px"
  button-secondary:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
    height: "56px"
  button-danger:
    backgroundColor: "{colors.status-error}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
    height: "56px"
  card-surface:
    backgroundColor: "{colors.surface-container}"
    rounded: "{rounded.card}"
    padding: "18px"
  card-high:
    backgroundColor: "{colors.surface-container-high}"
    rounded: "{rounded.card}"
    padding: "18px"
  input-field:
    backgroundColor: "{colors.surface-container-highest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
    height: "48px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "48px"
  chip-unselected:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "48px"
---

# Design System: Volt Precision Warm

## Overview

**Creative North Star: "The Warm Iron Sanctuary" (O Santuário Noturno do Ferro)**

O Volt Precision Warm é um sistema de design escuro, quente e tátil, projetado sob medida para o registro de treinos de musculação em ambiente real de academia. Ele evoca a sensação de um santuário de treino à noite: acolhedor aos olhos cansados, sóbrio, amigável e confiável, sem a agressividade visual de contrastes fluorescentes nem o excesso analítico de painéis administrativos web.

A filosofia do sistema é o **minimalismo sóbrio tátil**: superfícies planas tonais quase imperceptíveis, onde as molduras e caixas recuam para dar protagonismo absoluto aos dados que realmente importam — os números grandes de carga, repetições e descanso em Outfit tabular. Cada elemento interativo possui alvo de toque generoso (mínimo de 48dp) para garantir precisão e ergonomia com mãos suadas e trêmulas pós-série.

**Key Characteristics:**
- **Fundo grafite quente acolhedor (#1A1715)**: nunca preto puro (#000000), garantindo contraste suave sem fadiga visual sob luz de academia.
- **Destaque caloroso em coral vivo (#FF7A59)**: foco cirúrgico nas chamadas de ação primárias (botão Iniciar, abas ativas, chips selecionados).
- **Consagração absoluta do âmbar (#FFC46B)**: reservado estritamente para Personal Records (PR) e troféus, mantendo a conquista sagrada e instantaneamente reconhecível.
- **Tipografia dual de alta precisão**: Outfit bold tabular para dados numéricos de sobrecarga progressiva; DM Sans para leitura clara e relaxada.
- **Formas ultra-arredondadas e contínuas**: cartões de 24px, campos de 16px e botões pílula totais (9999px) que transmitem maciez e segurança ao toque.

---

## Colors

Paleta noturna escura e aquecida, combinando grafite profundo com tons de terra, acentos em coral vivo e toques de âmbar de vitória.

### Primary
- **Warm Living Coral** (#FF7A59): Ação primária, aba ativa da barra de navegação, botão de iniciar treino e seleção ativa de chips. O texto sobre coral é invariavelmente escuro (#1A1715).
- **Coral Pressed** (#E8654A): Estado pressionado e feedback tátil da cor primária.
- **Primary Tint** (#3A251F): Tint suave de destaque para superfícies que requerem ênfase moderada (ex.: timer de descanso ativo).

### Tertiary
- **Trophy Amber** (#FFC46B): Exclusivo para recordes pessoais (PR de carga ou volume) e ícone de troféu. Possui container próprio (#3D2E12).

### Neutral
- **Warm Night Graphite** (#1A1715): Fundo base da aplicação (canvas escuro aquecido).
- **Surface Container** (#23201D): Cartão nível 1 e superfícies de base de conteúdo.
- **Surface Container High** (#2D2925): Cartão nível 2, botões secundários e modais elevados.
- **Surface Container Highest** (#38332F): Campos de texto (`TextField`) e inputs numéricos.
- **Warm Alabaster** (#F5EFE8): Texto primário de alto contraste e legibilidade.
- **Warm Muted Sand** (#B7ADA3): Texto secundário, rótulos e unidades de medida.
- **Earth Muted** (#7D746B): Placeholders, bordas secundárias e textos atenuados.
- **Subtle Outline** (#3A3531): Borda sutil de 1px usada parcimoniosamente para delimitação de campos e cartões.

### Status
- **Soft Mint Green** (#7BC98F): Sucesso, conclusão de série e validações positivas.
- **Soft Signal Red** (#FF6B6B): Erro, ações destrutivas (excluir grupo/descartar treino) e alertas críticos.

### Named Rules
**The Warm Night Rule.** O fundo da aplicação é sempre grafite quente (#1A1715), nunca preto puro (#000000) e jamais fundo branco ou claro. É estritamente proibido o uso de azul, ciano ou tons genéricos de laranja queimado.

**The Trophy Amber Rule.** A cor âmbar (#FFC46B) é de uso sagrado e exclusivo para recordes pessoais (PR) e troféus de conquista. É terminantemente proibido usá-la como cor de aviso genérico, botão secundário ou adorno de interface.

---

## Typography

**Display & Number Font:** Outfit (com pesos 600 SemiBold e 700 Bold)  
**Body & UI Font:** DM Sans (com pesos 400 Regular e 500 Medium)

**Character:** Contraste marcante entre a presença geométrica e mecânica do Outfit para números tabulares e a elegância neutra e altamente legível do DM Sans para leitura contínua.

### Hierarchy
- **Display Large** (Outfit Bold, 48px, line-height 52px, tabular-nums): Grandes números de carga, totais de volume e contadores de descanso na tela ativa.
- **Display Medium / Title** (Outfit SemiBold, 28px, line-height 34px, tabular-nums): Títulos principais de tela e cabeçalhos de destaque.
- **Headline** (Outfit SemiBold, 20px, line-height 26px, tabular-nums): Títulos de seções, números de séries e destaques de карточка.
- **Body Large** (DM Sans Medium, 17px, line-height 24px): Rótulos de botões primários, itens de lista de alto destaque e abas.
- **Body Medium** (DM Sans Regular, 15px, line-height 22px): Corpo de texto principal, campos de entrada e descrições.
- **Body Small** (DM Sans Regular, 13px, line-height 18px): Metadados de exercícios, subtítulos e notas complementares.
- **Label Small** (DM Sans Medium, 12px, line-height 16px): Chips auxiliares, badges de status e rótulos de colunas.

### Named Rules
**The Tabular Numbers Rule.** Todo e qualquer número na interface (cargas em kg/lb, repetições, temporizadores, contadores de séries e totais) deve ser renderizado em Outfit com algarismos tabulares (`fontVariant: ['tabular-nums']`), garantindo estabilidade e alinhamento milimétrico durante atualizações dinâmicas.

**The Sentence Case Rule.** Toda a interface é redigida em português do Brasil estritamente em sentence case (apenas a primeira letra maiúscula). É terminantemente proibido o uso de caixa alta (ALL CAPS / UPPERCASE), inclusive em botões, abas, chips e cabeçalhos de tabela.

---

## Layout

- **Espaço e Grade**: Grid base de 4px, calibrado primariamente para larguras mobile de 390px (padrão moderno) e 360px (telas compactas Android).
- **Margens e Gutter**: Margem lateral de tela fixa de 20px (`spacing.margin`), espaçamento entre cartões de 12px (`spacing.gutter`), e respiro interno de 16 a 20px (`spacing.cardPadding`).
- **Alvos de Toque (Touch Targets)**: Altura e largura mínimas invioláveis de **48×48 dp** (`spacing.touchTargetMin`) para todo controle interativo, com espaçamento mínimo de 8dp entre controles vizinhos.
- **Zona do Polegar (Thumb Zone)**: Ações primárias de avanço (Iniciar treino, Concluir treino, Salvar) situam-se preferencialmente na metade inferior da tela ou como rodapés fixos acessíveis com uma mão.
- **Navegação**: Barra inferior de navegação (`TabBar`) com 72px de altura fixa contendo 4 destinos essenciais: Início, Treinos, Biblioteca, Progresso. Ajustes é tela empilhada acessada via cabeçalho.

---

## Elevation & Depth

O Volt Precision Warm rejeita drop-shadows decorativas pesadas ou difusas no escuro. A percepção de profundidade é puramente tonal e arquitetural.

- **Camadas Tonais**:
  1. Base da tela: `#1A1715` (profundidade zero)
  2. Cartão de conteúdo: `#23201D` (elevação 1)
  3. Controles secundários e cabeçalhos elevados: `#2D2925` (elevação 2)
  4. Campos de digitação: `#38332F` (superfície interativa escavada)
- **Overlays**: Modais e BottomSheets repousam sobre um velamento escuro de 65% de opacidade (`rgba(0, 0, 0, 0.65)`), focando a atenção na superfície ativa sem desorientar o contexto.

### Named Rules
**The Flat Tonal Rule.** Superfícies não utilizam sombras projetadas. A hierarquia e a separação de planos no escuro são estabelecidas exclusivamente pela progressão luminosa dos tons grafite e pelo delineamento sutil de bordas de 1px (#3A3531).

---

## Shapes

- **Filosofia de Formas**: Silhuetas suaves, acolhedoras e curvilíneas, sem cantos pontiagudos que transmitam rigidez agressiva.
- **Cartões**: Raio generoso de 24px (`radii.card`), proporcionando contorno orgânico.
- **Campos de Texto**: Raio de 16px (`radii.input`), amigável e confortável ao foco.
- **Bottom Sheets**: Raio de 28px nos cantos superiores (`radii.sheet`), com alça de arrasto arredondada central de 4px de espessura.
- **Controles Interativos (Pílulas)**: Botões, chips, badges e controles segmentados adotam invariavelmente raio pílula total (`radii.pill: 9999px`).

---

## Components

### Buttons
- **Primary Button**: Pílula coral (#FF7A59) de 56px de altura (ou 64px para ações heróicas de treino ativo), texto escuro #1A1715 em Outfit/DM Sans 600, padding horizontal de 24px. Estado pressed escurece para #E8654A com leve escala (0.995).
- **Secondary Button**: Pílula no tom elevado #2D2925 com borda sutil de 1px (#3A3531), texto em Warm Alabaster (#F5EFE8).
- **Danger Button**: Pílula em vermelho suave (#FF6B6B) para descartar treinos ou exclusões confirmadas.
- **Text Button**: Sem fundo, texto em coral primário, mantendo altura mínima de toque de 48dp.

### Cards / Containers
- **Surface Card**: Fundo #23201D, raio 24px, padding 18px, borda sutil #3A3531. Usado para listas de treinos e resumos.
- **High Card**: Fundo #2D2925 para cartões aninhados indispensáveis ou estados de maior foco.
- **Highlight Card**: Fundo #3A251F com borda primária coral #FF7A59 para timers de descanso e estados em andamento.

### Inputs / Fields
- **TextField**: Fundo #38332F, raio 16px, borda #3A3531, altura mínima 48dp, padding horizontal 16px. Ao receber foco, a borda transita suavemente para coral primário (#FF7A59). Mensagens de erro em #FF6B6B abaixo do campo.

### Chips & Segmented Controls
- **Chip**: Pílula de altura mínima 48dp. Estado não selecionado com fundo #23201D e borda #3A3531; estado selecionado preenchido em coral #FF7A59 com texto escuro #1A1715.
- **SegmentedControl**: Trilho em #23201D com indicador deslizante em pílula coral para alternar modos (ex.: kg vs lb).

### PRBadge (Recorde Pessoal)
- **Signature Component**: Pílula exclusiva em tom âmbar ouro (#FFC46B), com ícone de troféu Lucide (traço 1.75) e texto #1A1715 em DM Sans Medium 12px. Comunica instantaneamente superação de carga ou volume.

### BottomSheet
- **Folha Inferior**: Raio de 28px no topo, fundo #23201D, alça central de arrasto cinza (#7D746B). Fecha por gesto de arrastar para baixo, toque no overlay preto (65%) ou botão de fechar.

### Stepper
- **Seletor Incremental**: Botões circulares de 48×48dp (− e +) em volta de número Outfit grande em destaque, com suporte a toque contínuo para repetição rápida.

---

## Do's and Don'ts

### Do:
- **Do** usar sempre Outfit com `tabular-nums` para qualquer número de carga, repetições, tempos e recordes.
- **Do** manter todos os botões e áreas de toque com no mínimo 48×48 dp de dimensão física.
- **Do** aplicar sentence case em absolutamente todos os textos, rótulos e botões ("Iniciar treino", nunca "INICIAR TREINO").
- **Do** reservar a cor âmbar (#FFC46B) exclusivamente para recordes pessoais (PR) e troféu.
- **Do** usar o fundo grafite quente (#1A1715), garantindo conforto ocular máximo em ambiente escuro.
- **Do** colocar a ação principal da tela na zona inferior do polegar.

### Don't:
- **Don't** usar preto puro (#000000) no plano de fundo.
- **Don't** usar azul, ciano ou variações de laranja queimado em nenhum componente.
- **Don't** usar texto em caixa alta (ALL CAPS) em qualquer circunstância.
- **Don't** praticar "cardception" (não aninhar cartões com bordas dentro de outros cartões com bordas).
- **Don't** usar sombras projetadas (drop-shadows) pesadas ou artificiais.
- **Don't** usar bordas tracejadas (`dashed`) estilo web desktop em botões de ação nativos.
