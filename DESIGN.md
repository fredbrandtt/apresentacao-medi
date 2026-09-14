---
name: Apresentação MEDI · Lago da Pedra
description: Deck de 17 slides em tela cheia, vídeo full-bleed e painel de vidro, para a proposta de gestão médica da MEDI à Prefeitura de Lago da Pedra/MA.
colors:
  medi-teal: "#12A89D"
  medi-teal-deep: "#0E877E"
  medi-teal-light: "#63D6CA"
  medi-graphite: "#5F5F5F"
  ink: "#1C2528"
  ink-soft: "#3E4A4F"
  ink-body: "#2F3A3F"
  ink-muted: "#66727A"
  current: "#B4B8BC"
  alert: "#A63D2F"
  white: "#FFFFFF"
  neutral: "#F5F6F7"
  fallback: "#E9ECEE"
  bg-outside: "#0F1112"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Geist, system-ui, sans-serif"
    fontSize: "calc(64 * var(--s))"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.025em"
    fontVariation: "opsz 96, wdth 100"
  anchor:
    fontFamily: "Bricolage Grotesque, Geist, system-ui, sans-serif"
    fontSize: "calc(400 * var(--s))"
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontVariation: "opsz 96, wdth 100"
  headline:
    fontFamily: "Bricolage Grotesque, Geist, system-ui, sans-serif"
    fontSize: "calc(160 * var(--s))"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "calc(30 * var(--s) * var(--grow, 1))"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "calc(24 * var(--s) * var(--grow, 1))"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
    fontFeature: "ss01 1, kern 1"
  label:
    fontFamily: "Geist Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "calc(16 * var(--s))"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  glass: "calc(20 * var(--s))"
  sheet: "0px"
spacing:
  g8: "calc(8 * var(--s))"
  g16: "calc(16 * var(--s))"
  g24: "calc(24 * var(--s))"
  g32: "calc(32 * var(--s))"
  g40: "calc(40 * var(--s))"
  g48: "calc(48 * var(--s))"
  g64: "calc(64 * var(--s))"
  margin-left: "calc(168 * var(--s))"
components:
  glass-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.glass}"
    padding: "{spacing.g40}"
  report-sheet:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.sheet}"
    padding: "calc(32 * var(--s)) calc(36 * var(--s))"
  comparison-row-current:
    textColor: "{colors.current}"
    typography: "{typography.body}"
  comparison-row-proposal:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  ruler-active:
    backgroundColor: "{colors.ink}"
    height: "1px"
    width: "calc(28 * var(--s))"
  fullscreen-button:
    textColor: "{colors.ink}"
    size: "calc(28 * var(--s))"
    padding: "0"
---

# Design System: Apresentação MEDI · Lago da Pedra

## 1. Overview

**Creative North Star: "A Sala de Laudo"**

O deck é lido como um laudo, não como um folheto. Branco clínico, luz difusa, dado com fonte declarada, e uma única cor de marca que aparece onde há conclusão. A sobriedade vem da medicina, não do design: é o mesmo registro de um documento que um médico assina e um gestor arquiva. Quem olha deve pensar "isto foi medido", nunca "isto foi vendido".

A densidade é deliberadamente baixa. Cada slide sustenta uma afirmação, com margem esquerda fixa de 168 px de palco e uma faixa de conteúdo que nunca invade o assunto do vídeo de fundo. O espaço vazio não é sobra: é o que dá gravidade ao dado que ficou. Nos slides de risco (5, 6, 7) esse silêncio é o instrumento — peso se comunica por isolamento, jamais por alarme.

O sistema rejeita explicitamente três coisas, herdadas das anti-referências do PRODUCT.md: **cara de fornecedor vendendo serviço** (superlativo, promessa, linguagem comercial), **slide de prefeitura ou licitação** (PowerPoint institucional, tabela cinza, Arial, clip-art, brasão grande) e **cara de denúncia** (vermelho abundante, tom acusatório, dedo apontado para quem vai contratar). O contraste com o segundo é parte do argumento: o decisor vem da iniciativa privada e lê competência pelo acabamento.

**Key Characteristics:**
- Palco fluido 100vw × 100vh, sem letterbox; tudo escala de `--s: calc(100vw / 1920)`
- Vídeo full-bleed por slide, com zona segura (`safeRight`) protegendo o texto do assunto da imagem
- Vidro como material único de agrupamento; fora dele, tipografia solta sobre a imagem
- Piso tipográfico de 16 px: nada de interface abaixo disso
- Ajuste tipográfico em tempo de execução (`fitTitle`, `distribute`, `scaleSheet`) — o layout se autocorrige e denuncia estouro em `window.__fitReport`

## 2. Colors

Uma paleta de sala de exame: branco e grafite carregando quase tudo, verde-água como única voz de marca, e um vermelho que existe para uma palavra apenas.

### Primary
- **Verde-Água MEDI** (`#12A89D`): a cor da marca e a única saturada do sistema. Marca a linha de acento da capa, a coluna "Proposta MEDI" do comparativo, as barras de projeção, os pinos do mapa e o fio de luz do vidro.
- **Verde-Água Profundo** (`#0E877E`): ancora a ponta escura dos gradientes e dá contraste ao verde-água sobre fundo claro.
- **Verde-Água Claro** (`#63D6CA`): só em gradiente e no fio de luz do painel. Nunca como cor de texto — não sustenta contraste sobre branco.

### Neutral
- **Tinta** (`#1C2528`): títulos, números-âncora, marca ativa da régua. O preto do sistema, levemente esverdeado para não brigar com o teal.
- **Tinta Suave** (`#3E4A4F`): rótulos secundários dentro de gráficos.
- **Tinta de Corpo** (`#2F3A3F`): corpo de texto, listas e tabela. É a cor de leitura.
- **Tinta Apagada** (`#66727A`): notas e metadados em Geist Mono. Fica em ~4,7:1 sobre branco — dentro do mínimo, sem folga.
- **Cinza de Hoje** (`#B4B8BC`): exclusivo da coluna "Cenário atual". Ver a Regra do Par Semântico.
- **Neutro** (`#F5F6F7`) e **Falha** (`#E9ECEE`): cortina de carregamento e fundo de fallback quando o vídeo não carrega.
- **Fora do Palco** (`#0F1112`): o quase-preto atrás do palco. Só aparece em proporção de tela diferente de 16:9.

### Tertiary
- **Vermelho de Interdição** (`#A63D2F`): uma palavra, um slide. Ver a Regra da Palavra Única.

### Named Rules

**A Regra do Par Semântico.** Cinza `#B4B8BC` é sempre o cenário atual; verde-água é sempre a proposta. No slide 11 esse par carrega significado, e por isso a distinção **nunca pode depender só de cor**: coluna e rótulo ("Cenário atual" / "Proposta MEDI") continuam separando os dois para quem não distingue as matizes. Fora dessa oposição, o verde-água é livre como cor de marca e pode aparecer em qualquer destaque.

**A Regra da Palavra Única.** O vermelho `#A63D2F` é reservado a uma ocorrência em todo o deck: "interdição", no slide 7. Ele entra por transição de 400 ms, não por corte. Ampliá-lo — para outro slide, outra palavra, um fundo, uma borda — converte diagnóstico em acusação e viola a anti-referência mais dura do PRODUCT.md. Se um segundo vermelho aparecer, o primeiro perdeu a força e o deck mudou de tom.

## 3. Typography

**Display Font:** Bricolage Grotesque (variável, peso 500, `opsz` 96, `wdth` 100)
**Body Font:** Geist (300/400/500)
**Label/Mono Font:** Geist Mono (400)

**Character:** Um grotesco de display com personalidade contra um sans neutro de leitura — contraste por eixo, não por similaridade. A Bricolage dá ao título uma voz que não é institucional nem corporativa; a Geist desaparece para o dado aparecer. O mono não é figurino técnico: ele marca literalmente metadado, número medido e nota de rodapé, que é o vocabulário de um laudo.

### Hierarchy
- **Anchor** (500, `calc(400 * var(--s))`, 0.9, `-0.04em`): o "17%" do slide 3. Um por deck; é a tese inteira em um número.
- **Display/Headline** (500, `calc(160 * var(--s))`, 1, `-0.03em`): os três números do fechamento, com `tabular-nums`.
- **Title** (500, `calc(64 * var(--s))`, 1.05, `-0.025em`): título de slide. `fitTitle()` desce 64 → 58 → 52 px até caber em duas linhas; a capa parte de 56 px.
- **Stat** (500, `calc(120 * var(--s))`, 1): números de apoio, como o "22%" do slide 6.
- **Support** (400, `calc(30 * var(--s))`, 1.35): a frase de apoio sob o título, limitada a 640 px de palco.
- **Body** (400, `calc(24 * var(--s))`, 1.45): listas, tabela e blocos. Largura contida pela faixa, não por `ch`.
- **Label** (400, 16 px, `0.02em`): notas, créditos, numeração de lista, cabeçalho de tabela, nomes no mapa.

### Named Rules

**A Regra do Piso de 16.** Nenhum texto abaixo de 16 px na escala base. `--grow` pode encolher o conteúdo para caber na faixa, mas rótulos e notas usam `max(var(--fs-label), ...)` para nunca cruzar esse piso. Numa sala de reunião, com projeção e distância, 15 px já é texto perdido.

**A Regra do Número Tabular.** Todo numeral que anima ou se compara leva `font-variant-numeric: tabular-nums`. Sem isso o contador do slide 2 treme a cada quadro enquanto conta até 5.414.

**A Regra do Ajuste Automático.** Tipografia não é cravada à mão por slide: `fitTitle()`, `distribute()`, `fitWidthRow()` e `scaleSheet()` medem e corrigem depois da montagem. Depois de mexer em copy ou layout, `window.__fitReport` tem de sair vazio — `fora: []` e `blocosOcultos: 0`.

## 4. Elevation

O sistema tem **um material e uma sombra**. Não há escala de elevação: as superfícies ou estão soltas sobre o vídeo, ou estão dentro do vidro. O vidro é o único recurso de agrupamento, e sua profundidade é sempre a mesma, porque ele nunca indica hierarquia — só indica "estes elementos são um conjunto".

A profundidade real do deck vem do vídeo atrás, não de sombra: o assunto tem luz, foco e perspectiva próprios, e o texto assenta sobre ele. Empilhar sombras competiria com essa profundidade fotográfica.

### Shadow Vocabulary
- **Vidro em repouso** (`inset 0 1px 0 rgba(255,255,255,0.75)`, `inset 0 0 0 1px rgba(255,255,255,0.35)`, `0 24px 60px -30px rgba(28,37,40,0.28)`): a única sombra do sistema. As duas internas fazem a borda de luz; a externa, longa e muito difusa, apenas descola o painel do fundo.
- **Halo do vidro** (`0 0 48px -16px rgba(18,168,157,0.18 → 0.32)`, 6 s): brilho verde-água pulsando, suspenso sob `prefers-reduced-motion`.

### Named Rules

**A Regra do Vidro Não Aninhado.** Painel dentro de painel é proibido. Se dois grupos precisam de vidro no mesmo slide, eles são irmãos com `--orbit-delay` distinto, nunca pai e filho. Vidro aninhado vira card empilhado — exatamente a cara de deck de investidor que o PRODUCT.md proíbe.

**A Regra do Vidro Justificado.** O vidro existe para separar conteúdo da imagem quando a imagem é clara demais para sustentar texto solto, e para agrupar. Não é decoração: um painel que não agrupa nada e não resolve legibilidade deve sair. Onde há vidro, `distribute()` baixa o piso de 0,75 para 0,62, porque o padding vertical já consome faixa.

## 5. Components

### Painel de Vidro (componente-assinatura)
O material único do deck: translúcido, quente de luz, com um fio de verde-água percorrendo a borda.
- **Corner Style:** 20 px de palco (`calc(20 * var(--s))`)
- **Background:** `linear-gradient(135deg, rgba(255,255,255,0.58), rgba(255,255,255,0.32))` sobre `backdrop-filter: blur(28px) saturate(140%)`
- **Shadow Strategy:** a sombra única da seção Elevation
- **Internal Padding:** 40 px de palco; 24 px em telas com menos de 820 px de altura
- **Movimento:** fio cônico de 1,5 px orbitando em 9 s (`--angle` via `@property`, com fallback de rotação para Safari < 16.4), halo de 6 s e faixa especular diagonal a cada 9 s. Cada painel do mesmo slide recebe `--orbit-delay` próprio para não pulsarem em uníssono.

### Folha de Relatório (slide 14)
O contraponto do vidro: papel opaco, reto, sem raio, deliberadamente burocrático — é um documento, e deve parecer um.
- **Corner Style:** sem raio (0)
- **Background:** branco puro, borda de 1 px em `--line`
- **Internal Padding:** 32 × 36 px de palco
- **Distintivo:** `scaleSheet()` reduz a folha em tempo de execução se ela não couber; o rodapé "Modelo ilustrativo" é obrigatório, porque os números são fictícios.

### Tabela Comparativa (slide 11)
Três colunas em grid: rótulo em mono, cenário atual em cinza, proposta em tinta cheia.
- **Style:** grid `220px / 360px / 1fr` de palco, filete de 1 px sob cada linha
- **Cabeçalho:** mono, 16 px, `letter-spacing: 0.08em`, em `--ink-muted`
- **Estado:** a coluna atual usa `--current`; a proposta usa `--ink` a peso cheio. O contraste de peso, não só de cor, é o que faz a leitura.

### Régua de Progresso (chrome persistente)
Marcador vertical à esquerda, fora da margem de conteúdo: uma marca de 12 px por slide, 28 px e tinta cheia no slide ativo, com o índice `NN / 17` acima.
- **Style:** filetes de 1 px, `--line-ruler` inativo e `--ink` ativo
- **Comportamento:** dirigido por dados — o número de marcas vem de `DECK.slides.length`

### Botão de Tela Cheia
O único controle clicável do deck.
- **Shape:** 28 px de palco, sem fundo, sem borda
- **Default / Hover / Focus:** opacidade 0,45 → 0,9, transição de 200 ms; `:focus-visible` tratado igual ao hover
- **Distintivo:** persiste mesmo quando o cursor some por ociosidade (2,5 s), e troca o ícone via `.is-fullscreen`

### Lista Numerada
Numeração em mono à esquerda, largura fixa de 40 px de palco, texto em corpo. É o padrão dos slides 7, 8, 10 e 14 — e a alternativa deliberada ao card.

## 6. Do's and Don'ts

### Do:
- **Do** escalar toda medida horizontal e todo tamanho de fonte por `calc(N * var(--s))` no CSS e por `S()` no JS. Px cru em medida horizontal quebra o acompanhamento de tela.
- **Do** reavaliar o `safeRight` do slide sempre que trocar o vídeo de fundo. A zona segura existe para o texto não colidir com o assunto da imagem.
- **Do** conferir `window.__fitReport` depois de qualquer mexida em copy, tipografia ou layout. `fora: []` e `blocosOcultos: 0` em todas as resoluções é o estado bom.
- **Do** declarar a origem do dado quando ele for estimativa ou modelo: "Modelo ilustrativo", "Relato da própria gestão municipal". Prova antes de promessa.
- **Do** dar peso ao risco por isolamento — menos elementos, mais respiro, entrada mais lenta.
- **Do** manter os dois caminhos de degradação: sem GSAP, via `settle()`; e com `prefers-reduced-motion`, via `RM`.
- **Do** usar `tabular-nums` em todo numeral que anima ou se compara.

### Don't:
- **Don't** dar ao deck cara de **fornecedor vendendo serviço**: sem superlativo, sem promessa de transformação, sem "soluções".
- **Don't** dar ao deck cara de **slide de prefeitura ou licitação**: sem PowerPoint institucional, tabela cinza, Arial, clip-art ou brasão ampliado.
- **Don't** deixar o deck soar como **denúncia ou acusação à gestão**. O sujeito das frases de risco é o serviço ou a situação, nunca uma pessoa ou uma administração. Quem relatou o problema é quem vai assinar o contrato.
- **Don't** dar ao deck cara de **startup de saúde ou deck de investidor**: sem card flutuante, ilustração isométrica ou métrica de vaidade.
- **Don't** aninhar painéis de vidro, nem usar vidro que não agrupe nada.
- **Don't** estender o vermelho `#A63D2F` para além de "interdição" no slide 7.
- **Don't** distinguir "cenário atual" de "proposta" só por cor — coluna e rótulo têm de sustentar a leitura sozinhos.
- **Don't** escrever texto de interface abaixo de 16 px na escala base.
- **Don't** converter o projeto para `import`/`export` nem introduzir passo de build: o deck tem de abrir com duplo clique via `file://`.
- **Don't** reordenar slides em `data.js` sem remapear `CHOREO` — as chaves são os ids, não as posições.
