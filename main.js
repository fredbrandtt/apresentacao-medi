/* main.js
 * Monta os 16 slides a partir de window.DECK, chrome único, pool de dois
 * vídeos, navegação e coreografia (GSAP via CDN; sem GSAP a apresentação
 * segue funcionando com estados finais, sem animação).
 */
(function () {
  'use strict';

  var DECK = window.DECK;
  var G = window.gsap || null;
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var EXIT_MS = 260;
  var ENTER_DELAY_MS = 520;    /* piso, quando nao ha video com duracao conhecida */
  var LOCK_MS = 700;
  var VIDEO_RATE = 2.0;        /* os videos nao tem audio: acelerar nao gera artefato */
  /* Excesso tolerado ao congelar. O vigia de `timeupdate` e o evento `ended`
   * so acordam depois de passar do ponto, entao corrigir significa seek para
   * tras — e isso custa a remontagem do quadro desde o keyframe anterior, com
   * o elemento em readyState 1 e sem imagem por ate meio segundo (e o video
   * "sumindo" no final). Medido a 2x, o excesso real fica entre 0,21 e 0,35 s
   * em todos os slides; acima deste piso ele para de ser deriva normal e vira
   * falha de verdade (aba em segundo plano, engasgo), que compensa corrigir. */
  var EXCESSO_OK = 0.5;
  var REVEAL_START = 0.35;     /* fracao da duracao efetiva em que o texto comeca */
  var REVEAL_START_S3 = 0.35;  /* slide 3: a contagem termina junto com a camera */
  var REVEAL_END = 0.85;       /* a revelacao tem de terminar antes disso */
  var SKIP_MS = 300;           /* completar a revelacao ao pedido do apresentador */
  /* Volta e video ja no fim: o texto entra de imediato, sem esperar camera. */
  var BACK_REVEAL_MS = 400;
  var BACK_STAGGER = 0.03;
  var VIDEO_FALLBACK_S = 8;
  var DIGIT_BUFFER_MS = 1200;
  var CURSOR_IDLE_MS = 2500;
  var HINT_MS = 2000;
  var TOTAL = DECK.slides.length;

  var EASE_OUT = 'expo.out';
  var EASE_IN = 'expo.in';
  var EASE_COUNT = 'power3.out';

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function S() { return window.innerWidth / 1920; }

  var fitReport = [];
  window.__fitReport = fitReport;
  function report(msg) { fitReport.push(msg); console.warn('[layout] ' + msg); }

  /* Contador: <span data-count="5414" data-from="0" data-fmt="int" data-prefix="" data-suffix="">0</span> */
  function countHTML(target, opts) {
    opts = opts || {};
    var from = opts.from || 0;
    var tag = opts.tag || 'span';
    var cls = opts.cls ? ' class="' + opts.cls + '"' : '';
    var extra = opts.attrs || '';
    return '<' + tag + cls + extra + ' data-count="' + target + '" data-from="' + from + '"' +
      (opts.dec ? ' data-dec="' + opts.dec + '"' : '') +
      ' data-prefix="' + esc(opts.prefix || '') + '" data-suffix="' + esc(opts.suffix || '') + '">' +
      countText(from, opts.prefix || '', opts.suffix || '', opts.dec) + '</' + tag + '>';
  }
  /* data-dec="1": contador com casa decimal em pt-BR (9,3%). */
  function fmtDec(n, dec) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countText(v, prefix, suffix, dec) { return prefix + (dec ? fmtDec(v, dec) : fmt(v)) + suffix; }
  function setCount(el, v) {
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    el.textContent = countText(v, el.getAttribute('data-prefix') || '', el.getAttribute('data-suffix') || '', dec);
  }

  /* Token numérico "+44%" -> {prefix:'+', n:44, suffix:'%'} */
  function parseNumToken(t) {
    var m = /^([+]?)([\d.]+)(%?)$/.exec(t);
    if (!m) return null;
    return { prefix: m[1], n: parseInt(m[2].replace(/\./g, ''), 10), suffix: m[3] };
  }

  /* `eyebrow` entra dentro da zona do titulo: empilhado no fluxo, acima do h1,
   * sem deslocamento calculado a mao — a manchete pode mudar de corpo ou de
   * numero de linhas que a linha de contexto continua no lugar. */
  function titleHTML(title, accentLine, eyebrow) {
    var lines = Array.isArray(title) ? title : [title];
    var data = lines.map(function (t, i) { return { text: t, accent: accentLine === i + 1 }; });
    var plain = lines.map(function (l, i) {
      return '<span' + (accentLine === i + 1 ? ' class="accent"' : '') + '>' + esc(l) + '</span>';
    }).join('<br>');
    var top = eyebrow ? '<p class="cover-eyebrow t-label">' + esc(eyebrow) + '</p>' : '';
    return '<div class="title-zone blk reveal" data-custom>' + top + '<h1 class="t-title" data-lines="' + esc(JSON.stringify(data)) + '">' + plain + '</h1></div>';
  }

  /* Nota e opcional: sem ela o helper devolve string vazia. Sem esta guarda,
   * esc(undefined) imprimia a palavra "undefined" no rodape do slide, porque
   * esc() faz String(s). Slides sem `note` em data.js dependem disto. */
  function noteHTML(text) {
    if (!text) return '';
    return '<p class="note t-label reveal" data-custom>' + esc(text) + '</p>';
  }
  function ruleHTML(cls) { return '<div class="rule blk reveal ' + (cls || '') + '"></div>'; }

  function listHTML(items, cls) {
    return '<ul class="list ' + (cls || '') + '">' + items.map(function (it) {
      var num = it.number ? '<span class="list-num">' + esc(it.number) + '</span>' : '';
      var text = it.lead ? '<span class="list-lead">' + esc(it.lead) + ':</span> ' + esc(it.text) : esc(it.text);
      return '<li class="list-item blk reveal">' + num + '<span class="list-text t-body">' + text + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ------------------------------------------------------------------ */
  /* Layouts (HTML de cada slide)                                        */
  /* ------------------------------------------------------------------ */

  /* Gradiente verde-agua para texto dentro de SVG (background-clip nao
   * funciona em SVG, entao vai por fill com referencia). */
  var SVG_GRAD = '<defs><linearGradient id="gradTeal" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="#0E877E"></stop>' +
    '<stop offset="45%" stop-color="#12A89D"></stop>' +
    '<stop offset="100%" stop-color="#63D6CA"></stop>' +
    '</linearGradient></defs>';

  var LAYOUTS = {};

  /* Capa: linha de contexto e manchete ocupam a coluna esquerda; o veu suave
   * atras do texto existe porque o video 1 passa de quase branco a cinza claro
   * conforme a camera anda, e o titulo precisa de base constante. */
  LAYOUTS.cover = function (c) {
    return '<div class="cover-wash" aria-hidden="true"></div>' +
      titleHTML(c.title, c.titleAccent, c.eyebrow) +
      '<div class="band cover-band">' +
        /* Sem `blk`: quem anima o filete e ruleX() (scaleX). Marcado como
         * `reveal` so para entrar no ciclo de prep/limpeza. */
        '<div class="rule cover-rule reveal draw-x"></div>' +
        '<p class="t-support blk reveal">' + esc(c.support) + '</p>' +
        '<div class="presenter blk reveal">' + c.presenter.map(function (l) { return '<p class="t-label">' + esc(l) + '</p>'; }).join('') + '</div>' +
      '</div>';
  };

  LAYOUTS['text-list'] = function (c) {
    var html = titleHTML(c.title) + '<div class="band">';
    if (c.support) html += '<p class="t-support blk reveal">' + esc(c.support) + '</p>';
    var isKV = c.items.length && c.items[0].label !== undefined;
    if (c.exposures) {
      /* Slide 7 · As duas exposicoes entram num painel unico de vidro: sem
       * ele, as linhas cruzariam a chapa do video (a faixa vai ate 1144 e o
       * assunto comeca por volta de 1130). O numero vira marca de regua em
       * mono, na canaleta, e nao numeral decorativo. */
      html += '<div class="glass expo-panel reveal">' + c.items.map(function (it, k) {
        return '<div class="expo blk reveal" data-custom style="--k: ' + k + '">' +
          '<span class="expo-num t-label">' + esc(it.number) + '</span>' +
          '<p class="expo-text t-body">' + esc(it.text) + '</p>' +
          '<div class="rule draw-x expo-rule"></div>' +
        '</div>';
      }).join('') + '</div>';
    } else if (isKV) {
      /* Slide 2: um painel de vidro em duas colunas. A esquerda, as quatro
       * modalidades em linhas pequenas; a direita, a soma em display grande,
       * a unidade em mono alinhada pela base e uma regua com ticks em que cada
       * segmento e a parte de uma modalidade no total. A regua desenha em
       * sincronia com a contagem: o numero e a linha sao o mesmo dado. */
      var partes = c.items.map(function (it) {
        var mm = /^([\d.]+)/.exec(it.value);
        return mm ? parseInt(mm[1].replace(/\./g, ''), 10) : 0;
      });
      html += '<div class="glass kv-panel reveal"><div class="kv-list">' + c.items.map(function (it) {
        return '<div class="kv blk reveal" data-custom><span class="kv-label">' + esc(it.label) + '</span><span class="kv-value">' + esc(it.value) + '</span><div class="rule draw-x"></div></div>';
      }).join('') + '</div>';
      if (c.total) {
        var m = /^([\d.]+)\s*(.*)$/.exec(c.total.value);
        var alvo = m ? parseInt(m[1].replace(/\./g, ''), 10) : null;
        var unidade = m ? m[2] : '';
        var soma = partes.reduce(function (a, b) { return a + b; }, 0) || alvo || 1;
        var val = (alvo !== null)
          ? countHTML(alvo, { cls: 'kv-total-num grad-v' }) + (unidade ? '<span class="kv-total-unit">' + esc(unidade) + '</span>' : '')
          : '<span class="kv-total-num grad-v">' + esc(c.total.value) + '</span>';
        var acc = 0, segs = '', ticks = '<i class="kv-tick fade" style="left: 0%"></i>';
        partes.forEach(function (n, k) {
          var ini = acc; acc += n;
          segs += '<i class="rule draw-x kv-seg" style="--k: ' + k + '; left: ' + (ini / soma * 100).toFixed(3) + '%; width: ' + (n / soma * 100).toFixed(3) + '%" data-ini="' + ini + '" data-fim="' + acc + '"></i>';
          ticks += '<i class="kv-tick fade" style="left: ' + (acc / soma * 100).toFixed(3) + '%" data-at="' + acc + '"></i>';
        });
        html += '<div class="kv-divider reveal"></div>' +
          '<div class="kv-sum blk reveal" data-custom>' +
            '<div class="kv-sum-value">' + val + '</div>' +
            '<p class="kv-sum-label t-label fade">' + esc(c.total.label) + '</p>' +
            '<div class="kv-ruler" data-total="' + soma + '">' + segs + ticks + '</div>' +
          '</div>';
      }
      html += '</div>';
    } else {
      html += listHTML(c.items);
    }
    if (c.body) {
      var body = c.alertWord ? esc(c.body).replace(esc(c.alertWord), '<span class="alert-word">' + esc(c.alertWord) + '</span>') : esc(c.body);
      /* Com painel, a consequencia entra sozinha e sem filete: o vidro ja
       * fecha o grupo acima dela. */
      html += (c.exposures ? '' : ruleHTML()) +
        '<p class="t-body blk maxw-900 reveal' + (c.exposures ? ' expo-conseq' : '') + '">' + body + '</p>';
    }
    if (c.closing) html += ruleHTML('closing-rule') + '<p class="t-statement blk closing maxw-980 reveal">' + esc(c.closing) + '</p>';
    html += '</div>';
    if (c.note) html += noteHTML(c.note);
    return html;
  };

  LAYOUTS['anchor-number'] = function (c) {
    var m = /^(\d+)(%?)$/.exec(c.number);
    var pct = parseInt(m[1], 10);
    /* Regua de capacidade: a mesma regua de 5.414 do slide 2, agora com so a
     * fracao usada preenchida. A trilha e a capacidade inteira; o preenchimento
     * cresce junto com a contagem do numero-ancora. Os dois rotulos mono saem
     * da propria nota (930 sobre 5.414): sem dois numeros nela, a regua fica
     * sem rotulo, mas continua desenhando a fracao. */
    var nums = String(c.note || '').match(/\d[\d.]*/g) || [];
    var ticks = '';
    for (var k = 0; k <= 10; k++) ticks += '<i class="ocup-tick fade" style="left: ' + (k * 10) + '%"></i>';
    var labels = nums.length >= 2
      ? '<span class="ocup-lbl ocup-lbl-used fade" style="left: ' + pct + '%">' + esc(nums[0]) + '</span>' +
        '<span class="ocup-lbl ocup-lbl-total fade">' + esc(nums[1]) + '</span>'
      : '';
    var ruler = '<div class="ocup-ruler blk reveal" data-custom aria-hidden="true">' +
        '<div class="ocup-bar">' +
          '<i class="rule draw-x ocup-track"></i>' + ticks +
          '<i class="rule draw-x ocup-fill" style="width: ' + pct + '%"></i>' +
          '<i class="ocup-end fade" style="left: ' + pct + '%"></i>' +
        '</div>' +
        '<div class="ocup-labels t-label">' + labels + '</div>' +
      '</div>';
    /* O painel e o unico palco do grupo de dados: as duas linhas e a regua.
     * A nota fica fora dele, no mesmo fluxo, 24 px abaixo: so assim ela
     * acompanha a altura real do painel. */
    return '<div class="anchor-zone blk reveal" data-custom>' + countHTML(pct, { tag: 'p', cls: 't-anchor grad-v is-drift', suffix: m[2] }) + '</div>' +
      '<div class="anchor-stack">' +
        '<div class="anchor-lines glass reveal">' +
          '<p class="anchor-line-1 blk reveal" data-custom>' + esc(c.line1) + '</p>' +
          '<p class="anchor-line-2 blk reveal" data-custom>' + esc(c.line2) + '</p>' +
          ruler +
        '</div>' +
        '<p class="note anchor-note t-label reveal" data-custom>' + esc(c.note) + '</p>' +
      '</div>';
  };

  LAYOUTS['text-statement'] = function (c) {
    /* Slide 5: os achados sao um livro-razao, nao um paragrafo quebrado em
     * linhas. Cada um entra em display e e fechado por um filete que desenha
     * depois que a linha assenta; os tres filetes cobrem a faixa inteira e
     * terminam na mesma vertical, junto da borda do assunto do video. Nao ha
     * filete separador antes do corpo: a consequencia e a conclusao do que
     * foi listado, e entra sozinha, um compasso depois do ultimo achado. */
    return titleHTML(c.title) +
      '<div class="band">' +
        '<div class="statements findings blk reveal" data-custom>' + c.statements.map(function (s, k) {
          return '<p class="t-statement t-finding" data-lines="' + esc(JSON.stringify([{ text: s }])) + '">' + esc(s) + '</p>' +
            '<div class="rule draw-x finding-rule" style="--k: ' + k + '" aria-hidden="true"></div>';
        }).join('') + '</div>' +
        '<p class="t-body blk maxw-820 reveal">' + esc(c.body) + '</p>' +
      '</div>' + noteHTML(c.note);
  };

  LAYOUTS.pivot = function (c) {
    return titleHTML(c.title) +
      '<div class="band">' +
        '<p class="t-support blk reveal">' + esc(c.support) + '</p>' +
        ruleHTML() +
        listHTML(c.items) +
      '</div>';
  };

  LAYOUTS.closing = function (c) {
    var nums = c.numbers.map(function (n, i) {
      var tokens = n.value.split(' ');
      var big = null, rest = [];
      tokens.forEach(function (t) {
        var p = parseNumToken(t);
        if (!big && p) big = countHTML(p.n, { prefix: p.prefix, suffix: p.suffix, cls: 'cn grad-v' });
        else if (p) rest.push(countHTML(p.n, { prefix: p.prefix, suffix: p.suffix, cls: 'cn' }));
        else rest.push(esc(t));
      });
      return '<div class="closing-number glass blk reveal" data-custom style="--k: ' + i + '">' +
        '<svg class="arc-wrap" viewBox="0 0 120 120" aria-hidden="true">' +
          '<circle class="arc" cx="60" cy="60" r="46" style="--len: 289"></circle>' +
        '</svg>' +
        '<p class="t-big">' + big + (rest.length ? '<span class="unit">' + rest.join(' ') + '</span>' : '') + '</p>' +
        '<p class="t-body cn-label">' + esc(n.label) + '</p></div>';
    }).join('');
    return '<div class="band zone-wide">' +
        '<div class="closing-numbers reveal" data-fit-width>' + nums + '</div>' +
        ruleHTML() +
        '<p class="t-statement blk reveal">' + esc(c.statement) + '</p>' +
        listHTML(c.nextSteps) +
      '</div>' +
      '<div class="footer-line blk reveal"><span class="t-credit">' + esc(c.footerLeft) + '</span></div>';
  };

  /* Slide 4 */
  /* Slide 4: cada linha e uma regua. O percentual e o unico elemento grande,
   * em display; rotulo e fracao ficam pequenos. A base do numero, a barra e o
   * filete da regua assentam na mesma linha, e a barra termina em hairline.
   * O viewBox e 1:1 com o palco (painel de 830 menos 2 x 40 de padding = 750),
   * para o mono renderizar nos 16 px do piso, e nao encolhido. */
  LAYOUTS['bars-horizontal'] = function (c) {
    var W = 750, barX = 184, barW = W - barX, rowH = 90, base = 62, barH = 10, tick = 5, lblY = 32;
    var y = 0, rows = '';
    c.bars.forEach(function (b) {
      var fillW = +(barW * b.done / b.capacity).toFixed(1), xe = barX + fillW, by = y + base;
      var pct = parseFloat(String(b.pct).replace('%', '').replace(',', '.'));
      var ticks = '';
      for (var k = 1; k <= 4; k++) {
        var tx = barX + barW * k / 4, th = k === 4 ? tick * 2 : tick;
        ticks += '<line class="cap-tick fade" x1="' + tx + '" y1="' + by + '" x2="' + tx + '" y2="' + (by - th) + '"></line>';
      }
      rows += '<g class="cap-row' + (b.accent ? ' is-accent' : '') + '">' +
        countHTML(pct, { tag: 'text', cls: 'cap-pct pct', suffix: '%', dec: 1, attrs: ' x="0" y="' + by + '"' }) +
        '<text class="cap-lbl fade" x="' + barX + '" y="' + (y + lblY) + '">' + esc(b.label) + '</text>' +
        '<text class="mono cap-frac fade" x="' + W + '" y="' + (y + lblY) + '" text-anchor="end">' + countHTML(b.done, { tag: 'tspan' }) + '<tspan> / ' + fmt(b.capacity) + '</tspan></text>' +
        '<line class="cap-track fade" x1="' + barX + '" y1="' + by + '" x2="' + W + '" y2="' + by + '"></line>' +
        ticks +
        (b.accent ? '<rect class="cap-glow" x="' + barX + '" y="' + (by - barH) + '" width="' + fillW + '" height="' + barH + '"></rect>' : '') +
        '<rect class="' + (b.accent ? 'bar-pro' : 'bar-cur') + ' grow-x" x="' + barX + '" y="' + (by - barH) + '" width="' + fillW + '" height="' + barH + '"></rect>' +
        '<line class="cap-end fade" data-dx="' + fillW + '" x1="' + xe + '" y1="' + by + '" x2="' + xe + '" y2="' + (by - barH - 8) + '"></line>' +
        '</g>';
      y += rowH;
      if (b.callout) {
        rows += '<text class="cap-callout callout grad-svg" x="' + barX + '" y="' + (y - 2) + '">' + esc(b.callout) + '</text>';
        y += 34;
      }
    });
    var H = y - 12;
    return titleHTML(c.title) +
      '<div class="band">' +
        '<div class="glass reveal"><svg class="chart blk reveal" data-custom viewBox="0 0 ' + W + ' ' + H + '" style="aspect-ratio: ' + W + ' / ' + H + '">' + SVG_GRAD + rows + '</svg></div>' +
      '</div>' + noteHTML(c.note);
  };

  /* Slide 6 · A espera tem forma propria.
   *
   * O video e uma colunata de chapas recuando ate o anel do tomografo: um
   * ritmo de elementos repetidos em fuga. A espera do laudo e desenhada com
   * esse mesmo vocabulario — uma regua de 11 ticks em mono, um por dia util,
   * marchando da esquerda para a direita. O numero de dias e o unico elemento
   * grande do slide (display, escala de ancora); rotulo, unidade e pontos
   * ficam pequenos, sem nada no meio.
   *
   * O trecho vencido (do dia 3, que e a proposta MEDI, ate o 11) e o que doi:
   * fica em trilha fina e recebe o pulso lento depois da revelacao. Um
   * hairline vertical fecha a regua onde ela para, como no slide 3. */
  LAYOUTS.timeline = function (c) {
    var pts = c.timeline.points;
    /* "11 dias úteis" -> 11 e "dias úteis", sem tocar em data.js. */
    var seg = String(c.timeline.segmentLabel);
    var mSeg = /^(\d+)\s*(.*)$/.exec(seg);
    var dias = mSeg ? parseInt(mSeg[1], 10) : 11;
    var unidade = mSeg ? mSeg[2] : seg;

    /* O percurso vai do exame ao retorno medico (0 a 1). Os dias uteis
     * terminam no marco intermediario de data.js: os ticks e o preenchimento
     * param ali, e dali ate o retorno segue so a trilha fina. */
    var meio = pts.filter(function (p) { return p.at > 0 && p.at < 1; })[0];
    var fim = meio ? meio.at : 1;
    var pctFim = (fim * 100).toFixed(3) + '%';

    var ticks = '';
    for (var d = 0; d <= dias; d++) {
      var pos = (d / dias * fim * 100).toFixed(3);
      var forte = (d === 0 || d === dias);
      ticks += '<i class="pz-tick fade' + (forte ? ' is-forte' : '') + '" style="left: ' + pos + '%"></i>';
    }
    /* Marcos: as pontas numa linha, o laudo na linha de baixo, pendurado no
     * proprio tick por uma linha-guia. Sem transform: prep()/settle() limpam
     * o inline e a posicao precisa viver no CSS.
     *
     * As classes sao .pz-m-start/.pz-m-mid/.pz-m-end e o CSS casa com elas
     * via .pz-marco.pz-m-*. Nao encurtar para .pz-end: esse nome ja e o
     * hairline vertical da regua, e a colisao empilhava os tres rotulos. */
    var marcos = pts.map(function (p) {
      if (p.at === 0) return '<span class="pz-marco pz-m-start fade">' + esc(p.label) + '</span>';
      if (p.at === 1) return '<span class="pz-marco pz-m-end fade">' + esc(p.label) + '</span>';
      return '<span class="pz-marco pz-m-mid fade" style="right: ' + ((1 - p.at) * 100).toFixed(3) + '%">' + esc(p.label) + '</span>';
    }).join('');

    var m = /^(\d+)(%?)$/.exec(c.stat.number);
    return titleHTML(c.title) +
      '<div class="band to-84">' +
        /* O painel de vidro e o palco unico do grupo de dados: numero grande,
         * regua dos dias e a parcela que cabe no prazo. Fica na coluna
         * esquerda, com folga antes da chapa da frente. */
        '<div class="glass prazo-panel reveal">' +
          '<div class="pz-head blk reveal" data-custom>' +
            countHTML(dias, { tag: 'span', cls: 'pz-num' }) +
            '<span class="pz-unit">' + esc(unidade) + '</span>' +
            '<span class="pz-ate">até o laudo</span>' +
          '</div>' +
          '<div class="pz-ruler blk reveal" data-custom aria-hidden="true">' +
            '<div class="pz-bar">' +
              '<i class="rule draw-x pz-track"></i>' + ticks +
              '<i class="rule draw-x pz-fill" style="width: ' + pctFim + '"></i>' +
              '<i class="pz-end fade" style="left: ' + pctFim + '"></i>' +
              '<i class="pz-lead fade" style="left: ' + pctFim + '"></i>' +
            '</div>' +
            '<div class="pz-marcos t-label">' + marcos + '</div>' +
          '</div>' +
          /* A parcela no prazo e pequena e tem forma propria: uma frase com o
           * numero em mono e, abaixo, a barra curta contra a trilha inteira.
           * Sem filete entre os dois blocos: cada instrumento ja e uma linha. */
          '<div class="pz-stat blk reveal" data-custom>' +
            '<p class="t-body pz-share-txt">' +
              countHTML(parseInt(m[1], 10), { tag: 'span', cls: 'pz-pct', suffix: m[2] }) +
              ' ' + esc(c.stat.text) +
            '</p>' +
            '<div class="pz-share" aria-hidden="true">' +
              '<i class="rule draw-x pz-share-track"></i>' +
              '<i class="rule draw-x pz-share-fill" style="width: ' + esc(c.stat.number) + '"></i>' +
              '<i class="pz-share-end fade" style="left: ' + esc(c.stat.number) + '"></i>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="t-body blk reveal">' + esc(c.body) + '</p>' +
        /* Sem filete: no slide 6 a pergunta fecha o argumento sozinha, e um
         * filete atras da linha de base virava sublinhado. */
        '<p class="t-statement blk closing reveal">' + esc(c.closing) + '</p>' +
      '</div>' + noteHTML(c.note);
  };

  /* Slide 12 */
  LAYOUTS['bars-grouped'] = function (c) {
    /* O viewBox e 1:1 com o palco e o desenho ocupa a faixa segura inteira:
     * era o recorte estreito, centrado num painel largo, que deixava as
     * laterais mortas. A largura do par de barras e derivada da canaleta
     * (gw), e nao fixa, de modo que o grafico cresce com o palco em vez de
     * boiar no meio dele. padT abre a faixa dos deltas; padB acomoda o
     * rotulo da modalidade. */
    /* A proporcao do viewBox e casada com a area interna do painel
     * (852 x 300 de palco, menos 40 de padding em cada lado = 772 x 220,
     * ou 3,509:1). Com W = 1180, H = 1180 / 3,509 = 336. Assim o `meet` do
     * SVG nao tem letterbox para criar: o desenho preenche o painel sem
     * faixa morta e sem precisar esticar o viewBox, que deformaria o texto. */
    var W = 1180, H = 336, padL = 74, padR = 20, padT = 62, padB = 46;
    var plotH = H - padT - padB, plotW = W - padL - padR;
    var groups = c.chart.groups, max = c.chart.axisMax, gw = plotW / groups.length;
    /* Par de barras ocupando 62% da canaleta: cheio o bastante para ter
     * presenca, com respiro suficiente entre modalidades. */
    var gap = Math.round(gw * 0.05), bw = Math.round((gw * 0.62 - gap) / 2);
    function yOf(v) { return padT + plotH - (v / max) * plotH; }
    var grid = [0, 200, 400, 600].filter(function (t) { return t <= max; }).map(function (t) {
      var y = yOf(t);
      return '<line class="axis fade" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"></line>' +
        '<text class="mono fade" x="' + (padL - 16) + '" y="' + (y + 6) + '" text-anchor="end">' + fmt(t) + '</text>';
    }).join('');
    var bars = groups.map(function (g, i) {
      var cx = padL + gw * i + gw / 2, xa = cx - bw - gap / 2, xb = cx + gap / 2;
      var ya = yOf(g.current), yb = yOf(g.proposal), top = Math.min(ya, yb);
      var s = '<g>';
      if (g.current > 0) s += '<rect class="bar-cur grow-y" x="' + xa + '" y="' + ya + '" width="' + bw + '" height="' + (yOf(0) - ya) + '"></rect>';
      s += '<text class="mono val-cur" x="' + (xa + bw / 2) + '" y="' + (ya - 8) + '" text-anchor="middle">' + fmt(g.current) + '</text>';
      s += '<rect class="bar-pro grow-y" x="' + xb + '" y="' + yb + '" width="' + bw + '" height="' + (yOf(0) - yb) + '"></rect>';
      s += '<rect class="bar-glow" x="' + xb + '" y="' + yb + '" width="' + bw + '" height="1" fill="#FFFFFF" opacity="0.25"></rect>';
      s += '<text class="mono val-pro" x="' + (xb + bw / 2) + '" y="' + (yb - 8) + '" text-anchor="middle">' + fmt(g.proposal) + '</text>';
      /* "+65%" e numero medido (mono, tabular); "novo serviço" e prosa. */
      var deltaNum = /\d/.test(String(g.delta)) ? ' is-num' : '';
      s += '<text class="lbl delta' + deltaNum + '" x="' + cx + '" y="' + (top - 34) + '" text-anchor="middle">' + esc(g.delta) + '</text>';
      s += '<text class="mono fade" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(g.label) + '</text>';
      return s + '</g>';
    }).join('');
    var m = /^([\d.]+)$/.exec(c.stat.number);
    var target = parseInt(m[1].replace(/\./g, ''), 10);
    return titleHTML(c.title) +
      '<div class="band">' +
        '<div class="glass reveal">' +
          '<svg class="chart blk reveal" data-custom viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + grid + bars + '</svg>' +
        '</div>' +
        '<div class="stat-aside blk reveal" data-custom>' + countHTML(target, { tag: 'p', cls: 't-stat', from: 930 }) + '<p class="t-body">' + esc(c.stat.text) + '</p></div>' +
        '<p class="t-statement blk closing maxw-980 reveal">' + esc(c.closing) + '</p>' +
      '</div>';
  };

  /* Slide 11 */
  LAYOUTS['comparison-table'] = function (c) {
    var t = c.table;
    var rows = '<div class="cmp-row cmp-head blk reveal" data-custom><span></span><span>' + esc(t.columns.current) + '</span><span>' + esc(t.columns.proposal) + '</span><div class="rule draw-x"></div></div>' +
      t.rows.map(function (r) {
        return '<div class="cmp-row blk reveal" data-custom><span class="c-label">' + esc(r.label) + '</span><span class="c-current">' + esc(r.current) + '</span><span class="c-proposal">' + esc(r.proposal) + '</span><div class="rule draw-x"></div></div>';
      }).join('');
    return titleHTML(c.title) +
      '<div class="band zone-wide to-84"><div class="glass reveal"><div class="cmp">' + rows + '</div></div></div>' +
      noteHTML(c.note);
  };

  /* Slide 13
   * Os dois blocos e o fechamento assentam sobre o mesmo painel de vidro dos
   * demais slides. Era o unico layout de texto corrido que caia direto no
   * frame: o video 13 tem a gantry em cinza medio bem no meio da zona segura,
   * e o corpo em --ink-body sumia nela. O vidro e o material ja estabelecido
   * do deck — trazer o slide para dentro dele, e nao inventar caixa nova. */
  LAYOUTS['text-two-blocks'] = function (c) {
    return titleHTML(c.title) +
      '<div class="band">' +
        '<div class="glass duo-panel reveal">' +
          '<div class="two-blocks">' + c.blocks.map(function (b) {
            return '<div class="block blk reveal"><p class="t-statement">' + esc(b.heading) + '</p><p class="t-body">' + esc(b.body) + '</p></div>';
          }).join('') + '</div>' +
          ruleHTML('closing-rule') +
          '<p class="t-statement blk closing maxw-980 reveal">' + esc(c.closing) + '</p>' +
        '</div>' +
      '</div>' + noteHTML(c.note);
  };

  /* Slide 14 */
  function sheetChartSVG(chart) {
    var W = 488, H = 120, padL = 36, padR = 8, padT = 10, padB = 22, vals = chart.values, min = chart.min, max = chart.max, n = vals.length;
    function x(i) { return padL + (W - padL - padR) * (i / (n - 1)); }
    function y(v) { return padT + (H - padT - padB) * (1 - (v - min) / (max - min)); }
    var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
    var dots = vals.map(function (v, i) { return '<circle class="pop" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="var(--medi-teal)"></circle>'; }).join('');
    var ticks = [min, max].map(function (t) {
      return '<line x1="' + padL + '" y1="' + y(t) + '" x2="' + (W - padR) + '" y2="' + y(t) + '" stroke="var(--line)" stroke-width="1"></line>' +
        '<text x="' + (padL - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-family="var(--font-mono)" font-size="16" fill="var(--ink-muted)">' + t + '</text>';
    }).join('');
    var months = vals.map(function (v, i) { return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="16" fill="var(--ink-muted)">M' + (i + 1) + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '">' + ticks + months +
      '<polyline class="draw" points="' + pts + '" fill="none" stroke="var(--medi-teal)" stroke-width="1.5"></polyline>' +
      '<polyline class="redraw" points="' + vals.slice(-2).map(function (v, k) { var i2 = n - 2 + k; return x(i2).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ') + '" fill="none" stroke="var(--medi-teal)" stroke-width="1.5"></polyline>' +
      dots + '</svg>';
  }

  LAYOUTS['report-mock'] = function (c) {
    var m = c.mock;
    var sheet = '<div class="mock-wrap blk reveal" data-custom><div class="sheet glass reveal">' +
      '<p class="t-credit sheet-head">' + esc(m.header) + '</p>' +
      '<table><thead><tr><th>' + esc(m.columns[0]) + '</th><th class="num">' + esc(m.columns[1]) + '</th><th class="num">' + esc(m.columns[2]) + '</th></tr></thead><tbody>' +
      m.rows.map(function (r) { return '<tr><td>' + esc(r.label) + '</td><td class="num">' + esc(r.a) + '</td><td class="num">' + esc(r.b) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<div class="sheet-chart"><p class="t-credit">' + esc(m.chart.label) + '</p>' + sheetChartSVG(m.chart) + '</div>' +
      '<p class="t-credit sheet-foot">' + esc(m.footer) + '</p>' +
      '</div></div>';
    return titleHTML(c.title) +
      '<div class="band" style="width: calc(900 * var(--s))">' +
        listHTML(c.items) +
        ruleHTML('closing-rule') +
        '<p class="t-statement blk closing reveal">' + esc(c.closing) + '</p>' +
      '</div>' + sheet;
  };

  /* Slide 17: encerramento. Sem video proprio: o do slide 16 fica congelado
   * no ultimo frame, com zoom lento por CSS e um veu branco atras do logo. */
  LAYOUTS['logo-end'] = function (c) {
    return '<div class="veil reveal" data-custom></div>' +
      '<div class="logo-end">' +
        '<span class="logo-end-wrap blk reveal" data-custom>' +
          '<img class="logo-end-mark" src="' + esc(c.logo) + '" alt="' + esc(c.logoAlt) + '">' +
          '<span class="logo-end-spec"></span>' +
        '</span>' +
        '<p class="logo-end-cities t-credit blk reveal" data-custom>' + c.cities.map(function (n) {
          return n === c.highlight ? '<span class="grad">' + esc(n) + '</span>' : esc(n);
        }).join('  ·  ') + '</p>' +
      '</div>';
  };

  /* Slide 9: mapa do Maranhão (malha IBGE, qualidade mínima), projeção equirretangular. */
  var MA_RINGS = [[[-48.0254,-4.7783],[-48.0584,-4.8042],[-48.1946,-4.911],[-48.2124,-4.9249],[-48.4519,-5.1122],[-48.7552,-5.3492],[-48.6061,-5.3365],[-48.5611,-5.2302],[-48.4872,-5.1939],[-48.3639,-5.1684],[-48.225,-5.2355],[-48.1849,-5.257],[-48.0691,-5.2715],[-48.0147,-5.238],[-47.9373,-5.2396],[-47.8667,-5.3053],[-47.8275,-5.3866],[-47.6804,-5.4154],[-47.5603,-5.4632],[-47.4797,-5.6217],[-47.4769,-5.6373],[-47.4423,-5.8308],[-47.4379,-5.8571],[-47.4394,-6.0118],[-47.4302,-6.0684],[-47.3807,-6.25],[-47.4303,-6.4226],[-47.4252,-6.4974],[-47.4651,-6.5815],[-47.4962,-6.6972],[-47.5205,-6.8405],[-47.5471,-7.0167],[-47.6604,-7.1514],[-47.7451,-7.1625],[-47.684,-7.2454],[-47.6507,-7.3023],[-47.5429,-7.2654],[-47.4782,-7.3368],[-47.5916,-7.4401],[-47.5028,-7.4391],[-47.4298,-7.5472],[-47.2467,-7.8086],[-47.1902,-7.8421],[-47.0148,-8.0588],[-46.8066,-7.951],[-46.6086,-7.893],[-46.5012,-7.9732],[-46.4657,-8.0727],[-46.544,-8.3174],[-46.7267,-8.3831],[-46.7824,-8.3681],[-46.8461,-8.534],[-46.9032,-8.5932],[-46.9181,-8.857],[-47.0383,-9.0006],[-47.0687,-9.0639],[-46.9403,-9.0637],[-46.9263,-9.1349],[-46.8196,-9.2116],[-46.8471,-9.2924],[-46.7543,-9.4138],[-46.6328,-9.4116],[-46.5392,-9.5601],[-46.5924,-9.5872],[-46.6444,-9.7403],[-46.5129,-9.7975],[-46.4751,-9.9045],[-46.4452,-10.0774],[-46.3248,-10.1832],[-46.1949,-10.183],[-46.0232,-10.1834],[-46.0124,-10.2507],[-45.9463,-10.2585],[-45.8425,-9.9395],[-45.866,-9.8716],[-45.8297,-9.6799],[-45.8419,-9.5629],[-45.7911,-9.4828],[-45.8937,-9.3426],[-45.9362,-9.0383],[-45.9951,-8.927],[-45.9384,-8.7868],[-45.8408,-8.7158],[-45.7064,-8.3876],[-45.6636,-8.2505],[-45.5837,-8.1569],[-45.5208,-7.8873],[-45.5383,-7.8616],[-45.4558,-7.67],[-45.3407,-7.5818],[-45.0856,-7.5023],[-44.9893,-7.4824],[-44.9853,-7.481],[-44.8173,-7.3615],[-44.6904,-7.3958],[-44.5653,-7.2287],[-44.3861,-7.1209],[-44.3129,-7.1186],[-44.276,-7.0581],[-44.2493,-7.0005],[-44.1163,-6.8058],[-43.9305,-6.7711],[-43.7538,-6.7035],[-43.6375,-6.7196],[-43.4886,-6.8215],[-43.4546,-6.846],[-43.3912,-6.8342],[-43.2479,-6.7677],[-42.9928,-6.7487],[-42.9151,-6.648],[-42.8864,-6.5046],[-42.8473,-6.2782],[-42.9784,-6.1385],[-43.0491,-6.1016],[-43.0964,-5.9097],[-43.0751,-5.865],[-43.0949,-5.6149],[-43.0042,-5.5427],[-42.9684,-5.4535],[-42.8158,-5.318],[-42.799,-5.1897],[-42.8898,-4.8947],[-42.8927,-4.888],[-42.9531,-4.6874],[-42.8501,-4.498],[-42.9486,-4.3855],[-42.9643,-4.3607],[-42.9864,-4.2205],[-42.9428,-4.1673],[-42.856,-4.0794],[-42.7906,-3.9791],[-42.7217,-3.8844],[-42.6715,-3.7916],[-42.6835,-3.6945],[-42.6331,-3.6321],[-42.6167,-3.6107],[-42.5627,-3.5594],[-42.4964,-3.4459],[-42.4703,-3.4838],[-42.3999,-3.4748],[-42.2727,-3.4447],[-42.2017,-3.4313],[-42.1258,-3.3464],[-42.1236,-3.2668],[-41.9856,-3.2225],[-41.9798,-3.216],[-41.8691,-3.0603],[-41.7967,-2.9606],[-41.8344,-2.9156],[-41.826,-2.7573],[-41.8072,-2.73],[-42.043,-2.7296],[-42.0713,-2.687],[-42.2226,-2.6922],[-42.2636,-2.7579],[-42.4876,-2.7033],[-42.6415,-2.6253],[-43.0148,-2.4567],[-43.2374,-2.3587],[-43.3116,-2.3387],[-43.3781,-2.3422],[-43.4833,-2.3853],[-43.4617,-2.4864],[-43.5374,-2.4219],[-43.5786,-2.5061],[-43.6968,-2.5149],[-43.7412,-2.4351],[-43.6446,-2.4013],[-43.5943,-2.2827],[-43.7204,-2.2914],[-43.7619,-2.4187],[-43.8381,-2.4167],[-43.8502,-2.51],[-43.9312,-2.5616],[-44.0788,-2.7438],[-44.1484,-2.7681],[-44.2658,-2.7604],[-44.1757,-2.7021],[-44.0928,-2.5747],[-44.0362,-2.5567],[-44.0523,-2.4661],[-44.0318,-2.4063],[-44.1738,-2.458],[-44.1837,-2.461],[-44.2208,-2.4739],[-44.3046,-2.4875],[-44.41,-2.7992],[-44.4248,-2.9439],[-44.4955,-3.026],[-44.5481,-3.0451],[-44.5916,-3.0409],[-44.6625,-3.0129],[-44.652,-2.893],[-44.6501,-2.805],[-44.5553,-2.5965],[-44.358,-2.3405],[-44.4626,-2.145],[-44.6444,-2.2963],[-44.6777,-2.2805],[-44.4973,-2.0253],[-44.5777,-2.0292],[-44.4821,-1.9883],[-44.5517,-1.8885],[-44.5341,-1.8222],[-44.6153,-1.7633],[-44.7594,-1.783],[-44.7016,-1.725],[-44.7998,-1.7043],[-44.6363,-1.6166],[-44.7234,-1.5567],[-44.8537,-1.6175],[-44.8899,-1.6036],[-44.8604,-1.4113],[-44.9531,-1.56],[-45.0082,-1.4856],[-45.196,-1.4881],[-45.2682,-1.5986],[-45.3238,-1.597],[-45.3086,-1.3329],[-45.4755,-1.4798],[-45.5144,-1.3081],[-45.6108,-1.2746],[-45.6899,-1.2736],[-45.7813,-1.1926],[-45.7891,-1.1873],[-45.7965,-1.1826],[-45.8467,-1.213],[-45.8539,-1.0528],[-45.954,-1.2022],[-45.9946,-1.053],[-46.1041,-1.202],[-46.1616,-1.2819],[-46.1037,-1.3373],[-46.1761,-1.4774],[-46.1613,-1.6228],[-46.2112,-1.7272],[-46.3152,-1.7416],[-46.31,-1.8063],[-46.211,-1.8311],[-46.2234,-1.9149],[-46.2632,-2.0493],[-46.2833,-2.1544],[-46.4163,-2.2738],[-46.4394,-2.4132],[-46.4358,-2.4709],[-46.5068,-2.6169],[-46.6061,-2.6395],[-46.6696,-2.7346],[-46.5896,-2.8458],[-46.6811,-2.8936],[-46.6765,-3.0941],[-46.7689,-3.1765],[-46.8122,-3.3021],[-46.9443,-3.3772],[-46.9485,-3.4768],[-47.0383,-3.5643],[-47.0306,-3.6046],[-47.0887,-3.8616],[-47.3472,-4.1087],[-47.3718,-4.2456],[-47.442,-4.2874],[-47.6152,-4.56],[-47.68,-4.6086],[-47.8162,-4.6147],[-48.0254,-4.7783]],
[[-44.4815,-2.7266],[-44.5862,-2.8147],[-44.6381,-2.981],[-44.5609,-3.0225],[-44.479,-2.9579],[-44.4815,-2.7266]],
[[-44.9662,-1.2711],[-45.0288,-1.318],[-44.9891,-1.4016],[-44.8669,-1.3287],[-44.9662,-1.2711]]];
  var MAP_LABELS = {
    'São Luís':      { anchor: 'end',   dx: -18, dy: 5 },
    'Rosário':       { anchor: 'start', dx: 16,  dy: -6 },
    'Santa Rita':    { anchor: 'start', dx: 16,  dy: 22, leader: true },
    'Paulo Ramos':   { anchor: 'end',   dx: -18, dy: -4 },
    'Lago da Pedra': { anchor: 'start', dx: 18,  dy: 12 }
  };

  LAYOUTS.map = function (c) {
    var W = 828, H = 800;
    var lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
    MA_RINGS.forEach(function (ring) { ring.forEach(function (p) {
      lonMin = Math.min(lonMin, p[0]); lonMax = Math.max(lonMax, p[0]); latMin = Math.min(latMin, p[1]); latMax = Math.max(latMax, p[1]);
    }); });
    var kx = Math.cos((latMin + latMax) / 2 * Math.PI / 180);
    var spanX = (lonMax - lonMin) * kx, spanY = latMax - latMin, pad = 10;
    var scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    var offX = W - spanX * scale - pad, offY = (H - spanY * scale) / 2;
    function proj(lon, lat) { return [offX + (lon - lonMin) * kx * scale, offY + (latMax - lat) * scale]; }
    var path = MA_RINGS.map(function (ring) {
      return 'M' + ring.map(function (p) { var q = proj(p[0], p[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L') + 'Z';
    }).join(' ');
    var pins = c.map.points.map(function (p) {
      var q = proj(p.lon, p.lat), cfg = MAP_LABELS[p.name] || { anchor: 'start', dx: 16, dy: 5 };
      var lx = q[0] + cfg.dx, ly = q[1] + cfg.dy, s = '<g class="pin-group" data-kind="' + p.kind + '">';
      if (cfg.leader) s += '<line class="leader fade" x1="' + q[0].toFixed(1) + '" y1="' + q[1].toFixed(1) + '" x2="' + (lx - 6).toFixed(1) + '" y2="' + (ly - 5).toFixed(1) + '"></line>';
      if (p.kind === 'next') s += '<circle class="ring ring-9" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="0"></circle>';
      s += '<circle class="' + (p.kind === 'next' ? 'pin-next' : 'pin') + ' pop" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="5"></circle>';
      s += '<text class="name fade" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + cfg.anchor + '">' + esc(p.name) + '</text>';
      if (p.sub) s += '<text class="sub fade" x="' + lx.toFixed(1) + '" y="' + (ly + 22).toFixed(1) + '" text-anchor="' + cfg.anchor + '">' + esc(p.sub) + '</text>';
      return s + '</g>';
    }).join('');
    /* Cada fato abre com o dado que sustenta o argumento. O numeral sai da
     * frase e vira figura: mono tabular, corpo grande, base alinhada com a
     * legenda ao lado. Quando o fato nao comeca por numero (o relatorio
     * mensal), a cadencia ocupa o lugar da figura, no mesmo corpo — assim a
     * coluna tem tres figuras e nenhuma medida intermediaria. */
    var figs = c.facts.map(function (f) {
      var m = /^(\d+)\s+(.*)$/.exec(f);
      if (m) return { count: parseInt(m[1], 10), fig: m[1], rest: m[2] };
      var k = /\bmensal\b/i.exec(f);
      if (k) return { fig: 'Mensal', rest: f.replace(/\s*mensal\s*/i, ' ').replace(/\s+/g, ' ').trim() };
      return { fig: '', rest: f };
    });
    return titleHTML(c.title) +
      '<div class="band">' +
        '<div class="glass reveal">' + figs.map(function (g) {
          var fig = g.count !== undefined
            ? '<span class="fact-fig" data-count="' + g.count + '" data-from="0">0</span>'
            : '<span class="fact-fig is-word">' + esc(g.fig) + '</span>';
          return '<div class="fact blk reveal" data-custom>' +
            '<div class="fact-row">' + fig +
              '<p class="fact-text">' + esc(g.rest) + '</p>' +
            '</div>' +
            '<div class="rule draw-x"></div></div>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="map-wrap blk reveal" data-custom><svg class="map" viewBox="0 0 ' + W + ' ' + H + '"><path class="state draw" d="' + path + '"></path>' + pins + '</svg></div>' +
      (c.note ? noteHTML(c.note) : '');
  };

  /* ------------------------------------------------------------------ */
  /* Montagem                                                            */
  /* ------------------------------------------------------------------ */

  var stage = document.getElementById('stage');
  var slidesRoot = document.getElementById('slides');
  var media = document.getElementById('media');
  var vids = Array.prototype.slice.call(media.querySelectorAll('.bg-video'));
  var curtain = document.getElementById('curtain');
  var logosEl = document.getElementById('logos');
  var rulerEl = document.getElementById('ruler');
  var creditEl = document.getElementById('credit');
  var hintEl = document.getElementById('hint');
  var fsBtn = document.getElementById('fsBtn');

  var slides = DECK.slides.map(function (s, i) {
    var sec = document.createElement('section');
    sec.className = 'slide';
    sec.id = 'slide-' + s.id;
    sec.setAttribute('data-id', s.id);
    sec.setAttribute('data-layout', s.layout);
    if (s.safeRight) sec.style.setProperty('--safe', s.safeRight);
    sec.setAttribute('aria-hidden', 'true');
    var render = LAYOUTS[s.layout];
    sec.innerHTML = render ? render(s.content) : '';
    if (!render) console.error('Layout desconhecido: ' + s.layout);
    /* Fio de luz e halo entram defasados em cada painel do mesmo slide,
     * para a borda nao pulsar em bloco. */
    Array.prototype.forEach.call(sec.querySelectorAll('.glass'), function (g, k) {
      g.style.setProperty('--orbit-delay', (k * -2.2).toFixed(1) + 's');
    });
    slidesRoot.appendChild(sec);
    return { index: i, data: s, el: sec };
  });

  /* Chrome */
  (function buildChrome() {
    var L = DECK.meta.logos;
    logosEl.innerHTML = '<img class="logo-medi" src="' + esc(L.medi.src) + '" alt="' + esc(L.medi.alt) + '">' +
      '<span class="logo-divisor" aria-hidden="true"></span>' +
      '<img class="logo-prefeitura" src="' + esc(L.prefeitura.src) + '" alt="' + esc(L.prefeitura.alt) + '">';
    var marks = '';
    for (var i = 0; i < TOTAL; i++) marks += '<div class="ruler-mark" style="top:' + (i / (TOTAL - 1) * 100).toFixed(3) + '%"></div>';
    rulerEl.innerHTML = marks + '<div class="ruler-active" id="rulerActive" style="top:0%"></div><p class="t-credit ruler-index" id="rulerIndex" style="top:0%">01 / ' + pad2(TOTAL) + '</p>';
    /* O credito persistente saiu: poluia o rodape de todos os slides. O
     * elemento continua no DOM (vazio) para nao quebrar quem o referencia. */
    creditEl.textContent = '';
    hintEl.textContent = DECK.meta.shortcuts || '';
  })();
  var rulerActive = document.getElementById('rulerActive');
  var rulerIndex = document.getElementById('rulerIndex');

  /* ------------------------------------------------------------------ */
  /* Diagramação: títulos por linha, ajuste de densidade, folha          */
  /* ------------------------------------------------------------------ */

  function splitLines(el) {
    var lines = JSON.parse(el.getAttribute('data-lines'));
    el.innerHTML = lines.map(function (l) {
      return '<span class="tgroup' + (l.accent ? ' accent' : '') + '">' +
        l.text.split(' ').map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ') + '</span>';
    }).join('<br>');
    var out = [];
    Array.prototype.forEach.call(el.querySelectorAll('.tgroup'), function (g) {
      var accent = g.classList.contains('accent'), cur = null, curTop = null;
      Array.prototype.forEach.call(g.querySelectorAll('.w'), function (w) {
        var top = w.offsetTop;
        if (cur === null || Math.abs(top - curTop) > 2) { cur = []; curTop = top; out.push({ words: cur, accent: accent }); }
        cur.push(w.textContent);
      });
    });
    el.innerHTML = out.map(function (l) {
      return '<span class="tl"><span class="tl-in' + (l.accent ? ' accent grad' : '') + '">' + esc(l.words.join(' ')) + '</span></span>';
    }).join('');
    return out.length;
  }

  function fitTitle(h1, id) {
    h1.classList.remove('is-64', 'is-58');
    var n = splitLines(h1);
    if (n > 2) { h1.classList.add('is-64'); n = splitLines(h1); }
    if (n > 2) { h1.classList.remove('is-64'); h1.classList.add('is-58'); n = splitLines(h1); }
    if (n > 2) report('slide ' + id + ': título com ' + n + ' linhas mesmo no menor degrau');
    else if (h1.classList.contains('is-64') || h1.classList.contains('is-58')) fitReport.push('slide ' + id + ': título a ' + (h1.classList.contains('is-64') ? 58 : 52) + ' px para caber em duas linhas');
  }

  function distribute(s) {
    var sec = s.el, band = sec.querySelector('.band');
    if (!band) return;
    sec.style.setProperty('--grow', '1');
    band.classList.remove('is-spread');
    var B = band.clientHeight;
    band.style.rowGap = '';
    var kids = Array.prototype.slice.call(band.children);
    var baseGap = parseFloat(getComputedStyle(band).rowGap) || 0;
    function measure() {
      var gap = parseFloat(getComputedStyle(band).rowGap) || 0;
      return kids.reduce(function (a, k) { return a + k.getBoundingClientRect().height; }, 0) + gap * (kids.length - 1);
    }
    /* Painel de vidro custa padding vertical: com ele, o piso de ocupacao
     * cai, senao a faixa tenta crescer a tipografia e estoura. */
    var temVidro = !!band.querySelector('.glass');
    var PISO = temVidro ? 0.62 : 0.75;
    var h = measure(), g = 1;
    if (h > B) {
      while (h > B && g > 0.85) { g -= 0.025; sec.style.setProperty('--grow', g.toFixed(3)); h = measure(); }
      if (h > B) report('slide ' + s.data.id + ': conteúdo excede a faixa 36% a 82% mesmo a ' + Math.round(g * 100) + '%');
      else fitReport.push('slide ' + s.data.id + ': texto de conteúdo reduzido para ' + Math.round(g * 100) + '%');
      return;
    }
    if (h < PISO * B) {
      g = Math.min(1.12, PISO * B / h);
      sec.style.setProperty('--grow', g.toFixed(3));
      h = measure();
      if (h < PISO * B && kids.length >= 2 && s.data.layout !== 'cover') {
        var extra = (PISO * B - h) / (kids.length - 1);
        var maxGap = 96 * S();
        band.style.rowGap = Math.min(maxGap, baseGap + extra).toFixed(2) + 'px';
      }
    }
  }

  function fitWidthRow(s) {
    var row = s.el.querySelector('[data-fit-width]');
    if (!row) return;
    var bigs = row.querySelectorAll('.t-big');
    Array.prototype.forEach.call(bigs, function (b) { b.style.fontSize = ''; });
    var base = parseFloat(getComputedStyle(bigs[0]).fontSize), k = 1;
    while (row.scrollWidth > row.clientWidth + 1 && k > 0.85) {
      k -= 0.025;
      Array.prototype.forEach.call(bigs, function (b) { b.style.fontSize = (base * k).toFixed(2) + 'px'; });
    }
    if (k < 1) fitReport.push('slide ' + s.data.id + ': números de fechamento a ' + Math.round(k * 100) + '%' + (row.scrollWidth > row.clientWidth + 1 ? ' (ainda excede)' : ''));
  }

  function scaleSheet(s) {
    var wrap = s.el.querySelector('.mock-wrap'), sheet = wrap && wrap.querySelector('.sheet');
    if (!sheet) return;
    var k = Math.min(1, wrap.clientHeight / sheet.offsetHeight);
    sheet.style.transform = 'scale(' + k.toFixed(4) + ')';
  }

  function layoutAll() {
    fitReport.length = 0;
    slides.forEach(function (s) {
      var wasActive = s.el.classList.contains('is-active');
      s.el.style.visibility = 'visible';
      Array.prototype.forEach.call(s.el.querySelectorAll('[data-lines]'), function (el) {
        if (el.classList.contains('t-title')) fitTitle(el, s.data.id); else splitLines(el);
      });
      distribute(s);
      fitWidthRow(s);
      scaleSheet(s);
      s.el.style.visibility = '';
      if (wasActive) settle(s);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Estados: preparar (inicial), assentar (final)                       */
  /* ------------------------------------------------------------------ */

  var ANIM_SEL = '.blk, .tl-in, .fade, .pop, .grow-x, .grow-y, .draw, .pct, .callout, .val-cur, .val-pro, .delta, .seg, .pt-label, .note, .cn-label, .statements > p, .kv-label, .kv-value, .c-label, .c-current, .c-proposal, .list-num, .list-text, .fact-fig, .fact-text, .rule, .stat';

  /* Tudo que entra e sai carrega .reveal. A saida seleciona por ela, de modo
   * que painel de vidro, nota e SVG saiam junto com os blocos de texto. */
  var REVEAL_SEL = '.reveal';

  /* Molduras estruturais: saem com o slide, mas a entrada nunca as apaga.
   * Nenhuma CHOREO as anima (elas emolduram o que e animado), entao zera-las
   * em prep() as deixaria apagadas para sempre. O .veil do 17 e a excecao
   * declarada: a propria coreografia o levanta de 0 a 0,45.
   *
   * O painel de vidro NAO entra nesta lista. Ele pinta uma superficie visivel
   * (fundo, borda e halo), e o conteudo dele so e revelado em REVEAL_START da
   * duracao do video: mante-lo opaco desde o corte punha um retangulo vazio na
   * tela por segundos, dessincronizado do texto. Quem o levanta e glassIn(),
   * chamado por buildEnter() logo antes da coreografia do slide. As outras tres
   * molduras nao pintam nada por conta propria, entao a isencao delas nao
   * aparece em tela. */
  var MOLDURA_SEL = '.map-wrap, .closing-numbers, .two-blocks';

  function clearAnim(el) {
    if (G) G.set(el, { clearProps: 'transform,opacity,strokeDashoffset,strokeDasharray' });
    else { el.style.transform = ''; el.style.opacity = ''; el.style.strokeDashoffset = ''; el.style.strokeDasharray = ''; }
  }

  function svgLen(el) {
    try { return el.getTotalLength(); } catch (e) { return 1000; }
  }

  function prep(s) {
    var sec = s.el;
    if (G) { G.killTweensOf(sec); G.killTweensOf(Array.prototype.slice.call(sec.querySelectorAll(REVEAL_SEL))); }
    Array.prototype.forEach.call(sec.querySelectorAll(ANIM_SEL), clearAnim);
    Array.prototype.forEach.call(sec.querySelectorAll(REVEAL_SEL), clearAnim);
    Array.prototype.forEach.call(sec.querySelectorAll('.blk, .tl-in, .fade, .pop, .pct, .callout, .val-cur, .val-pro, .delta, .seg, .pt-label, .note, .reveal'), function (el) {
      /* A moldura volta a opaca: quem anima e o conteudo dentro dela. */
      el.style.opacity = el.matches(MOLDURA_SEL) ? '' : '0';
    });
    Array.prototype.forEach.call(sec.querySelectorAll('.grow-x'), function (el) { rememberAttr(el, 'width'); el.setAttribute('width', 0); });
    Array.prototype.forEach.call(sec.querySelectorAll('.grow-y'), function (el) { rememberAttr(el, 'height'); rememberAttr(el, 'y'); el.setAttribute('y', parseFloat(el.getAttribute('data-y')) + parseFloat(el.getAttribute('data-height'))); el.setAttribute('height', 0); });
    Array.prototype.forEach.call(sec.querySelectorAll('.pop'), function (el) { if (el.tagName.toLowerCase() === 'circle') { rememberAttr(el, 'r'); el.setAttribute('r', 0); } });
    Array.prototype.forEach.call(sec.querySelectorAll('.draw'), function (el) {
      var L = svgLen(el); el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
      if (el.classList.contains('state')) el.style.fillOpacity = '0';
    });
    Array.prototype.forEach.call(sec.querySelectorAll('.rule.draw-x'), function (el) { el.style.transform = 'scaleX(0)'; });
    Array.prototype.forEach.call(sec.querySelectorAll('[data-count]'), function (el) { setCount(el, parseFloat(el.getAttribute('data-from')) || 0); });
    Array.prototype.forEach.call(sec.querySelectorAll('.alert-word'), function (el) { el.classList.remove('is-on'); });
  }

  function rememberAttr(el, name) {
    if (!el.hasAttribute('data-' + name)) el.setAttribute('data-' + name, el.getAttribute(name));
  }
  function restoreAttr(el, name) {
    if (el.hasAttribute('data-' + name)) el.setAttribute(name, el.getAttribute('data-' + name));
  }

  /* Estado final do conteudo, sem marcar o slide como pronto: os loops
   * ambientes (.slide-ready) so podem partir quando a revelacao terminar. */
  function finalState(s) {
    var sec = s.el;
    Array.prototype.forEach.call(sec.querySelectorAll('.grow-x'), function (el) { restoreAttr(el, 'width'); });
    Array.prototype.forEach.call(sec.querySelectorAll('.grow-y'), function (el) { restoreAttr(el, 'height'); restoreAttr(el, 'y'); });
    Array.prototype.forEach.call(sec.querySelectorAll('.pop'), function (el) { restoreAttr(el, 'r'); });
    Array.prototype.forEach.call(sec.querySelectorAll(ANIM_SEL + ', ' + REVEAL_SEL), function (el) {
      clearAnim(el); el.style.opacity = ''; el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
      /* O mock do slide 14 tem escala propria, calculada em scaleSheet():
       * limpar o transform dele aqui devolveria a folha ao tamanho cheio. */
      if (!el.classList.contains('mock-wrap')) el.style.transform = '';
    });
    scaleSheet(s);
    Array.prototype.forEach.call(sec.querySelectorAll('.note'), function (el) { el.style.opacity = '1'; });
    Array.prototype.forEach.call(sec.querySelectorAll('.draw.state'), function (el) { el.style.fillOpacity = ''; });
    Array.prototype.forEach.call(sec.querySelectorAll('[data-count]'), function (el) { setCount(el, parseFloat(el.getAttribute('data-count'))); });
    Array.prototype.forEach.call(sec.querySelectorAll('.alert-word'), function (el) { el.classList.add('is-on'); });
  }

  function settle(s) {
    /* A timeline viva sobrescreveria os contadores no proximo tique. */
    if (enterTL && current >= 0 && slides[current] === s) { enterTL.kill(); enterTL = null; }
    finalState(s);
    markReady(s);
  }

  /* ------------------------------------------------------------------ */
  /* Coreografia (GSAP)                                                  */
  /* ------------------------------------------------------------------ */

  function toArr(els) {
    if (!els) return [];
    if (els instanceof NodeList || els instanceof HTMLCollection) return Array.prototype.slice.call(els);
    return [].concat(els);
  }

  function helpers(tl, sec) {
    var px = S();
    var h = {
      q: function (sel) { return Array.prototype.slice.call(sec.querySelectorAll(sel)); },
      one: function (sel) { return sec.querySelector(sel); },
      /* Bloco: opacidade 0 -> 1 e 18 px -> 0. */
      block: function (els, at, opts) {
        opts = opts || {};
        els = toArr(els).filter(Boolean); if (!els.length) return at;
        var dur = opts.dur || 0.7, st = opts.stagger || 0;
        els.forEach(function (el, i) {
          var t = at + i * st;
          if (RM) { tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, t); return; }
          if (el.classList && el.classList.contains('list-item')) {
            var num = el.querySelector('.list-num'), txt = el.querySelector('.list-text');
            tl.set(el, { opacity: 1 }, t);
            if (num) tl.fromTo(num, { opacity: 0, y: 18 * px }, { opacity: 1, y: 0, duration: dur, ease: EASE_OUT }, t);
            tl.fromTo(txt, { opacity: 0, y: 18 * px }, { opacity: 1, y: 0, duration: dur, ease: EASE_OUT }, t + 0.06);
          } else {
            tl.fromTo(el, { opacity: 0, y: (opts.y !== undefined ? opts.y : 18) * px }, { opacity: 1, y: 0, duration: dur, ease: EASE_OUT }, t);
          }
        });
        return at + (els.length - 1) * st + dur;
      },
      /* Linhas mascaradas do título. */
      lines: function (h1, at, opts) {
        opts = opts || {};
        var wrap = h1.closest('.blk') || h1;
        tl.set(wrap, { opacity: 1 }, at);
        var lines = Array.prototype.slice.call(h1.querySelectorAll('.tl-in')), t = at, dur = opts.dur || 0.9;
        lines.forEach(function (ln, i) {
          if (i > 0) t += (opts.stagger !== undefined ? opts.stagger : 0.09) + (ln.classList.contains('accent') ? 0.12 : 0);
          if (RM) tl.fromTo(ln, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, t);
          else tl.fromTo(ln, { yPercent: 100, opacity: 1 }, { yPercent: 0, duration: dur, ease: EASE_OUT }, t);
        });
        return t + dur;
      },
      fade: function (els, at, opts) {
        opts = opts || {};
        els = toArr(els).filter(Boolean); if (!els.length) return at;
        var st = opts.stagger || 0, dur = RM ? 0.3 : (opts.dur || 0.5);
        els.forEach(function (el, i) { tl.to(el, { opacity: opts.to !== undefined ? opts.to : 1, duration: dur, ease: 'power2.out' }, at + i * st); });
        return at + (els.length - 1) * st + dur;
      },
      /* Opacidade cheia: a nota ja e contida por cor e corpo. Rebaixa-la por
       * alfa sobre o video derrubava o contraste abaixo do minimo legivel. */
      note: function (at) {
        var n = sec.querySelector('.note');
        if (n) tl.to(n, { opacity: 1, duration: RM ? 0.3 : 0.6, ease: 'power2.out' }, at);
        return at + 0.6;
      },
      count: function (el, at, dur) {
        var target = parseFloat(el.getAttribute('data-count')), from = parseFloat(el.getAttribute('data-from')) || 0;
        if (RM) { tl.call(function () { setCount(el, target); }, null, at); return at; }
        var o = { v: from };
        tl.to(o, { v: target, duration: dur, ease: EASE_COUNT, onUpdate: function () { setCount(el, o.v); } }, at);
        return at + dur;
      },
      draw: function (el, at, dur, ease) {
        var L = svgLen(el);
        if (RM) { tl.set(el, { strokeDashoffset: 0 }, at); return at; }
        tl.fromTo(el, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: dur, ease: ease || 'power1.inOut' }, at);
        return at + dur;
      },
      pop: function (els, at, opts) {
        opts = opts || {};
        els = toArr(els).filter(Boolean); if (!els.length) return at;
        var st = opts.stagger || 0, dur = opts.dur || 0.26;
        els.forEach(function (el, i) {
          var r = parseFloat(el.getAttribute('data-r') || el.getAttribute('r'));
          tl.set(el, { opacity: 1 }, at + i * st);
          if (RM) tl.set(el, { attr: { r: r } }, at + i * st);
          else tl.fromTo(el, { attr: { r: 0 } }, { attr: { r: r }, duration: dur, ease: EASE_OUT }, at + i * st);
        });
        return at + (els.length - 1) * st + dur;
      },
      growX: function (el, at, dur) {
        var w = parseFloat(el.getAttribute('data-width') || el.getAttribute('width'));
        if (RM) { tl.set(el, { attr: { width: w } }, at); return at; }
        tl.fromTo(el, { attr: { width: 0 } }, { attr: { width: w }, duration: dur, ease: EASE_OUT }, at);
        return at + dur;
      },
      growY: function (el, at, dur) {
        var hh = parseFloat(el.getAttribute('data-height') || el.getAttribute('height'));
        var y0 = parseFloat(el.getAttribute('data-y') || el.getAttribute('y'));
        if (RM) { tl.set(el, { attr: { height: hh, y: y0 } }, at); return at; }
        tl.fromTo(el, { attr: { height: 0, y: y0 + hh } }, { attr: { height: hh, y: y0 }, duration: dur, ease: EASE_OUT }, at);
        return at + dur;
      },
      /* O filete pode ser ele proprio um `.reveal` (capa), e nesse caso prep()
       * zerou a opacidade dele: quem anima so o scaleX precisa devolve-la. */
      ruleX: function (el, at, dur) {
        if (RM) { tl.set(el, { scaleX: 1, opacity: 1 }, at); return at; }
        tl.set(el, { opacity: 1 }, at);
        tl.fromTo(el, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: dur || 0.6, ease: EASE_OUT }, at);
        return at + (dur || 0.6);
      }
    };
    return h;
  }

  /* Entrada genérica: título por linhas, blocos em cascata de 70 ms, nota por último. */
  function genericEnter(h, tl, sec, opts) {
    opts = opts || {};
    var t = 0, title = sec.querySelector('.t-title');
    if (title) t = h.lines(title, 0, { dur: opts.titleDur }) - 0.5;
    var blocks = h.q('.blk').filter(function (b) { return !b.hasAttribute('data-custom'); });
    var end = h.block(blocks, Math.max(t, 0.4), { stagger: opts.stagger || 0.07 });
    h.note(end - 0.2);
    return end;
  }

  var CHOREO = {};

  CHOREO[1] = function (h, tl, sec) {
    /* Os logos sao persistentes no chrome: a coreografia nao os toca.
     * O veu entra antes de tudo, para a manchete ja nascer sobre base pronta. */
    var wash = h.one('.cover-wash');
    if (wash) {
      if (RM) tl.fromTo(wash, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0);
      else tl.fromTo(wash, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 0);
    }
    var t = h.lines(h.one('.t-title'), 0.45, { stagger: 0.12 });
    h.ruleX(h.one('.cover-rule'), t - 0.3, 0.7);
    h.block(h.one('.t-support'), t - 0.15);
    h.block(h.one('.presenter'), t + 0.05);
  };

  CHOREO[2] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    h.block(h.one('.t-support'), t);
    /* Ordem de leitura: as quatro linhas, o divisor que desce, e por fim a
     * soma contando enquanto a regua desenha segmento a segmento. */
    var rows = h.q('.kv'), r0 = t + 0.3;
    rows.forEach(function (row, i) {
      var at = r0 + i * 0.14;
      tl.set(row, { opacity: 1 }, at);
      h.ruleX(row.querySelector('.rule'), at, 0.6);
      h.block([row.querySelector('.kv-label'), row.querySelector('.kv-value')], at + 0.1, { y: 12 });
    });
    var div = h.one('.kv-divider'), td = r0 + 0.25;
    if (div) {
      if (RM) tl.fromTo(div, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, td);
      else tl.fromTo(div, { opacity: 1, scaleY: 0, transformOrigin: 'center top' }, { scaleY: 1, duration: 0.9, ease: EASE_OUT }, td);
    }
    var sum = h.one('.kv-sum'); if (!sum) return;
    var ts = r0 + rows.length * 0.14 + 0.05;
    tl.set(sum, { opacity: 1 }, ts);
    h.block(sum.querySelector('.kv-sum-value'), ts, { y: 18, dur: 0.8 });
    var num = sum.querySelector('[data-count]'), segs = h.q('.kv-seg'), ticks = h.q('.kv-tick');
    var total = parseFloat(sum.querySelector('.kv-ruler').getAttribute('data-total')) || 1;
    var t0 = ts + 0.1, dur = 1.1;
    if (num) {
      var target = parseFloat(num.getAttribute('data-count')), from = parseFloat(num.getAttribute('data-from')) || 0;
      if (RM) {
        tl.call(function () { setCount(num, target); }, null, t0);
        tl.set(segs, { scaleX: 1 }, t0);
      } else {
        /* Um unico tween dirige o contador e os segmentos, para nunca
         * divergirem: cada segmento cresce enquanto a contagem atravessa a
         * parte dele no total. */
        var o = { v: from };
        segs.forEach(function (seg) { tl.set(seg, { transformOrigin: 'left center' }, t0); });
        tl.to(o, { v: target, duration: dur, ease: EASE_COUNT, onUpdate: function () {
          setCount(num, o.v);
          var v = o.v / target * total;
          segs.forEach(function (seg) {
            var ini = parseFloat(seg.getAttribute('data-ini')), fim = parseFloat(seg.getAttribute('data-fim'));
            var k = fim > ini ? (v - ini) / (fim - ini) : 1;
            seg.style.transform = 'scaleX(' + Math.max(0, Math.min(1, k)).toFixed(4) + ')';
          });
        } }, t0);
      }
    }
    /* Os ticks acendem quando a contagem passa por cada fronteira: para
     * power3.out, a fracao f do valor e atingida em p = 1 - (1 - f)^(1/3). */
    ticks.forEach(function (tk) {
      var atV = parseFloat(tk.getAttribute('data-at') || '0'), f = atV / total;
      var p = RM ? 0 : 1 - Math.pow(Math.max(0, 1 - f), 1 / 3);
      tl.to(tk, { opacity: 1, duration: RM ? 0.3 : 0.35, ease: 'power2.out' }, t0 + p * dur);
    });
    h.fade(sum.querySelector('.kv-sum-label'), t0 + dur * 0.55, { dur: 0.6 });
  };

  CHOREO[3] = function (h, tl, sec) {
    var start = 0.68; /* t = 1.200 ms após a tecla */
    var lines = [h.one('.anchor-line-1'), h.one('.anchor-line-2')];
    h.block(h.one('.anchor-zone'), start, { y: 0, dur: 0.4 });
    var end = h.count(h.one('.t-anchor'), start, 1.4);
    h.block(lines[0], start + 0.2);
    /* A regua entra na ordem de leitura, logo abaixo da primeira linha: a
     * trilha inteira desenha primeiro, os ticks acendem em cascata, e o
     * preenchimento cresce na mesma duracao e na mesma curva da contagem,
     * de modo que numero e barra chegam a 17 no mesmo instante. O rotulo do
     * total ja esta la enquanto a barra corre; o do usado so aparece quando
     * ela para, com o hairline que a fecha. */
    var ruler = h.one('.ocup-ruler');
    if (ruler) {
      var fill = ruler.querySelector('.ocup-fill'), r0 = start + 0.3, dFill = end - r0;
      tl.set(ruler, { opacity: 1 }, r0);
      h.ruleX(ruler.querySelector('.ocup-track'), r0, 0.7);
      h.fade(h.q('.ocup-tick'), r0 + 0.1, { stagger: 0.035, dur: 0.3 });
      h.fade(ruler.querySelector('.ocup-lbl-total'), r0 + 0.3, { dur: 0.4 });
      if (RM) tl.set(fill, { scaleX: 1 }, r0);
      else tl.fromTo(fill, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: dFill, ease: EASE_COUNT }, r0);
      h.fade([ruler.querySelector('.ocup-end'), ruler.querySelector('.ocup-lbl-used')], end - 0.15, { dur: 0.3 });
    }
    h.block(lines[1], end + 0.3);
    h.note(end + 0.6);
  };

  /* Slide 4: primeiro as reguas vazias e os rotulos; depois, linha a linha na
   * ordem de leitura, o percentual conta enquanto a barra cresce e a hairline
   * de terminacao acompanha a ponta. A chamada da mamografia fecha. */
  CHOREO[4] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var svg = h.one('.chart');
    tl.set(svg, { opacity: 1 }, t);
    h.fade(h.q('.chart .cap-track, .chart .cap-tick'), t, { dur: 0.5 });
    h.fade(h.q('.chart .cap-lbl'), t + 0.1, { dur: 0.5, stagger: 0.08 });
    var rows = h.q('.chart .cap-row'), b0 = t + 0.4, calloutAt = b0;
    rows.forEach(function (g, i) {
      var at = b0 + i * 0.16, pct = g.querySelector('.cap-pct'), end = g.querySelector('.cap-end');
      h.fade(pct, at, { dur: 0.4 });
      h.count(pct, at, 1.1);
      h.growX(g.querySelector('.grow-x'), at, 1.1);
      h.fade(end, at, { dur: 0.4 });
      if (!RM) tl.fromTo(end, { x: -parseFloat(end.getAttribute('data-dx')) }, { x: 0, duration: 1.1, ease: EASE_OUT }, at);
      h.count(g.querySelector('.cap-frac [data-count]'), at, 1.1);
      h.fade(g.querySelector('.cap-frac'), at + 0.2, { dur: 0.4 });
      if (g.classList.contains('is-accent')) calloutAt = at + 1.2;
    });
    h.fade(h.one('.callout'), calloutAt, { dur: 0.5 });
    h.note(b0 + rows.length * 0.16 + 1.1);
  };

  CHOREO[5] = function (h, tl, sec) {
    /* Slide de risco: peso por isolamento, como no 7. O titulo entra mais
     * devagar; cada achado sobe sozinho e o filete que o fecha desenha da
     * esquerda depois que a linha assentou. A consequencia so aparece quando
     * o terceiro filete termina, e a nota fecha. Se o orcamento do video for
     * menor, startEnter() comprime a timeline por timeScale. */
    var t = h.lines(h.one('.t-title'), 0, { dur: 1.2 }) - 0.6;
    var wrap = h.one('.statements');
    tl.set(wrap, { opacity: 1 }, t);
    var ps = h.q('.statements > p'), rules = h.q('.statements > .rule');
    var at = t, ultimo = t;
    ps.forEach(function (p, i) {
      tl.set(p, { opacity: 1 }, at);
      var fim = h.lines(p, at, { dur: 0.9 });
      if (rules[i]) fim = Math.max(fim, h.ruleX(rules[i], at + 0.35, 0.9));
      ultimo = fim;
      at += 0.55;
    });
    var t2 = ultimo + 0.15;
    h.block(h.one('.band .t-body'), t2, { dur: 0.9 });
    h.note(t2 + 0.6);
  };

  /* Slide 6: a espera conta. O numero de dias sobe enquanto a regua desenha e
   * os ticks acendem em cadencia — numero e linha sao o mesmo dado, como no
   * slide 2. As pontas do percurso entram, a linha-guia desce ate o laudo, e
   * so depois entra a parcela no prazo: o numero conta e a barra curta cresce
   * na mesma curva, contra a trilha inteira. */
  CHOREO[6] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var ruler = h.one('.pz-ruler'), head = h.one('.pz-head');
    var num = head.querySelector('[data-count]');
    var fill = ruler.querySelector('.pz-fill');
    var ticks = h.q('.pz-tick');
    var D = 1.5, r0 = t + 0.15;

    tl.set(head, { opacity: 1 }, t);
    h.block(num, t, { y: 14, dur: 0.6 });
    h.fade([head.querySelector('.pz-unit'), head.querySelector('.pz-ate')], t + 0.25, { dur: 0.5, stagger: 0.06 });

    tl.set(ruler, { opacity: 1 }, r0);
    h.ruleX(ruler.querySelector('.pz-track'), r0, 0.7);

    /* A contagem dos dias e o preenchimento correm juntos, na mesma curva. */
    if (num) h.count(num, r0, D);
    if (RM) tl.set(fill, { scaleX: 1 }, r0);
    else tl.fromTo(fill, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: D, ease: EASE_COUNT }, r0);

    /* Cada tick acende quando a contagem passa por ele. Para power3.out,
     * a fracao f e atingida em p = 1 - (1 - f)^(1/3). */
    var nTicks = ticks.length - 1;
    ticks.forEach(function (tk, i) {
      var f = nTicks > 0 ? i / nTicks : 1;
      var p = RM ? 0 : 1 - Math.pow(Math.max(0, 1 - f), 1 / 3);
      tl.to(tk, { opacity: 1, duration: 0.3, ease: 'power2.out' }, r0 + p * D);
    });

    var fim = r0 + D;
    h.fade(ruler.querySelector('.pz-end'), fim - 0.15, { dur: 0.3 });
    h.fade(h.q('.pz-m-start, .pz-m-end'), fim - 0.1, { stagger: 0.08, dur: 0.4 });

    /* A linha-guia desce do tick do laudo ate o marco, que entra em seguida. */
    var lead = ruler.querySelector('.pz-lead');
    if (lead) {
      tl.set(lead, { opacity: 1 }, fim);
      if (!RM) tl.fromTo(lead, { scaleY: 0, transformOrigin: 'top center' }, { scaleY: 1, duration: 0.5, ease: EASE_OUT }, fim);
    }
    h.fade(h.one('.pz-m-mid'), fim + 0.25, { dur: 0.4 });

    var stat = h.one('.pz-stat'), s0 = fim + 0.5;
    h.block(stat, s0, { y: 12 });
    h.ruleX(stat.querySelector('.pz-share-track'), s0 + 0.1, 0.6);
    var share = stat.querySelector('.pz-share-fill'), pct = stat.querySelector('[data-count]');
    if (pct) h.count(pct, s0 + 0.15, 0.9);
    if (RM) tl.set(share, { scaleX: 1 }, s0 + 0.15);
    else tl.fromTo(share, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.9, ease: EASE_COUNT }, s0 + 0.15);
    h.fade(stat.querySelector('.pz-share-end'), s0 + 0.9, { dur: 0.3 });

    h.block(h.one('.band > .t-body'), s0 + 0.55);
    h.block(h.one('.closing'), s0 + 0.95);
    h.note(s0 + 1.25);
  };

  CHOREO[7] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0, { dur: 1.2 }) - 0.6;
    /* As exposicoes sao `data-custom`: entram aqui, uma a uma dentro do vidro,
     * como as linhas do slide 2 — numero e texto sobem juntos e o hairline
     * fecha a linha. Sem esta passagem elas ficam no opacity 0 de prep(). */
    var expos = h.q('.expo'), e0 = t + 0.2, fimExpo = e0;
    expos.forEach(function (row, i) {
      var at = e0 + i * 0.22;
      tl.set(row, { opacity: 1 }, at);
      h.block([row.querySelector('.expo-num'), row.querySelector('.expo-text')], at, { y: 14, stagger: 0.06 });
      h.ruleX(row.querySelector('.expo-rule'), at + 0.2, 0.6);
      fimExpo = at + 0.7;
    });
    /* Os demais blocos (titulo ja contado, consequencia) seguem a cascata. */
    var blocks = h.q('.blk').filter(function (b) { return !b.hasAttribute('data-custom'); });
    var end = h.block(blocks, t, { stagger: 0.16 });
    var body = h.one('.expo-conseq') || h.one('.t-body');
    /* A consequencia so entra depois do vidro fechar: ela e a leitura do que
     * esta no painel, nao mais um item dele. */
    if (body) { tl.killTweensOf(body); end = h.block(body, Math.max(fimExpo, end - 0.2), { y: 18 }); }
    tl.call(function () { var w = sec.querySelector('.alert-word'); if (w) w.classList.add('is-on'); }, null, end + 0.1);
    return end;
  };

  CHOREO[8] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    t = h.block(h.one('.t-support'), t) - 0.5;
    h.block(h.one('.band > .rule'), t);
    h.block(h.q('.list-item'), t + 0.1, { stagger: 0.11 });
  };

  CHOREO[9] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var wrap = h.one('.map-wrap'), state = wrap.querySelector('.state');
    tl.set(wrap, { opacity: 1 }, t);
    var dEnd = h.draw(state, t, 1.4, 'power1.inOut');
    tl.to(state, { fillOpacity: 0.06, duration: RM ? 0.3 : 0.5, ease: 'power2.out' }, dEnd);
    var pins = h.q('.pin-group[data-kind="active"]'), p0 = dEnd - 0.2;
    pins.forEach(function (g, i) {
      var at = p0 + i * 0.14;
      h.pop(g.querySelector('.pop'), at, { dur: 0.26 });
      h.fade(g.querySelectorAll('.fade'), at + 0.08, { dur: 0.4 });
    });
    var next = h.one('.pin-group[data-kind="next"]'), nAt = p0 + pins.length * 0.14 + 0.5;
    var pin = next.querySelector('.pop');
    h.pop(pin, nAt, { dur: 0.26 });
    if (!RM) tl.fromTo(pin, { strokeDashoffset: 0 }, { strokeDashoffset: -30, duration: 2.0, ease: 'power1.inOut' }, nAt + 0.2);
    h.fade(next.querySelectorAll('.fade'), nAt + 0.08, { dur: 0.4 });
    /* Ordem de leitura: o filete abre o bloco, a figura conta, a legenda
     * assenta em seguida. Contar e mais lento que aparecer, entao a legenda
     * entra junto com o fim da contagem, nao depois dela. */
    var facts = h.q('.fact');
    facts.forEach(function (f, i) {
      var at = p0 + i * 0.16;
      tl.set(f, { opacity: 1 }, at);
      h.ruleX(f.querySelector('.rule'), at, 0.6);
      var fig = f.querySelector('.fact-fig');
      if (fig && fig.hasAttribute('data-count')) {
        tl.set(fig, { opacity: 1 }, at + 0.05);
        h.count(fig, at + 0.05, RM ? 0 : 0.9);
      } else {
        h.block(fig, at + 0.05, { y: 12 });
      }
      h.block(f.querySelector('.fact-text'), at + 0.18, { y: 12 });
    });
    h.note(nAt + 0.6);
  };

  CHOREO[10] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var items = h.q('.list-item');
    h.block(items, t, { stagger: 0.09 });
    var last = t + (items.length - 1) * 0.09;
    h.block(h.one('.closing-rule'), last + 0.3);
    h.block(h.one('.closing'), last + 0.3);
  };

  CHOREO[11] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var head = h.one('.cmp-head');
    tl.set(head, { opacity: 1 }, t);
    h.ruleX(head.querySelector('.rule'), t, 0.6);
    h.block(head.querySelectorAll('span'), t, { y: 10 });
    var rows = h.q('.cmp-row:not(.cmp-head)'), r0 = t + 0.2;
    rows.forEach(function (row, i) {
      var at = r0 + i * 0.07;
      tl.set(row, { opacity: 1 }, at);
      h.block([row.querySelector('.c-label'), row.querySelector('.c-current')], at, { y: 10 });
      h.block(row.querySelector('.c-proposal'), at + 0.12, { y: 10 });
      h.ruleX(row.querySelector('.rule'), at, 0.6);
    });
    h.note(r0 + rows.length * 0.07 + 0.5);
  };

  CHOREO[12] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var row = h.one('.glass .chart');
    tl.set(row, { opacity: 1 }, t);
    h.fade(h.q('.chart .fade'), t, { dur: 0.5 });
    var cur = h.q('.chart .bar-cur'), pro = h.q('.chart .bar-pro'), c0 = t + 0.2, p0 = c0 + 0.4;
    cur.forEach(function (b, i) { var at = c0 + i * 0.1; h.growY(b, at, 0.8); h.fade(b.parentNode.querySelector('.val-cur'), at + 0.6, { dur: 0.3 }); });
    /* Densitometria não tem barra atual: o valor 0 aparece com a sequência. */
    h.q('.chart g').forEach(function (g, i) { if (!g.querySelector('.bar-cur')) h.fade(g.querySelector('.val-cur'), c0 + i * 0.1 + 0.6, { dur: 0.3 }); });
    var deltaEnd = p0;
    pro.forEach(function (b, i) {
      var at = p0 + i * 0.1;
      h.growY(b, at, 1.0);
      h.fade(b.parentNode.querySelector('.val-pro'), at + 0.8, { dur: 0.3 });
      h.fade(b.parentNode.querySelector('.delta'), at + 1.0, { dur: 0.4 });
      deltaEnd = at + 1.0;
    });
    var stat = h.one('.stat-aside');
    h.block(stat, p0, { y: 0 });
    h.count(stat.querySelector('[data-count]'), p0, 1.2);
    h.block(h.one('.closing'), deltaEnd + 0.2);
  };

  CHOREO[13] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var blocks = h.q('.two-blocks .block');
    h.block(blocks, t, { stagger: 0.35 });
    var t2 = t + 0.35 * (blocks.length - 1) + 0.5;
    h.block(h.one('.closing-rule'), t2);
    h.block(h.one('.closing'), t2 + 0.1);
    h.note(t2 + 0.5);
  };

  CHOREO[14] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var items = h.q('.list-item');
    var end = h.block(items, t, { stagger: 0.09 });
    h.block(h.one('.closing-rule'), end - 0.3);
    h.block(h.one('.closing'), end - 0.2);
    var mock = h.one('.mock-wrap'), mAt = t + 0.2;
    if (RM) tl.fromTo(mock, { opacity: 0 }, { opacity: 1, duration: 0.3 }, mAt);
    else tl.fromTo(mock, { opacity: 0, y: 24 * S() }, { opacity: 1, y: 0, duration: 0.9, ease: EASE_OUT }, mAt);
    var lineEnd = h.draw(mock.querySelector('.draw'), mAt + 0.9, 1.0, 'power1.inOut');
    h.pop(mock.querySelectorAll('.pop'), mAt + 0.9, { stagger: 0.17, dur: 0.2 });
    return lineEnd;
  };

  CHOREO[15] = function (h, tl, sec) {
    var t = h.lines(h.one('.t-title'), 0) - 0.5;
    var end = h.block(h.q('.list-item'), t, { stagger: 0.09 });
    h.block(h.one('.closing-rule'), end - 0.3);
    h.block(h.one('.closing'), end - 0.2);
  };

  CHOREO[16] = function (h, tl, sec) {
    var nums = h.q('.closing-number');
    nums.forEach(function (n) { tl.set(n, { opacity: 1 }, 0); h.block(n.querySelector('.t-big'), 0, { y: 0, dur: 0.4 }); });
    var counts = h.q('.closing-number [data-count]');
    counts.forEach(function (c) { h.count(c, 0.2, 1.4); });
    h.block(h.q('.cn-label'), 1.6, { stagger: 0.05 });
    h.block(h.one('.band > .rule'), 1.7);
    h.block(h.one('.band > .t-statement'), 1.8);
    h.block(h.q('.list-item'), 2.0, { stagger: 0.09 });
    h.block(h.one('.footer-line'), 2.4, { y: 10 });
  };

  CHOREO[17] = function (h, tl, sec) {
    var veil = sec.querySelector('.veil');
    var mark = sec.querySelector('.logo-end-wrap');
    var cities = sec.querySelector('.logo-end-cities');
    /* O veu sobe primeiro, de 0 a 0,45 em 1,2 s. */
    if (RM) tl.set(veil, { opacity: 0.45 }, 0);
    else tl.fromTo(veil, { opacity: 0 }, { opacity: 0.45, duration: 1.2, ease: 'power2.out' }, 0);
    /* O logo entra a partir de 0,6 s, em 1 s. */
    tl.set(mark, { opacity: 0 }, 0);
    if (RM) tl.to(mark, { opacity: 1, duration: 0.3 }, 0.6);
    else tl.fromTo(mark, { opacity: 0, scale: 0.96, transformOrigin: 'center center' }, { opacity: 1, scale: 1, duration: 1.0, ease: EASE_OUT }, 0.6);
    /* A linha de cidades entra 500 ms depois do logo, so por opacidade. */
    tl.set(cities, { opacity: 0 }, 0);
    tl.to(cities, { opacity: 1, duration: RM ? 0.3 : 0.6, ease: 'power2.out' }, 2.1);
  };

  /* immediate: volta ou video ja no fim. A coreografia da o lugar a uma
   * revelacao unica de 400 ms, com stagger de 30 ms, sem esperar nada. */
  function buildEnter(s, immediate) {
    var tl = G.timeline({ paused: true });
    if (immediate) {
      var alvos = Array.prototype.slice.call(s.el.querySelectorAll(REVEAL_SEL));
      /* Crava o estado final (contadores, barras, tracos) sem marcar pronto:
       * os loops so podem partir quando a revelacao terminar. */
      finalState(s);
      if (RM) tl.fromTo(alvos, { opacity: 0 }, { opacity: 1, duration: BACK_REVEAL_MS / 1000, ease: 'none', stagger: BACK_STAGGER }, 0);
      else tl.fromTo(alvos, { opacity: 0, y: 8 * S() }, { opacity: 1, y: 0, duration: BACK_REVEAL_MS / 1000, ease: 'power2.out', stagger: BACK_STAGGER }, 0);
      return tl;
    }
    var h = helpers(tl, s.el);
    glassIn(tl, s.el);
    var fn = CHOREO[s.data.id];
    if (fn) fn(h, tl, s.el); else genericEnter(h, tl, s.el);
    return tl;
  }

  /* O painel de vidro materializa antes do conteudo que carrega: prep() o
   * zerou, e aqui ele sobe no inicio da timeline, um pouco a frente do texto.
   * Sem esta subida o painel ficaria apagado para sempre, porque nenhuma
   * CHOREO o toca. A defasagem de 60 ms entre paineis do mesmo slide segue a
   * ordem do DOM, igual ao --orbit-delay do fio de luz.
   *
   * Cuidado ao mexer: paineis aninhados num bloco ja animado (o .stat do 6, a
   * .sheet do 14) sobem junto com o bloco pai; levanta-los aqui tambem so
   * antecipa a opacidade deles, nunca os anima duas vezes, porque este tween
   * termina antes de o pai comecar. */
  function glassIn(tl, sec) {
    var paineis = Array.prototype.slice.call(sec.querySelectorAll('.glass'));
    if (!paineis.length) return;
    paineis.forEach(function (g, k) {
      var at = k * 0.06;
      if (RM) { tl.to(g, { opacity: 1, duration: 0.3, ease: 'none' }, at); return; }
      tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power2.out' }, at);
    });
  }

  /* Esconde e zera o slide que sai. Chamada pelo onComplete da saida no caso
   * normal, e diretamente por goTo() quando a saida e morta antes de terminar.
   *
   * Tem de ser idempotente e independente da timeline: kill() do GSAP nao
   * dispara onComplete, entao deixar o desligamento so no callback significa
   * que qualquer navegacao chegando dentro dos EXIT_MS deixa o slide anterior
   * aceso para sempre, sobreposto ao novo. O hash escrito em goTo() dispara
   * hashchange, que re-entra com { force: true } e passa por cima do lock:
   * o caminho rapido existe de verdade. */
  function hideSlide(s) {
    if (!s) return;
    s.el.classList.remove('is-active');
    s.el.setAttribute('aria-hidden', 'true');
    prep(s);
  }

  /* Saida: anima TODO descendente marcado com .reveal (painel de vidro, nota
   * e SVG inclusive), nao so os blocos de texto. Antes de comecar, mata os
   * tweens e loops vivos do slide, senao um gradiente ou especular em curso
   * segura o elemento aceso dentro do slide seguinte. */
  function buildExit(s) {
    var tl = G.timeline({ paused: true });
    var px = S();
    var alvos = Array.prototype.slice.call(s.el.querySelectorAll(REVEAL_SEL));
    G.killTweensOf(s.el);
    G.killTweensOf(alvos);
    s.el.classList.remove('slide-ready');
    var saida = alvos.slice().reverse();
    if (RM) tl.to(saida, { opacity: 0, duration: 0.3, ease: 'none' }, 0);
    else tl.to(saida, { opacity: 0, y: -10 * px, duration: EXIT_MS / 1000, ease: EASE_IN, stagger: 0.03 }, 0);
    /* Esconder so quando a saida termina, nunca por tempo fixo; e zerar o
     * slide para que uma entrada futura nao encontre residuo. */
    tl.eventCallback('onComplete', function () { hideSlide(s); exitSlide = null; });
    return tl;
  }

  /* ------------------------------------------------------------------ */
  /* Vídeo: pool de dois elementos                                       */
  /* ------------------------------------------------------------------ */

  var vSrc = [-1, -1];   /* índice do slide carregado em cada elemento */
  var front = 0;

  vids.forEach(function (v, k) {
    v.loop = false;
    v.addEventListener('ended', function () {
      /* Congela no ponto de descanso do slide, que so e o ultimo frame quando
       * o assunto continua em quadro ate o fim. Nunca remove, esconde ou troca
       * o src do elemento que esta na frente.
       *
       * Quando o video termina inteiro, `ended` chega com o cursor ja no fim —
       * praticamente em cima do alvo. Pedir seek nesse instante custa caro: o
       * Chrome descarta o frame decodificado e remonta desde o keyframe
       * anterior (no 5.mp4 o ultimo e 4,0 s), e por ~0,5 s o elemento fica em
       * readyState 1, sem quadro nenhum — o vídeo "some" no final. Medido: com
       * o seek, 525 ms sem frame; sem ele, zero. Entao so busca o alvo quando
       * ele esta de fato atras, longe o bastante para mudar o que se ve. */
      var alvo = freezeTime(v, vSrc[k]);
      if (v.currentTime - alvo > EXCESSO_OK) {
        try { v.currentTime = alvo; } catch (e) { /* ignorado */ }
      }
      v.pause();
    });
    v.addEventListener('error', function () { if (k === front) media.classList.add('is-failed'); });
    v.addEventListener('playing', function () { if (k === front) media.classList.remove('is-failed'); });
  });

  function srcOf(i) { return DECK.slides[i].video; }

  function loadInto(k, i, opts) {
    var v = vids[k];
    if (!srcOf(i)) return;          /* slide sem video proprio */
    if (vSrc[k] === i) return;
    /* Trocar o src no meio de um download gera net::ERR_ABORTED. No
     * pre-carregamento (opcional), espera o atual ter dados antes de trocar. */
    if (opts && opts.gentle && v.getAttribute('src') && v.readyState < 3) return;
    vSrc[k] = i;
    v.src = srcOf(i);
    /* load() explicito so quando o video e necessario agora. No
     * pre-carregamento, preload="auto" busca sem requisicao a abortar. */
    if (!opts || !opts.gentle) v.load();
  }

  function whenReady(v, cb) {
    if (v.readyState >= 2) { cb(); return; }
    var done = false;
    var fin = function () { if (done) return; done = true; v.removeEventListener('loadeddata', fin); v.removeEventListener('error', fin); cb(); };
    v.addEventListener('loadeddata', fin);
    v.addEventListener('error', fin);
    setTimeout(fin, 2500);
  }

  function seekTo(v, t, cb) {
    var done = false;
    var fin = function () { if (done) return; done = true; v.removeEventListener('seeked', fin); cb(); };
    v.addEventListener('seeked', fin);
    try { v.currentTime = t; } catch (e) { fin(); }
    setTimeout(fin, 600);
  }

  /* Todo play() passa por aqui: a taxa some quando o src troca.
   *
   * Quando o slide declara `videoFreeze`, `ended` nunca chega — o vigia de
   * timeupdate para a reproducao no ponto. Ele se desliga sozinho ao parar,
   * ao trocar de src e ao pausar por outro motivo, para nao sobrar preso a um
   * elemento que ja mudou de papel no pool. */
  function playVideo(v) {
    if (!v) return;
    try { v.playbackRate = VIDEO_RATE; } catch (e) { /* ignorado */ }
    armarFreeze(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay bloqueado: fica no primeiro frame */ });
  }

  function armarFreeze(v) {
    if (v.__freezeWatch) { v.removeEventListener('timeupdate', v.__freezeWatch); v.__freezeWatch = null; }
    var i = slideOfVideo(v);
    var s = (i >= 0 && i < TOTAL) ? DECK.slides[i] : null;
    if (!s || typeof s.videoFreeze !== 'number') return;
    var watch = function () {
      if (vSrc[vids.indexOf(v)] !== i) { v.removeEventListener('timeupdate', watch); v.__freezeWatch = null; return; }
      var alvo = freezeTime(v, i);
      if (v.currentTime >= alvo) {
        v.removeEventListener('timeupdate', watch); v.__freezeWatch = null;
        /* Mesmo cuidado do handler de `ended`: o vigia so acorda depois de
         * passar do alvo, entao o seek e sempre para tras e custa a remontagem
         * do quadro a partir do keyframe anterior — meio segundo sem imagem. */
        if (v.currentTime - alvo > EXCESSO_OK) {
          try { v.currentTime = alvo; } catch (e) { /* ignorado */ }
        }
        v.pause();
      }
    };
    v.__freezeWatch = watch;
    v.addEventListener('timeupdate', watch);
  }

  /* Duracao efetiva: o que o espectador realmente espera, ja com a taxa.
   * Quando o video congela antes do fim, a espera acaba no congelamento — e
   * a ele que o texto tem de acompanhar, nao ao fim do arquivo. */
  function effectiveDuration(v, i) {
    var dur = (v && isFinite(v.duration) && v.duration > 1) ? v.duration : VIDEO_FALLBACK_S;
    var s = (i !== undefined && i >= 0 && i < TOTAL) ? DECK.slides[i] : null;
    if (s && typeof s.videoFreeze === 'number' && s.videoFreeze > 0) dur = Math.min(dur, s.videoFreeze);
    return dur / VIDEO_RATE;
  }

  /* Onde o video para quando termina, ou quando a volta o crava no fim.
   *
   * O padrao e o ultimo frame, mas varios videos tiram o assunto de quadro
   * antes de acabar e terminam numa parede clara: congelar ali deixava o
   * slide com cara de tela branca enquanto o apresentador falava. Esses
   * declaram `videoFreeze` em data.js, em segundos de tempo de arquivo.
   *
   * O recuo de 0,04 s do padrao nao chega a um frame a 24 fps (o ultimo e
   * apresentado em 7,958 s de 8), entao o navegador prende no ultimo frame
   * disponivel de qualquer forma; manter a margem so evita disparar `ended`
   * de novo ao cravar a posicao. */
  function freezeTime(v, i) {
    if (!v || !isFinite(v.duration) || v.duration <= 0) return 0;
    var fim = Math.max(0, v.duration - 0.04);
    var s = (i !== undefined && i >= 0 && i < TOTAL) ? DECK.slides[i] : null;
    var t = s && s.videoFreeze;
    if (typeof t !== 'number' || !isFinite(t) || t <= 0) return fim;
    return Math.min(t, fim);
  }

  /* Qual slide esta carregado em cada elemento do pool. */
  function slideOfVideo(v) {
    var k = vids.indexOf(v);
    return k < 0 ? -1 : vSrc[k];
  }

  /* O vídeo está parado no ponto de congelamento (volta, ou fim de reprodução). */
  function atLastFrame(v) {
    if (!v || !isFinite(v.duration) || v.duration <= 0) return false;
    return v.paused && v.currentTime >= freezeTime(v, slideOfVideo(v)) - 0.12;
  }

  function setFront(k) {
    front = k;
    vids.forEach(function (v, i) { v.classList.toggle('is-front', i === k); });
    media.classList.remove('is-failed');
  }

  /* Prepara o elemento de trás com o slide i, do início, pausado. */
  function preloadBack(i) {
    var back = 1 - front;
    if (i < 0 || i >= TOTAL) return;
    if (!srcOf(i)) return;       /* o slide final reaproveita o video anterior */
    if (back === front) return;  /* salvaguarda: nunca recarrega o da frente */
    var v = vids[back];
    var frente = vids[front];
    /* Espera o video da frente estar carregado para nao disputar banda nem
     * deixar um download pela metade, que o navegador cancelaria. */
    if (frente && frente.readyState < 4) {
      var esperar = function () {
        frente.removeEventListener('canplaythrough', esperar);
        if (current >= 0 && DECK.slides[current] && i === current + 1) preloadBack(i);
      };
      frente.addEventListener('canplaythrough', esperar);
      return;
    }
    loadInto(back, i, { gentle: true });
    whenReady(v, function () { if (vSrc[back] === i) { try { v.currentTime = 0; } catch (e) { /* */ } v.pause(); } });
  }

  /* Troca de vídeo ao navegar. dir: 1 avança, -1 volta, 0 salto. */
  function switchVideo(i, dir, cb) {
    /* Slide 17 nao tem video: mantem o do 16 na frente, congelado, com zoom. */
    if (!srcOf(i)) {
      /* O 17 reaproveita o video do 16, congelado no ponto de descanso dele. */
      var atual = vids[front];
      try { atual.currentTime = freezeTime(atual, vSrc[front]); } catch (e) { /* */ }
      atual.pause();
      media.classList.add('is-zoom');
      if (cb) cb();
      return;
    }
    media.classList.remove('is-zoom');
    var back = 1 - front, v = vids[back], old = vids[front];
    loadInto(back, i);
    if (dir === 1) {
      whenReady(v, function () {
        playVideo(v);
        setFront(back);
        old.pause();
        preloadBack(i + 1);
        if (cb) cb();
      });
      return;
    }
    if (dir === -1) {
      media.classList.remove('is-zoom');
      whenReady(v, function () {
        seekTo(v, freezeTime(v, i), function () {
          v.pause();
          setFront(back);
          /* O elemento que saiu guarda o slide i + 1 no primeiro frame, pronto para avançar. */
          old.pause();
          try { old.currentTime = 0; } catch (e) { /* */ }
          if (cb) cb();
        });
      });
      return;
    }
    whenReady(v, function () {
      seekTo(v, 0, function () {
        playVideo(v);
        setFront(back);
        old.pause();
        preloadBack(i + 1);
        if (cb) cb();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Navegação                                                           */
  /* ------------------------------------------------------------------ */

  var current = -1;
  var locked = false;
  var enterTL = null;
  var exitTL = null;
  /* Slide cuja saida esta em curso. Guardado a parte da timeline porque e
   * preciso desliga-lo mesmo quando a timeline morre sem completar. */
  var exitSlide = null;
  var pending = [];
  var revealPending = false;
  var startEnterNow = function () {};

  function later(fn, ms) { pending.push(setTimeout(fn, ms)); }
  function clearPending() { pending.forEach(clearTimeout); pending = []; }

  function moveRuler(index) {
    var pct = (index / (TOTAL - 1) * 100).toFixed(3) + '%';
    var label = pad2(index + 1) + ' / ' + pad2(TOTAL);
    if (G && !RM) {
      G.to([rulerActive, rulerIndex], { top: pct, duration: 0.5, ease: 'power3.inOut' });
      G.delayedCall(0.25, function () { rulerIndex.textContent = label; });
    } else {
      rulerActive.style.top = pct; rulerIndex.style.top = pct; rulerIndex.textContent = label;
    }
  }

  /* Os loops so comecam quando a revelacao termina. */
  function markReady(s) {
    slides.forEach(function (o) { o.el.classList.toggle('slide-ready', o === s); });
    stage.classList.add('slide-ready');
  }

  function clearReady() {
    slides.forEach(function (o) { o.el.classList.remove('slide-ready'); });
    stage.classList.remove('slide-ready');
  }

  /* Liga o slide novo sem desligar o anterior: quem o desliga e o onComplete
   * da saida. Desligar aqui cortaria a saida no primeiro frame. */
  function showSlide(s) {
    s.el.classList.add('is-active');
    s.el.setAttribute('aria-hidden', 'false');
    stage.setAttribute('data-slide', s.data.id);
  }

  function goTo(index, opts) {
    opts = opts || {};
    if (index < 0 || index >= TOTAL || index === current) return;
    if (locked && !opts.force) return;
    revealPending = false;
    clearPending();
    if (enterTL) { enterTL.kill(); enterTL = null; }
    /* Matar a saida pula o onComplete dela: desliga o slide na mao, senao ele
     * fica aceso por cima do proximo. */
    if (exitTL) { exitTL.kill(); exitTL = null; }
    if (exitSlide) { hideSlide(exitSlide); exitSlide = null; }

    var prev = current >= 0 ? slides[current] : null;
    var next = slides[index];
    var dir = prev ? (index === current + 1 ? 1 : (index === current - 1 ? -1 : 0)) : 0;
    current = index;
    locked = true;
    later(function () { locked = false; }, LOCK_MS);
    if (location.hash !== '#' + (index + 1)) history.replaceState(null, '', '#' + (index + 1));

    /* t = 0: vídeo do próximo entra; régua se move; texto atual sai. */
    clearReady();
    moveRuler(index);
    if (!opts.initial) switchVideo(index, dir);
    else {
      setFront(front);
      /* Abrir direto no slide final: congela o video anterior e liga o zoom. */
      if (!next.data.video) {
        var vf = vids[front];
        try { vf.currentTime = freezeTime(vf, vSrc[front]); } catch (e) { /* */ }
        vf.pause();
        media.classList.add('is-zoom');
      }
    }

    if (prev && G) {
      exitSlide = prev;
      exitTL = buildExit(prev);
      exitTL.play();
    } else if (prev) {
      hideSlide(prev);
    }

    /* O slide entra em estado preparado e ja visivel: o que espera a camera
     * e a revelacao do conteudo, nao a troca de slide. */
    prep(next);
    showSlide(next);

    var win = revealWindow(next, dir);

    /* O texto entra em REVEAL_START da duracao efetiva e termina antes de
     * REVEAL_END, para a camera assentar com o texto ja em repouso. Na volta,
     * entra de imediato. */
    var startEnter = function () {
      revealPending = false;
      if (current !== index) return;
      if (!G) { settle(next); return; }
      enterTL = buildEnter(next, win.immediate);
      enterTL.eventCallback('onComplete', function () { markReady(next); });
      if (enterTL.duration() * 1000 > win.budget && win.budget > 400) {
        enterTL.timeScale(enterTL.duration() * 1000 / win.budget);
      }
      enterTL.play();
    };
    startEnterNow = startEnter;

    if (prev && !win.immediate) {
      var espera = Math.max(ENTER_DELAY_MS, win.delay);
      revealPending = true;
      later(startEnter, espera);
    } else {
      startEnter();
    }
  }

  /* Janela de revelacao a partir da duracao efetiva do video do slide.
   * Voltar, ou encontrar o video ja no ultimo frame, dispensa a espera pela
   * camera: nao ha movimento a acompanhar, e a tela ficaria vazia. */
  function revealWindow(s, dir) {
    var v = vids[front];
    if (dir === -1 || !s.data.video || atLastFrame(v)) {
      return { delay: 0, budget: BACK_REVEAL_MS, immediate: true };
    }
    var dur = effectiveDuration(v, s.index);
    var startFrac = (s.data.id === 3) ? REVEAL_START_S3 : REVEAL_START;
    return { delay: dur * startFrac * 1000, budget: dur * (REVEAL_END - startFrac) * 1000 };
  }

  /* O apresentador pediu para adiantar: pula o video para o fim e completa
   * a revelacao em 300 ms. So a proxima tecla navega. */
  function completeReveal() {
    var s = slides[current];
    if (!s) return false;
    clearPending();
    var v = vids[front];
    if (v && isFinite(v.duration)) {
      try { v.currentTime = freezeTime(v, vSrc[front]); } catch (e) { /* ignorado */ }
      v.pause();
    }
    if (enterTL) {
      var restante = enterTL.duration() - enterTL.time();
      if (restante > SKIP_MS / 1000) {
        enterTL.timeScale(Math.max(1, restante / (SKIP_MS / 1000)));
        return true;
      }
    }
    if (revealPending) { revealPending = false; startEnterNow(); return true; }
    return false;
  }

  function step(d) {
    /* No slide final, avancar nao faz nada. */
    if (d > 0 && current === TOTAL - 1) return;
    /* Avancar durante a revelacao completa o slide antes de navegar. */
    if (d > 0 && isRevealing()) { completeReveal(); return; }
    goTo(Math.min(TOTAL - 1, Math.max(0, current + d)));
  }

  function isRevealing() {
    if (revealPending) return true;
    return !!(enterTL && enterTL.isActive() && enterTL.time() < enterTL.duration() - 0.05);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  /* Ao entrar ou sair de tela cheia, refaz o layout no mesmo frame para
   * a escala nao dar salto, e troca o glifo do botao. */
  document.addEventListener('fullscreenchange', function () {
    stage.classList.toggle('is-fullscreen', !!document.fullscreenElement);
    requestAnimationFrame(function () {
      layoutAll();
      if (current >= 0) { if (enterTL) { enterTL.kill(); enterTL = null; } settle(slides[current]); }
    });
  });

  if (fsBtn) fsBtn.addEventListener('click', function () { toggleFullscreen(); uiSeen(); });

  var digitBuffer = '', digitTimer = null;
  function pushDigit(d) {
    digitBuffer += d;
    if (digitTimer) clearTimeout(digitTimer);
    digitTimer = setTimeout(function () { digitBuffer = ''; }, DIGIT_BUFFER_MS);
  }
  function commitDigits() {
    if (!digitBuffer) return;
    var n = parseInt(digitBuffer, 10);
    digitBuffer = '';
    if (digitTimer) clearTimeout(digitTimer);
    if (n >= 1 && n <= TOTAL) goTo(n - 1);
  }

  var hintTimer = null;
  function showHint() {
    hintEl.classList.add('is-on');
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { hintEl.classList.remove('is-on'); }, HINT_MS);
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ':
        e.preventDefault(); step(1); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); step(-1); break;
      case 'Enter':
        e.preventDefault(); commitDigits(); break;
      case 'f': case 'F':
        e.preventDefault(); toggleFullscreen(); break;
      case 'h': case 'H':
        e.preventDefault(); showHint(); break;
      case 'Escape':
        if (document.fullscreenElement) document.exitFullscreen(); break;
      default:
        if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
    }
  });

  window.addEventListener('hashchange', function () {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    if (n >= 1 && n <= TOTAL && n - 1 !== current) goTo(n - 1, { force: true });
  });

  /* Cursor e botao de tela cheia surgem com o mouse e somem juntos. */
  var uiTimer = null;
  function uiSeen() {
    stage.classList.remove('no-cursor');
    stage.classList.add('show-ui');
    if (uiTimer) clearTimeout(uiTimer);
    uiTimer = setTimeout(function () {
      stage.classList.add('no-cursor');
      stage.classList.remove('show-ui');
    }, CURSOR_IDLE_MS);
  }
  document.addEventListener('mousemove', uiSeen);
  uiSeen();

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      layoutAll();
      if (current >= 0) { if (enterTL) { enterTL.kill(); enterTL = null; } settle(slides[current]); }
    }, 150);
  });

  /* ------------------------------------------------------------------ */
  /* Início: cortina até fontes prontas e vídeo 1 com readyState >= 3    */
  /* ------------------------------------------------------------------ */

  function boot() {
    var n = parseInt((location.hash || '').replace('#', ''), 10);
    var startIndex = (n >= 1 && n <= TOTAL) ? n - 1 : 0;

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var v = vids[0];
    var idxVideo = startIndex;
    while (idxVideo > 0 && !srcOf(idxVideo)) idxVideo--;
    loadInto(0, idxVideo);
    var videoReady = new Promise(function (resolve) {
      if (v.readyState >= 3) { resolve(); return; }
      var done = false;
      var fin = function () { if (done) return; done = true; resolve(); };
      v.addEventListener('canplay', fin);
      v.addEventListener('error', fin);
      setTimeout(fin, 4000);
    });

    Promise.all([fontsReady, videoReady]).then(function () {
      layoutAll();
      slides.forEach(prep);
      setFront(0);
      playVideo(v);
      preloadBack(startIndex + 1);
      curtain.classList.add('is-hidden');
      goTo(startIndex, { initial: true, force: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.__deck = {
    goTo: function (i) { goTo(i, { force: true }); },
    slides: slides, vids: vids,
    state: function () { return { current: current, front: front, vSrc: vSrc.slice(), locked: locked, entering: !!(enterTL && enterTL.isActive()) }; },
    layoutAll: layoutAll, settle: settle, prep: prep
  };
})();
