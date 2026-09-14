# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Apresentação de slides para tela cheia (pt-BR), da MEDI Medicina Diagnóstica para a Prefeitura de Lago da Pedra/MA. Stack estática pura: três arquivos (`index.html`, `data.js`, `main.js`, `styles.css`), sem build, sem bundler, sem `package.json`, sem dependências instaladas. GSAP entra por CDN.

## Rodar

Abrir `index.html` — duplo clique funciona (`file://` no Chrome). É por isso que `data.js` é script clássico expondo `window.DECK`, e não módulo ES: módulo ES quebraria sob `file://` por CORS. **Não converter para `import`/`export` nem introduzir passo de build sem antes decidir abandonar esse requisito.**

Servidor local (`python -m http.server`, Live Server) também serve, e é preferível ao mexer em vídeo — algumas checagens de `readyState` se comportam melhor via HTTP.

Não há testes, lint nem script de build. A verificação é visual, via o relatório de layout descrito abaixo.

## Arquitetura

Três camadas de responsabilidade estrita:

- **`data.js`** — toda a copy, os números e os caminhos de mídia. Nenhuma lógica de apresentação.
- **`main.js`** — IIFE única, `'use strict'`, ES5 (`var`, `Array.prototype.slice.call`). Monta o DOM dos slides, mede, anima e navega.
- **`styles.css`** — o sistema de escala e toda a tipografia.

O deck é **dirigido por dados**: `TOTAL = DECK.slides.length`. Hoje são **17 slides** (ids 1 a 17) — os comentários de cabeçalho em `main.js` e `data.js` ainda dizem "16 slides" e estão desatualizados; confie em `data.js`, não no comentário. Acrescentar ou remover um slide em `data.js` propaga sozinho para a régua, o contador, a navegação por dígitos e os limites de `step()`.

### Palco e escala

Não há letterbox. O palco é 100vw × 100vh e tudo escala a partir de `--s: calc(100vw / 1920)` (`styles.css:8`). Medidas horizontais e tamanhos de fonte são `calc(N * var(--s))`, onde N é o pixel no palco de referência 1920×1080; posições verticais são porcentagem da altura da viewport. `S()` em `main.js:39` é o mesmo fator no JS, para animações em px.

Consequência prática: **nunca escreva px cru em medida horizontal ou fonte** — use `calc(N * var(--s))` no CSS e multiplique por `S()` no JS, senão o slide deixa de acompanhar a tela.

### Área segura (`safeRight`)

Cada slide traz `safeRight` (0 a 1), a fração da largura da viewport em que o texto pode entrar antes de colidir com o assunto do vídeo de fundo. `main.js:422` copia para a custom property `--safe`, que o CSS consome em `min(var(--zone), calc(100vw * var(--safe) - var(--m-left)))`. `safeRight: 1` libera a largura toda (slides 9, 14, 17).

Ao mudar o vídeo de um slide, reavaliar o `safeRight` dele.

### Ajuste tipográfico em tempo de execução

O layout se autocorrige depois de montado, e é aqui que mora a maior parte da complexidade:

- `fitTitle()` (`main.js:470`) — quebra o título em linhas e desce 72 → 64 → 58 px até caber em duas.
- `distribute()` (`main.js:479`) — mede a faixa de conteúdo e ajusta `--grow` (0,85 a 1,12) mais o `row-gap` para ocupar entre o piso e o teto da faixa. O piso cai de 0,75 para 0,62 quando há painel de vidro (`.glass`), porque o padding vertical dele já consome espaço.
- `fitWidthRow()` (`main.js:515`) e `scaleSheet()` (`main.js:528`) — encolhem números de fechamento e o mock de laudo.

`layoutAll()` (`main.js:535`) roda tudo isso e é rechamado em `resize` (debounce de 150 ms) e em `fullscreenchange`.

Quando algo não cabe, essas funções chamam `report()`, que empilha em `window.__fitReport` e emite `console.warn('[layout] ...')`. **Depois de mexer em copy, tipografia ou layout, abrir o console e conferir que `window.__fitReport` não acusa estouro.** Os arquivos em `qa/` são exatamente esse relatório capturado em várias resoluções (1366×768, 1920×1080, 1920×1200, 2560×1440), com os PNGs de cada slide ao lado; `fora: []` e `blocosOcultos: 0` em todas as linhas é o estado bom. Observação: `qa/report.json` é anterior ao 17º slide (mostra "01 / 16"); `qa/relatorio-final.json` é o mais recente.

### Vídeo: pool de dois elementos

`index.html` traz dois `<video>` fixos. Um fica na frente tocando o slide atual; o outro carrega o próximo em segundo plano (`preloadBack`, `main.js:1042`) e os dois trocam de papel na navegação (`switchVideo`, `main.js:1064`). `vSrc` guarda qual slide está em cada elemento.

Sutilezas já resolvidas, que é fácil quebrar sem querer:

- O pré-carregamento é `gentle`: espera o vídeo da frente chegar a `readyState >= 4` antes de trocar `src`, senão o navegador aborta o download pela metade (`net::ERR_ABORTED`).
- Voltar (`dir === -1`) posiciona o vídeo no **último** frame, não no primeiro, para a volta parecer contínua.
- O slide 17 não tem `video` próprio: reaproveita o do 16, congelado no fim, com a classe `is-zoom`. Qualquer código que assuma "todo slide tem vídeo" precisa passar por `srcOf()`, que devolve `undefined` nesse caso.
- Falha de vídeo liga `is-failed` no contêiner, que revela `.media-fallback` — a apresentação continua.

Os 16 `.mp4` estão **versionados** em `public/videos_1080p/` (não há `.gitignore`), assim como os PNGs de QA. O repositório é pesado por opção.

### Coreografia de entrada

`CHOREO` (`main.js:724`) é um mapa **por id de slide**, de 1 a 17; `buildEnter()` despacha por `s.data.id` e cai em `genericEnter()` quando não há entrada. Portanto **reordenar slides em `data.js` sem remapear `CHOREO` troca a animação de lugar** — os ids são a chave, não a posição.

O texto não entra junto com o corte: `revealWindow()` calcula a janela a partir da duração **efetiva** do vídeo — a duração real dividida por `VIDEO_RATE`, a taxa de reprodução (os vídeos não têm áudio, então acelerar não gera artefato). A janela vai de `REVEAL_START` a `REVEAL_END` dessa duração, de modo que a câmera assente com o texto já parado. Se a timeline for mais longa que o orçamento, ela ganha `timeScale` para caber.

Os quatro números moram juntos no topo de `main.js` — `VIDEO_RATE`, `REVEAL_START`, `REVEAL_START_S3`, `REVEAL_END`. São eles, e não a edição dos `.mp4`, que controlam o ritmo percebido da apresentação; `ENTER_DELAY_MS` é um piso em milissegundos sobre a espera, então em vídeos curtos ele pode limitar a aceleração antes que as frações o façam.

`prep()` põe o slide no estado inicial e `settle()` o crava no estado final sem animação — é o caminho usado quando GSAP não carrega, quando `prefers-reduced-motion` está ligado e depois de resize/fullscreen.

### Degradação

Sem GSAP (`window.gsap` ausente) a apresentação funciona inteira, via `settle()`, só que sem animação. `prefers-reduced-motion` (`RM`) encurta ou remove os movimentos. Manter esses dois caminhos ao acrescentar animação.

## Navegação

Setas, espaço, PageUp/PageDown navegam; dígitos seguidos de Enter saltam (buffer de 1,2 s); F alterna tela cheia; Esc sai; H mostra o lembrete de atalhos. O hash da URL (`#7`) é sincronizado e aceita entrada direta, inclusive no carregamento. Um `LOCK_MS` de 700 ms evita corrida entre trocas rápidas; avançar no meio da revelação **completa** o slide em vez de navegar (`completeReveal`, `main.js:1239`).

## Depuração

`window.__deck` (`main.js:1393`) expõe `goTo(i)`, `state()`, `layoutAll()`, `settle()`, `prep()` e as referências de slides e vídeos — é por aí que os relatórios de `qa/` foram gerados. `window.__fitReport` traz os avisos de layout da última medição.

## Convenções

- ES5 no `main.js`, sem toolchain: nada de arrow function, `const`/`let`, template literal ou opcional chaining.
- Toda interpolação de texto do usuário no HTML passa por `esc()`.
- Números para gráfico ficam `Number` em `data.js`; a formatação pt-BR (`2.160`, `55,6%`) é feita em `main.js` por `fmt()`. Porcentagens já formatadas no briefing ficam string.
- Comentários de código e copy em português.
- Cores, fontes e medidas saem das custom properties do `:root`; não repetir hex nem px soltos.
