// Stage 2: staff. Infection, profiles, energy, rest, distraction, hunger outburst, reserve, zombie XP.
const { open, check, done } = require('./lib');
const SEED = `(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })()`;
(async () => {
  let { b, p, errs } = await open();
  const fresh = async () => { await p.close(); ({ p, errs } = await open({ browser: b })); };

  console.log('\n[1] infection: inspect, pay once, one recruit, full team explained');
  let r = await p.evaluate(() => {
    const s = ZC.state, chef = s.zombies.find(z => z.chef);
    ZC.cmdCook(chef.id, ZC.objsOf('stove')[0], 'grogue');
    let cu = null, g = 0;
    while (!cu && g++ < 600) { ZC.fastForward(0.5); cu = ZC.rt.customers.find(c => c.state === 'wait' && !c.special && c.sprite !== 'squidman'); }
    const card = { stats: cu.stats, sprite: cu.sprite, why: ZC.canInfect(cu), cost: ZC.infectCost(cu) };
    const tox0 = s.toxin, n0 = s.zombies.length;
    const a1 = ZC.startInfect(cu), a2 = ZC.startInfect(cu), a3 = ZC.startInfect(cu);     // triple tap
    const toxMid = s.toxin;
    ZC.fastForward(3);
    const rec = s.zombies[s.zombies.length - 1];
    const cu2 = (() => { let c = null, g = 0; while (!c && g++ < 600) { ZC.fastForward(0.5); c = ZC.rt.customers.find(q => q.state === 'wait' && !q.special && q.sprite !== 'squidman'); } return c; })();
    const tox1 = s.toxin, why2 = ZC.canInfect(cu2), b1 = ZC.startInfect(cu2);
    return { card, a: [a1, a2, a3], spent: tox0 - toxMid, added: s.zombies.length - n0, rec: { type: rec.type, st: rec.st, tint: rec.tint, lvl: rec.lvl, role: rec.role, name: rec.name },
      sameStats: JSON.stringify(rec.st) === JSON.stringify(card.stats), why2, b1, spent2: tox1 - s.toxin, team: ZC.team().length, cap: ZC.maxZombies(s.level), infected: s.stats.infected, audit: ZC.audit() };
  });
  console.log(JSON.stringify(r));
  check('customer card shows attributes before paying', !!r.card.stats && r.card.why === null, r.card);
  check('three taps charge once and create one worker', r.a.join() === 'true,false,false' && r.spent === r.card.cost && r.added === 1 && r.infected === 1, r);
  check('recruit keeps the numbers shown on the card', r.sameStats && r.rec.tint === true, r.rec);
  check('full team is explained before any spending', /Equipe cheia/.test(r.why2) && r.b1 === false && r.spent2 === 0, [r.why2, r.spent2]);

  console.log('\n[2] attributes change results (same café, same food, same seed)');
  const trial = async (type) => {
    await fresh();
    return p.evaluate(([type, SEED]) => {
      eval(SEED);
      const s = ZC.state, w = s.zombies.find(z => !z.chef), P = ZC.PROFILES[type];
      Object.assign(w, { type, st: { energy: P.energy, speed: P.speed, tip: P.tip, str: P.str } }); w.energy = ZC.zMax(w);
      ZC.resetRuntime();
      const c = ZC.objsOf('counter')[0]; c.recipe = 'grogue'; c.servings = 400; s.stats.p_base = 400;
      s.rep.score = 3;
      ZC.fastForward(150);
      const st = s.stats;
      return { type, served: st.served || 0, tips: st.t_tips || 0, gaveup: st.gaveup || 0, energyLeft: Math.round(100 * ZC.zPct(w)), coins: s.coins - 300, audit: ZC.audit().ok };
    }, [type, SEED]);
  };
  const tr = await trial('robber'), tt = await trial('thug'), ta = await trial('assassin');
  console.log(JSON.stringify([tr, tt, ta]));
  check('fast tipper serves more and earns more tips than the slow tank', tr.served > tt.served && tr.tips > tt.tips * 1.5, [tr, tt]);
  check('the tank ends the shift with more energy left', tt.energyLeft > tr.energyLeft + 5, [tt.energyLeft, tr.energyLeft]);
  check('the fighter is a poor waiter (few tips)', ta.tips < tr.tips * 0.5, [ta.tips, tr.tips]);

  console.log('\n[3] tired -> warning; rest ordered in time avoids the attack and recovers');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state, w = s.zombies.find(z => !z.chef), a = ZC.zombieActor(w.id), max = ZC.zMax(w);
    const c = ZC.objsOf('counter')[0]; c.recipe = 'grogue'; c.servings = 200; s.stats.p_base = 200;
    w.energy = max * 0.33; ZC.fastForward(8);
    const warned = window.__toasts.some(t => /está cansado/.test(t)), pct1 = ZC.zPct(w);
    w.energy = max * (ZC.zHunger(w) + 0.02);
    const why = ZC.setRole(w, 'rest');
    ZC.fastForward(6);
    const resting = a.resting || a.restWalk, e1 = w.energy;
    ZC.fastForward(40);
    const e2 = w.energy, role2 = w.role;
    ZC.fastForward(120);
    return { warned, pct1, why, resting, e1: Math.round(e1), e2: Math.round(e2), role2, roleEnd: w.role, eEnd: Math.round(w.energy), max, outbursts: s.stats.outbursts || 0, rested: s.stats.rested || 0,
      back: window.__toasts.some(t => /descansou e voltou/.test(t)), audit: ZC.audit() };
  });
  console.log(JSON.stringify(r));
  check('a tired worker warns the player', r.warned, r);
  check('resting is a real state and energy climbs gradually', r.resting && r.e2 > r.e1 + 20 && r.e2 < r.max && r.role2 === 'rest', [r.e1, r.e2, r.max]);
  check('rested worker goes back to its job by itself; no attack happened', r.roleEnd === 'serve' && r.back && r.outbursts === 0 && r.rested === 1, r);

  console.log('\n[4] starving worker: warning window, then attack with real consequences, then a cooldown');
  r = await p.evaluate(() => {
    const s = ZC.state, w = s.zombies.find(z => !z.chef), a = ZC.zombieActor(w.id), max = ZC.zMax(w);
    ZC.fastForward(20);                                   // let customers sit down and eat
    const rep0 = s.rep.score, coins0 = s.coins, inRoom = ZC.rt.customers.filter(c => ['wait', 'eat', 'enter'].includes(c.state)).length;
    w.energy = max * (ZC.zHunger(w) - 0.03);
    ZC.fastForward(1);
    const window1 = a.hungerT, warned = window.__toasts.some(t => /faminto e vai atacar/.test(t));
    ZC.fastForward(ZC.CFG.energy.reactWindow - 2);
    const beforeAtk = s.stats.outbursts || 0;
    ZC.fastForward(14);
    const out1 = s.stats.outbursts || 0, e1 = w.energy, cd = w.snapCd;
    const fled = ZC.rt.customers.filter(c => c.state === 'flee').length, coinsAfter = s.coins;
    const rep1 = s.rep.score, why = s.rep.log.map(l => l.why);
    w.energy = max * (ZC.zHunger(w) - 0.03);              // still starving right after
    ZC.fastForward(30);
    const out2 = s.stats.outbursts || 0;
    return { inRoom, window1, warned, beforeAtk, out1, out2, gain: Math.round(e1 - max * (ZC.zHunger(w) - 0.03)), maxGain: Math.round(max * ZC.CFG.energy.attackGain) + 3, cd: Math.round(cd), fled, rep0: +rep0.toFixed(2), rep1: +rep1.toFixed(2), why,
      unpaid: s.stats.unpaid || 0, coinsDelta: coinsAfter - coins0, audit: ZC.audit(), toast: window.__toasts.filter(t => /devorou/.test(t)).slice(-1) };
  });
  console.log(JSON.stringify(r));
  check('there is a reaction window with a warning before the attack', r.warned && r.window1 > 7 && r.beforeAtk === 0, [r.window1, r.beforeAtk]);
  check('the attack happens once and scares the room', r.out1 === 1 && r.inRoom >= 1, [r.out1, r.fled, r.inRoom]);
  check('reputation drops hard and names the outburst', r.rep1 < r.rep0 - 0.3 && r.why.includes('surto no salão'), [r.rep0, r.rep1]);
  check('energy gained from the attack is small', r.gain <= r.maxGain, [r.gain, r.maxGain]);
  check('cooldown: no second attack right away, never one per frame', r.out2 === 1 && r.cd > 30, [r.out2, r.cd]);
  check('books balance after the panic', r.audit.ok, r.audit);

  console.log('\n[5] exhausted to zero: collapses, gets up slowly; a brain refills once for one toxin');
  r = await p.evaluate(() => {
    const s = ZC.state, w = s.zombies.find(z => !z.chef), a = ZC.zombieActor(w.id), max = ZC.zMax(w);
    ZC.setClosed(true); ZC.fastForward(60);
    w.snapCd = 999; w.energy = 0.4; ZC.drain(w, 1); ZC.fastForward(1);
    const collapsed = a.state === 'collapsed';
    ZC.fastForward(20);
    const e20 = w.energy, still = a.state;
    const tox0 = s.toxin; s.toxin = 2;
    const f1 = ZC.feedBrain(w), eFull = w.energy, maxNow = ZC.zMax(w), f2 = ZC.feedBrain(w), toxSpent = 2 - s.toxin;
    ZC.fastForward(2);
    ZC.setClosed(false);
    return { collapsed, e20: +e20.toFixed(1), still, f1, f2, eFull, max: maxNow, toxSpent, upAgain: a.state };
  });
  console.log(JSON.stringify(r));
  check('at zero the worker collapses and is out of work', r.collapsed && r.still === 'collapsed', r);
  check('energy never jumps from zero to full by itself', r.e20 > 0 && r.e20 < r.max * 0.3, r.e20);
  check('brain: full energy, charged once, second use refused', r.f1 && !r.f2 && r.eFull === r.max && r.toxSpent === 1 && r.upAgain !== 'collapsed', r);

  console.log('\n[6] reserve keeps identity and freezes energy; zombie XP and level');
  r = await p.evaluate(() => {
    const s = ZC.state, w = s.zombies.find(z => !z.chef);
    w.energy = 40; w.xp = 3; w.lvl = 2; const id = w.id, name = w.name;
    const why = ZC.setRole(w, 'reserve');
    const actorGone = !ZC.zombieActor(id);
    ZC.fastForward(60);
    const eStored = w.energy, where = ZC.staffWhere(w), team = ZC.team().length;
    const whyRole = ZC.setRole(w, 'serve');
    const back = !!ZC.zombieActor(id);
    const need = ZC.zXpNeed(w), max0 = ZC.zMax(w);
    ZC.zXP(w, need);                                      // exactly one level
    const chefWhy = ZC.setRole(s.zombies.find(z => z.chef), 'reserve');
    return { why, actorGone, eStored, where, team, whyRole, back, same: w.id === id && w.name === name, lvl: w.lvl, xp: w.xp, max0, max1: ZC.zMax(w), chefWhy, cap: ZC.reserveCap() };
  });
  console.log(JSON.stringify(r));
  check('stored worker leaves the café and its energy is frozen', r.why === null && r.actorGone && r.eStored === 40 && r.team === 0, r);
  check('it comes back as the same individual', r.whyRole === null && r.back && r.same, r);
  check('zombie XP raises its own level and its maximum energy', r.lvl === 3 && r.max1 > r.max0, [r.lvl, r.max0, r.max1]);
  check('the chef can not be stored', /chef/i.test(r.chefWhy || ''), r.chefWhy);

  check('no runtime errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); process.exit(done() ? 1 : 0);
})();
