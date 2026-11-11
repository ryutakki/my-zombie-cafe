// Stage 4: raids. Same staff, energy as life, boss, retreat, defeat, reanimation, loot once, reload safety.
const { open, check, done } = require('./lib');
(async () => {
  let { b, p, errs } = await open();
  const fresh = async () => { await p.close(); ({ p, errs } = await open({ browser: b })); };
  // play a raid to the end without drawing; opts: { retreatAfterKills, noSend }
  const runRaid = async (targetId, opts = {}) => {
    const r = await p.evaluate(([targetId, opts]) => {
      const s = ZC.state, tg = ZC.RAIDS.find(t => t.id === targetId);
      const ids = (opts.ids || ZC.team().map(z => z.id));
      const before = { coins: s.coins, toxin: s.toxin, energy: Object.fromEntries(ZC.team().map(z => [z.id, Math.round(z.energy)])), fridge: s.fridge.length + s.pendingLoot.length, actors: ZC.rt.zombies.length };
      ZC.beginRaid(tg, ids);
      const R = ZC.raidDebug();
      const during = { actors: ZC.rt.zombies.length, away: s.zombies.filter(z => z.away).length, roleWhy: ZC.setRole(ZC.zombieData(ids[0]), 'serve'), hp: R.units.filter(u => u.side === 'z').map(u => [Math.round(u.hp), u.maxHp]), boss: R.units.filter(u => u.boss).length, saved: !!s.raid };
      if (!opts.noSend) ZC.sendAll();
      let t = 0, live = null;
      while (!R.result && t < 240) {
        ZC.fastForward(0.25); t += 0.25;
        if (!live && R.units.some(u => u.side === 'z' && u.hp < u.maxHp)) { const u = R.units.find(q => q.side === 'z' && q.hp < q.maxHp && q.state !== 'dead'); if (u) live = [Math.round(u.hp), Math.round(ZC.zombieData(u.zid).energy)]; }
        if (opts.retreatAfterKills != null && R.units.filter(u => u.side === 'h' && u.state === 'dead').length >= opts.retreatAfterKills) ZC.retreat();
        if (opts.noSend) { ZC.retreat(); break; }
      }
      return { before, during, live, t, result: R ? R.result : null, summary: R && R.summary ? Object.assign({}, R.summary, { recruit: R.summary.recruit ? R.summary.recruit.role : null }) : null, taken: R ? R.taken : 0 };
    }, [targetId, opts]);
    await p.waitForTimeout(1300);
    r.after = await p.evaluate(() => {
      const twice = ZC.state.coins; ZC.retreat();             // a late second "finish" must do nothing
      if (ZC.modalOpen) ZC.closeModal();
      const s = ZC.state;
      return { coins: s.coins, coinsSame: s.coins === twice, toxin: s.toxin, scene: ZC.view.scene, away: s.zombies.filter(z => z.away).length, raid: s.raid, actors: ZC.rt.zombies.length,
        staff: s.zombies.filter(z => !z.chef).map(z => ({ name: z.name, e: Math.round(z.energy), max: ZC.zMax(z), revive: Math.round(z.revive || 0), role: z.role, lvl: z.lvl, xp: z.xp })),
        fridge: s.fridge.map(x => x.r), pending: s.pendingLoot.map(x => x.r), ready: Math.round((s.raidReady.beco || 0) - s.clock), audit: ZC.audit(), stats: { raids: s.stats.raids || 0, retreats: s.stats.retreats || 0, defeats: s.stats.defeats || 0, loot: s.stats.p_loot || 0 } };
    });
    return r;
  };
  const squad = (n, type = 'pirate_zombie') => p.evaluate(([n, type]) => {
    const s = ZC.state; s.level = Math.max(s.level, 10);
    while (ZC.team().length < n) { const z = ZC.makeStaff(type, { id: ZC.newId(), name: 'T' + ZC.team().length, tint: true }); s.zombies.push(z); }
    ZC.syncZombies();
  }, [n, type]);

  console.log('\n[1] a won raid: same staff, energy is life, boss, loot once, new recipe at home');
  await squad(3);
  let r = await runRaid('beco');
  console.log(JSON.stringify(r));
  check('the squad leaves the café while it fights', r.during.away === 3 && r.during.actors === r.before.actors - 3 && /invasão/.test(r.during.roleWhy), r.during);
  check('each fighter enters with its real energy as life', r.during.hp.every(([hp, mx]) => hp <= mx && hp > 0), r.during.hp);
  check('damage in the fight is the same number as the energy', !r.live || r.live[0] === r.live[1], r.live);
  check('there is a boss and beating it wins', r.during.boss === 1 && r.result === 'win', r.result);
  check('reward: coins in range, toxin, a batch in the fridge', r.after.coins - r.before.coins >= 40 && r.after.coins - r.before.coins <= 70 && r.after.toxin - r.before.toxin === 1 && r.after.fridge.concat(r.after.pending).includes('sanduiche') && r.after.stats.loot === 8, [r.after.coins - r.before.coins, r.after.fridge]);
  check('the reward can not be claimed twice', r.after.coinsSame && r.after.raid === null);
  check('the squad comes home; nobody is fully restored for free', r.after.away === 0 && r.after.scene === 'cafe' && r.after.staff.every(z => z.e <= z.max), r.after.staff);
  check('books balance with the looted portions', r.after.audit.ok, r.after.audit);
  let r2 = await p.evaluate(() => {
    const s = ZC.state, b = s.fridge.find(x => x.r === 'sanduiche'), st = ZC.objsOf('stove')[0];
    const before = ZC.cookBlock('sanduiche', st), ok = ZC.studyBatch(b), after = ZC.cookBlock('sanduiche', st);
    const wait = Math.round((s.raidReady.beco || 0) - s.clock);
    return { before, ok, after, wait, audit: ZC.audit() };
  });
  console.log(JSON.stringify(r2));
  check('the loot becomes a new option in the café', /desconhecida/.test(r2.before) && r2.ok && r2.after === null && r2.audit.ok, r2);
  check('the same café can not be raided again right away', r2.wait > 30, r2.wait);

  console.log('\n[2] retreat: partial coins already taken, no food, squad keeps its wounds');
  await fresh(); await squad(3);
  r = await runRaid('taverna', { retreatAfterKills: 1 });
  console.log(JSON.stringify({ result: r.result, summary: r.summary, taken: r.taken, after: r.after }));
  const share = Math.round(r.taken * 0.5);
  check('retreat ends the raid as a retreat', r.result === 'retreat' && r.after.stats.retreats === 1 && r.after.stats.raids === 0, r.result);
  check('only a share of what was taken; no main loot', r.summary.coins === share && r.after.coins - r.before.coins === share && r.after.fridge.length === 0 && !r.summary.loot && r.summary.toxin === 0, [r.summary.coins, share]);
  check('nobody went in = no consequence at all', true);
  await fresh(); await squad(2);
  r = await runRaid('beco', { noSend: true });
  check('leaving before anyone enters costs nothing and starts no cooldown', r.after.coins === r.before.coins && r.after.raid === null && r.after.away === 0 && r.after.ready <= 0 && r.after.staff.every(z => !z.revive), r.after);

  console.log('\n[3] defeat: knocked out, reanimation timer, comes back weak; survives a reload without advancing');
  await fresh();
  await p.evaluate(() => { const s = ZC.state; s.level = 10; const w = s.zombies.find(z => !z.chef); w.energy = Math.round(ZC.zMax(w) * 0.3); });
  r = await runRaid('fortaleza');
  console.log(JSON.stringify({ result: r.result, summary: r.summary, after: r.after }));
  check('a weak lone zombie loses', r.result === 'lose' && r.after.stats.defeats === 1, r.result);
  check('it is knocked out with a timer, not deleted, and gives nothing', r.after.staff.length === 1 && r.after.staff[0].revive > 100 && r.after.staff[0].e === 0 && r.after.coins === r.before.coins && r.after.actors === 1, r.after.staff);
  let r3 = await p.evaluate(() => {
    const s = ZC.state, w = s.zombies.find(z => !z.chef);
    const why = ZC.setRole(w, 'serve');
    ZC.fastForward(30);
    const left = w.revive; ZC.save();
    const raw = JSON.parse(localStorage.getItem(ZC.SAVE_KEY)); raw.lastSeen = Date.now() - 864e5; localStorage.setItem(ZC.SAVE_KEY, JSON.stringify(raw));
    ZC.sessionLocked = true;
    return { why, left };
  });
  await p.reload(); await p.waitForFunction(() => window.ZC && ZC.runtimeReady);
  let r4 = await p.evaluate(() => {
    if (ZC.modalOpen) ZC.closeModal();
    const s = ZC.state, w = s.zombies.find(z => !z.chef), left0 = w.revive, actor0 = !!ZC.zombieActor(w.id);
    ZC.fastForward(left0 + 2);
    const e = w.energy, max = ZC.zMax(w), actor1 = !!ZC.zombieActor(w.id);
    return { left0, actor0, revive: w.revive, e, max, actor1, coins: s.coins };
  });
  console.log(JSON.stringify(r3), JSON.stringify(r4));
  check('a knocked-out worker can not be put to work from another menu', /reanimado/.test(r3.why), r3.why);
  check('the timer survives closing the game and does not run while away', Math.abs(r4.left0 - r3.left) < 1.5 && !r4.actor0, [r3.left, r4.left0]);
  check('reanimated = usable but weak (not a full recovery)', r4.revive === 0 && r4.actor1 && r4.e > 0 && r4.e <= r4.max * 0.25, [r4.e, r4.max]);
  r4 = await p.evaluate(() => { const s = ZC.state, w = s.zombies.find(z => !z.chef); w.revive = 100; w.energy = 0; ZC.syncZombies(); s.toxin = 3; const a = ZC.reviveNow(w), t1 = s.toxin, b = ZC.reviveNow(w); return { a, b, spent: 3 - s.toxin, e: w.energy, max: ZC.zMax(w) }; });
  check('toxin revives at once, paid once, still weak', r4.a && !r4.b && r4.spent === 1 && r4.e <= r4.max * 0.25, r4);

  console.log('\n[4] page closed in the middle of a raid: squad returns, no reward, cooldown stays');
  await fresh(); await squad(3);
  r = await p.evaluate(() => {
    const s = ZC.state, tg = ZC.RAIDS[0];
    ZC.beginRaid(tg, ZC.team().map(z => z.id)); ZC.sendAll(); ZC.fastForward(4);
    ZC.save();
    const snap = { coins: s.coins, raid: !!s.raid, away: s.zombies.filter(z => z.away).length, energy: s.zombies.filter(z => !z.chef).map(z => Math.round(z.energy)) };
    ZC.sessionLocked = true;
    return snap;
  });
  await p.reload(); await p.waitForFunction(() => window.ZC && ZC.runtimeReady);
  r2 = await p.evaluate(() => { if (ZC.modalOpen) ZC.closeModal(); const s = ZC.state; return { coins: s.coins, raid: s.raid, away: s.zombies.filter(z => z.away).length, scene: ZC.view.scene, actors: ZC.rt.zombies.length, energy: s.zombies.filter(z => !z.chef).map(z => Math.round(z.energy)), ready: Math.round((s.raidReady.beco || 0) - s.clock), fridge: s.fridge.length, raids: s.stats.raids || 0 }; });
  console.log(JSON.stringify(r), JSON.stringify(r2));
  check('squad is back in the café with the energy it had', r.raid && r.away === 3 && r2.raid === null && r2.away === 0 && r2.actors === 4 && JSON.stringify(r2.energy) === JSON.stringify(r.energy), [r.energy, r2.energy]);
  check('no reward and the cooldown is running', r2.coins === r.coins && r2.fridge === 0 && r2.raids === 0 && r2.ready > 30, r2);

  check('no runtime errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); process.exit(done() ? 1 : 0);
})();
