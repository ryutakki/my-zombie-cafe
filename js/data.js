// Static game data: recipes, furniture themes, decorations, floors, walls, units, raids.
window.ZC = window.ZC || {};
(() => {
  const ZC = window.ZC;
  ZC.TW = 96;          // iso tile width
  ZC.TH = 48;          // iso tile height
  ZC.WALL_H = 132;     // back wall height in px
  ZC.ACTOR_SCALE = 0.6;

  // ---------- recipes (cookbook) ----------
  // time in seconds, price per serving
  ZC.RECIPES = {
    ensopado: { name: 'Ensopado de Rato', cost: 5, time: 20, servings: 6, price: 4, xp: 1, lvl: 1, desc: 'Sopa rala com pedaços suspeitos.' },
    grogue: { name: 'Grogue Verde', cost: 20, time: 60, servings: 14, price: 5, xp: 3, lvl: 1, desc: 'Bebida borbulhante dos piratas.' },
    espeto: { name: 'Espetinho de Dedos', cost: 40, time: 120, servings: 22, price: 6, xp: 5, lvl: 2, desc: 'Crocante por fora, macio por dentro.' },
    torta: { name: 'Torta de Miolos', cost: 60, time: 180, servings: 30, price: 7, xp: 8, lvl: 2, desc: 'Receita da vovó zumbi.' },
    sopa_olho: { name: 'Sopa de Olhos', cost: 90, time: 300, servings: 40, price: 8, xp: 12, lvl: 3, desc: 'Eles ficam te olhando enquanto você come.' },
    polvo: { name: 'Polvo Assado', cost: 150, time: 480, servings: 55, price: 9, xp: 18, lvl: 4, desc: 'Direto do navio fantasma.' },
    hamburguer: { name: 'Hambúrguer Podre', cost: 220, time: 720, servings: 75, price: 10, xp: 26, lvl: 5, desc: 'Maturado por três semanas.' },
    pizza: { name: 'Pizza de Vísceras', cost: 320, time: 960, servings: 95, price: 11, xp: 34, lvl: 6, desc: 'Borda recheada de algo.' },
    bolo: { name: 'Bolo de Cérebro', cost: 450, time: 1500, servings: 130, price: 12, xp: 50, lvl: 7, desc: 'Com velinhas e tudo.' },
    banquete: { name: 'Banquete do Capitão', cost: 700, time: 2400, servings: 190, price: 14, xp: 80, lvl: 8, desc: 'Um assado digno de um capitão.' },
  };
  // mastery: cook a recipe again and again to earn stars; every star pays +15% per serving
  ZC.MASTERY = [1, 5, 15, 40, 100];
  ZC.masteryCount = rid => (ZC.state && ZC.state.mastery && ZC.state.mastery[rid]) || 0;
  ZC.masteryStars = rid => ZC.MASTERY.filter(n => ZC.masteryCount(rid) >= n).length;
  ZC.priceOf = rid => Math.max(1, Math.round(ZC.RECIPES[rid].price * (1 + 0.15 * ZC.masteryStars(rid))));
  ZC.spoilTime = r => Math.max(180, r.time * 2);

  // ---------- furniture themes: each has table, chair, stove, fridge, sink and counter ----------
  ZC.THEMES = [
    { id: 'wood', name: 'Rústico', adj: ['Rústico', 'Rústica'], lvl: 1, pal: { base: '#a8683a', dark: '#6b3d22', light: '#d4955a', trim: '#3f2415', accent: '#e0b36a' } },
    { id: 'stone', name: 'de Pedra', adj: ['de Pedra', 'de Pedra'], lvl: 2, pal: { base: '#8a8f9c', dark: '#5a5f6e', light: '#b5bac6', trim: '#2f3340', accent: '#c9ced9' } },
    { id: 'toxic', name: 'Tóxico', adj: ['Tóxico', 'Tóxica'], lvl: 3, pal: { base: '#5ca83a', dark: '#2f6a22', light: '#9ee060', trim: '#183a14', accent: '#d6ff7a' } },
    { id: 'bone', name: 'de Ossos', adj: ['de Ossos', 'de Ossos'], lvl: 5, pal: { base: '#e2d4b2', dark: '#a8987a', light: '#fff6dc', trim: '#4a3e2c', accent: '#8a7a5a' } },
    { id: 'royal', name: 'Real', adj: ['Real', 'Real'], lvl: 7, pal: { base: '#7a3aa8', dark: '#4a2070', light: '#b070e0', trim: '#24103a', accent: '#ffd84a' } },
  ];
  const CATS = {
    table: { n: 'Mesa', g: 1, base: 40, hh: 46, desc: 'Clientes comem aqui. Precisa de cadeiras ao lado.' },
    chair: { n: 'Cadeira', g: 1, base: 25, hh: 46, desc: 'Coloque ao lado de uma mesa.' },
    stove: { n: 'Fogão', g: 0, base: 120, hh: 80, desc: 'Um zumbi cozinha aqui.' },
    fridge: { n: 'Geladeira', g: 1, base: 100, hh: 106, desc: 'Zumbis buscam ingredientes aqui.' },
    sink: { n: 'Pia', g: 1, base: 80, hh: 62, desc: 'Zumbis lavam os pratos sujos aqui.' },
    counter: { n: 'Balcão', g: 0, base: 80, hh: 58, desc: 'Guarda as porções prontas.' },
  };
  const MULT = [1, 2.2, 4, 7, 12];
  ZC.CATS = CATS;
  ZC.ITEMS = {};
  ZC.THEMES.forEach((th, i) => {
    for (const [cat, c] of Object.entries(CATS)) {
      ZC.ITEMS[`${cat}_${th.id}`] = {
        name: `${c.n} ${th.adj[c.g]}`, cat, theme: th.id, tier: i + 1,
        price: Math.round(c.base * MULT[i] / 5) * 5, rating: i * 0.5, lvl: th.lvl, hh: c.hh,
        desc: c.desc + (i ? ` +${i * 0.5} avaliação` : ''),
      };
    }
  });

  // ---------- decorations ----------
  // [id, name, price, rating, level, hit height, flat?]
  const DECOR = [
    ['barrel', 'Barril de Rum', 35, 1, 1, 52], ['plant', 'Planta Carnívora', 70, 2, 1, 80],
    ['lamp', 'Lampião de Caveira', 150, 4, 2, 110], ['chest', 'Baú do Tesouro', 400, 8, 3, 56],
    ['crate', 'Caixote', 30, 1, 1, 44], ['pumpkin', 'Abóbora Assombrada', 40, 1, 1, 40],
    ['candle', 'Caveira com Vela', 55, 2, 1, 56], ['flowers', 'Vaso de Flores Murchas', 45, 1, 1, 56],
    ['tomb', 'Lápide', 90, 2, 1, 70], ['rug_red', 'Tapete Vermelho', 60, 1, 1, 0, 1],
    ['skeleton', 'Esqueleto Sentado', 120, 3, 2, 70], ['potion', 'Caldeirão de Poção', 180, 3, 2, 60],
    ['anchor', 'Âncora de Navio', 130, 3, 2, 90], ['candelabra', 'Candelabro', 160, 3, 2, 96],
    ['flag', 'Bandeira Pirata', 140, 3, 2, 140], ['deadtree', 'Árvore Morta', 100, 2, 2, 130],
    ['rug_green', 'Tapete Pantanoso', 90, 2, 2, 0, 1], ['statue', 'Estátua de Zumbi', 300, 5, 3, 110],
    ['painting', 'Quadro Assombrado', 200, 4, 3, 112], ['bookshelf', 'Estante de Livros', 260, 5, 3, 124],
    ['wheel', 'Leme de Navio', 220, 4, 3, 96], ['alchemy', 'Mesa de Alquimia', 240, 4, 3, 74],
    ['globe', 'Globo Antigo', 190, 3, 3, 84], ['gramophone', 'Gramofone', 210, 4, 3, 76],
    ['coffin', 'Caixão em Pé', 280, 5, 4, 118], ['tank', 'Aquário de Poção', 350, 6, 4, 104],
    ['cannon', 'Canhão', 320, 6, 4, 66], ['armchair', 'Poltrona Real', 380, 6, 5, 80],
    ['fountain', 'Fonte de Slime', 600, 10, 6, 86],
    ['cogumelos', 'Cogumelos do Pântano', 65, 2, 1, 70], ['cogumelo_gigante', 'Cogumelo Gigante', 140, 3, 2, 130],
    ['tronco', 'Tronco Mofado', 80, 2, 1, 70], ['toco', 'Toco de Árvore', 50, 1, 1, 60],
    ['pedra_musgo', 'Pedra Musgosa', 45, 1, 1, 50], ['broto', 'Brotos Enrolados', 55, 2, 1, 80],
    ['palmeira', 'Palmeira Anã', 170, 3, 2, 125], ['pinheiro', 'Pinheiro Sombrio', 190, 4, 3, 130],
  ];
  const DESC = { rug_red: 'Passam por cima.', rug_green: 'Passam por cima.' };
  for (const [id, name, price, rating, lvl, hh, flat] of DECOR) {
    ZC.ITEMS[id] = { name, cat: 'decor', price, rating, lvl, hh, flat: !!flat, desc: (DESC[id] || '') + ` +${rating} avaliação` };
  }

  // ---------- floors and walls ----------
  ZC.FLOORS = [
    { id: 'tabuas', name: 'Tábuas Rústicas', price: 0, lvl: 1 },
    { id: 'xadrez', name: 'Xadrez Antigo', price: 150, lvl: 2 },
    { id: 'pedra', name: 'Lajes de Pedra', price: 300, lvl: 3 },
    { id: 'musgo', name: 'Laje Tóxica', price: 500, lvl: 4 },
    { id: 'carpete', name: 'Carpete Real', price: 800, lvl: 6 },
  ];
  ZC.WALLS = [
    { id: 'tijolo', name: 'Tijolo Velho', price: 0, lvl: 1 },
    { id: 'tabuas', name: 'Tábuas Escuras', price: 150, lvl: 2 },
    { id: 'pedra', name: 'Pedra Musgosa', price: 300, lvl: 3 },
    { id: 'listras', name: 'Papel Listrado', price: 500, lvl: 4 },
    { id: 'cripta', name: 'Cripta Roxa', price: 800, lvl: 6 },
  ];

  // ---------- units ----------
  ZC.UNITS = {
    pirate_zombie: { name: 'Pirata Zumbi', hp: 70, atk: 9, speed: 1.0 },
    squidman: { name: 'Homem-Lula', hp: 110, atk: 13, speed: 0.95 },
    robber: { name: 'Ladrão', hp: 45, atk: 6, speed: 1.1 },
    thug: { name: 'Brutamontes', hp: 85, atk: 9, speed: 0.9 },
    assassin: { name: 'Assassino', hp: 55, atk: 13, speed: 1.3 },
    pirate_leader: { name: 'Capitão', hp: 130, atk: 18, speed: 1.0 },
  };
  ZC.HUMANS = ['robber', 'thug', 'assassin'];
  ZC.unitName = (sprite, tint) => tint ? ZC.UNITS[sprite].name + ' Zumbi' : ZC.UNITS[sprite].name;
  ZC.ZOMBIE_NAMES = ['Bob Podre', 'Zé Caveira', 'Tonho Tripa', 'Dente-Solto', 'Barba Verde', 'Olho Mole',
    'Mofo', 'Chico Fedido', 'Lula Molenga', 'Bafo de Peixe', 'Costela', 'Gengiva', 'Rabugento', 'Unha Preta'];

  ZC.HIRE = [
    { sprite: 'pirate_zombie', coins: 200, toxin: 0, desc: 'Trabalhador comum.' },
    { sprite: 'squidman', coins: 0, toxin: 4, desc: 'Mais vida e força nas invasões.' },
  ];

  // enemy cafés: lvl = the level they match. Enemies of the same level hit 20% softer than your zombies.
  // xp comes from the xp curve so that raids are a main source of progress.
  ZC.RAIDS = [
    { id: 'beco', name: 'Beco dos Ladrões', sign: 'BECO', lvl: 1, enemies: ['robber', 'robber'], coins: [40, 70], toxin: 1 },
    { id: 'taverna', name: 'Taverna dos Brutos', sign: 'TAVERNA', lvl: 2, enemies: ['robber', 'thug'], coins: [90, 140], toxin: 2 },
    { id: 'covil', name: 'Covil das Sombras', sign: 'COVIL', lvl: 3, enemies: ['assassin', 'thug'], coins: [180, 260], toxin: 3 },
    { id: 'navio', name: 'Navio do Capitão', sign: 'NAVIO', lvl: 4, enemies: ['thug', 'robber'], coins: [400, 600], toxin: 4 },
    { id: 'floresta', name: 'Floresta dos Caçadores', sign: 'FLORESTA', lvl: 5, enemies: ['assassin', 'thug', 'robber'], coins: [550, 800], toxin: 5 },
    { id: 'fortaleza', name: 'Fortaleza do Barão', sign: 'FORTALEZA', lvl: 7, enemies: ['thug', 'thug', 'assassin'], coins: [950, 1400], toxin: 6 },
    { id: 'porto', name: 'Porto dos Piratas', sign: 'PORTO', lvl: 9, enemies: ['pirate_leader', 'thug', 'assassin'], coins: [1700, 2500], toxin: 8 },
    { id: 'mansao', name: 'Mansão Mofada', sign: 'MANSÃO', lvl: 10, enemies: ['thug', 'assassin', 'robber', 'thug'], coins: [2200, 3000], toxin: 9 },
    { id: 'cassino', name: 'Cassino Clandestino', sign: 'CASSINO', lvl: 12, enemies: ['assassin', 'thug', 'assassin', 'thug'], coins: [3000, 4200], toxin: 10 },
    { id: 'quartel', name: 'Quartel dos Piratas', sign: 'QUARTEL', lvl: 14, enemies: ['pirate_leader', 'robber', 'assassin', 'thug'], coins: [4200, 5800], toxin: 12 },
    { id: 'castelo', name: 'Castelo do Barão', sign: 'CASTELO', lvl: 15, enemies: ['thug', 'assassin', 'thug', 'assassin', 'robber'], coins: [5500, 7500], toxin: 14 },
    { id: 'ilha', name: 'Ilha dos Corsários', sign: 'ILHA', lvl: 17, enemies: ['pirate_leader', 'assassin', 'thug', 'robber', 'thug'], coins: [7500, 10000], toxin: 16 },
    { id: 'cidadela', name: 'Cidadela Sombria', sign: 'CIDADELA', lvl: 18, enemies: ['pirate_leader', 'thug', 'robber', 'thug', 'assassin', 'robber'], coins: [10000, 13000], toxin: 18 },
    { id: 'trono', name: 'Trono do Rei Pirata', sign: 'TRONO', lvl: 20, enemies: ['pirate_leader', 'thug', 'robber', 'assassin', 'thug', 'robber', 'thug'], coins: [15000, 20000], toxin: 25 },
  ];
  ZC.RAID_COOLDOWN = 90;

  // progression: level 20 is the cap for now; a slow curve (raids and recipes feed it)
  ZC.MAX_LEVEL = 20;
  ZC.xpForLevel = l => Math.round(30 * Math.pow(l, 1.9));
  // how many zombies you may have: 2 at level 1, 3 at 5, 4 at 10, 5 at 15, 6 at 18, 7 at 20
  ZC.maxZombies = l => (l >= 20 ? 7 : l >= 18 ? 6 : l >= 15 ? 5 : l >= 10 ? 4 : l >= 5 ? 3 : 2);
  // there is only one kind of zombie for now: every zombie has the same stats
  ZC.ZOMBIE = { hp: 70, atk: 9, speed: 1.0 };
  for (const tg of ZC.RAIDS) tg.xp = Math.max(10, Math.round(0.22 * ZC.xpForLevel(tg.lvl) / 5) * 5);   // raids are a main source of xp

  // ---------- missions (the main progression) ----------
  // stat: a counter in state.stats, or a "now" getter (level / rating / crew size) that latches once reached
  const NOW = {
    level: () => ZC.state.level,
    rating: () => ZC.rating(),
    crew: () => ZC.state.zombies.length,
    furniture: () => ZC.state.cafe.objects.length,
    size: () => ZC.state.cafe.w,
  };
  ZC.MISSION_NOW = NOW;
  ZC.CHAPTERS = ['Capítulo 1 · Abrindo as portas', 'Capítulo 2 · Fome de sucesso', 'Capítulo 3 · O café cresce', 'Capítulo 4 · Império podre'];
  // [id, chapter, name, description, stat, goal, reward]
  const M = [
    ['cook1', 0, 'Primeira Panela', 'Cozinhe 1 prato.', 'cooked', 1, { coins: 60, xp: 4 }],
    ['serve5', 0, 'Casa Aberta', 'Sirva 5 clientes.', 'served', 5, { coins: 90, xp: 6 }],
    ['wash3', 0, 'Pratos Limpos', 'Lave 3 pratos sujos.', 'washed', 3, { coins: 70, toxin: 1 }],
    ['infect1', 0, 'Sangue Novo', 'Infecte 1 cliente.', 'infected', 1, { coins: 120, toxin: 1 }],
    ['raid1', 0, 'Primeira Invasão', 'Vença 1 invasão.', 'raids', 1, { coins: 180, toxin: 2, xp: 10 }],
    ['cook10', 1, 'Chef Zumbi', 'Cozinhe 10 pratos.', 'cooked', 10, { coins: 220, xp: 12 }],
    ['rate2', 1, 'Café Decente', 'Chegue a 2 estrelas de avaliação.', 'rating', 2, { coins: 260, toxin: 1 }],
    ['crew3', 1, 'Equipe de Cozinha', 'Tenha 3 zumbis.', 'crew', 3, { coins: 300, toxin: 2 }],
    ['eat3', 1, 'Nada se Perde', 'Devore 3 corpos nas invasões.', 'eaten', 3, { coins: 240, toxin: 2 }],
    ['lvl4', 1, 'Subindo na Vida', 'Chegue ao nível 4.', 'level', 4, { coins: 400, toxin: 3 }],
    ['serve50', 2, 'Casa Cheia', 'Sirva 50 clientes.', 'served', 50, { coins: 600, xp: 30 }],
    ['rate3', 2, 'Café Famoso', 'Chegue a 3 estrelas.', 'rating', 3, { coins: 700, toxin: 3 }],
    ['crew4', 2, 'Brigada Podre', 'Tenha 4 zumbis.', 'crew', 4, { coins: 800, toxin: 3 }],
    ['raid5', 2, 'Saqueadores', 'Vença 5 invasões.', 'raids', 5, { coins: 900, toxin: 4, xp: 40 }],
    ['size11', 2, 'Reforma', 'Expanda o café até 11 de largura.', 'size', 11, { coins: 1000, toxin: 3 }],
    ['serve200', 3, 'Fila na Porta', 'Sirva 200 clientes.', 'served', 200, { coins: 2000, xp: 120 }],
    ['rate4', 3, 'Café de Luxo', 'Chegue a 4 estrelas.', 'rating', 4, { coins: 2200, toxin: 6 }],
    ['raid12', 3, 'Terror da Cidade', 'Vença 12 invasões.', 'raids', 12, { coins: 2600, toxin: 8 }],
    ['earn20k', 3, 'Rei da Gordura', 'Ganhe 20.000 moedas no total.', 'earned', 20000, { coins: 3000, toxin: 6 }],
    ['lvl10', 2, 'Dono do Pedaço', 'Chegue ao nível 10.', 'level', 10, { coins: 3000, toxin: 8 }],
    ['crew6', 3, 'Exército Podre', 'Tenha 6 zumbis (nível 18).', 'crew', 6, { coins: 9000, toxin: 14 }],
    ['lvl20', 3, 'Imperador Zumbi', 'Chegue ao nível 20.', 'level', 20, { coins: 20000, toxin: 30 }],
  ];
  ZC.MISSIONS = M.map(([id, ch, name, desc, stat, goal, reward]) => ({ id, ch, name, desc, stat, goal, reward }));
  ZC.expandCost = n => 500 * (n + 1);
  ZC.MAX_W = 14; ZC.MAX_H = 12;

  // iso projection: tile coords (x right-down, y left-down) <-> screen
  const A = ZC.TW / 2, B = ZC.TH / 2;
  ZC.iso = (x, y) => [(x - y) * A, (x + y) * B];
  ZC.unIso = (sx, sy) => [(sy / B + sx / A) / 2, (sy / B - sx / A) / 2];
  ZC.dirName = (dx, dy) => Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'front' : 'back');
})();
