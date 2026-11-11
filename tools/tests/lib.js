// shared helpers for the scenario checks
const { chromium } = require('playwright');
exports.open = async function (opts = {}) {
  const b = opts.browser || await chromium.launch();
  const ctx = opts.context || await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:5173/');
  await p.waitForFunction(() => window.ZC && ZC.runtimeReady, null, { timeout: 20000 });
  await p.evaluate(() => { if (!ZC.state.chefChosen) ZC.setChef('classico'); for (let i = 0; i < 3 && ZC.modalOpen; i++) ZC.closeModal(); window.__toasts = []; const t = ZC.toast; ZC.toast = (m, k) => { window.__toasts.push(m); t(m, k); }; });
  return { b, ctx, p, errs };
};
let pass = 0, fail = 0;
exports.check = (name, ok, extra) => { if (ok) { pass++; console.log('  ok   ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); } else { fail++; console.log('  FAIL ' + name + '  ' + JSON.stringify(extra)); } };
exports.done = () => { console.log(`\n${pass} passed, ${fail} failed`); return fail; };
