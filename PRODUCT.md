# Product

## Register

brand

## Platform

web

## Users

O deck é apresentado a uma mesa pequena na Prefeitura de Lago da Pedra/MA: **prefeito e secretário de Saúde**, com um detalhe que muda o desenho — o responsável pela decisão **vem da iniciativa privada, gosta de tecnologia e valoriza modernidade**. Não é um interlocutor que se impressiona com formalidade institucional; é um interlocutor que reconhece competência pelo acabamento e desconfia de quem vende demais.

Contexto de uso: reunião presencial, tela cheia, um apresentador conduzindo (coordenação médica da MEDI, CRM/RQE na capa). Não é material para leitura assíncrona nem para envio por e-mail — cada slide existe para ser falado por cima. O texto na tela sustenta o argumento; não o substitui.

O trabalho a ser feito pelo público: decidir se a MEDI é séria o bastante para valer o próximo passo — e conseguir defender essa decisão depois, publicamente e perante o controle.

## Product Purpose

Conquistar **autorização para enviar a proposta comercial**. Esse é o resultado que define sucesso; a visita técnica é consequência, não o objetivo.

O argumento tem três tempos, e a estrutura dos 17 slides já o carrega:

1. **A infraestrutura existe e está parada** (2–4). O município já investiu; 17% da capacidade é usada. O dinheiro já foi gasto — falta fazer render.
2. **O custo de não agir já está correndo** (5–8). Laudo ruim, 11 dias úteis, ausência de Responsável Técnico, técnicos fora da norma. O risco é presente, não hipotético.
3. **A MEDI já resolveu isso em outro lugar** (9–16). Quatro cidades em operação, 18 médicos titulados, relatório mensal auditado. Prova, não promessa.

A tese em uma linha, e o slide 11 a enuncia: **mesma estrutura, nova gestão médica.** O município não precisa comprar equipamento. Precisa comprar competência para operar o que já tem.

## Brand Personality

**Clínico. Contido. Comprovável.**

A voz é a de um médico apresentando um diagnóstico — não a de um fornecedor apresentando um portfólio. Afirma o que mediu, nomeia a fonte do dado, e deixa a conclusão evidente sem enunciá-la. Números em pt-BR, sem superlativo, sem adjetivo de venda. Quando um dado é estimativa ou modelo, o rodapé diz isso ("Modelo ilustrativo", "Relato da própria gestão municipal").

A modernidade que o decisor valoriza **não se comunica dizendo "moderno"** — ela aparece no acabamento: vídeo em tela cheia por slide, tipografia que se ajusta sozinha, animação que assenta junto com a câmera. O deck é a primeira amostra do padrão de trabalho da MEDI. Se ele parecer caro e preciso, a proposta já começou a ser aceita.

## Anti-references

- **Fornecedor vendendo serviço.** Nada de linguagem comercial, superlativo, promessa de transformação, "soluções". O registro é diagnóstico técnico.
- **Slide de prefeitura / licitação.** Nada de PowerPoint institucional, tabela cinza, Arial, clip-art, brasão grande. O contraste com esse padrão é parte do argumento — e é o que o decisor vindo do setor privado lê primeiro.
- **Denúncia ou acusação à gestão.** Restrição crítica e não negociável. Os dados de falha vêm **da própria gestão municipal** — quem vai contratar é quem relatou o problema. O deck expõe risco para **proteger** o interlocutor, nunca para culpá-lo. O sujeito das frases de risco é o serviço ou a situação, jamais uma pessoa ou uma administração.
- **Startup de saúde / deck de investidor.** Sem gradiente, card flutuante, ilustração isométrica, métrica de vaidade.

## Design Principles

1. **Prova antes de promessa.** Toda afirmação forte vem acompanhada de origem, número ou unidade em operação. "18 médicos titulados" e "a mesma equipe que lauda para Humana, Unihosp e Medplan" fazem o trabalho que nenhum adjetivo faz.

2. **O risco pesa por silêncio, não por alarme.** O público pediu mais peso nos slides 5–7, e o caminho correto é **isolamento, não estridência**: menos elementos na tela, mais respiro, um fato sozinho sustentando o slide, entrada mais lenta. Aumentar vermelho ou corpo de fonte transformaria peso em acusação — exatamente o que a anti-referência proíbe. Gravidade se comunica com contenção; quem grita parece interessado, quem constata parece confiável.

3. **O acabamento é a credencial.** Este deck é a amostra de trabalho da MEDI para um decisor que julga competência pelo acabamento. Ajuste tipográfico, coreografia e verificação de layout não são polimento opcional — são o argumento operando em outro canal.

4. **A estrutura já é do município.** O enquadramento é sempre "o que vocês já têm, funcionando" — nunca "o que vocês não fizeram". Mesma estrutura, nova gestão. Isso resolve a tensão entre pesar o risco e não acusar.

5. **Um slide, uma ideia.** Cada tela sustenta uma afirmação que o apresentador desenvolve falando. A `safeRight` de cada slide existe para que o texto nunca dispute espaço com o assunto do vídeo — a imagem é parte do argumento, não decoração atrás dele.

## Accessibility & Inclusion

- **Piso tipográfico de 16 px** na escala base (`--fs-label`): nenhum texto de interface abaixo disso. Sala de reunião, projeção, leitura à distância.
- **Contraste**: corpo em `--ink-body` `#2F3A3F` sobre fundo claro. As notas em `--ink-muted` `#66727A` sobre branco ficam em ~4,7:1 — dentro do mínimo, mas sem folga; ao mudar o vídeo de fundo de um slide, reconferir, porque o texto assenta sobre o frame, não sobre branco puro.
- **`prefers-reduced-motion`** já é respeitado: `RM` encurta ou remove os movimentos, e `settle()` crava o estado final.
- **Degradação sem GSAP**: a apresentação funciona inteira sem animação. Caminho obrigatório de manter.
- **Falha de vídeo** liga `is-failed` e revela `.media-fallback`; a apresentação continua. Numa sala com internet ruim ou máquina desconhecida, isso importa mais que a animação.
- **Cor nunca é o único portador de significado**: na tabela do slide 11, "Cenário atual" e "Proposta MEDI" se distinguem por coluna e rótulo, não só por `--current` cinza vs `--proposal` teal.

## Open question

O slide 7 destaca **"interdição"** em `--alert` `#A63D2F` — o único gesto alto do deck inteiro. Ele tensiona o Princípio 2 e a anti-referência de acusação: é a palavra mais dura da apresentação, em vermelho, num slide sobre exposição legal. Pode ser exatamente o acento certo (uma única vez em 17 slides) ou o ponto onde o deck escorrega de conselho para denúncia. Decidir deliberadamente, não por inércia.
