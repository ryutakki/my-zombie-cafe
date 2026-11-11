// Stage 5: persistence. Two tabs, suspended tab, reload after a reward, same save twice, tutorial, one-time claims.
const { open, check, done } = require('./lib');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const A = await open({ browser: b, context: ctx });
  const errs = A.errs;

  console.log('\n[1] two tabs on the same game');
  await A.p.evaluate(() => { const s = ZC.state, chef = s.zombies.find(z => z.chef); ZC.cmdCook(chef.id, ZC.objsOf('stove')[0], 'ensopado'); ZC.fastForward(45); ZC.save(); });
  const B = await open({ browser: b, context: ctx });
  await B.p.waitForTimeout(1800);
  let a = await A.p.evaluate(() => ({ locked: !!ZC.sessionLocked, clock: ZC.state.clock, coins: ZC.state.coins }));
  let bb = await B.p.evaluate(() => ({ locked: !!ZC.sessionLocked, screen: !!document.getElementById('lockscreen'), clock: ZC.state.clock, saved: ZC.save(), coins: ZC.state.coins }));
  await B.p.waitForTimeout(1200);
  const a2 = await A.p.evaluate(() => ({ clock: ZC.state.clock })), b2 = await B.p.evaluate(() => ({ clock: ZC.state.clock }));
  console.log(JSON.stringify({ a, bb, a2, b2 }));
  check('the second tab is stopped and says why', bb.locked && bb.screen && !a.locked, bb);
  check('the second tab does not simulate and can not save', b2.clock === bb.clock && bb.saved === false, [bb.clock, b2.clock]);
  check('the first tab keeps playing', a2.clock > a.clock, [a.clock, a2.clock]);
  // take the game over from B
  await A.p.evaluate(() => { ZC.addCoins(77, 'teste'); });           // something A did after its last autosave
  const aCoins = await A.p.evaluate(() => ZC.state.coins);
  await B.p.click('#lockscreen button');
  await B.p.waitForTimeout(2500);
  await B.p.waitForFunction(() => window.ZC && ZC.runtimeReady);
  a = await A.p.evaluate(() => ({ locked: !!ZC.sessionLocked, screen: !!document.getElementById('lockscreen'), clock: ZC.state.clock, saved: ZC.save(), coins: ZC.state.coins, ledger: ZC.state.ledger.filter(l => l.why === 'teste').length }));
  bb = await B.p.evaluate(() => { if (ZC.modalOpen) ZC.closeModal(); const s = ZC.state; return { locked: !!ZC.sessionLocked, screen: !!document.getElementById('lockscreen'), coins: s.coins, clock: ZC.state.clock, ledger: s.ledger.filter(l => l.why === 'teste').length }; });
  await A.p.waitForTimeout(800);
  const a3 = await A.p.evaluate(() => ZC.state.clock), b3 = await B.p.evaluate(() => ZC.state.clock);
  console.log(JSON.stringify({ a, bb, aCoins, a3, b3 }));
  check('taking over: the old tab saved its last state and stopped', a.locked && a.screen && a.saved === false && a3 === a.clock, a);
  check('the new tab continues from that exact state (nothing lost, nothing doubled)', !bb.locked && !bb.screen && bb.ledger === 1 && a.ledger === 1 && Math.abs(bb.coins - a.coins) <= 30 && bb.coins >= a.coins && b3 > bb.clock, [bb.coins, a.coins, bb.ledger]);
  await A.p.close();
  const p = B.p;

  console.log('\n[2] suspended tab and long frame gaps');
  let r = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const c0 = ZC.state.clock;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    await wait(1500);
    const c1 = ZC.state.clock;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'));
    await wait(300);
    const c2 = ZC.state.clock;
    const t0 = performance.now(); while (performance.now() - t0 < 2500) { /* the page freezes for 2.5 s */ }
    await wait(120);
    const c3 = ZC.state.clock;
    return { hiddenDelta: c1 - c0, backDelta: +(c2 - c1).toFixed(2), freezeDelta: +(c3 - c2).toFixed(2) };
  });
  console.log(JSON.stringify(r));
  check('nothing is simulated while the tab is hidden', r.hiddenDelta === 0, r.hiddenDelta);
  check('coming back continues at normal speed, with no catching up', r.backDelta > 0 && r.backDelta < 0.6, r.backDelta);
  check('a 2.5 s freeze is not replayed (one capped step)', r.freezeDelta < 0.5, r.freezeDelta);

  console.log('\n[3] reload after a reward, and the same save opened twice');
  r = await p.evaluate(() => {
    const s = ZC.state; s.level = 10;
    for (let i = 0; i < 2; i++) s.zombies.push(ZC.makeStaff('thug', { id: ZC.newId(), name: 'R' + i, tint: true }));
    ZC.syncZombies();
    ZC.beginRaid(ZC.RAIDS[0], ZC.team().map(z => z.id)); ZC.sendAll();
    const R = ZC.raidDebug(); let t = 0; while (!R.result && t < 200) { ZC.fastForward(0.25); t += 0.25; }
    return { result: R.result };
  });
  await p.waitForTimeout(1300);
  const snap = () => p.evaluate(() => { if (ZC.modalOpen) ZC.closeModal(); const s = ZC.state; ZC.save();
    return { coins: s.coins, toxin: s.toxin, xp: s.xp, level: s.level, raids: s.stats.raids || 0, loot: s.stats.p_loot || 0, fridge: s.fridge.map(x => x.r + x.servings), pending: s.pendingLoot.length, staff: s.zombies.map(z => [z.name, Math.round(z.energy), z.lvl, z.xp, z.role, Math.round(z.revive || 0)]), ready: Math.round((s.raidReady.beco || 0) - s.clock), known: Object.keys(s.known).sort(), missions: s.missions, raid: s.raid, portions: ZC.objsOf('counter').map(c => [c.recipe, c.servings || 0]), audit: ZC.audit().ok }; });
  const s1 = await snap(); const r1 = s1.ready; delete s1.ready;
  const reload = async () => { await p.evaluate(() => { ZC.sessionLocked = true; }); await p.reload(); await p.waitForFunction(() => window.ZC && ZC.runtimeReady); };
  await reload(); const s2 = await snap(); const r2b = s2.ready; delete s2.ready;
  await reload(); const s3 = await snap(); delete s3.ready;
  console.log(JSON.stringify(s1));
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const diff = (x, y) => Object.keys(x).filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])).map(k => [k, x[k], y[k]]);
  check('the raid was won and paid once', r.result === 'win' && s1.raids === 1 && s1.fridge.length === 1, [r.result, s1.raids, s1.fridge]);
  check('reloading after the reward gives nothing again', same(s1, s2) && Math.abs(r1 - r2b) <= 2 && r2b > 60, [diff(s1, s2), r1, r2b]);
  check('the same save opened twice is the same game', same(s2, s3), diff(s2, s3));

  console.log('\n[4] tutorial follows real events; claims pay once');
  const T = await open({ browser: b });        // a brand-new game
  const q = T.p;
  r = await q.evaluate(() => {
    const el = document.getElementById('banner'), txt = () => (el.classList.contains('hidden') ? null : el.textContent);
    ZC.updateBanner(); const t0 = txt();
    ZC.openMenu(); ZC.closeModal(); ZC.openMissions(); ZC.closeModal(); ZC.updateBanner();
    const t1 = txt(), m0 = Object.keys(ZC.state.missions).length;
    const chef = ZC.state.zombies.find(z => z.chef);
    ZC.cmdCook(chef.id, ZC.objsOf('stove')[0], 'grogue'); for (let i = 0; i < 80 && !ZC.state.missions.cook1; i++) ZC.fastForward(0.5); ZC.updateBanner();
    const t2 = txt(), flag = ZC.state.missions.cook1;
    const m = ZC.MISSIONS.find(x => x.id === 'cook1'), c0 = ZC.state.coins;
    const k1 = ZC.claimMission(m), k2 = ZC.claimMission(m), gain = ZC.state.coins - c0;
    ZC.fastForward(1.2);
    return { t0, same: t0 === t1, m0, t2, flag, k1, k2, gain, reward: m.reward.coins };
  });
  await q.waitForTimeout(1200);
  const daily = await q.evaluate(() => {
    const open1 = ZC.modalOpen && /Fogão em dia/.test(document.querySelector('#modal h2').textContent), c0 = ZC.state.coins;
    const btn = document.querySelector('#modal .daily .btn.buy');
    if (btn) { btn.click(); btn.click(); }
    const gain = ZC.state.coins - c0;
    ZC.checkDaily();
    return { open1, gain, again: ZC.modalOpen, streak: ZC.state.daily.streak };
  });
  console.log(JSON.stringify(r), JSON.stringify(daily));
  check('the banner shows the first real step', /Passo 1 de 6/.test(r.t0 || ''), r.t0);
  check('opening and closing windows completes nothing', r.same && r.m0 === 0);
  check('cooking for real completes the step and moves on', r.flag === 1 && /Passo 2 de 6/.test(r.t2 || ''), r.t2);
  check('a mission prize is paid once', r.k1 && !r.k2 && r.gain === r.reward, [r.gain, r.reward]);
  check('the daily prize comes from cooking and is paid once', daily.open1 && daily.gain === 100 && !daily.again && daily.streak === 1, daily);
  await q.evaluate(() => { ZC.save(); ZC.sessionLocked = true; }); await q.reload(); await q.waitForFunction(() => window.ZC && ZC.runtimeReady);
  const after = await q.evaluate(() => { if (ZC.modalOpen) ZC.closeModal(); ZC.updateBanner(); const el = document.getElementById('banner'); return { txt: el.classList.contains('hidden') ? null : el.textContent, flag: ZC.state.missions.cook1 }; });
  check('the tutorial step is part of the save', after.flag === 2 && /Passo 2 de 6/.test(after.txt || ''), after);

  check('no runtime errors', errs.concat(B.errs, T.errs).length === 0, errs.concat(B.errs, T.errs).slice(0, 3));
  await b.close(); process.exit(done() ? 1 : 0);
})();
