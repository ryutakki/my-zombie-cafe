# Estado da implementação

Especificação: `Zombie_Cafe_Mecanicas_e_Prompt.md` e `Zombie_Cafe_Prompt_Implementacao.txt`.
Este arquivo diz o que está pronto, como foi verificado, o que falta e por onde continuar.

## Resumo por etapa

| Etapa | Estado | Verificação automática |
| --- | --- | --- |
| 1 Café mínimo | Concluída | `stage1.js`: 28 verificações |
| 2 Equipe | Concluída | `stage2.js`: 24 verificações |
| 3 Progressão | Concluída | `stage3.js`: 31 verificações |
| 4 Invasões | Concluída | `stage4.js`: 23 verificações |
| 5 Persistência e tutorial | Concluída, sem servidor (ver pendências) | `stage5.js`: 18 verificações |
| 6 Conteúdo e social | Não iniciada | |
| Redesign visual com os sprites novos | Não iniciado: PRÓXIMA TAREFA | |

Também passaram: `ui.js` (todos os menus com cliques reais, 6 verificações) e `soak.js` (15 minutos
simulados de ações aleatórias, com as contas conferidas 300 vezes).

## Como rodar e testar

- Jogo: `node serve.js` e abrir `http://localhost:5173`.
- Testes (precisam do Playwright com Chromium e do servidor acima rodando):
  `node tools/tests/stage1.js` ... `stage5.js`, `node tools/tests/ui.js <pasta para as capturas>`,
  `node tools/tests/soak.js`, `node tools/tests/balance.js` (taxa de vitória por café rival).
- No console do navegador: `ZC.fastForward(segundos)` roda a simulação sem desenhar; `ZC.audit()` confere se
  as porções fecham (cozinhadas + saqueadas = vendidas + perdidas + estudadas + em jogo).
- Alguns cenários dependem de sorte (quem entra primeiro, onde o chef está). Se um falhar uma vez, rode de novo
  antes de procurar defeito; os que falhavam por isso já foram ajustados.

## Arquitetura (onde mexer)

| Arquivo | Responsabilidade |
| --- | --- |
| `js/config.js` | Todos os números de balanceamento e regras que variam entre edições. Tudo ali é proposta. |
| `js/data.js` | Receitas, móveis, cafés rivais, missões. |
| `js/staff.js` | Perfis, atributos, funções, energia, descanso, distração, fome, XP de zumbi, reserva. |
| `js/state.js` | Save, migração do save antigo, moedas com livro-caixa, receitas conhecidas, reputação, trava de aba. |
| `js/cafe.js` | Simulação: cozinha, tarefas, comida em trânsito, clientes, geladeira, construção. |
| `js/raid.js` | Invasões. |
| `js/ui.js`, `js/render.js` | Menus e desenho. Não decidem dinheiro, energia nem dano. |
| `js/main.js` | Laço, câmera, entrada. `ZC.tick(dt)` é o passo da simulação. |

Regra de sessão ativa: `state.clock` só avança com o jogo aberto e visível. Nada lê o relógio real para
simular. O relógio real só aparece em dois lugares: a data do prêmio diário e o batimento da trava de aba.

## O que cada sistema da especificação tem hoje

1. **Grade e layout**: comprar, mover (segurar e arrastar), vender, expandir. Validação de caminho ao colocar.
   Cadeira sem mesa ou inalcançável não vira assento e mostra um cadeado com o motivo. Porta pode ser fechada
   (painel de Reputação). Falta: girar móveis e guardar móveis num inventário.
2. **Clientes**: chegar, reservar lugar alcançável, sentar, esperar, comer, pagar uma vez, sujar a mesa, sair.
   Saídas: lotado, sem lugar, demora, falta de comida, porta fechada, pânico.
3. **Atendimento e limpeza**: tarefas com reserva de porção e de cliente. Prato sujo antigo passa na frente.
   Porção, lote e prato sujo em trânsito têm destino quando a tarefa é cancelada.
4. **Cozinha em lotes**: custo cobrado uma vez; só avança com cozinheiro; pausa; queima por abandono; pronto
   espera balcão; estraga no fogão. Acelerar com Toxina. Jogar fora é sempre ação explícita.
5. **Balcão, geladeira, livro**: balcão guarda um prato por vez. Geladeira guarda 2 lotes de saque por
   unidade; o excedente espera e nunca é perdido. Estudar um lote desconhecido consome o lote e ensina a
   receita para sempre. Livro separa Disponíveis, Bloqueadas (com o motivo) e Favoritas.
6. **Infecção**: ficha do cliente com os atributos que ele teria; cobra e cria na mesma chamada; equipe cheia
   é avisada antes de gastar.
7. **Atributos**: 6 perfis (Zumbi Comum, Ladrão, Brutamontes, Assassino, Capitão, Homem-Lula) com energia,
   velocidade, gorjeta, força, tolerância à fome, desgaste e recuperação. Cada recruta varia 10% do perfil.
8. **Energia**: uma reserva só, usada no café e como vida na invasão. Aviso de cansaço com estimativa,
   distração, janela de 10 s antes do surto, ataque com fuga dos clientes e queda de reputação, intervalo
   entre surtos, desabar a zero. Descanso é estado próprio. Cérebro (1 Toxina) enche uma vez.
9. **Chef, níveis e reserva**: chef não cansa e não vai à reserva. Zumbis têm XP e nível próprios (até 10).
   Reserva congela a energia e guarda a identidade. Favorito não pode ser dispensado.
10. **Economia**: moedas e Toxina passam por `ZC.spend`, `ZC.addCoins`, `ZC.addToxin`, com motivo no
    livro-caixa (`state.ledger`). Preço e gorjeta são lançamentos separados. Sem dinheiro real.
11. **Reputação**: nota do serviço (0 a 5) separada do nível e da estrela temporária (Crítico Gastronômico).
    Decoração virou "ambiente" e aumenta a paciência. Reputação controla a frequência de clientes e quem
    aparece. Toque nas estrelas para ver as causas.
12. **Loja e desbloqueios**: 13 receitas, 14 cafés rivais, expansões, itens por nível. Algumas receitas exigem
    fogão melhor.
13. **Invasões**: mesma equipe (sai do café enquanto luta), energia real como vida, chefe rival, foco geral
    ou ordem para um zumbi só, recuo com parte das moedas, derrota, devorar corpos.
14. **Saque e reanimação**: vitória dá moedas, Toxina, XP e um lote do prato da casa. Pagamento único por
    invasão. Quem cai fica 150 s em reanimação e volta com 20% de energia; Toxina encurta.
15. **Objetivos e tutorial**: 24 missões; o primeiro capítulo aparece como passo a passo na faixa do topo e
    só avança com o evento real. Prêmio diário vem de cozinhar no dia.
16. **Persistência**: salva sozinho; guarda clientes, pratos sujos, o que estava nas mãos, posições, tempos
    restantes. Recarregar não avança nada. Aba escondida não simula. Duas abas: só uma joga e salva.

## Decisões próprias (não vêm do original)

- Funções exclusivas com troca livre: o chef sozinho cozinha um lote curto e depois troca para Atender.
- Começa com chef + 1 zumbi, para que a primeira infecção caiba no limite do nível 1.
- Tolerância de abandono do fogão: 45 s. Estragar no fogão: o maior entre 180 s e 2x o tempo da receita.
- Recuperação de falência: sem dinheiro e sem comida em lugar nenhum, a receita mais barata sai de graça.
- Vencer a invasão = derrubar o chefe; os outros fogem. Roubo antes da vitória existe só como opção
  desligada (`CFG.raid.lootBeforeWin`, ainda sem código por trás).
- Captura de um humano na vitória foi mantida do protótipo (`CFG.raid.capture`).
- Maestria de receitas e frascos de toxina no chão foram mantidos do protótipo; não são do núcleo clássico.
- Prêmio diário por cozinhar no dia (`CFG.daily.trigger`), como o Frequent Fryer.
- O save antigo (v2) é migrado: ganha um chef, os zumbis viram perfis e os fogões guardam o progresso que
  tinham quando o jogo foi salvo.

## Pendências conhecidas

- **Servidor**: não existe. A especificação pede validar operações econômicas no servidor; hoje tudo roda no
  navegador e o save fica no `localStorage`. Quem editar o save manualmente consegue trapacear.
- **Tempos longos**: receitas de 16 a 40 minutos exigem a aba aberta e um cozinheiro preso ao fogão. Vale
  rever com o jogo na mão; `CFG.kitchen.timeScale` encurta todas de uma vez.
- **Balanceamento das invasões**: simulado só com jogo automático. Navio (nível 4) e Porto (nível 9) vencem
  cerca de metade das vezes com a equipe do nível; os outros alvos até o nível 12 vencem sempre, voltando
  com 30% a 60% de energia.
- **Clientes do café rival** não aparecem nem fogem durante a invasão.
- **Girar e guardar móveis** não existe.
- **Celular**: a faixa do tutorial e as fichas novas não foram conferidas em tela pequena.
- **Etapa 6**: variantes de receita (Spicy, Fancy, Bulk...), escolha de chef com bônus, críticas com tarefas,
  amigos, visitas e encomendas. Nada disso tem botão no jogo, de propósito.

## Próxima tarefa: redesign visual com os sprites novos

Pedido do dono do projeto: refazer o visual inteiro e combinar com os personagens novos.

Os sprites estão em `assets/personagens_novos/` (cópia das folhas do zip enviado; os quadros soltos e os
GIFs ficaram de fora por serem repetição):
- 6 zumbis (`zumbis/zumbi_padrao`, `_mulher`, `_idoso`, `_adolescente`, `_grandalhao`, `_careca`) e 5 chefs
  humanos (`chefs_humanos/chef_classico`, `_mulher`, `_veterano`, `_barbudo`, `_jovem`).
- Cada um tem 3 folhas de 1536x1024: `ataque.png`, `trabalhando.png`, `andando_prato.png`. São 6 colunas de
  tempo e 4 linhas de direção, nesta ordem: frente_esquerda, frente_direita, costas_esquerda, costas_direita.
  Quadro de 256x256, âncora (128, 240). Durações em `animacoes.json`. `catalogo.png` mostra todos.

O que o jogo espera hoje (ver `js/sprites-manifest.js`, `js/assets.js`, `tools/build-sprites.js`):
- Uma tira horizontal por animação, com nomes `idle_`, `walk_`, `attack_`, `hurt_` + `front|back|left|right`,
  e `die`. `ZC.drawSprite(ctx, personagem, anim, t, x, y, escala, opções)`.
- Direções hoje são 4 retas; os sprites novos são 4 diagonais, que é o certo para a vista isométrica.
  `ZC.dirName` em `js/data.js` decide a direção a partir do movimento na grade.

Diferenças a resolver:
- Os novos não têm parado, andando de mãos vazias, atingido nem caído. Sugestão: parado = primeiro quadro de
  `trabalhando`; andar sem prato precisa de arte nova ou do `andando_prato` como provisório; descansar,
  desabar e reanimar precisam de pose (hoje usam o último quadro de `die`).
- `andando_prato` já traz o prato na imagem: desligar o desenho do prato por cima (`drawCarry` em
  `js/render.js`) para esses personagens.
- Clientes e inimigos continuam com os sprites antigos (ladrão, brutamontes, assassino, capitão) até
  existirem versões no estilo novo. O recruta infectado hoje mantém o sprite do cliente com tom verde;
  decidir se passa a virar um dos 6 zumbis novos.
- Escolha do chef no começo do jogo: `state.zombies` tem o chef com `chef: true`, `sprite` e `acc`; basta uma
  tela inicial que grave o sprite escolhido. Bônus por chef é da etapa 6.
- O visual dos menus está todo em `css/style.css` (variáveis no `:root`) e `index.html`; móveis, pisos e
  paredes são desenhados em código (`js/furniture.js`, `js/decor.js`, `js/render.js`).
