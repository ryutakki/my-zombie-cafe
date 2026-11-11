// The infinite world around the café: biomes, ponds, dirt, and where trees / mushrooms / rocks stand.
// Everything is a pure function of the tile coordinates, so the world is the same every time.
(() => {
  const ZC = window.ZC;
  const A = ZC.TW / 2, B = ZC.TH / 2, TAU = Math.PI * 2;

  const hash = (x, y, s = 0) => {
    let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  };
  const rnd = (x, y, s) => hash(x, y, s) / 4294967296;
  const vnoise = (x, y, s) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = rnd(x0, y0, s), b = rnd(x0 + 1, y0, s), c = rnd(x0, y0 + 1, s), d = rnd(x0 + 1, y0 + 1, s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };

  const cafe = () => ZC.state.cafe;
  // tiles that must stay clear: the café, its door lane and the road
  function reserved(x, y, c) {
    if (x >= -1 && x <= c.w && y >= -1 && y <= c.h) return true;
    if (Math.abs(x - c.doorX) <= 1 && y >= c.h && y <= c.h + 8) return true;
    if (y >= c.h + 6 && y <= c.h + 9) return true;
    return false;
  }
  ZC.worldReserved = reserved;

  // biome: 0 = dark forest, 1 = meadow, 2 = swamp / graveyard
  function biomeAt(x, y) {
    const n = vnoise(x * 0.075 + 40, y * 0.075 - 12, 5);
    return n < 0.4 ? 0 : n < 0.62 ? 1 : 2;
  }

  const tcache = new Map();
  let tsig = '';
  ZC.terrainAt = function (x, y) {
    const c = cafe(), sig = c.w + ',' + c.h + ',' + c.doorX;
    if (sig !== tsig) { tcache.clear(); scache.clear(); tsig = sig; }
    const k = x + ',' + y;
    let t = tcache.get(k);
    if (t) return t;
    t = { biome: biomeAt(x, y), water: false, dirt: false, patch: 0, res: reserved(x, y, c) };
    if (!t.res) {
      const w = vnoise(x * 0.17 + 7, y * 0.17 + 3, 9);
      // ponds mostly in the swamp, a few elsewhere; never right next to the café
      const near = x > -4 && x < c.w + 4 && y > -4 && y < c.h + 12;
      t.water = !near && w > (t.biome === 2 ? 0.68 : 0.8);
      if (!t.water) {
        t.dirt = vnoise(x * 0.23 - 5, y * 0.23 + 11, 3) > 0.74;
        const p = vnoise(x * 0.22, y * 0.22, 2);
        t.patch = p > 0.64 ? 1 : p < 0.3 ? -1 : 0;
      }
    }
    tcache.set(k, t);
    return t;
  };

  // ---------- props ----------
  const TREES = {
    0: ['pine', 'pine2', 'pine3', 'pine', 'puff2', 'umbrella', 'pine2'],
    1: ['puff', 'palm', 'umbrella', 'puff2', 'palm2', 'bloom', 'palm3', 'puff'],
    2: ['palm3', 'shroomtree', 'pine3', 'umbrella', 'shroomtree', 'pine2'],
  };
  const scache = new Map();

  // returns { kind:'prop', name, s, f, ox, oy } or null
  ZC.sceneryAt = function (x, y) {
    const c = cafe();
    const k = x + ',' + y;
    if (scache.has(k) && tsig === c.w + ',' + c.h + ',' + c.doorX) return scache.get(k);
    const t = ZC.terrainAt(x, y);
    const out = computeScenery(x, y, t);
    scache.set(k, out);
    return out;
  };

  function computeScenery(x, y, t) {
    if (t.res || t.water) return null;
    const b = t.biome, r = rnd(x, y, 11), v = hash(x, y, 12);
    const ox = (rnd(x, y, 13) - 0.5) * 0.5, oy = (rnd(x, y, 14) - 0.5) * 0.5;
    // trees: local minimum of a random field => never two trees on neighbouring tiles
    const rt = rnd(x, y, 21);
    let isMin = true;
    for (let dy = -1; dy <= 1 && isMin; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && rnd(x + dx, y + dy, 21) < rt) { isMin = false; break; }
    const treeChance = b === 0 ? 0.92 : b === 1 ? 0.2 : 0.42;
    if (isMin && rnd(x, y, 23) < treeChance) {
      const list = TREES[b], name = list[v % list.length], s = 0.85 + rnd(x, y, 24) * 0.4;
      return { kind: 'prop', name, s: name.startsWith('pine') ? s * 1.1 : s, f: (v >> 8) & 1, ox, oy, tree: true };
    }
    if (r < 0.03) return { kind: 'prop', name: 'shroom' + (v % 12), s: 1.0 + rnd(x, y, 25) * 0.6, f: (v >> 9) & 1, ox, oy };
    if (r < 0.055 && b !== 1) return { kind: 'prop', name: 'shroom' + (v % 12), s: 1.0 + rnd(x, y, 25) * 0.5, f: (v >> 9) & 1, ox, oy };
    if (r < 0.075) return { kind: 'prop', name: 'rock' + (v % 7), s: 0.9 + rnd(x, y, 26) * 0.5, f: (v >> 9) & 1, ox, oy };
    if (r < 0.083 && b !== 1) return { kind: 'prop', name: 'log', s: 0.85 + rnd(x, y, 27) * 0.3, f: (v >> 9) & 1, ox, oy };
    if (r < 0.092) return { kind: 'prop', name: 'stump', s: 0.9, f: (v >> 9) & 1, ox, oy };
    if (r < 0.115) return { kind: 'prop', name: 'sprout' + (v % 2), s: 1.0 + rnd(x, y, 28) * 0.4, f: (v >> 9) & 1, ox, oy };
    return null;
  }

  ZC.drawScenery = function (ctx, sc, sx, sy) {
    sx += (sc.ox || 0) * A * 2; sy += (sc.oy || 0) * B * 2;
    const m = ZC.PROPS[sc.name]; if (!m) return;
    const s = sc.s || 1;
    ZC.shadowEll(ctx, sx, sy + 2, m.w * s * (sc.tree ? 0.24 : 0.36), m.w * s * (sc.tree ? 0.1 : 0.14));
    ZC.drawProp(ctx, sc.name, sx, sy + 2, s, !!sc.f);
  };

  // ---------- ground layer: patches, dirt, ponds ----------
  const blob = (ctx, cx, cy, kx, ky) => { ctx.beginPath(); ctx.ellipse(cx, cy, A * kx, B * ky, 0, 0, TAU); ctx.fill(); };
  ZC.drawTerrain = function (ctx, tx0, tx1, ty0, ty1, t) {
    const water = [], dirt = [];
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const tr = ZC.terrainAt(x, y);
      if (tr.res) continue;
      const [cx, cy] = ZC.iso(x + 0.5, y + 0.5);
      if (tr.water) { water.push([x, y, cx, cy]); continue; }
      if (tr.patch === 1) { ctx.fillStyle = 'rgba(150,215,80,.20)'; blob(ctx, cx, cy, 1.15, 1.15); }
      else if (tr.patch === -1) { ctx.fillStyle = 'rgba(18,48,34,.26)'; blob(ctx, cx, cy, 1.15, 1.15); }
      if (tr.dirt) dirt.push([x, y, cx, cy]);
    }
    if (dirt.length) {
      ctx.fillStyle = 'rgba(60,42,28,.5)'; for (const [, , cx, cy] of dirt) blob(ctx, cx, cy + 1, 1.2, 1.2);
      for (const [x, y, cx, cy] of dirt) { ctx.fillStyle = (x * 7 + y * 3) % 5 < 2 ? '#84623f' : '#8d6b45'; blob(ctx, cx, cy, 1.1, 1.1); }
      ctx.fillStyle = 'rgba(40,28,20,.35)';
      for (const [x, y, cx, cy] of dirt) for (let i = 0; i < 2; i++) { const px = cx + (rnd(x, y, 40 + i) - 0.5) * A * 1.2, py = cy + (rnd(x, y, 50 + i) - 0.5) * B * 1.2; ctx.beginPath(); ctx.ellipse(px, py, 2.4, 1.4, 0, 0, TAU); ctx.fill(); }
    }
    if (water.length) {
      // shore, then water, then ripples (three passes so neighbours merge into one pond)
      ctx.fillStyle = '#2b4a36'; for (const [, , cx, cy] of water) blob(ctx, cx, cy + 2, 1.28, 1.28);
      ctx.fillStyle = '#8f7e58'; for (const [, , cx, cy] of water) blob(ctx, cx, cy + 1, 1.18, 1.18);
      for (const [x, y, cx, cy] of water) { ctx.fillStyle = (x + y) & 1 ? '#2f6f78' : '#2a6670'; blob(ctx, cx, cy, 1.1, 1.1); }
      ctx.lineWidth = 1.6;
      for (const [x, y, cx, cy] of water) {
        const ph = t * 0.9 + rnd(x, y, 60) * 6, a = 0.18 + 0.14 * Math.sin(ph);
        ctx.strokeStyle = `rgba(210,245,240,${a})`;
        ctx.beginPath(); ctx.ellipse(cx + (rnd(x, y, 61) - 0.5) * 24, cy + (rnd(x, y, 62) - 0.5) * 8, 14 + 3 * Math.sin(ph), 5 + Math.sin(ph), 0, 0, TAU); ctx.stroke();
        if (rnd(x, y, 63) < 0.16) { // lily pad
          ctx.fillStyle = '#3f8a4a'; ctx.beginPath(); ctx.ellipse(cx + 8, cy - 2, 9, 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#e8a0c0'; ctx.beginPath(); ctx.ellipse(cx + 8, cy - 4, 2.6, 2, 0, 0, TAU); ctx.fill();
        }
      }
    }
  };
})();
