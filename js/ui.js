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
    const sig = [s.coins, s.toxin, s.level, s.xp, r].join('|');
    if (sig === last) return;
    last = sig;
    $('#coins').textContent = s.coins;
    $('#toxin').textContent = s.toxin;
    $('#lvl').textContent = s.level;
    $('#xpfill').style.width = (s.level >= ZC.MAX_LEVEL ? 100 : Math.min(100, 100 * s.xp / ZC.xpForLevel(s.level))) + '%';
    $('#lvl').parentElement.title = s.level >= ZC.MAX_LEVEL ? 'Nível máximo' : `Nível ${s.level}: ${s.xp}/${ZC.xpForLevel(s.level)} XP`;
    const full = Math.floor(r), half = r - full >= 0.5;
    $('#rating').replaceChildren(...[0, 1, 2, 3, 4].map(i => ic(i < full ? 'star' : i === full && half ? 'starhalf' : 'starempty', 22)));
    $('#rating').title = `Avaliação ${r.toFixed(1)} — decoração atrai clientes mais rápido e mais pacientes`;
  };

  ZC.updateBanner = function () { $('#banner').classList.add('hidden'); };

  // ---------- action box (bottom of the screen): tapping a customer or a worker ----------
  ZC.closeCustomerMenu = function () { $('#cmenu').classList.add('hidden'); };
  function showActionBox(...kids) {
    const el = $('#cmenu');
    el.replaceChildren(h('div', { class: 'cbox' }, ...kids, h('button', { class: 'btn ghost cclose', title: 'Fechar', onclick: ZC.closeCustomerMenu }, ic('close', 16))));
    el.classList.remove('hidden');
  }
  ZC.openStoveMenu = function (o) {
    const R = ZC.RECIPES[o.cook.r], total = (o.cook.ready - o.cook.start) / 1000;
    const left = h('small', {}), fill = h('i', { style: 'width:0%' }), costBox = h('span', {});
    const btn = h('button', { class: 'btn buy', onclick: () => { if (ZC.speedUp(o)) { ZC.closeCustomerMenu(); } else paint(); } }, wi('clock', 18, 'Acelerar '), costBox);
    showActionBox(
      ZC.foodThumb(o.cook.r, 44),
      h('div', { class: 'cinfo' }, h('b', {}, R.name), left, h('div', { class: 'erow' }, h('div', { class: 'ebar' }, fill))),
      h('div', { class: 'cacts' }, btn));
    const box = $('#cmenu .cbox');
    function paint() {
      if (!document.body.contains(box) || ZC.stoveStatus(o) !== 'cooking') { if (document.body.contains(box)) ZC.closeCustomerMenu(); return false; }
      const sec = Math.max(0, Math.ceil((o.cook.ready - Date.now()) / 1000)), c = ZC.speedCost(o);
      left.textContent = 'Falta ' + fmtTime(sec);
      fill.style.width = Math.min(100, 100 * (1 - sec / Math.max(1, total))) + '%';
      costBox.replaceChildren(tox(c));
      btn.disabled = ZC.state.toxin < c;
      btn.title = ZC.state.toxin < c ? 'Toxina insuficiente' : 'Termina o prato agora';
      return true;
    }
    paint();
    const iv = setInterval(() => { if (!paint()) clearInterval(iv); }, 500);
  };
  ZC.openCustomerMenu = function (cu) {
    const cost = ZC.infectCost(cu), why = ZC.canInfect(cu);
    showActionBox(
      ZC.portrait(cu.sprite, cu.variant || false, 44),
      h('div', { class: 'cinfo' }, h('b', {}, cu.special ? ZC.SPECIALS[cu.special].name : cu.vip ? 'Cliente VIP' : 'Cliente'), h('small', {}, cu.special ? ZC.SPECIALS[cu.special].desc : cu.variant ? ZC.VARIANTS[cu.variant].name : ZC.UNITS[cu.sprite].name),
        why ? h('small', { class: 'cwhy' }, why) : h('small', { class: 'cwhy ok' }, 'Vira um zumbi e trabalha no café.')),
      h('div', { class: 'cacts' },
        h('button', { class: 'btn buy', disabled: !!why, onclick: () => { ZC.closeCustomerMenu(); ZC.startInfect(cu); } }, wi('syringe', 20, 'Infectar '), tox(cost))));
  };
  ZC.openZombieMenu = function (a, sure = false) {
    const z = ZC.zombieData(a.id), s = ZC.state; if (!z) return;
    const bar = h('div', { class: 'ebar' }, h('i', { style: `width:${z.energy}%;background:${z.energy > 50 ? '#7fe04f' : z.energy > 20 ? '#f2b630' : '#e2483a'}` }));
    const doing = a.state === 'collapsed' ? 'Desabou de cansaço!' : a.held ? 'Sendo carregado' : a.task ? 'Trabalhando' : 'Livre';
    const canFire = s.zombies.length > 1;
    showActionBox(
      ZC.portrait(z.sprite, z.tint, 44),
      h('div', { class: 'cinfo' }, h('b', {}, z.name),
        h('small', {}, `${ZC.unitName(z.sprite, z.tint)} · Vida ${ZC.ZOMBIE.hp} · Ataque ${ZC.ZOMBIE.atk} · ${doing}`),
        h('div', { class: 'erow' }, h('small', {}, z.energy <= 0 ? 'Apodrecido!' : `Energia ${z.energy}`), bar)),
      h('div', { class: 'cacts' },
        h('button', { class: 'btn', disabled: z.energy >= 100 || s.toxin < 1, title: 'Cérebro: energia cheia', onclick: () => { ZC.addToxin(-1); z.energy = 100; ZC.save(); ZC.openZombieMenu(a); } }, wi('brain', 20, 'Cérebro '), tox(1)),
        sure
          ? h('button', { class: 'btn buy', onclick: () => fireZombie(z) }, 'Confirmar: dispensar')
          : h('button', { class: 'btn ghost', disabled: !canFire, title: canFire ? '' : 'Você precisa de pelo menos um zumbi.', onclick: () => ZC.openZombieMenu(a, true) }, 'Dispensar')));
  };
  function fireZombie(z) {
    const s = ZC.state, i = s.zombies.indexOf(z);
    if (i < 0 || s.zombies.length <= 1) return;
    if (ZC.dragging() && ZC.dragging().a.id === z.id) ZC.dragCancel();
    s.zombies.splice(i, 1);
    ZC.syncZombies(); ZC.closeCustomerMenu(); ZC.save();
    ZC.toast(z.name + ' foi dispensado.', 'bad');
  }

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
      if (s.coins < st.price) return ZC.toast('Moedas insuficientes!', 'bad');
      ZC.addCoins(-st.price); s.owned[kind].push(id);
    }
    s.cafe[kind] = id;
    if (kind === 'wall') s.cafe.wallSeg = {};   // paint everything again: no individual overrides left
    ZC.save(); ZC.toast(`${st.name} aplicado!`, 'good'); ZC.openShop(kind);
  };
  // pick a wall paint and then tap single wall segments (this is where the dividing lines show up)
  ZC.beginWallPaint = function (id) {
    const s = ZC.state, st = ZC.WALLS.find(x => x.id === id);
    if (!s.owned.wall.includes(id)) {
      if (s.coins < st.price) return ZC.toast('Moedas insuficientes!', 'bad');
      ZC.addCoins(-st.price); s.owned.wall.push(id);
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
        h('p', {}, `Tamanho atual: ${c.w} × ${c.h}. ` + (max ? 'Tamanho máximo atingido.' : `Próximo: ${Math.min(ZC.MAX_W, c.w + 1)} × ${Math.min(ZC.MAX_H, c.h + 1)}.`)),
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
  ZC.openCookbook = function (stove, zid, spread = 0) {
    const s = ZC.state, rids = Object.keys(ZC.RECIPES), per = 6, spreads = Math.ceil(rids.length / per);
    const z = zid && ZC.zombieData(zid);
    const entry = rid => {
      const r = ZC.RECIPES[rid], locked = s.level < r.lvl, profit = r.servings * ZC.priceOf(rid) - r.cost, stars = ZC.masteryStars(rid), cnt = ZC.masteryCount(rid), nextAt = ZC.MASTERY.find(n => n > cnt);
      return h('div', { class: 'recipe' + (locked ? ' locked' : '') },
        h('div', { class: 'rpic' }, ZC.foodThumb(rid, 66)),
        h('div', { class: 'rinfo' },
          h('b', {}, r.name),
          h('small', { class: 'rdesc' }, r.desc),
          h('div', { class: 'rstats' }, wi('clock', 15, fmtTime(r.time)), wi('plate', 16, r.servings + ' porções'), wi('coin', 15, ZC.priceOf(rid) + ' cada'), h('span', {}, 'lucro ' + profit),
            h('span', { class: 'wi mast', title: `Cozinhou ${cnt}x. ` + (nextAt ? `Próxima estrela com ${nextAt}x (+15% por porção).` : 'Maestria máxima!') }, ...[0, 1, 2, 3, 4].map(i => ic(i < stars ? 'star' : 'starempty', 15)))),
          locked ? h('small', { class: 'lock wi' }, ic('lock', 14), `Nível ${r.lvl}`) :
            stove ? h('button', { class: 'btn buy', disabled: s.coins < r.cost, onclick: () => { if (ZC.cmdCook(zid, stove, rid)) ZC.closeModal(); } }, 'Cozinhar ', coin(r.cost)) : h('small', { class: 'lock' }, `Custa ${r.cost} moedas`)));
    };
    const chunk = rids.slice(spread * per, spread * per + per);
    const book = h('div', { class: 'book' },
      h('div', { class: 'bpage left' }, ...chunk.slice(0, 3).map(entry)),
      h('div', { class: 'bpage right' }, ...chunk.slice(3).map(entry)));
    const nav = h('div', { class: 'booknav' },
      h('button', { class: 'btn', disabled: spread === 0, onclick: () => ZC.openCookbook(stove, zid, spread - 1) }, ic('arrowl', 18)),
      h('span', {}, `Página ${spread + 1} de ${spreads}`),
      h('button', { class: 'btn', disabled: spread >= spreads - 1, onclick: () => ZC.openCookbook(stove, zid, spread + 1) }, ic('arrowr', 18)));
    const note = stove ? h('p', { class: 'bookhint' }, `${z ? z.name : 'Um zumbi'} vai buscar ingredientes na geladeira e cozinhar no fogão.`) : h('p', { class: 'bookhint' }, 'Para cozinhar: toque num fogão vazio. Se todos os zumbis estiverem ocupados, arraste um até o fogão.');
    ZC.openModal('Livro de Receitas', h('div', {}, note, book, nav), { cls: 'bookpanel', onClose: () => { const a = zid && ZC.zombieActor(zid); if (a && a.stun > 5) a.stun = 0.2; } });
  };

  // ---------- zombies ----------
  const nextCap = lv => { const nl = [5, 10, 15, 18, 20].find(x => x > lv); return nl ? ` (próximo zumbi no nível ${nl})` : ' (máximo por enquanto)'; };
  ZC.openZombies = function () {
    const s = ZC.state, cap = ZC.maxZombies(s.level);
    const rows = s.zombies.map(z => {
        const bar = h('div', { class: 'ebar' }, h('i', { style: `width:${z.energy}%;background:${z.energy > 50 ? '#7fe04f' : z.energy > 20 ? '#f2b630' : '#e2483a'}` }));
      return h('div', { class: 'row' },
        ZC.portrait(z.sprite, z.tint, 64),
        h('div', { class: 'info' },
          h('b', {}, z.name), h('small', {}, `${ZC.unitName(z.sprite, z.tint)} · Vida ${ZC.ZOMBIE.hp} · Ataque ${ZC.ZOMBIE.atk}`),
          h('div', { class: 'erow' }, h('small', {}, z.energy <= 0 ? 'Apodrecido!' : `Energia ${z.energy}`), bar)),
        h('div', { class: 'acts' },
          h('button', { class: 'btn', disabled: z.energy >= 100 || s.toxin < 1, title: 'Cérebro: energia cheia', onclick: () => { ZC.addToxin(-1); z.energy = 100; ZC.save(); ZC.openZombies(); } }, 'Cérebro ', tox(1)),
          null));
    });
    ZC.openModal(`Zumbis (${s.zombies.length}/${cap})`, h('div', {},
      h('p', { class: 'hint' }, 'Zumbis servem e lavam pratos sozinhos. Para cozinhar, toque no fogão; se estiverem todos ocupados, segure um zumbi, arraste até o fogão e solte. Trabalhar gasta energia; com 0 eles desabam. Recupere energia com Cérebro ou deixando-os devorar corpos nas invasões.'),
      h('div', { class: 'list' }, ...rows),
      h('h3', {}, 'Novos zumbis'),
      h('p', { class: 'hint' }, `Não dá mais para contratar: toque num cliente do café e escolha Infectar (custa Toxina). Humanos capturados nas invasões também viram zumbis. Limite: ${s.zombies.length}/${cap} no nível ${s.level}${nextCap(s.level)}.`)));
  };

  // ---------- raids ----------
  ZC.openRaids = function () {
    const s = ZC.state;
    const chosen = new Set(s.zombies.filter(z => z.energy >= 20).map(z => z.id));
    const picker = h('div', { class: 'picker' }, ...s.zombies.map(z => {
      const el = h('button', { class: 'pick' + (chosen.has(z.id) ? ' on' : '') + (z.energy < 20 ? ' tired' : ''), title: `${z.name} · energia ${z.energy}`,
        onclick: () => { if (z.energy < 20) return ZC.toast(`${z.name} está cansado demais.`, 'bad'); chosen.has(z.id) ? chosen.delete(z.id) : chosen.add(z.id); el.classList.toggle('on'); } },
      ZC.portrait(z.sprite, z.tint, 52), h('small', {}, z.name));
      return el;
    }));
    const targets = ZC.RAIDS.map(tg => {
      const locked = s.level < tg.lvl, wait = Math.max(0, Math.ceil(((s.raidReady[tg.id] || 0) - Date.now()) / 1000));
      return h('div', { class: 'row' + (locked ? ' locked' : '') },
        h('div', { class: 'foes' }, ...tg.enemies.slice(0, 5).map(e => ZC.portrait(e, false, 44))),
        h('div', { class: 'info' }, h('b', {}, tg.name),
          h('small', {}, `Restaurante nível ${tg.lvl} · ${tg.enemies.length} funcionários`),
          h('small', {}, locked ? `Libera no nível ${tg.lvl}` : h('span', {}, 'Prêmio: ', coin(`${tg.coins[0]}-${tg.coins[1]}`), ' ', tox(tg.toxin), ` · ${tg.xp} XP + humano capturado`))),
        h('button', { class: 'btn buy', disabled: locked || wait > 0, onclick: () => {
          if (!chosen.size) return ZC.toast('Escolha pelo menos um zumbi.', 'bad');
          ZC.closeModal(); ZC.beginRaid(tg, [...chosen]);
        } }, wait > 0 ? `Espere ${fmtTime(wait)}` : 'Atacar!'));
    });
    ZC.openModal('Invasão', h('div', {},
      h('p', { class: 'hint' }, 'Escolha o esquadrão e o restaurante inimigo. Lá, toque nos seus zumbis para mandá-los entrar: cada um ataca um funcionário. Toque num funcionário para todos focarem nele. Os inimigos revidam (do mesmo nível, batem 20% mais fraco que você). Zumbis feridos devoram os corpos e se curam. Se vencer, um humano capturado vira zumbi.'),
      h('h3', {}, 'Esquadrão'), picker, h('h3', {}, 'Alvos'), h('div', { class: 'list' }, ...targets)));
  };

  ZC.showRaidResult = function (res) {
    const body = h('div', { class: 'result' },
      h('p', { class: 'big ' + (res.win ? 'good' : 'bad') }, res.win ? 'Seus zumbis venceram!' : 'Seus zumbis foram derrotados.'),
      res.win ? h('p', {}, 'Ganhou ', coin(res.coins), ' ', tox(res.toxin), ` e ${res.xp} XP.`) : null,
      res.recruit ? h('div', { class: 'recruit' }, ZC.portrait(res.recruit.sprite, true, 90),
        h('p', {}, h('b', {}, res.recruit.name), ` (${ZC.unitName(res.recruit.sprite, true)}) entrou para a equipe!`)) : null,
      res.win && !res.recruit ? h('p', { class: 'hint' }, 'Sem espaço para novos zumbis (limite do nível).') : null,
      res.eaten ? h('p', { class: 'wi' }, ic('bone', 22), `Devoraram ${res.eaten} ${res.eaten > 1 ? 'corpos' : 'corpo'}: +${res.energy} de energia no café.`) : null,
      res.knocked.length ? h('p', { class: 'hint' }, `Nocauteados (-40 energia): ${res.knocked.join(', ')}`) : null,
      h('button', { class: 'btn buy', onclick: () => ZC.closeModal() }, 'Voltar ao café'));
    ZC.openModal(res.win ? 'Vitória!' : 'Derrota', body, { noClose: true, onClose: () => ZC.leaveRaid() });
  };

  // ---------- daily reward ----------
  ZC.checkDaily = function () {
    const s = ZC.state, dl = s.daily, key = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const now = new Date(), today = key(now);
    if (!dl || dl.last === today || ZC.modalOpen) return;
    const streak = dl.last === key(new Date(now.getTime() - 864e5)) ? (dl.streak % 7) + 1 : 1;
    const coins = 100 * streak * Math.max(1, Math.floor(s.level / 3)), toxin = streak === 7 ? 3 : streak >= 4 ? 1 : 0;
    const days = [1, 2, 3, 4, 5, 6, 7].map(d => h('div', { class: 'dday' + (d < streak ? ' past' : d === streak ? ' now' : '') },
      h('b', {}, 'Dia ' + d), d === 7 ? tox(3) : d >= 4 ? tox(1) : coin('+')));
    ZC.openModal('Recompensa diária', h('div', { class: 'daily' },
      h('p', {}, 'Volte todo dia para aumentar a sequência. No dia 7 ela recomeça.'),
      h('div', { class: 'ddays' }, ...days),
      h('p', { class: 'big' }, 'Hoje (dia ' + streak + '): ', coin(coins), toxin ? [' ', tox(toxin)] : null),
      h('button', { class: 'btn buy', onclick: () => { ZC.addCoins(coins); if (toxin) ZC.addToxin(toxin); dl.last = today; dl.streak = streak; ZC.save(); ZC.closeModal(); ZC.toast('Recompensa diária resgatada!', 'good'); } }, 'Resgatar')), { noClose: true });
  };

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
  ZC.openMenu = function () {
    ZC.openModal('Menu', h('div', { class: 'menu' },
      h('h3', {}, 'Como jogar'),
      h('ul', {},
        h('li', {}, h('b', {}, 'Cozinhar: '), 'toque num fogão e escolha a receita: um zumbi livre vai sozinho. Se todos estiverem ocupados, segure um zumbi, arraste até o fogão e solte (ele larga o que estava fazendo).'),
        h('li', {}, 'Quando a comida ficar pronta, toque no fogão de novo para um zumbi levar ao balcão. Comida pronta estraga se demorar.'),
        h('li', {}, h('b', {}, 'Novos zumbis: '), 'toque num cliente e escolha Infectar (gasta Toxina). Ele vira zumbi e trabalha no café.'),
        h('li', {}, 'Clientes chegam pela rua, sentam e esperam. Zumbis livres levam a comida do balcão até eles.'),
        h('li', {}, 'Depois de comer, o prato sujo fica na mesa: zumbis livres levam para a pia. Sem pia, as cadeiras ficam bloqueadas!'),
        h('li', {}, 'Decoração, mesas e móveis melhores aumentam a avaliação (estrelas): mais clientes e mais paciência.'),
        h('li', {}, 'Invasões dão moedas, Toxina e novos zumbis; seus zumbis devoram os corpos e se curam.'),
        h('li', {}, h('b', {}, 'Missões: '), 'abra Missões na barra da esquerda: cumpra objetivos para ganhar moedas, Toxina e XP.'),
        h('li', {}, h('b', {}, 'Mover móveis: '), 'segure o dedo (ou o clique) sobre um móvel: ele sobe com um pulinho. Arraste até um quadrado livre e solte.'),
        h('li', {}, 'Arraste para mover a câmera, roda do mouse para zoom.')),
      h('div', { class: 'acts' },
        h('button', { class: 'btn', onclick: () => { ZC.save(); ZC.toast('Jogo salvo.', 'good'); } }, 'Salvar agora'),
        h('button', { class: 'btn', onclick: () => { const s = ZC.state; s.coins += 5000; s.toxin += 20; if (s.level < 8) { s.level = 8; s.xp = 0; } ZC.save(); ZC.toast('Modo teste: +5000 moedas, +20 toxina, nível 8.', 'good'); ZC.closeModal(); } }, 'Modo teste (liberar tudo)'),
        h('button', { class: 'btn ghost', onclick: () => { if (confirm('Apagar o progresso e começar do zero?')) { ZC.resetGame(); ZC.view.selZ = null; ZC.resetRuntime(); ZC.fitCamera(); ZC.updateBanner(); ZC.closeModal(); ZC.toast('Novo jogo!', 'good'); } } }, 'Recomeçar jogo'))));
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
        h('button', { class: 'btn', onclick: () => ZC.trySell(o) }, 'Vender +', coin(Math.floor(it.price / 2))),
        h('button', { class: 'btn ghost', onclick: () => { v.selected = null; ZC.renderEditBar(); } }, 'Ok')];
    } else {
      kids = [h('span', {}, 'Modo edição: toque num móvel para mover ou vender.'),
        h('button', { class: 'btn', onclick: () => ZC.openShop() }, 'Loja'),
        h('button', { class: 'btn buy', onclick: () => { v.mode = 'play'; ZC.renderEditBar(); } }, 'Concluir')];
    }
    bar.replaceChildren(...kids);
  };
})();
