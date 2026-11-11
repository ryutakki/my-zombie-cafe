// Café simulation: grid, pathfinding, zombie tasks (cook / collect / serve / clean), customers.
(() => {
  const ZC = window.ZC;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, y) => x + ',' + y;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // runtime-only state (not saved)
  const rt = ZC.rt = { customers: [], zombies: [], fx: [], seat: {}, dirty: {}, claims: {}, washing: {}, spawnT: 2, time: 0, nextActor: 1, warnT: 0, door: 0 };
  let occ = new Map();   // every object (for clicking)
  let blk = new Map();   // objects that block walking

  const cafe = () => ZC.state.cafe;
  const inCafe = (x, y) => x >= 0 && y >= 0 && x < cafe().w && y < cafe().h;
  const catOf = o => ZC.ITEMS[o.type].cat;
  ZC.inCafe = inCafe;
  ZC.objAt = (x, y) => occ.get(key(x, y));
  ZC.objById = id => cafe().objects.find(o => o.id === id);
  ZC.cat = catOf;
  const objsOf = cat => cafe().objects.filter(o => !o.hidden && catOf(o) === cat);

  ZC.rebuildGrid = function () {
    occ = new Map(); blk = new Map();
    for (const o of cafe().objects) {
      if (o.hidden) continue;
      occ.set(key(o.x, o.y), o);
      if (!ZC.ITEMS[o.type].flat) blk.set(key(o.x, o.y), o);
    }
  };

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
  function freeSeats() {
    return objsOf('chair').filter(o => !rt.seat[o.id] && !rt.dirty[o.id] && ZC.tableFor(o));
  }
  ZC.seatCount = () => objsOf('chair').filter(o => ZC.tableFor(o)).length;

  // ---------- cooking state ----------
  ZC.stoveStatus = function (o) {
    if (!o.cook) return 'empty';
    if (o.cook.pending) return 'pending';
    const now = Date.now();
    if (now < o.cook.ready) return 'cooking';
    if (now < o.cook.ready + ZC.spoilTime(ZC.RECIPES[o.cook.r]) * 1000) return 'ready';
    return 'spoiled';
  };
  ZC.collectPickup = function (p) {
    const i = rt.pickups.indexOf(p); if (i < 0) return;
    rt.pickups.splice(i, 1); ZC.addToxin(1); ZC.fx(p.x + 0.5, p.y + 0.5, '+1 Toxina', '#9dff6a'); ZC.save();
  };
  ZC.cleanStove = function (o) { o.cook = null; ZC.save(); };
  // spend toxin to finish a dish right now: 1 toxin per 4 minutes left (at least 1)
  ZC.speedCost = o => Math.max(1, Math.ceil(Math.max(0, o.cook.ready - Date.now()) / 1000 / 240));
  ZC.speedUp = function (o) {
    if (ZC.stoveStatus(o) !== 'cooking') return false;
    const c = ZC.speedCost(o);
    if (ZC.state.toxin < c) { ZC.toast('Toxina insuficiente.', 'bad'); return false; }
    ZC.addToxin(-c); o.cook.ready = Date.now();
    ZC.fx(o.x + 0.5, o.y + 0.5, 'Pronto!', '#9dff6a'); ZC.save();
    return true;
  };

  function pickCounter(rid) {
    const cs = objsOf('counter');
    return cs.find(c => c.recipe === rid && c.servings > 0) || cs.find(c => !c.servings) || null;
  }
  const nearest = (list, a) => list.slice().sort((p, q) => (Math.abs(p.x - a.x) + Math.abs(p.y - a.y)) - (Math.abs(q.x - a.x) + Math.abs(q.y - a.y)))[0];
  function drain(a, n) { const z = ZC.zombieData(a.id); if (z) z.energy = Math.max(0, z.energy - n); }
  function faceTo(a, o) { a.dir = ZC.dirName(o.x - Math.round(a.x), o.y - Math.round(a.y)); }

  // ---------- actors ----------
  function makeZombieActor(z) {
    const c = cafe(), spots = [];
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (!blk.has(key(x, y))) spots.push([x, y]);
    const [x, y] = pick(spots);
    return {
      aid: rt.nextActor++, id: z.id, kind: 'zombie', sprite: z.sprite, tint: z.tint,
      x, y, dir: 'front', speed: 1.7 * ZC.UNITS[z.sprite].speed, state: 'idle', wanderT: rand(1, 4),
      carry: null, task: null, pending: null, working: null, phase: Math.random() * 5,
    };
  }
  ZC.syncZombies = function () {
    const ids = new Set(ZC.state.zombies.map(z => z.id));
    for (const a of rt.zombies) if (!ids.has(a.id)) abortTask(a);
    rt.zombies = rt.zombies.filter(a => ids.has(a.id));
    for (const z of ZC.state.zombies) if (!rt.zombies.find(a => a.id === z.id)) rt.zombies.push(makeZombieActor(z));
  };
  ZC.zombieData = id => ZC.state.zombies.find(z => z.id === id);
  ZC.zombieActor = id => rt.zombies.find(a => a.id === id);

  // ---------- task engine ----------
  function abortTask(a) {
    const T = a.task;
    if (T) {
      const s = T.steps[T.i || 0];
      if (s && s.wait != null && s.t != null && s.onEnd) { s.onEnd(a); }
      a.task = null;
      if (T.onAbort) T.onAbort(a);
    }
    a.working = null; a.path = null; a.moving = false; a.carry = null;
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
    if (!s) { a.task = null; a.working = null; return; }
    if (s.go) {
      if (!s.started) {
        s.started = true;
        const g = s.go(a);
        if (!g || !g.length || !goTo(a, g, false)) { abortTask(a); return; }
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
      if (s.t >= s.wait || (s.stop && s.stop(a))) { a.working = null; if (s.onEnd) s.onEnd(a); T.i++; }
      return;
    }
    if (s.do) {
      if (s.do(a) === false) { abortTask(a); return; }
      T.i++;
    }
  }

  function makeCookTask(a, stove, rid, fridge) {
    const R = ZC.RECIPES[rid];
    return {
      onAbort() { if (stove.cook && stove.cook.pending) { ZC.addCoins(R.cost); stove.cook = null; } },
      steps: [
        { go: adjOf(fridge) }, { wait: 1.2, face: fridge },
        { do: () => { a.carry = { kind: 'bag' }; } },
        { go: adjOf(stove) }, { wait: 3, face: stove, work: true },
        { do: () => {
          if (!ZC.objById(stove.id) || !stove.cook || !stove.cook.pending) return false;
          const now = Date.now();
          stove.cook = { r: rid, start: now, ready: now + R.time * 1000 };
          a.carry = null; drain(a, 3);
          ZC.fx(stove.x + 0.5, stove.y + 0.5, 'Cozinhando!', '#ffd84a'); ZC.stat('cooked'); ZC.addMastery(rid); ZC.save();
        } },
        // the cook stays at the pot, stirring, until the dish is done (or the stove is gone / emptied)
        { wait: Infinity, face: stove, work: true, stop: () => !ZC.objById(stove.id) || !stove.cook || stove.cook.pending || Date.now() >= stove.cook.ready },
      ],
    };
  }

  function makeCollectTask(a, stove) {
    const T = { steps: [] };
    T.steps = [
      { go: adjOf(stove) }, { wait: 0.8, face: stove },
      { do: () => {
        if (ZC.stoveStatus(stove) !== 'ready') return false;
        const rid = stove.cook.r, R = ZC.RECIPES[rid], counter = pickCounter(rid);
        if (!counter) { ZC.toast('Nenhum balcão livre! Compre outro ou espere esvaziar.', 'bad'); return false; }
        stove.cook = null; a.carry = { kind: 'batch', r: rid };
        T.steps.push({ go: adjOf(counter) }, { wait: 0.6, face: counter }, { do: () => {
          let c = counter;
          if (!ZC.objById(c.id) || (c.recipe && c.recipe !== rid && c.servings > 0)) c = pickCounter(rid);
          if (!c) { ZC.toast('Sem balcão: a comida foi perdida!', 'bad'); a.carry = null; return true; }
          c.recipe = rid; c.servings = (c.servings || 0) + R.servings;
          a.carry = null; drain(a, 3); ZC.addXP(R.xp);
          ZC.fx(c.x + 0.5, c.y + 0.5, `+${R.servings} porções`, '#9cff7a'); ZC.save();
        } });
      } },
    ];
    return T;
  }

  function seatGoals(cu) {
    const ch = ZC.objById(cu.seat), t = ch && ZC.tableFor(ch);
    return ch ? neighborsFree(ch).concat(t ? neighborsFree(t) : []) : null;
  }

  function makeServeTask(a, cu, counter) {
    rt.claims[counter.id] = (rt.claims[counter.id] || 0) + 1;
    let claimed = true;
    const rel = () => { if (claimed) { claimed = false; rt.claims[counter.id] = Math.max(0, (rt.claims[counter.id] || 0) - 1); } };
    return {
      onAbort() { rel(); if (cu.waiter === a.aid) cu.waiter = null; },
      steps: [
        { go: adjOf(counter) }, { wait: 0.5, face: counter },
        { do: () => {
          rel();
          if (!counter.servings || cu.state !== 'wait') return false;
          const rid = counter.recipe; counter.servings--; if (!counter.servings) counter.recipe = null;
          a.carry = { kind: 'dish', r: rid };
        } },
        { go: () => seatGoals(cu) },
        { do: () => {
          if (cu.state !== 'wait' || !a.carry) return false;
          cu.state = 'eat'; cu.dish = a.carry.r; cu.eatT = 6; a.carry = null; cu.waiter = null; drain(a, 2);
          const ch = ZC.objById(cu.seat); if (ch) faceTo(a, ch);
        } },
      ],
    };
  }

  function makeCleanTask(a, chairId, sink) {
    rt.dirty[chairId].by = a.aid;
    let washing = false;
    return {
      onAbort() { const d = rt.dirty[chairId]; if (d && d.by === a.aid) d.by = null; },
      steps: [
        { go: () => { const ch = ZC.objById(chairId); if (!ch) return null; const t = ZC.tableFor(ch); const g = neighborsFree(ch).concat(t ? neighborsFree(t) : []); return g; } },
        { wait: 0.7 },
        { do: () => { const d = rt.dirty[chairId]; if (!d || d.by !== a.aid) return false; delete rt.dirty[chairId]; a.carry = { kind: 'dirty', r: d.r }; } },
        { go: adjOf(sink) },
        { wait: 1.6, face: sink, work: true,
          onStart: () => { washing = true; rt.washing[sink.id] = (rt.washing[sink.id] || 0) + 1; },
          onEnd: () => { if (washing) { washing = false; rt.washing[sink.id] = Math.max(0, (rt.washing[sink.id] || 0) - 1); } } },
        { do: () => { a.carry = null; drain(a, 1); ZC.stat('washed'); ZC.fx(sink.x + 0.5, sink.y + 0.5, 'Prato limpo!', '#9fe0ff'); } },
      ],
    };
  }

  // ---------- player commands (select zombie, then tap stove) ----------
  // an idle zombie to send on a job (nearest to the target), or null when everybody is busy
  const isIdle = a => { const z = ZC.zombieData(a.id); return z && !a.held && !a.task && !a.pending && a.state !== 'collapsed' && z.energy > 0 && !(a.stun > 0); };
  ZC.autoZombie = function (target) {
    const list = rt.zombies.filter(isIdle);
    return list.length ? nearest(list, target) : null;
  };
  ZC.abortActor = a => { abortTask(a); abortPending(a); };

  ZC.cmdCook = function (zid, stove, rid) {
    const a = ZC.zombieActor(zid), z = ZC.zombieData(zid), R = ZC.RECIPES[rid];
    if (!a || !z) return false;
    if (a.state === 'collapsed' || z.energy <= 0) { ZC.toast(`${z.name} está sem energia!`, 'bad'); return false; }
    if (ZC.state.level < R.lvl) { ZC.toast(`Receita liberada no nível ${R.lvl}.`, 'bad'); return false; }
    if (ZC.state.coins < R.cost) { ZC.toast('Moedas insuficientes!', 'bad'); return false; }
    if (ZC.stoveStatus(stove) !== 'empty') { ZC.toast('Esse fogão está ocupado.', 'bad'); return false; }
    const fridges = objsOf('fridge').filter(f => neighborsFree(f).length);
    if (!fridges.length) { ZC.toast('Você precisa de uma geladeira acessível para pegar ingredientes!', 'bad'); return false; }
    abortPending(a);
    ZC.addCoins(-R.cost);
    stove.cook = { r: rid, pending: true, zid };
    ZC.fx(stove.x + 0.5, stove.y + 0.5, `-${R.cost}`, '#ff8a6a');
    const T = makeCookTask(a, stove, rid, nearest(fridges, a));
    if (a.task) a.pending = T; else a.task = T;
    a.stun = 0;
    ZC.toast(`${z.name} vai cozinhar ${R.name}.`, 'good');
    return true;
  };

  ZC.cmdCollect = function (zid, stove) {
    const a = ZC.zombieActor(zid), z = ZC.zombieData(zid);
    if (!a || !z) return false;
    if (a.state === 'collapsed' || z.energy <= 0) { ZC.toast(`${z.name} está sem energia!`, 'bad'); return false; }
    if (ZC.stoveStatus(stove) !== 'ready') return false;
    if (!pickCounter(stove.cook.r)) { ZC.toast('Nenhum balcão livre! Compre outro ou espere esvaziar.', 'bad'); return false; }
    abortPending(a); a.stun = 0;
    const T = makeCollectTask(a, stove);
    if (a.task) a.pending = T; else a.task = T;
    ZC.toast(`${z.name} vai levar a comida ao balcão.`, 'good');
    return true;
  };

  // ---------- automatic jobs ----------
  function tryAuto(a) {
    const waiting = rt.customers.filter(c => c.state === 'wait' && !c.waiter).sort((p, q) => p.patience - q.patience);
    if (waiting.length) {
      const counters = objsOf('counter').filter(o => (o.servings || 0) - (rt.claims[o.id] || 0) > 0 && neighborsFree(o).length);
      if (counters.length) {
        const cu = waiting[0];
        cu.waiter = a.aid;
        a.task = makeServeTask(a, cu, nearest(counters, a));
        return true;
      }
    }
    const sinks = objsOf('sink').filter(o => neighborsFree(o).length);
    if (sinks.length) {
      const ids = Object.keys(rt.dirty).filter(id => !rt.dirty[id].by).map(Number);
      const chairs = ids.map(id => ZC.objById(id)).filter(Boolean);
      if (chairs.length) {
        const ch = nearest(chairs, a);
        a.task = makeCleanTask(a, ch.id, nearest(sinks, a));
        return true;
      }
    }
    return false;
  }

  function updateZombie(a, dt) {
    const z = ZC.zombieData(a.id);
    if (!z) return;
    if (a.hop > 0) a.hop = Math.max(0, a.hop - dt);
    if (a.held) return;
    if (a.stun > 0) { a.stun -= dt; return; }
    if (a.state === 'collapsed') { if (z.energy > 0) { a.state = 'idle'; a.wanderT = 1; } return; }
    if (z.energy <= 0) {
      abortTask(a); abortPending(a);
      a.state = 'collapsed';
      ZC.toast(`${z.name} desabou de cansaço! Alimente-o no menu Zumbis.`, 'bad');
      return;
    }
    if (a.task) { runTask(a, dt); return; }
    if (a.pending) { a.task = a.pending; a.pending = null; return; }
    if (tryAuto(a)) return;
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
  // what a new customer looks like: one of the human sprites, often in one of its colour variations; rarely a golden captain
  const variantsOf = sprite => Object.keys(ZC.VARIANTS).filter(k => ZC.VARIANTS[k].base === sprite && !ZC.VARIANTS[k].special);
  // now and then a unique customer shows up (see js/specials.js): at most two at once, never two of the same kind
  function pickSpecial() {
    if (Math.random() > 0.14) return null;
    const here = rt.customers.filter(cu => cu.special && cu.state !== 'leave').map(cu => cu.special);
    if (here.length >= 2) return null;
    const pool = Object.entries(ZC.SPECIALS).filter(([id, sp]) => sp.minLevel <= ZC.state.level && !here.includes(id));
    const total = pool.reduce((n, [, sp]) => n + sp.weight, 0);
    if (!total) return null;
    let r = Math.random() * total;
    for (const [id, sp] of pool) if ((r -= sp.weight) < 0) return id;
    return null;
  }
  function pickLook(plain) {
    const sid = plain ? null : pickSpecial();
    if (sid) { const sp = ZC.SPECIALS[sid]; return { sprite: sp.sprite, variant: sp.variant, special: sid }; }
    if (Math.random() < 0.08) return { sprite: 'pirate_leader', variant: pick(variantsOf('pirate_leader')) };
    const sprite = pick(ZC.HUMANS), vs = variantsOf(sprite);
    return { sprite, variant: vs.length && Math.random() < 0.5 ? pick(vs) : null };
  }
  function spawnCustomer(plain) {
    const seats = freeSeats();
    if (!seats.length || rt.customers.length >= 14) return;
    const seat = pick(seats), c = cafe();
    const vip = false;   // only common customers for now
    const fromLeft = Math.random() < 0.5;
    const look = pickLook(plain);
    const cu = {
      aid: rt.nextActor++, kind: 'customer', sprite: look.sprite, variant: look.variant, special: look.special, vip,
      x: fromLeft ? -6 : c.w + 6, y: c.h + 7 + (Math.random() < 0.5 ? 0 : 1), alpha: 0,
      dir: fromLeft ? 'right' : 'left', speed: 1.9, state: 'enter', seat: seat.id, waiter: null, phase: Math.random() * 5,
    };
    const sp = cu.special && ZC.SPECIALS[cu.special];
    cu.maxPatience = cu.patience = (35 + ZC.rating() * 8) * (sp && sp.patience || 1);
    if (!goTo(cu, [[seat.x, seat.y]], true)) return;
    rt.seat[seat.id] = cu.aid;
    rt.customers.push(cu);
    if (sp) {
      ZC.toast(`${sp.name} chegou! ${sp.desc}`, 'good');
      for (let i = 0; i < (sp.fans || 0); i++) spawnCustomer(true);   // fans come along
    }
  }

  function customerLeave(cu, angry) {
    if (rt.seat[cu.seat] === cu.aid) delete rt.seat[cu.seat];
    cu.state = 'leave'; cu.angry = angry; cu.waiter = null;
    if (angry) ZC.fx(cu.x + 0.5, cu.y - 0.2, 'Grrr!', '#ff6a5a');
    const c = cafe();
    cu.path = null;
    if (!goTo(cu, [[-6, c.h + 7], [c.w + 6, c.h + 7], [-6, c.h + 8], [c.w + 6, c.h + 8]], false)) cu.gone = true;
  }

  function updateCustomer(cu, dt) {
    if (cu.state === 'enter') {
      cu.alpha = Math.min(1, cu.alpha + dt * 1.2);
      if (step(cu, dt)) {
        if (!cu.path) { customerLeave(cu, false); return; }
        cu.state = 'wait'; cu.alpha = 1;
        const ch = ZC.objById(cu.seat), t = ch && ZC.tableFor(ch);
        if (t) cu.dir = ZC.dirName(t.x - ch.x, t.y - ch.y);
      }
    } else if (cu.state === 'wait') {
      cu.patience -= dt;
      if (cu.patience <= 0) customerLeave(cu, true);
    } else if (cu.state === 'eat') {
      cu.eatT -= dt;
      if (cu.eatT <= 0) {
        const r = ZC.RECIPES[cu.dish];
        const tip = cu.patience / cu.maxPatience > 0.6 ? 1 : 0;
        const sp = cu.special && ZC.SPECIALS[cu.special];
        const pay = Math.round(ZC.priceOf(cu.dish) * (cu.vip ? 2 : 1) * (sp && sp.pay || 1)) + tip;
        ZC.addCoins(pay); ZC.addXP(1); ZC.stat('earned', pay); ZC.stat('served');
        ZC.fx(cu.x + 0.5, cu.y + 0.2, `+${pay}` + (tip ? ' gorjeta!' : ''), '#ffd84a');
        if (sp) {
          ZC.stat('specials');
          if (sp.xp) ZC.addXP(sp.xp);
          if (sp.mastery) ZC.addMastery(cu.dish);
          if (sp.toxin) { ZC.addToxin(sp.toxin); ZC.fx(cu.x + 0.5, cu.y - 0.2, `+${sp.toxin} Toxina`, '#9dff6a'); }
        }
        rt.dirty[cu.seat] = { r: cu.dish, by: null };
        customerLeave(cu, false);
      }
    } else if (cu.state === 'infect') {
      cu.infT -= dt;
      if (cu.infT <= 0) finishInfect(cu);
    } else if (cu.state === 'leave') {
      if (cu.path && cu.path.length <= 3) cu.alpha -= dt * 1.4;
      if (step(cu, dt) || cu.alpha <= 0) cu.gone = true;
    }
  }

  ZC.updateCafe = function (dt) {
    rt.time += dt; rt.spawnT -= dt;
    // now and then a flask of toxin appears on the floor: tap it before it fades
    rt.pickups = (rt.pickups || []).filter(p => (p.life -= dt) > 0);
    rt.pickT = (rt.pickT == null ? 45 : rt.pickT) - dt;
    if (rt.pickT <= 0) {
      rt.pickT = 70 + Math.random() * 80;
      const c = cafe(), spots = [];
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (!blk.has(key(x, y)) && !(x === c.doorX && y >= c.h - 1)) spots.push([x, y]);
      if (spots.length && rt.pickups.length < 2) { const [x, y] = pick(spots); rt.pickups.push({ x, y, life: 25 }); }
    }
    rt.missT = (rt.missT || 0) - dt;
    if (rt.missT <= 0) { rt.missT = 2; ZC.checkMissions(); }
    if (rt.spawnT <= 0) { rt.spawnT = Math.max(3, 9 - ZC.rating() * 1.2) * rand(0.7, 1.3); spawnCustomer(); }
    for (const cu of rt.customers) updateCustomer(cu, dt);
    rt.customers = rt.customers.filter(c => !c.gone);
    for (const z of rt.zombies) updateZombie(z, dt);
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
  };

  // ---------- infecting customers (the only way to get new workers, besides raids) ----------
  ZC.infectCost = cu => (cu && cu.special ? 5 : 2);
  ZC.canInfect = function (cu) {
    const s = ZC.state;
    if (cu.state === 'infect' || cu.state === 'leave') return 'Esse cliente já está indo embora.';
    if (s.zombies.length >= ZC.maxZombies(s.level)) return `Limite de ${ZC.maxZombies(s.level)} zumbis no nível ${s.level}.`;
    if (s.toxin < ZC.infectCost(cu)) return 'Toxina insuficiente.';
    return null;
  };
  ZC.startInfect = function (cu) {
    const why = ZC.canInfect(cu);
    if (why) { ZC.toast(why, 'bad'); return false; }
    ZC.addToxin(-ZC.infectCost(cu));
    if (cu.waiter) { const w = rt.zombies.find(z => z.aid === cu.waiter); if (w) abortTask(w); cu.waiter = null; }
    cu.state = 'infect'; cu.infT = 1.7; cu.path = null; cu.alpha = 1;
    ZC.fx(cu.x + 0.5, cu.y + 0.2, 'Infectado!', '#9dff6a');
    ZC.save();
    return true;
  };
  function finishInfect(cu) {
    const s = ZC.state, c = cafe();
    if (rt.seat[cu.seat] === cu.aid) delete rt.seat[cu.seat];
    cu.gone = true;
    const used = new Set(s.zombies.map(z => z.name)), free = ZC.ZOMBIE_NAMES.filter(n => !used.has(n));
    const z = { id: ZC.newId(), sprite: cu.sprite, tint: true, name: free[0] || 'Zumbi ' + s.nextId, energy: 100 };
    s.zombies.push(z);
    ZC.syncZombies();
    const a = ZC.zombieActor(z.id);
    if (a) {
      let x = Math.round(cu.x), y = Math.round(cu.y);
      if (!inCafe(x, y)) { x = c.doorX; y = c.h - 1; }
      ZC.dropZombie(a, x, y);
      a.dir = cu.dir; a.stun = 0.4;
      ZC.fx(a.x + 0.5, a.y + 0.2, 'Novo zumbi!', '#ffd84a');
    }
    ZC.toast(`${z.name} (${ZC.unitName(z.sprite, true)}) agora trabalha para você!`, 'good');
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
  };
  ZC.nearFreeTile = function (x, y) { // for placing next to an object
    const c = cafe(); let best = null, bd = 1e9;
    for (let yy = 0; yy < c.h; yy++) for (let xx = 0; xx < c.w; xx++) { if (blk.has(key(xx, yy))) continue; const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; best = [xx, yy]; } }
    return best;
  };

  ZC.repathAll = function () {
    for (const cu of rt.customers) {
      if (!cu.goals || cu.state === 'wait' || cu.state === 'eat' || cu.state === 'infect') continue;
      if (!goTo(cu, cu.goals, cu.allow)) {
        if (cu.state === 'enter') customerLeave(cu, false); else cu.gone = true;
      }
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
    const seen = new Set([key(c.doorX, c.h - 1)]);
    const q = [[c.doorX, c.h - 1]];
    for (let i = 0; i < q.length; i++) {
      for (const [dx, dy] of DIRS) {
        const nx = q[i][0] + dx, ny = q[i][1] + dy, k = key(nx, ny);
        if (seen.has(k) || !inCafe(nx, ny) || blk.has(k)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
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
    ZC.rebuildGrid(); ZC.repathAll(); ZC.save();
    return true;
  };

  ZC.objectBusy = function (o) {
    const cat = catOf(o);
    if (cat === 'chair' && (rt.seat[o.id] || rt.dirty[o.id])) return 'Tem um cliente ou um prato sujo aqui.';
    if (cat === 'table') {
      const t = rt.customers.some(cu => cu.state !== 'leave' && ZC.tableFor(ZC.objById(cu.seat) || {}) === o);
      if (t) return 'Tem clientes nesta mesa.';
    }
    if (cat === 'counter' && (rt.claims[o.id] || 0) > 0) return 'Um zumbi está indo buscar comida aqui.';
    if (cat === 'stove' && o.cook) return 'Esvazie o fogão antes.';
    if (cat === 'counter' && o.servings > 0) return 'O balcão ainda tem comida.';
    if (cat === 'sink' && (rt.washing[o.id] || 0) > 0) return 'Um zumbi está lavando pratos aqui.';
    return null;
  };

  ZC.sellObject = function (o) {
    const c = cafe(), back = Math.floor(ZC.ITEMS[o.type].price / 2);
    c.objects.splice(c.objects.indexOf(o), 1);
    delete rt.dirty[o.id];
    ZC.addCoins(back);
    ZC.fx(o.x + 0.5, o.y + 0.5, `+${back}`, '#ffd84a');
    ZC.rebuildGrid(); ZC.repathAll(); ZC.save();
  };

  ZC.expandCafe = function () {
    const s = ZC.state, c = s.cafe, cost = ZC.expandCost(s.expansions);
    if (c.w >= ZC.MAX_W && c.h >= ZC.MAX_H) { ZC.toast('O café já está no tamanho máximo.', 'bad'); return false; }
    if (s.coins < cost) { ZC.toast('Moedas insuficientes!', 'bad'); return false; }
    ZC.addCoins(-cost); s.expansions++;
    c.w = Math.min(ZC.MAX_W, c.w + 1); c.h = Math.min(ZC.MAX_H, c.h + 1);
    for (const cu of rt.customers) if ((cu.state === 'enter' || cu.state === 'leave')) { cu.gone = true; if (rt.seat[cu.seat] === cu.aid) delete rt.seat[cu.seat]; }
    rt.customers = rt.customers.filter(cu => !cu.gone);
    ZC.checkMissions();
    ZC.rebuildGrid(); ZC.repathAll(); ZC.save();
    return true;
  };

  ZC.resetRuntime = function () {
    for (const o of cafe().objects) { // tasks are not saved: give the ingredients back
      if (o.cook && o.cook.pending) { ZC.addCoins(ZC.RECIPES[o.cook.r].cost); o.cook = null; }
      delete o.hidden;
    }
    rt.customers = []; rt.zombies = []; rt.fx = []; rt.seat = {}; rt.dirty = {}; rt.claims = {}; rt.washing = {}; rt.spawnT = 2; rt.door = 0;
    ZC.rebuildGrid();
    ZC.syncZombies();
  };
})();
