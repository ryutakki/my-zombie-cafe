# Mecânicas para um jogo inspirado em Zombie Café

Documento de design e implementação | Preparado em 11 de novembro de 2026

## 1 Objetivo e critério de fidelidade

O objetivo é reproduzir a experiência de administrar um café com funcionários zumbis: preparar comida, atender clientes, recrutar pessoas interessantes, gerenciar cansaço e usar a própria equipe para saquear concorrentes. O restaurante, a coleção de funcionários e as invasões precisam alimentar a mesma progressão.

Este documento assume como referência principal o Zombie Café clássico internacional, incluindo sistemas adicionados por atualizações. Recursos de versões japonesas, modificações comunitárias e melhorias sugeridas não devem ser misturados silenciosamente ao núcleo. Não foi feita uma auditoria do código original nem de uma instalação específica; portanto, isto é uma especificação funcional fundamentada, não uma reprodução certificada de todas as fórmulas.

**Como ler:** os trechos “Referência” resumem comportamentos documentados e apontam fontes numeradas. Os trechos “Aplicação proposta”, critérios de aceite, fórmulas, estruturas de dados, quantidades de conteúdo e prioridades são decisões para construir o seu jogo. Quando faltar comprovação, mantenha a regra configurável e identificada como proposta.

**Ciclo central:** cozinhar lotes → disponibilizar porções → servir e limpar → receber dinheiro e XP → melhorar o café e recrutar → descansar e invadir → obter comida e receitas → ampliar o cardápio.

As seis prioridades de identidade são: atendimento visível; comida finita; funcionários com perfis diferentes; energia com consequências; invasões com a mesma equipe; expansão que altera o funcionamento do café. O anúncio original da Capcom já relacionava preparo, decoração, ataques a clientes, reputação e roubo de receitas. [1]

## 2 Mapa isométrico e organização do café

**Referência:** guias de layout mostram que distâncias entre mesas, balcões e pias influenciam a eficiência do serviço. [2]

**Aplicação proposta:**

- Usar uma grade lógica para posicionamento, ocupação e caminhos. A arte isométrica representa essa grade; não define sozinha as regras de colisão.
- Permitir comprar, mover, girar, guardar e recolocar objetos; vender quando a categoria permitir. Mostrar uma prévia antes de confirmar.
- Cada objeto deve informar tamanho, células ocupadas, pontos de interação e orientações válidas. Uma mesa bonita, mas inacessível, não pode funcionar.
- Validar conexão entre entrada, assentos, comida e limpeza. Sinalizar o motivo do bloqueio diretamente no objeto.
- Associar mesa e cadeira a um lugar utilizável. Não presumir que qualquer cadeira encostada em qualquer objeto cria um assento.
- Oferecer expansão progressiva do terreno, com preço e requisitos configuráveis, preservando objetos existentes.
- Permitir fechar temporariamente a entrada para reorganizar ou recuperar a equipe. É uma conveniência proposta; não exige reproduzir truques históricos de bloquear portas.

O layout deve gerar escolhas: mais mesas aumentam capacidade, mas ocupam circulação; cozinha maior melhora produção, mas não resolve falta de garçons. Distância deve afetar o tempo real da tarefa.

**Aceite:** mover uma pia altera o percurso da limpeza; bloquear uma cadeira impede seu uso; expandir o terreno mantém inventário, comida e posições válidos.

## 3 Clientes e ciclo de atendimento

**Referência:** clientes variam em aparência e atributos; nível e reputação influenciam visitantes. É possível inspecionar seus atributos antes de infectá-los. [3]

**Aplicação proposta:** representar cada cliente como uma entidade com estados, alvo e temporizadores próprios:

1. Surgir na área externa e tentar entrar.
2. Encontrar e reservar um assento livre e acessível.
3. Caminhar, sentar e aguardar comida.
4. Receber uma porção e comer.
5. Pagar, avaliar o atendimento e sair.
6. Deixar a mesa suja para limpeza posterior.

Adicionar saídas alternativas: sem lugar, sem comida, espera excessiva, caminho impossível ou pânico. Definir paciência por etapa; a paciência de um cliente não é o mesmo atributo que a tolerância à fome de um zumbi.

Não é necessário inventar um sistema complexo de pedidos individuais. Para a primeira versão, o cliente aceita uma receita disponível no balcão. Preferências por pratos podem entrar depois como uma expansão própria.

Separar dinheiro da refeição de gorjeta. A venda só ocorre após um evento definido, uma única vez. Se o cliente fugir antes do pagamento, não gerar receita fictícia.

**Aceite:** dois clientes não ocupam a mesma cadeira; um cliente atendido paga uma vez; falta de comida causa uma reação visível; nenhum visitante fica preso indefinidamente.

## 4 Serviço automático e limpeza

**Referência:** a descrição comunitária da IA atribui prioridade ao atendimento, reserva os melhores atributos de gorjeta para servir e relaciona gorjetas com rapidez. A fórmula exata não é conhecida. [4]

**Aplicação proposta:**

- Atribuir funcionários a cozinhar, servir, descansar ou participar de invasão. Um funcionário não executa dois papéis simultaneamente.
- Criar tarefas reais: retirar porção, levar à mesa, recolher louça e descartá-la ou lavá-la.
- Reservar tarefa, porção e destino para impedir que dois funcionários atendam o mesmo cliente.
- Priorizar atendimento com prazo próximo; usar eficiência e gorjeta como critérios secundários. Impedir que a limpeza seja adiada para sempre.
- Após a limpeza, liberar o assento. Uma mesa suja não deve receber outro cliente como se estivesse limpa.
- Se faltar caminho, liberar reservas, recalcular quando necessário e informar o problema. Não teletransportar o personagem para mascarar a falha.
- Ao trocar função, finalizar ou cancelar a tarefa com tratamento explícito para a porção carregada.

**Decisão proposta:** uma porção recolhida deixa o estoque do balcão e passa a existir como item em trânsito. Se o atendimento for cancelado, devolvê-la quando possível ou registrar descarte. Nunca manter a mesma porção nos dois locais.

**Aceite:** balcões, garçons, mesas e pias formam uma cadeia observável; garçom parado tem motivo identificável; limpar faz diferença na capacidade do café.

## 5 Cozinha em lotes e comida estragada

**Referência:** cozinhar exige escolher um prato e atribuir chef ou zumbi ao fogão. Pratos abandonados ou esquecidos podem queimar durante a operação do café. Guias antigos divergem em detalhes temporais. [5]

**Aplicação proposta:** cada receita deve definir custo do lote, tempo, quantidade de porções, valor por porção, XP, nível exigido e equipamento compatível.

Estados do fogão: livre; aguardando cozinheiro; preparando; pausado; pronto; estragado. Estados do lote são separados: no fogão; em transferência; no balcão; armazenado; consumido; descartado.

- Cobrar o custo ao iniciar o lote, sem cobrança adicional em cada atualização.
- Exigir cozinheiro atribuído para avançar. Ao retirá-lo, preservar progresso e iniciar uma tolerância de abandono configurável.
- Ao concluir, aguardar transferência para balcão. Não transformar automaticamente todo o lote em dinheiro.
- Se não houver balcão elegível, manter o lote pronto e mostrar o impedimento.
- Controlar deterioração por receita. Exibir horário limite e alerta antes da perda.
- Descartar ou recuperar pratos apenas por uma ação explicitamente definida; recuperação com moeda especial é opcional.
- Ao encerrar a sessão, salvar o progresso do lote e o tempo restante de deterioração. Retomar esses processos somente quando a sessão estiver ativa novamente.

**Aceite:** fechar e abrir o jogo preserva o progresso salvo, sem avançá-lo pelo tempo decorrido; lotes prontos podem estragar; perder o cozinheiro não mantém produção infinita; uma transferência não duplica porções.

## 6 Balcões geladeiras e descoberta de receitas

**Referência:** pratos obtidos em invasões podem ir à geladeira e servir como comida ou como meio de desbloquear receitas. Existem receitas condicionadas ao nível e a fogões especiais. [6]

**Aplicação proposta:** separar três conceitos no código e na interface: conhecer uma receita; possuir um lote dessa receita; ter equipamento e nível para prepará-la.

- Balcão: mantém comida pronta para atendimento, com receita, variante e quantidade restantes.
- Geladeira: guarda lotes obtidos como recompensa ou entrega. Não pressupor que todo prato cozido possa ser guardado; isso deve ser uma regra explícita.
- Livro: registra desbloqueios permanentes e requisitos ainda faltantes.
- Ao estudar um lote desconhecido, explicar se o lote será consumido. Para a implementação inicial, consumir o lote uma vez e desbloquear a receita é uma regra proposta, a validar caso se escolha uma versão exata.
- Se a receita já for conhecida, oferecer servir ou conservar; não cobrar outra descoberta.
- Separar descobrir de poder cozinhar: uma receita avançada pode ser conhecida antes de cumprir seus requisitos.
- Mostrar inventário cheio antes de aceitar uma transferência e definir um destino seguro para recompensas pendentes.

**Aceite:** usar um lote não apaga o conhecimento permanente; conhecer uma receita não cria porções gratuitas; recompensas não desaparecem quando não há espaço.

## 7 Cardápio e variantes

**Referência:** a documentação descreve a receita normal e nove modificadores: Spicy, Very Spicy, Fancy, Very Fancy, Bulk, Fresh, Frozen, Quick e Very Quick. [7]

| Variante | Efeito documentado em termos gerais |
| --- | --- |
| Spicy e Very Spicy | Mais experiência |
| Fancy e Very Fancy | Custo e rendimento superiores |
| Bulk | Lote ampliado e maiores retornos |
| Fresh | Maior tolerância antes de estragar |
| Frozen | Preparo mais longo e custo reduzido |
| Quick e Very Quick | Preparo mais rápido |

**Aplicação proposta:** guardar variantes como dados associados à receita base, com desbloqueio separado. Não criar nove implementações independentes de cozinha. Percentuais devem ficar numa tabela de configuração; não presumir uma fórmula universal entre versões.

Organizar o livro por disponíveis, bloqueadas, especiais e favoritas. Mostrar custo, duração, rendimento bruto, lucro estimado sem gorjetas, porções e requisito. Receita bloqueada deve explicar como obtê-la.

Distribuir receitas por função: preparo curto para presença ativa; lotes maiores para abastecimento; XP; lucro; descoberta rara. Não deixar uma receita dominar simultaneamente lucro, duração, XP e energia em todas as situações.

**Aceite:** trocar variante altera somente os parâmetros previstos; desbloquear uma variante não libera automaticamente todas as outras; o jogador consegue entender por que escolher cada prato.

## 8 Infecção e recrutamento

**Referência:** clientes podem se tornar funcionários mediante dinheiro ou Toxin; os primeiros recrutamentos têm condições facilitadas. A ficha permite comparar energia, velocidade, gorjetas e força. [3]

**Aplicação proposta:** clicar no visitante abre uma ficha com aparência, perfil, custo, capacidade disponível e confirmação de infecção. A transformação deve ser visível e preservar a identidade daquele personagem.

- Validar que o cliente ainda existe, não está saindo e não foi convertido por outra ação.
- Verificar dinheiro e limite antes de concluir a transformação.
- Cobrar e criar o funcionário na mesma operação. Se falhar, nenhuma das duas alterações deve permanecer sozinha.
- Cancelar o atendimento anterior e liberar mesa e tarefas relacionadas.
- Manter distinção entre tipo de personagem e instância recrutada: dois policiais podem ter níveis e energia diferentes.
- Mostrar novos perfis conforme a progressão. Evitar que aparência seja a única diferença entre todos os funcionários.
- Permitir dispensar funcionários com confirmação; guardar na reserva não significa dispensar.

**Aceite:** clicar repetidamente em infectar não desconta duas vezes nem gera duplicatas; o novo funcionário tem ficha própria; capacidade cheia é explicada antes do gasto.

## 9 Atributos e especialização da equipe

**Referência:** guias distinguem funcionários eficientes em gorjetas daqueles mais úteis em combate. Energia elevada também aumenta o período de trabalho disponível. [8]

**Aplicação proposta:**

| Atributo | Consequência observável |
| --- | --- |
| Energia máxima e atual | Autonomia de trabalho e resistência nas invasões |
| Velocidade | Tempo de deslocamento no café e no combate |
| Gorjeta | Potencial de renda adicional no serviço |
| Força | Dano em invasões |
| Tolerância à fome | Limiar de risco de ataque a clientes |
| Recuperação e desgaste | Ritmo de descanso e duração dos turnos |

Não adicionar defesa, crítico, equipamentos, classes complexas ou árvore de habilidades como se fossem obrigatórios do original. Podem ser expansões, mas não são necessários para reconstruir seu ciclo principal.

Criar perfis com vantagens e custos: atendente rápido com boa gorjeta; trabalhador resistente; lutador forte com atendimento fraco; personagem equilibrado. Indicar recomendação de função sem impedir escolhas livres.

Comparar o resultado em condições iguais: mesmo caminho, mesma mesa, mesma receita e mesmo tempo. Se trocar um funcionário não muda nada perceptível, seus atributos ainda são decorativos.

**Aceite:** duas equipes distintas produzem ritmos e receitas diferentes; funcionários valiosos no café criam custo de oportunidade quando levados para invadir.

## 10 Energia descanso distração e ataques a clientes

**Referência:** energia diminui no trabalho e com dano em invasões; descanso e Toxin recuperam o recurso. Baixa energia favorece distração e ataques, e a tolerância varia conforme o personagem. [9]

**Aplicação proposta:** usar uma única reserva de energia para ligar trabalho e combate. Uma barra de cansaço independente de uma barra de vida totalmente cheia enfraqueceria essa ligação.

- Configurar desgaste por função e recuperação por segundo de descanso.
- Exibir alerta antes da faixa perigosa, com tempo estimado até precisar descansar.
- Permitir ordenar descanso individualmente. Descanso deve ser um estado real, sem servir ou cozinhar em paralelo.
- Representar distração como interrupção temporária de produtividade, com animação e duração limitada.
- Ao cruzar o limiar de fome, aplicar a regra de ataque configurada. Recomenda-se uma janela de reação antes do primeiro ataque.
- Um ataque deve assustar clientes, interromper pagamentos ainda pendentes e reduzir reputação. A recuperação obtida ao comer não pode tornar o surto a melhor estratégia econômica habitual.
- Impedir um ciclo instantâneo de ataques a cada atualização; registrar alvo, duração e intervalo.

**Aceite:** descansar evita o problema quando ordenado a tempo; um surto tem consequências reais; restaurar energia consome o recurso uma única vez; a barra nunca sai de zero até o máximo.

## 11 Chef principal níveis e reserva de zumbis

**Referência:** o chef é o avatar principal; a documentação o distingue dos empregados por não sofrer desgaste normal de energia no café. Atualizações adicionaram XP aos zumbis e chefs com bônus. O Meat Locker permite guardar funcionários excedentes. [10][11][12]

**Aplicação proposta:**

- Chef: garantir uma unidade permanente capaz de sustentar a operação mínima. Dar opções de aparência e, posteriormente, bônus claramente descritos.
- Zumbis: armazenar XP individual, nível e crescimento de atributos configurável. Não confundir nível do funcionário com nível do café.
- Reserva: separar limite de funcionários ativos de capacidade de armazenamento. Permitir mover entre equipe e reserva sem apagar progresso.
- Definir explicitamente se guardar recupera energia. Para a referência clássica adotada, manter energia congelada na reserva, seguindo o relato comunitário sobre armazenamento. [13]
- Funcionário em invasão ou reanimação não pode ser colocado em serviço por um segundo menu.
- Exibir filtros por função, energia e nível, além de identificação de favoritos para evitar dispensas acidentais.

**Aceite:** uma unidade guardada volta com identidade e progresso preservados; trocar chef não duplica bônus; o café continua recuperável mesmo após a derrota da equipe.

## 12 Dinheiro Toxin e economia

**Referência:** Toxin aparece como recurso especial para acelerar processos e recuperar funcionários; o jogo também utilizou conteúdo premium. [9][11][17]

**Aplicação proposta:** manter duas moedas com funções diferentes. Dinheiro financia cozinha, móveis, expansão e parte do recrutamento. Toxin financia conveniências e conteúdo especial, com fontes de aquisição definidas.

Não é necessário integrar pagamento real para validar o jogo. Primeiro provar que o ciclo funciona com uma economia simulada e recompensas de jogo.

Fórmulas propostas para análise, não fórmulas extraídas do original:

- Receita bruta do lote = porções efetivamente vendidas × preço por porção.
- Lucro realizado = receita das vendas + gorjetas recebidas − custo do lote − outras despesas explicitamente existentes.
- Produção por hora = porções por lote ÷ duração do preparo em horas, antes de interrupções.
- Capacidade de serviço = mínimo entre disponibilidade de comida, capacidade das mesas e capacidade dos funcionários.

Exemplo fictício: um lote custa 100, produz 40 porções e vende a 5. Se todas forem vendidas, rende 200 antes das gorjetas e lucro de 100. Se apenas 10 forem vendidas, foram recebidos 50; não creditar os 150 restantes antecipadamente.

Prever recuperação de falência: uma receita básica acessível ou tarefa emergencial. Identificar essa proteção como decisão própria. Não acrescentar aluguel, salários, agricultura ou cadeia de ingredientes sem necessidade; esses sistemas mudam o escopo.

## 13 Reputação estrelas e movimento

**Referência:** qualidade do atendimento e incidentes afetam reputação; maior avaliação atrai movimento. Há registros de objetivos que concedem estrelas temporárias adicionais. [14]

**Aplicação proposta:** separar três medidas: nível permanente do café, reputação operacional e bônus temporários. Uma queda de atendimento não deve apagar níveis ou desbloqueios permanentes.

- Aumentar satisfação por atendimento concluído dentro da paciência.
- Reduzir por falta de assento, comida, demora ou ataques.
- Usar média suavizada ou janela de atendimentos para evitar oscilações extremas a cada cliente.
- Definir reputação-base numa escala visível, por exemplo de 0 a 5, e representar estrelas temporárias separadamente.
- Limitar movimento por capacidade de simulação; reputação elevada não autoriza criar entidades sem limite.
- Fazer visitantes especiais exigirem condições configuradas de nível e reputação.
- Mostrar a causa recente da variação: “clientes sem comida”, “serviço rápido”, “surto no salão”.

**Aceite:** bom atendimento melhora o movimento; incidentes reduzem confiança; o jogador entende o motivo da mudança e consegue recuperar a avaliação.

## 14 Progressão do café loja e equipamentos

**Referência:** a loja reúne utilidades, decoração, expansões e equipamentos com benefícios ou receitas associadas. [15]

**Aplicação proposta:** criar uma tabela de níveis e desbloqueios. Cozinhar e objetivos podem conceder XP; qualquer XP de compras precisa de proteção contra ciclos de comprar, vender e recomprar.

- Desbloquear aos poucos receitas, perfis de clientes, equipamentos, capacidade e alvos de invasão.
- Exibir a próxima recompensa de nível e os requisitos de expansão.
- Separar efeito cosmético de efeito funcional em cada descrição de item.
- Fornos especiais podem habilitar famílias de pratos; pias e balcões devem manter sua função básica mesmo quando variam visualmente.
- Bônus de móveis precisam indicar alcance, duração e se acumulam. Um item guardado não concede bônus de objeto colocado, salvo regra explícita.
- Compras exigem saldo, desbloqueio e destino válido. Guardar e recolocar não concede XP de compra novamente.
- Expansões mudam área útil; aumento de equipe e de estoque deve ter regra própria.

**Aceite:** desbloqueios são aplicados uma única vez; itens não dão efeitos ocultos; a expansão melhora possibilidades de layout e não só o tamanho da imagem.

## 15 Invasões de cafés rivais

**Referência:** invasões permitem comandar zumbis contra funcionários e chefes, selecionar alvos e recuar. Energia funciona como resistência; a derrota de um zumbi exige reanimação. [9][16]

**Aplicação proposta:** antes de entrar, mostrar café alvo, dificuldade, equipe, energia disponível e recompensas possíveis. Usar as mesmas instâncias de funcionários que trabalham no restaurante.

1. Selecionar a equipe e retirá-la das funções do café.
2. Carregar layout inimigo com entrada, obstáculos, defensores, chefe e comida.
3. Permitir entrada e comando de alvo por personagem; oferecer ataque automático simples.
4. Processar deslocamento, alcance, intervalo entre ataques, dano e troca de alvo.
5. Resolver vitória, retirada ou derrota; registrar energia e estado de cada participante.
6. Entregar recompensas e retornar ao café sem restaurar gratuitamente toda a equipe.

Funcionários inimigos combatem; clientes podem fugir. O desenho da cozinha deve importar para aproximação e concentração de ataques. Não substituir a invasão inteira por uma barra que termina com loot, se a meta é preservar a experiência.

**Aceite:** o jogador consegue mudar o desfecho com seleção de equipe, alvo e retirada; unidades cansadas entram cansadas; perder uma invasão não apaga definitivamente a coleção.

## 16 Saque reanimação e divergências entre versões

**Referência:** um guia de 2011 descreve roubar comida antes de derrotar o chefe; outras descrições condicionam a receita à vitória. Tempos de reanimação também divergem entre registros: há menções a 8, 2 e 1 hora. Não há base para impor um desses valores a todas as versões. [4][6][9][16]

**Decisão proposta para começar:** vitória contra o chefe concede o lote de comida e a recompensa principal. Retirada conserva apenas recompensas parciais explicitamente registradas. Manter o roubo antecipado como opção de compatibilidade desativada até escolher e verificar uma versão de referência.

- Configurar tempo de reanimação e energia ao retornar. Não tratar derrota como recuperação completa.
- Separar reanimar de descansar: terminar o temporizador torna a unidade utilizável, mas ela ainda pode precisar recuperar energia.
- Toxin pode acelerar recuperação conforme uma tabela explícita.
- Associar recompensas à invasão por um identificador único; repetir a resposta ou reabrir a tela não entrega outra cópia.
- Definir espera de cada alvo em dados. Nenhum tempo de retorno específico é afirmado aqui como universal do original.
- Incluir cafés com receitas e perfis próprios para que escolher um alvo tenha propósito.

**Aceite:** abandonar e reconectar não duplica saque; reanimação sobrevive ao fechamento; a política de vitória e retirada é a mesma na interface e na lógica.

## 17 Objetivos tutorial e retorno diário

**Referência:** existem registros de avaliações com tarefas e estrelas temporárias, além do bônus Frequent Fryer ligado à atividade de cozinhar online. [14][17]

**Aplicação proposta:** criar objetivos que ensinem os sistemas: cozinhar um lote; abastecer balcão; servir clientes; descansar um empregado; infectar um visitante; reorganizar uma mesa; vencer uma invasão; estudar uma receita obtida.

O tutorial deve acontecer no próprio café. Cada passo observa uma ação real; fechar uma janela não pode marcar uma tarefa como concluída. Salvar o passo atual e permitir retomar depois.

Para críticas temporárias, selecionar tarefas compatíveis com os sistemas já disponíveis. Uma tarefa social não deve bloquear quem ainda não tem amigos. Mostrar a duração do bônus e o que falta para obtê-lo.

Para retorno diário, escolher explicitamente o gatilho: login ou cozinhar no dia. Se a intenção for fidelidade ao Frequent Fryer, não trocar silenciosamente o gatilho por abrir o jogo. O tamanho da sequência e suas recompensas são parâmetros a verificar, não números assumidos neste documento.

**Aceite:** objetivo só conta uma vez por evento; recompensas não podem ser repetidas por recarregar; o tutorial deixa uma operação mínima funcional e explica o risco da energia baixa.

## 18 Amigos franquias e interação social

**Referência:** o componente social incluía visitar cafés, receber valores ligados a amigos, encomendar comida e compartilhar acesso a receitas. [18]

**Aplicação proposta para uma etapa posterior:**

- Adicionar amigos por identidade do próprio jogo e visitar uma representação do café deles.
- Mostrar livro conhecido e permitir encomendas dentro de limites.
- Criar um pedido com remetente, destinatário, receita, prazo e estado.
- Cozinhar, entregar e receber por transações únicas; guardar a comida na geladeira do destinatário.
- Registrar coleta de benefício por amigo e período para evitar recebimentos repetidos.
- Diferenciar visita, cooperação e invasão; visitar não implica causar perdas ao outro jogador.
- Caso queira PvP, defini-lo como módulo separado: defesa, perdas, proteção e sincronização. Esses detalhes precisam de validação da edição escolhida.

Uma primeira versão com cafés NPC pode validar o núcleo. Para reproduzir a camada social histórica, a cooperação precisa ser implementada posteriormente; uma lista de amigos sem pedidos nem visitas não a substitui.

**Aceite:** pedido entregue desaparece da fila correta e chega uma vez ao destinatário; receber a mesma mensagem de rede duas vezes não duplica comida.

## 19 Conteúdo avançado e diferenças de edição

Recursos documentados em catálogos posteriores incluem pets, itens especiais que alteram atributos e receitas com efeitos incomuns. Há também sistemas japoneses de sacrifício e combinação de zumbis. Isso não significa que tudo existia na versão clássica inicial. [12][13][15][19]

| Recurso | Tratamento recomendado |
| --- | --- |
| Pets com funções ou bônus | Conteúdo posterior, após validar equipe e economia |
| Lápides e bônus temporários | Implementar com duração e regras de acúmulo |
| Pratos com efeito especial | Sistema genérico de efeito ao concluir ou servir |
| Eventos e cafés temáticos | Conteúdo adicional sobre invasões já funcionais |
| Gacha e fusão por sacrifício | Módulo de edição específica, fora do núcleo clássico |
| Maestria de receitas | Proposta própria ou de mod, não tratada como requisito clássico |
| Clãs ranking e passe de temporada | Expansões opcionais, não necessários à identidade |

Manter um campo de origem em cada recurso: clássico verificado; atualização; japonês; mod; proposta própria. Não utilizar estatísticas de um projeto Revival para afirmar o balanceamento do jogo original.

**Aceite:** o catálogo explica de qual escopo cada recurso faz parte; é possível desativar módulos opcionais sem quebrar cozinha, atendimento ou invasões.

## 20 Navegador salvamento e desempenho

**Aplicação proposta:** o jogo funciona no navegador, com simulação durante a sessão ativa. Ao encerrar, desconectar ou suspender a sessão, salvar o estado e pausar os processos da simulação. Ao retornar, restaurar esse estado sem calcular produção, vendas, recuperação de energia ou incidentes referentes ao período de ausência.

- Salvar lotes, porções, tarefas relevantes, energia, funcionários, posições, receitas, moedas, objetivos e invasão ativa.
- Preservar progresso e durações restantes de preparo, deterioração, descanso e reanimação. Esses processos avançam pelo tempo efetivamente simulado na sessão ativa.
- Manter o salvamento automático e a recuperação após recarregar a página. Retomar não deve reiniciar processos nem conceder progresso adicional.
- Validar operações econômicas no servidor e resolver reconexões a partir do último estado confirmado. Não reenviar compras, pagamentos ou saques como novas operações.
- Impedir que duas abas executem simultaneamente a mesma partida e dupliquem resultados.
- Separar simulação e renderização. Animações interpolam posições; não decidem dinheiro, energia ou dano.
- Tratar a suspensão de abas sem aplicar grandes saltos de tempo ao retomar a execução.
- Evitar recalcular caminhos de todas as entidades a cada quadro. Recalcular após mudança de alvo ou obstáculo.

Datas de calendário para objetivos diários e validade de eventos podem usar o horário do servidor. Esses prazos não geram produção ou recompensas automáticas durante a ausência.

**Aceite:** recarregar preserva a partida; fechar e reabrir não gera ganhos nem perdas pelo intervalo decorrido; reconectar não duplica operações; abas concorrentes não executam duas simulações da mesma partida.

## 21 Interface animações e assets necessários

**Aplicação proposta alinhada à direção visual desejada:** câmera isométrica fixa e afastada, cenário legível, personagens pequenos, formas simples e humor de terror cartunesco. O ângulo deve ser calibrado com as referências visuais escolhidas; não assumir um valor numérico sem comparação.

- Tela principal: dinheiro, Toxin, nível, XP, reputação e alertas prioritários, deixando o café ocupar a maior área.
- Acessos: livro de receitas, equipe, loja e construção, geladeira, mapa de invasões, objetivos e amigos.
- Ficha de funcionário: função, energia, atributos, nível, descansar e recuperar.
- Ficha de visitante: atributos previstos, custo e infectar.
- Fogão: receita, progresso, cozinheiro, prazo de deterioração e servir.
- Invasão: equipe, barras, seleção de alvo e retirada sempre acessível.

Assets mínimos por personagem: parado, andando nas quatro direções de deslocamento, cozinhando, carregando prato, limpando, descansando, distraído, atacando, atingido e caído. A pose base pode manter mãos vazias; prato, utensílio e outros objetos de tarefa entram como camadas de animação.

Para móveis: visual, área ocupada e pontos de interação precisam coincidir. Prato pronto, fogão ocupado, balcão vazio e mesa suja devem ser distinguíveis sem abrir menus. Usar ordenação visual por profundidade para personagens passarem corretamente atrás de mesas e paredes.

**Aceite:** o jogador entende o estado do café olhando a cena; celular permite selecionar unidades pequenas sem clicar sempre no objeto errado.

## 22 Dados essenciais e regras de integridade

Esta é uma proposta de organização, não uma descrição do código original.

| Registro | Dados mínimos |
| --- | --- |
| Café | nível, XP, reputação, moedas, área, horários, capacidade |
| Móvel colocado | ID, tipo, posição, rotação, pontos de interação |
| Receita | custo, tempo, porções, preço, XP, requisitos, variante |
| Lote | ID, receita, progresso, prazos, quantidade, localização |
| Funcionário | ID, tipo, nível, XP, energia, função, estado, alvo |
| Cliente | ID, perfil, estado, assento, paciência, pagamento |
| Tarefa | responsável, alvo, reservas, estado, início e fim |
| Invasão | ID, alvo, participantes, resultado, saque concedido |
| Objetivo | condição, progresso, prazo, recompensa recebida |
| Pedido social | partes, lote, estado, entrega confirmada |

Regras obrigatórias: dinheiro e porções nunca negativos; uma unidade pertence a um local e função por vez; recompensa entregue uma vez; cliente paga uma vez; receita conhecida é permanente; bônus tem origem e prazo; salvar e carregar preserva essas relações.

Não guardar apenas a aparência da cena. O salvamento precisa representar decisões econômicas e tarefas. Recursos em trânsito devem continuar rastreáveis.

## 23 Ordem de implementação e conteúdo inicial

Todas as quantidades abaixo são propostas de escopo para validar o jogo, não números do original.

| Etapa | Entrega jogável | Critério de saída |
| --- | --- | --- |
| 1 Café mínimo | grade, chef, 4 lugares, cozinha, balcão, pia, clientes | 20 atendimentos completos sem travar |
| 2 Equipe | infecção, 6 perfis, atributos, energia, descanso, surto | equipe altera operação e incidentes funcionam |
| 3 Progressão | 12 receitas, loja, 2 expansões, 10 níveis iniciais | ciclo de ganho e gasto permite avançar |
| 4 Invasões | 3 cafés NPC, chefe, retirada, derrota, saque, geladeira | recompensa gera nova opção no café |
| 5 Persistência | salvamento, retomada, reconexão, tutorial | nenhuma duplicação nos cenários críticos |
| 6 Conteúdo e social | variantes, reserva, chefs, pedidos, críticas | sistemas novos usam a base existente |

Persistir dados básicos desde a primeira etapa; a etapa 5 aprofunda robustez, salvamento e reconexão no navegador. Não deixar todo o salvamento para o final.

Não começar por centenas de personagens ou receitas. Primeiro provar que 6 funcionários têm funções diferentes e que 12 pratos geram escolhas. Depois ampliar dados e arte sem reescrever a simulação.

## 24 Checklist de conclusão

- O café consegue cozinhar, servir, cobrar, limpar e reutilizar mesas repetidamente.
- Comida é finita e seu percurso pode ser auditado do fogão à venda ou descarte.
- Layout ruim reduz eficiência e caminhos impossíveis são detectados.
- Clientes podem ser inspecionados e recrutados sem duplicação.
- Atributos mudam resultados; energia liga serviço e combate.
- Descanso recupera; baixa energia gera distração ou risco; surtos afetam clientes e reputação.
- Nível, reputação e bônus temporários são conceitos distintos.
- Invasão usa a mesma equipe, permite retirada e tem perdas temporárias reais.
- Saque alimenta estoque ou conhecimento; equipamentos condicionam receitas.
- Reanimação, preparo e deterioração preservam o tempo restante ao fechar e retomam na sessão ativa.
- O jogo não cria dinheiro, porções ou recompensas por reabrir uma tela.
- O tutorial termina com uma operação funcional e a progressão tem saída para falta de recursos.
- O café permanece legível no celular, sem depender de janelas enormes ou texto minúsculo.
- Cada sistema está identificado como referência documentada, diferença de versão ou decisão própria.

## 25 Fontes e limites da pesquisa

Consulta em 11 de novembro de 2026. Fontes da Capcom fundamentam o conceito original; guias e wikis comunitários detalham comportamento, mas podem misturar atualizações. Alguns conteúdos de wiki foram acessíveis por trechos indexados. Valores exatos e limites exigem validação na edição escolhida. A adaptação para navegador segue a política de sessão ativa da seção 20.

[1] Capcom, anúncio de lançamento de Zombie Café, 27 de janeiro de 2011. https://news.capcomusa.com/lets/browse/zombie-cafe-launches-for-iphone-ipad-and-ipod-touch

[2] Zombie Cafe Wiki, Restaurant Design. https://zombiecafe.wikidot.com/restaurant-design

[3] Zombie Cafe Wiki, Customers. https://zombiecafe.fandom.com/wiki/Customers

[4] Zombie Cafe Wiki, Game AI. https://zombiecafe.wikidot.com/game-ai

[5] Zombie Cafe Wiki, Cooking. https://zombiecafe.wikidot.com/cooking

[6] Zombie Cafe Wiki, Dishes. https://zombiecafe.fandom.com/wiki/Dishes

[7] Zombie Cafe Wiki, Recipe. https://zombiecafe.fandom.com/wiki/Recipe

[8] Zombie Cafe Wiki, Picking Your Staff. https://zombiecafe.wikidot.com/picking-your-staff

[9] Zombie Cafe Wiki, Energy level. https://zombiecafe.fandom.com/wiki/Energy_level

[10] Zombie Cafe Wiki, Chef. https://zombiecafe.fandom.com/wiki/Chef

[11] Pocket Gamer, atualização 1.0.6, 27 de maio de 2011. https://www.pocketgamer.com/zombie-cafe/capcoms-freemium-zombie-cafe-updated-with-undead-xp-premium-chef-heads/

[12] Zombie Cafe Wiki, Meat Locker. https://zombiecafe.fandom.com/wiki/Meat_Locker

[13] Zombie Cafe Wiki, Pets. https://zombiecafe.fandom.com/wiki/Pets

[14] Zombie Cafe, síntese histórica de reputação e avaliações. https://en.wikipedia.org/wiki/Zombie_Cafe

[15] Zombie Cafe Wiki, Store. https://zombiecafe.fandom.com/wiki/Store

[16] Zombie Cafe Wiki, Attacking, guia de 2011. https://zombiecafe.wikidot.com/attacking

[17] Descrição histórica do aplicativo preservada no TouchArcade. https://toucharcade.com/games/zombie-cafe

[18] Zombie Cafe Wiki, Friends. https://zombiecafe.wikidot.com/friends

[19] Zombie Cafe Wiki, Tiki Cookbook, exemplos de pratos especiais. https://zombiecafe.fandom.com/wiki/Tiki_Cookbook

## 26 Prompt de implementação

O texto a seguir também é fornecido em arquivo separado para copiar. Anexe este documento ao agente para que ele tenha as regras detalhadas e as fontes.

PROMPT PARA IMPLEMENTAR UM JOGO INSPIRADO EM ZOMBIE CAFÉ

Use o documento “Mecânicas para um jogo inspirado em Zombie Café” como especificação funcional. Quero reproduzir a experiência do Zombie Café clássico internacional: administrar um café, infectar clientes para formar a equipe, equilibrar trabalho e descanso, invadir concorrentes e trazer receitas para melhorar o próprio negócio.

CONTEXTO E OBJETIVO

O jogo será executado no navegador. A simulação avança somente durante a sessão ativa. Ao encerrar, desconectar ou suspender a sessão, salve e pause o estado; ao retornar, restaure sem calcular progresso ou incidentes pelo período de ausência. Trabalhe sobre o projeto existente. Primeiro leia as instruções do repositório e examine somente os módulos relevantes para entender o que já existe. Preserve sistemas funcionais e reutilize o renderer, assets, controles e persistência disponíveis. Não recomece o projeto sem uma necessidade concreta.

Quero implementação funcional, não apenas um plano, uma maquete ou uma lista de botões. A conexão entre os sistemas é o objetivo: comida produzida abastece clientes; clientes geram recursos e candidatos à infecção; funcionários trabalham e se cansam; invasões usam essa mesma equipe; o saque amplia o cardápio e a progressão.

Use as referências visuais fornecidas para manter câmera isométrica fixa e afastada, formas simples, personagens pequenos, leitura clara e humor de terror cartunesco. Não aumente o detalhamento visual a ponto de comprometer a leitura ou o desempenho. Personagens base têm mãos vazias; pratos e utensílios pertencem às animações de tarefa.

FIDELIDADE E DECISÕES

Separe claramente mecânicas documentadas do original, diferenças entre versões e decisões próprias. Não trate conteúdo japonês, mods Revival, gacha, fusão, clãs ou maestria de receitas como parte obrigatória do núcleo clássico. Não invente percentuais históricos, tempo de reanimação ou fórmula de gorjeta.

Onde houver lacunas, use uma configuração explícita e registre a decisão. Para começar, adote vitória contra o chefe como condição do saque principal; mantenha roubo antes da vitória como opção de compatibilidade desativada. Guardar um funcionário na reserva congela sua energia; descanso acontece em estado próprio. O chef principal não sofre desgaste normal de trabalho no café. Esses comportamentos devem permanecer configuráveis quando houver diferenças de edição.

SISTEMAS OBRIGATÓRIOS

1. Café em grade com posicionamento, rotação, ocupação, pontos de interação, expansão e validação de caminhos. Mesas e cadeiras precisam formar assentos utilizáveis. Distância até balcão e pia deve afetar o tempo de serviço.

2. Clientes com ciclo completo: entrar, reservar lugar, caminhar, sentar, esperar, comer, pagar, avaliar e sair. Implementar falta de lugar, falta de comida, paciência e fuga por pânico. Não criar pedidos individuais complexos sem necessidade.

3. Atendimento e limpeza por tarefas: reservar uma porção, buscá-la, entregá-la, recolher louça, levar à pia e liberar mesa. Impedir duas reservas para o mesmo recurso. Dar destino explícito a comida em trânsito quando houver cancelamento.

4. Cozinha em lotes, com custo, duração, XP, quantidade, preço de venda, nível e equipamento exigido. Exigir cozinheiro atribuído. Implementar pausa, conclusão, transferência e deterioração. Não transformar produção automaticamente em dinheiro.

5. Balcões com porções finitas, geladeira com lotes e livro com conhecimento permanente. Conhecer uma receita, possuir comida e ter requisitos para prepará-la são estados distintos. Definir e mostrar se estudar um lote consome a comida.

6. Infecção de clientes com inspeção prévia, custo, limite de equipe e transformação visual. A operação deve cobrar e criar exatamente um funcionário. Tipos de personagem e instâncias recrutadas devem ser separados.

7. Funcionários com energia, velocidade, gorjetas, força, desgaste, recuperação e tolerância à fome. Criar perfis úteis em situações diferentes. A mesma unidade deve escolher entre cozinhar, atender, descansar, ficar na reserva ou invadir.

8. Energia compartilhada entre trabalho e resistência em combate. Implementar alertas, descanso, distração e risco de ataque a clientes em baixa energia. O incidente deve causar fuga, perda de pagamentos pendentes e queda de reputação. Não atacar a cada frame nem recuperar energia infinita.

9. Chef principal, XP individual de zumbis, nível do café, limite ativo e reserva. Guardar preserva identidade e progresso. Derrota não elimina definitivamente um personagem.

10. Economia com dinheiro e Toxin. Toda entrada ou gasto precisa ter um evento identificável. Gorjeta é separada do preço da refeição. Receitas precisam ter utilidades diferentes; nenhuma deve dominar todos os atributos. Não integrar dinheiro real nesta implementação inicial.

11. Reputação operacional separada de nível permanente e de bônus temporário. Atendimento e incidentes alteram reputação; reputação altera movimento e elegibilidade de visitantes. Mostrar as causas da mudança e limitar entidades simultâneas.

12. Loja, expansão, equipamentos e desbloqueios. Distinguir cosméticos de benefícios funcionais. Guardar e recolocar móveis não concede XP de compra nem duplica bônus.

13. Invasões jogáveis em cafés rivais com a própria equipe, caminhos, defensores, chefe, seleção de alvo, ataques automáticos, retirada, vitória, derrota e reanimação. Energia inicial deve ser a energia real do funcionário. A cena não pode ser somente um temporizador que entrega loot.

14. Saque que fornece lotes e oportunidades de descoberta. Recompensa concedida uma vez por invasão. Reanimar não significa necessariamente recuperar toda a energia. Reiniciar o jogo não pode cancelar consequências.

15. Objetivos e tutorial que observem eventos reais. Ensinar cozinha, atendimento, descanso, infecção e invasão. Recompensas e estrelas temporárias têm regras e validade explícitas.

16. Persistência desde a primeira etapa. Salvar posições, moedas, porções, receitas, unidades, energia, tarefas relevantes, horários, objetivos e invasões. Preservar progresso e tempos restantes de preparo, deterioração, descanso e reanimação. Retomar a sessão sem conceder avanços pelo intervalo decorrido. Validar o estado no servidor, impedir simulação duplicada em duas abas e tratar suspensão de abas sem saltos de tempo.

IMPLEMENTAÇÃO E PRIORIDADES

Comece entregando um café mínimo com chef, quatro lugares, um fogão, um balcão, uma pia, três receitas e clientes funcionais. Prove o ciclo completo de produção, venda e limpeza. Depois adicione equipe e energia; em seguida progressão; depois invasões; então aprofundamento de salvamento, reconexão, conteúdo e social.

Use como meta inicial de conteúdo, não como números históricos: seis perfis de funcionário, doze receitas, duas expansões, dez níveis e três cafés NPC. Amplie após validar o ciclo. Variantes de receitas, outros chefs, reserva completa, críticas e pedidos entre amigos entram em etapas posteriores identificadas, sem serem esquecidos.

Para a camada social posterior, implemente visitas, encomendas de comida, entregas e descoberta de receitas compartilhadas. Não crie botões vazios para aparentar conclusão. PvP, pets e eventos avançados são módulos separados.

Separe simulação, dados, apresentação e persistência. Valores de balanceamento devem ficar em configuração. Reutilize a tecnologia do projeto; não migre de engine por preferência pessoal. A renderização não deve determinar dano, dinheiro ou energia. Evite consultas de caminho para todas as entidades a cada frame.

VERIFICAÇÃO OBRIGATÓRIA

Execute cenários que comprovem: vinte atendimentos completos; mesa bloqueada; falta de comida; troca de tarefa com prato em trânsito; infecção acionada duas vezes; funcionário exausto; descanso; surto; lote pronto que estraga; invasão ganha; retirada; derrota e reanimação; recarga durante preparo; recarga após recompensa; reabertura com o mesmo estado salvo; desconexão e retomada; suspensão de aba sem saltos de tempo; duas abas concorrentes sem duplicação.

Assegure que moedas e porções nunca ficam negativas; cada recurso existe em um único local; cliente paga uma vez; recompensa é recebida uma vez; ninguém ocupa duas funções ou dois lugares ao mesmo tempo. Se houver servidor, operações econômicas devem ser validadas ali.

ENTREGA E CONTINUIDADE

Antes de alterar, faça um inventário curto de implementado, parcial e ausente. Depois avance na primeira etapa incompleta sem parar somente no planejamento. Use decisões reversíveis quando faltar um detalhe; pergunte apenas quando houver bloqueio real que não possa ser resolvido pelo código e pelas referências.

Ao concluir uma etapa, informe o que ficou jogável, como foi verificado, quais valores são propostos e o que ainda falta. Registre o próximo passo no projeto para outra sessão continuar sem reler tudo. Não declare fidelidade total ou conclusão de sistemas ainda não testados.
