# Zombie Café (protótipo) — Design

Referência: *Zombie Café* (Capcom, 2011). Este documento lista as mecânicas do original,
o que entra no protótipo v0.1 e o que fica para depois.

## 1. Mecânicas básicas do Zombie Café

| # | Mecânica | Como funciona no original |
|---|----------|---------------------------|
| 1 | **Cozinhar** | Toque no fogão, escolha uma receita (custa moedas). Cada receita tem tempo de preparo, nº de porções e preço por porção. Pratos maiores = mais lucro, mas demoram mais. |
| 2 | **Comida estraga** | Se o prato pronto não for recolhido a tempo, estraga e o investimento é perdido. |
| 3 | **Balcão de servir** | Comida pronta vai para o balcão; cada balcão guarda um tipo de prato. |
| 4 | **Clientes humanos** | Humanos entram, sentam numa cadeira junto a uma mesa e esperam. Têm paciência limitada: se demorar, vão embora irritados. |
| 5 | **Zumbis garçons** | Os funcionários são zumbis: pegam comida no balcão e levam até o cliente, que come e paga. |
| 6 | **Apodrecimento** | Zumbis se desgastam com o tempo/trabalho e precisam ser alimentados (pílulas/toxina), senão param. |
| 7 | **Invasões (raids)** | Você manda seus zumbis atacar outros cafés/locais. Vencer dá moedas, toxina e humanos capturados viram **novos zumbis**. |
| 8 | **Moedas e Toxina** | Moedas (moeda comum) e Toxina (moeda rara, para coisas especiais). |
| 9 | **Decoração e avaliação** | Móveis e decoração aumentam a avaliação do café, o que atrai mais clientes. |
| 10 | **Construção / edição** | Comprar, mover e vender mesas, cadeiras, fogões, balcões e decoração numa grade. |
| 11 | **Expansão** | Pagar para aumentar o tamanho do café. |
| 12 | **Nível / XP** | Cozinhar e servir dão XP; subir de nível libera receitas, itens e alvos de invasão. |
| 13 | **Progresso em tempo real** | Os fogões continuam cozinhando com o jogo fechado. |

## 2. Elenco (tudo vem dos packs Craftpix enviados)

| Personagem do pack | Papel no jogo |
|--------------------|---------------|
| Pirate Zombie | Zumbi inicial (garçom/lutador básico) |
| Squidman | Zumbi especial (comprado com Toxina, mais forte) |
| Robber, Thug, Assassin | Clientes humanos comuns e defensores nas invasões |
| Pirate Leader | Cliente VIP raro (paga em dobro) e chefe da invasão final |
| Humano capturado | O mesmo sprite com tom esverdeado = versão zumbi |

Os packs só trazem personagens. Móveis, comida e cenário são desenhados no código
imitando o estilo (contorno preto grosso, cores chapadas, visual chibi).

## 3. Escopo do protótipo v0.1 (implementado)

- Café em grade vista de cima (3/4), com parede, porta e rua.
- Caldeirões (fogões): 5 receitas, timer em tempo real, prato pronto, prato estragado.
- Balcões com porções; recolher o prato manda as porções para um balcão livre.
- Clientes chegam pela rua, procuram cadeira livre ao lado de mesa, esperam (balão de paciência), comem, pagam (gorjeta se rápido) e vão embora. VIP paga 2x.
- Zumbis garçons com IA: pegam porção no balcão, entregam, gastam energia; com energia 0 desabam.
- Alimentar zumbis com moedas (carne podre) ou Toxina (cérebro).
- Loja: mesas, cadeiras, caldeirões, balcões, 4 decorações (aumentam a avaliação).
- Modo edição: mover e vender móveis, com checagem de caminho (não deixa bloquear o acesso).
- Expansão do café (até 14×10).
- Invasões: 4 alvos, batalha automática lateral com animações de ataque/dano/morte; vitória dá moedas, Toxina, XP e um humano capturado vira zumbi.
- Contratar zumbis (Pirata Zumbi com moedas, Homem-Lula com Toxina).
- XP e níveis liberando receitas, itens e invasões.
- Salvamento automático no navegador (localStorage), com cozimento contínuo offline.

## 4. Próximos passos sugeridos

1. Níveis/evolução de zumbis (XP de invasão, atributos melhores).
2. Clientes com pedidos específicos e pratos preferidos.
3. Café rival de outros jogadores (invasão com layout real).
4. Sons e música.
5. Combinar zumbis / mutações (no original havia zumbis especiais).
6. Missões/objetivos diários e tutorial guiado.
7. Mais variedade de móveis, paredes e pisos (tema pirata/medieval).
8. Gestos de pinça para zoom no celular.

## 5. Estrutura técnica

- HTML + Canvas 2D + JavaScript puro, sem build. Abra `index.html` direto ou rode `node serve.js`.
- `tools/build-sprites.js` recorta e reduz as sequências PNG dos packs (840px → ~128px) e gera
  `assets/sprites/<personagem>/<animação>.png` + `js/sprites-manifest.js`.
- `js/data.js` (receitas, itens, unidades, invasões) · `js/state.js` (save) · `js/cafe.js` (simulação)
  · `js/render.js` (desenho do café) · `js/raid.js` (batalha) · `js/ui.js` (menus) · `js/main.js` (loop, câmera, input).

---

## Revisão 2 — versão isométrica

- **Visão isométrica** (tile 96×48), grama infinita ao redor; a câmera é limitada a uma região pequena em volta do café (vinheta nas bordas).
- **5 temas de mobília** (Madeira, Osso, Cripta, Pirata, Real): mesas, cadeiras, fogões, geladeiras, pias e balcões em cada um (30 itens); 5 pisos, 5 paredes, 29 decorações.
- **Livro de receitas** com 10 pratos. Cozinhar exige: tocar num zumbi → tocar no fogão → escolher a receita. O zumbi vai ao fogão, cozinha (tempo real), e o prato pronto é levado por ele ao balcão (toque no fogão pronto com zumbi selecionado).
- **Clientes** entram pela porta, sentam, são servidos, comem, deixam o prato sujo na mesa e saem pela porta. Zumbis recolhem os pratos sujos sozinhos e lavam na pia.
- Janelas sem luas; placa e pilar desenhados atrás das paredes.
- Salvamento: `localStorage` chave `zombiecafe_proto_v2`.
- Como rodar: `node serve.js` → http://localhost:5173

---

## Revisão 3

- **Mundo 3D → sprites:** árvores (`Enviroment_GroupTrees.obj`) e cogumelos/pedras/tronco (`mogu.obj`) são renderizados por `tools/build-props.js` (rasterizador próprio em `tools/r3d.js`) para `assets/props/*.png`, com paleta própria, sombreamento em 4 tons e contorno escuro. O `.max`, o `.fbx` e o `.mb` não são lidos (formatos proprietários; o OBJ tem a mesma geometria).
- **Terreno:** biomas por ruído (floresta escura, campo, pântano), manchas de grama, terra, lagoas com ondulação e vitórias-régias (`js/world.js`). Tudo determinístico por tile.
- **Porta:** folha de porta animada que abre quando um cliente se aproxima e fecha depois.
- **Cozinhar:** tocar num fogão vazio abre o livro e manda o zumbi livre mais próximo. Se todos estiverem ocupados, segura-se um zumbi, arrasta-se (pêndulo físico, `js/drag.js`) até o fogão e solta-se; ele larga o que fazia e assume o trabalho.
- **Novos zumbis:** não há mais contratação. Toque num cliente → 💉 Infectar (custa Toxina: 1 ladrão, 2 brutamontes/assassino, 4 VIP). Respeita o limite por nível.
- **Paredes:** textura contínua; linhas de divisão só aparecem entre pedaços pintados individualmente (loja → Paredes → "Pintar um a um").
- **Decoração:** +8 itens feitos com os modelos (cogumelos, tronco, toco, pedra, brotos, palmeira, pinheiro).

## Revisão 4 — progressão

- **Missões** (botão 🎯 na barra da esquerda, com selo de prêmios prontos): 20 objetivos em 4 capítulos (cozinhar, servir, lavar, infectar, invasões, corpos devorados, avaliação, tamanho do café, nível, moedas ganhas). Cada capítulo só abre quando o anterior é concluído; os prêmios (moedas, Toxina, XP) são resgatados manualmente.
- **Níveis:** ao subir, o aviso lista o que foi liberado (receitas, móveis, pisos, paredes, invasões). Limite de zumbis sobe até 12 (nível 10).
- **Invasões:** +3 alvos (Floresta dos Caçadores nv5, Fortaleza do Barão nv7, Porto dos Piratas nv9).
- **Devorar corpos:** zumbis abaixo de 75% de vida (e todos, após a vitória) vão comer os inimigos caídos: +40% de vida na luta e +12 de energia no café por corpo.
- **Curar com moedas foi removido;** só 🧠 Cérebro (Toxina) e corpos devorados recuperam energia.
- **Dispensar** agora é feito pela box do funcionário, com confirmação em dois toques (o `confirm()` do navegador falhava).

## Revisão 5 - ícones pintados (sem emojis)
- `js/icons.js`: ícones desenhados em código (contorno grosso `#17121c`, 3 tons): frasco de toxina (vidro, líquido verde, bolhas, rolha rosca), moeda, seringa, cérebro, martelo, livro, pergaminho, menu, estrelas (cheia, meia, vazia), X, check, relógio, cadeado, prato, osso, caveira, reticências, nota, setas.
- API: `ZC.icon(nome, px)` (canvas), `ZC.iconURL(nome)`, `ZC.drawIcon(ctx, nome, x, y, tam)`; `.ico.toxin` / `.ico.coin` usam `--ic-flask` / `--ic-coin`.
- Regra do projeto: nenhum emoji ou glifo de símbolo em HTML, textos ou canvas; sempre um ícone pintado.

## Revisão 6 - progressão e invasões isométricas
- Limite de zumbis por nível: 2 (nível 1), 3 (nível 5), 4 (nível 10), 5 (nível 15), 6 (nível 18), 7 (nível 20). Nível máximo: 20 (`ZC.MAX_LEVEL`).
- XP mais lento: `xpForLevel = 30 * nível^1.9`. Invasões dão XP proporcional (22% do nível do alvo), receitas e missões também.
- Só existe um tipo de zumbi (`ZC.ZOMBIE`: vida 70, ataque 9). Sem clientes VIP, sem variante forte.
- Invasão (`js/raid.js`): o restaurante inimigo é desenhado na mesma vista isométrica (café gerado por alvo, trocando `ZC.state.cafe` só durante o desenho). Toque num zumbi para mandá-lo entrar (ou "Atacar com todos"); cada um escolhe um funcionário; toque num inimigo para todos focarem nele. Inimigos revidam; do mesmo nível, causam 20% menos dano (`ENEMY_DMG = 0.8`, ajustado por diferença de nível). Zumbis feridos devoram corpos.
- 14 restaurantes inimigos (nível 1 ao 20), equilibrados por simulação (esquadrão cheio contra restaurante do mesmo nível vence na maioria das vezes).

## Revisão 7 - mais mecânicas do Zombie Café
- Maestria de receitas: cada receita cozinhada soma ao contador (`state.mastery`). Estrelas em 1, 5, 15, 40 e 100 vezes (`ZC.MASTERY`); cada estrela paga +15% por porção (`ZC.priceOf`). O livro de receitas mostra as 5 estrelas e a dica da próxima.
- Recompensa diária (`ZC.checkDaily`): ao abrir o jogo, uma janela com sequência de 7 dias. Moedas = 100 x dia x (nível/3, mínimo 1); toxina nos dias 4 a 6 (1) e no dia 7 (3). Perder um dia reinicia a sequência.
- Frascos de toxina no chão: de tempos em tempos (70 a 150 s) surge um frasco no café; toque para pegar +1 toxina antes que suma (25 s).
- Acelerar com toxina: tocar num fogão cozinhando abre a caixa com tempo restante e o botão "Acelerar" (1 toxina a cada 4 min restantes).
- Clientes usam as 10 variações de cor dos personagens (`js/variants.js`), com 8% de chance de capitão dourado.
- Save: `mastery` e `daily` adicionados (padrões preenchidos ao carregar saves antigos).

## Revisão 8 - celular na horizontal e cenário ao redor do café
- O jogo no celular é jogado na horizontal. Em telas baixas (altura menor que 520 px) a interface fica compacta: HUD menor em uma linha, barra lateral com botões de 38 px abaixo do HUD, câmera inicial com zoom mínimo 0,42 para caber o café inteiro.
- Ao expandir o café, o cenário (árvores, pedras, cogumelos, troncos, brotos, terra e lagos) dentro da nova área some: `ZC.worldReserved` já cobre toda a área do café e o cache do mundo é refeito quando o tamanho muda.
- Árvores e itens de fora que passam por cima da área do café na tela (piso e as duas paredes de trás) são desenhados normalmente fora dela e translúcidos (32%) dentro dela, para não esconder o salão (`drawOutside` em `js/render.js`).

## Revisão 9 - estilo do cenário
- Os props (árvores, cogumelos, pedras, troncos, brotos e decorações de chão) saem de renders 3D lisos. Ao carregar, `stylizeProp` (`js/assets.js`) repinta cada um: cores um pouco mais vivas, luz quente em cima e sombra fria embaixo, e o mesmo contorno escuro (`#17121c`) dos personagens e móveis, com um pouco mais de peso embaixo.
- A imagem estilizada ganha uma margem de 3 px para o contorno (`PAD`); `ZC.drawProp` compensa isso, então a âncora dos props não mudou.

## Revisão 10 - clientes únicos
- `js/specials.js`: 5 clientes únicos (`ZC.SPECIALS`), cada um com sprite recolorido (variantes `sp_*`, marcadas `special` para os clientes comuns nunca usarem) e acessório pintado na cabeça (`ZC.drawAccessory`), mais uma estrela dourada flutuando acima.
  - Policial Podre (nível 1): boné azul; paga +50% e tem 30% mais paciência.
  - Bruxa do Pântano (nível 3): chapéu de bruxa; deixa 1 toxina de gorjeta.
  - Crítico Gastronômico (nível 5): chapéu de chef; XP extra e conta como mais uma vez cozinhado para a maestria.
  - Estrela Pop Defunta (nível 7): óculos escuros e estrela; paga o dobro e chega com 2 fãs (clientes comuns).
  - Magnata Pirata (nível 10): monóculo e moeda no chapéu; paga o triplo, mas tem 40% menos paciência.
- Chance de 14% por cliente novo; no máximo 2 únicos ao mesmo tempo e nunca dois do mesmo tipo. Um aviso aparece quando chegam. Infectar um cliente único custa 5 toxinas (comuns: 2).

## Revisão 11 - mover móveis segurando
- Segurar o clique/dedo (0,36 s, sem mexer mais de 8 px) sobre um móvel o levanta com um pulinho (easeOutBack, sombra no chão e quadrado de destino verde/vermelho). Arrastar leva o móvel até outro quadrado; soltar coloca (`startLift`/`endLift` em `js/main.js`). Funciona no modo de jogo e no de edição, sem abrir a barra de edição.
- Ao soltar num lugar inválido ou ocupado o móvel volta para onde estava, com aviso. Ao assentar, ele cai e quica uma vez e aparece um anel de poeira (`dropOff` e `view.drops` em `js/render.js`).
- Móveis ocupados (cadeira com cliente, mesa com clientes, fogão cozinhando) não levantam e mostram o motivo. Um toque rápido continua abrindo os menus de sempre.
- No celular vibra de leve ao levantar, quando o aparelho permite.

## Revisão 12 - mecânicas completas do núcleo
- Especificação em `Zombie_Cafe_Mecanicas_e_Prompt.md`; o estado da implementação, as decisões e a próxima tarefa ficam em `IMPLEMENTATION_STATUS.md`.
- O jogo passou a rodar num relógio de sessão (`state.clock`): nada cozinha, cansa ou recupera com o jogo fechado. Isso substitui o "progresso em tempo real" das revisões anteriores.
- Novos arquivos: `js/config.js` (balanceamento), `js/staff.js` (equipe), `tools/tests/` (cenários automáticos).
- Chef permanente, funções exclusivas, perfis de zumbi com atributos, energia compartilhada entre café e invasão, descanso, distração, surto, reserva, reputação operacional, receitas conhecidas, geladeira com saque, chefe rival, recuo e reanimação, trava de duas abas, tutorial guiado.
