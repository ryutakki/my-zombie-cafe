// DOM interface: HUD, toasts, modal menus (shop, cookbook, zombies, raids, settings).
(() => {
  const ZC = window.ZC;
  const $ = s => document.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(k));
    return el;
  };
  ZC.h = h;

  const ic = (name, px = 18) => ZC.icon(name, px);
  // replaceChildren that skips the empty slots (a bare null would be printed as the word "null")
  const put = (el, ...kids) => el.replaceChildren(...kids.flat().filter(k => k != null && k !== false));
  const wi = (name, px, ...txt) => h('span', { class: 'wi' }, ic(name, px), ...txt);
  const coin = n => h('span', { class: 'cost' }, h('i', { class: 'ico coin' }), String(n));
  const tox = n => h('span', { class: 'cost' }, h('i', { class: 'ico toxin' }), String(n));
  const fmtTime = s => s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}` :
    s >= 60 ? `${Math.floor(s / 60)}min${s % 60 ? ' ' + (s % 60) + 's' : ''}` : `${s}s`;

  // ---------- toasts ----------
  ZC.toast = function (msg, kind = '') {
    const el = h('div', { class: 'toast ' + kind }, msg);
    $('#toasts').append(el);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  };

  // ---------- HUD ----------
  let last = '';
  ZC.updateHUD = function () {
    const s = ZC.state, r = ZC.rating();
    const cl = ZC.claimable();
    const bd = $('#missbadge'); if (bd) { bd.textContent = cl || ''; bd.style.display = cl ? '' : 'none'; }
    ZC.updateBanner();
    const sig = [s.coins, s.toxin, s.level, s.xp, Math.round(r * 4), ZC.repBonus(), s.cafe.closed].join('|');
    if (sig === last) return;
    last = sig;
    $('#coins').textContent = s.coins;
    $('#toxin').textContent = s.toxin;
    $('#lvl').textContent = s.level;
    $('#xpfill').style.width = (s.level >= ZC.MAX_LEVEL ? 100 : Math.min(100, 100 * s.xp / ZC.xpForLevel(s.level))) + '%';
    const perks = ZC.nextLevelPerks();
    $('#lvl').parentElement.title = s.level >= ZC.MAX_LEVEL ? 'Nível máximo' : `Nível ${s.level}: ${s.xp}/${ZC.xpForLevel(s.level)} XP` + (perks.length ? `. Próximo nível: ${perks.join(', ')}` : '');
    const full = Math.floor(r + 0.125), half = r + 0.125 - full >= 0.5;
    $('#rating').replaceChildren(...[0, 1, 2, 3, 4].map(i => ic(i < full ? 'star' : i === full && half ? 'starhalf' : 'starempty', 22)), ...(s.cafe.closed ? [h('small', { class: 'closedtag' }, 'FECHADO')] : []));
    $('#rating').classList.toggle('bonus', ZC.repBonus() > 0);
    $('#rating').title = `Reputação ${r.toFixed(1)}: toque para ver por que ela mudou`;
  };

  // The tutorial is the first chapter of missions shown one step at a time. Each step is completed by the real
  // event in the café (never by closing a window), and the current step is part of the save.
  const TUTOR = {
    cook1: 'Toque num fogão vazio e escolha uma receita. O chef busca os ingredientes e fica no fogão até ficar pronto.',
    serve5: 'Com comida no balcão, quem tem a função Atender serve sozinho. Sirva 5 clientes: quanto mais rápido, mais gorjeta.',
    wash3: 'Mesa com prato sujo não recebe cliente. O atendente leva os pratos à pia: espere 3 serem lavados.',
    rest1: 'Trabalhar cansa. Toque no seu zumbi e escolha Descansar: cansado ele se distrai, faminto ataca um cliente.',
    infect1: 'Toque num cliente sentado para ver o que ele seria como zumbi, e escolha Infectar (custa Toxina).',
    raid1: 'Abra Invasão, mande seus zumbis e derrote o chefe do Beco dos Ladrões. Eles lutam com a energia que têm.',
  };
  let bannerSig = null;
  ZC.updateBanner = function () {
    const s = ZC.state, el = $('#banner'), v = ZC.view;
    const steps = ZC.MISSIONS.filter(m => m.ch === 0);
    const cur = steps.find(m => !s.missions[m.id]), claim = steps.find(m => s.missions[m.id] === 1);
    const show = !s.tutorialOff && v.scene === 'cafe' && v.mode === 'play' && !v.placing && (cur || claim);
    const sig = show ? (cur ? cur.id : 'claim') + '|' + (claim ? claim.id : '') + '|' + (cur ? Math.min(cur.goal, Math.floor(ZC.missionValue(cur))) : '') : 'off';
    if (sig === bannerSig) return;
    bannerSig = sig;
    if (!show) { el.classList.add('hidden'); return; }
    const done = steps.filter(m => s.missions[m.id]).length;
    put(el,
      h('span', {}, h('b', {}, cur ? `Passo ${done + 1} de ${steps.length}: ${cur.name}` + (cur.goal > 1 ? ` (${Math.min(cur.goal, Math.floor(ZC.missionValue(cur)))}/${cur.goal})` : '') + '. ' : 'Primeiros passos concluídos! '),
        cur ? TUTOR[cur.id] || cur.desc : 'Resgate os prêmios em Missões.'),
      claim ? h('button', { class: 'btn buy', onclick: () => ZC.openMissions() }, 'Resgatar prêmio') : null,
      h('button', { class: 'btn ghost', title: 'Esconder as dicas', onclick: () => { s.tutorialOff = true; ZC.save(); ZC.updateBanner(); } }, ic('close', 14)));
    el.classList.remove('hidden');
  };

  // ---------- action box (bottom of the screen): tapping a customer, a worker or a stove ----------
  let liveIv = 0;
  ZC.closeCustomerMenu = function () { $('#cmenu').classList.add('hidden'); clearInterval(liveIv); liveIv = 0; };
  function showActionBox(...kids) {
    const el = $('#cmenu');
    clearInterval(liveIv); liveIv = 0;
    el.replaceChildren(h('div', { class: 'cbox' }, ...kids, h('button', { class: 'btn ghost cclose', title: 'Fechar', onclick: ZC.closeCustomerMenu }, ic('close', 16))));
    el.classList.remove('hidden');
  }
  // keep an open box up to date: `paint` returns false when the box should close
  function live(paint, ms = 500) {
    const box = $('#cmenu .cbox');
    clearInterval(liveIv);
    liveIv = setInterval(() => { if ($('#cmenu .cbox') !== box) return; if (paint() === false) ZC.closeCustomerMenu(); }, ms);
  }

  const pct = z => Math.round(100 * ZC.zPct(z));
  const ecolor = p => (p > 50 ? '#7fe04f' : p > 25 ? '#f2b630' : '#e2483a');
  const ebar = z => h('div', { class: 'ebar' }, h('i', { style: `width:${pct(z)}%;background:${ecolor(pct(z))}` }));
  const starRow = (n, px = 12) => h('span', { class: 'wi mast' }, ...[0, 1, 2, 3, 4].map(i => ic(i < n ? 'star' : 'starempty', px)));
  // the numbers of a recruit, or of a customer that may become one
  function attrs(st, type, lvl = 1) {
    const p = ZC.PROFILES[type] || ZC.PROFILES.pirate_zombie, g = 1 + ZC.CFG.staff.growth * (lvl - 1);
    return h('small', { class: 'attrs', title: 'Energia: quanto trabalha e aguenta nas invasões. Velocidade: andar. Gorjeta: parte do preço que ele ganha de gorjeta. Força: dano nas invasões. Fome: quanto aguenta antes de atacar um cliente.' },
      `Energia ${Math.round(st.energy * g)} · Veloc. ${Math.round(st.speed * 100)}% · Gorjeta ${Math.round((st.tip + ZC.CFG.staff.tipGrowth * (lvl - 1)) * 100)}% · Força ${Math.round(st.str * g)} · Fome `, starRow(ZC.hungerStars(p.hunger)));
  }
  const kindName = z => (z.chef ? 'Chef' : ZC.profileOf(z).name + (z.tint ? ' zumbi' : '')) + ' · ' + ZC.profileOf(z).job;

  ZC.openStoveMenu = function (o) {
    if (!o.cook) return;
    const R = ZC.RECIPES[o.cook.r];
    const left = h('small', {}), who = h('small', { class: 'cwhy' }), fill = h('i', { style: 'width:0%' }), acts = h('div', { class: 'cacts' });
    showActionBox(ZC.foodThumb(o.cook.r, 44),
      h('div', { class: 'cinfo' }, h('b', {}, `${R.name} · ${o.cook.servings} porções`), left, who, h('div', { class: 'erow' }, h('div', { class: 'ebar' }, fill))), acts);
    let sig = '', sure = false;
    const sendCook = () => { const a = ZC.autoZombie(o, ['cook']) || (ZC.stoveStatus(o) === 'ready' ? ZC.autoZombie(o) : null); if (!a) return ZC.toast('Nenhum cozinheiro livre. Toque num funcionário e escolha Cozinhar.', 'bad'); ZC.cmdStove(a.id, o); };
    function paint() {
      const c = o.cook;
      if (!c || !ZC.objById(o.id)) return false;
      const st = ZC.stoveStatus(o), sec = Math.max(0, Math.ceil(c.total - c.progress)), cook = c.cook && ZC.zombieData(c.cook);
      left.textContent = st === 'pending' ? 'O cozinheiro foi buscar os ingredientes.' : st === 'cooking' ? 'Falta ' + fmtTime(sec) + '.'
        : st === 'paused' ? `Parado, falta ${fmtTime(sec)}. Sem cozinheiro, queima em ${Math.ceil(c.abandon)}s!`
        : st === 'ready' ? `Pronto! Estraga em ${fmtTime(Math.ceil(c.spoil))} se ficar no fogão.` : c.why === 'burnt' ? 'Queimou: ficou tempo demais sem cozinheiro.' : 'Estragou: ninguém levou ao balcão a tempo.';
      who.textContent = st === 'cooking' && cook ? 'Cozinheiro: ' + cook.name + ' (ele precisa ficar aqui)' : st === 'ready' && !ZC.pickCounter(c.r) ? 'Nenhum balcão livre para este prato!' : '';
      fill.style.width = Math.min(100, 100 * c.progress / Math.max(1, c.total)) + '%';
      fill.style.background = st === 'paused' ? '#f2b630' : st === 'spoiled' ? '#6a5a3a' : '#7fe04f';
      const cost = st === 'cooking' || st === 'paused' ? ZC.speedCost(o) : 0;
      const now = [st, cost, ZC.state.toxin >= cost, sure].join();
      if (now !== sig) {
        sig = now;
        put(acts, 
          st === 'paused' ? h('button', { class: 'btn buy', onclick: sendCook }, 'Retomar') : null,
          st === 'ready' ? h('button', { class: 'btn buy', onclick: sendCook }, 'Levar ao balcão') : null,
          cost ? h('button', { class: 'btn', disabled: ZC.state.toxin < cost, title: 'Termina o prato agora', onclick: () => { ZC.speedUp(o); paint(); } }, wi('clock', 18, 'Acelerar '), tox(cost)) : null,
          st === 'spoiled' ? h('button', { class: 'btn buy', onclick: () => { ZC.cleanStove(o); ZC.closeCustomerMenu(); } }, 'Limpar o fogão')
            : h('button', { class: 'btn ghost', title: 'O lote e o que foi pago por ele são perdidos', onclick: () => { if (!sure) { sure = true; paint(); } else { ZC.cleanStove(o); ZC.closeCustomerMenu(); } } }, sure ? 'Confirmar: jogar fora' : 'Jogar fora'));
      }
      return true;
    }
    paint(); live(paint, 400);
  };

  ZC.openCustomerMenu = function (cu) {
    const p = ZC.PROFILES[cu.sprite] || ZC.PROFILES.pirate_zombie, sp = cu.special && ZC.SPECIALS[cu.special];
    const note = h('small', {}), acts = h('div', { class: 'cacts' });
    showActionBox(
      ZC.portrait(cu.sprite, cu.variant || false, 44),
      h('div', { class: 'cinfo' },
        h('b', {}, sp ? sp.name : cu.variant ? ZC.VARIANTS[cu.variant].name : p.name),
        h('small', {}, `Como zumbi: ${p.job}. ${p.desc}`),
        attrs(cu.stats, cu.sprite), note),
      acts);
    let sig = null;
    const paint = () => {
      if (cu.gone) return false;
      const cost = ZC.infectCost(cu), why = ZC.canInfect(cu);
      if (why === sig) return true;
      sig = why;
      note.className = 'cwhy' + (why ? '' : ' ok');
      note.textContent = why || `Equipe ${ZC.team().length}/${ZC.maxZombies(ZC.state.level)}. Ele vira zumbi e trabalha no café.`;
      put(acts, h('button', { class: 'btn buy', disabled: !!why, onclick: () => { ZC.closeCustomerMenu(); ZC.startInfect(cu); } }, wi('syringe', 20, 'Infectar '), tox(cost)));
      return true;
    };
    paint(); live(paint, 600);
  };

  function doingOf(a, z) {
    if (z.revive > 0) return `Reanimando: ${fmtTime(Math.ceil(z.revive))}`;
    if (z.away) return 'Na invasão';
    if (z.role === 'reserve') return 'Guardado na reserva (energia congelada)';
    if (!a) return ZC.ROLES[z.role];
    if (a.state === 'collapsed') return 'Desabou de cansaço!';
    if (a.held) return 'Sendo carregado';
    if (a.mood === 'attack') return 'Atacando um cliente!';
    if (a.mood === 'distracted') return 'Distraído (cansado demais)';
    if (a.hungerT != null) return `FAMINTO: ataca um cliente em ${Math.ceil(a.hungerT)}s`;
    if (z.role === 'rest') return a.resting ? 'Descansando' : 'Indo descansar';
    const k = a.task && a.task.kind;
    return k === 'cook' ? 'Cozinhando' : k === 'serve' ? 'Servindo' : k === 'clean' ? 'Lavando pratos' : k ? 'Abastecendo o balcão' : `Livre (${ZC.ROLES[z.role]})`;
  }
  const roleBtn = (z, role, after) => h('button', { class: 'btn' + (z.role === role ? ' on' : ''), disabled: z.role === role || z.revive > 0 || !!z.away,
    onclick: () => { const why = ZC.setRole(z, role); if (why) ZC.toast(why, 'bad'); after(); } }, ZC.ROLES[role]);

  ZC.openZombieMenu = function (a) {
    const z = ZC.zombieData(a.id); if (!z) return;
    const doing = h('small', {}), en = h('small', {}), fill = h('i', {}), acts = h('div', { class: 'cacts' }), title = h('b', {});
    showActionBox(
      ZC.portrait(z.sprite, z.tint, 44),
      h('div', { class: 'cinfo' }, title, h('small', {}, kindName(z)), doing,
        z.chef ? h('small', {}, 'Não se cansa no café. Veloc. ' + Math.round(z.st.speed * 100) + '% · Gorjeta ' + Math.round(z.st.tip * 100) + '%')
          : h('div', { class: 'erow' }, en, h('div', { class: 'ebar' }, fill)),
        z.chef ? null : attrs(z.st, z.type, z.lvl)),
      acts);
    let sig = null;
    const paint = () => {
      if (!ZC.zombieData(z.id) || !ZC.zombieActor(z.id)) return false;
      const eta = !z.chef && z.role !== 'rest' ? ZC.restEta(a, z) : null;
      title.textContent = z.name + (z.chef ? '' : ` · nível ${z.lvl}`);
      doing.textContent = doingOf(a, z);
      doing.className = a.hungerT != null || a.mood === 'attack' || a.state === 'collapsed' ? 'cwhy' : '';
      en.textContent = `Energia ${Math.round(z.energy)}/${ZC.zMax(z)}` + (eta != null && eta < 600 ? ` · ~${fmtTime(eta)} de trabalho` : '');
      fill.style.width = pct(z) + '%'; fill.style.background = ecolor(pct(z));
      const now = [z.role, z.energy >= ZC.zMax(z), ZC.state.toxin >= 1].join();
      if (now === sig) return true;
      sig = now;
      put(acts, 
        roleBtn(z, 'serve', paint), roleBtn(z, 'cook', paint),
        z.chef ? null : roleBtn(z, 'rest', paint),
        z.chef ? null : h('button', { class: 'btn', disabled: z.energy >= ZC.zMax(z) || ZC.state.toxin < 1, title: 'Cérebro: energia cheia na hora', onclick: () => { ZC.feedBrain(z); paint(); } }, wi('brain', 20, 'Cérebro '), tox(1)),
        h('button', { class: 'btn ghost', title: 'Equipe, reserva e dispensa', onclick: () => { ZC.closeCustomerMenu(); ZC.openZombies(); } }, 'Equipe'));
      return true;
    };
    paint(); live(paint, 500);
  };

  // ---------- modal ----------
  ZC.openModal = function (title, body, opts = {}) {
    $('#modal h2').textContent = title;
    $('#modal .panel').className = 'panel' + (opts.cls ? ' ' + opts.cls : '');
    $('#modal .pbody').replaceChildren(body);
    $('#modal').classList.remove('hidden');
    $('#modal .x').style.display = opts.noClose ? 'none' : '';
    ZC.modalOpen = true;
    ZC.onModalClose = opts.onClose || null;
  };
  ZC.closeModal = function () {
    $('#modal').classList.add('hidden');
    ZC.modalOpen = false;
    const cb = ZC.onModalClose; ZC.onModalClose = null;
    if (cb) cb();
  };

  function thumb(type) {
    const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), W = 104, H = 104;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const hh = ZC.ITEMS[type].hh || 50, sc = Math.min(0.72, 78 / Math.max(hh, 50));
    g.translate(W / 2, H - 22); g.scale(sc, sc);
    ZC.drawItem(g, type, 0, 0, { id: 0, servings: 0, cook: null }, 0.5);
    return cv;
  }

  // ---------- shop ----------
  const SHOP_TABS = [['table', 'Mesas'], ['chair', 'Cadeiras'], ['stove', 'Fogões'], ['fridge', 'Geladeiras'], ['sink', 'Pias'], ['counter', 'Balcões'], ['decor', 'Decoração'], ['floor', 'Pisos'], ['wall', 'Paredes'], ['expand', 'Expandir']];

  ZC.applyStyle = function (kind, id) {
    const s = ZC.state, list = kind === 'floor' ? ZC.FLOORS : ZC.WALLS, st = list.find(x => x.id === id);
    if (!s.owned[kind].includes(id)) {
      if (!ZC.spend(st.price, 'compra: ' + st.name)) return ZC.toast('Moedas insuficientes!', 'bad');
      s.owned[kind].push(id);
    }
    s.cafe[kind] = id;
    if (kind === 'wall') s.cafe.wallSeg = {};   // paint everything again: no individual overrides left
    ZC.save(); ZC.toast(`${st.name} aplicado!`, 'good'); ZC.openShop(kind);
  };
  // pick a wall paint and then tap single wall segments (this is where the dividing lines show up)
  ZC.beginWallPaint = function (id) {
    const s = ZC.state, st = ZC.WALLS.find(x => x.id === id);
    if (!s.owned.wall.includes(id)) {
      if (!ZC.spend(st.price, 'compra: ' + st.name)) return ZC.toast('Moedas insuficientes!', 'bad');
      s.owned.wall.push(id);
    }
    ZC.closeModal();
    ZC.view.paintWall = id; ZC.view.mode = 'play'; ZC.view.wallHover = null; ZC.view.selected = null;
    ZC.renderEditBar();
  };
  ZC.paintWallSeg = function (side, i, id) {
    const c = ZC.state.cafe; c.wallSeg = c.wallSeg || {};
    const k = side + i;
    if ((c.wallSeg[k] || c.wall) === id) return;
    if (id === c.wall) delete c.wallSeg[k]; else c.wallSeg[k] = id;
    ZC.save();
  };

  ZC.openShop = function (tab = 'table') {
    const s = ZC.state;
    const tabs = h('div', { class: 'tabs' }, ...SHOP_TABS.map(([k, label]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), onclick: () => ZC.openShop(k) }, label)));
    let content;
    if (tab === 'expand') {
      const c = s.cafe, cost = ZC.expandCost(s.expansions), max = c.w >= ZC.MAX_W && c.h >= ZC.MAX_H;
      content = h('div', { class: 'card wide' }, h('div', { class: 'info' },
        h('b', {}, 'Expandir o café'),
        h('p', {}, `Tamanho atual: ${c.w} × ${c.h}. ` + (max ? 'Tamanho máximo atingido.' : `Próximo: ${Math.min(ZC.MAX_W, c.w + 1)} × ${Math.min(ZC.MAX_H, c.h + 1)}. Mais chão para mesas, fogões e balcões; nada do que já está colocado sai do lugar. O tamanho não aumenta o limite de zumbis (isso vem do nível).`)),
        max ? null : h('button', { class: 'btn buy', disabled: s.coins < cost, onclick: () => { if (ZC.expandCafe()) { ZC.toast('Café expandido!', 'good'); ZC.fitCamera(); ZC.closeModal(); } } }, 'Expandir ', coin(cost))));
    } else if (tab === 'floor' || tab === 'wall') {
      const list = tab === 'floor' ? ZC.FLOORS : ZC.WALLS;
      content = h('div', { class: 'grid' }, ...list.map(st => {
        const owned = s.owned[tab].includes(st.id), on = s.cafe[tab] === st.id, locked = s.level < st.lvl;
        return h('div', { class: 'card' + (locked ? ' locked' : '') }, tab === 'floor' ? ZC.floorThumb(st.id) : ZC.wallThumb(st.id),
          h('b', {}, st.name), h('small', {}, locked ? `Nível ${st.lvl}` : on ? 'Em uso' : owned ? 'Já comprado' : ''),
          h('button', { class: 'btn buy', disabled: locked || on || (!owned && s.coins < st.price), onclick: () => ZC.applyStyle(tab, st.id) }, on ? 'Em uso' : owned ? (tab === 'wall' ? 'Todas' : 'Aplicar') : (st.price ? coin(st.price) : 'Grátis')),
          tab === 'wall' ? h('button', { class: 'btn', disabled: locked || (!owned && s.coins < st.price), title: 'Pinta só os pedaços de parede que você tocar', onclick: () => ZC.beginWallPaint(st.id) }, 'Pintar um a um') : null);
      }));
    } else {
      content = h('div', { class: 'grid' }, ...Object.entries(ZC.ITEMS).filter(([, it]) => it.cat === tab).map(([type, it]) => {
        const locked = s.level < it.lvl;
        return h('div', { class: 'card' + (locked ? ' locked' : '') }, thumb(type), h('b', {}, it.name),
          h('small', {}, locked ? `Nível ${it.lvl}` : it.desc),
          h('button', { class: 'btn buy', disabled: locked || s.coins < it.price, onclick: () => { ZC.closeModal(); ZC.beginPlacing(type); } }, coin(it.price)));
      }));
    }
    ZC.openModal('Loja', h('div', {}, tabs, content));
    const on = document.querySelector('#modal .tab.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  };

  // ---------- cookbook ----------
  // Three different things: knowing a recipe (permanent) · having food of it · being able to cook it (level, stove).
  ZC.toggleFavRecipe = function (rid) { const f = ZC.state.favRecipes || (ZC.state.favRecipes = {}); if (f[rid]) delete f[rid]; else f[rid] = 1; ZC.save(); };
  ZC.openCookbook = function (stove, zid, spread = 0, tab = 'can') {
    const s = ZC.state, fav = s.favRecipes || {}, z = zid && ZC.zombieData(zid), all = Object.keys(ZC.RECIPES);
    const block = rid => ZC.cookBlock(rid, stove || null);
    const lists = { can: all.filter(r => !block(r)), locked: all.filter(r => block(r)), fav: all.filter(r => fav[r]) };
    const rids = lists[tab], per = 6, spreads = Math.max(1, Math.ceil(rids.length / per));
    spread = Math.min(spread, spreads - 1);
    const again = (sp, tb) => ZC.openCookbook(stove, zid, sp, tb);
    const entry = rid => {
      const r = ZC.RECIPES[rid], why = block(rid), cost = ZC.cookCost(rid), price = ZC.priceOf(rid), profit = r.servings * price - r.cost;
      const st = ZC.masteryStars(rid), cnt = ZC.masteryCount(rid), nextAt = ZC.MASTERY.find(n => n > cnt);
      return h('div', { class: 'recipe' + (why ? ' locked' : '') },
        h('div', { class: 'rpic' }, ZC.foodThumb(rid, 66)),
        h('div', { class: 'rinfo' },
          h('b', {}, r.name, ' ', h('span', { class: 'tag' }, r.use), r.learn === 'loot' ? h('span', { class: 'tag loot' }, 'Saque') : null,
            h('button', { class: 'favb' + (fav[rid] ? ' on' : ''), title: 'Favorita', onclick: () => { ZC.toggleFavRecipe(rid); again(spread, tab); } }, ic(fav[rid] ? 'star' : 'starempty', 16))),
          h('small', { class: 'rdesc' }, r.desc),
          h('div', { class: 'rstats' }, wi('clock', 15, fmtTime(r.time)), wi('plate', 16, r.servings + ' porções'), wi('coin', 15, `custa ${r.cost} · vende a ${price}`),
            h('span', { title: 'Se todas as porções forem vendidas, sem contar gorjetas' }, 'lucro até ' + profit), h('span', {}, r.xp + ' XP'),
            h('span', { class: 'wi mast', title: `Cozinhou ${cnt}x. ` + (nextAt ? `Próxima estrela com ${nextAt}x (+15% por porção).` : 'Maestria máxima!') }, ...[0, 1, 2, 3, 4].map(i => ic(i < st ? 'star' : 'starempty', 15)))),
          why ? h('small', { class: 'lock wi' }, ic('lock', 14), why)
            : stove ? h('button', { class: 'btn buy', disabled: s.coins < cost, onclick: () => { if (ZC.cmdCook(zid, stove, rid)) ZC.closeModal(); } }, 'Cozinhar ', cost ? coin(cost) : 'de graça (emergência)')
              : h('small', { class: 'lock' }, 'Toque num fogão vazio para cozinhar')));
    };
    const chunk = rids.slice(spread * per, spread * per + per);
    const tabs = h('div', { class: 'tabs' }, ...[['can', 'Disponíveis'], ['locked', 'Bloqueadas'], ['fav', 'Favoritas']].map(([k, label]) =>
      h('button', { class: 'tab' + (k === tab ? ' on' : ''), onclick: () => again(0, k) }, `${label} (${lists[k].length})`)));
    const book = h('div', { class: 'book' },
      h('div', { class: 'bpage left' }, ...chunk.slice(0, 3).map(entry), chunk.length ? null : h('p', { class: 'hint' }, tab === 'fav' ? 'Marque a estrela de uma receita para ela aparecer aqui.' : 'Nada por aqui.')),
      h('div', { class: 'bpage right' }, ...chunk.slice(3).map(entry)));
    const nav = h('div', { class: 'booknav' },
      h('button', { class: 'btn', disabled: spread === 0, onclick: () => again(spread - 1, tab) }, ic('arrowl', 18)),
      h('span', {}, `Página ${spread + 1} de ${spreads}`),
      h('button', { class: 'btn', disabled: spread >= spreads - 1, onclick: () => again(spread + 1, tab) }, ic('arrowr', 18)));
    const note = stove ? h('p', { class: 'bookhint' }, `${z ? z.name : 'O cozinheiro'} busca os ingredientes na geladeira e fica no fogão até o lote ficar pronto. O custo é cobrado uma vez, agora.`)
      : h('p', { class: 'bookhint' }, 'Para cozinhar, toque num fogão vazio. Receitas de saque são aprendidas estudando, na geladeira, um lote trazido de uma invasão.');
    ZC.openModal('Livro de Receitas', h('div', {}, note, tabs, book, nav), { cls: 'bookpanel', onClose: () => { const a = zid && ZC.zombieActor(zid); if (a && a.stun > 5) a.stun = 0.2; } });
  };

  // ---------- fridge: batches brought from raids ----------
  ZC.openFridge = function () {
    const s = ZC.state, cap = ZC.fridgeCap();
    const row = (b, waiting) => {
      const R = ZC.RECIPES[b.r], known = ZC.knows(b.r), src = ZC.RAIDS.find(t => t.id === b.from);
      return h('div', { class: 'row' },
        ZC.foodThumb(b.r, 56),
        h('div', { class: 'info' }, h('b', {}, `${R.name} · ${b.servings} porções`),
          h('small', {}, (src ? `Saqueado de ${src.name}. ` : '') + (known ? 'Você já conhece esta receita.' : 'Receita desconhecida!')),
          h('small', {}, waiting ? 'Esperando vaga na geladeira: não se perde, mas não pode ser usado ainda.' : b.moving ? 'Sendo levado ao balcão.' : 'Guardado aqui não estraga.')),
        waiting ? null : h('div', { class: 'acts' },
          known ? null : h('button', { class: 'btn buy', title: 'O lote inteiro é consumido e a receita fica no livro para sempre', onclick: () => { if (ZC.studyBatch(b)) ZC.openFridge(); } }, 'Estudar (consome o lote)'),
          h('button', { class: 'btn' + (known ? ' buy' : ''), disabled: !!b.moving, title: known ? 'Um funcionário leva o lote a um balcão' : 'Vender as porções sem aprender a receita', onclick: () => { if (ZC.cmdStock(b)) ZC.closeModal(); } }, 'Servir no balcão')));
    };
    ZC.openModal(`Geladeira (${s.fridge.length}/${cap} lotes)`, h('div', {},
      h('p', { class: 'hint' }, 'Os cozinheiros pegam os ingredientes aqui. A geladeira também guarda os lotes de comida trazidos das invasões: estude um lote desconhecido para aprender a receita (o lote é consumido, uma vez só), ou mande servir no balcão. Cada geladeira guarda 2 lotes.'),
      h('div', { class: 'list' }, ...s.fridge.map(b => row(b, false)), ...s.pendingLoot.map(b => row(b, true))),
      s.fridge.length || s.pendingLoot.length ? null : h('p', { class: 'hint' }, 'Vazia. Vença uma invasão para trazer comida de um café rival.')));
  };

  // ---------- zombies ----------
  const nextCap = lv => { const nl = [5, 10, 15, 18, 20].find(x => x > lv); return nl ? `próxima vaga no nível ${nl}` : 'máximo por enquanto'; };
  ZC.openZombies = function (sort = 'role', sureId = null) {
    const s = ZC.state, cap = ZC.maxZombies(s.level), mx = ZC.CFG.staff.maxLevel;
    const keyOf = { role: z => (z.chef ? '0' : z.role === 'reserve' ? '9' : z.role), energy: z => ZC.zPct(z), level: z => -z.lvl }[sort];
    const sorted = s.zombies.slice().sort((p, q) => (keyOf(p) < keyOf(q) ? -1 : keyOf(p) > keyOf(q) ? 1 : 0));
    const again = sure => ZC.openZombies(sort, sure || null);
    const row = z => {
      const a = ZC.zombieActor(z.id), stored = z.role === 'reserve', out = z.revive > 0 || !!z.away;
      const full = z.energy >= ZC.zMax(z);
      return h('div', { class: 'row' + (out || stored ? ' dim' : '') },
        ZC.portrait(z.sprite, z.tint, 64),
        h('div', { class: 'info' },
          h('b', {}, z.name, z.chef ? '' : ` · nível ${z.lvl}`,
            z.chef ? null : h('button', { class: 'favb' + (z.fav ? ' on' : ''), title: 'Favorito: não pode ser dispensado', onclick: () => { z.fav = !z.fav; ZC.save(); again(); } }, ic(z.fav ? 'star' : 'starempty', 16))),
          h('small', {}, kindName(z) + (z.chef || z.lvl >= mx ? '' : ` · XP ${z.xp}/${ZC.zXpNeed(z)}`)),
          h('small', {}, doingOf(a, z)),
          z.chef ? null : h('div', { class: 'erow' }, h('small', {}, `Energia ${Math.round(z.energy)}/${ZC.zMax(z)}`), ebar(z)),
          z.chef ? h('small', {}, ZC.PROFILES.chef.desc) : attrs(z.st, z.type, z.lvl)),
        h('div', { class: 'acts' },
          stored || out ? null : h('div', { class: 'roles' }, roleBtn(z, 'serve', again), roleBtn(z, 'cook', again), z.chef ? null : roleBtn(z, 'rest', again)),
          z.revive > 0 ? h('button', { class: 'btn buy', disabled: s.toxin < ZC.CFG.raid.reviveToxin, onclick: () => { ZC.reviveNow(z); again(); } }, 'Reanimar já ', tox(ZC.CFG.raid.reviveToxin)) : null,
          z.chef || out || stored ? null : h('button', { class: 'btn', disabled: full || s.toxin < 1, title: 'Cérebro: energia cheia na hora', onclick: () => { ZC.feedBrain(z); again(); } }, 'Cérebro ', tox(1)),
          z.chef || out ? null : stored
            ? h('button', { class: 'btn buy', onclick: () => { const why = ZC.setRole(z, z.prevRole || 'serve'); if (why) ZC.toast(why, 'bad'); again(); } }, 'Trazer para o café')
            : h('button', { class: 'btn', title: 'Guardar não é dispensar: ele fica com o nível e a energia que tem', onclick: () => { const why = ZC.setRole(z, 'reserve'); if (why) ZC.toast(why, 'bad'); again(); } }, 'Guardar na reserva'),
          z.chef || out ? null : sureId === z.id
            ? h('button', { class: 'btn buy', onclick: () => { if (ZC.fireStaff(z)) ZC.toast(z.name + ' foi dispensado.', 'bad'); again(); } }, 'Confirmar: dispensar')
            : h('button', { class: 'btn ghost', disabled: !!z.fav, title: z.fav ? 'Tire a estrela de favorito para poder dispensar' : 'Ele vai embora para sempre', onclick: () => again(z.id) }, 'Dispensar')));
    };
    const sorts = h('div', { class: 'tabs' }, ...[['role', 'Por função'], ['energy', 'Menos energia primeiro'], ['level', 'Maior nível primeiro']].map(([k, label]) =>
      h('button', { class: 'tab' + (k === sort ? ' on' : ''), onclick: () => ZC.openZombies(k) }, label)));
    ZC.openModal(`Equipe (${ZC.team().length}/${cap} zumbis · reserva ${ZC.stored().length}/${ZC.reserveCap()})`, h('div', {},
      h('p', { class: 'hint' }, `Cada funcionário faz uma coisa por vez: Atender (servir e lavar), Cozinhar (ficar no fogão) ou Descansar. Trabalhar gasta energia; cansado ele se distrai, faminto ataca um cliente. A mesma energia é a vida dele nas invasões. Na reserva a energia fica congelada. Novos zumbis: toque num cliente e escolha Infectar (${nextCap(s.level)}).`),
      sorts, h('div', { class: 'list' }, ...sorted.map(row))), { cls: 'staffpanel' });
  };

  // ---------- reputation ----------
  ZC.openReputation = function () {
    const s = ZC.state, r = s.rep, b = r.bonus && r.bonus.left > 0 ? r.bonus : null, perks = ZC.nextLevelPerks();
    const amb = ZC.ambience(), S = ZC.CFG.service;
    const log = r.log.slice().reverse().map(e => h('div', { class: 'replog ' + (e.d >= 0 ? 'up' : 'down') },
      h('b', {}, (e.d >= 0 ? '+' : '') + e.d.toFixed(2)), h('span', {}, e.why + (e.n > 1 ? ` (${e.n}x)` : ''))));
    ZC.openModal('Reputação', h('div', { class: 'rep' },
      h('p', { class: 'big' }, starRow(Math.round(ZC.rating()), 26), ` ${ZC.rating().toFixed(1)} de 5`),
      h('p', {}, h('b', {}, 'Reputação do serviço: '), r.score.toFixed(1), '. Sobe com clientes servidos depressa; cai com demora, falta de comida, café lotado e surtos de zumbis famintos. Mais estrelas trazem clientes com mais frequência e visitantes especiais.'),
      b ? h('p', {}, h('b', {}, 'Estrela temporária: '), `+${b.stars} (${b.why}), acaba em ${fmtTime(Math.ceil(b.left))}. Só uma vale por vez.`) : h('p', {}, h('b', {}, 'Estrela temporária: '), 'nenhuma agora. Um Crítico Gastronômico bem servido empresta meia estrela por alguns minutos.'),
      h('p', {}, h('b', {}, 'Nível do café: '), `${s.level} (permanente, não cai com atendimento ruim).` + (perks.length ? ` Próximo nível libera: ${perks.join(', ')}.` : '')),
      h('p', {}, h('b', {}, 'Ambiente: '), `${amb.toFixed(1)} de 5, vem da decoração e dos móveis colocados. Paciência dos clientes: ${Math.round(S.patienceBase + amb * S.patiencePerAmbience)}s.`),
      h('h3', {}, 'O que mudou por último'),
      log.length ? h('div', { class: 'list' }, ...log) : h('p', { class: 'hint' }, 'Nada ainda: sirva os primeiros clientes.'),
      h('div', { class: 'acts' },
        h('button', { class: 'btn', onclick: () => { ZC.setClosed(!s.cafe.closed); ZC.openReputation(); } }, s.cafe.closed ? 'Abrir o café' : 'Fechar a porta por um tempo'))));
  };

  // ---------- raids ----------
  ZC.openRaids = function () {
    const s = ZC.state, R = ZC.CFG.raid;
    const squad = ZC.team();
    const fit = z => !(z.revive > 0) && !z.away && ZC.zPct(z) >= R.minEnergy && !((ZC.zombieActor(z.id) || {}).state === 'collapsed');
    const chosen = new Set(squad.filter(fit).map(z => z.id));
    const picker = h('div', { class: 'picker' }, ...squad.map(z => {
      const ok = fit(z);
      const el = h('button', { class: 'pick' + (chosen.has(z.id) ? ' on' : '') + (ok ? '' : ' tired'), title: `${z.name} · ${kindName(z)} · força ${Math.round(ZC.zStr(z))}`,
        onclick: () => { if (!ok) return ZC.toast(z.revive > 0 ? `${z.name} está sendo reanimado.` : `${z.name} está cansado demais para lutar.`, 'bad'); chosen.has(z.id) ? chosen.delete(z.id) : chosen.add(z.id); el.classList.toggle('on'); } },
      ZC.portrait(z.sprite, z.tint, 52), h('small', {}, z.name), h('small', {}, z.revive > 0 ? 'reanimando' : `${Math.round(z.energy)}/${ZC.zMax(z)}`));
      return el;
    }));
    const targets = ZC.RAIDS.map(tg => {
      const locked = s.level < tg.lvl, wait = Math.max(0, Math.ceil((s.raidReady[tg.id] || 0) - s.clock)), D = ZC.RECIPES[tg.dish], isNew = !ZC.knows(tg.dish);
      return h('div', { class: 'row' + (locked ? ' locked' : '') },
        h('div', { class: 'foes' }, ...tg.enemies.slice(0, 5).map((e, i) => ZC.portrait(e, false, i ? 40 : 52))),
        h('div', { class: 'info' }, h('b', {}, tg.name),
          h('small', {}, `Nível ${tg.lvl} · chefe ${ZC.UNITS[tg.enemies[0]].name} + ${tg.enemies.length - 1} ${tg.enemies.length - 1 === 1 ? 'funcionário' : 'funcionários'}`),
          h('small', {}, locked ? `Libera no nível ${tg.lvl}` : h('span', {}, 'Vencendo o chefe: ', coin(`${tg.coins[0]}-${tg.coins[1]}`), ' ', tox(tg.toxin), ` · ${tg.xp} XP`)),
          locked ? null : h('small', { class: isNew ? 'cwhy ok' : '' }, `Comida: lote de ${D.name} (${D.servings} porções)` + (isNew ? ' · receita nova!' : ''))),
        ZC.foodThumb(tg.dish, 44),
        h('button', { class: 'btn buy', disabled: locked || wait > 0, onclick: () => {
          if (!chosen.size) return ZC.toast('Escolha pelo menos um zumbi.', 'bad');
          ZC.closeModal(); ZC.beginRaid(tg, [...chosen]);
        } }, wait > 0 ? `Espere ${fmtTime(wait)}` : 'Atacar!'));
    });
    ZC.openModal('Invasão', h('div', {},
      h('p', { class: 'hint' }, 'Quem vai para a invasão sai do café e luta com a energia que tem agora: ela é a vida dele lá. Derrote o chefe rival para vencer e trazer a comida. Recuar guarda só parte das moedas já tomadas. Quem cair precisa ser reanimado e volta fraco. O chef fica cuidando do café.'),
      h('h3', {}, 'Esquadrão (energia atual)'), squad.length ? picker : h('p', { class: 'hint' }, 'Você não tem zumbis na equipe. Infecte um cliente.'),
      h('h3', {}, 'Alvos'), h('div', { class: 'list' }, ...targets)));
  };

  ZC.showRaidResult = function (res) {
    const title = res.outcome === 'win' ? 'Vitória!' : res.outcome === 'retreat' ? 'Recuo' : 'Derrota';
    const L = res.loot, D = L && ZC.RECIPES[L.r];
    const body = h('div', { class: 'result' },
      h('p', { class: 'big ' + (res.outcome === 'win' ? 'good' : 'bad') }, res.outcome === 'win' ? 'O chefe rival caiu!' : res.outcome === 'retreat' ? 'Seus zumbis recuaram.' : 'Todos os seus zumbis caíram.'),
      res.coins || res.toxin || res.xp ? h('p', {}, res.outcome === 'win' ? 'Ganhou ' : 'Ficou com ', res.coins ? coin(res.coins) : null, ' ', res.toxin ? tox(res.toxin) : null, res.xp ? ` e ${res.xp} XP.` : '') : h('p', { class: 'hint' }, 'Nenhuma recompensa desta vez.'),
      L ? h('div', { class: 'recruit' }, ZC.foodThumb(L.r, 80),
        h('p', {}, h('b', {}, `Lote de ${D.name}`), ` (${L.servings} porções) ` + (L.pending ? 'ficou esperando vaga na geladeira.' : 'foi para a geladeira.') + (L.isNew ? ' Receita nova: estude o lote na geladeira para aprender!' : ' Você já conhece a receita: mande servir.'))) : null,
      res.recruit ? h('div', { class: 'recruit' }, ZC.portrait(res.recruit.sprite, true, 80),
        h('p', {}, h('b', {}, res.recruit.name), ` (${ZC.profileOf(res.recruit).name} zumbi) foi capturado e entrou ` + (res.recruit.role === 'reserve' ? 'na reserva.' : 'para a equipe!'))) : null,
      res.eaten ? h('p', { class: 'wi' }, ic('bone', 22), `Devoraram ${res.eaten} ${res.eaten > 1 ? 'corpos' : 'corpo'} e recuperaram energia.`) : null,
      res.back && res.back.length ? h('p', { class: 'hint' }, 'Voltaram: ' + res.back.map(b => `${b.name} (${b.energy}/${b.max})`).join(', ') + '. Ninguém volta descansado.') : null,
      res.knocked.length ? h('p', { class: 'hint' }, `Caíram e estão sendo reanimados (${fmtTime(ZC.CFG.raid.reviveTime)}): ${res.knocked.join(', ')}. Eles voltam com pouca energia.`) : null,
      h('button', { class: 'btn buy', onclick: () => ZC.closeModal() }, 'Voltar ao café'));
    ZC.openModal(title, body, { noClose: true, onClose: () => ZC.leaveRaid() });
  };

  // ---------- daily reward ("Frequent Fryer": it is earned by cooking on the day, not by opening the game) ----------
  ZC.checkDaily = function () {
    const s = ZC.state, dl = s.daily, key = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const now = new Date(), today = key(now);
    if (!dl || dl.last === today || ZC.modalOpen || ZC.view.scene !== 'cafe') return;
    const streak = dl.last === key(new Date(now.getTime() - 864e5)) ? (dl.streak % 7) + 1 : 1;
    const coins = 100 * streak * Math.max(1, Math.floor(s.level / 3)), toxin = streak === 7 ? 3 : streak >= 4 ? 1 : 0;
    const days = [1, 2, 3, 4, 5, 6, 7].map(d => h('div', { class: 'dday' + (d < streak ? ' past' : d === streak ? ' now' : '') },
      h('b', {}, 'Dia ' + d), d === 7 ? tox(3) : d >= 4 ? tox(1) : coin('+')));
    ZC.openModal('Fogão em dia', h('div', { class: 'daily' },
      h('p', {}, 'Prêmio por cozinhar hoje. Cozinhe pelo menos um lote por dia para aumentar a sequência; no dia 7 ela recomeça.'),
      h('div', { class: 'ddays' }, ...days),
      h('p', { class: 'big' }, 'Hoje (dia ' + streak + '): ', coin(coins), toxin ? [' ', tox(toxin)] : null),
      h('button', { class: 'btn buy', onclick: () => {
        if (dl.last === today) return ZC.closeModal();          // already taken (double tap, or another tab)
        dl.last = today; dl.streak = streak;
        ZC.addCoins(coins, 'fogão em dia'); if (toxin) ZC.addToxin(toxin, 'fogão em dia');
        ZC.save(); ZC.closeModal(); ZC.toast('Prêmio do dia resgatado!', 'good');
      } }, 'Resgatar')), { noClose: true });
  };
  ZC.afterBoot = function () { if (ZC.CFG.daily.trigger !== 'cook') setTimeout(() => ZC.checkDaily(), 700); };
  ZC.onCooked = function () { if (ZC.CFG.daily.trigger === 'cook') setTimeout(() => ZC.checkDaily(), 900); };

  // ---------- missions ----------
  ZC.openMissions = function () {
    const s = ZC.state;
    const rows = [];
    let firstOpen = -1;
    ZC.CHAPTERS.forEach((title, ch) => {
      const list = ZC.MISSIONS.filter(m => m.ch === ch);
      const done = list.filter(m => ZC.missionClaimed(m)).length;
      const unlocked = ch === 0 || ZC.MISSIONS.filter(m => m.ch === ch - 1).every(m => ZC.missionDone(m));
      rows.push(h('h3', { class: 'chap' + (unlocked ? '' : ' lockedc') }, title, h('small', { class: 'wi' }, unlocked ? ` ${done}/${list.length}` : [ic('lock', 14), ' termine o capítulo anterior'])));
      if (!unlocked) return;
      for (const m of list) {
        const val = ZC.missionValue(m), flag = s.missions[m.id] || 0, shown = Math.min(val, m.goal);
        const pct = Math.round(100 * shown / m.goal), isNum = m.stat === 'rating';
        const rew = h('span', { class: 'mrew' }, m.reward.coins ? coin(m.reward.coins) : null, m.reward.toxin ? tox(m.reward.toxin) : null, m.reward.xp ? h('span', { class: 'cost' }, m.reward.xp + ' XP') : null);
        rows.push(h('div', { class: 'mission' + (flag === 2 ? ' claimed' : flag === 1 ? ' ready' : '') },
          h('div', { class: 'minfo' }, h('b', {}, m.name), h('small', {}, m.desc),
            h('div', { class: 'mbar' }, h('i', { style: 'width:' + pct + '%' })),
            h('small', { class: 'mnum' }, isNum ? `${val.toFixed(1)} / ${m.goal}` : `${Math.min(Math.floor(val), m.goal)} / ${m.goal}`)),
          h('div', { class: 'mact' }, rew,
            flag === 2 ? h('span', { class: 'mdone wi' }, ic('check', 16), 'Resgatado')
              : h('button', { class: 'btn buy', disabled: flag !== 1, onclick: () => { if (ZC.claimMission(m)) { ZC.toast('Prêmio resgatado: ' + m.name, 'good'); ZC.openMissions(); } } }, flag === 1 ? 'Resgatar' : 'Em andamento'))));
        if (firstOpen < 0 && flag !== 2) firstOpen = rows.length - 1;
      }
    });
    ZC.openModal('Missões', h('div', {}, h('p', { class: 'hint' }, 'Cumpra objetivos para ganhar moedas, Toxina e XP. Cada capítulo abre quando você completa o anterior.'), ...rows), { cls: 'missionpanel' });
    const el = document.querySelector('#modal .mission.ready') || document.querySelectorAll('#modal .mission')[Math.max(0, firstOpen)];
    if (el) el.scrollIntoView({ block: 'center' });
  };

  // ---------- menu ----------
  ZC.openMenu = function (sure = false) {
    ZC.openModal('Menu', h('div', { class: 'menu' },
      h('h3', {}, 'Como jogar'),
      h('ul', {},
        h('li', {}, h('b', {}, 'Cozinhar: '), 'toque num fogão vazio e escolha a receita. Quem tem a função Cozinhar (o chef, no começo) busca os ingredientes e fica no fogão até o lote ficar pronto. Sem cozinheiro o preparo para, e depois de um tempo queima.'),
        h('li', {}, 'O lote pronto é levado ao balcão. Se não houver balcão livre ele fica no fogão e estraga. Cada balcão guarda um tipo de prato.'),
        h('li', {}, h('b', {}, 'Atender: '), 'quem tem a função Atender leva as porções do balcão aos clientes e lava os pratos. Mesa com prato sujo não recebe cliente.'),
        h('li', {}, h('b', {}, 'Funções: '), 'toque num funcionário para escolher Atender, Cozinhar ou Descansar. Arrastar um zumbi até um fogão também o põe para cozinhar.'),
        h('li', {}, h('b', {}, 'Energia: '), 'trabalhar cansa. Cansado, o zumbi se distrai; faminto, ele avisa e depois ataca um cliente: os outros fogem sem pagar e a reputação despenca. Mande descansar antes, ou dê um Cérebro (Toxina).'),
        h('li', {}, h('b', {}, 'Novos zumbis: '), 'toque num cliente para ver o que ele seria como zumbi e escolha Infectar (gasta Toxina). Cada tipo é bom numa coisa.'),
        h('li', {}, h('b', {}, 'Reputação: '), 'as estrelas no alto sobem com serviço rápido e caem com demora, falta de comida e surtos. Toque nelas para ver o motivo.'),
        h('li', {}, h('b', {}, 'Invasões: '), 'seus zumbis lutam com a energia que têm. Derrote o chefe rival para trazer moedas, Toxina e um lote de comida: estude-o na geladeira para aprender a receita.'),
        h('li', {}, h('b', {}, 'Mover móveis: '), 'segure o dedo (ou o clique) sobre um móvel, arraste até um quadrado livre e solte.'),
        h('li', {}, 'O jogo só anda com a aba aberta. Ao fechar ele salva; ao voltar continua de onde parou, sem ganhar nem perder nada no intervalo.'),
        h('li', {}, 'Arraste para mover a câmera, roda do mouse para zoom.')),
      h('div', { class: 'acts' },
        h('button', { class: 'btn', onclick: () => { ZC.toast(ZC.save() ? 'Jogo salvo.' : 'Não foi possível salvar neste navegador.', 'good'); } }, 'Salvar agora'),
        ZC.state.tutorialOff ? h('button', { class: 'btn', onclick: () => { ZC.state.tutorialOff = false; ZC.save(); ZC.closeModal(); } }, 'Mostrar as dicas de novo') : null,
        h('button', { class: 'btn', onclick: () => { const s = ZC.state; ZC.addCoins(5000, 'modo teste'); ZC.addToxin(20, 'modo teste'); if (s.level < 8) { s.level = 8; s.xp = 0; for (const [rid, r] of Object.entries(ZC.RECIPES)) if (r.learn === 'level' && r.lvl <= 8) ZC.learn(rid, true); } ZC.save(); ZC.toast('Modo teste: +5000 moedas, +20 toxina, nível 8.', 'good'); ZC.closeModal(); } }, 'Modo teste (moedas e nível 8)'),
        sure
          ? h('button', { class: 'btn buy', onclick: () => { ZC.resetGame(); ZC.view.selZ = null; ZC.resetRuntime(); ZC.fitCamera(); ZC.updateBanner(); ZC.closeModal(); ZC.save(); ZC.toast('Novo jogo!', 'good'); } }, 'Confirmar: apagar tudo')
          : h('button', { class: 'btn ghost', onclick: () => ZC.openMenu(true) }, 'Recomeçar jogo'))));
  };

  // ---------- edit bar ----------
  ZC.renderEditBar = function () {
    const v = ZC.view, bar = $('#editbar'), tb = $('#toolbar');
    if (v.scene !== 'cafe' || (v.mode !== 'edit' && !v.placing && !v.paintWall)) { bar.classList.add('hidden'); tb.classList.toggle('hidden', v.scene !== 'cafe'); return; }
    tb.classList.add('hidden'); bar.classList.remove('hidden');
    let kids;
    if (v.paintWall) {
      const st = ZC.WALLS.find(x => x.id === v.paintWall);
      kids = [h('span', {}, `Pintando com ${st.name}: toque em cada pedaço de parede.`),
        h('button', { class: 'btn', onclick: () => ZC.openShop('wall') }, 'Trocar tinta'),
        h('button', { class: 'btn buy', onclick: () => { v.paintWall = null; v.wallHover = null; ZC.renderEditBar(); } }, 'Concluir')];
    } else if (v.placing) {
      const it = ZC.ITEMS[v.placing.type];
      kids = [h('span', {}, v.placing.moving ? `Movendo ${it.name}: toque num quadrado verde` : [`Colocar ${it.name} (`, coin(it.price), '): toque num quadrado verde']),
        h('button', { class: 'btn ghost', onclick: () => ZC.cancelPlacing() }, 'Cancelar')];
    } else if (v.selected) {
      const o = v.selected, it = ZC.ITEMS[o.type];
      kids = [h('span', {}, h('b', {}, it.name)),
        h('button', { class: 'btn', onclick: () => ZC.beginMove(o) }, 'Mover'),
        h('button', { class: 'btn', onclick: () => ZC.trySell(o) }, 'Vender +', coin(Math.floor(it.price * ZC.CFG.economy.sellBack))),
        h('button', { class: 'btn ghost', onclick: () => { v.selected = null; ZC.renderEditBar(); } }, 'Ok')];
    } else {
      kids = [h('span', {}, 'Modo edição: toque num móvel para mover ou vender.'),
        h('button', { class: 'btn', onclick: () => ZC.openShop() }, 'Loja'),
        h('button', { class: 'btn buy', onclick: () => { v.mode = 'play'; ZC.renderEditBar(); } }, 'Concluir')];
    }
    bar.replaceChildren(...kids);
  };
})();
