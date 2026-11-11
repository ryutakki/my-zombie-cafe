// Boot, game loop, isometric camera and input.
(() => {
  const ZC = window.ZC;
  const A = ZC.TW / 2, B = ZC.TH / 2;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const cam = ZC.cam = { x: 0, y: 0, z: 1 };
  const view = ZC.view = { scene: 'cafe', mode: 'play', placing: null, selected: null, selZ: null, hover: null, lift: null, drops: {} };

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }

  // The player can only look around a limited area of the infinite grass around the café.
  function clampCam() {
    const bb = ZC.worldBBox(), vw = W / cam.z, vh = H / cam.z;
    cam.x = bb.x1 - bb.x0 <= vw ? (bb.x0 + bb.x1) / 2 : Math.max(bb.x0 + vw / 2, Math.min(bb.x1 - vw / 2, cam.x));
    cam.y = bb.y1 - bb.y0 <= vh ? (bb.y0 + bb.y1) / 2 : Math.max(bb.y0 + vh / 2, Math.min(bb.y1 - vh / 2, cam.y));
  }

  ZC.fitCamera = function () {
    const c = ZC.state.cafe;
    const x0 = -c.h * A - 40, x1 = c.w * A + 40, y0 = -ZC.WALL_H - 30, y1 = (c.w + c.h) * B * 0.5 + (c.h + 5) * B + 60;
    const short = H < 520, top = short ? 52 : 70, bottom = short ? 12 : 30, left = W < 600 ? 62 : short ? 58 : 74;   // the toolbar lives on the left edge
    cam.z = Math.max(short ? 0.42 : 0.5, Math.min(1.5, Math.min((W - left) / (x1 - x0), (H - top - bottom) / (y1 - y0))));
    cam.x = (x0 + x1) / 2 - left / 2 / cam.z;
    cam.y = (y0 + y1) / 2 - (top - bottom) / 2 / cam.z;
    clampCam();
  };

  const toWorld = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];
  const tileAt = (wx, wy) => { const [x, y] = ZC.unIso(wx, wy); return [Math.floor(x), Math.floor(y)]; };

  // ---------- actions ----------
  ZC.beginPlacing = function (type) { view.placing = { type }; view.selected = null; view.hover = null; ZC.renderEditBar(); };
  ZC.beginMove = function (o) {
    const busy = ZC.objectBusy(o);
    if (busy && o.type.indexOf('stove') !== 0) return ZC.toast(busy, 'bad');
    if (o.type.indexOf('stove') === 0 && o.cook) return ZC.toast(busy, 'bad');
    o.hidden = true; ZC.rebuildGrid();
    view.placing = { type: o.type, moving: o }; view.hover = [o.x, o.y]; view.selected = null;
    ZC.renderEditBar();
  };
  ZC.cancelPlacing = function () {
    if (view.placing && view.placing.moving) { view.placing.moving.hidden = false; ZC.rebuildGrid(); }
    view.placing = null; ZC.renderEditBar();
  };
  ZC.trySell = function (o) {
    const busy = ZC.sellBlock(o);
    if (busy) return ZC.toast(busy, 'bad');
    ZC.sellObject(o); view.selected = null; ZC.renderEditBar();
  };
  // Hold the pointer on a piece of furniture: it pops up off the floor and follows the pointer; let go to put it down.
  const HOLD_MS = 360;
  const nowS = () => performance.now() / 1000;
  function startLift(o) {
    if (!o || o.hidden || view.placing || view.paintWall || ZC.modalOpen || view.scene !== 'cafe') return false;
    const busy = ZC.objectBusy(o);
    if (busy) { ZC.toast(busy, 'bad'); return false; }
    o.hidden = true; ZC.rebuildGrid();
    view.lift = { o, type: o.type, x: o.x, y: o.y, t0: nowS() };
    view.hover = [o.x, o.y]; view.selected = null; view.selZ = null;
    ZC.closeCustomerMenu(); ZC.renderEditBar();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* not supported */ } }
    return true;
  }
  function endLift(commit) {
    const L = view.lift; if (!L) return;
    view.lift = null;
    const [x, y] = view.hover || [L.x, L.y];
    L.o.hidden = false;
    if (commit && ZC.canPlace(L.type, x, y, L.o)) {
      ZC.placeObject(L.type, x, y, L.o);
      view.drops[L.o.id] = nowS();
    } else {
      ZC.rebuildGrid();
      if (commit && (x !== L.x || y !== L.y)) ZC.toast('Não dá para colocar aí (ocupado ou bloquearia a passagem).', 'bad');
      view.drops[L.o.id] = nowS();
    }
    view.hover = null; ZC.renderEditBar();
  }
  ZC.cancelLift = () => endLift(false);
  let homeCam = null;
  ZC.beginRaid = function (target, ids) {
    ZC.cancelPlacing(); view.mode = 'play'; view.selected = null; view.selZ = null; ZC.updateBanner(); ZC.closeCustomerMenu();
    homeCam = { x: cam.x, y: cam.y, z: cam.z };
    view.scene = 'raid'; ZC.startRaid(target, ids); ZC.fitRaidCamera();
    document.getElementById('raidbar').classList.remove('hidden'); document.getElementById('toolbar').classList.add('hidden'); ZC.renderEditBar();
  };
  ZC.leaveRaid = function () {
    ZC.endRaid(); view.scene = 'cafe';
    if (homeCam) { cam.x = homeCam.x; cam.y = homeCam.y; cam.z = homeCam.z; homeCam = null; } else ZC.fitCamera();
    document.getElementById('raidbar').classList.add('hidden'); document.getElementById('toolbar').classList.remove('hidden'); ZC.renderEditBar();
  };

  function tryPlace(x, y) {
    const p = view.placing;
    if (!ZC.canPlace(p.type, x, y, p.moving)) {
      view.hover = [x, y];
      return ZC.toast('Não dá para colocar aí (ocupado ou bloquearia a passagem).', 'bad');
    }
    if (!p.moving) {
      const price = ZC.ITEMS[p.type].price;
      if (!ZC.spend(price, 'compra: ' + ZC.ITEMS[p.type].name)) { ZC.cancelPlacing(); return ZC.toast('Moedas insuficientes!', 'bad'); }
      ZC.placeObject(p.type, x, y); ZC.fx(x + 0.5, y + 0.5, `-${price}`, '#ff8a6a');
    } else ZC.placeObject(p.type, x, y, p.moving);
    view.placing = null; view.hover = null; ZC.renderEditBar();
  }

  // Front-most thing under the pointer. Tall furniture sticks up above its tile, so test screen boxes, not tiles.
  function pick(wx, wy, withActors) {
    const rt = ZC.rt;
    let best = null, bd = -1e9;
    const consider = (d, hit) => { if (d > bd) { bd = d; best = hit; } };
    if (withActors) {
      for (const a of rt.zombies) {
        const [px, py] = ZC.iso(a.x + 0.5, a.y + 0.5);
        if (Math.abs(wx - px) < 24 && wy > py - 84 && wy < py + 14) consider(a.x + a.y + 1.3, { type: 'zombie', a });
      }
    }
    if (withActors) {
      for (const a of rt.customers) {
        if (a.alpha != null && a.alpha < 0.4) continue;
        const [px, py0] = ZC.iso(a.x + 0.5, a.y + 0.5), py = py0 + (a.state === 'wait' || a.state === 'eat' ? -8 : 6);
        if (Math.abs(wx - px) < 22 && wy > py - 84 && wy < py + 12) consider(a.x + a.y + 1.25, { type: 'customer', a });
      }
    }
    for (const o of ZC.state.cafe.objects) {
      if (o.hidden) continue;
      const it = ZC.ITEMS[o.type], [px, py] = ZC.iso(o.x + 0.5, o.y + 0.5);
      if (it.flat) { if (Math.abs(wx - px) / A + Math.abs(wy - py) / B < 1) consider(o.x + o.y + 0.05, { type: 'obj', o }); continue; }
      if (Math.abs(wx - px) < A * 0.72 && wy < py + B * 0.8 && wy > py - it.hh) consider(o.x + o.y + 1, { type: 'obj', o });
    }
    return best;
  }

  // the kitchen is the job of whoever has the role "Cozinhar" (the chef, to begin with)
  const NO_COOK = () => ZC.toast(ZC.rt.zombies.some(a => (ZC.zombieData(a.id) || {}).role === 'cook')
    ? 'Seu cozinheiro está ocupado. Toque em outro funcionário e escolha Cozinhar, ou arraste-o até o fogão.'
    : 'Ninguém está na função Cozinhar. Toque num funcionário e escolha Cozinhar, ou arraste-o até o fogão.', 'bad');
  function tapStove(o) {
    const st = ZC.stoveStatus(o);
    if (st === 'empty') {
      const a = ZC.autoZombie(o, ['cook']);
      if (!a) return NO_COOK();
      return ZC.openCookbook(o, a.id);
    }
    if (st === 'ready') { const a = ZC.autoZombie(o, ['cook']) || ZC.autoZombie(o); if (a && ZC.cmdStove(a.id, o)) return; }
    if (st === 'paused') { const a = ZC.autoZombie(o, ['cook']); if (a && ZC.cmdStove(a.id, o)) return; }
    ZC.openStoveMenu(o);
  }

  function onClick(sx, sy) {
    ZC.closeCustomerMenu();
    if (ZC.modalOpen) return;
    if (view.scene === 'raid') { const [rx, ry] = toWorld(sx, sy); return ZC.raidClick(rx, ry); }
    if (view.scene !== 'cafe') return;
    const [wx, wy] = toWorld(sx, sy);
    if (view.paintWall) { const w = ZC.wallAt(wx, wy); if (w) ZC.paintWallSeg(w[0], w[1], view.paintWall); return; }
    if (view.placing) { const [x, y] = tileAt(wx, wy); return tryPlace(x, y); }
    if (view.mode === 'play') {
      const fl = (ZC.rt.pickups || []).find(p => { const [px, py] = ZC.iso(p.x + 0.5, p.y + 0.5); return Math.abs(wx - px) < 26 && wy > py - 56 && wy < py + 14; });
      if (fl) return ZC.collectPickup(fl);
    }
    const hit = pick(wx, wy, view.mode === 'play');
    if (view.mode === 'edit') { view.selected = hit && hit.type === 'obj' ? hit.o : null; ZC.renderEditBar(); return; }
    if (!hit) return;
    if (hit.type === 'zombie') {
      return ZC.openZombieMenu(hit.a);
    }
    if (hit.type === 'customer') return ZC.openCustomerMenu(hit.a);
    const o = hit.o, cat = ZC.cat(o);
    if (cat === 'stove') tapStove(o);
    else if (cat === 'counter') {
      ZC.toast(o.servings ? `Balcão: ${o.servings} porções de ${ZC.RECIPES[o.recipe].name}.` : 'Balcão vazio. Cozinhe algo!');
    } else if (cat === 'fridge') ZC.openFridge();
    else if (cat === 'sink') ZC.toast('Os zumbis lavam os pratos sujos aqui.');
    else if (cat === 'chair' && ZC.rt.badSeat[o.id]) ZC.toast('Esta cadeira não recebe clientes: ' + ZC.rt.badSeat[o.id], 'bad');
  }

  // a zombie that was carried and let go
  function dropHeld(wx, wy) {
    const d = ZC.dragEnd(); if (!d) return;
    const a = d.a, o = view.dragHover;
    view.dragHover = null; view.dragTile = null;
    if (o && ZC.objById(o.id) && !o.hidden) {
      const [fx, fy] = ZC.nearFreeTile(o.x, o.y) || [a.x, a.y];
      ZC.dropZombie(a, fx, fy);
      const st = ZC.stoveStatus(o), z = ZC.zombieData(a.id);
      if (z && z.role !== 'cook') { const why = ZC.setRole(z, 'cook'); if (why) { ZC.toast(why, 'bad'); return; } ZC.toast(`${z.name} agora cozinha.`, 'good'); }
      if (st === 'empty') { a.stun = 60; ZC.openCookbook(o, a.id); }
      else if (st === 'ready' || st === 'paused') { a.stun = 0; ZC.cmdStove(a.id, o); }
      else ZC.openStoveMenu(o);
      return;
    }
    const [x, y] = tileAt(wx, wy);
    ZC.dropZombie(a, x, y);
  }

  // ---------- input ----------
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    down = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, drag: false, zomb: null, lifting: false, timer: 0 };
    if (view.scene === 'cafe' && view.mode === 'play' && !view.placing && !view.paintWall && !ZC.modalOpen) {
      const [wx, wy] = toWorld(e.clientX, e.clientY), hit = pick(wx, wy, true);
      if (hit && hit.type === 'zombie' && hit.a.state !== 'collapsed') down.zomb = hit.a;
    }
    if (view.scene === 'cafe' && !view.placing && !view.paintWall && !ZC.modalOpen) {
      const [wx, wy] = toWorld(e.clientX, e.clientY), hit = pick(wx, wy, true), d0 = down;
      if (hit && hit.type === 'obj') d0.timer = setTimeout(() => { if (down === d0 && !d0.drag && startLift(hit.o)) { d0.lifting = true; d0.drag = true; } }, HOLD_MS);
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (view.scene === 'cafe' && view.placing && e.pointerType === 'mouse') { const [wx, wy] = toWorld(e.clientX, e.clientY); view.hover = tileAt(wx, wy); }
    if (view.scene === 'cafe' && view.paintWall && e.pointerType === 'mouse') { const [wx, wy] = toWorld(e.clientX, e.clientY); view.wallHover = ZC.wallAt(wx, wy); }
    if (down && down.lifting) { const [wx, wy] = toWorld(e.clientX, e.clientY); view.hover = tileAt(wx, wy); return; }
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (down.timer && Math.hypot(dx, dy) > 8) { clearTimeout(down.timer); down.timer = 0; }
    if (!down.drag && Math.hypot(dx, dy) > (down.zomb ? 6 : 8)) {
      down.drag = true;
      if (down.zomb) { const [wx, wy] = toWorld(down.x, down.y); ZC.dragStart(down.zomb, wx, wy); }
    }
    if (down.drag && down.zomb && ZC.dragging()) {
      const [wx, wy] = toWorld(e.clientX, e.clientY);
      ZC.dragMove(wx, wy);
      const hit = pick(wx, wy, false);
      view.dragHover = hit && hit.type === 'obj' && ZC.cat(hit.o) === 'stove' ? hit.o : null;
      const t = tileAt(wx, wy); view.dragTile = ZC.inCafe(t[0], t[1]) ? t : null;
    } else if (down.drag && view.scene === 'cafe') { cam.x = down.cx - dx / cam.z; cam.y = down.cy - dy / cam.z; clampCam(); }
  });
  canvas.addEventListener('pointerup', e => {
    if (down && down.timer) clearTimeout(down.timer);
    if (down && down.lifting) { const [wx, wy] = toWorld(e.clientX, e.clientY); view.hover = tileAt(wx, wy); endLift(true); down = null; return; }
    if (down && down.zomb && ZC.dragging()) { const [wx, wy] = toWorld(e.clientX, e.clientY); dropHeld(wx, wy); }
    else if (down && !down.drag) onClick(e.clientX, e.clientY);
    down = null;
  });
  canvas.addEventListener('pointercancel', () => {
    if (down && down.timer) clearTimeout(down.timer);
    if (view.lift) endLift(false); if (ZC.dragging()) { ZC.dragCancel(); view.dragHover = null; view.dragTile = null; } down = null; });
  canvas.addEventListener('wheel', e => {
    if (view.scene !== 'cafe') return;
    e.preventDefault();
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    cam.z = Math.max(0.5, Math.min(2.2, cam.z * Math.exp(-e.deltaY * 0.0015)));
    cam.x = wx - (e.clientX - W / 2) / cam.z; cam.y = wy - (e.clientY - H / 2) / cam.z;
    clampCam();
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (ZC.modalOpen && document.querySelector('#modal .x').style.display !== 'none') ZC.closeModal();
      else if (view.placing) ZC.cancelPlacing();
      else if (view.paintWall) { view.paintWall = null; view.wallHover = null; ZC.renderEditBar(); }
      else ZC.closeCustomerMenu();
    }
  });
  window.addEventListener('resize', () => { resize(); if (view.scene === 'raid') ZC.fitRaidCamera(); else clampCam(); });

  document.querySelector('#modal .x').addEventListener('click', () => ZC.closeModal());
  document.querySelector('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' && document.querySelector('#modal .x').style.display !== 'none') ZC.closeModal(); });
  document.getElementById('retreat').addEventListener('click', () => ZC.retreat());
  document.getElementById('sendall').addEventListener('click', () => ZC.sendAll());
  document.getElementById('toolbar').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'shop') ZC.openShop();
    if (act === 'edit') { view.mode = 'edit'; view.selected = null; view.selZ = null; ZC.updateBanner(); ZC.renderEditBar(); }
    if (act === 'book') ZC.openCookbook(null, null);
    if (act !== 'menu') ZC.closeCustomerMenu();
    if (act === 'zombies') ZC.openZombies();
    if (act === 'missions') ZC.openMissions();
    if (act === 'raid') ZC.openRaids();
    if (act === 'menu') ZC.openMenu();
  });
  document.getElementById('rating').addEventListener('click', () => { if (view.scene === 'cafe') ZC.openReputation(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) ZC.save(); });
  window.addEventListener('pagehide', () => ZC.save());

  // ---------- loop ----------
  // One simulation step. Drawing never changes money, energy or damage: it only reads the state this leaves behind.
  ZC.tick = function (dt) {
    ZC.updateCafe(dt);
    if (view.scene === 'raid') ZC.updateRaid(dt);
  };
  // run the simulation without drawing (used by the automated checks)
  ZC.fastForward = function (seconds, stepSize = 0.05) {
    for (let t = 0; t < seconds; t += stepSize) ZC.tick(stepSize);
  };
  ZC.paused = () => document.hidden || !!ZC.sessionLocked;
  let lastT = performance.now(), saveT = 0, clock = 0;
  function frame(now) {
    // a tab that was asleep comes back with a huge gap: it is cut down to one small step, never replayed
    const dt = ZC.paused() ? 0 : Math.min(ZC.CFG.maxStep, Math.max(0, (now - lastT) / 1000));
    lastT = now; clock += dt;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (dt > 0) ZC.tick(dt);
    ZC.updateDrag(dt);
    {
      ctx.fillStyle = '#2f5a28'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
      if (view.scene === 'raid') ZC.renderRaid(ctx, clock, view, cam, W, H); else ZC.renderCafe(ctx, clock, view, cam, W, H);
      ctx.restore();
      // soft vignette: the world fades out near the edges of what you may see
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
      g.addColorStop(0, 'rgba(10,8,20,0)'); g.addColorStop(1, 'rgba(10,8,20,.38)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (view.scene === 'raid') ZC.renderRaidOverlay(ctx, W, H);
    }
    ZC.updateHUD();
    saveT += dt;
    if (saveT > 10) { saveT = 0; ZC.save(); }
    requestAnimationFrame(frame);
  }

  function decorateToolbar() {
    const set = (act, node) => { const el = document.querySelector(`#toolbar [data-act=${act}] .bi`); if (el) el.replaceChildren(node); };
    const item = type => {
      const cv = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cv.height = 38 * d; cv.style.width = cv.style.height = '38px';
      const g = cv.getContext('2d'); g.scale(d, d); g.translate(19, 32); g.scale(0.34, 0.34);
      ZC.drawItem(g, type, 0, 0, null, 0.5);
      return cv;
    };
    set('shop', item('chest'));
    set('zombies', ZC.portrait('pirate_zombie', false, 40));
    set('raid', ZC.portrait('squidman', false, 40));
    const bk = ZC.foodThumb('torta', 40); set('book', bk);
    document.querySelectorAll('[data-ic]').forEach(el => { if (!el.firstChild) el.append(ZC.icon(el.dataset.ic, +el.dataset.px || 22)); });
  }

  // ---------- boot ----------
  resize();
  ZC.load();
  const fill = document.querySelector('#loading .bar i');
  const fontsReady = document.fonts ? document.fonts.load('20px "Luckiest Guy"').catch(() => {}) : Promise.resolve();
  Promise.all([ZC.loadAssets(p => { fill.style.width = Math.round(p * 100) + '%'; }), fontsReady]).then(() => {
    document.getElementById('loading').classList.add('done');
    const cutRaid = ZC.resolveInterruptedRaid();
    ZC.resetRuntime();
    if (cutRaid) setTimeout(() => ZC.toast('A invasão foi interrompida: o esquadrão voltou para casa sem recompensa.'), 800);
    ZC.fitCamera();
    ZC.renderEditBar();
    decorateToolbar();
    requestAnimationFrame(t => { lastT = t; frame(t); });
    if (!ZC.state.seenIntro) { ZC.state.seenIntro = true; ZC.openMenu(); }
    if (ZC.afterBoot) ZC.afterBoot();
  });
})();
