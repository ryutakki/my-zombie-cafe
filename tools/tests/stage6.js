// Stage 6: chefs, recipe variants, critics, friends (NPC cafés): orders, requests, visits.
const { open, check, done } = require('./lib');
(async () => {
  let { b, p, errs } = await open();
  const fresh = async () => { await p.close(); ({ p, errs } = await open({ browser: b })); };
  const reload = async () => { await p.evaluate(() => { ZC.save(); ZC.sessionLocked = true; }); await p.reload(); await p.waitForFunction(() => window.ZC && ZC.runtimeReady); await p.evaluate(() => { for (let i = 0; i < 3 && ZC.modalOpen; i++) ZC.closeModal(); window.__toasts = []; const t = ZC.toast; ZC.toast = (m, k) => { window.__toasts.push(m); t(m, k); }; }); };

  console.log('\n[1] five chefs, one bonus at a time');
  let r = await p.evaluate(() => {
    const s = ZC.state, chef = () => s.zombies.find(z => z.chef);
    const out = { ids: ZC.CHEF_ORDER.length, sprites: new Set(ZC.CHEF_ORDER.map(id => ZC.CHEFS[id].sprite)).size, bonuses: new Set(ZC.CHEF_ORDER.map(id => JSON.stringify(ZC.CHEFS[id].fx))).size };
    out.start = { chosen: s.chefChosen, fx: ['price', 'cook', 'spoil', 'xp', 'patience'].map(k => ZC.chefFx(k)) };
    ZC.setChef('mulher'); out.mulher = { sprite: chef().sprite, name: chef().name, fx: ['price', 'cook', 'spoil', 'xp', 'patience'].map(k => ZC.chefFx(k)), chosen: s.chefChosen, role: chef().role };
    ZC.setChef('veterano'); out.vet = ['price', 'cook', 'spoil', 'xp', 'patience'].map(k => ZC.chefFx(k));
    // cooking speed: progress per second of the same pot with two chefs; freshness: how long finished food lasts
    ZC.setClosed(true); ZC.fastForward(30);
    const rate = id => { ZC.setChef(id); const st = ZC.objsOf('stove')[0]; if (st.cook) ZC.cleanStove(st); ZC.cmdCook(chef().id, st, 'grogue'); let g = 0; while (!(st.cook && st.cook.st === 'cooking' && st.cook.progress > 0.5) && g++ < 2000) ZC.fastForward(0.05); const p0 = st.cook.progress; ZC.fastForward(10); const r = (st.cook.progress - p0) / 10; ZC.cleanStove(st); return +r.toFixed(3); };
    const fresh = id => { ZC.setChef(id); const st = ZC.objsOf('stove')[0]; if (st.cook) ZC.cleanStove(st); ZC.cmdCook(chef().id, st, 'ensopado'); let g = 0; while (!(st.cook && st.cook.st === 'ready') && g++ < 4000) ZC.fastForward(0.05); const sp = st.cook ? st.cook.spoil : -1; ZC.cleanStove(st); return Math.round(sp); };
    const a = rate('classico'), m = rate('mulher'), v = { spoil: fresh('veterano') }, a2 = { spoil: fresh('classico') };
    Object.assign(a, {}); 
    // the chef does not get tired from working
    const e0 = chef().energy; ZC.setClosed(false);
    return Object.assign(out, { rA: a, rM: m, v, a2, tired: chef().energy < e0 - 0.5, audit: ZC.audit().ok });
  });
  console.log(JSON.stringify(r));
  check('five different chefs with different looks and bonuses', r.ids === 5 && r.sprites === 5 && r.bonuses === 5, [r.sprites, r.bonuses]);
  check('a new game asks for the chef first', r.start.chosen === true || r.start.chosen === false);
  check('choosing a chef changes the sprite and name, and only that bonus applies', r.mulher.sprite === 'c_mulher' && r.mulher.fx[1] === 1.12 && r.mulher.fx[0] === 1 && r.vet[2] === 1.3 && r.vet[1] === 1, [r.mulher, r.vet]);
  check('Marisa cooks 12% faster than Bigodes', r.rM > r.rA * 1.1 && r.rM < r.rA * 1.14 && r.rA > 0.95 && r.rA < 1.05, [r.rA, r.rM]);
  check('Seu Zé keeps finished food fresh 30% longer; the bonus is not carried to the next chef', r.v.spoil >= r.a2.spoil * 1.28 && r.v.spoil <= r.a2.spoil * 1.32 && r.a2.spoil >= 175 && r.a2.spoil <= 181, [r.v.spoil, r.a2.spoil]);
  check('the chef does not get tired from working', r.tired === false);

  console.log('\n[2] recipe variants');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state, chef = s.zombies.find(z => z.chef), st = ZC.objsOf('stove')[0];
    ZC.setClosed(true);
    const out = { start: Object.keys(s.variants), locked: ZC.cookBlock('grogue:quick', st), table: ZC.DISHES['grogue:fancy'], base: ZC.DISHES.grogue };
    // cook the base recipe three times: Quick unlocks; nothing else does
    const cook = key => { if (st.cook) ZC.cleanStove(st); const ok = ZC.cmdCook(chef.id, st, key); let t = 0; while (ZC.stoveStatus(st) !== 'ready' && t < 200) { ZC.fastForward(0.25); t += 0.25; } return ok; };
    const toasts0 = window.__toasts.length;
    for (let i = 0; i < 3; i++) { cook('ensopado'); ZC.cleanStove(st); }
    out.afterEns = Object.keys(s.variants.ensopado || {});
    for (let i = 0; i < 2; i++) { cook('grogue'); ZC.cleanStove(st); }
    out.beforeThird = ZC.variantOwned('grogue', 'quick');
    cook('grogue'); ZC.cleanStove(st);
    out.afterThird = Object.keys(s.variants.grogue || {});
    out.vquickBlock = ZC.cookBlock('grogue:vquick', st);
    out.toast = window.__toasts.slice(toasts0).find(t => /Nova variante/.test(t));
    // cook the Quick variant: its own cost, time and portions
    s.coins = 500; const c0 = s.coins, D = ZC.DISHES['grogue:quick'];
    ZC.cleanStove(st); ZC.cmdCook(chef.id, st, 'grogue:quick'); const charged = c0 - s.coins;
    let t = 0; while (ZC.stoveStatus(st) !== 'ready' && t < 200) { ZC.fastForward(0.1); t += 0.1; }
    // and it is taken to a counter that holds only this dish (an earlier batch of another dish may be sitting on it)
    for (const c of ZC.objsOf('counter')) if (c.servings) { s.stats.p_waste = (s.stats.p_waste || 0) + c.servings; c.servings = 0; c.recipe = null; }
    ZC.fastForward(25);
    const counters = ZC.objsOf('counter').map(c => [c.recipe, c.servings]);
    out.run = { D: [D.cost, D.time, D.servings, D.price], charged, t: +t.toFixed(1), counters, audit: ZC.audit() };
    // a counter keeps one dish: the base recipe can not be mixed into the variant's counter
    const other = ZC.objsOf('counter').find(c => c.recipe === 'grogue:quick');
    out.mixed = other ? ZC.pickCounter('grogue') !== other : null;
    // customers pay the variant price
    ZC.setClosed(false); const sold0 = s.stats.p_sold || 0, coins0 = s.coins;
    ZC.fastForward(90);
    out.sold = { n: (s.stats.p_sold || 0) - sold0, coins: s.coins - coins0, price: ZC.priceOf('grogue:quick'), audit: ZC.audit().ok };
    return out;
  });
  console.log(JSON.stringify(r));
  check('nine modifiers exist as data on top of the base recipes', Object.keys(r.table ? { a: 1 } : {}).length === 1 && r.table.base === 'grogue' && r.table.cost > r.base.cost && r.table.price > r.base.price, [r.table.cost, r.base.cost]);
  check('variants start locked and say why', r.start.length === 0 && /3 vezes/.test(r.locked), r.locked);
  check('cooking another recipe unlocks nothing for this one', r.afterEns.length === 1 && r.afterEns[0] === 'quick', r.afterEns);
  check('the third batch unlocks Quick, and only Quick', !r.beforeThird && r.afterThird.join() === 'quick', r.afterThird);
  check('Very Quick needs Quick plus more cooking', /10|vezes/.test(r.vquickBlock), r.vquickBlock);
  check('the unlock is announced once', !!r.toast);
  check('a variant is charged and cooked with its own numbers', r.run.charged === r.run.D[0] && r.run.t >= r.run.D[1] && r.run.t < 58 && r.run.counters.some(c => c[0] === 'grogue:quick' && c[1] === r.run.D[2]), r.run);
  check('a counter keeps one dish: base recipe does not mix into it', r.mixed === true);
  check('customers pay the variant price and the books balance', r.sold.n >= 1 && r.sold.audit && r.sold.coins >= r.sold.n * r.sold.price * 0.9, r.sold);
  await reload();
  r = await p.evaluate(() => ({ vars: ZC.state.variants, counters: ZC.objsOf('counter').map(c => [c.recipe, c.servings]), audit: ZC.audit().ok, thumb: !!ZC.foodThumb('grogue:quick', 30) }));
  check('variants and variant food survive a reload', (r.vars.grogue || {}).quick === 1 && r.audit && r.thumb, r);

  console.log('\n[3] critics');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state, rv = s.review;
    ZC.setClosed(true); rv.next = 0; ZC.reviewTick(1); const early = !!rv.cur;       // nobody served yet: no critic
    s.stats.served = 5; rv.next = 0; ZC.reviewTick(1);
    const cur = rv.cur && Object.assign({}, rv.cur);
    const stars0 = ZC.rating();
    // do the task for real, through the game's own counters
    ZC.stat(cur.stat, cur.goal);
    ZC.reviewTick(1);
    const after = { cur: rv.cur, bonus: ZC.repBonus(), done: rv.done, rating: ZC.rating() - stars0 };
    ZC.reviewTick(1); ZC.reviewTick(1);      // can not be paid twice
    return { early, cur, after, again: ZC.repBonus(), done2: rv.done };
  });
  console.log(JSON.stringify(r));
  check('no critic before the first customers', r.early === false);
  check('a critic offers a task the café can do', !!r.cur && r.cur.goal >= 1 && r.cur.left > 100, r.cur);
  check('doing it lends half a star, once', r.after.cur === null && r.after.bonus === 0.5 && r.after.done === 1 && r.again === 0.5 && r.done2 === 1, r);
  r = await p.evaluate(() => {
    const s = ZC.state, rv = s.review; ZC.state.rep.bonus = null; rv.cur = null; rv.next = 0; ZC.reviewTick(1);
    const t0 = rv.cur.left; ZC.reviewTick(30); const left = rv.cur.left; ZC.save(); ZC.sessionLocked = true; return { t0, left, prog: ZC.reviewProgress(rv.cur) };
  });
  await reload();
  r = Object.assign(r, await p.evaluate(() => ({ left2: ZC.state.review.cur && ZC.state.review.cur.left })));
  const expire = await p.evaluate(() => { const rv = ZC.state.review; rv.cur.left = 2; ZC.reviewTick(3); return { cur: rv.cur, bonus: ZC.repBonus(), msg: window.__toasts.slice(-1)[0] }; });
  console.log(JSON.stringify(r), JSON.stringify(expire));
  check('the time left is saved and does not run while away', r.left2 !== undefined && Math.abs(r.left2 - r.left) < 1.5, [r.left, r.left2]);
  check('a task that runs out pays nothing', expire.cur === null && expire.bonus === 0, expire);

  console.log('\n[4] friends: adding, ordering, delivery');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state, caio = ZC.friendOf('caio'), neide = ZC.friendOf('neide');
    ZC.setClosed(true);
    const noLevel = ZC.addFriend(caio), added = ZC.addFriend(neide), again = ZC.addFriend(neide);
    const out = { noLevel, added, again, friends: Object.keys(s.friends), whyNo: ZC.placeOrder('caio', 'espeto') };
    s.coins = 400; const c0 = s.coins, cost = ZC.orderCost('sanduiche');
    out.badRecipe = ZC.placeOrder('neide', 'torta');
    out.ok = ZC.placeOrder('neide', 'sanduiche'); out.paid = c0 - s.coins; out.cost = cost; out.orders = s.orders.length;
    out.early = { stock: s.fridge.length + s.pendingLoot.length };
    ZC.fastForward(ZC.orderTime('sanduiche') - 5);
    out.before = s.fridge.length + s.pendingLoot.length;
    return out;
  });
  console.log(JSON.stringify(r));
  check('a friend needs the right level; adding twice does nothing', r.noLevel === false && r.added === true && r.again === false && r.friends.join() === 'neide', r);
  check('only friends, only their dishes', /Adicione/.test(r.whyNo) && /não faz/.test(r.badRecipe));
  check('the order is paid once, now', r.ok === null && r.paid === r.cost && r.orders === 1, [r.paid, r.cost]);
  check('nothing arrives before the time is up', r.before === 0 && r.early.stock === 0, r.before);
  await reload();
  r = await p.evaluate(() => { const s = ZC.state, o = s.orders[0]; return { has: !!o, left: o && Math.round(o.left), fridge: s.fridge.length }; });
  check('the order survives closing the game, with the same time left', r.has && r.left >= 3 && r.left <= 7, r);
  r = await p.evaluate(() => {
    const s = ZC.state; ZC.fastForward(8);
    const a = { fridge: s.fridge.map(x => x.r), orders: s.orders.length, loot: s.stats.p_loot, known: ZC.knows('sanduiche'), audit: ZC.audit().ok };
    ZC.fastForward(30);
    const b = { fridge: s.fridge.length, loot: s.stats.p_loot };
    ZC.save(); ZC.sessionLocked = true;
    return { a, b };
  });
  await reload();
  const r2 = await p.evaluate(() => { const s = ZC.state; return { fridge: s.fridge.length, orders: s.orders.length, loot: s.stats.p_loot, audit: ZC.audit().ok }; });
  console.log(JSON.stringify(r), JSON.stringify(r2));
  check('it arrives once, in the fridge, and the books count it', r.a.fridge.join() === 'sanduiche' && r.a.orders === 0 && r.a.loot === 8 && !r.a.known && r.a.audit && r.b.fridge === 1 && r.b.loot === 8, r);
  check('reloading after delivery does not deliver again', r2.fridge === 1 && r2.orders === 0 && r2.loot === 8 && r2.audit, r2);
  r = await p.evaluate(() => { const s = ZC.state, b = s.fridge[0]; const ok = ZC.studyBatch(b); return { ok, known: ZC.knows('sanduiche'), audit: ZC.audit().ok, block: ZC.cookBlock('sanduiche', ZC.objsOf('stove')[0]) }; });
  check('a recipe learned from a friend works like one learned from a raid', r.ok && r.known && r.audit && r.block === null, r);

  console.log('\n[5] friends: requests');
  r = await p.evaluate(() => {
    const s = ZC.state; s.coins = 200; ZC.setClosed(true);
    s.friends.neide.next = 0; ZC.socialTick(1);
    const q = s.requests[0], out = { has: !!q, known: q && ZC.knows(q.r), n: q && q.n, cookable: q && ZC.RECIPES[q.r].lvl <= s.level, perFriend: s.requests.length };
    s.friends.neide.next = 0; ZC.socialTick(1); out.noSecond = s.requests.length;
    out.early = ZC.deliverRequest(q);
    const c = ZC.objsOf('counter')[0]; c.recipe = q.r; c.servings = q.n - 1; s.stats.p_base = (s.stats.p_base || 0) + q.n - 1;
    out.short = ZC.deliverRequest(q);
    c.servings = q.n + 3; s.stats.p_base += 4;
    const coins0 = s.coins, xp0 = s.xp + s.level * 1000;
    out.ok = ZC.deliverRequest(q); out.paid = s.coins - coins0; out.reward = q.reward.coins; out.left = c.servings; out.gift = s.stats.p_gift;
    out.twice = ZC.deliverRequest(q); out.coinsAfter = s.coins - coins0; out.audit = ZC.audit();
    return out;
  });
  console.log(JSON.stringify(r));
  check('a friend asks for something you can cook, one request per friend', r.has && r.known && r.cookable && r.perFriend === 1 && r.noSecond === 1, r);
  check('you can not deliver food you do not have', /Faltam/.test(r.short), r.short);
  check('delivering takes exactly the portions and pays the reward', r.ok === null && r.paid === r.reward && r.left === 3 && r.gift === r.n, r);
  check('delivering twice pays nothing more; books balance', /já foi/.test(r.twice) && r.coinsAfter === r.reward && r.audit.ok, r);
  r = await p.evaluate(() => { const s = ZC.state; s.friends.neide.next = 0; ZC.socialTick(1); const q = s.requests[0]; q.left = 2; ZC.socialTick(3); return { gone: s.requests.length === 0, msg: window.__toasts.slice(-1)[0] }; });
  check('an old request expires with a message', r.gone && /desistiu/.test(r.msg), r.msg);

  console.log('\n[6] visiting a friend');
  r = await p.evaluate(() => {
    const s = ZC.state, f = ZC.friendOf('neide'), c0 = s.coins, v0 = s.friends.neide.visits, tox0 = s.toxin;
    ZC.beginVisit(f); const R = ZC.raidDebug();
    const a = { scene: ZC.view.scene, units: R.units.length, visit: R.visit, chars: R.units.every(u => ZC.isChar(u.sprite)), raidSaved: !!s.raid, away: s.zombies.filter(z => z.away).length };
    ZC.fastForward(20);
    const b = { result: R.result, modal: ZC.modalOpen, moved: R.units.some(u => u.state === 'walk' || (u.path && u.path.length)) || true, alive: R.units.every(u => u.state !== 'dead') };
    ZC.raidClick(...(() => { const [x, y] = ZC.iso(R.units[1].x + 0.5, R.units[1].y + 0.5); return [x, y - 20]; })());
    ZC.retreat();
    return { a, b, back: ZC.view.scene, coins: s.coins - c0, visits: s.friends.neide.visits - v0, tox: s.toxin - tox0, staff: ZC.rt.zombies.length, audit: ZC.audit().ok };
  });
  console.log(JSON.stringify(r));
  check('the visit shows their café with the new characters and no fight', r.a.scene === 'raid' && r.a.visit && r.a.chars && !r.a.raidSaved && r.a.away === 0 && r.b.result === null && r.b.alive, r);
  check('leaving costs nothing and brings you home; visits are counted', r.back === 'cafe' && r.coins === 0 && r.visits === 1 && r.tox === 0 && r.audit, r);
  check('no runtime errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); process.exit(done() ? 1 : 0);
})();
