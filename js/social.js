// Stage 6: critics and friends.
//  - Critics: now and then a critic offers a timed task that the café can really do (serve, cook, wash, rest, infect,
//    raid). Doing it in time lends temporary stars (see ZC.grantBonusStars). Nothing here needs a friend.
//  - Friends: there is no server, so the social layer is played with NPC cafés. You can add them, visit their café,
//    order food from them (it arrives in your fridge once, and a recipe you do not know can be studied from it),
//    and deliver the food they ask you for. Every transaction is a record in the save that is removed before it pays.
window.ZC = window.ZC || {};
(() => {
  const ZC = window.ZC, CFG = ZC.CFG;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------- critics ----------
  ZC.REVIEW_TASKS = [
    { id: 'serve', stat: 'served', n: [4, 6], time: 210, text: n => `Sirva ${n} clientes`, ok: () => true },
    { id: 'cook', stat: 'cooked', n: [2, 3], time: 260, text: n => `Cozinhe ${n} lotes`, ok: () => ZC.objsOf('stove').length > 0 },
    { id: 'wash', stat: 'washed', n: [4, 6], time: 220, text: n => `Lave ${n} pratos sujos`, ok: () => ZC.objsOf('sink').length > 0 },
    { id: 'rest', stat: 'rested', n: [1, 1], time: 260, text: () => 'Mande um zumbi descansar', ok: () => ZC.team().length > 0 },
    { id: 'infect', stat: 'infected', n: [1, 1], time: 300, text: () => 'Infecte um cliente', ok: () => ZC.team().length < ZC.maxZombies(ZC.state.level) && ZC.state.toxin >= 2 },
    { id: 'raid', stat: 'raids', n: [1, 1], time: 480, text: () => 'Vença uma invasão', ok: () => ZC.state.level >= 2 && ZC.team().length > 0 },
  ];
  ZC.reviewProgress = cur => Math.max(0, (ZC.state.stats[cur.stat] || 0) - cur.base);
  ZC.reviewTick = function (dt) {
    const s = ZC.state, r = s.review;
    if (!r) return;
    if (r.cur) {
      const c = r.cur; c.left -= dt;
      if (ZC.reviewProgress(c) >= c.goal) {
        r.cur = null; r.done++; r.next = CFG.review.every;       // cleared before the prize: it can only be given once
        ZC.stat('reviews');
        ZC.grantBonusStars(CFG.review.reward.stars, CFG.review.reward.time, 'Crítica elogiosa');
        ZC.save();
      } else if (c.left <= 0) {
        r.cur = null; r.next = CFG.review.every;
        ZC.toast('O crítico foi embora sem avaliar. Ele volta em alguns minutos.');
      }
      return;
    }
    if ((s.stats.served || 0) < 3) return;                       // the first customers come before the first critic
    r.next -= dt;
    if (r.next > 0) return;
    const pool = ZC.REVIEW_TASKS.filter(t => t.ok());
    if (!pool.length) { r.next = 60; return; }
    const t = pick(pool), n = Math.round(rand(t.n[0], t.n[1]));
    r.cur = { id: t.id, stat: t.stat, goal: n, base: s.stats[t.stat] || 0, left: t.time, total: t.time, text: t.text(n) };
    ZC.toast(`Um crítico gastronômico chegou: ${r.cur.text} em ${Math.round(t.time / 6) / 10} min para ganhar meia estrela. Veja em Reputação.`, 'level');
  };

  // ---------- friends ----------
  ZC.FRIENDS = [
    { id: 'neide', name: 'Tia Neide', lvl: 1, chef: 'c_veterano', staff: ['z_idoso', 'z_mulher'], names: ['Vovô Arnaldo', 'Dona Cida'], sign: 'NEIDE',
      recipes: ['ensopado', 'grogue', 'sanduiche'], bio: 'Vizinha de porta. Faz o melhor Sanduíche do Beco da cidade.' },
    { id: 'caio', name: 'Caio Careca', lvl: 3, chef: 'c_barbudo', staff: ['z_careca', 'z_grandalhao', 'z_padrao'], names: ['Careca Jr.', 'Grandão', 'Zé Pilha'], sign: 'CAIO',
      recipes: ['espeto', 'costela', 'caldo'], bio: 'Dono de um boteco de esquina. Só trabalha com carne.' },
    { id: 'marta', name: 'Marta Doceira', lvl: 5, chef: 'c_mulher', staff: ['z_mulher', 'z_adolescente'], names: ['Rô', 'Pê'], sign: 'MARTA',
      recipes: ['torta', 'sopa_olho', 'polvo'], bio: 'Confeiteira de miolos. Guarda receitas de família.' },
    { id: 'italo', name: 'Ítalo Bigodão', lvl: 8, chef: 'c_classico', staff: ['z_grandalhao', 'z_careca', 'z_idoso', 'z_adolescente'], names: ['Tonhão', 'Beto', 'Seu Mané', 'Juninho'], sign: 'ÍTALO',
      recipes: ['hamburguer', 'pizza', 'bolo', 'banquete'], bio: 'Chef de banquetes. Só atende gente de nível.' },
  ];
  ZC.friendOf = id => ZC.FRIENDS.find(f => f.id === id);
  ZC.isFriend = id => !!ZC.state.friends[id];
  ZC.addFriend = function (f) {
    const s = ZC.state;
    if (s.friends[f.id]) return false;
    if (s.level < f.lvl) { ZC.toast(`${f.name} só aceita amizade a partir do nível ${f.lvl}.`, 'bad'); return false; }
    s.friends[f.id] = { since: Math.round(s.clock), visits: 0, next: rand(CFG.friends.requestEvery[0], CFG.friends.requestEvery[1]) };
    ZC.stat('friends'); ZC.toast(`${f.name} agora é seu amigo! Visite o café dele, encomende pratos e atenda os pedidos.`, 'good');
    ZC.save();
    return true;
  };

  // --- food orders: you pay now, the friend cooks (session time), the batch arrives in your fridge once ---
  ZC.orderCost = rid => Math.ceil(ZC.RECIPES[rid].cost * CFG.friends.orderCost);
  ZC.orderTime = rid => Math.max(30, Math.round(ZC.RECIPES[rid].time * CFG.friends.orderTime));
  // returns null when placed, otherwise the reason
  ZC.placeOrder = function (fid, rid) {
    const s = ZC.state, f = ZC.friendOf(fid);
    if (!f || !s.friends[fid]) return 'Adicione esse amigo primeiro.';
    if (!f.recipes.includes(rid)) return 'Esse amigo não faz esse prato.';
    if (s.orders.length >= CFG.friends.orderMax) return `No máximo ${CFG.friends.orderMax} encomendas ao mesmo tempo.`;
    if (!ZC.spend(ZC.orderCost(rid), `encomenda: ${ZC.RECIPES[rid].name}`)) return 'Moedas insuficientes.';
    const t = ZC.orderTime(rid);
    s.orders.push({ id: ZC.newId(), f: fid, r: rid, left: t, total: t });
    ZC.stat('ordered'); ZC.save();
    return null;
  };
  function deliver(o) {
    const s = ZC.state, i = s.orders.indexOf(o);
    if (i < 0) return;
    s.orders.splice(i, 1);                                        // removed before the food appears: it can not arrive twice
    const D = ZC.RECIPES[o.r], f = ZC.friendOf(o.f), isNew = !ZC.knows(o.r);
    ZC.storeBatch({ r: o.r, servings: D.servings, from: 'f:' + o.f });
    s.stats.p_loot = (s.stats.p_loot || 0) + D.servings;
    ZC.stat('received');
    ZC.toast(`${f.name} mandou ${D.name} (${D.servings} porções)!` + (isNew ? ' Receita nova: estude o lote na geladeira.' : ' Está na geladeira.'), 'good');
    ZC.save();
  }

  // --- requests: a friend asks for portions of a dish; delivering takes them from the counters and pays once ---
  ZC.requestReward = (rid, n) => ({ coins: Math.round(ZC.RECIPES[rid].price * n * CFG.friends.rewardPerPortion), xp: Math.max(2, Math.round(ZC.RECIPES[rid].xp * 0.8)) });
  // portions of this recipe (any variant) on the counters that nobody is already carrying to a customer
  ZC.stockOf = rid => ZC.objsOf('counter').filter(o => o.servings > 0 && ZC.DISHES[o.recipe].base === rid).reduce((n, o) => n + Math.max(0, o.servings - ((ZC.rt.claims || {})[o.id] || 0)), 0);
  ZC.deliverRequest = function (req) {
    const s = ZC.state, i = s.requests.indexOf(req);
    if (i < 0) return 'Esse pedido já foi atendido.';
    if (ZC.stockOf(req.r) < req.n) return `Faltam porções: há ${ZC.stockOf(req.r)} de ${req.n} nos balcões.`;
    s.requests.splice(i, 1);                                      // closed first: a second tap finds nothing
    let need = req.n;
    for (const o of ZC.objsOf('counter').filter(c => c.servings > 0 && ZC.DISHES[c.recipe].base === req.r).sort((a, b) => (a.recipe === req.r ? 0 : 1) - (b.recipe === req.r ? 0 : 1))) {
      const free = Math.max(0, o.servings - ((ZC.rt.claims || {})[o.id] || 0)), take = Math.min(free, need);
      o.servings -= take; need -= take; if (!o.servings) o.recipe = null;
      if (!need) break;
    }
    s.stats.p_gift = (s.stats.p_gift || 0) + req.n;
    ZC.addCoins(req.reward.coins, 'pedido de amigo'); ZC.addXP(req.reward.xp);
    ZC.stat('gifts'); ZC.stat('earned', req.reward.coins);
    const f = ZC.friendOf(req.f); if (s.friends[req.f]) s.friends[req.f].gifts = (s.friends[req.f].gifts || 0) + 1;
    ZC.toast(`${f.name} agradeceu: +${req.reward.coins} moedas e ${req.reward.xp} XP.`, 'good');
    ZC.save();
    return null;
  };

  ZC.socialTick = function (dt) {
    const s = ZC.state, F = CFG.friends;
    for (const o of s.orders.slice()) { o.left -= dt; if (o.left <= 0) deliver(o); }
    for (const q of s.requests.slice()) {
      q.left -= dt;
      if (q.left <= 0) { s.requests.splice(s.requests.indexOf(q), 1); ZC.toast(`${ZC.friendOf(q.f).name} desistiu do pedido de ${ZC.RECIPES[q.r].name}.`); }
    }
    for (const [fid, st] of Object.entries(s.friends)) {
      st.next -= dt;
      if (st.next > 0) continue;
      st.next = rand(F.requestEvery[0], F.requestEvery[1]);
      if (s.requests.length >= F.requestMax || s.requests.some(q => q.f === fid)) continue;
      // only dishes you can cook yourself, so a request is never impossible
      const can = Object.keys(ZC.RECIPES).filter(r => ZC.knows(r) && ZC.RECIPES[r].lvl <= s.level && ZC.RECIPES[r].time <= 600);
      if (!can.length) continue;
      const rid = pick(can), R = ZC.RECIPES[rid], n = Math.max(3, Math.min(12, Math.round(R.servings * 0.35)));
      s.requests.push({ id: ZC.newId(), f: fid, r: rid, n, left: F.requestTime, reward: ZC.requestReward(rid, n) });
      ZC.toast(`${ZC.friendOf(fid).name} pediu ${n} porções de ${R.name}. Veja em Amigos.`, 'level');
    }
  };
})();
