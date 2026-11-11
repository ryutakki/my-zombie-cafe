// Walk through every menu with real clicks: nothing may throw, and the screens are saved for a look.
const { open, check, done } = require('./lib');
(async () => {
  const { b, p, errs } = await open();
  const out = process.argv[2];
  const shot = n => p.screenshot({ path: `${out}/ui_${n}.png` });
  const closeAll = () => p.evaluate(() => { if (ZC.modalOpen) ZC.closeModal(); ZC.closeCustomerMenu(); });
  const texts = {};
  // world position of a tile on the screen
  const at = (x, y, dy = 0) => p.evaluate(([x, y, dy]) => { const [wx, wy] = ZC.iso(x + 0.5, y + 0.5), c = ZC.cam; return [(wx - c.x) * c.z + innerWidth / 2, (wy + dy - c.y) * c.z + innerHeight / 2]; }, [x, y, dy]);
  const tapObj = async cat => { const o = await p.evaluate(cat => { const o = ZC.objsOf(cat)[0]; return [o.x, o.y]; }, cat); const [sx, sy] = await at(o[0], o[1], -20); await p.mouse.click(sx, sy); await p.waitForTimeout(250); };

  // 1. tap an empty stove -> cookbook -> cook
  await tapObj('stove');
  texts.book = await p.evaluate(() => document.querySelector('#modal h2').textContent + ' | ' + [...document.querySelectorAll('#modal .tab')].map(t => t.textContent).join(',') + ' | ' + document.querySelectorAll('#modal .recipe').length);
  await shot('1_book');
  await p.click('#modal .tab:nth-child(2)'); await p.waitForTimeout(150);
  texts.locked = await p.evaluate(() => [...document.querySelectorAll('#modal .recipe .lock')].map(e => e.textContent).slice(0, 3));
  await shot('2_locked');
  await p.click('#modal .tab:nth-child(1)'); await p.waitForTimeout(150);
  await p.click('#modal .recipe .btn.buy');
  await p.waitForTimeout(300);
  texts.afterCook = await p.evaluate(() => ({ modal: ZC.modalOpen, st: ZC.stoveStatus(ZC.objsOf('stove')[0]), coins: ZC.state.coins }));
  await p.evaluate(() => ZC.fastForward(12));
  await p.waitForTimeout(1200); await closeAll();   // daily prize window
  // 2. tap the cooking stove -> stove box
  await tapObj('stove');
  texts.stove = await p.evaluate(() => document.querySelector('#cmenu .cbox') && document.querySelector('#cmenu .cbox').textContent);
  await shot('3_stove');
  await closeAll();
  // 3. tap a worker -> box with roles; change role with a real click
  const z = await p.evaluate(() => { const a = ZC.rt.zombies.find(q => !ZC.zombieData(q.id).chef); a.path = null; a.task && ZC.abortActor(a); a.stun = 5; return [a.x, a.y, a.id]; });
  { const [sx, sy] = await at(z[0], z[1], -30); await p.mouse.click(sx, sy); await p.waitForTimeout(250); }
  texts.worker = await p.evaluate(() => document.querySelector('#cmenu:not(.hidden) .cbox') && document.querySelector('#cmenu .cbox').textContent);
  await shot('4_worker');
  await p.evaluate(() => [...document.querySelectorAll('#cmenu .btn')].find(b => b.textContent === 'Descansar').click());
  await p.waitForTimeout(700);
  texts.role = await p.evaluate(id => ZC.zombieData(id).role, z[2]);
  await p.evaluate(() => [...document.querySelectorAll('#cmenu .btn')].find(b => b.textContent === 'Atender').click());
  await closeAll();
  // 4. tap a customer
  await p.evaluate(() => { let g = 0; while (!ZC.rt.customers.some(c => c.state === 'wait') && g++ < 200) ZC.fastForward(0.5); });
  const cu = await p.evaluate(() => { const c = ZC.rt.customers.find(q => q.state === 'wait'); return [c.x, c.y]; });
  { const [sx, sy] = await at(cu[0], cu[1], -40); await p.mouse.click(sx, sy); await p.waitForTimeout(250); }
  texts.customer = await p.evaluate(() => document.querySelector('#cmenu:not(.hidden) .cbox') && document.querySelector('#cmenu .cbox').textContent);
  await shot('5_customer');
  await closeAll();
  // 5. fridge with loot, team, reputation, raids, missions, shop, menu
  await p.evaluate(() => { ZC.storeBatch({ r: 'sanduiche', servings: 8, from: 'beco' }); ZC.storeBatch({ r: 'grogue', servings: 14, from: 'taverna' }); ZC.state.stats.p_loot = 22; });
  await tapObj('fridge'); texts.fridge = await p.evaluate(() => document.querySelector('#modal h2').textContent + ' | ' + [...document.querySelectorAll('#modal .row .btn')].map(b => b.textContent).join(',')); await shot('6_fridge'); await closeAll();
  await p.click('#toolbar [data-act=zombies]'); await p.waitForTimeout(200); texts.team = await p.evaluate(() => document.querySelector('#modal h2').textContent + ' | rows ' + document.querySelectorAll('#modal .row').length); await shot('7_team'); await closeAll();
  await p.click('#rating'); await p.waitForTimeout(200); texts.rep = await p.evaluate(() => document.querySelector('#modal h2').textContent + ' | ' + document.querySelectorAll('#modal .replog').length + ' linhas'); await shot('8_rep'); await closeAll();
  await p.click('#toolbar [data-act=raid]'); await p.waitForTimeout(200); texts.raids = await p.evaluate(() => document.querySelector('#modal h2').textContent + ' | ' + document.querySelectorAll('#modal .pick').length + ' no esquadrão'); await shot('9_raids');
  await p.click('#modal .row .btn.buy'); await p.waitForTimeout(600);
  texts.raidScene = await p.evaluate(() => ZC.view.scene + ' | ' + document.getElementById('raidhint').textContent);
  await p.click('#sendall'); await p.waitForTimeout(2500); await shot('10_raid');
  await p.evaluate(() => { const R = ZC.raidDebug(); let t = 0; while (!R.result && t < 200) { ZC.fastForward(0.25); t += 0.25; } });
  await p.waitForTimeout(1500); texts.result = await p.evaluate(() => document.querySelector('#modal h2').textContent + ' | ' + document.querySelector('#modal .result').textContent.slice(0, 160)); await shot('11_result');
  await p.click('#modal .result .btn.buy'); await p.waitForTimeout(300);
  texts.back = await p.evaluate(() => ZC.view.scene);
  for (const act of ['missions', 'shop', 'menu', 'book']) { await p.click(`#toolbar [data-act=${act}]`); await p.waitForTimeout(150); texts[act] = await p.evaluate(() => document.querySelector('#modal h2').textContent); await closeAll(); }
  await p.evaluate(() => ZC.fastForward(5)); await p.waitForTimeout(300); await shot('12_cafe');
  console.log(JSON.stringify(texts, null, 1));
  check('cookbook opened from the stove and cooking started', /Livro/.test(texts.book) && !texts.afterCook.modal && texts.afterCook.st !== 'empty', texts.afterCook);
  check('stove, worker and customer boxes opened', !!texts.stove && !!texts.worker && !!texts.customer);
  check('role changed with a real click', texts.role === 'rest', texts.role);
  check('raid scene entered and left', /raid/.test(texts.raidScene) && texts.back === 'cafe', [texts.raidScene, texts.back]);
  check('no word "null" or "undefined" on any screen', !/null|undefined|NaN/.test(JSON.stringify(texts)));
  check('no runtime errors', errs.length === 0, errs.slice(0, 4));
  await b.close(); process.exit(done() ? 1 : 0);
})();
