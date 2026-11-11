// Persistent game state: new game, save/load, currencies and XP.
(() => {
  const ZC = window.ZC;
  const KEY = 'zombiecafe_proto_v2';

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
    return {
      v: 2,
      coins: 300, toxin: 3, xp: 0, level: 1,
      expansions: 0,
      cafe: { w: 9, h: 8, doorX: 4, floor: 'tabuas', wall: 'tijolo', wallSeg: {}, objects: objs },
      owned: { floor: ['tabuas'], wall: ['tijolo'] },
      zombies: [
        { id: id++, sprite: 'pirate_zombie', tint: false, name: 'Bob Podre', energy: 100 },
        { id: id++, sprite: 'pirate_zombie', tint: false, name: 'Zé Caveira', energy: 100 },
      ],
      raidReady: {},
      stats: {},
      missions: {},
      mastery: {},
      daily: { last: '', streak: 0 },
      nextId: id,
      lastSeen: Date.now(),
    };
  }

  ZC.newId = () => ZC.state.nextId++;

  ZC.save = function () {
    ZC.state.lastSeen = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(ZC.state)); } catch (e) { /* storage off: play without saving */ }
  };

  ZC.load = function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || s.v !== 2) s = newGame();
    // zombies rot a little while the game is closed (1 energy per 3 min, never below 10)
    const away = (Date.now() - (s.lastSeen || Date.now())) / 1000;
    const loss = Math.floor(away / 180);
    if (loss > 0) for (const z of s.zombies) if (z.energy > 10) z.energy = Math.max(10, z.energy - loss);
    if (!s.cafe.wallSeg) s.cafe.wallSeg = {};
    if (!s.stats) s.stats = {};
    if (!s.missions) s.missions = {};
    if (!s.mastery) s.mastery = {};
    if (!s.daily) s.daily = { last: '', streak: 0 };
    ZC.state = s;
  };

  ZC.resetGame = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    ZC.state = newGame();
  };

  ZC.addCoins = function (n) { ZC.state.coins = Math.max(0, ZC.state.coins + n); };
  ZC.addToxin = function (n) { ZC.state.toxin = Math.max(0, ZC.state.toxin + n); };
  ZC.addMastery = function (rid) {
    const s = ZC.state, before = ZC.masteryStars(rid);
    s.mastery[rid] = (s.mastery[rid] || 0) + 1;
    const after = ZC.masteryStars(rid);
    if (after > before) ZC.toast(`Maestria de ${ZC.RECIPES[rid].name}: nível ${after}! Cada porção paga +15%.`, 'level');
  };
  ZC.addXP = function (n) {
    const s = ZC.state;
    if (s.level >= ZC.MAX_LEVEL) { s.xp = 0; return; }
    s.xp += n;
    while (s.level < ZC.MAX_LEVEL && s.xp >= ZC.xpForLevel(s.level)) {
      s.xp -= ZC.xpForLevel(s.level);
      s.level++;
      s.toxin += 1;
      const lv = s.level, names = [];
      for (const r of Object.values(ZC.RECIPES)) if (r.lvl === lv) names.push(r.name);
      for (const it of Object.values(ZC.ITEMS)) if (it.lvl === lv) names.push(it.name);
      for (const st of ZC.FLOORS.concat(ZC.WALLS)) if (st.lvl === lv) names.push(st.name);
      for (const tg of ZC.RAIDS) if (tg.lvl === lv) names.push('invasão: ' + tg.name);
      ZC.toast(`Nível ${lv}! +1 Toxina.` + (names.length ? ' Liberou: ' + names.slice(0, 5).join(', ') + (names.length > 5 ? ' e mais ' + (names.length - 5) : '') + '.' : ''), 'level');
    }
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
  ZC.stat = function (k, n = 1) { const st = ZC.state.stats; st[k] = (st[k] || 0) + n; ZC.checkMissions(); };
  ZC.claimMission = function (m) {
    if (ZC.state.missions[m.id] !== 1) return false;
    ZC.state.missions[m.id] = 2;
    const r = m.reward;
    if (r.coins) ZC.addCoins(r.coins);
    if (r.toxin) ZC.addToxin(r.toxin);
    if (r.xp) ZC.addXP(r.xp);
    ZC.save();
    return true;
  };

  ZC.rating = function () {
    let pts = 0;
    for (const o of ZC.state.cafe.objects) pts += ZC.ITEMS[o.type].rating;
    return Math.min(5, 1 + pts / 8);
  };
})();
