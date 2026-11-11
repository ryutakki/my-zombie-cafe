// Renders the supplied 3D models (trees OBJ + mushroom OBJ) into 2D sprites for the game.
// usage: node build-props.js <treesObj> <mushroomObj> <projectRoot>   (needs `sharp`)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { loadObj, render } = require('./r3d');
const { components } = require('./comps');

const [TREES, MUSH, OUT] = process.argv.slice(2);
const SS = 3;                      // supersampling
const manifest = {};

const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const bbox = (obj, faces) => {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const f of faces) for (const i of f) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], obj.V[i][k]); mx[k] = Math.max(mx[k], obj.V[i][k]); }
  return { mn, mx };
};

async function finish(name, raw, W, H, outline = [24, 16, 30]) {
  // downsample, crop to content, add outline, save
  const img = await sharp(Buffer.from(raw), { raw: { width: W, height: H, channels: 4 } })
    .resize(Math.round(W / SS), Math.round(H / SS), { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const w0 = img.info.width, h0 = img.info.height, d = img.data;
  let x0 = w0, y0 = h0, x1 = 0, y1 = 0;
  for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) if (d[(y * w0 + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 2, w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x + x0 - pad, sy = y + y0 - pad; if (sx < 0 || sy < 0 || sx >= w0 || sy >= h0) continue;
    const i = (sy * w0 + sx) * 4, o = (y * w + x) * 4; for (let k = 0; k < 4; k++) out[o + k] = d[i + k];
  }
  // outline: any transparent pixel next to an opaque one becomes dark
  const res = Buffer.from(out);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4; if (out[o + 3] > 90) continue;
    let near = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      near = Math.max(near, out[(ny * w + nx) * 4 + 3]);
    }
    if (near > 120) { res[o] = outline[0]; res[o + 1] = outline[1]; res[o + 2] = outline[2]; res[o + 3] = Math.max(out[o + 3], Math.min(255, near)); }
  }
  // ground anchor x: mean x of opaque pixels in the lowest rows
  let sx = 0, n = 0; for (let y = h - 9; y < h - 2; y++) for (let x = 0; x < w; x++) if (res[(y * w + x) * 4 + 3] > 150) { sx += x; n++; }
  const ax = n ? sx / n : w / 2;
  await sharp(res, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'assets/props', name + '.png'));
  manifest[name] = { src: 'assets/props/' + name + '.png', w, h, ax: Math.round(ax), ay: h - 4 };
  return manifest[name];
}

function draw(tris, px, az, el = 28) {
  // px = pixels per model unit (final); the box is sized so the supersampled render fits
  const sc = px * SS;
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  const ca = Math.cos(az * Math.PI / 180), sa = Math.sin(az * Math.PI / 180), ce = Math.cos(el * Math.PI / 180), se = Math.sin(el * Math.PI / 180);
  for (const t of tris) for (const p of t.p) {
    const x = p[0] * ca - p[2] * sa, z = p[0] * sa + p[2] * ca, y = p[1] * ce - z * se;
    mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
  }
  const W = Math.ceil((mxx - mnx) * sc) + 16, H = Math.ceil((mxy - mny) * sc) + 16;
  const raw = render(tris, { W, H, az, el, sc, pad: 8, toon: 4, ambient: 0.5, light: [-0.55, 0.85, 0.55] });
  return { raw, W, H };
}

// ---------- trees ----------
const TREE_CFG = {
  palm:       { g: 0,  px: 0.80, trunk: 0.56, leaf: [60, 128, 84], leaf2: [128, 190, 96], bark: [128, 96, 70] },
  palm2:      { g: 13, px: 0.95, trunk: 0.56, leaf: [48, 108, 80], leaf2: [104, 168, 92], bark: [112, 84, 64] },
  palm3:      { g: 17, px: 0.9,  trunk: 0.56, leaf: [70, 138, 70], leaf2: [150, 200, 90], bark: [120, 90, 62] },
  puff:       { g: 3,  px: 0.85, trunk: 0.40, leaf: [64, 118, 74], leaf2: [136, 188, 98], bark: [150, 122, 92] },
  puff2:      { g: 6,  px: 1.15, trunk: 0.40, leaf: [54, 104, 80], leaf2: [116, 170, 100], bark: [140, 112, 88] },
  umbrella:   { g: 4,  px: 0.72, trunk: 0.38, leaf: [74, 124, 78], leaf2: [150, 196, 100], bark: [110, 84, 66] },
  pine:       { g: 5,  px: 0.50, trunk: 0.10, leaf: [36, 92, 72], leaf2: [92, 150, 94], bark: [104, 76, 58] },
  pine2:      { g: 10, px: 0.62, trunk: 0.10, leaf: [44, 100, 70], leaf2: [104, 158, 88], bark: [104, 76, 58] },
  pine3:      { g: 11, px: 0.8,  trunk: 0.10, leaf: [40, 96, 76], leaf2: [96, 154, 96], bark: [104, 76, 58] },
  bloom:      { g: 2,  px: 1.4,  trunk: 0.46, leaf: [186, 84, 140], leaf2: [236, 140, 170], bark: [104, 150, 84] },
  shroomtree: { g: 1,  px: 0.8,  trunk: 0.5,  leaf: [150, 70, 140], leaf2: [210, 120, 170], bark: [104, 150, 90], stone: true },
};

async function trees() {
  const o = loadObj(TREES);
  const gs = o.G.filter(g => g.faces.length > 1500);
  for (const [name, c] of Object.entries(TREE_CFG)) {
    const g = gs[c.g], { mn, mx } = bbox(o, g.faces);
    const hgt = mx[1] - mn[1];
    const tris = g.faces.map((f, fi) => {
      const p = f.map(i => o.V[i]);
      const cy = (p[0][1] + p[1][1] + p[2][1]) / 3, h = (cy - mn[1]) / hgt;
      const j = 0.92 + hash(fi) * 0.16;
      let col;
      if (c.stone && h < 0.1) col = [74, 128, 80];
      else if (c.stone && h < 0.3) col = [150, 150, 150];
      else if (h < c.trunk) col = mix(c.bark, [70, 52, 44], 0.35 * (1 - h / c.trunk));
      else col = mix(c.leaf, c.leaf2, Math.min(1, (h - c.trunk) / (1 - c.trunk)));
      return { p, col: col.map(x => x * j) };
    });
    const { raw, W, H } = draw(tris, c.px, 25);
    const m = await finish(name, raw, W, H);
    console.log(name, m.w, m.h);
  }
}

// ---------- mushrooms / rocks / log ----------
const CAPS = [
  { c: [176, 52, 64], spot: [246, 232, 214] },   // red
  { c: [204, 118, 56], spot: [250, 236, 200] },  // orange
  { c: [128, 76, 156], spot: [236, 214, 240] },  // purple
  { c: [60, 150, 140], spot: [224, 246, 226] },  // teal
  { c: [214, 176, 70], spot: [250, 244, 214] },  // yellow
  { c: [212, 98, 142], spot: [252, 226, 236] },  // pink
];

async function mushrooms() {
  const m = loadObj(MUSH);
  const cs = components(m, m.G).filter(c => c.faces.length >= 30);
  const big = cs.filter(c => c.faces.length >= 500);
  big.forEach(c => { c.w = c.mx[0] - c.mn[0]; c.d = c.mx[2] - c.mn[2]; c.h = c.mx[1] - c.mn[1]; c.cx = (c.mx[0] + c.mn[0]) / 2; c.cz = (c.mx[2] + c.mn[2]) / 2; });
  const stems = big.filter(c => c.h > 1.4 * Math.max(c.w, c.d) && c.h > 3 && c.faces.length < 1100 && c.faces.length >= 600);
  const caps = big.filter(c => c.h < 0.75 * Math.max(c.w, c.d) && c.faces.length >= 560 && c.faces.length <= 1100 && c.h > 1.5);
  const pairs = [];
  for (const s of stems) {
    let best = null, bd = 1e9;
    for (const c of caps) { const d = Math.hypot(c.cx - s.cx, c.cz - s.cz), dy = Math.abs(c.mn[1] - s.mx[1]); if (d < c.w * 0.6 && dy < c.h * 2 + 3 && d + dy < bd) { bd = d + dy; best = c; } }
    if (best) pairs.push({ s, c: best });
  }
  console.log('mushroom pairs', pairs.length);
  pairs.sort((a, b) => a.c.w - b.c.w);
  const pick = [0, 2, 4, 5, 7, 8, 10, 12, 13, 15, 14, 9].filter(i => i < pairs.length);
  let n = 0;
  for (const i of pick) {
    const { s, c } = pairs[i], pal = CAPS[n % CAPS.length];
    const spots = [];
    for (let k = 0; k < 5; k++) { const a = hash(i * 7 + k) * Math.PI * 2, e = 0.25 + hash(i * 3 + k * 5) * 0.8; spots.push([Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]); }
    const tris = [];
    for (const f of s.faces) { const p = f.map(k => m.V[k]); const h = (p[0][1] - s.mn[1]) / s.h; tris.push({ p, col: mix([236, 226, 196], [186, 170, 140], 1 - h) }); }
    for (const f of c.faces) {
      const p = f.map(k => m.V[k]);
      const cx = (p[0][0] + p[1][0] + p[2][0]) / 3 - c.cx, cy = (p[0][1] + p[1][1] + p[2][1]) / 3 - c.mn[1] + c.h * 0.9, cz = (p[0][2] + p[1][2] + p[2][2]) / 3 - c.cz;
      const L = Math.hypot(cx, cy, cz) || 1, dir = [cx / L, cy / L, cz / L];
      const isSpot = spots.some(sp => dir[0] * sp[0] + dir[1] * sp[1] + dir[2] * sp[2] > 0.955);
      const under = (p[0][1] - c.mn[1]) / c.h < 0.12;
      tris.push({ p, col: isSpot ? pal.spot : under ? mix(pal.c, [240, 220, 190], 0.5) : pal.c });
    }
    const { raw, W, H } = draw(tris, 4.6, 20 + n * 37);
    await finish('shroom' + n, raw, W, H);
    n++;
  }
  console.log('mushrooms built', n);
  // rocks
  const sorted = cs.slice().sort((a, b) => b.faces.length - a.faces.length);
  const rockIdx = [2, 3, 4, 5, 6, 12, 13];
  let r = 0;
  for (const i of rockIdx) {
    const c = sorted[i]; if (!c) continue;
    const { mn, mx } = c; const hh = mx[1] - mn[1];
    const base = [[108, 112, 120], [96, 110, 104], [120, 112, 108], [100, 104, 118]][r % 4];
    const tris = c.faces.map((f, fi) => {
      const p = f.map(k => m.V[k]); const h = ((p[0][1] + p[1][1] + p[2][1]) / 3 - mn[1]) / hh;
      const col = h > 0.72 ? mix(base, [86, 140, 80], Math.min(1, (h - 0.72) * 3.4)) : base; const j = 0.92 + hash(fi + r) * 0.16;
      return { p, col: col.map(x => x * j) };
    });
    const { raw, W, H } = draw(tris, 4.2, 15 + r * 50);
    await finish('rock' + r, raw, W, H); r++;
  }
  // log + stump
  for (const [nm, idx, px, base] of [['log', 0, 1.7, [112, 80, 58]], ['stump', 1, 3.4, [120, 88, 62]]]) {
    const c = sorted[idx]; const { mn, mx } = c; const hh = mx[1] - mn[1];
    const tris = c.faces.map((f, fi) => {
      const p = f.map(k => m.V[k]); const h = ((p[0][1] + p[1][1] + p[2][1]) / 3 - mn[1]) / hh;
      const col = h > 0.8 ? mix(base, [92, 150, 84], 0.75) : mix(base, [74, 54, 44], 0.3 * (1 - h)); const j = 0.92 + hash(fi) * 0.16;
      return { p, col: col.map(x => x * j) };
    });
    const { raw, W, H } = draw(tris, px, nm === 'log' ? 35 : 0);
    await finish(nm, raw, W, H);
  }
  // curly sprouts (fiddleheads)
  const sprouts = sorted.filter(c => c.faces.length >= 500 && c.faces.length < 700 && (c.mx[1] - c.mn[1]) > 15 && (c.mx[0] - c.mn[0]) < 6 && (c.mx[2] - c.mn[2]) < 6);
  console.log('sprout candidates', sprouts.length);
  for (let k = 0; k < Math.min(2, sprouts.length); k++) {
    const c = sprouts[k]; const hh = c.mx[1] - c.mn[1];
    const tris = c.faces.map(f => { const p = f.map(i => m.V[i]); const h = (p[0][1] - c.mn[1]) / hh; return { p, col: mix([70, 140, 80], [170, 214, 110], h) }; });
    const { raw, W, H } = draw(tris, 3.6, 30 + k * 60);
    await finish('sprout' + k, raw, W, H);
  }
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'assets/props'), { recursive: true });
  await trees();
  await mushrooms();
  fs.writeFileSync(path.join(OUT, 'js/props-manifest.js'), '// generated by tools/build-props.js\nwindow.ZC = window.ZC || {};\nZC.PROPS = ' + JSON.stringify(manifest, null, 1) + ';\n');
  console.log('done', Object.keys(manifest).length);
})();
