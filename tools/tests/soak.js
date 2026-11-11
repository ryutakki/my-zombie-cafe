// Soak: 15 simulated minutes of random play. The books must balance at every check and nothing may throw.
const { open, check, done } = require('./lib');
(async () => {
  const { b, p, errs } = await open();
  const r = await p.evaluate(() => {
    const real = setTimeout; window.setTimeout = (f, ms) => (ms === 1100 || ms === 900 ? 0 : real(f, ms));   // no popups
    const s = ZC.state, rnd = n => Math.floor(Math.random() * n), bad = [], acts = {};
    const did = k => { acts[k] = (acts[k] || 0) + 1; };
    s.coins = 3000; s.toxin = 30;
    let stuckMax = 0;
    for (let step = 0; step < 300; step++) {
      ZC.fastForward(3);
      const chef = s.zombies.find(z => z.chef), stoves = ZC.objsOf('stove');
      for (const o of stoves) {
        const st = ZC.stoveStatus(o);
        if (st === 'empty' && Math.random() < 0.6) { const a = ZC.autoZombie(o, ['cook']); const can = Object.keys(ZC.RECIPES).filter(x => !ZC.cookBlock(x, o) && ZC.RECIPES[x].time <= 180); if (a && can.length && ZC.cmdCook(a.id, o, can[rnd(can.length)])) did('cook'); }
        else if (st === 'spoiled') { ZC.cleanStove(o); did('clean'); }
        else if (st === 'cooking' && Math.random() < 0.03) { ZC.cleanStove(o); did('trash'); }
        else if (st === 'cooking' && Math.random() < 0.05 && ZC.speedUp(o)) did('speed');
      }
      const k = rnd(14), crew = ZC.crew();
      if (k === 0 && crew.length) { const z = crew[rnd(crew.length)]; if (!ZC.setRole(z, ['serve', 'cook', 'rest', 'reserve'][rnd(4)])) did('role'); }
      if (k === 1) { ZC.setRole(chef, Math.random() < 0.5 ? 'serve' : 'cook'); did('chefrole'); }
      if (k === 2) { const cu = ZC.rt.customers.find(c => !ZC.canInfect(c)); if (cu && ZC.startInfect(cu)) did('infect'); }
      if (k === 3) { const ch = ZC.objsOf('chair'); const o = ch[rnd(ch.length)]; if (!ZC.objectBusy(o)) { for (let t = 0; t < 20; t++) { const x = rnd(s.cafe.w), y = 1 + rnd(s.cafe.h - 1); if (ZC.canPlace(o.type, x, y, o)) { ZC.placeObject(o.type, x, y, o); did('move'); break; } } } }
      if (k === 4 && Math.random() < 0.3) { ZC.setClosed(!s.cafe.closed); did('door'); }
      if (k === 5 && crew.length) { const z = crew[rnd(crew.length)]; if (ZC.feedBrain(z)) did('brain'); }
      if (k === 6 && crew.length) { const z = crew[rnd(crew.length)], a = ZC.zombieActor(z.id); if (a) { z.energy = ZC.zMax(z) * (0.05 + Math.random() * 0.2); did('starve'); } }
      if (k === 7 && Math.random() < 0.15 && s.expansions < 2 && ZC.expandCafe()) did('expand');
      if (k === 8 && Math.random() < 0.3) { const type = ['counter_wood', 'table_wood', 'chair_wood', 'sink_wood', 'fridge_wood', 'stove_wood'][rnd(6)]; for (let t = 0; t < 20; t++) { const x = rnd(s.cafe.w), y = rnd(s.cafe.h); if (ZC.canPlace(type, x, y) && ZC.spend(ZC.ITEMS[type].price, 'compra')) { ZC.placeObject(type, x, y); did('buy'); break; } } }
      if (k === 9 && Math.random() < 0.2) { const o = s.cafe.objects[rnd(s.cafe.objects.length)]; if (!ZC.sellBlock(o) && ZC.objsOf(ZC.cat(o)).length > 2) { ZC.sellObject(o); did('sell'); } }
      if (k === 10) { const a = ZC.rt.zombies[rnd(ZC.rt.zombies.length)]; if (a && a.state !== 'collapsed') { ZC.dragStart(a, 0, 0); ZC.dropZombie(a, rnd(s.cafe.w), rnd(s.cafe.h)); ZC.dragEnd(); did('drag'); } }
      if (k === 11 && Math.random() < 0.25 && ZC.view.scene === 'cafe') {
        const squad = ZC.team().filter(z => !(z.revive > 0) && ZC.zPct(z) >= 0.2 && ZC.zombieActor(z.id));
        const tg = ZC.RAIDS.filter(t => t.lvl <= s.level && (s.raidReady[t.id] || 0) <= s.clock)[0];
        if (squad.length && tg) { ZC.beginRaid(tg, squad.map(z => z.id)); ZC.sendAll(); const R = ZC.raidDebug(); let t = 0; while (!R.result && t < 120) { ZC.fastForward(0.25); t += 0.25; if (Math.random() < 0.01) ZC.retreat(); } if (ZC.modalOpen) ZC.closeModal(); else ZC.leaveRaid(); did('raid:' + R.result); }
      }
      if (k === 12 && s.fridge.length) { const bt = s.fridge[rnd(s.fridge.length)]; if (ZC.knows(bt.r) ? ZC.cmdStock(bt) : ZC.studyBatch(bt)) did('fridge'); }
      if (k === 13 && Math.random() < 0.2) { ZC.save(); ZC.resetRuntime(); did('reload'); }
      const au = ZC.audit();
      if (!au.ok && bad.length < 3) bad.push({ step, au, last: Object.assign({}, acts) });
      stuckMax = Math.max(stuckMax, ZC.rt.customers.filter(c => c.state === 'wait' && c.patience < -2).length);
      for (const z of s.zombies) if (!(z.energy >= 0) || z.energy > ZC.zMax(z) + 0.01) bad.push({ step, energy: [z.name, z.energy, ZC.zMax(z)] });
    }
    return { acts, bad: bad.slice(0, 4), stuckMax, audit: ZC.audit(), coins: s.coins, toxin: s.toxin, level: s.level, rep: +ZC.rating().toFixed(2), served: s.stats.served, staff: s.zombies.length, clock: Math.round(s.clock),
      seatsDouble: (() => { const v = Object.values(ZC.rt.seat); return v.length !== new Set(v).size; })(), twoPlaces: s.zombies.filter(z => z.away && ZC.zombieActor(z.id)).length };
  });
  console.log(JSON.stringify(r, null, 1));
  check('books balanced at every one of 300 checks', r.bad.length === 0, r.bad);
  check('no customer stuck, no seat shared, nobody in two places', r.stuckMax === 0 && !r.seatsDouble && r.twoPlaces === 0, [r.stuckMax, r.seatsDouble, r.twoPlaces]);
  check('money and toxin never negative', r.coins >= 0 && r.toxin >= 0);
  check('no runtime errors', errs.length === 0, errs.slice(0, 5));
  await b.close(); process.exit(done() ? 1 : 0);
})();
