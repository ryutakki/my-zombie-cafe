// Stage 1: minimal café. Kitchen with a cook, finite portions, service, cleaning, alternative exits, reload.
const { open, check, done } = require('./lib');
const stove = `ZC.objsOf('stove')`;
(async () => {
  let { b, ctx, p, errs } = await open();
  const ev = f => p.evaluate(f);
  const chefId = await ev(() => ZC.state.zombies.find(z => z.chef).id);

  console.log('\n[1] twenty complete services');
  let r = await p.evaluate(() => {
    const chef = ZC.state.zombies.find(z => z.chef), st = ZC.objsOf('stove');
    const c0 = ZC.state.coins;
    const ok1 = ZC.cmdCook(chef.id, st[0], 'grogue');            // 14 portions, 60 s
    ZC.fastForward(8);
    const mid = { status: ZC.stoveStatus(st[0]), coinsAfterCharge: ZC.state.coins, progress: st[0].cook && st[0].cook.progress };
    let guard = 0, cooks = 1;
    while ((ZC.state.stats.served || 0) < 20 && guard++ < 400) {
      ZC.fastForward(5);
      if (ZC.stoveStatus(st[0]) === 'empty' && !ZC.objsOf('counter').some(c => c.servings > 6) && ZC.autoZombie(st[0], ['cook'])) { ZC.cmdCook(chef.id, st[0], 'grogue'); cooks++; }
    }
    const s = ZC.state.stats, led = ZC.state.ledger;
    return { ok1, c0, mid, cooks, served: s.served, sold: s.p_sold, made: s.p_made, washed: s.washed, gaveup: s.gaveup || 0, audit: ZC.audit(), clock: Math.round(ZC.state.clock),
      coins: ZC.state.coins, tips: s.t_tips || 0, earned: s.earned, sales: led.filter(l => l.why === 'venda').length, rep: +ZC.rating().toFixed(2),
      stuck: ZC.rt.customers.filter(c => c.state === 'wait' && c.patience < -1).length, dirtyLeft: Object.keys(ZC.rt.dirty).length, seats: ZC.seatCount() };
  });
  console.log(JSON.stringify(r));
  check('batch charged once when ordered', r.mid.coinsAfterCharge === r.c0 - 20, r.mid);
  check('20 customers served', r.served >= 20, r.served);
  check('every served customer paid exactly once', r.served === r.sold, [r.served, r.sold]);
  check('portions add up (made = sold + waste + in play)', r.audit.ok, r.audit);
  check('plates were washed and seats reused', r.washed >= 12 && r.dirtyLeft <= r.seats, [r.washed, r.dirtyLeft]);
  check('nobody stuck waiting past patience', r.stuck === 0);
  check('reputation rose with service', r.rep > 1.5, r.rep);

  console.log('\n[2] blocked seats');
  r = await p.evaluate(() => {
    const c = ZC.state.cafe, chairs = ZC.objsOf('chair'), ch = chairs[0], seats0 = ZC.seatCount();
    // a) the editor refuses a placement that would wall a chair in
    const wallIn = (() => { // try to surround chair with barrels on its free sides
      const free = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => [ch.x+dx, ch.y+dy]).filter(([x,y]) => ZC.tileFree(x,y));
      let placed = 0, refused = 0;
      for (const [x,y] of free) { if (ZC.canPlace('barrel', x, y)) { ZC.state.cafe.objects.push({ id: ZC.newId(), type: 'barrel', x, y, _t: 1 }); ZC.rebuildGrid(); placed++; } else refused++; }
      return { free: free.length, placed, refused };
    })();
    c.objects = c.objects.filter(o => !o._t); ZC.rebuildGrid();
    // b) force it anyway (as a corrupted layout would): the chair must stop being a seat and say why
    const free = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => [ch.x+dx, ch.y+dy]).filter(([x,y]) => ZC.tileFree(x,y));
    for (const [x,y] of free) c.objects.push({ id: ZC.newId(), type: 'barrel', x, y, _t: 1 });
    ZC.rebuildGrid();
    const bad = ZC.rt.badSeat[ch.id], seats1 = ZC.seatCount();
    ZC.fastForward(60);
    const used = ZC.rt.seat[ch.id];
    c.objects = c.objects.filter(o => !o._t); ZC.rebuildGrid();
    // c) a chair with no table next to it
    const lone = { id: ZC.newId(), type: 'chair_wood', x: 4, y: 6 }; c.objects.push(lone); ZC.rebuildGrid();
    const loneBad = ZC.rt.badSeat[lone.id];
    c.objects.splice(c.objects.indexOf(lone), 1); ZC.rebuildGrid();
    return { wallIn, bad, seats0, seats1, used: used || null, loneBad, audit: ZC.audit() };
  });
  console.log(JSON.stringify(r));
  check('editor refuses to wall a chair in', r.wallIn.refused >= 1, r.wallIn);
  check('unreachable chair is not a seat and says why', !!r.bad && r.seats1 === r.seats0 - 1 && !r.used, r);
  check('chair without a table is flagged', !!r.loneBad, r.loneBad);

  console.log('\n[3] no food');
  await p.close();
  ({ p, errs } = await open({ browser: b })); // fresh context => fresh save
  r = await p.evaluate(() => {
    const rep0 = ZC.state.rep.score;
    ZC.fastForward(150);                       // nobody cooks
    const s = ZC.state.stats;
    return { gaveup: s.gaveup || 0, served: s.served || 0, rep0, rep: ZC.state.rep.score, why: ZC.state.rep.log.map(l => l.why), coins: ZC.state.coins, audit: ZC.audit(),
      shout: ZC.rt.fx.concat([]).length, waiting: ZC.rt.customers.filter(c => c.state === 'wait').length };
  });
  console.log(JSON.stringify(r));
  check('customers give up when there is no food', r.gaveup >= 3 && r.served === 0, r.gaveup);
  check('reputation falls and names the cause', r.rep < r.rep0 && r.why.includes('clientes sem comida'), r.why);
  check('no money appears from unserved customers', r.coins === 300, r.coins);

  console.log('\n[4] role change with a portion in transit');
  r = await p.evaluate(() => {
    const chef = ZC.state.zombies.find(z => z.chef), st = ZC.objsOf('stove');
    ZC.cmdCook(chef.id, st[0], 'ensopado'); ZC.fastForward(40);
    let a = null, guard = 0;
    while (!a && guard++ < 2000) { ZC.fastForward(0.05); a = ZC.rt.zombies.find(q => q.carry && q.carry.kind === 'dish'); }
    if (!a) return { found: false, counters: ZC.objsOf('counter').map(c => c.servings), served: ZC.state.stats.served };
    const cnt = () => ZC.objsOf('counter').reduce((n, c) => n + (c.servings || 0), 0);
    const before = cnt(), z = ZC.zombieData(a.id), au0 = ZC.audit();
    const why = ZC.setRole(z, 'cook');
    const after = cnt(), au1 = ZC.audit();
    ZC.setRole(z, 'serve');
    return { found: true, before, after, why, carry: a.carry, au0, au1 };
  });
  console.log(JSON.stringify(r));
  check('a waiter was caught carrying a portion', r.found, r);
  check('the portion went back to the counter (exists in one place only)', r.found && r.after === r.before + 1 && r.carry === null && r.au1.ok, r);

  console.log('\n[5] cook leaves the pot: pause, then burn; and resume keeps progress');
  r = await p.evaluate(() => {
    const chef = ZC.state.zombies.find(z => z.chef), st = ZC.objsOf('stove'), o = st[1];
    ZC.fastForward(30);
    ZC.cmdCook(chef.id, o, 'grogue'); ZC.fastForward(20);
    const s1 = ZC.stoveStatus(o), p1 = o.cook.progress;
    ZC.setRole(chef, 'serve'); ZC.fastForward(10);
    const s2 = ZC.stoveStatus(o), p2 = o.cook.progress, ab = o.cook.abandon;
    ZC.setRole(chef, 'cook'); ZC.fastForward(12);          // the cook walks back by itself
    const s3 = ZC.stoveStatus(o), p3 = o.cook.progress;
    ZC.setRole(chef, 'serve'); ZC.fastForward(ZC.CFG.kitchen.abandon + 5);
    const s4 = ZC.stoveStatus(o), why = o.cook.why, coins = ZC.state.coins;
    ZC.cleanStove(o); ZC.setRole(chef, 'cook');
    return { s1, p1: +p1.toFixed(1), s2, p2: +p2.toFixed(1), ab: +ab.toFixed(1), s3, p3: +p3.toFixed(1), s4, why, audit: ZC.audit(), burnt: ZC.state.stats.burnt };
  });
  console.log(JSON.stringify(r));
  check('cooking only advances with a cook', r.s1 === 'cooking' && r.s2 === 'paused' && Math.abs(r.p2 - r.p1) < 0.2, r);
  check('abandon timer counts down while alone', r.ab < 45 && r.ab > 30, r.ab);
  check('a cook resumes and progress continues', r.s3 === 'cooking' && r.p3 > r.p2 + 3, r);
  check('left alone too long it burns (no endless production)', r.s4 === 'spoiled' && r.why === 'burnt', r);
  check('books still balance', r.audit.ok, r.audit);

  console.log('\n[6] a finished batch with no counter stays on the stove and spoils');
  r = await p.evaluate(() => {
    const chef = ZC.state.zombies.find(z => z.chef), st = ZC.objsOf('stove'), o = st[1], cs = ZC.objsOf('counter');
    ZC.setClosed(true); ZC.fastForward(80);     // empty the room so nobody eats the counter clean
    // make every counter ineligible: fill them with another recipe
    for (const c of cs) { if (!c.servings) { c.recipe = 'grogue'; c.servings = 1; ZC.state.stats.p_base = (ZC.state.stats.p_base || 0) + 1; } }
    const other = cs[0].recipe === 'ensopado' ? 'grogue' : 'ensopado';
    ZC.cmdCook(chef.id, o, other); ZC.fastForward(ZC.RECIPES[other].time + 15);
    const s1 = ZC.stoveStatus(o), made = ZC.state.stats.p_made, carried = ZC.rt.zombies.some(a => a.carry && a.carry.kind === 'batch');
    ZC.fastForward(ZC.spoilTime(ZC.RECIPES[other]) + 5);
    const s2 = ZC.stoveStatus(o), why = o.cook.why, waste = ZC.state.stats.p_waste;
    const au = ZC.audit(); ZC.cleanStove(o); ZC.setClosed(false);
    return { other, s1, carried, s2, why, waste, au, toasts: window.__toasts.filter(t => /balcão|estrag/i.test(t)).slice(-3) };
  });
  console.log(JSON.stringify(r));
  check('batch waits on the stove when no counter is eligible', r.s1 === 'ready' && !r.carried, r);
  check('it spoils and the portions are written off', r.s2 === 'spoiled' && r.why === 'spoiled' && r.au.ok, r);

  console.log('\n[7] reload during cooking: same state, no progress for the time away');
  r = await p.evaluate(() => {
    const chef = ZC.state.zombies.find(z => z.chef), o = ZC.objsOf('stove')[0];
    if (o.cook) ZC.cleanStove(o);
    ZC.cmdCook(chef.id, o, 'espeto') || ZC.cmdCook(chef.id, o, 'grogue'); ZC.fastForward(25);
    ZC.save();
    const snap = { st: ZC.stoveStatus(o), progress: o.cook.progress, coins: ZC.state.coins, clock: ZC.state.clock, energy: ZC.state.zombies.map(z => Math.round(z.energy)),
      cust: ZC.rt.customers.filter(c => ['wait', 'eat'].includes(c.state)).length, portions: ZC.objsOf('counter').map(c => c.servings || 0), audit: ZC.audit() };
    // pretend the player was away for three days
    const raw = JSON.parse(localStorage.getItem(ZC.SAVE_KEY)); raw.lastSeen = Date.now() - 3 * 864e5; localStorage.setItem(ZC.SAVE_KEY, JSON.stringify(raw));
    ZC.sessionLocked = true;    // stop this page from saving again before the reload
    return snap;
  });
  await p.reload();
  await p.waitForFunction(() => window.ZC && ZC.runtimeReady);
  const r2 = await p.evaluate(() => {
    if (ZC.modalOpen) ZC.closeModal();
    const o = ZC.objsOf('stove')[0];
    const now = { hasCook: !!o.cook, st: o.cook && o.cook.st, progress: o.cook && o.cook.progress, coins: ZC.state.coins, clock: ZC.state.clock, energy: ZC.state.zombies.map(z => Math.round(z.energy)),
      cust: ZC.rt.customers.filter(c => ['wait', 'eat'].includes(c.state)).length, portions: ZC.objsOf('counter').map(c => c.servings || 0), audit: ZC.audit() };
    ZC.fastForward(12);
    now.resumed = ZC.stoveStatus(o); now.progress2 = o.cook && o.cook.progress;
    return now;
  });
  console.log(JSON.stringify(r), '\n', JSON.stringify(r2));
  check('batch is still there with the same progress', r2.hasCook && Math.abs(r2.progress - r.progress) < 1.5, [r.progress, r2.progress]);
  check('coins, clock and energy did not move while away', r2.coins === r.coins && Math.abs(r2.clock - r.clock) < 1.5 && JSON.stringify(r2.energy) === JSON.stringify(r.energy), [r.coins, r2.coins, r.clock, r2.clock]);
  check('customers in the room came back', r2.cust === r.cust, [r.cust, r2.cust]);
  check('the cook goes back to the pot by itself', r2.resumed === 'cooking' && r2.progress2 > r2.progress, r2);
  check('books balance after reload', r2.audit.ok, r2.audit);

  check('no runtime errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); process.exit(done() ? 1 : 0);
})();
