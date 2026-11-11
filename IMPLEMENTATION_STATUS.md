# Estado da implementação

Especificação: `Zombie_Cafe_Mecanicas_e_Prompt.md` e `Zombie_Cafe_Prompt_Implementacao.txt`.
Este arquivo diz o que está pronto, como foi verificado, o que falta e por onde continuar.

## Resumo por etapa

| Etapa | Estado | Verificação automática |
| --- | --- | --- |
| 1 Café mínimo | Concluída | `stage1.js`: 28 verificações |
| 2 Equipe | Concluída | `stage2.js`: 24 |
| 3 Progressão | Concluída | `stage3.js`: 31 |
| 4 Invasões | Concluída | `stage4.js`: 23 |
| 5 Persistência e tutorial | Concluída, sem servidor (ver pendências) | `stage5.js`: 18 |
| 6 Conteúdo e social | Concluída com amigos NPC (ver "Etapa 6") | `stage6.js`: 37 |
| Redesign visual | Concluído, com a ressalva dos clientes (ver "Visual") | olhado em capturas de tela |

Também passaram: `ui.js` (todos os menus com cliques reais, 6 verificações) e `soak.js` (15 minutos simulados
de ações aleatórias em 19 tipos, com as contas de porções conferidas 300 vezes).

## Como rodar e testar

- Jogo: `node serve.js` e abrir `http://localhost:5173`.
- Testes (precisam do Playwright com Chromium e do servidor acima rodando):
  `node tools/tests/stage1.js` ... `stage6.js`, `node tools/tests/ui.js <pasta para as capturas>`,
  `node tools/tests/soak.js`, `node tools/tests/balance.js` (taxa de vitória por café rival).
- No console do navegador: `ZC.fastForward(segundos)` roda a simulação sem desenhar; `ZC.audit()` confere se
  as porções fecham (cozinhadas + saqueadas = vendidas + perdidas + estudadas + entregues a amigos + em jogo).
- Alguns cenários dependem de sorte (quem entra primeiro, onde o chef está). Se um falhar uma vez, rode de novo
  antes de procurar defeito.
- Os personagens animados são gerados por `python3 tools/build-chars.py` a partir de `assets/personagens_novos/`
  (as folhas originais enviadas). Ele escreve `assets/chars/` e `js/chars-manifest.js`.

## Arquitetura (onde mexer)

| Arquivo | Responsabilidade |
| --- | --- |
| `js/config.js` | Todos os números de balanceamento, regras que variam entre edições e os 5 chefs. Tudo ali é proposta. |
| `js/data.js` | Receitas, as 9 variantes e a tabela de pratos (`ZC.DISHES`), móveis, cafés rivais, missões, quem usa qual visual. |
| `js/staff.js` | Perfis, atributos, funções, energia, descanso, distração, fome, XP de zumbi, reserva. |
| `js/state.js` | Save, migração, moedas com livro-caixa, receitas conhecidas, reputação, chef, trava de aba. |
| `js/cafe.js` | Simulação: cozinha, tarefas, comida em trânsito, clientes, geladeira, construção. |
| `js/social.js` | Críticos, amigos NPC, encomendas, pedidos dos amigos. |
| `js/raid.js` | Invasões e visitas. |
| `js/assets.js` | Carregamento e desenho dos personagens (`drawChar`: direções isométricas, andar, carregar, trabalhar, atacar, cair). |
| `js/ui.js`, `js/render.js`, `css/style.css` | Menus e desenho. Não decidem dinheiro, energia nem dano. |
| `js/main.js` | Laço, câmera, entrada. `ZC.tick(dt)` é o passo da simulação. |

Regra de sessão ativa: `state.clock` só avança com o jogo aberto e visível. Nada lê o relógio real para
simular. O relógio real só aparece em dois lugares: a data do prêmio diário e o batimento da trava de aba.

## Etapa 6: o que foi feito

- **5 chefs** (`ZC.CHEFS`), escolhidos numa tela ao começar um jogo novo e trocáveis em Equipe. Só o bônus do
  chef em serviço vale: Bigodes vende 5% mais caro; Marisa cozinha 12% mais depressa; Seu Zé retarda em 30% o
  estrago da comida pronta; Tião dá 15% mais XP ao levar um lote ao balcão; Luna deixa os clientes 12% mais
  pacientes. Todos os números são propostas.
- **9 variantes de receita** (Rápida, Muito Rápida, Picante, Muito Picante, Fina, Muito Fina, Em Lote, Fresca,
  Congelada) como dados em cima da receita base, sem nove cozinhas. Cada uma se desbloqueia, para sempre e por
  receita, cozinhando aquela receita um certo número de vezes (e a versão anterior, no caso das "Muito"). Cada
  variante tem custo, tempo, porções, preço, XP e prazo de estrago próprios. Um balcão guarda um prato só, e a
  variante é um prato diferente. Uma bolinha colorida na borda do prato mostra qual é.
- **Livro** com abas Disponíveis, Bloqueadas, Especiais (receitas de saque) e Favoritas.
- **Críticos**: de tempos em tempos um crítico oferece uma tarefa que o café consegue cumprir (servir, cozinhar,
  lavar, descansar, infectar, vencer invasão). Cumprida no prazo, empresta meia estrela por 4 minutos; não
  acumula com outra. O prazo restante vai no save e não corre com o jogo fechado.
- **Amigos**: não há servidor, então são 4 cafés vizinhos (NPC) que se liberam por nível. Dá para visitar o café
  (cena igual à da invasão, sem luta, com o chef cozinhando e a equipe passeando), encomendar pratos (pago na
  hora, chega uma vez na geladeira depois do tempo; receita que você não conhece pode ser estudada) e atender
  pedidos deles com porções dos seus balcões (prêmio em moedas e XP, pago uma vez). Encomendas e pedidos
  são registros no save, apagados antes de pagar.
- **Reserva e filtros**: a reserva, a ordenação por função, energia e nível, e os favoritos já existiam da etapa 2.

Não feito, de propósito (a especificação os separa do núcleo): PvP, pets, eventos, gacha, fusão, clãs, ranking.

## Visual (redesign)

- **Interface nova**: tema escuro translúcido com destaque verde-zumbi, fonte Fredoka nos títulos e Nunito no
  texto, cartões arredondados, doca de botões com rótulos à esquerda, caixas de ação flutuantes, sem os
  contornos grossos e as sombras duras de antes. Tudo está em `css/style.css` (tokens no `:root`).
- **Mundo**: contorno dos móveis, cenário e ícones mais fino e suave, chão mais claro, fonte Fredoka também no
  canvas. O contorno é controlado por `OL` em `js/furniture.js` e `js/icons.js`.
- **Personagens**: os 6 zumbis e os 5 chefs novos substituem TODOS os antigos. Equipe = os 6 zumbis (um por perfil);
  chef = um dos 5; chef rival de cada invasão = os chefs; clientes e funcionários rivais = os 5 humanos (os chefs);
  clientes especiais = zumbis famosos com o acessório pintado por cima. Os sprites antigos (`assets/sprites/`)
  não são mais carregados (`ZC.LOAD_OLD_SPRITES` os traz de volta).
- **Animações**: andar sem prato usa a pose de "trabalhando" com balanço; carregar comida usa "andando com prato"
  (o prato já vem na imagem); parado, atingido (piscar branco) e caído/descansando (deitado) são feitos por
  código, porque não há arte para eles. Atacar usa a folha de ataque, com o quadro de impacto certo.
- **Ressalva**: os clientes e os defensores rivais são os chefs, então todos usam chapéu de cozinheiro. É o
  único humano que existe na arte nova. Falta arte de clientes comuns, de defensores e das poses que faltam.
  Quando chegar, basta gerar com `tools/build-chars.py` (acrescentar em `CHARS`) e trocar `ZC.HUMAN_LOOKS` em
  `js/data.js`.
- Móveis, pisos, paredes e decoração continuam desenhados em código, só mais finos e claros.

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
- Perfis de zumbi: Comum, Adolescente (atendente ligeiro), Grandalhão (resistente), Careca (lutador),
  Mulher (anfitriã, gorjetas) e Idoso (veterano, raro). Os nomes e as funções estão em `js/staff.js`.
- O save antigo (v2) é migrado: ganha um chef, os zumbis viram perfis e passam a usar os sprites novos.

## Pendências conhecidas

- **Servidor**: não existe. A especificação pede validar operações econômicas no servidor e uma camada social
  com outros jogadores; hoje tudo roda no navegador, o save fica no `localStorage` e os amigos são NPC. Quem
  editar o save manualmente consegue trapacear.
- **Tempos longos**: receitas de 16 a 40 minutos exigem a aba aberta e um cozinheiro preso ao fogão. Vale
  rever com o jogo na mão; `CFG.kitchen.timeScale` encurta todas de uma vez.
- **Balanceamento**: invasões simuladas só com jogo automático (Navio e Porto vencem cerca de metade das
  vezes). Variantes, bônus dos chefs, recompensas dos amigos e dos críticos nunca foram jogados por uma pessoa.
- **Clientes do café rival** não aparecem nem fogem durante a invasão.
- **Girar e guardar móveis** não existe.
- **Celular**: conferido só na horizontal (844x390). A vertical não foi desenhada.
- **Sem som.**
- **Arte**: ver a ressalva dos clientes acima.

## Próxima tarefa

Jogar de verdade e ajustar números: tempos das receitas, preços das variantes, ritmo dos críticos e dos
pedidos dos amigos, e a dificuldade das invasões de nível 4 e 9. Depois, os itens da lista de pendências, em
especial arte própria para clientes e defensores.
