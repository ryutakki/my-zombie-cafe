// Café simulation: grid, pathfinding, staff tasks (cook / transfer / serve / clean), customers.
// Everything here runs on simulated session time (dt). Nothing reads the wall clock, and drawing decides nothing.
(() => {
  const ZC = window.ZC, CFG = ZC.CFG;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, y) => x + ',' + y;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // runtime state. It is rebuilt on load from the save (see snapshotRuntime / resetRuntime).
  // seat: chair id -> customer aid · dirty: chair id -> { r, by, t } · claims: counter id -> portions promised to waiters
  // inbound: counter id -> { r, n } batches on their way · heading: stove id -> actor on its way · stir: stove id -> time last stirred
  const rt = ZC.rt = { customers: [], zombies: [], fx: [], seat: {}, dirty: {}, claims: {}, inbound: {}, heading: {}, washing: {}, stir: {}, badSeat: {}, notes: {}, pickups: [], spawnT: 2, time: 0, nextActor: 1, warnT: 0, door: 0 };
  let occ = new Map();   // every object (for clicking)
  let blk = new Map();   // objects that block walking

  const cafe = () => ZC.state.cafe;
  const inCafe = (x, y) => x >= 0 && y >= 0 && x < cafe().w && y < cafe().h;
  const catOf = o => ZC.ITEMS[o.type].cat;
  ZC.inCafe = inCafe;
  ZC.objAt = (x, y) => occ.get(key(x, y));
  ZC.objById = id => cafe().objects.find(o => o.id === id);
  ZC.cat = catOf;
  ZC.tileFree = (x, y) => inCafe(x, y) && !blk.has(key(x, y));
  const objsOf = cat => cafe().objects.filter(o => !o.hidden && catOf(o) === cat);
  ZC.objsOf = objsOf;
  // a message that may come up again and again: at most once every `every` seconds
  function note(k, msg, kind = 'bad', every = 20) { if ((rt.notes[k] == null ? -1e9 : rt.notes[k]) + every > rt.time) return; rt.notes[k] = rt.time; ZC.toast(msg, kind); }

  ZC.rebuildGrid = function () {
    occ = new Map(); blk = new Map();
    for (const o of cafe().objects) {
      if (o.hidden) continue;
      occ.set(key(o.x, o.y), o);
      if (!ZC.ITEMS[o.type].flat) blk.set(key(o.x, o.y), o);
    }
    // why a chair can not be used (shown on the chair): no table next to it, or nobody can walk up to it
    const c = cafe(), seen = floodFromDoor();
    rt.badSeat = {};
    for (const o of c.objects) {
      if (o.hidden || catOf(o) !== 'chair') continue;
      if (!ZC.tableFor(o)) rt.badSeat[o.id] = 'Precisa de uma mesa ao lado.';
      else if (!DIRS.some(([dx, dy]) => seen.has(key(o.x + dx, o.y + dy)))) rt.badSeat[o.id] = 'Ninguém consegue chegar aqui.';
    }
  };
  function floodFromDoor() {
    const c = cafe(), seen = new Set(), q = [];
    if (!blk.has(key(c.doorX, c.h - 1))) { seen.add(key(c.doorX, c.h - 1)); q.push([c.doorX, c.h - 1]); }
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of DIRS) {
      const nx = q[i][0] + dx, ny = q[i][1] + dy, k = key(nx, ny);
      if (seen.has(k) || !inCafe(nx, ny) || blk.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
    return seen;
  }

  function walkable(x, y, who, allow) {
    const c = cafe();
    if (allow && allow.has(key(x, y))) return true;
    if (inCafe(x, y)) return !blk.has(key(x, y));
    if (who === 'zombie') return false;
    if (y === c.h && x === c.doorX) return true;
    if (x === c.doorX && y > c.h && y <= c.h + 6) return true;
    if ((y === c.h + 7 || y === c.h + 8) && x >= -6 && x <= c.w + 6) return true;
    return false;
  }

  ZC.findPath = function (sx, sy, goals, who, allowGoals) {
    const goalSet = new Set(goals.map(g => key(g[0], g[1])));
    const start = key(sx, sy);
    if (goalSet.has(start)) return [];
    const allow = allowGoals ? goalSet : null;
    const prev = new Map([[start, null]]);
    const q = [[sx, sy]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !walkable(nx, ny, who, allow)) continue;
        prev.set(k, key(x, y));
        if (goalSet.has(k)) {
          const path = [];
          for (let cur = k; cur !== start; cur = prev.get(cur)) path.unshift(cur.split(',').map(Number));
          return path;
        }
        q.push([nx, ny]);
      }
    }
    return null;
  };

  function neighborsFree(o) {
    return DIRS.map(([dx, dy]) => [o.x + dx, o.y + dy]).filter(([x, y]) => inCafe(x, y) && !blk.has(key(x, y)));
  }
  const adjOf = o => () => (ZC.objById(o.id) && !o.hidden ? (neighborsFree(o).length ? neighborsFree(o) : null) : null);

  // paths are only searched when a target changes or the layout changes, never every frame
  function goTo(a, goals, allow) {
    a.goals = goals; a.allow = allow;
    let sx, sy, pre = [];
    if (a.path && a.path.length) { [sx, sy] = a.path[0]; pre = [[sx, sy]]; }
    else { sx = Math.round(a.x); sy = Math.round(a.y); if (sx !== a.x || sy !== a.y) pre = [[sx, sy]]; }
    const p = ZC.findPath(sx, sy, goals, a.kind, allow);
    if (p === null) { a.path = null; return false; }
    a.path = pre.concat(p);
    return true;
  }

  function step(a, dt) {
    if (!a.path || !a.path.length) { a.moving = false; return true; }
    const [tx, ty] = a.path[0];
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) a.dir = ZC.dirName(dx, dy);
    const sp = a.speed * dt;
    if (d <= sp) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += dx / d * sp; a.y += dy / d * sp; }
    a.moving = a.path.length > 0;
    return a.path.length === 0;
  }
  ZC.goActor = (a, goals) => goTo(a, goals, false);
  ZC.stepActor = step;

  // fx coords are tile-centre coordinates (x + 0.5, y + 0.5)
  ZC.fx = function (x, y, text, color = '#ffd84a') { rt.fx.push({ x, y, text, color, t: 0 }); };

  // ---------- seating ----------
  ZC.tableFor = function (chair) {
    for (const [dx, dy] of DIRS) {
      const o = occ.get(key(chair.x + dx, chair.y + dy));
      if (o && catOf(o) === 'table') return o;
    }
    return null;
  };
  // a seat = a chair next to a table that somebody can walk up to, with nobody on it and no dirty plate in front of it
  function freeSeats() {
    return objsOf('chair').filter(o => !rt.seat[o.id] && !rt.dirty[o.id] && !rt.badSeat[o.id] && ZC.tableFor(o));
  }
  ZC.seatCount = () => objsOf('chair').filter(o => ZC.tableFor(o) && !rt.badSeat[o.id]).length;

  // ---------- portions: every one of them is in exactly one place, and the counters below add up ----------
  // p_made (cooked) + p_loot (brought from raids) + p_base (old saves) = p_sold + p_waste + p_study + what is in play
  const pstat = (k, n) => { ZC.state.stats[k] = (ZC.state.stats[k] || 0) + n; };
  ZC.audit = function () {
    const s = ZC.state, st = s.stats, n = k => st[k] || 0;
    let play = 0;
    for (const o of cafe().objects) { if (o.servings) play += o.servings; if (o.cook && o.cook.st === 'ready') play += o.cook.servings; }
    for (const a of rt.zombies) if (a.carry) play += a.carry.kind === 'dish' ? 1 : a.carry.kind === 'batch' ? a.carry.servings : 0;
    play += rt.customers.filter(c => c.state === 'eat' && !c.gone).length;
    for (const b of s.fridge.concat(s.pendingLoot)) play += b.servings;
    const src = n('p_base') + n('p_made') + n('p_loot'), out = n('p_sold') + n('p_waste') + n('p_study') + n('p_gift');
    const seats = Object.values(rt.seat), carriers = rt.zombies.filter(a => a.carry && a.task == null && !a.held).length;
    return { src, out, play, ok: src === out + play && s.coins >= 0 && s.toxin >= 0 && new Set(seats).size === seats.length && carriers === 0 };
  };

  // ---------- kitchen ----------
  // a stove holds one batch: o.cook = { id, r, servings, total, cost, st: 'pending'|'cooking'|'ready'|'spoiled', progress, abandon, spoil, cook }
  const stirred = o => rt.stir[o.id] != null && rt.time - rt.stir[o.id] < 0.3;
  ZC.stoveStatus = function (o) {
    const c = o.cook; if (!c) return 'empty';
    if (c.st === 'cooking') return stirred(o) ? 'cooking' : 'paused';
    return c.st;
  };
  const stoveTier = o => ZC.ITEMS[o.type].tier || 1;
  // can this recipe be cooked on this stove right now? null = yes, otherwise the reason
  ZC.cookBlock = function (key, stove) {      // key: a recipe ('grogue') or one of its variants ('grogue:fancy')
    const D = ZC.DISHES[key], rid = D.base, R = ZC.RECIPES[rid], s = ZC.state;
    if (!ZC.knows(rid)) { const src = ZC.lootSource(rid); return src ? `Receita desconhecida: traga um lote de ${src.name} e estude na geladeira.` : `Aprendida no nível ${R.lvl}.`; }
    if (s.level < R.lvl) return `Precisa do nível ${R.lvl}.`;
    if (stove && stoveTier(stove) < (R.stove || 1)) return `Precisa de um fogão ${ZC.THEMES[(R.stove || 1) - 1].name} ou melhor.`;
    if (D.v && !ZC.variantOwned(rid, D.v)) return ZC.variantNeed(rid, D.v) || 'Variante ainda bloqueada.';
    return null;
  };
  // own rule: a broke café with no food anywhere may cook the cheapest known recipe for free
  ZC.rescueRecipe = function () {
    if (!CFG.economy.rescue) return null;
    const s = ZC.state, known = Object.keys(ZC.RECIPES).filter(r => ZC.knows(r) && ZC.RECIPES[r].lvl <= s.level);
    if (!known.length) return null;
    const cheap = known.reduce((a, b) => (ZC.RECIPES[a].cost <= ZC.RECIPES[b].cost ? a : b));
    if (s.coins >= ZC.RECIPES[cheap].cost) return null;
    const food = cafe().objects.some(o => o.servings > 0 || o.cook) || s.fridge.length || rt.zombies.some(a => a.carry && (a.carry.kind === 'dish' || a.carry.kind === 'batch'));
    return food ? null : cheap;
  };
  ZC.cookCost = key => (ZC.rescueRecipe() === key ? 0 : ZC.DISHES[key].cost);

  function finishBatch(stove) {
    const c = stove.cook, R = ZC.DISHES[c.r];
    c.st = 'ready'; c.progress = c.total; c.spoil = ZC.spoilTime(R) * ZC.chefFx('spoil');
    pstat('p_made', c.servings);
    ZC.fx(stove.x + 0.5, stove.y + 0.5, 'Pronto!', '#9dff6a'); ZC.save();
  }
  function updateStoves(dt) {
    const K = CFG.kitchen;
    for (const o of cafe().objects) {
      const c = o.cook; if (!c) continue;
      const R = ZC.DISHES[c.r];
      if (c.st === 'cooking') {
        if (stirred(o)) c.abandon = K.abandon;
        else {
          c.abandon -= dt;
          if (c.abandon <= 0) {
            c.st = 'spoiled'; c.why = 'burnt'; c.cook = null;
            ZC.stat('burnt'); ZC.repEvent('burnt');
            ZC.toast(`${R.name} queimou: ficou tempo demais sem cozinheiro.`, 'bad'); ZC.save();
          }
        }
      } else if (c.st === 'ready') {
        const before = c.spoil; c.spoil -= dt;
        if (before > K.spoilWarn && c.spoil <= K.spoilWarn) ZC.toast(`${R.name} vai estragar em ${K.spoilWarn}s! Leve ao balcão.`, 'bad');
        if (c.spoil <= 0) {
          c.st = 'spoiled'; c.why = 'spoiled';
          pstat('p_waste', c.servings); ZC.stat('spoiled'); ZC.repEvent('burnt');
          ZC.toast(`${R.name} estragou no fogão: ${c.servings} porções perdidas.`, 'bad'); ZC.save();
        }
      }
    }
  }
  // throwing a pot away is always an explicit action of the player
  ZC.cleanStove = function (o) {
    const c = o.cook; if (!c) return;
    if (c.st === 'pending') { const w = rt.zombies.find(a => a.task && a.task.kind === 'cook' && a.task.stove === o.id); if (w) { abortTask(w); return; } ZC.addCoins(c.cost, 'lote cancelado'); }
    if (c.st === 'ready') pstat('p_waste', c.servings);
    for (const a of rt.zombies) if (a.task && a.task.stove === o.id) abortTask(a);
    delete rt.heading[o.id];
    o.cook = null; ZC.save();
  };
  // spend toxin to finish a dish right now: 1 toxin per `secPerToxin` seconds left (at least 1)
  ZC.speedCost = o => Math.max(1, Math.ceil(Math.max(0, o.cook.total - o.cook.progress) / CFG.kitchen.secPerToxin));
  ZC.speedUp = function (o) {
    if (!o.cook || o.cook.st !== 'cooking') return false;
    if (!ZC.spendToxin(ZC.speedCost(o), 'acelerar preparo')) { ZC.toast('Toxina insuficiente.', 'bad'); return false; }
    finishBatch(o);
    return true;
  };

  // a counter keeps one recipe at a time. Eligible for a batch: same recipe, or empty and not promised to another recipe.
  function pickCounter(rid, from) {
    const ok = c => neighborsFree(c).length && (c.servings > 0 ? c.recipe === rid : (!rt.inbound[c.id] || rt.inbound[c.id].r === rid));
    const cs = objsOf('counter').filter(ok);
    if (!cs.length) return null;
    const same = cs.filter(c => c.servings > 0 || rt.inbound[c.id]);
    return from ? nearest(same.length ? same : cs, from) : (same[0] || cs[0]);
  }
  ZC.pickCounter = pickCounter;
  function inbound(counter, rid, d) {
    const e = rt.inbound[counter.id] || (rt.inbound[counter.id] = { r: rid, n: 0 });
    e.n += d;
    if (e.n <= 0) delete rt.inbound[counter.id];
  }
  const releaseInbound = b => { if (b.counter != null) { const c = ZC.objById(b.counter); if (c) inbound(c, b.r, -1); else delete rt.inbound[b.counter]; b.counter = null; } };
  const nearest = (list, a) => list.slice().sort((p, q) => (Math.abs(p.x - a.x) + Math.abs(p.y - a.y)) - (Math.abs(q.x - a.x) + Math.abs(q.y - a.y)))[0];
  function drain(a, n) { ZC.drain(ZC.zombieData(a.id), n); }
  function faceTo(a, o) { a.dir = ZC.dirName(o.x - Math.round(a.x), o.y - Math.round(a.y)); }

  // ---------- food in transit: it always ends up somewhere, and that somewhere is written down ----------
  // one portion goes back to a counter when it can; otherwise it is thrown away and counted as waste
  function returnDish(b) {
    const from = b.from != null && ZC.objById(b.from);
    const fits = c => c && !c.hidden && catOf(c) === 'counter' && (c.servings > 0 ? c.recipe === b.r : (!rt.inbound[c.id] || rt.inbound[c.id].r === b.r));
    const c = fits(from) ? from : objsOf('counter').find(fits);
    if (c) { c.recipe = b.r; c.servings = (c.servings || 0) + 1; return true; }
    pstat('p_waste', 1); ZC.stat('discarded');
    note('dishlost', 'Uma porção foi descartada: não havia balcão para devolvê-la.');
    return false;
  }
  // a whole batch is never lost: counter, else back on its stove, else the fridge (or the waiting list of the fridge)
  function stashBatch(b) {
    const stove = b.stove != null && ZC.objById(b.stove);
    if (stove && !stove.cook && !b.loot) {
      stove.cook = { id: b.id || ZC.newId(), r: b.r, servings: b.servings, total: ZC.DISHES[b.r].time, cost: 0, progress: ZC.DISHES[b.r].time, st: 'ready', spoil: Math.max(20, b.spoil || 60), xpDone: b.xpDone };
      return 'stove';
    }
    const c = pickCounter(b.r);
    if (c && !b.loot) { c.recipe = b.r; c.servings = (c.servings || 0) + b.servings; return 'counter'; }
    ZC.storeBatch({ r: b.r, servings: b.servings, from: b.src || null });
    return 'fridge';
  }
  // fridge: `fridgeSlots` batches per fridge; what does not fit waits in pendingLoot and is never thrown away
  ZC.fridgeCap = () => objsOf('fridge').length * CFG.kitchen.fridgeSlots;
  ZC.storeBatch = function (b) {
    const s = ZC.state, e = { id: ZC.newId(), r: b.r, servings: b.servings, from: b.from || null };
    if (s.fridge.length < ZC.fridgeCap()) s.fridge.push(e); else s.pendingLoot.push(e);
    return e;
  };
  ZC.flushPendingLoot = function () {
    const s = ZC.state;
    while (s.pendingLoot.length && s.fridge.length < ZC.fridgeCap()) s.fridge.push(s.pendingLoot.shift());
  };
  // studying an unknown batch uses the whole batch up, once, and the recipe stays in the book for ever
  ZC.studyBatch = function (b) {
    const s = ZC.state, i = s.fridge.indexOf(b);
    if (i < 0 || b.moving) return false;
    if (ZC.knows(b.r)) { ZC.toast('Você já conhece esta receita: não precisa estudar de novo.'); return false; }
    s.fridge.splice(i, 1);
    pstat('p_study', b.servings);
    ZC.learn(b.r); ZC.stat('studied'); ZC.flushPendingLoot(); ZC.save();
    return true;
  };
  // whatever an actor has in its hands goes to the right place when its job is cancelled
  function settleCarry(a) {
    const b = a.carry; a.carry = null;
    if (!b) return;
    if (b.kind === 'dish') returnDish(b);
    else if (b.kind === 'batch') { releaseInbound(b); stashBatch(b); }
    else if (b.kind === 'dirty') { const ch = ZC.objById(b.chair); if (ch && !rt.dirty[b.chair]) rt.dirty[b.chair] = { r: b.r, by: null, t: b.t || 0 }; }
  }

  // ---------- actors ----------
  function makeZombieActor(z) {
    const c = cafe();
    let x = z.x, y = z.y;
    if (x == null || !inCafe(x, y) || blk.has(key(x, y))) {
      const spots = [];
      for (let yy = 0; yy < c.h; yy++) for (let xx = 0; xx < c.w; xx++) if (!blk.has(key(xx, yy))) spots.push([xx, yy]);
      [x, y] = pick(spots);
    }
    return {
      aid: rt.nextActor++, id: z.id, kind: 'zombie', sprite: z.sprite, tint: false, acc: z.acc || null,
      x, y, dir: 'front', speed: 1.7 * ZC.zSpeed(z), state: z.energy <= 0 && !z.chef ? 'collapsed' : 'idle', wanderT: rand(1, 4),
      carry: null, task: null, pending: null, working: null, phase: Math.random() * 5,
    };
  }
  // actors exist only for staff that is in the café: not stored, not away on a raid, not knocked out
  ZC.syncZombies = function () {
    const ids = new Set(ZC.state.zombies.filter(ZC.staffActive).map(z => z.id));
    for (const a of rt.zombies) if (!ids.has(a.id)) { abortTask(a); abortPending(a); }
    rt.zombies = rt.zombies.filter(a => ids.has(a.id));
    for (const z of ZC.state.zombies) if (ids.has(z.id) && !rt.zombies.find(a => a.id === z.id)) rt.zombies.push(makeZombieActor(z));
  };
  ZC.zombieActor = id => rt.zombies.find(a => a.id === id);

  // ---------- task engine ----------
  // a task is a list of steps: { go } walk · { wait, tick, stop } stay · { do } act (returning false cancels the task)
  function abortTask(a) {
    const T = a.task;
    if (T) {
      const s = T.steps[T.i || 0];
      if (s && s.wait != null && s.t != null && s.onEnd) { s.onEnd(a); }
      a.task = null;
      if (T.onAbort) T.onAbort(a);
    }
    a.working = null; a.path = null; a.moving = false;
    settleCarry(a);
  }
  function abortPending(a) {
    if (!a.pending) return;
    const T = a.pending; a.pending = null;
    if (T.onAbort) T.onAbort(a);
  }

  function runTask(a, dt) {
    const T = a.task;
    if (T.i == null) T.i = 0;
    const s = T.steps[T.i];
    if (!s) { a.task = null; a.working = null; if (T.onDone) T.onDone(a); return; }
    if (s.go) {
      if (!s.started) {
        s.started = true;
        const g = s.go(a);
        if (!g || !g.length || !goTo(a, g, false)) { note('nopath', 'Um funcionário não achou caminho. Confira se há móveis bloqueando a passagem.'); abortTask(a); return; }
      }
      if (step(a, dt)) { a.moving = false; T.i++; }
      return;
    }
    if (s.wait != null) {
      if (s.t == null) {
        s.t = 0; a.path = null; a.moving = false;
        if (s.face) faceTo(a, s.face);
        a.working = s.work ? 'work' : null;
        if (s.onStart) s.onStart(a);
      }
      s.t += dt;
      if (s.tick) s.tick(dt);
      if (s.t >= s.wait || (s.stop && s.stop(a))) { a.working = null; if (s.onEnd) s.onEnd(a); T.i++; }
      return;
    }
    if (s.do) {
      if (s.do(a) === false) { abortTask(a); return; }
      T.i++;
    }
  }

  // the cook stays at the pot: the batch only advances while somebody is stirring it
  function stirStep(a, stove) {
    return { wait: Infinity, face: stove, work: true,
      tick: dt => {
        const c = stove.cook;
        if (!c || c.st !== 'cooking') return;
        rt.stir[stove.id] = rt.time; c.cook = a.id;
        c.progress += dt / CFG.kitchen.timeScale * ZC.chefFx('cook');
        drain(a, CFG.kitchen.stirDrain * dt);
        if (c.progress >= c.total) { finishBatch(stove); ZC.zXP(a.id, CFG.staff.xpCook); }
      },
      stop: () => !ZC.objById(stove.id) || stove.hidden || !stove.cook || stove.cook.st !== 'cooking' };
  }
  // lift a finished batch off the stove and walk it to a counter (appended to the running task)
  function takeBatch(a, stove, T) {
    const c = stove.cook;
    if (!c || c.st !== 'ready') return false;
    const counter = pickCounter(c.r, a);
    if (!counter) { note('nocounter', `Nenhum balcão livre para ${ZC.DISHES[c.r].name}. Compre outro balcão ou espere um esvaziar: o lote fica no fogão e pode estragar.`); return false; }
    stove.cook = null; delete rt.heading[stove.id];
    a.carry = { kind: 'batch', id: c.id, r: c.r, servings: c.servings, spoil: c.spoil, stove: stove.id, xpDone: c.xpDone, counter: counter.id };
    inbound(counter, c.r, +1);
    T.steps.push({ go: adjOf(counter) }, { wait: 0.6, face: counter }, { do: () => putBatch(a, counter) });
    return true;
  }
  function putBatch(a, counter) {
    const b = a.carry; if (!b) return false;
    releaseInbound(b);
    let c = counter;
    if (!ZC.objById(c.id) || c.hidden || (c.servings > 0 && c.recipe !== b.r)) c = pickCounter(b.r, a);
    if (!c) { a.carry = null; const where = stashBatch(b); note('nocounter2', where === 'stove' ? 'O balcão sumiu: o lote voltou para o fogão.' : 'O balcão sumiu: o lote foi guardado na geladeira.'); return true; }
    const R = ZC.DISHES[b.r];
    c.recipe = b.r; c.servings = (c.servings || 0) + b.servings;
    a.carry = null; drain(a, CFG.drain.transfer);
    if (!b.xpDone && !b.loot) ZC.addXP(Math.max(1, Math.round(R.xp * ZC.chefFx('xp'))));
    ZC.fx(c.x + 0.5, c.y + 0.5, `+${b.servings} porções`, '#9cff7a'); ZC.stat('stocked'); ZC.save();
    return true;
  }

  function makeCookTask(a, stove, rid, fridge) {
    const T = {
      kind: 'cook', stove: stove.id,
      onAbort() { const c = stove.cook; if (c && c.st === 'pending') { ZC.addCoins(c.cost, 'lote cancelado'); stove.cook = null; } },
      steps: [
        { go: adjOf(fridge) }, { wait: 1.2, face: fridge },
        { do: () => { a.carry = { kind: 'bag' }; } },
        { go: adjOf(stove) }, { wait: 3, face: stove, work: true },
        { do: () => {
          const c = stove.cook;
          if (!ZC.objById(stove.id) || !c || c.st !== 'pending') return false;
          c.st = 'cooking'; c.progress = 0; c.abandon = CFG.kitchen.abandon; c.cook = a.id;
          a.carry = null; drain(a, CFG.drain.cookStart);
          ZC.fx(stove.x + 0.5, stove.y + 0.5, 'Cozinhando!', '#ffd84a'); ZC.stat('cooked'); ZC.addMastery(ZC.DISHES[rid].base); ZC.save();
          if (ZC.onCooked) ZC.onCooked(rid);
        } },
      ],
    };
    T.steps.push(stirStep(a, stove), { do: () => { takeBatch(a, stove, T); } });
    return T;
  }
  // go back to a pot that was left alone
  function makeResumeTask(a, stove) {
    rt.heading[stove.id] = a.aid;
    const free = () => { if (rt.heading[stove.id] === a.aid) delete rt.heading[stove.id]; };
    const T = { kind: 'cook', stove: stove.id, onAbort: free, steps: [{ go: adjOf(stove) }, { do: () => { free(); if (!stove.cook || stove.cook.st !== 'cooking') return false; } }] };
    T.steps.push(stirStep(a, stove), { do: () => { takeBatch(a, stove, T); } });
    return T;
  }
  function makeCollectTask(a, stove) {
    rt.heading[stove.id] = a.aid;
    const free = () => { if (rt.heading[stove.id] === a.aid) delete rt.heading[stove.id]; };
    const T = { kind: 'collect', stove: stove.id, onAbort: free, onDone: free, steps: [] };
    T.steps = [{ go: adjOf(stove) }, { wait: 0.8, face: stove }, { do: () => { free(); return takeBatch(a, stove, T); } }];
    return T;
  }
  // a batch kept in the fridge (loot) is carried to a counter
  function makeStockTask(a, batch, fridge, counter) {
    inbound(counter, batch.r, +1);
    let held = true;
    const rel = () => { if (held) { held = false; inbound(counter, batch.r, -1); } };
    batch.moving = a.aid;
    const T = { kind: 'stock', onAbort() { rel(); if (batch.moving === a.aid) delete batch.moving; }, steps: [
      { go: adjOf(fridge) }, { wait: 0.8, face: fridge },
      { do: () => {
        const s = ZC.state, i = s.fridge.indexOf(batch);
        rel(); delete batch.moving;
        if (i < 0) return false;
        s.fridge.splice(i, 1); ZC.flushPendingLoot();
        a.carry = { kind: 'batch', r: batch.r, servings: batch.servings, loot: true, src: batch.from, counter: counter.id };
        inbound(counter, batch.r, +1);
      } },
      { go: adjOf(counter) }, { wait: 0.6, face: counter }, { do: () => putBatch(a, counter) },
    ] };
    return T;
  }

  function seatGoals(cu) {
    const ch = ZC.objById(cu.seat), t = ch && ZC.tableFor(ch);
    return ch ? neighborsFree(ch).concat(t ? neighborsFree(t) : []) : null;
  }

  // reserve a portion and a customer, fetch it, deliver it. The portion leaves the counter when it is picked up.
  function makeServeTask(a, cu, counter) {
    rt.claims[counter.id] = (rt.claims[counter.id] || 0) + 1;
    let claimed = true;
    const rel = () => { if (claimed) { claimed = false; rt.claims[counter.id] = Math.max(0, (rt.claims[counter.id] || 0) - 1); } };
    return {
      kind: 'serve',
      onAbort() { rel(); if (cu.waiter === a.aid) cu.waiter = null; },
      steps: [
        { go: adjOf(counter) }, { wait: 0.5, face: counter },
        { do: () => {
          rel();
          if (!counter.servings || cu.state !== 'wait') return false;
          const rid = counter.recipe; counter.servings--; if (!counter.servings) counter.recipe = null;
          a.carry = { kind: 'dish', r: rid, from: counter.id };
        } },
        { go: () => seatGoals(cu) },
        { do: () => {
          if (cu.state !== 'wait' || cu.gone || !a.carry) return false;
          cu.state = 'eat'; cu.dish = a.carry.r; cu.eatT = CFG.service.eat; cu.servedBy = a.id;
          cu.speed01 = clamp01(cu.patience / cu.maxPatience);
          a.carry = null; cu.waiter = null; drain(a, CFG.drain.serve); ZC.zXP(a.id, CFG.staff.xpServe);
          const ch = ZC.objById(cu.seat); if (ch) faceTo(a, ch);
        } },
      ],
    };
  }

  function makeCleanTask(a, chairId, sink) {
    rt.dirty[chairId].by = a.aid;
    let washing = false;
    return {
      kind: 'clean',
      onAbort() { const d = rt.dirty[chairId]; if (d && d.by === a.aid) d.by = null; },
      steps: [
        { go: () => { const ch = ZC.objById(chairId); if (!ch) return null; const t = ZC.tableFor(ch); const g = neighborsFree(ch).concat(t ? neighborsFree(t) : []); return g; } },
        { wait: 0.7 },
        { do: () => { const d = rt.dirty[chairId]; if (!d || d.by !== a.aid) return false; delete rt.dirty[chairId]; a.carry = { kind: 'dirty', r: d.r, chair: chairId, t: d.t }; } },
        { go: adjOf(sink) },
        { wait: 1.6, face: sink, work: true,
          onStart: () => { washing = true; rt.washing[sink.id] = (rt.washing[sink.id] || 0) + 1; },
          onEnd: () => { if (washing) { washing = false; rt.washing[sink.id] = Math.max(0, (rt.washing[sink.id] || 0) - 1); } } },
        { do: () => { a.carry = null; drain(a, CFG.drain.clean); ZC.stat('washed'); ZC.fx(sink.x + 0.5, sink.y + 0.5, 'Prato limpo!', '#9fe0ff'); } },
      ],
    };
  }

  // ---------- player commands ----------
  const usable = a => { const z = ZC.zombieData(a.id); return z && !a.held && a.state !== 'collapsed' && !a.mood && (z.chef || z.energy > 0) && (z.role === 'serve' || z.role === 'cook'); };
  const isIdle = a => usable(a) && !a.task && !a.pending && !(a.stun > 0);
  // an idle worker with one of the given roles (nearest to the target), or null when everybody is busy
  ZC.autoZombie = function (target, roles) {
    const list = rt.zombies.filter(a => isIdle(a) && (!roles || roles.includes(ZC.zombieData(a.id).role)));
    return list.length ? nearest(list, target) : null;
  };
  ZC.abortActor = a => { abortTask(a); abortPending(a); };
  function assign(a, T) { if (a.task) { abortPending(a); a.pending = T; } else a.task = T; a.stun = 0; }

  ZC.cmdCook = function (zid, stove, rid) {
    const a = ZC.zombieActor(zid), z = ZC.zombieData(zid), R = ZC.DISHES[rid];
    if (!a || !z || !R) return false;
    if (!usable(a)) { ZC.toast(`${z.name} não pode cozinhar agora.`, 'bad'); return false; }
    const why = ZC.cookBlock(rid, stove);
    if (why) { ZC.toast(why, 'bad'); return false; }
    if (ZC.stoveStatus(stove) !== 'empty') { ZC.toast('Esse fogão está ocupado.', 'bad'); return false; }
    const fridges = objsOf('fridge').filter(f => neighborsFree(f).length);
    if (!fridges.length) { ZC.toast('Você precisa de uma geladeira acessível para pegar ingredientes!', 'bad'); return false; }
    const cost = ZC.cookCost(rid);
    if (!ZC.spend(cost, 'lote de ' + R.name) && cost > 0) { ZC.toast('Moedas insuficientes!', 'bad'); return false; }   // charged once, here, and never again
    stove.cook = { id: ZC.newId(), r: rid, servings: R.servings, total: R.time, cost, progress: 0, st: 'pending', cook: zid };
    ZC.fx(stove.x + 0.5, stove.y + 0.5, cost ? `-${cost}` : 'Grátis', '#ff8a6a');
    assign(a, makeCookTask(a, stove, rid, nearest(fridges, a)));
    ZC.toast(`${z.name} vai cozinhar ${R.name}.`, 'good');
    return true;
  };

  // send somebody to a pot that is ready (carry it to a counter) or was left alone (go on stirring)
  ZC.cmdStove = function (zid, stove) {
    const a = ZC.zombieActor(zid), z = ZC.zombieData(zid), st = ZC.stoveStatus(stove);
    if (!a || !z || !usable(a)) return false;
    if (rt.heading[stove.id] && rt.heading[stove.id] !== a.aid) { ZC.toast('Já tem alguém indo para esse fogão.'); return false; }
    if (st === 'ready') {
      if (!pickCounter(stove.cook.r)) { ZC.toast('Nenhum balcão livre! Compre outro ou espere esvaziar.', 'bad'); return false; }
      assign(a, makeCollectTask(a, stove));
      ZC.toast(`${z.name} vai levar a comida ao balcão.`, 'good');
      return true;
    }
    if (st === 'paused') { assign(a, makeResumeTask(a, stove)); ZC.toast(`${z.name} vai continuar o preparo.`, 'good'); return true; }
    return false;
  };
  ZC.cmdCollect = ZC.cmdStove;

  // carry a batch from the fridge to a counter
  ZC.cmdStock = function (batch) {
    const counter = pickCounter(batch.r);
    if (batch.moving) { ZC.toast('Esse lote já está sendo levado.'); return false; }
    if (!counter) { ZC.toast(`Nenhum balcão livre para ${ZC.DISHES[batch.r].name}.`, 'bad'); return false; }
    const fridges = objsOf('fridge').filter(f => neighborsFree(f).length);
    if (!fridges.length) { ZC.toast('Nenhuma geladeira acessível.', 'bad'); return false; }
    const a = ZC.autoZombie(fridges[0]);
    if (!a) { ZC.toast('Todos estão ocupados agora. Tente de novo em instantes.', 'bad'); return false; }
    assign(a, makeStockTask(a, batch, nearest(fridges, a), counter));
    ZC.toast(`${ZC.zombieData(a.id).name} vai levar ${ZC.DISHES[batch.r].name} ao balcão.`, 'good');
    return true;
  };

  // ---------- automatic jobs, by role ----------
  // serve: customers first (the one about to give up first), then plates; a plate that waited too long goes first
  // cook: pots left alone, then finished batches. A waiter also carries finished batches when it has nothing else to do.
  function autoServe(a) {
    const waiting = rt.customers.filter(c => c.state === 'wait' && !c.waiter).sort((p, q) => p.patience - q.patience);
    if (!waiting.length) return false;
    const counters = objsOf('counter').filter(o => (o.servings || 0) - (rt.claims[o.id] || 0) > 0 && neighborsFree(o).length);
    if (!counters.length) return false;
    const cu = waiting[0];
    cu.waiter = a.aid;
    a.task = makeServeTask(a, cu, nearest(counters, a));
    return true;
  }
  function autoClean(a, onlyStale) {
    const sinks = objsOf('sink').filter(o => neighborsFree(o).length);
    if (!sinks.length) return false;
    const ids = Object.keys(rt.dirty).filter(id => !rt.dirty[id].by && (!onlyStale || rt.dirty[id].t > CFG.service.cleanMaxWait)).map(Number);
    const chairs = ids.map(id => ZC.objById(id)).filter(Boolean);
    if (!chairs.length) return false;
    const ch = nearest(chairs, a);
    a.task = makeCleanTask(a, ch.id, nearest(sinks, a));
    return true;
  }
  function autoKitchen(a, cook) {
    const stoves = objsOf('stove').filter(o => o.cook && neighborsFree(o).length && !rt.heading[o.id]);
    if (cook) {
      const alone = stoves.filter(o => o.cook.st === 'cooking' && !stirred(o));
      if (alone.length) { a.task = makeResumeTask(a, nearest(alone, a)); return true; }
    }
    const ready = stoves.filter(o => o.cook.st === 'ready' && pickCounter(o.cook.r)).sort((p, q) => p.cook.spoil - q.cook.spoil);
    if (ready.length) { a.task = makeCollectTask(a, ready[0]); return true; }
    return false;
  }
  function tryAuto(a, z) {
    if (z.role === 'cook') return autoKitchen(a, true);
    if (z.role === 'serve') return autoClean(a, true) || autoServe(a) || autoClean(a, false) || autoKitchen(a, false);
    return false;
  }

  function updateZombie(a, dt) {
    const z = ZC.zombieData(a.id);
    if (!z) return;
    if (a.hop > 0) a.hop = Math.max(0, a.hop - dt);
    if (a.held) return;
    if (a.stun > 0) { a.stun -= dt; return; }
    if (ZC.staffTick(a, z, dt)) return;      // collapsed, resting, distracted, attacking (js/staff.js)
    if (a.task) { runTask(a, dt); return; }
    if (a.pending) { a.task = a.pending; a.pending = null; return; }
    if (tryAuto(a, z)) return;
    if (step(a, dt)) {
      a.wanderT -= dt;
      if (a.wanderT <= 0) {
        a.wanderT = rand(3, 7);
        const opts = [];
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const x = Math.round(a.x) + dx, y = Math.round(a.y) + dy;
          if (inCafe(x, y) && !blk.has(key(x, y))) opts.push([x, y]);
        }
        if (opts.length) goTo(a, [pick(opts)], false);
      }
    }
  }

  // ---------- customers ----------
  // states: arrive (walking to the door) -> enter (to the reserved seat) -> wait -> eat -> leave
  //         leave also covers: café full, gave up waiting · flee = panic · infect = being turned
  // now and then a unique customer shows up (see js/specials.js): at most two at once, never two of the same kind,
  // and only when the café level and its reputation are good enough for them
  function pickSpecial() {
    if (Math.random() > 0.14) return null;
    const here = rt.customers.filter(cu => cu.special && cu.state !== 'leave').map(cu => cu.special);
    if (here.length >= 2) return null;
    const rep = ZC.rating();
    const pool = Object.entries(ZC.SPECIALS).filter(([id, sp]) => sp.minLevel <= ZC.state.level && (sp.minRep || 0) <= rep && !here.includes(id));
    const total = pool.reduce((n, [, sp]) => n + sp.weight, 0);
    if (!total) return null;
    let r = Math.random() * total;
    for (const [id, sp] of pool) if ((r -= sp.weight) < 0) return id;
    return null;
  }
  function pickLook(plain) {
    const sid = plain ? null : pickSpecial();
    if (sid) { const sp = ZC.SPECIALS[sid]; return { type: sp.sprite, sprite: sp.look, special: sid }; }
    // there are only five human pictures: prefer the one that is least on show, so the room does not fill with twins
    const human = () => { const use = {}; for (const c of rt.customers) use[c.sprite] = (use[c.sprite] || 0) + 1; const lo = Math.min(...ZC.HUMAN_LOOKS.map(l => use[l] || 0)); return pick(ZC.HUMAN_LOOKS.filter(l => (use[l] || 0) === lo)); };
    if (ZC.state.level >= 4 && ZC.rating() >= 3 && Math.random() < 0.05) return { type: 'squidman', sprite: human() };
    if (Math.random() < 0.08) return { type: 'pirate_leader', sprite: human() };
    return { type: pick(ZC.HUMANS), sprite: human() };
  }
  function makeCustomer(o) {
    return Object.assign({ aid: rt.nextActor++, kind: 'customer', alpha: 1, dir: 'front', speed: 1.9, state: 'arrive', seat: null, waiter: null, phase: Math.random() * 5 }, o);
  }
  function spawnCustomer(plain) {
    const c = cafe(), S = CFG.service;
    if (c.closed || rt.customers.length >= S.maxCustomers) return;
    if (!plain && rt.customers.filter(q => q.state === 'arrive').length >= S.maxArriving) return;
    const fromLeft = Math.random() < 0.5, look = pickLook(plain);
    const cu = makeCustomer({ type: look.type, sprite: look.sprite, special: look.special, stats: ZC.rollStats(look.type),
      x: fromLeft ? -6 : c.w + 6, y: c.h + 7 + (Math.random() < 0.5 ? 0 : 1), alpha: 0, dir: fromLeft ? 'right' : 'left' });
    const sp = cu.special && ZC.SPECIALS[cu.special];
    cu.maxPatience = cu.patience = (S.patienceBase + ZC.ambience() * S.patiencePerAmbience) * (sp && sp.patience || 1) * ZC.chefFx('patience');
    if (!goTo(cu, [[c.doorX, c.h]], false)) return;
    rt.customers.push(cu);
    if (sp) {
      ZC.toast(`${sp.name} chegou! ${sp.desc}`, 'good');
      for (let i = 0; i < (sp.fans || 0); i++) spawnCustomer(true);   // fans come along
    }
  }
  // at the door: reserve a free seat that can be reached, or give up
  function takeSeat(cu) {
    const c = cafe(), ok = [];
    for (const s of freeSeats()) if (ZC.findPath(c.doorX, c.h, [[s.x, s.y]], 'customer', true)) ok.push(s);
    if (!ok.length) return false;
    const seat = pick(ok);
    cu.seat = seat.id; rt.seat[seat.id] = cu.aid;
    return goTo(cu, [[seat.x, seat.y]], true);
  }
  const freeSeat = cu => { if (cu.seat != null && rt.seat[cu.seat] === cu.aid) delete rt.seat[cu.seat]; };
  const EXITS = () => { const c = cafe(); return [[-6, c.h + 7], [c.w + 6, c.h + 7], [-6, c.h + 8], [c.w + 6, c.h + 8]]; };

  function customerLeave(cu, angry, text) {
    freeSeat(cu);
    if (cu.waiter) { const w = rt.zombies.find(z => z.aid === cu.waiter); cu.waiter = null; if (w && w.task && w.task.kind === 'serve') abortTask(w); }
    cu.state = 'leave'; cu.angry = angry;
    if (angry || text) ZC.fx(cu.x + 0.5, cu.y - 0.2, text || 'Grrr!', angry ? '#ff6a5a' : '#ffd84a');
    cu.path = null;
    if (!goTo(cu, EXITS(), false)) cu.gone = true;
  }
  // panic: runs out without paying; whatever was on the plate is wasted
  function customerFlee(cu) {
    if (cu.state === 'leave' || cu.state === 'flee' || cu.state === 'infect' || cu.gone) return;
    if (cu.state === 'eat') { pstat('p_waste', 1); if (cu.seat != null && ZC.objById(cu.seat)) rt.dirty[cu.seat] = { r: cu.dish, by: null, t: 0 }; ZC.stat('unpaid'); }
    customerLeave(cu, false);
    cu.state = 'flee'; cu.speed = 3.4;
    ZC.fx(cu.x + 0.5, cu.y - 0.2, 'AAAH!', '#ff6a5a');
  }
  ZC.panic = function () { for (const cu of rt.customers) customerFlee(cu); };
  // a starving worker got to a customer (called by js/staff.js when the bite lands)
  ZC.outburst = function (a, z, cu) {
    if (cu.gone) return;
    if (cu.state === 'eat') { pstat('p_waste', 1); if (cu.seat != null && ZC.objById(cu.seat)) rt.dirty[cu.seat] = { r: cu.dish, by: null, t: 0 }; }
    freeSeat(cu);
    if (cu.waiter) { const w = rt.zombies.find(q => q.aid === cu.waiter); cu.waiter = null; if (w && w.task) abortTask(w); }
    cu.gone = true;
    ZC.fx(cu.x + 0.5, cu.y + 0.2, 'NHAC!', '#ff6a5a');
    const before = rt.customers.filter(q => !q.gone && q.state !== 'leave' && q.state !== 'flee').length;
    ZC.panic();
    ZC.repEvent('attack'); ZC.stat('outbursts');
    ZC.toast(`${z.name} devorou um cliente!` + (before ? ` ${before} ${before > 1 ? 'clientes fugiram' : 'cliente fugiu'} sem pagar.` : '') + ' A reputação caiu.', 'bad');
    ZC.save();
  };

  // the customer pays exactly once, when the meal ends. The price and the tip are two separate entries.
  function payUp(cu) {
    if (cu.paid) return;
    cu.paid = true;
    const sp = cu.special && ZC.SPECIALS[cu.special];
    const price = Math.round(ZC.priceOf(cu.dish) * (sp && sp.pay || 1) * ZC.chefFx('price'));
    const server = ZC.zombieData(cu.servedBy);
    const tip = Math.round(price * ZC.zTip(server) * (cu.speed01 || 0));
    ZC.addCoins(price, 'venda'); if (tip) ZC.addCoins(tip, 'gorjeta');
    pstat('p_sold', 1); if (tip) pstat('t_tips', tip);
    ZC.addXP(1); ZC.stat('earned', price + tip); ZC.stat('served');
    ZC.repEvent(cu.speed01 >= 0.5 ? 'fast' : 'ok');
    ZC.fx(cu.x + 0.5, cu.y + 0.2, `+${price}` + (tip ? ` +${tip} gorjeta` : ''), '#ffd84a');
    if (sp) {
      ZC.stat('specials');
      if (sp.xp) ZC.addXP(sp.xp);
      if (sp.mastery) ZC.addMastery(cu.dish);
      if (sp.toxin) { ZC.addToxin(sp.toxin, 'gorjeta de ' + sp.name); ZC.fx(cu.x + 0.5, cu.y - 0.2, `+${sp.toxin} Toxina`, '#9dff6a'); }
      if (sp.critic && cu.speed01 >= 0.5) ZC.grantBonusStars(CFG.rep.criticBonus.stars, CFG.rep.criticBonus.time, 'Crítica elogiosa');
    }
  }

  function updateCustomer(cu, dt) {
    if (cu.state === 'arrive') {
      cu.alpha = Math.min(1, cu.alpha + dt * 1.2);
      if (step(cu, dt)) {
        if (!cu.path || cafe().closed) { customerLeave(cu, false); return; }
        cu.alpha = 1;
        if (takeSeat(cu)) cu.state = 'enter';
        else {
          freeSeat(cu); cu.seat = null;
          if ((rt.notes.fullRep == null ? -1e9 : rt.notes.fullRep) + CFG.service.fullNote <= rt.time) { rt.notes.fullRep = rt.time; ZC.repEvent('full'); }
          ZC.stat('turned');
          customerLeave(cu, false, ZC.seatCount() ? 'Lotado!' : 'Sem lugar!');
        }
      }
    } else if (cu.state === 'enter') {
      if (step(cu, dt)) {
        if (!cu.path) { customerLeave(cu, false); return; }
        cu.state = 'wait';
        const ch = ZC.objById(cu.seat), t = ch && ZC.tableFor(ch);
        if (t) cu.dir = ZC.dirName(t.x - ch.x, t.y - ch.y);
      }
    } else if (cu.state === 'wait') {
      cu.patience -= dt;
      if (rt.food) cu.sawFood = true;
      if (cu.patience <= 0) {
        ZC.repEvent(cu.sawFood ? 'slow' : 'nofood'); ZC.stat('gaveup');
        customerLeave(cu, true, cu.sawFood ? 'Que demora!' : 'Sem comida!');
      }
    } else if (cu.state === 'eat') {
      cu.eatT -= dt;
      if (cu.eatT <= 0) {
        payUp(cu);
        rt.dirty[cu.seat] = { r: cu.dish, by: null, t: 0 };
        customerLeave(cu, false);
      }
    } else if (cu.state === 'infect') {
      cu.infT -= dt;
      if (cu.infT <= 0) finishInfect(cu);
    } else if (cu.state === 'leave' || cu.state === 'flee') {
      if (cu.path && cu.path.length <= 3) cu.alpha -= dt * 1.4;
      if (step(cu, dt) || cu.alpha <= 0) cu.gone = true;
    }
  }

  // one simulation step. dt is already capped by the caller (see ZC.tick in js/main.js).
  ZC.updateCafe = function (dt) {
    const s = ZC.state;
    s.clock += dt; rt.time += dt; rt.spawnT -= dt;
    ZC.repTick(dt);
    ZC.staffGlobalTick(dt);
    ZC.reviewTick(dt); ZC.socialTick(dt);
    // now and then a flask of toxin appears on the floor: tap it before it fades
    rt.pickups = rt.pickups.filter(p => (p.life -= dt) > 0);
    rt.pickT = (rt.pickT == null ? 45 : rt.pickT) - dt;
    if (rt.pickT <= 0) {
      rt.pickT = 70 + Math.random() * 80;
      const c = cafe(), spots = [];
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (!blk.has(key(x, y)) && !(x === c.doorX && y >= c.h - 1)) spots.push([x, y]);
      if (spots.length && rt.pickups.length < 2) { const [x, y] = pick(spots); rt.pickups.push({ x, y, life: 25 }); }
    }
    rt.missT = (rt.missT || 0) - dt;
    if (rt.missT <= 0) { rt.missT = 2; ZC.checkMissions(); }
    rt.food = cafe().objects.some(o => o.servings > 0);
    if (rt.spawnT <= 0) { const R = CFG.rep; rt.spawnT = Math.max(R.spawnMin, R.spawnBase - ZC.rating() * R.spawnPerStar) * rand(0.7, 1.3); spawnCustomer(); }
    for (const id in rt.dirty) rt.dirty[id].t = (rt.dirty[id].t || 0) + dt;
    for (const cu of rt.customers) updateCustomer(cu, dt);
    rt.customers = rt.customers.filter(c => !c.gone);
    for (const z of rt.zombies) updateZombie(z, dt);
    updateStoves(dt);
    { // the door swings open when somebody is about to walk through it
      const c = cafe(), dx = c.doorX, dy = c.h - 0.5;
      const near = rt.customers.some(a => Math.hypot(a.x - dx, a.y - dy) < 1.8 && a.state !== 'infect') || rt.zombies.some(a => !a.held && Math.hypot(a.x - dx, a.y - dy) < 1.1);
      rt.door += ((near ? 1 : 0) - rt.door) * Math.min(1, dt * 8);
      if (Math.abs(rt.door - (near ? 1 : 0)) < 0.01) rt.door = near ? 1 : 0;
    }
    for (const f of rt.fx) f.t += dt;
    rt.fx = rt.fx.filter(f => f.t < 1.6);
    rt.warnT -= dt;
    if (rt.warnT <= 0 && Object.keys(rt.dirty).length && !objsOf('sink').length) { rt.warnT = 40; ZC.toast('Sem pia! Pratos sujos estão ocupando as cadeiras.', 'bad'); }
    if (rt.warnT <= 0 && rt.customers.some(c => c.state === 'wait') && !rt.zombies.some(a => { const z = ZC.zombieData(a.id); return z && z.role === 'serve' && a.state !== 'collapsed'; })) { rt.warnT = 30; ZC.toast('Ninguém está atendendo! Toque num funcionário e escolha Atender.', 'bad'); }
  };

  ZC.collectPickup = function (p) {
    const i = rt.pickups.indexOf(p); if (i < 0) return;
    rt.pickups.splice(i, 1); ZC.addToxin(1, 'frasco no chão'); ZC.fx(p.x + 0.5, p.y + 0.5, '+1 Toxina', '#9dff6a'); ZC.save();
  };

  // ---------- infecting customers (the way to get new workers) ----------
  ZC.infectCost = cu => (cu && cu.special ? 5 : cu && cu.type === 'squidman' ? 4 : 2);
  ZC.canInfect = function (cu) {
    const s = ZC.state;
    if (cu.gone || cu.state === 'infect' || cu.state === 'leave' || cu.state === 'flee') return 'Esse cliente já está indo embora.';
    if (cu.state === 'arrive') return 'Espere o cliente entrar no café.';
    if (ZC.team().length >= ZC.maxZombies(s.level)) return `Equipe cheia: ${ZC.maxZombies(s.level)} zumbis no nível ${s.level}. Guarde um na reserva ou suba de nível.`;
    if (s.toxin < ZC.infectCost(cu)) return 'Toxina insuficiente.';
    return null;
  };
  // charge and turn in the same call: a second tap finds the customer already in the 'infect' state and does nothing
  ZC.startInfect = function (cu) {
    const why = ZC.canInfect(cu);
    if (why) { ZC.toast(why, 'bad'); return false; }
    if (!ZC.spendToxin(ZC.infectCost(cu), 'infectar')) return false;
    if (cu.waiter) { const w = rt.zombies.find(z => z.aid === cu.waiter); cu.waiter = null; if (w) abortTask(w); }
    if (cu.state === 'eat') { pstat('p_waste', 1); if (cu.seat != null) rt.dirty[cu.seat] = { r: cu.dish, by: null, t: 0 }; }
    cu.state = 'infect'; cu.infT = 1.7; cu.path = null; cu.alpha = 1;
    ZC.fx(cu.x + 0.5, cu.y + 0.2, 'Infectado!', '#9dff6a');
    ZC.save();
    return true;
  };
  function finishInfect(cu) {
    const s = ZC.state, c = cafe();
    freeSeat(cu);
    cu.gone = true;
    const used = new Set(s.zombies.map(z => z.name)), free = ZC.ZOMBIE_NAMES.filter(n => !used.has(n));
    // the recruit keeps what the customer was: same character, same look, the numbers shown on its card
    const z = ZC.makeStaff(cu.type, { id: ZC.newId(), name: free.length ? pick(free) : 'Zumbi ' + s.nextId, st: cu.stats });
    if (cu.special) { z.special = cu.special; z.acc = ZC.SPECIALS[cu.special].acc; }
    z.x = Math.round(cu.x); z.y = Math.round(cu.y);
    if (!inCafe(z.x, z.y)) { z.x = c.doorX; z.y = c.h - 1; }
    s.zombies.push(z);
    ZC.syncZombies();
    const a = ZC.zombieActor(z.id);
    if (a) {
      ZC.dropZombie(a, z.x, z.y);
      a.dir = cu.dir; a.stun = 0.4;
      ZC.fx(a.x + 0.5, a.y + 0.2, 'Novo zumbi!', '#ffd84a');
    }
    ZC.toast(`${z.name} (${ZC.profileOf(z).name} zumbi, ${ZC.profileOf(z).job.toLowerCase()}) agora trabalha para você!`, 'good');
    ZC.stat('infected'); ZC.save();
  }

  // put a zombie on the nearest free walkable tile of the café (used after dragging it around)
  ZC.dropZombie = function (a, tx, ty) {
    const c = cafe(); let best = null, bd = 1e9;
    const taken = new Set(rt.zombies.filter(z => z !== a).map(z => key(Math.round(z.x), Math.round(z.y))));
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      if (blk.has(key(x, y)) || taken.has(key(x, y))) continue;
      const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; best = [x, y]; }
    }
    if (best) { a.x = best[0]; a.y = best[1]; }
    a.path = null; a.moving = false; a.held = false; a.hop = 0.35; a.stun = 0.5; a.wanderT = 1.5;
    a.resting = false; a.restWalk = false;
  };
  ZC.nearFreeTile = function (x, y) { // for placing next to an object
    const c = cafe(); let best = null, bd = 1e9;
    for (let yy = 0; yy < c.h; yy++) for (let xx = 0; xx < c.w; xx++) { if (blk.has(key(xx, yy))) continue; const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; best = [xx, yy]; } }
    return best;
  };

  // the layout changed: everybody who is walking looks for a new way. No way = give the reservation back.
  ZC.repathAll = function () {
    for (const cu of rt.customers) {
      if (!cu.goals || cu.state === 'wait' || cu.state === 'eat' || cu.state === 'infect') continue;
      if (!goTo(cu, cu.goals, cu.allow)) {
        if (cu.state === 'enter' || cu.state === 'arrive') customerLeave(cu, false); else cu.gone = true;
      }
    }
    for (const a of rt.zombies) {
      if (a.task && a.path && a.path.length && a.goals && !goTo(a, a.goals, false)) abortTask(a);
      if (a.restWalk) { a.restWalk = false; a.path = null; }
    }
  };

  // ---------- building ----------
  function actorOn(x, y) {
    const on = a => Math.round(a.x) === x && Math.round(a.y) === y;
    return rt.customers.some(on) || rt.zombies.some(on);
  }
  const needsAccess = type => !['decor', 'table'].includes(ZC.ITEMS[type].cat);

  ZC.canPlace = function (type, x, y, moving) {
    const c = cafe(), it = ZC.ITEMS[type];
    if (!inCafe(x, y)) return false;
    const there = occ.get(key(x, y));
    if (there && there !== moving) return false;
    if (x === c.doorX && y === c.h - 1) return false;
    if (!it.flat && actorOn(x, y) && !(moving && moving.x === x && moving.y === y)) return false;
    const savedBlk = blk;
    blk = new Map(savedBlk);
    if (moving) blk.delete(key(moving.x, moving.y));
    const ghost = { x, y, type };
    if (!it.flat) blk.set(key(x, y), ghost);
    const seen = floodFromDoor();
    const reach = o => DIRS.some(([dx, dy]) => seen.has(key(o.x + dx, o.y + dy)));
    let ok = it.flat || !needsAccess(type) || reach(ghost);
    for (const o of blk.values()) {
      if (!ok) break;
      if (o !== ghost && needsAccess(o.type) && !reach(o)) ok = false;
    }
    blk = savedBlk;
    return ok;
  };

  ZC.placeObject = function (type, x, y, moving) {
    if (!ZC.canPlace(type, x, y, moving)) return false;
    if (moving) { moving.x = x; moving.y = y; moving.hidden = false; }
    else cafe().objects.push({ id: ZC.newId(), type, x, y });
    ZC.rebuildGrid(); ZC.repathAll(); ZC.flushPendingLoot(); ZC.save();
    return true;
  };

  ZC.objectBusy = function (o) {
    const cat = catOf(o);
    if (cat === 'chair' && (rt.seat[o.id] || rt.dirty[o.id])) return 'Tem um cliente ou um prato sujo aqui.';
    if (cat === 'table') {
      const t = rt.customers.some(cu => cu.state !== 'leave' && cu.state !== 'flee' && cu.seat != null && ZC.tableFor(ZC.objById(cu.seat) || {}) === o);
      if (t) return 'Tem clientes nesta mesa.';
      if (cafe().objects.some(ch => catOf(ch) === 'chair' && rt.dirty[ch.id] && ZC.tableFor(ch) === o)) return 'Tem prato sujo nesta mesa.';
    }
    if (cat === 'counter' && ((rt.claims[o.id] || 0) > 0 || rt.inbound[o.id])) return 'Um funcionário está vindo para este balcão.';
    if (cat === 'stove' && o.cook) return 'Esvazie o fogão antes.';
    if (cat === 'counter' && o.servings > 0) return 'O balcão ainda tem comida.';
    if (cat === 'sink' && (rt.washing[o.id] || 0) > 0) return 'Um zumbi está lavando pratos aqui.';
    return null;
  };
  // selling is refused when it would leave stored food without a fridge
  ZC.sellBlock = function (o) {
    const busy = ZC.objectBusy(o);
    if (busy) return busy;
    if (catOf(o) === 'fridge' && ZC.state.fridge.length > ZC.fridgeCap() - CFG.kitchen.fridgeSlots) return 'Esta geladeira guarda lotes de comida. Use-os antes de vender.';
    return null;
  };

  ZC.sellObject = function (o) {
    const c = cafe(), back = Math.floor(ZC.ITEMS[o.type].price * CFG.economy.sellBack);
    c.objects.splice(c.objects.indexOf(o), 1);
    delete rt.dirty[o.id];
    ZC.addCoins(back, 'venda de móvel');
    ZC.fx(o.x + 0.5, o.y + 0.5, `+${back}`, '#ffd84a');
    ZC.rebuildGrid(); ZC.repathAll(); ZC.save();
  };

  // growing the café keeps every object, every portion and every valid position
  ZC.expandCafe = function () {
    const s = ZC.state, c = s.cafe, cost = ZC.expandCost(s.expansions);
    if (c.w >= ZC.MAX_W && c.h >= ZC.MAX_H) { ZC.toast('O café já está no tamanho máximo.', 'bad'); return false; }
    if (!ZC.spend(cost, 'expansão')) { ZC.toast('Moedas insuficientes!', 'bad'); return false; }
    s.expansions++;
    c.w = Math.min(ZC.MAX_W, c.w + 1); c.h = Math.min(ZC.MAX_H, c.h + 1);
    // the door moved with the front wall: whoever was outside starts the walk again
    for (const cu of rt.customers) if (cu.state === 'arrive' || cu.state === 'enter' || cu.state === 'leave' || cu.state === 'flee') { freeSeat(cu); cu.gone = true; }
    rt.customers = rt.customers.filter(cu => !cu.gone);
    ZC.checkMissions();
    ZC.rebuildGrid(); ZC.repathAll(); ZC.save();
    return true;
  };
  ZC.setClosed = function (closed) {
    cafe().closed = !!closed;
    if (closed) for (const cu of rt.customers) if (cu.state === 'arrive') customerLeave(cu, false, 'Fechado!');
    ZC.toast(closed ? 'Café fechado: ninguém entra. Quem já está dentro termina de comer.' : 'Café aberto!', closed ? '' : 'good');
    ZC.save();
  };

  // ---------- saving and restoring what is going on right now ----------
  // Tasks are not saved. What they were holding is: portions in hands, customers in the room, dirty plates.
  ZC.snapshotRuntime = function () {
    for (const a of rt.zombies) { const z = ZC.zombieData(a.id); if (z) { z.x = Math.round(a.x); z.y = Math.round(a.y); } }
    const f = v => Math.round(v * 100) / 100;
    return {
      customers: rt.customers.filter(c => !c.gone && ['arrive', 'enter', 'wait', 'eat'].includes(c.state)).map(c => ({
        type: c.type, sprite: c.sprite, special: c.special, stats: c.stats, state: c.state, seat: c.seat, x: f(c.x), y: f(c.y), dir: c.dir,
        patience: f(c.patience), maxPatience: f(c.maxPatience), eatT: c.eatT, dish: c.dish, servedBy: c.servedBy, speed01: c.speed01, sawFood: c.sawFood })),
      dirty: Object.fromEntries(Object.entries(rt.dirty).map(([id, d]) => [id, { r: d.r, t: f(d.t || 0) }])),
      transit: rt.zombies.filter(a => a.carry && a.carry.kind !== 'bag').map(a => Object.assign({}, a.carry, { counter: null })),
      pickT: rt.pickT, spawnT: rt.spawnT,
    };
  };

  ZC.resetRuntime = function () {
    const s = ZC.state;
    for (const o of cafe().objects) { // a batch whose cook had not reached the stove yet: the ingredients are given back
      if (o.cook && o.cook.st === 'pending') { ZC.addCoins(o.cook.cost, 'lote cancelado'); o.cook = null; }
      delete o.hidden;
    }
    Object.assign(rt, { customers: [], zombies: [], fx: [], seat: {}, dirty: {}, claims: {}, inbound: {}, heading: {}, washing: {}, stir: {}, notes: {}, pickups: [], spawnT: 2, door: 0, time: 0 });
    for (const b of s.fridge) delete b.moving;
    ZC.rebuildGrid();
    const sv = s.rtsave; delete s.rtsave;
    if (sv) {
      if (sv.spawnT != null) rt.spawnT = sv.spawnT;
      if (sv.pickT != null) rt.pickT = sv.pickT;
      for (const [id, d] of Object.entries(sv.dirty || {})) if (ZC.objById(+id)) rt.dirty[id] = { r: d.r, by: null, t: d.t || 0 };
      for (const b of sv.transit || []) {   // what was being carried goes back to where it belongs
        if (b.kind === 'dish') returnDish(b);
        else if (b.kind === 'batch') stashBatch(b);
        else if (b.kind === 'dirty' && ZC.objById(b.chair) && !rt.dirty[b.chair]) rt.dirty[b.chair] = { r: b.r, by: null, t: b.t || 0 };
      }
      for (const o of sv.customers || []) {
        if (!o.type) o.type = ZC.PROFILES[o.sprite] ? o.sprite : 'pirate_zombie';              // saved before customers had a separate look
        if (!ZC.isChar(o.sprite)) o.sprite = ZC.HUMAN_LOOKS[(o.seat || 0) % ZC.HUMAN_LOOKS.length];
        const cu = makeCustomer(o), ch = cu.seat != null && ZC.objById(cu.seat), c = cafe();
        if (cu.state === 'arrive') { cu.seat = null; if (goTo(cu, [[c.doorX, c.h]], false)) rt.customers.push(cu); continue; }
        if (!ch || rt.seat[ch.id] || !ZC.tableFor(ch)) { if (cu.state === 'eat') pstat('p_waste', 1); continue; }
        if (cu.state === 'enter') { if (!goTo(cu, [[ch.x, ch.y]], true)) continue; }
        else { cu.x = ch.x; cu.y = ch.y; const t = ZC.tableFor(ch); cu.dir = ZC.dirName(t.x - ch.x, t.y - ch.y); }
        rt.seat[ch.id] = cu.aid;
        rt.customers.push(cu);
      }
    }
    ZC.flushPendingLoot();
    ZC.syncZombies();
    ZC.runtimeReady = true;
  };
})();
