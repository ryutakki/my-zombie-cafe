// Raid: your zombies storm an enemy café, drawn in the same isometric view as yours.
// The fighters are the same staff that works in your café: while they are here they are not there, and their
// energy IS their life in the fight (every hit is written straight to the worker's energy).
// Tap a zombie to send it in (or use "Atacar com todos"). Tap an enemy: everybody focuses on it; with one of your
// zombies selected (tap it again after it went in) only that one gets the order. Beat the boss to win.
(() => {
  const ZC = window.ZC;
  const TAU = Math.PI * 2;
  const INK = '#2b2333';
  const C = ZC.CFG.raid;
  const EAT_T = 1.9;                 // seconds a zombie spends devouring one corpse
  const RANGE = 1.35;                // melee reach in tiles
  const WALK = 2.1;                  // tiles per second at speed 1
  const key = (x, y) => x + ',' + y;
  const rand = (a, b) => a + Math.random() * (b - a);
  let R = null;                      // current raid

  ZC.raidActive = () => !!R;
  ZC.raidDebug = () => R;

  // ---------- the enemy café ----------
  const THEME_IDS = ['wood', 'stone', 'toxic', 'bone', 'royal'];
  function buildCafe(tg) {
    const tier = Math.min(4, Math.floor((tg.lvl - 1) / 4));
    const th = THEME_IDS[tier];
    const w = Math.min(11, 7 + Math.floor(tg.lvl / 5)), h = Math.min(9, 6 + Math.floor(tg.lvl / 6));
    const doorX = Math.floor(w / 2);
    const objs = []; let id = 1;
    const used = new Set();
    const add = (type, x, y) => { if (x < 0 || y < 0 || x >= w || y >= h || used.has(key(x, y))) return false; used.add(key(x, y)); objs.push({ id: id++, type, x, y }); return true; };
    const kit = ['stove', 'stove', 'fridge', 'sink', 'counter', 'stove', 'counter', 'sink', 'fridge'];
    for (let x = 1; x < w - 1; x++) add(`${kit[(x - 1) % kit.length]}_${th}`, x, 0);
    add('barrel', 0, 0); add('plant', w - 1, 0);
    const rows = []; for (let ty = 3; ty <= h - 2; ty += 2) rows.push(ty);
    for (const ty of rows) for (const tx of [doorX - 2, doorX + 2]) {
      if (tx - 1 < 0 || tx + 1 >= w) continue;
      add(`table_${th}`, tx, ty); add(`chair_${th}`, tx - 1, ty); add(`chair_${th}`, tx + 1, ty);
    }
    const dec = ['lamp', 'crate', 'pumpkin', 'candelabra', 'flag', 'tomb'];
    [[0, h - 1], [w - 1, h - 1], [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)]].forEach(([x, y], i) => add(dec[(tg.lvl + i) % dec.length], x, y));
    const fl = ZC.FLOORS[Math.min(ZC.FLOORS.length - 1, tier)].id, wl = ZC.WALLS[Math.min(ZC.WALLS.length - 1, tier)].id;
    return { w, h, doorX, floor: fl, wall: wl, wallSeg: {}, objects: objs, sign: tg.sign || tg.name.toUpperCase(), signColor: '#ff7a5a' };
  }

  // ---------- pathfinding on the enemy café (inside + the road in front of the door) ----------
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const inside = (c, x, y) => x >= 0 && y >= 0 && x < c.w && y < c.h;
  function canStep(x, y, nx, ny) {
    const c = R.cafe;
    if (nx < -4 || nx > c.w + 3 || ny < 0 || ny > c.h + 9) return false;
    const ia = inside(c, x, y), ib = inside(c, nx, ny);
    if (!ib && ny < c.h) return false;                       // beside or behind the building
    if (ib && R.blk.has(key(nx, ny))) return false;
    if (ia !== ib) return x === nx && nx === c.doorX;        // only through the door
    return true;
  }
  const freeTile = (x, y) => { const c = R.cafe; return (inside(c, x, y) ? !R.blk.has(key(x, y)) : y >= c.h && y <= c.h + 9 && x >= -4 && x <= c.w + 3); };
  function bfs(sx, sy, goals) {
    const start = key(sx, sy);
    if (goals.has(start)) return [];
    const prev = new Map([[start, null]]), q = [[sx, sy]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !canStep(x, y, nx, ny)) continue;
        prev.set(k, key(x, y));
        if (goals.has(k)) {
          const path = [];
          for (let cur = k; cur !== start; cur = prev.get(cur)) path.unshift(cur.split(',').map(Number));
          return path;
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }
  const tileOf = u => [Math.round(u.x), Math.round(u.y)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function pathNear(u, o) {          // walk to a free tile next to o
    const [ox, oy] = tileOf(o), goals = new Set();
    for (const [dx, dy] of DIRS) { const gx = ox + dx, gy = oy + dy; if (freeTile(gx, gy) && (inside(R.cafe, gx, gy) === inside(R.cafe, ox, oy) || (gx === R.cafe.doorX))) goals.add(key(gx, gy)); }
    if (!goals.size) return null;
    const [sx, sy] = tileOf(u);
    const p = bfs(sx, sy, goals);
    return p && !p.length ? [[sx, sy]] : p;   // already on a neighbouring tile: step to its centre
  }
  function follow(u, dt) {
    if (!u.path || !u.path.length) return true;
    let step = u.speed * WALK * dt;
    while (step > 0 && u.path.length) {
      const [tx, ty] = u.path[0], dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
      if (d > 0.001) u.dir = ZC.dirName(dx, dy);
      if (d <= step) { u.x = tx; u.y = ty; u.path.shift(); step -= d; }
      else { u.x += dx / d * step; u.y += dy / d * step; step = 0; }
    }
    return !u.path.length;
  }
  const lr = (a, b) => ((a.x - a.y) - (b.x - b.y)) <= 0 ? 'left' : 'right';   // which way the screen sees b from a

  // ---------- setup ----------
  function mkUnit(side, sprite, tint, x, y, hp, atk, speed, extra) {
    return Object.assign({ side, sprite, tint, x, y, hp, maxHp: hp, atk, speed, dir: side === 'z' ? 'back' : 'front', face: 'right',
      state: side === 'z' ? 'wait' : 'idle', st: 0, cd: rand(0.2, 0.8), hit: false, phase: Math.random() * 3, eaten: 0, kills: 0, path: null, repathT: 0,
      target: null, order: null, sent: false, alert: false, idleT: rand(1, 4), eaten_: false }, extra);
  }
  // a zombie's life in the raid is its energy: keep the two in step after every change
  const sync = u => { if (u.side === 'z') { const z = ZC.zombieData(u.zid); if (z) z.energy = Math.max(0, Math.min(u.maxHp, u.hp)); } };

  ZC.startRaid = function (tg, zombieIds) {
    const s = ZC.state, cafe = buildCafe(tg);
    const zs = zombieIds.map(id => ZC.zombieData(id)).filter(z => z && !z.chef && !z.away && !(z.revive > 0) && z.role !== 'reserve');
    R = { id: ZC.newId(), target: tg, cafe, blk: new Set(), units: [], fx: [], parts: [], t: 0, result: null, focus: null, sel: null, cleanT: 0, hintSig: '', taken: 0,
      rt: { customers: [], zombies: [], dirty: {}, seat: {}, claims: {}, washing: {}, badSeat: {}, door: 0, fx: null, extraActors: null } };
    for (const o of cafe.objects) if (!ZC.ITEMS[o.type].flat) R.blk.add(key(o.x, o.y));
    R.rt.fx = R.fx; R.rt.extraActors = addUnits;
    // the boss stands at the back, by the kitchen; the others are spread over the floor
    const spots = [];
    for (let y = 1; y < cafe.h - 1; y++) for (let x = 0; x < cafe.w; x++) if (!R.blk.has(key(x, y)) && x !== cafe.doorX) spots.push([x, y]);
    spots.sort(() => Math.random() - 0.5);
    const lvlK = 1 + 0.03 * (tg.lvl - 1), dmgK = Math.max(0.5, Math.min(1.6, 1 + 0.1 * (tg.lvl - s.level)));
    const placed = [];
    tg.enemies.forEach((sp, i) => {
      const u = ZC.UNITS[sp], boss = i === 0;
      let at = boss ? spots.slice().sort((p, q) => p[1] - q[1] || Math.abs(p[0] - cafe.doorX) - Math.abs(q[0] - cafe.doorX))[0]
        : spots.find(([x, y]) => placed.every(([px, py]) => Math.hypot(px - x, py - y) >= 2)) || spots[placed.length];
      at = at || [1, 1];
      placed.push(at);
      R.units.push(mkUnit('h', ZC.raidLook(tg, i), false, at[0], at[1], Math.round(u.hp * lvlK * (boss ? C.bossHp : 1)), ZC.ZOMBIE.atk * C.enemyDamage * dmgK * (boss ? C.bossDamage : 1), u.speed,
        { home: at, boss, dir: ['front', 'back', 'left', 'right'][Math.floor(Math.random() * 4)] }));
    });
    // the squad leaves the café (nobody is in two places) and waits on the road in front of the rival's door
    s.raid = { id: R.id, target: tg.id, ids: zs.map(z => z.id) };
    zs.forEach((z, i) => {
      z.away = R.id;
      R.units.push(mkUnit('z', z.sprite, z.tint, cafe.doorX, cafe.h + 1 + i * 0.85, z.energy, ZC.zStr(z), ZC.zSpeed(z), { zid: z.id, name: z.name, maxHp: ZC.zMax(z) }));
    });
    ZC.syncZombies();
    ZC.save();
    updateHint(true);
  };

  // ---------- visiting a friend's café: the same scene, nobody fights ----------
  ZC.startVisit = function (f) {
    const s = ZC.state;
    const tg = { id: 'visit_' + f.id, name: f.name, sign: f.sign, lvl: f.lvl, enemies: ['x'], coins: [0, 0], toxin: 0 };
    const cafe = buildCafe(tg);
    R = { visit: true, friend: f, target: tg, cafe, blk: new Set(), units: [], fx: [], parts: [], t: 0, result: null, focus: null, sel: null, cleanT: 0, hintSig: '', taken: 0,
      rt: { customers: [], zombies: [], dirty: {}, seat: {}, claims: {}, washing: {}, badSeat: {}, door: 0, fx: null, extraActors: null } };
    for (const o of cafe.objects) if (!ZC.ITEMS[o.type].flat) R.blk.add(key(o.x, o.y));
    R.rt.fx = R.fx; R.rt.extraActors = addUnits;
    const stoves = cafe.objects.filter(o => ZC.ITEMS[o.type].cat === 'stove');
    const spots = [];
    for (let y = 1; y < cafe.h - 1; y++) for (let x = 0; x < cafe.w; x++) if (!R.blk.has(key(x, y)) && x !== cafe.doorX) spots.push([x, y]);
    spots.sort(() => Math.random() - 0.5);
    // the chef cooks at a stove, the staff wanders about
    const sv = stoves[0] || { x: 1, y: 0 }, cookAt = [[sv.x, sv.y + 1], [sv.x + 1, sv.y + 1], [sv.x - 1, sv.y + 1]].find(([x, y]) => !R.blk.has(key(x, y))) || spots[0];
    R.units.push(mkUnit('h', f.chef, false, cookAt[0], cookAt[1], 100, 0, 1, { home: cookAt, boss: true, work: true, dir: 'back', label: 'Chef ' + f.name.split(' ')[0] }));
    f.staff.forEach((sp, i) => { const at = spots[i] || [2, 2]; R.units.push(mkUnit('h', sp, false, at[0], at[1], 100, 0, 1, { home: at, label: f.names[i] || 'Zumbi' })); });
    ZC.state.friends[f.id].visits = (ZC.state.friends[f.id].visits || 0) + 1;
    ZC.stat('visits');
    void s;
    updateHint(true);
  };

  ZC.endRaid = function () { R = null; ZC.syncZombies(); const hint = document.getElementById('raidhint'); if (hint) hint.textContent = ''; };

  // the page was closed in the middle of a raid: the squad simply comes home with the energy it had, and nothing else.
  // The cooldown was already running, and no reward exists until a raid is finished, so nothing can be claimed twice.
  ZC.resolveInterruptedRaid = function () {
    const s = ZC.state;
    for (const z of s.zombies) if (z.away) { delete z.away; if (z.energy <= 0) { z.energy = 0; z.revive = C.reviveTime; } }
    if (!s.raid) return false;
    s.raid = null;
    return true;
  };

  // ---------- commands ----------
  function send(u) {
    if (u.sent || u.state === 'dead') return;
    u.sent = true; u.state = 'idle'; u.cd = 0.2;
    ZC.state.raidReady[R.target.id] = ZC.state.clock + C.cooldown;   // from the first zombie through the door the raid counts
    ZC.toast(`${u.name} partiu para o ataque!`, 'good');
  }
  ZC.sendAll = function () { if (R && !R.result) for (const u of R.units) if (u.side === 'z') send(u); };
  ZC.raidSent = () => !!R && R.units.some(u => u.side === 'z' && u.sent);

  const unitBox = (u, wx, wy) => {
    const [px, py0] = ZC.iso(u.x + 0.5, u.y + 0.5), py = py0 + 6;
    return Math.abs(wx - px) < 26 && wy > py - 88 && wy < py + 14;
  };
  ZC.raidClick = function (wx, wy) {
    if (!R || R.result) return;
    if (R.visit) {       // visiting: tapping somebody says who it is
      for (const u of R.units) if (unitBox(u, wx, wy)) { ZC.toast(u.label + (u.boss ? ': o chef da casa. Pergunte pelas receitas em Amigos.' : ': trabalha para ' + R.friend.name + '.')); return; }
      return;
    }
    let best = null, bd = -1e9;
    for (const u of R.units) if (u.state !== 'dead' && unitBox(u, wx, wy) && u.x + u.y > bd) { bd = u.x + u.y; best = u; }
    if (!best) { R.sel = null; updateHint(true); return; }
    if (best.side === 'z') {
      if (!best.sent) send(best); else R.sel = R.sel === best ? null : best;      // tap a fighter to give it its own orders
      updateHint(true); return;
    }
    if (R.sel && R.sel.state !== 'dead') { R.sel.order = R.sel.order === best ? null : best; R.sel.target = null; R.sel.path = null; }
    else {
      R.focus = R.focus === best ? null : best;                 // tap again to drop the focus
      for (const u of R.units) if (u.side === 'z' && u.sent) { u.order = null; u.target = null; u.path = null; }
    }
    updateHint(true);
  };

  // ---------- simulation ----------
  const foesOf = u => R.units.filter(o => o.side !== u.side && o.state !== 'dead' && (o.side === 'h' || o.sent));
  const attackers = e => R.units.filter(o => o.side === 'z' && o.target === e && o.state !== 'dead').length;
  function wanted(u) {   // the order this zombie is under, if any
    if (u.order && u.order.state !== 'dead') return u.order;
    if (R.focus && R.focus.state !== 'dead') return R.focus;
    return null;
  }
  function pickTarget(u) {
    if (u.side === 'z') {
      const w = wanted(u); if (w) return w;
      const foes = foesOf(u); if (!foes.length) return null;
      return foes.reduce((b, o) => ((attackers(o) * 2 + dist(u, o)) < (attackers(b) * 2 + dist(u, b)) ? o : b));
    }
    const foes = foesOf(u); if (!foes.length) return null;
    if (u.revenge && u.revenge.state !== 'dead' && u.revenge.sent) return u.revenge;
    return foes.reduce((b, o) => (dist(u, o) < dist(u, b) ? o : b));
  }
  function nearestCorpse(u) {
    let best = null, bd = 1e9;
    for (const c of R.units) {
      if (c.side !== 'h' || c.state !== 'dead' || c.eaten_ || c.fled || c.st < 0.9) continue;
      if (c.claim && c.claim !== u && c.claim.state === 'eat' && R.t - (c.claimT || 0) < 0.35) continue;
      const d = dist(c, u); if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  const say = (u, text, color) => R.fx.push({ x: u.x + 0.5, y: u.y + 0.5, text, t: 0, color });

  function strike(u) {
    const tg = u.target; if (!tg || tg.state === 'dead') return;
    const dmg = Math.max(1, Math.round(u.atk * rand(0.85, 1.15)));
    tg.hp -= dmg; sync(tg);
    say(tg, '-' + dmg, u.side === 'z' ? '#ffd84a' : '#ff6a5a');
    if (tg.side === 'h') { tg.alert = true; tg.revenge = u; for (const o of R.units) if (o.side === 'h' && o.state !== 'dead' && dist(o, tg) < 4.5) o.alert = true; }
    if (tg.hp <= 0) {
      tg.hp = 0; tg.state = 'dead'; tg.st = 0; tg.path = null;
      if (R.focus === tg) R.focus = null;
      if (R.sel === tg) R.sel = null;
      if (tg.side === 'h') {
        u.kills++;
        if (tg.boss) {   // the rival chef is down: the raid is won and whoever is left runs away
          for (const o of R.units) if (o.side === 'h' && o.state !== 'dead') { o.state = 'dead'; o.fled = true; o.st = 0; o.path = null; say(o, 'Fugiu!', '#fff'); }
        } else R.taken += Math.round(R.target.coins[0] * C.defenderCoins);
      } else say(tg, 'Caiu!', '#ff6a5a');
    }
    else if (tg.state !== 'attack' && tg.state !== 'eat') { tg.state = 'hurt'; tg.st = 0; tg.path = null; tg.face = lr(tg, u); }
  }

  function think(u, dt) {
    // ---- zombies that are not in the fight yet ----
    if (u.side === 'z' && !u.sent) { u.state = 'wait'; u.dir = 'back'; return; }
    // ---- calm enemies: stand around until a zombie gets close ----
    if (u.side === 'h' && !u.alert) {
      if (R.units.some(z => z.side === 'z' && z.sent && z.state !== 'dead' && dist(z, u) < 4.2)) { u.alert = true; return; }
      if (u.path && u.path.length) { u.state = 'walk'; if (follow(u, dt)) { u.state = 'idle'; u.path = null; } return; }
      u.state = 'idle'; u.idleT -= dt;
      if (u.idleT <= 0 && !u.boss) {
        u.idleT = rand(2.5, 6);
        const opts = DIRS.map(([dx, dy]) => [u.home[0] + dx * (Math.random() < 0.5 ? 1 : 2), u.home[1] + dy * (Math.random() < 0.5 ? 1 : 2)]).filter(([x, y]) => inside(R.cafe, x, y) && !R.blk.has(key(x, y)));
        const p = opts.length && Math.random() < 0.6 ? opts[Math.floor(Math.random() * opts.length)] : null;
        if (p) { const path = bfs(...tileOf(u), new Set([key(p[0], p[1])])); if (path && path.length < 6) u.path = path; }
        else u.dir = ['front', 'back', 'left', 'right'][Math.floor(Math.random() * 4)];
      }
      return;
    }
    // ---- fighting ----
    if (u.side === 'z') {                                   // hurt (or victorious) zombies stop to devour a fallen human
      const foes = foesOf(u);
      if ((u.hp < u.maxHp * 0.5 && !wanted(u)) || !foes.length) {
        const c = u.hp < u.maxHp ? nearestCorpse(u) : null;
        if (c) {
          c.claim = u; c.claimT = R.t;
          if (dist(u, c) <= RANGE) {
            u.state = 'eat'; u.st = 0; u.corpse = c; u.path = null; u.face = lr(u, c); say(u, 'Nham!', '#ffd84a'); return;
          }
          u.repathT -= dt;
          if (!u.path || !u.path.length || u.repathT <= 0) { u.path = pathNear(u, c); u.repathT = 0.6; }
          if (u.path && u.path.length) { u.state = 'walk'; follow(u, dt); } else u.state = 'idle';
          return;
        }
      }
    }
    const w = u.side === 'z' ? wanted(u) : null;
    if (!u.target || u.target.state === 'dead' || (w && u.target !== w)) { u.target = pickTarget(u); u.path = null; }
    const tgt = u.target;
    if (!tgt) { u.state = 'idle'; return; }
    if (dist(u, tgt) <= RANGE) {
      u.path = null; u.face = lr(u, tgt);
      if (u.cd <= 0) { u.state = 'attack'; u.st = 0; u.hit = false; u.cd = rand(1.1, 1.4); }
      else u.state = 'idle';
      return;
    }
    u.repathT -= dt;
    if (!u.path || !u.path.length || u.repathT <= 0) { u.path = pathNear(u, tgt); u.repathT = 0.5; }
    if (u.path && u.path.length) { u.state = 'walk'; follow(u, dt); } else { u.state = 'idle'; u.target = null; }
  }

  // The one place where a raid pays out. It runs once: the raid id is cleared from the save in the same step.
  function finish(outcome) {
    const s = ZC.state, tg = R.target;
    if (R.result || !s.raid || s.raid.id !== R.id) return;
    R.result = outcome;
    const res = { outcome, win: outcome === 'win', coins: 0, toxin: 0, xp: 0, loot: null, recruit: null, knocked: [], back: [], eaten: 0 };
    for (const u of R.units) if (u.side === 'z') {
      const z = ZC.zombieData(u.zid);
      if (!z) continue;
      delete z.away;
      if (u.state === 'dead') { z.energy = 0; z.revive = C.reviveTime; res.knocked.push(z.name); }
      else { z.energy = Math.max(1, Math.round(Math.min(u.maxHp, u.hp))); if (u.sent) res.back.push({ name: z.name, energy: z.energy, max: ZC.zMax(z) }); }
      res.eaten += u.eaten;
      if (u.sent) ZC.zXP(z, u.kills * ZC.CFG.staff.xpRaidKill + (outcome === 'win' ? ZC.CFG.staff.xpRaidWin : 0));
    }
    if (res.eaten) ZC.stat('eaten', res.eaten);
    if (outcome === 'win') {
      res.coins = Math.round(tg.coins[0] + Math.random() * (tg.coins[1] - tg.coins[0]));
      res.toxin = tg.toxin; res.xp = tg.xp;
      ZC.addCoins(res.coins, 'saque: ' + tg.name); ZC.addToxin(res.toxin, 'saque: ' + tg.name); ZC.stat('earned', res.coins);
      // the food: one batch of the house dish, kept in the fridge (or waiting for room). Never dropped.
      const D = ZC.RECIPES[tg.dish];
      if (D) {
        const isNew = !ZC.knows(tg.dish), b = ZC.storeBatch({ r: tg.dish, servings: D.servings, from: tg.id });
        s.stats.p_loot = (s.stats.p_loot || 0) + D.servings;
        res.loot = { r: tg.dish, servings: D.servings, isNew, pending: s.pendingLoot.includes(b) };
      }
      if (C.capture) {   // own rule kept from the prototype: one captured human joins, if there is room for it
        const room = ZC.team().length < ZC.maxZombies(s.level), spare = ZC.stored().length < ZC.reserveCap();
        if (room || spare) {
          const sp = ZC.HUMANS[Math.floor(Math.random() * ZC.HUMANS.length)];
          const used = new Set(s.zombies.map(z => z.name)), free = ZC.ZOMBIE_NAMES.filter(n => !used.has(n));
          const z = ZC.makeStaff(sp, { id: ZC.newId(), tint: true, name: free.length ? free[Math.floor(Math.random() * free.length)] : 'Zumbi ' + s.nextId, role: room ? 'serve' : 'reserve' });
          if (!room) z.prevRole = 'serve';
          s.zombies.push(z);
          res.recruit = z;
        }
      }
      ZC.stat('raids');
      ZC.addXP(res.xp);
    } else if (outcome === 'retreat') {
      res.coins = Math.round(R.taken * C.retreatShare);      // only what was already taken from fallen defenders, and only a share
      if (res.coins) { ZC.addCoins(res.coins, 'recuo: ' + tg.name); ZC.stat('earned', res.coins); }
      ZC.stat('retreats');
    } else ZC.stat('defeats');
    s.raidReady[tg.id] = s.clock + C.cooldown;
    s.raid = null;
    ZC.save();
    R.summary = res;
    setTimeout(() => ZC.showRaidResult(res), 1100);
  }
  ZC.retreat = function () {
    if (R && R.visit) { ZC.leaveRaid(); return; }
    if (!R || R.result) return;
    if (!ZC.raidSent()) {            // nobody went in: leave without any consequence
      for (const z of ZC.state.zombies) if (z.away === R.id) delete z.away;
      ZC.state.raid = null; ZC.save(); ZC.leaveRaid(); return;
    }
    finish('retreat');
  };

  function updateHint(force) {
    const el = document.getElementById('raidhint'), btn = document.getElementById('sendall');
    if (!el || !R) return;
    const waiting = R.units.filter(u => u.side === 'z' && !u.sent && u.state !== 'dead').length;
    const foes = R.units.filter(u => u.side === 'h' && u.state !== 'dead').length;
    const sig = [waiting, foes, R.focus ? 1 : 0, R.sel ? R.sel.zid : 0, R.result].join();
    if (!force && sig === R.hintSig) return;
    R.hintSig = sig;
    if (R.visit) { el.textContent = `Visitando o café de ${R.friend.name}. Toque nos funcionários para saber quem são.`; if (btn) btn.style.display = 'none'; return; }
    el.textContent = R.result ? '' : waiting ? 'Toque nos seus zumbis para mandá-los entrar. Derrote o chefe para vencer.'
      : R.sel ? `${R.sel.name} selecionado: toque num inimigo para só ele atacar.`
      : foes ? (R.focus ? 'Todos focam no inimigo marcado. Toque nele de novo para soltar.' : 'Toque num inimigo para todos focarem nele, ou num zumbi seu para dar ordem só a ele.') : 'Devorando os corpos...';
    if (btn) btn.style.display = waiting && !R.result ? '' : 'none';
  }

  ZC.updateRaid = function (dt) {
    if (!R) return;
    R.t += dt;
    for (const f of R.fx) f.t += dt;
    R.fx = R.fx.filter(f => f.t < 1.6); R.rt.fx = R.fx;
    for (const p of R.parts) { p.t += dt; }
    R.parts = R.parts.filter(p => p.t < 0.7);
    // door swings open while somebody is at it
    const dc = R.cafe, near = R.units.some(u => u.state !== 'dead' && (u.side === 'z' ? u.sent : u.alert) && Math.hypot(u.x - dc.doorX, u.y - (dc.h - 0.5)) < 2.2);
    R.rt.door = Math.max(0, Math.min(1, R.rt.door + (near ? 1 : -1) * dt * 4));
    for (const u of R.units) {
      if (u.state === 'dead') { u.st += dt; continue; }
      u.cd -= dt;
      if (u.state === 'eat') {
        const c = u.corpse; c.claim = u; c.claimT = R.t;
        u.st += dt;
        u.hp = Math.min(u.maxHp, u.hp + u.maxHp * C.eatHeal * dt / EAT_T); sync(u);
        if (u.st >= EAT_T) {
          c.eaten_ = true; c.eatenAt = R.t; u.eaten++; u.state = 'idle'; u.st = 0; u.corpse = null; u.cd = 0.3;
          say(u, '+' + Math.round(u.maxHp * C.eatHeal) + ' energia', '#9dff6a');
        } else if (Math.random() < dt * 14) R.parts.push({ x: c.x + 0.5 + rand(-0.3, 0.3), y: c.y + 0.5 + rand(-0.3, 0.3), t: 0, color: Math.random() < 0.5 ? '#c0392b' : '#7fe04f' });
        continue;
      }
      if (u.state === 'attack') {
        u.st += dt;
        if (!u.hit && u.st > ZC.hitTime(u.sprite)) { u.hit = true; strike(u); }
        if (u.state === 'attack' && u.st >= ZC.animLength(u.sprite, 'attack_' + u.face)) { u.state = 'idle'; u.st = 0; }
        continue;
      }
      if (u.state === 'hurt') { u.st += dt; if (u.st > 0.4) u.state = 'idle'; else continue; }
      if (R.result) { u.state = u.side === 'z' && !u.sent ? 'wait' : 'idle'; continue; }
      think(u, dt);
    }
    if (!R.result && !R.visit) {
      const zAlive = R.units.some(u => u.side === 'z' && u.state !== 'dead');
      const zFighting = R.units.some(u => u.side === 'z' && u.sent && u.state !== 'dead');
      const hAlive = R.units.some(u => u.side === 'h' && u.state !== 'dead');
      if (!zAlive) finish('lose');
      else if (!hAlive) {
        R.cleanT += dt;
        const hungry = R.units.some(z => z.side === 'z' && z.sent && z.state !== 'dead' && z.hp < z.maxHp);
        const pending = hungry && R.units.some(c => c.side === 'h' && c.state === 'dead' && !c.eaten_ && !c.fled);
        const chewing = R.units.some(c => c.side === 'z' && c.state === 'eat');
        if (zFighting && ((!pending && !chewing) || R.cleanT > 12)) finish('win');
      }
    }
    updateHint(false);
  };

  // ---------- drawing (hooked into the café renderer) ----------
  function drawUnit(ctx, u, t) {
    const [px, py0] = ZC.iso(u.x + 0.5, u.y + 0.5), py = py0 + 6, s = ZC.ACTOR_SCALE * (u.boss ? C.bossScale : 1);
    let alpha = 1;
    if (u.fled) { alpha = Math.max(0, 1 - u.st / 0.6); if (alpha > 0) ZC.drawSprite(ctx, u.sprite, 'walk_front', R.t, px, py, s, { alpha }); return; }
    if (u.state === 'dead') alpha = u.side === 'h' ? (u.eaten_ ? Math.max(0, 1 - (R.t - u.eatenAt) / 0.5) : 1) : Math.max(0, 1 - Math.max(0, u.st - 1.2) / 0.8);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha; ZC.shadowEll(ctx, px, py + 1, 19, 8); ctx.globalAlpha = 1;
    let anim, at;
    if (u.state === 'dead') { anim = 'die'; at = u.st; }
    else if (u.state === 'attack') { anim = 'attack_' + u.face; at = u.st; }
    else if (u.state === 'eat') { anim = 'attack_' + u.face; at = (u.st * 1.4) % ZC.animLength(u.sprite, 'attack_' + u.face); }
    else if (u.state === 'hurt') { anim = 'hurt_' + u.face; at = u.st; }
    else if (u.state === 'walk') { anim = 'walk_' + u.dir; at = t + u.phase; }
    else { anim = (u.work ? 'work_' : 'idle_') + u.dir; at = t + u.phase; }
    ZC.drawSprite(ctx, u.sprite, anim, at, px, py, s, { tint: u.tint, alpha: alpha < 1 ? alpha : null });
    if (u.state === 'dead') return;
    if (R.visit) {       // a name tag instead of life bars
      ctx.font = '700 12px "Nunito", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(u.label).width + 14, ty = py - (ZC.isChar(u.sprite) ? 100 : 88);
      ctx.fillStyle = 'rgba(18,23,32,.82)'; ctx.beginPath(); ctx.roundRect(px - w / 2, ty - 9, w, 18, 9); ctx.fill();
      ctx.fillStyle = '#f3efe5'; ctx.fillText(u.label, px, ty + 0.5);
      return;
    }
    const top = u.boss ? py - 94 * C.bossScale : py - 94;
    if (u.boss) {
      if (!ZC.isChar(u.sprite)) ZC.drawAccessory(ctx, 'chef', px, py - 72 * C.bossScale, u.dir, t);
      ctx.font = '600 12px \"Fredoka\", \"Nunito\", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = '#ff9a8a';
      ctx.strokeText('CHEFE', px, top - 30); ctx.fillText('CHEFE', px, top - 30);
    }
    const bw = u.boss ? 60 : 46, p = Math.max(0, u.hp / u.maxHp);
    ZC.ink(ctx, 2.5);
    ZC.rrect(ctx, px - bw / 2, top - (u.boss ? 22 : 0), bw, 9, 4, '#2a2630');
    ctx.fillStyle = u.side === 'z' ? '#7fe04f' : '#e2483a';
    ctx.beginPath(); ctx.roundRect(px - bw / 2 + 2, top + 2 - (u.boss ? 22 : 0), (bw - 4) * p, 5, 2); ctx.fill();
  }
  function drawRing(ctx, u, color, t, k = 1) {
    const [px, py0] = ZC.iso(u.x + 0.5, u.y + 0.5), py = py0 + 7;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.75 + Math.sin(t * 6) * 0.25;
    ctx.beginPath(); ctx.ellipse(px, py, 27 * k, 12 * k, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function drawMarker(ctx, u, t, icon) {
    const [px, py0] = ZC.iso(u.x + 0.5, u.y + 0.5), py = py0 + 6, bob = Math.sin(t * 5) * 4;
    if (icon) ZC.drawIcon(ctx, icon, px, py - 112 + bob, 26);
    else { ZC.ink(ctx, 2.5); ctx.beginPath(); ctx.moveTo(px - 9, py - 116 + bob); ctx.lineTo(px + 9, py - 116 + bob); ctx.lineTo(px, py - 101 + bob); ctx.closePath(); ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.stroke(); }
  }
  function addUnits(add, ctx, t) {
    for (const u of R.units) {
      const d = u.x + u.y + 1 + (u.state === 'dead' ? -0.2 : 0.05);
      if (u.side === 'z' && !u.sent && u.state !== 'dead') { add(d - 0.02, () => drawRing(ctx, u, '#ffd84a', t)); add(d + 0.01, () => drawMarker(ctx, u, t, null)); }
      if (u === R.focus || (R.sel && R.sel.order === u)) { add(d - 0.02, () => drawRing(ctx, u, '#ff4a3a', t, 1.15)); add(d + 0.01, () => drawMarker(ctx, u, t, 'target')); }
      if (u === R.sel && u.state !== 'dead') add(d - 0.03, () => drawRing(ctx, u, '#6fd6ff', t, 1.1));
      add(d, () => drawUnit(ctx, u, t));
    }
    add(1e6, () => {
      for (const p of R.parts) { const [px, py] = ZC.iso(p.x, p.y); ctx.globalAlpha = Math.max(0, 1 - p.t / 0.7); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(px, py - 20 - p.t * 30, 3.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    });
  }

  // the render and camera code read the current café from the game state: show the enemy café for the call
  function withEnemy(fn) {
    const s = ZC.state, home = s.cafe, rt0 = ZC.rt, tf0 = ZC.tableFor;
    s.cafe = R.cafe; ZC.rt = R.rt;
    ZC.tableFor = ch => R.cafe.objects.find(o => ZC.ITEMS[o.type].cat === 'table' && Math.abs(o.x - ch.x) + Math.abs(o.y - ch.y) === 1) || null;
    try { return fn(); } finally { s.cafe = home; ZC.rt = rt0; ZC.tableFor = tf0; }
  }
  ZC.renderRaid = function (ctx, t, view, cam, W, H) { if (R) withEnemy(() => ZC.renderCafe(ctx, t, view, cam, W, H)); };
  ZC.fitRaidCamera = function () { if (R) withEnemy(() => ZC.fitCamera()); };

  // screen-space text over the result
  ZC.renderRaidOverlay = function (ctx, W, H) {
    if (!R) return;
    ctx.font = '600 28px \"Fredoka\", \"Nunito\", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.fillStyle = '#9dff6a';
    const title = (R.visit ? 'VISITA: ' : 'INVASÃO: ') + R.target.name.toUpperCase();
    ctx.strokeText(title, W / 2, 112); ctx.fillText(title, W / 2, 112);
    if (R.result) {
      ctx.fillStyle = 'rgba(10,6,16,.35)'; ctx.fillRect(0, 0, W, H);
      const big = Math.min(64, W / 7);
      ctx.font = '600 ' + big + 'px \"Fredoka\", \"Nunito\", sans-serif'; ctx.lineWidth = 10; ctx.fillStyle = R.result === 'win' ? '#9dff6a' : '#ff6a5a';
      const txt = R.result === 'win' ? 'VITÓRIA!' : R.result === 'retreat' ? 'RECUO' : 'DERROTA';
      ctx.strokeText(txt, W / 2, H / 2); ctx.fillText(txt, W / 2, H / 2);
    }
  };
})();
