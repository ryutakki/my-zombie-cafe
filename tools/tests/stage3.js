// Stage 3: progression. Recipes known vs cookable, equipment, fridge, shop, expansion, levels, economy, reputation.
const { open, check, done } = require('./lib');
const SEED = `(() => { let a = 777; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })()`;
(async () => {
  let { b, p, errs } = await open();
  const fresh = async () => { await p.close(); ({ p, errs } = await open({ browser: b })); };

  console.log('\n[1] knowing a recipe, having food and being able to cook are three things');
  let r = await p.evaluate(() => {
    const s = ZC.state, st = ZC.objsOf('stove')[0];
    const known0 = Object.keys(s.known).sort(), total = Object.keys(ZC.RECIPES).length;
    const blocks = { grogue: ZC.cookBlock('grogue', st), espeto: ZC.cookBlock('espeto', st), sanduiche: ZC.cookBlock('sanduiche', st), torta: ZC.cookBlock('torta', st) };
    const tox0 = s.toxin;
    ZC.addXP(ZC.xpForLevel(1));                         // exactly level 2
    const lvl = s.level, after = { espeto: ZC.cookBlock('espeto', st), torta: ZC.cookBlock('torta', st), knowsTorta: ZC.knows('torta') };
    const tox1 = s.toxin;
    ZC.learn('torta'); ZC.learn('torta');               // learning again changes nothing
    // equipment: a known recipe that needs a better stove
    ZC.learn('polvo', true); s.level = 4;
    const wood = ZC.cookBlock('polvo', st);
    const stone = { id: ZC.newId(), type: 'stove_stone', x: 4, y: 0 }; s.cafe.objects.push(stone); ZC.rebuildGrid();
    const onStone = ZC.cookBlock('polvo', stone);
    const free = ZC.objsOf('counter').every(c => !c.servings);
    return { known0, total, blocks, lvl, after, toxGain: tox1 - tox0, wood, onStone, free, uses: [...new Set(Object.values(ZC.RECIPES).map(x => x.use))] };
  });
  console.log(JSON.stringify(r));
  check('thirteen recipes in the book, three known at the start', r.total >= 12 && r.known0.join() === 'ensopado,espeto,grogue', [r.total, r.known0]);
  check('known but not cookable yet names the level', r.blocks.grogue === null && /nível 2/.test(r.blocks.espeto), r.blocks);
  check('unknown recipe explains how to get it', /Beco dos Ladrões/.test(r.blocks.sanduiche) && /nível 2/.test(r.blocks.torta), r.blocks);
  check('level 2 unlocks once: learns Torta, frees Espetinho, +1 toxin', r.lvl === 2 && r.after.espeto === null && r.after.torta === null && r.after.knowsTorta && r.toxGain === 1, r.after);
  check('equipment gates a recipe', /Pedra/.test(r.wood) && r.onStone === null, [r.wood, r.onStone]);
  check('knowing recipes created no free food', r.free);
  check('recipes have different uses', r.uses.length >= 4, r.uses);

  console.log('\n[2] fridge: capacity, waiting list, study once, serve');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state;
    const cap = ZC.fridgeCap();
    const add = rid => { const b = ZC.storeBatch({ r: rid, servings: ZC.RECIPES[rid].servings, from: 'beco' }); s.stats.p_loot = (s.stats.p_loot || 0) + b.servings; return b; };
    const b1 = add('sanduiche'), b2 = add('grogue'), b3 = add('costela');
    const sizes = [s.fridge.length, s.pendingLoot.length], au0 = ZC.audit();
    const sellWhy = ZC.sellBlock(ZC.objsOf('fridge')[0]);
    // study the unknown batch
    const k0 = ZC.knows('sanduiche'), st1 = ZC.studyBatch(b1), k1 = ZC.knows('sanduiche'), st2 = ZC.studyBatch(b1);
    const afterStudy = [s.fridge.length, s.pendingLoot.length], studied = s.stats.studied, au1 = ZC.audit();
    const cookable = ZC.cookBlock('sanduiche', ZC.objsOf('stove')[0]);
    // a known batch can not be "studied" again
    const st3 = ZC.studyBatch(b2);
    // serve the known batch
    const ok = ZC.cmdStock(b2), ok2 = ZC.cmdStock(b2);
    ZC.setClosed(true);
    ZC.fastForward(25);
    const counter = ZC.objsOf('counter')[0];
    return { cap, sizes, sellWhy, k0, st1, k1, st2, afterStudy, studied, cookable, st3, ok, ok2, counter: [counter.recipe, counter.servings], fridge: s.fridge.map(x => x.r), au0, au1, au2: ZC.audit() };
  });
  console.log(JSON.stringify(r));
  check('one fridge holds 2 batches; the third waits and is not lost', r.cap === 2 && r.sizes.join() === '2,1' && r.au0.ok, r.sizes);
  check('a fridge holding loot can not be sold', !!r.sellWhy, r.sellWhy);
  check('studying uses the batch up once and the recipe stays', !r.k0 && r.st1 && r.k1 && !r.st2 && r.studied === 1 && r.cookable === null, r);
  check('the waiting batch moved into the freed slot', r.afterStudy.join() === '2,0', r.afterStudy);
  check('a known recipe is not charged a second discovery', r.st3 === false);
  check('a worker carries the batch to a counter (once)', r.ok && !r.ok2 && r.counter[0] === 'grogue' && r.counter[1] === 14, r.counter);
  check('books balance (loot = studied + in play)', r.au1.ok && r.au2.ok, r.au2);

  console.log('\n[3] shop, expansion, economy');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state, c = s.cafe;
    const counter = ZC.objsOf('counter')[0]; counter.recipe = 'grogue'; counter.servings = 9; s.stats.p_base = 9;
    const xp0 = s.xp, coins0 = s.coins;
    // buy a table through the same path the UI uses
    ZC.beginPlacing('table_wood');
    const spot = (() => { for (let y = 1; y < c.h; y++) for (let x = 0; x < c.w; x++) if (ZC.canPlace('table_wood', x, y)) return [x, y]; })();
    const before = c.objects.length;
    const price = ZC.ITEMS.table_wood.price;
    const ok = ZC.spend(price, 'compra: mesa') && ZC.placeObject('table_wood', spot[0], spot[1]); ZC.cancelPlacing();
    const bought = c.objects.length - before, paid = coins0 - s.coins;
    const o = c.objects[c.objects.length - 1];
    // move it and move it back: no money, no xp
    const c1 = s.coins; ZC.placeObject('table_wood', spot[0], spot[1], o); const moveFree = s.coins === c1 && s.xp === xp0;
    ZC.sellObject(o); const back = s.coins - c1;
    // can not overspend
    s.coins = 10; const over = ZC.spend(50, 'teste'), still = s.coins;
    // expansion x2
    s.coins = 5000;
    const objs0 = JSON.stringify(c.objects.map(q => [q.id, q.x, q.y])), size0 = [c.w, c.h], cost1 = ZC.expandCost(0), cost2 = ZC.expandCost(1);
    const e1 = ZC.expandCafe(), e2 = ZC.expandCafe();
    const size2 = [c.w, c.h], paidExp = 5000 - s.coins;
    const objs2 = JSON.stringify(c.objects.map(q => [q.id, q.x, q.y]));
    const validAll = c.objects.every(q => ZC.inCafe(q.x, q.y)) && ZC.rt.zombies.every(a => ZC.inCafe(Math.round(a.x), Math.round(a.y)));
    const moreRoom = (() => { let n = 0; for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (ZC.tileFree(x, y)) n++; return n; })();
    ZC.fastForward(40);
    const served = s.stats.served || 0;
    // bankruptcy rescue
    ZC.setClosed(true); ZC.fastForward(60);
    s.coins = 0; counter.servings = 0; counter.recipe = null; s.stats.p_base = (s.stats.p_sold || 0) + (s.stats.p_waste || 0) + ZC.rt.customers.filter(q => q.state === 'eat').length;
    for (const st of ZC.objsOf('stove')) st.cook = null;
    const rescue = ZC.rescueRecipe(), cost = ZC.cookCost('ensopado');
    const chef = s.zombies.find(z => z.chef);
    const cooked = ZC.cmdCook(chef.id, ZC.objsOf('stove')[0], 'ensopado');
    const afterRescue = ZC.rescueRecipe(), coinsAfter = s.coins;
    return { ok: !!ok, bought, paid, price, moveFree, back, over, still, size0, size2, cost1, cost2, paidExp, same: objs0 === objs2, validAll, moreRoom, served, counterKept: true, rescue, cost, cooked, afterRescue, coinsAfter,
      ledger: s.ledger.map(l => l.why + ':' + l.n), xpSame: s.xp === xp0 || served > 0 };
  });
  console.log(JSON.stringify(r));
  check('buying charges the price once', r.ok && r.bought === 1 && r.paid === r.price, [r.paid, r.price]);
  check('moving furniture gives no money and no XP', r.moveFree);
  check('selling gives half back', r.back === Math.floor(r.price / 2), r.back);
  check('spending more than you have fails and changes nothing', r.over === false && r.still === 10);
  check('two expansions: paid, bigger, every object where it was', r.size2[0] === r.size0[0] + 2 && r.size2[1] === r.size0[1] + 2 && r.paidExp === r.cost1 + r.cost2 && r.same && r.validAll, [r.size0, r.size2, r.paidExp]);
  check('the café keeps working after expanding', r.served > 0, r.served);
  check('broke with no food: the cheapest recipe is free, once', r.rescue === 'ensopado' && r.cost === 0 && r.cooked && r.afterRescue === null && r.coinsAfter === 0, r);
  check('every money change left a line in the ledger', r.ledger.some(l => /compra: mesa/.test(l)) && r.ledger.some(l => /expansão/.test(l)), r.ledger);

  console.log('\n[4] ten levels and what they unlock');
  await fresh();
  r = await p.evaluate(() => {
    const s = ZC.state, out = [];
    let total = 0;
    for (let l = 1; l < 10; l++) { const need = ZC.xpForLevel(l); total += need; const t0 = s.toxin; ZC.addXP(need); out.push([s.level, s.toxin - t0, ZC.maxZombies(s.level)]); }
    return { out, total, known: Object.keys(s.known).length, raids: ZC.RAIDS.filter(t => t.lvl <= 10).length, perks10: ZC.nextLevelPerks(), xp: s.xp };
  });
  console.log(JSON.stringify(r));
  check('levels 2..10 each arrive once with their toxin', r.out.map(o => o[0]).join() === '2,3,4,5,6,7,8,9,10' && r.out.every(o => o[1] === 1) && r.xp === 0, r.out);
  check('team size grows with level (2 -> 3 at 5 -> 4 at 10)', r.out[3][2] === 3 && r.out[8][2] === 4, r.out.map(o => o[2]));
  check('level-learned recipes arrived', r.known >= 6, r.known);

  console.log('\n[5] reputation drives traffic; temporary stars are separate and expire');
  const traffic = async rep => { await fresh(); return p.evaluate(([rep, SEED]) => { eval(SEED); const s = ZC.state; s.rep.score = rep; let n = 0; const seen = new Set();
    for (let i = 0; i < 120 / 0.5; i++) { s.rep.score = rep; ZC.fastForward(0.5); for (const c of ZC.rt.customers) if (!seen.has(c.aid)) { seen.add(c.aid); n++; } } return n; }, [rep, SEED]); };
  const low = await traffic(0.5), high = await traffic(4.5);
  r = await p.evaluate(() => {
    const s = ZC.state; s.rep.score = 3; const lvl = s.level;
    const r0 = ZC.rating();
    ZC.grantBonusStars(0.5, 30, 'Crítica elogiosa'); const r1 = ZC.rating();
    ZC.grantBonusStars(0.5, 30, 'Crítica elogiosa'); const r2 = ZC.rating();           // does not stack
    for (let i = 0; i < 5; i++) ZC.repEvent('nofood');
    const base = s.rep.score, lvl2 = s.level;
    ZC.setClosed(true); ZC.fastForward(31);
    return { r0, r1, r2, base: +base.toFixed(2), lvlSame: lvl === lvl2, bonusAfter: ZC.repBonus(), log: s.rep.log.map(l => [l.why, l.n, +l.d.toFixed(2)]), special: Object.entries(ZC.SPECIALS).map(([k, v]) => [k, v.minLevel, v.minRep]) };
  });
  console.log(JSON.stringify({ low, high }), JSON.stringify(r));
  check('a better reputation brings more customers', high > low * 1.5, [low, high]);
  check('temporary stars add on top, do not stack, and expire', r.r1 === r.r0 + 0.5 && r.r2 === r.r1 && r.bonusAfter === 0, [r.r0, r.r1, r.r2, r.bonusAfter]);
  check('bad service lowers reputation but never the level', r.base < 3 && r.lvlSame, r.base);
  check('the log says why it changed', r.log.length > 0 && r.log[r.log.length - 1][0] === 'clientes sem comida' && r.log[r.log.length - 1][2] < 0, r.log);
  check('special visitors need level and reputation', r.special.some(s => s[2] >= 3), r.special);

  check('no runtime errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); process.exit(done() ? 1 : 0);
})();
