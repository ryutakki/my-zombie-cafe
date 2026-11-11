# Estado da implementação

Especificação: `Zombie_Cafe_Mecanicas_e_Prompt.md` e `Zombie_Cafe_Prompt_Implementacao.txt`.
Este arquivo diz o que está pronto, como foi verificado, o que falta e por onde continuar.

## Resumo por etapa

| Etapa | Estado | Verificação |
| --- | --- | --- |
| 1 Café mínimo | Concluída | 28 verificações automáticas (ver abaixo) |
| 2 Equipe | Código escrito, verificação em andamento | |
| 3 Progressão | Código escrito, verificação pendente | |
| 4 Invasões | Código escrito, verificação pendente | |
| 5 Persistência | Parcial (salvar e retomar prontos; duas abas e tutorial pendentes) | |
| 6 Conteúdo e social | Não iniciada | |

## Como rodar e testar

- Jogo: `node serve.js` e abrir `http://localhost:5173`.
- No console do navegador: `ZC.fastForward(segundos)` roda a simulação sem desenhar; `ZC.audit()` confere se as
  porções fecham (cozinhadas + saqueadas = vendidas + perdidas + estudadas + em jogo).
- Os cenários automáticos usam Playwright e ficam fora do repositório nesta sessão. A lista do que cada um
  cobre está em "Verificações" abaixo; vale recriá-los em `tools/tests/` numa próxima sessão.

## Arquitetura (onde mexer)

| Arquivo | Responsabilidade |
| --- | --- |
| `js/config.js` | Todos os números de balanceamento e regras que variam entre edições. Tudo ali é proposta. |
| `js/data.js` | Receitas, móveis, cafés rivais, missões. |
| `js/staff.js` | Perfis, atributos, funções, energia, descanso, distração, fome, XP de zumbi, reserva. |
| `js/state.js` | Save, migração do save antigo, moedas com livro-caixa, receitas conhecidas, reputação. |
| `js/cafe.js` | Simulação: cozinha, tarefas, comida em trânsito, clientes, geladeira, construção. |
| `js/raid.js` | Invasões. |
| `js/ui.js`, `js/render.js` | Menus e desenho. Não decidem dinheiro, energia nem dano. |
| `js/main.js` | Laço, câmera, entrada. `ZC.tick(dt)` é o passo da simulação. |

Regra de sessão ativa: `state.clock` só avança com o jogo aberto e visível. Nada lê o relógio real para
simular (só o prêmio diário usa a data do calendário).

## Etapa 1: café mínimo (concluída)

Feito:
- Chef permanente (por enquanto usa o sprite do Capitão com chapéu de chef) e funções exclusivas: Atender ou Cozinhar.
- Cozinha em lotes: custo cobrado uma vez ao pedir; o lote só avança com o cozinheiro no fogão; sem cozinheiro
  pausa e guarda o progresso; depois de 45 s sozinho, queima. Lote pronto espera balcão; sem balcão fica no
  fogão e estraga.
- Comida em trânsito: porção cancelada volta ao balcão (ou é descartada e contada); lote cancelado volta ao
  fogão, ou vai ao balcão, ou à geladeira. Prato sujo cancelado volta para a mesa.
- Clientes: chegam à porta, reservam um lugar alcançável, sentam, esperam, comem, pagam uma vez, deixam prato
  sujo. Saídas: café lotado, sem lugar, desistiu por demora, desistiu por falta de comida, porta fechada.
- Preço e gorjeta são lançamentos separados. Gorjeta depende de quem serviu e da rapidez.
- Cadeira sem mesa ou inalcançável não vira assento e mostra um cadeado.
- Salvamento: guarda clientes na sala, pratos sujos, o que estava nas mãos e as posições; ao recarregar
  nada avança pelo tempo fora.

Verificações que passaram (Chromium sem interface, simulação acelerada):
1. Vinte atendimentos completos: 21 servidos, 21 pagamentos, porções fechando, 16 pratos lavados.
2. Mesa bloqueada: o editor recusa cercar uma cadeira; cadeira forçada a ficar inalcançável deixa de ser assento.
3. Falta de comida: clientes desistem, a reputação cai com a causa "clientes sem comida", nenhuma moeda aparece.
4. Troca de função com prato em trânsito: a porção volta ao balcão e continua existindo num só lugar.
5. Cozinheiro sai do fogão: pausa, retoma com o mesmo progresso, queima se ficar sozinho demais.
6. Lote pronto sem balcão livre: fica no fogão, avisa, estraga e é baixado.
7. Recarga durante o preparo, simulando 3 dias fora: mesmo progresso, mesmas moedas, mesma energia.

## Decisões próprias (não vêm do original)

- Funções exclusivas com troca livre: o chef sozinho cozinha um lote curto e depois troca para Atender.
- Tolerância de abandono do fogão: 45 s. Estragar no fogão: o maior entre 180 s e 2x o tempo da receita.
- Recuperação de falência: sem dinheiro e sem comida em lugar nenhum, a receita mais barata sai de graça.
- Maestria de receitas e frascos de toxina no chão foram mantidos do protótipo; não são do núcleo clássico.
- Prêmio diário passou a ser por cozinhar no dia (`CFG.daily.trigger`), como o Frequent Fryer.

## Próxima tarefa

Verificar a etapa 2 (infecção duas vezes, exaustão, descanso, surto) e depois as etapas 3 e 4.
