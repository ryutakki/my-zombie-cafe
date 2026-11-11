const { open } = require('./lib');
(async () => {
  const { b, p, errs } = await open();
  const out = await p.evaluate(async () => {
    const res = [];
    const real = setTimeout; window.setTimeout = (f, ms) => (ms === 1100 ? 0 : real(f, ms));   // skip the result popup
    ZC.CFG.raid.capture = false;
    for (const tg of ZC.RAIDS.filter(t => t.lvl <= 12)) {
      let wins = 0, left = 0, ko = 0, time = 0; const N = 8;
      for (let i = 0; i < N; i++) {
        const s = ZC.state; s.level = tg.lvl; s.raidReady = {}; s.fridge = []; s.pendingLoot = [];
        s.zombies = s.zombies.filter(z => z.chef);
        const n = ZC.maxZombies(tg.lvl), zl = Math.max(1, Math.round(tg.lvl / 2));
        for (let k = 0; k < n; k++) { const z = ZC.makeStaff(['pirate_zombie', 'thug', 'robber', 'assassin'][k % 4], { id: ZC.newId(), name: 'T' + k, tint: true }); z.lvl = zl; z.energy = Math.round(ZC.zMax(z) * 0.85); s.zombies.push(z); }
        ZC.syncZombies();
        ZC.beginRaid(tg, ZC.team().map(z => z.id)); ZC.sendAll();
        const R = ZC.raidDebug(); let t = 0;
        while (!R.result && t < 300) { ZC.fastForward(0.25); t += 0.25; }
        if (R.result === 'win') wins++;
        left += ZC.team().reduce((a, z) => a + ZC.zPct(z), 0) / n; ko += ZC.team().filter(z => z.revive > 0).length; time += t;
        for (const z of s.zombies) { delete z.away; z.revive = 0; }
        ZC.leaveRaid();
      }
      res.push([tg.id, tg.lvl, tg.enemies.length, ZC.maxZombies(tg.lvl), `${wins}/${N}`, 'energia ' + Math.round(100 * left / N) + '%', 'ko ' + (ko / N).toFixed(1), Math.round(time / N) + 's']);
    }
    return res;
  });
  for (const r of out) console.log(r.join('  '));
  console.log(errs.slice(0, 3));
  await b.close();
})();
