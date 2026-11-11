// Persistent game state: new game, save/load/migration, currencies (with a ledger), XP, recipes known, missions.
// Session rule: the simulation clock (state.clock, seconds) only advances while the game is open. Loading a save
// restores it exactly as it was: nothing is produced, sold, recovered or lost for the time spent away.
(() => {
  const ZC = window.ZC, CFG = ZC.CFG;
  const KEY = 'zombiecafe_proto_v2';
  ZC.SAVE_KEY = KEY;

  function newGame() {
    const objs = [];
    let id = 1;
    const add = (type, x, y) => objs.push({ id: id++, type, x, y });
    add('stove_wood', 1, 0); add('stove_wood', 2, 0);
    add('fridge_wood', 3, 0); add('sink_wood', 5, 0); add('counter_wood', 6, 0);
    add('barrel', 0, 0); add('plant', 8, 0);
    for (const [tx, ty] of [[2, 3], [6, 3], [2, 5], [6, 5]]) {
      add('table_wood', tx, ty); add('chair_wood', tx - 1, ty); add('chair_wood', tx + 1, ty);
    }
    const known = {};
    for (const [rid, r] of Object.entries(ZC.RECIPES)) if (r.learn === 'start') known[rid] = 1;
    return {
      v: 3, clock: 0,
      coins: 300, toxin: 3, xp: 0, level: 1,
      expansions: 0,
      cafe: { w: 9, h: 8, doorX: 4, floor: 'tabuas', wall: 'tijolo', wallSeg: {}, objects: objs, closed: false },
      owned: { floor: ['tabuas'], wall: ['tijolo'] },
      zombies: [
        ZC.makeStaff('chef', { id: id++, sprite: 'pirate_leader', name: 'Chef', chef: true, role: 'cook' }),
        ZC.makeStaff('pirate_zombie', { id: id++, name: 'Bob Podre' }),
        ZC.makeStaff('pirate_zombie', { id: id++, name: 'Zé Caveira' }),
      ],
      known, fridge: [], pendingLoot: [],
      rep: { score: CFG.rep.start, bonus: null, log: [] },
      raidReady: {}, raid: null,
      stats: {}, missions: {}, mastery: {},
      daily: { last: '', streak: 0 },
      ledger: [],
      nextId: id,
      lastSeen: Date.now(),
    };
  }

  // ---------- v2 (prototype) -> v3 ----------
  function migrate(s) {
    s.v = 3; s.clock = 0;
    s.cafe.closed = false;
    const staff = [ZC.makeStaff('chef', { id: s.nextId++, sprite: 'pirate_leader', name: 'Chef', chef: true, role: 'cook' })];
    for (const o of s.zombies) {
      const type = ZC.PROFILES[o.sprite] ? o.sprite : 'pirate_zombie';
      const z = ZC.makeStaff(type, { id: o.id, name: o.name, sprite: o.sprite, tint: o.tint });
      z.energy = Math.round(ZC.zMax(z) * Math.max(0, Math.min(100, o.energy == null ? 100 : o.energy)) / 100);
      staff.push(z);
    }
    s.zombies = staff;
    s.known = {};
    for (const [rid, r] of Object.entries(ZC.RECIPES)) if (r.learn === 'start' || (r.learn !== 'loot' && r.lvl <= s.level) || (s.mastery && s.mastery[rid])) s.known[rid] = 1;
    s.fridge = []; s.pendingLoot = [];
    s.rep = { score: CFG.rep.start, bonus: null, log: [] };
    s.raidReady = {}; s.raid = null; s.ledger = [];
    let base = 0;
    for (const o of s.cafe.objects) {
      if (o.servings) base += o.servings;
      const c = o.cook;
      if (!c) continue;
      const R = ZC.RECIPES[c.r];
      if (!R || c.pending) { if (R && c.pending) s.coins += R.cost; o.cook = null; continue; }
      // the old save cooked on the wall clock: keep what was done when it was last saved, and nothing more
      const total = R.time, done = Math.max(0, ((s.lastSeen || c.start) - c.start) / 1000);
      o.cook = { id: s.nextId++, r: c.r, servings: R.servings, total, cost: R.cost, progress: Math.min(total, done), st: 'cooking', abandon: CFG.kitchen.abandon };
      if (done >= total) { o.cook.st = 'ready'; o.cook.spoil = ZC.spoilTime(R); base += R.servings; }
    }
    s.stats = s.stats || {};
    s.stats.p_base = base;
    return s;
  }

  ZC.newId = () => ZC.state.nextId++;

  ZC.save = function () {
    if (ZC.sessionLocked || !ZC.state) return false;      // another tab owns this game: never write over it
    const s = ZC.state;
    s.lastSeen = Date.now();
    if (ZC.snapshotRuntime && ZC.runtimeReady) s.rtsave = ZC.snapshotRuntime();
    try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; /* storage off: play without saving */ }
  };

  ZC.load = function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (s && s.v === 2) { try { s = migrate(s); } catch (e) { s = null; } }
    if (!s || s.v !== 3) s = newGame();
    // defaults for fields added later
    if (!s.cafe.wallSeg) s.cafe.wallSeg = {};
    for (const k of ['stats', 'missions', 'mastery', 'known', 'raidReady']) if (!s[k]) s[k] = {};
    for (const k of ['fridge', 'pendingLoot', 'ledger']) if (!s[k]) s[k] = [];
    if (!s.daily) s.daily = { last: '', streak: 0 };
    if (!s.rep) s.rep = { score: CFG.rep.start, bonus: null, log: [] };
    if (s.clock == null) s.clock = 0;
    ZC.state = s;
  };

  ZC.resetGame = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    ZC.state = newGame();
  };

  // ---------- currencies: every change goes through here and leaves a line in the ledger ----------
  function ledger(k, n, why) {
    const L = ZC.state.ledger;
    L.push({ t: Math.round(ZC.state.clock), k, n, why: why || 'outros' });
    if (L.length > 80) L.splice(0, L.length - 80);
  }
  ZC.addCoins = function (n, why) {
    n = Math.round(n); if (!n) return;
    const s = ZC.state, before = s.coins;
    s.coins = Math.max(0, s.coins + n);
    ledger('c', s.coins - before, why);
  };
  ZC.addToxin = function (n, why) {
    n = Math.round(n); if (!n) return;
    const s = ZC.state, before = s.toxin;
    s.toxin = Math.max(0, s.toxin + n);
    ledger('t', s.toxin - before, why);
  };
  // pay or fail: never leaves the balance negative, never charges half of something
  ZC.spend = function (n, why) { if (ZC.state.coins < n) return false; ZC.addCoins(-n, why); return true; };
  ZC.spendToxin = function (n, why) { if (ZC.state.toxin < n) return false; ZC.addToxin(-n, why); return true; };

  ZC.addMastery = function (rid) {
    const s = ZC.state, before = ZC.masteryStars(rid);
    s.mastery[rid] = (s.mastery[rid] || 0) + 1;
    const after = ZC.masteryStars(rid);
    if (after > before) ZC.toast(`Maestria de ${ZC.RECIPES[rid].name}: nível ${after}! Cada porção paga +15%.`, 'level');
  };

  // ---------- recipes: knowing one is permanent, and separate from owning food or being able to cook it ----------
  ZC.knows = rid => !!ZC.state.known[rid];
  ZC.learn = function (rid, quiet) {
    if (!ZC.RECIPES[rid] || ZC.state.known[rid]) return false;
    ZC.state.known[rid] = 1;
    if (!quiet) ZC.toast(`Receita aprendida: ${ZC.RECIPES[rid].name}!`, 'level');
    return true;
  };

  ZC.addXP = function (n) {
    const s = ZC.state;
    if (s.level >= ZC.MAX_LEVEL) { s.xp = 0; return; }
    s.xp += n;
    while (s.level < ZC.MAX_LEVEL && s.xp >= ZC.xpForLevel(s.level)) {
      s.xp -= ZC.xpForLevel(s.level);
      s.level++;
      ZC.addToxin(1, 'subiu de nível');
      const lv = s.level, names = [];
      for (const [rid, r] of Object.entries(ZC.RECIPES)) {
        if (r.learn === 'level' && r.lvl <= lv && ZC.learn(rid, true)) names.push('receita ' + r.name);
        else if (r.lvl === lv && ZC.knows(rid)) names.push('pode cozinhar ' + r.name);
      }
      for (const it of Object.values(ZC.ITEMS)) if (it.lvl === lv) names.push(it.name);
      for (const st of ZC.FLOORS.concat(ZC.WALLS)) if (st.lvl === lv) names.push(st.name);
      for (const tg of ZC.RAIDS) if (tg.lvl === lv) names.push('invasão: ' + tg.name);
      if (ZC.maxZombies(lv) > ZC.maxZombies(lv - 1)) names.unshift('mais um zumbi na equipe');
      ZC.toast(`Nível ${lv}! +1 Toxina.` + (names.length ? ' Liberou: ' + names.slice(0, 5).join(', ') + (names.length > 5 ? ' e mais ' + (names.length - 5) : '') + '.' : ''), 'level');
    }
  };
  // what the next level brings (shown in the HUD tooltip and the reputation panel)
  ZC.nextLevelPerks = function () {
    const lv = ZC.state.level + 1, out = [];
    if (lv > ZC.MAX_LEVEL) return out;
    for (const r of Object.values(ZC.RECIPES)) if (r.lvl === lv) out.push(r.name);
    for (const tg of ZC.RAIDS) if (tg.lvl === lv) out.push('invasão ' + tg.name);
    if (ZC.maxZombies(lv) > ZC.maxZombies(lv - 1)) out.push('+1 zumbi');
    const items = Object.values(ZC.ITEMS).filter(it => it.lvl === lv).length;
    if (items) out.push(items + ' itens na loja');
    return out;
  };

  // ---------- missions ----------
  const mval = m => ZC.MISSION_NOW[m.stat] ? ZC.MISSION_NOW[m.stat]() : (ZC.state.stats[m.stat] || 0);
  ZC.missionValue = mval;
  ZC.missionDone = m => !!ZC.state.missions[m.id];
  ZC.missionClaimed = m => ZC.state.missions[m.id] === 2;
  ZC.claimable = () => ZC.MISSIONS.filter(m => ZC.state.missions[m.id] === 1).length;
  ZC.checkMissions = function () {
    for (const m of ZC.MISSIONS) {
      if (ZC.state.missions[m.id]) continue;
      if (mval(m) >= m.goal) { ZC.state.missions[m.id] = 1; ZC.toast('Missão completa: ' + m.name + '! Resgate o prêmio em Missões.', 'level'); }
    }
  };
  ZC.stat = function (k, n = 1) { const st = ZC.state.stats; st[k] = (st[k] || 0) + n; if (k[1] !== '_') ZC.checkMissions(); };
  ZC.claimMission = function (m) {
    if (ZC.state.missions[m.id] !== 1) return false;
    ZC.state.missions[m.id] = 2;            // flagged before paying: a second call finds nothing to claim
    const r = m.reward;
    if (r.coins) ZC.addCoins(r.coins, 'missão');
    if (r.toxin) ZC.addToxin(r.toxin, 'missão');
    if (r.xp) ZC.addXP(r.xp);
    ZC.save();
    return true;
  };

  // ---------- reputation: three separate measures ----------
  // level (permanent, state.level) · operational reputation (state.rep.score, 0..5, moves with service and incidents)
  // · temporary bonus stars (state.rep.bonus, with a time limit). Decoration is a fourth thing: ambience.
  ZC.ambience = function () {
    let pts = 0;
    for (const o of ZC.state.cafe.objects) pts += ZC.ITEMS[o.type].rating;
    return Math.min(5, 1 + pts / 8);
  };
  ZC.repBonus = () => { const b = ZC.state.rep.bonus; return b && b.left > 0 ? b.stars : 0; };
  ZC.rating = () => Math.min(5, ZC.state.rep.score + ZC.repBonus());
  ZC.repEvent = function (kind) {
    const e = CFG.rep[kind], r = ZC.state.rep;
    if (!e) return;
    const before = r.score;
    r.score = Math.max(0, Math.min(5, r.score + (e.to - r.score) * e.w));
    const up = r.score >= before, last = r.log[r.log.length - 1];
    if (last && last.why === e.why) { last.n++; last.t = Math.round(ZC.state.clock); last.d += r.score - before; }
    else r.log.push({ t: Math.round(ZC.state.clock), why: e.why, up, n: 1, d: r.score - before });
    if (r.log.length > CFG.rep.logSize) r.log.shift();
  };
  ZC.grantBonusStars = function (stars, time, why) {
    const r = ZC.state.rep;
    r.bonus = { stars, left: time, why };     // one bonus at a time: a new one replaces the old, they never add up
    ZC.toast(`${why}: +${stars} estrela temporária por ${Math.round(time / 60)} min.`, 'level');
  };
  ZC.repTick = function (dt) {
    const b = ZC.state.rep.bonus;
    if (b && b.left > 0) { b.left -= dt; if (b.left <= 0) { ZC.state.rep.bonus = null; ZC.toast('A estrela temporária acabou.'); } }
  };
})();
