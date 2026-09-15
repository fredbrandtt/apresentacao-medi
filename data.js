/* data.js
 * Toda a copy, os números e os caminhos de mídia dos 16 slides.
 * Script clássico (não módulo ES) para funcionar com duplo clique em index.html
 * via file:// no Chrome. O objeto é exposto como window.DECK.
 *
 * Convenções:
 * - Números usados em gráficos ficam como Number; a formatação pt-BR
 *   (2.160, 55,6%) é feita em main.js. Porcentagens já fornecidas
 *   formatadas ficam como string, exatamente como no briefing.
 * - `title` pode ser string ou array de linhas. `titleAccent` é a linha
 *   que recebe --medi-teal (apenas na capa).
 * - `video`: caminho relativo ao index.html (stack estática, sem servidor).
 * - `videoFreeze`: segundo em que o vídeo congela ao terminar, em tempo de
 *   arquivo (antes da aceleração). Existe só nos vídeos cujo assunto sai de
 *   quadro antes do fim: sem ele o slide congelaria numa parede clara, que
 *   foi o defeito relatado. Os demais omitem o campo e param no último
 *   frame. Medido quadro a quadro, não estimado: ao trocar um vídeo, remedir.
 * - `credits: false` oculta a linha de créditos persistente (slides 1 e 16).
 */

window.DECK = {
  meta: {
    stage: { width: 1920, height: 1080 },
    credits: 'MEDI Medicina Diagnóstica  ·  Lago da Pedra, MA  ·  Setembro de 2026',
    shortcuts: 'Setas, espaço, Page Up e Page Down: navegar  ·  1 a 17 e Enter: ir ao slide  ·  F: tela cheia  ·  Esc: sair',
    logos: {
      medi: { src: 'assets/logos/medi.png', alt: 'MEDI Medicina Diagnóstica', height: 56 },
      prefeitura: { src: 'assets/logos/brasao-lago-da-pedra.png', alt: 'Prefeitura de Lago da Pedra', height: 44 }
    },
    videoBasePath: 'public/videos_1080p/'
  },

  slides: [
    /* 01 · Capa */
    {
      id: 1,
      layout: 'cover',
      /* O assunto do video 1 (o tomografo) entra pela direita e sua borda
       * esquerda fica por volta de 44% da largura. A capa agora tem manchete
       * grande, entao a zona segura para em 0,46: o titulo cresce sem nunca
       * encostar no equipamento. */
      safeRight: 0.46,
      video: 'public/videos_1080p/1.mp4',
      credits: false,
      content: {
        title: ['Da ociosidade', 'à resolutividade'],
        titleAccent: 2,
        support: 'Proposta de gestão médica para o serviço de radiologia e diagnóstico por imagem do município',
        /* Credencial do apresentador: discreta, abaixo do apoio. O nome entra
         * na hora da reuniao; o que sustenta a capa e o registro profissional. */
        presenter: [
          'CRM-MA [número]  ·  RQE [número]',
          'Coordenação médica, MEDI Medicina Diagnóstica'
        ],
        logos: true
      }
    },

    /* 02 · A infraestrutura existe */
    {
      id: 2,
      layout: 'text-list',
      safeRight: 0.56,
      video: 'public/videos_1080p/2.mp4',
      content: {
        title: 'A infraestrutura já existe.',
        support: 'O município já investiu. Quatro modalidades instaladas e em condição de operar.',
        items: [
          { label: 'Raios X', value: '2.160 exames/mês' },
          { label: 'Tomografia', value: '720 exames/mês' },
          { label: 'Mamografia', value: '554 exames/mês' },
          { label: 'Ultrassom', value: '1.980 exames/mês' }
        ],
        total: { label: 'Capacidade instalada', value: '5.414 exames/mês' }
      }
    },

    /* 03 · O número âncora */
    {
      id: 3,
      layout: 'anchor-number',
      safeRight: 0.52,
      video: 'public/videos_1080p/3.mp4',
      content: {
        number: '17%',
        line1: 'da capacidade instalada é utilizada hoje.',
        line2: '83% está parada.',
        note: '930 exames realizados por mês sobre 5.414 possíveis.'
      }
    },

    /* 04 · Ocupação por modalidade */
    {
      id: 4,
      layout: 'bars-horizontal',
      safeRight: 0.52,
      video: 'public/videos_1080p/4.mp4',
      content: {
        title: 'Onde a capacidade está parada',
        bars: [
          { label: 'Raios X', done: 200, capacity: 2160, pct: '9,3%' },
          { label: 'Tomografia', done: 400, capacity: 720, pct: '55,6%' },
          { label: 'Mamografia', done: 40, capacity: 554, pct: '7,2%', accent: true, callout: 'Rastreamento mamário praticamente inexistente.' },
          { label: 'Ultrassom', done: 290, capacity: 1980, pct: '14,6%' }
        ],
        note: 'A média de tomografia inclui período de campanha. Fora desse período, a ocupação real é menor.'
      }
    },

    /* 05 · O que a gestão já identificou */
    {
      id: 5,
      layout: 'text-statement',
      safeRight: 0.6,
      video: 'public/videos_1080p/5.mp4',
      content: {
        title: 'O que a gestão municipal já identificou',
        statements: [
          'Laudos de baixa qualidade.',
          'Pacientes reconvocados.',
          'Médicos da região deixando de confiar no exame local.'
        ],
        body: 'A consequência é reexame, encaminhamento à capital e tratamento fora de domicílio. O serviço esvazia enquanto o equipamento permanece disponível.',
        note: 'Relato da própria gestão municipal.'
      }
    },

    /* 06 · Tempo de laudo */
    {
      id: 6,
      layout: 'timeline',
      safeRight: 0.52,
      video: 'public/videos_1080p/6.mp4',
      content: {
        title: 'O exame é feito. A resposta demora.',
        timeline: {
          points: [
            { label: 'Exame realizado', at: 0 },
            { label: 'Laudo em 11 dias úteis', at: 0.7 },
            { label: 'Retorno médico', at: 1 }
          ],
          segmentLabel: '11 dias úteis'
        },
        stat: { number: '22%', text: 'dos exames ficam dentro desse prazo.' },
        body: 'Na prática, a maioria dos pacientes espera mais de duas semanas.',
        closing: 'Quantos desses pacientes voltaram ao médico sem resultado?',
        note: 'Laudo de urgência: 4 horas, sem contar o intervalo entre 23h e 7h.'
      }
    },

    /* 07 · Exposição regulatória */
    {
      id: 7,
      layout: 'text-list',
      safeRight: 0.66,
      video: 'public/videos_1080p/7.mp4',
      videoFreeze: 6.0,
      content: {
        title: 'Hoje o município está exposto sem saber.',
        /* As duas exposicoes sao um grupo: entram num painel de vidro unico,
         * porque a faixa de texto cruza a chapa do video neste slide. */
        exposures: true,
        items: [
          { number: '01', text: 'Sem Responsável Técnico. O serviço está irregular perante o CRM-MA e a Vigilância Sanitária.' },
          { number: '02', text: 'Técnicos de radiologia fora da norma da categoria, em escala e salário. Passivo trabalhista em formação.' }
        ],
        body: 'Risco de interdição e de questionamento pelo Ministério Público e pelo Tribunal de Contas do Estado.',
        alertWord: 'interdição'
      }
    },

    /* 08 · O que falta */
    {
      id: 8,
      layout: 'pivot',
      safeRight: 0.62,
      video: 'public/videos_1080p/8.mp4',
      videoFreeze: 6.0,
      content: {
        title: 'O que falta não é equipamento.',
        support: 'Falta gestão médica qualificada, regularidade legal e velocidade de laudo.',
        items: [
          { number: '01', lead: 'Qualidade clínica', text: 'laudos inconclusivos geram reexame e perda de confiança.' },
          { number: '02', lead: 'Regularidade', text: 'sem RT e com técnicos fora da norma, o serviço está exposto.' },
          { number: '03', lead: 'Prazo', text: '11 dias úteis travam a linha de cuidado.' },
          { number: '04', lead: 'Resolutividade', text: 'sem contraste e sem densitometria, o paciente viaja.' },
          { number: '05', lead: 'Gestão', text: 'sem relatório e sem indicador, não há como cobrar nem comprovar.' }
        ]
      }
    },

    /* 09 · A rede MEDI */
    {
      id: 9,
      layout: 'map',
      safeRight: 1,
      video: 'public/videos_1080p/9.mp4',
      videoFreeze: 5.0,
      content: {
        title: 'Lago da Pedra entra numa rede que já funciona.',
        facts: [
          '4 cidades em operação',
          '18 médicos titulados laudando para toda a rede',
          'Relatório mensal auditado em todas as unidades'
        ],
        note: 'Laudo eletivo em Paulo Ramos: [X dias úteis], conforme relatório mensal entregue ao contratante.',
        map: {
          points: [
            { name: 'São Luís', lat: -2.53, lon: -44.30, kind: 'active', sub: 'Radiologia do grupo Athena Saúde (Humana, Unihosp, Medplan)' },
            { name: 'Santa Rita', lat: -3.14, lon: -44.33, kind: 'active' },
            { name: 'Rosário', lat: -2.94, lon: -44.25, kind: 'active' },
            { name: 'Paulo Ramos', lat: -4.45, lon: -45.24, kind: 'active' },
            { name: 'Lago da Pedra', lat: -4.57, lon: -45.13, kind: 'next', sub: 'Próximo passo' }
          ]
        }
      }
    },

    /* 10 · Corpo clínico */
    {
      id: 10,
      layout: 'text-list',
      safeRight: 0.52,
      video: 'public/videos_1080p/10.mp4',
      videoFreeze: 6.0,
      content: {
        title: 'Laudo de subespecialista, no interior, no prazo.',
        items: [
          { number: '01', text: '16 radiologistas titulados, todos com mais de 10 anos de formação.' },
          { number: '02', text: 'Subespecialidades: medicina interna, tórax e cardíaca, neurorradiologia, cabeça e pescoço, musculoesquelético.' },
          { number: '03', text: 'Formação em USP e UNIFESP. Membros com experiência em Boston e em Portugal.' },
          { number: '04', text: 'Cirurgião vascular dedicado aos exames de Doppler.' },
          { number: '05', text: 'Ultrassonografista titulada em medicina fetal, instrutora da principal escola de ultrassonografia de São Luís.' },
          { number: '06', text: 'Segunda leitura por subespecialista quando indicado.' }
        ],
        closing: 'A mesma equipe que lauda hoje para a rede Humana, Unihosp e Medplan em São Luís.'
      }
    },

    /* 11 · Comparativo */
    {
      id: 11,
      layout: 'comparison-table',
      safeRight: 0.66,
      video: 'public/videos_1080p/11.mp4',
      videoFreeze: 6.0,
      content: {
        title: 'Mesma estrutura. Nova gestão médica.',
        table: {
          columns: { label: '', current: 'Cenário atual', proposal: 'Proposta MEDI' },
          rows: [
            { label: 'Modalidades', current: 'RX, TC sem contraste, MMG, USG', proposal: 'RX, TC com contraste, MMG, USG e densitometria óssea' },
            { label: 'Responsável Técnico', current: 'Ausente', proposal: 'RT titulado, com regularização junto ao CRM-MA e à Vigilância Sanitária' },
            { label: 'Corpo clínico', current: '1 radiologista com RQE, maioria recém-formados', proposal: '18 especialistas titulados, com subespecialistas' },
            { label: 'Laudo eletivo', current: '11 dias úteis', proposal: '3 dias úteis' },
            { label: 'Laudo de urgência', current: '4 horas', proposal: '3 horas' },
            { label: 'Exames dentro do prazo', current: '22%', proposal: '85% (meta acima de 90%)' },
            { label: 'Volume mensal', current: '930 exames', proposal: '1.340 exames' },
            { label: 'Técnicos de radiologia', current: 'Fora da norma da categoria', proposal: 'Escala ampliada e salário ajustado à norma' },
            { label: 'Relatório gerencial', current: 'Inexistente', proposal: 'Mensal, à autoridade indicada pela prefeitura' },
            { label: 'Satisfação do paciente', current: 'Não medida', proposal: 'NPS com totem na unidade' }
          ]
        },
        note: '85% é a média do último trimestre nas unidades em operação. 90% é a meta contratual.'
      }
    },

    /* 12 · Produção projetada */
    {
      id: 12,
      layout: 'bars-grouped',
      safeRight: 0.62,
      video: 'public/videos_1080p/12.mp4',
      content: {
        title: '+44% de exames por mês no primeiro ciclo.',
        chart: {
          axisMax: 600,
          groups: [
            { label: 'Raios X', current: 200, proposal: 330, delta: '+65%' },
            { label: 'Tomografia', current: 400, proposal: 520, delta: '+30%' },
            { label: 'Mamografia', current: 40, proposal: 50, delta: '+25%' },
            { label: 'Ultrassom', current: 290, proposal: 380, delta: '+31%' },
            { label: 'Densitometria', current: 0, proposal: 60, delta: 'novo serviço' }
          ]
        },
        stat: { number: '1.340', text: 'exames por mês, contra 930 hoje.' },
        closing: 'Ainda com 76% de capacidade disponível para crescer, sem novo investimento em equipamento.'
      }
    },

    /* 13 · Novos serviços */
    {
      id: 13,
      layout: 'text-two-blocks',
      safeRight: 0.52,
      video: 'public/videos_1080p/13.mp4',
      videoFreeze: 6.0,
      content: {
        title: 'Resolver aqui o que hoje viaja.',
        blocks: [
          {
            heading: 'Tomografia com contraste',
            body: 'Oncologia, avaliação vascular, abdome agudo e estadiamento passam a ser resolvidos em Lago da Pedra.'
          },
          {
            heading: 'Densitometria óssea',
            body: '60 exames por mês, com capacidade para 300. Investigação de osteoporose e prevenção de fratura em idosos, sem sair do município.'
          }
        ],
        closing: 'Cada exame resolvido aqui é um deslocamento por TFD que o município deixa de pagar.',
        note: '[Custo médio de um deslocamento por TFD para São Luís: R$ X, se disponível]'
      }
    },

    /* 14 · Governança */
    {
      id: 14,
      layout: 'report-mock',
      safeRight: 1,
      video: 'public/videos_1080p/14.mp4',
      videoFreeze: 6.5,
      content: {
        title: 'Dados para cobrar, comprovar e prestar contas.',
        items: [
          { number: '01', text: 'Relatório mensal entregue à autoridade indicada pela prefeitura.' },
          { number: '02', text: 'Produtividade e SLA por modalidade, com exames dentro e fora do prazo.' },
          { number: '03', text: 'Satisfação do paciente medida por NPS em totem na unidade.' }
        ],
        closing: 'O mesmo relatório entregue hoje à Athena Saúde e ao contratante de Paulo Ramos.',
        /* Mockup da folha do relatório. Os números abaixo são fictícios e
         * plausíveis, marcados como exemplo pelo rodapé "Modelo ilustrativo". */
        mock: {
          header: 'Relatório mensal · Unidade Lago da Pedra · [mês]',
          columns: ['Modalidade', 'Exames', 'No prazo, %'],
          rows: [
            { label: 'Raios X', a: '318', b: '88' },
            { label: 'Tomografia', a: '496', b: '84' },
            { label: 'Mamografia', a: '47', b: '91' },
            { label: 'Ultrassom', a: '362', b: '86' }
          ],
          chart: {
            label: 'Exames dentro do prazo, %',
            values: [78, 81, 84, 83, 86, 88],
            min: 70,
            max: 100
          },
          footer: 'Modelo ilustrativo'
        }
      }
    },

    /* 15 · Regularização e pessoas */
    {
      id: 15,
      layout: 'text-list',
      safeRight: 0.6,
      video: 'public/videos_1080p/15.mp4',
      content: {
        title: ['Segurança jurídica para o município.', 'Dignidade para a equipe local.'],
        items: [
          { text: 'Responsável Técnico titulado, com regularização junto ao CRM-MA e à Vigilância Sanitária.' },
          { text: 'Escala de técnicos de radiologia ampliada e salário ajustado à norma da categoria.' },
          { text: 'A equipe técnica do município é valorizada e permanece na operação.' }
        ],
        closing: 'Transição em 30 a 60 dias, sem interrupção do atendimento.'
      }
    },

    /* 16 · Fechamento */
    {
      id: 16,
      layout: 'closing',
      safeRight: 0.74,
      video: 'public/videos_1080p/16.mp4',
      videoFreeze: 6.0,
      credits: false,
      content: {
        numbers: [
          { value: '3 dias úteis', label: 'laudo eletivo' },
          { value: '+44%', label: 'exames por mês' },
          { value: '85% a 90%', label: 'dentro do prazo, média e meta' }
        ],
        statement: 'Mesma estrutura. Nova gestão médica. Resultado auditável todo mês.',
        nextSteps: [
          { number: '01', text: 'Visita técnica à unidade' },
          { number: '02', text: 'Proposta comercial' },
          { number: '03', text: 'Cronograma de transição de 30 a 60 dias' }
        ],
        footerLeft: 'MEDI  ·  Santa Rita  ·  Rosário  ·  Paulo Ramos  ·  São Luís',
        logos: true
      }
    },

    /* 17 · Encerramento com o logo MEDI */
    {
      id: 17,
      layout: 'logo-end',
      safeRight: 1.0,
      video: null,          /* usa o ultimo frame congelado do video 16 */
      credits: false,
      content: {
        logo: 'assets/logos/medi.png',
        logoAlt: 'MEDI Medicina Diagnóstica',
        cities: ['Santa Rita', 'Rosário', 'Paulo Ramos', 'São Luís', 'Lago da Pedra'],
        highlight: 'Lago da Pedra'
      }
    }
  ]
};
