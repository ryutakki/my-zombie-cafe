// Isometric café rendering: infinite grass, floors, walls, depth-sorted furniture and actors.
(() => {
  const ZC = window.ZC;
  const { P, A, B, TAU, INK, poly, ell, stroke2, box, bc, lines, speck, rng, mix, lite, dark } = ZC.prim;
  const WH = ZC.WALL_H, S = 2;
  const IMG = {};

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w * S; c.height = h * S; return c; }
  const dpath = (g, k = 1) => { g.beginPath(); g.moveTo(0, -B * k); g.lineTo(A * k, 0); g.lineTo(0, B * k); g.lineTo(-A * k, 0); g.closePath(); };
  ZC.diamond = (ctx, x, y, k = 1) => { const [cx, cy] = ZC.iso(x + 0.5, y + 0.5); ctx.beginPath(); ctx.moveTo(cx, cy - B * k); ctx.lineTo(cx + A * k, cy); ctx.lineTo(cx, cy + B * k); ctx.lineTo(cx - A * k, cy); ctx.closePath(); };

  // ---------- grass (seamless pattern in the iso lattice) ----------
  let grass = null;
  function grassPattern(ctx) {
    if (grass) return grass;
    const c = document.createElement('canvas'); c.width = 480; c.height = 240;
    const g = c.getContext('2d'); g.fillStyle = '#4c8a3b'; g.fillRect(0, 0, 480, 240);
    const r = rng(11);
    const wrap = (x, y, fn) => { for (const ox of [-480, 0, 480]) for (const oy of [-240, 0, 240]) fn(x + ox, y + oy); };
    for (let i = 0; i < 70; i++) {
      const x = r() * 480, y = r() * 240, rx = 18 + r() * 42, col = r() < 0.5 ? '#58963f' : '#437f33';
      wrap(x, y, (px, py) => { g.fillStyle = col; g.beginPath(); g.ellipse(px, py, rx, rx * 0.5, 0, 0, TAU); g.fill(); });
    }
    g.lineCap = 'round';
    for (let i = 0; i < 360; i++) {
      const x = r() * 480, y = r() * 240, col = r() < 0.5 ? '#6bb04e' : '#37692a';
      wrap(x, y, (px, py) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 2, py - 5); g.moveTo(px + 3, py); g.lineTo(px + 4, py - 4); g.stroke(); });
    }
    // clover / tiny flowers / pebbles for texture
    for (let i = 0; i < 46; i++) {
      const x = r() * 480, y = r() * 240, k = r(), col = k < 0.3 ? '#f4efe0' : k < 0.5 ? '#ffd84a' : k < 0.7 ? '#e88ab0' : k < 0.85 ? '#b890e8' : '#7a8090';
      wrap(x, y, (px, py) => { g.fillStyle = col; g.beginPath(); g.arc(px, py, k > 0.85 ? 2.4 : 1.6, 0, TAU); g.fill(); if (k <= 0.85) { g.fillStyle = '#2f5e24'; g.fillRect(px - 0.5, py + 1, 1, 3); } });
    }
    for (let i = 0; i < 70; i++) {
      const x = r() * 480, y = r() * 240;
      wrap(x, y, (px, py) => { g.fillStyle = '#2d5c26'; g.beginPath(); g.ellipse(px, py, 7, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#6cb350'; g.beginPath(); g.ellipse(px - 1, py - 2, 4, 1.6, 0, 0, TAU); g.fill(); });
    }
    grass = ctx.createPattern(c, 'repeat');
    return grass;
  }

  // ---------- floor tiles ----------
  ZC.floorImg = function (id, vr) {
    const key = 'f|' + id + vr;
    if (IMG[key]) return IMG[key];
    const w = ZC.TW + 4, h = ZC.TH + 4, c = mk(w, h), g = c.getContext('2d');
    g.scale(S, S); g.translate(w / 2, h / 2);
    g.save(); dpath(g); g.clip();
    const R = rng(vr * 7 + id.length);
    const diamondQuad = (u0, v0, u1, v1, col) => { g.beginPath(); for (const [i, [u, v]] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].entries()) { const q = P(u, v); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.closePath(); g.fillStyle = col; g.fill(); };
    const grid = (n, col, lw = 1.6) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 1; i < n; i++) { const t = -0.5 + i / n, a = P(-0.5, t), b = P(0.5, t), c2 = P(t, -0.5), d = P(t, 0.5); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); } g.stroke(); };
    switch (id) {
      case 'tabuas': {
        diamondQuad(-0.5, -0.5, 0.5, 0.5, vr ? '#8f5e3a' : '#9a6a42');
        for (let i = 0; i < 4; i++) diamondQuad(-0.5, -0.5 + i * 0.25, 0.5, -0.25 + i * 0.25, mix(vr ? '#8f5e3a' : '#9a6a42', R() < 0.5 ? '#ffffff' : '#000000', 0.08));
        g.strokeStyle = 'rgba(40,22,12,.55)'; g.lineWidth = 1.6; g.beginPath();
        for (let i = 1; i < 4; i++) { const v = -0.5 + i * 0.25, a = P(-0.5, v), b = P(0.5, v); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        for (let i = 0; i < 4; i++) { const v = -0.5 + (i + 0.5) * 0.25, u = -0.3 + R() * 0.6, a = P(u, v - 0.125), b = P(u, v + 0.125); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        g.stroke(); break;
      }
      case 'xadrez': {
        const c1 = '#d8cdb0', c2 = '#2f2638';
        diamondQuad(-0.5, -0.5, 0, 0, vr ? c1 : c2); diamondQuad(0, -0.5, 0.5, 0, vr ? c2 : c1);
        diamondQuad(-0.5, 0, 0, 0.5, vr ? c2 : c1); diamondQuad(0, 0, 0.5, 0.5, vr ? c1 : c2);
        grid(2, 'rgba(23,18,28,.5)'); break;
      }
      case 'pedra': {
        diamondQuad(-0.5, -0.5, 0.5, 0.5, vr ? '#767b88' : '#80858f');
        grid(2, 'rgba(23,18,28,.55)', 2);
        diamondQuad(-0.5, -0.5, 0, 0, mix(vr ? '#767b88' : '#80858f', '#ffffff', 0.08)); diamondQuad(0, 0, 0.5, 0.5, mix(vr ? '#767b88' : '#80858f', '#000000', 0.1));
        for (let i = 0; i < 26; i++) { const q = P(R() - 0.5, R() - 0.5); g.fillStyle = 'rgba(30,32,44,.28)'; g.beginPath(); g.ellipse(q[0], q[1], 1 + R() * 2, 0.8 + R(), R() * 3, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(30,32,44,.5)'; g.lineWidth = 1.3; g.beginPath(); const a = P(-0.3 + R() * 0.2, -0.2), b = P(0.0, 0.1 + R() * 0.2), d = P(0.25, 0.3); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d[0], d[1]); g.stroke(); break;
      }
      case 'musgo': {
        diamondQuad(-0.5, -0.5, 0.5, 0.5, vr ? '#4e5a52' : '#566258');
        grid(2, 'rgba(15,25,15,.6)', 2);
        for (let i = 0; i < 5; i++) { const q = P(R() - 0.5, R() - 0.5); g.fillStyle = i % 2 ? '#5fae3c' : '#3f8a2c'; g.beginPath(); g.ellipse(q[0], q[1], 7 + R() * 9, 3 + R() * 4, 0, 0, TAU); g.fill(); }
        const q = P(R() * 0.5 - 0.25, R() * 0.5 - 0.25); const gr = g.createRadialGradient(q[0], q[1], 1, q[0], q[1], 14); gr.addColorStop(0, 'rgba(180,255,110,.9)'); gr.addColorStop(1, 'rgba(120,230,70,0)'); g.fillStyle = gr; g.beginPath(); g.arc(q[0], q[1], 14, 0, TAU); g.fill(); break;
      }
      case 'carpete': {
        diamondQuad(-0.5, -0.5, 0.5, 0.5, vr ? '#8e1f36' : '#9a2640');
        g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.beginPath(); for (const [i, [u, v]] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]].entries()) { const q = P(u, v); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.closePath(); g.stroke();
        diamondQuad(-0.28, -0.28, 0.28, 0.28, vr ? '#6a1428' : '#741a30');
        const q = P(0, 0); g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(q[0], q[1] - 6); g.lineTo(q[0] + 9, q[1]); g.lineTo(q[0], q[1] + 6); g.lineTo(q[0] - 9, q[1]); g.closePath(); g.fill();
        break;
      }
    }
    g.restore();
    g.strokeStyle = 'rgba(23,18,28,.5)'; g.lineWidth = 1.4; dpath(g); g.stroke();
    return (IMG[key] = c);
  };

  ZC.roadImg = function (kind, vr) {
    const key = 'r|' + kind + vr;
    if (IMG[key]) return IMG[key];
    const w = ZC.TW + 4, h = ZC.TH + 4, c = mk(w, h), g = c.getContext('2d');
    g.scale(S, S); g.translate(w / 2, h / 2); g.save(); dpath(g, 1.01); g.clip();
    const R = rng(vr * 5 + kind.length);
    if (kind === 'road') {
      g.fillStyle = vr ? '#5a5160' : '#615867'; g.fillRect(-A, -B, ZC.TW, ZC.TH);
      for (let i = 0; i < 14; i++) { const q = P(R() - 0.5, R() - 0.5); g.fillStyle = R() < 0.5 ? '#6e6574' : '#4c4452'; g.beginPath(); g.ellipse(q[0], q[1], 8 + R() * 5, 4 + R() * 2.5, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(23,18,28,.5)'; g.lineWidth = 1.4; g.stroke(); }
    } else {
      g.fillStyle = '#b8ad98'; g.fillRect(-A, -B, ZC.TW, ZC.TH);
      g.strokeStyle = 'rgba(60,50,40,.55)'; g.lineWidth = 1.6; g.beginPath(); const a = P(-0.5, 0), b = P(0.5, 0), d = P(0, -0.5), e = P(0, 0.5); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.stroke();
      for (let i = 0; i < 10; i++) { const q = P(R() - 0.5, R() - 0.5); g.fillStyle = 'rgba(70,60,50,.25)'; g.beginPath(); g.ellipse(q[0], q[1], 1 + R() * 2, 1 + R(), 0, 0, TAU); g.fill(); }
    }
    g.restore(); g.strokeStyle = 'rgba(23,18,28,.5)'; g.lineWidth = 1.4; dpath(g); g.stroke();
    return (IMG[key] = c);
  };

  // ---------- walls ----------
  function wallTexture(g, id) { // flat rectangle x 0..A, y -WH..0 (bottom at 0)
    const R = rng(id.length * 13), w = A;
    const fillR = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
    switch (id) {
      case 'tijolo':
        fillR(0, -WH, w, WH, '#8a4a3a');
        for (let row = 0; row < 10; row++) {
          const y = -WH + 10 + row * 12;
          for (let k = -1; k < 3; k++) { const x = k * 24 + (row % 2) * 12; fillR(x + 1, y + 1, 22, 10, mix('#8a4a3a', R() < 0.5 ? '#ffffff' : '#000000', 0.06 + R() * 0.1)); }
        }
        g.strokeStyle = '#4a2a24'; g.lineWidth = 2;
        for (let row = 0; row <= 10; row++) { g.beginPath(); g.moveTo(0, -WH + 10 + row * 12); g.lineTo(w, -WH + 10 + row * 12); g.stroke(); }
        for (let row = 0; row < 10; row++) { const y = -WH + 10 + row * 12; g.beginPath(); for (let k = -1; k < 3; k++) { const x = k * 24 + (row % 2) * 12; g.moveTo(x, y); g.lineTo(x, y + 12); } g.stroke(); }
        break;
      case 'tabuas':
        fillR(0, -WH, w, WH, '#5a3a2a');
        for (let k = 0; k < 4; k++) { fillR(k * 12, -WH, 12, WH, mix('#5a3a2a', R() < 0.5 ? '#ffffff' : '#000000', 0.05 + R() * 0.08)); g.strokeStyle = '#2a1a12'; g.lineWidth = 2; g.beginPath(); g.moveTo(k * 12, -WH); g.lineTo(k * 12, 0); g.stroke(); }
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(30,18,10,.5)'; g.beginPath(); g.ellipse(R() * w, -WH + 12 + R() * (WH - 30), 2.6, 4, 0, 0, TAU); g.fill(); }
        fillR(0, -WH + 62, w, 6, '#3a2418'); break;
      case 'pedra': {
        fillR(0, -WH, w, WH, '#7b8090');
        let y = -WH + 8;
        for (let row = 0; row < 6; row++) {
          const hh = 20, w1 = 18 + (row * 7 % 13), off = (row * 17) % 48;
          for (const [bx, bw] of [[off, w1], [off + w1, 48 - w1]]) for (const ox of [-48, 0, 48]) {
            const x = bx + ox; if (x >= w || x + bw <= 0) continue;
            fillR(x + 1, y + 1, bw - 2, hh - 2, mix('#7b8090', R() < 0.5 ? '#ffffff' : '#000000', 0.06 + R() * 0.1));
            g.strokeStyle = '#3a3f4e'; g.lineWidth = 2; g.strokeRect(x, y, bw, hh);
          }
          y += hh;
        }
        for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(95,174,60,.55)'; g.beginPath(); g.ellipse(R() * w, -6 - R() * 26, 6 + R() * 6, 3 + R() * 3, 0, 0, TAU); g.fill(); }
        break;
      }
      case 'listras':
        fillR(0, -WH, w, WH, '#2f4a40');
        for (let k = 0; k < 4; k++) fillR(k * 12, -WH, 6, WH - 38, '#3a5e50');
        for (let k = 0; k < 2; k++) { g.fillStyle = '#c9b070'; g.beginPath(); g.arc(12 + k * 24, -WH + 40 + (k % 2) * 6, 2.5, 0, TAU); g.fill(); }
        fillR(0, -38, w, 38, '#5a3823'); g.strokeStyle = 'rgba(23,18,28,.5)'; g.lineWidth = 2;
        for (let k = 0; k < 3; k++) g.strokeRect(2 + k * 16, -34, 12, 28);
        fillR(0, -42, w, 6, '#7a4d30'); break;
      case 'cripta':
        fillR(0, -WH, w, WH, '#3e2358');
        for (let k = 0; k < 2; k++) {
          const x = 4 + k * 24;
          g.fillStyle = '#2a1640'; g.beginPath(); g.moveTo(x, -20); g.lineTo(x, -WH + 56); g.quadraticCurveTo(x + 8, -WH + 30, x + 16, -WH + 56); g.lineTo(x + 16, -20); g.closePath(); g.fill();
          g.strokeStyle = '#7a4aa8'; g.lineWidth = 2.5; g.stroke();
        }
        fillR(0, -16, w, 16, '#2a1640'); fillR(0, -WH + 10, w, 6, '#e2d4b2'); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(0, -WH + 10, w, 6);
        for (let k = 0; k < 4; k++) { g.fillStyle = '#a8987a'; g.fillRect(k * 12 + 3, -WH + 12, 6, 2); }
        break;
    }
    // base board + top cap shared by all
    g.fillStyle = id === 'cripta' ? '#2a1640' : '#3a2418'; g.fillRect(0, -14, w, 14);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, -14, w, 3);
    g.fillStyle = id === 'pedra' ? '#9aa0ae' : id === 'cripta' ? '#6a4a8a' : '#7a5a3a'; g.fillRect(0, -WH, w, 9);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, -WH, w, 3);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, -WH + 9, w, 3);
    // vertical shading gradient
    const gr = g.createLinearGradient(0, -WH, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,.22)');
    g.fillStyle = gr; g.fillRect(0, -WH, w, WH);
  }
  function wallWindow(g) { // drawn in flat coords
    const x = 8, y = -112, w = 32, h = 54;
    g.fillStyle = '#6b3d22'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x - 5, y - 5, w + 10, h + 10);
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#223058'); gr.addColorStop(1, '#3a4a7a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(210,225,255,.22)'; g.beginPath(); g.moveTo(x + 4, y + h); g.lineTo(x + 14, y); g.lineTo(x + 22, y); g.lineTo(x + 12, y + h); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.45); g.lineTo(x + w, y + h * 0.45); g.stroke();
    g.strokeRect(x, y, w, h);
    g.fillStyle = '#8a5a30'; g.fillRect(x - 8, y + h + 4, w + 16, 6); g.strokeRect(x - 8, y + h + 4, w + 16, 6);
    g.fillStyle = '#7a3aa8'; g.beginPath(); g.moveTo(x - 5, y - 3); g.lineTo(x + 8, y - 3); g.quadraticCurveTo(x + 4, y + 22, x + 8, y + h * 0.7); g.lineTo(x - 5, y + h * 0.7); g.closePath(); g.fill(); g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(x + w + 5, y - 3); g.lineTo(x + w - 8, y - 3); g.quadraticCurveTo(x + w - 4, y + 22, x + w - 8, y + h * 0.7); g.lineTo(x + w + 5, y + h * 0.7); g.closePath(); g.fill(); g.stroke();
  }
  const WW = A + 8, WHH = WH + B + 16;
  ZC.wallImg = function (id, side, win, e0, e1) {
    const key = 'w|' + id + side + win + (e0 ? 1 : 0) + (e1 ? 1 : 0);
    if (IMG[key]) return IMG[key];
    const c = mk(WW, WHH), g = c.getContext('2d');
    if (side === 'R') g.setTransform(S, S * 0.5, 0, S, 4 * S, (WH + 8) * S);
    else g.setTransform(-S, S * 0.5, 0, S, (A + 4) * S, (WH + 8) * S);
    wallTexture(g, id);
    if (win) wallWindow(g);
    if (side === 'L') { g.fillStyle = 'rgba(10,5,25,.22)'; g.fillRect(0, -WH, A, WH); }
    g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath();
    g.moveTo(0, -WH); g.lineTo(A, -WH); g.moveTo(0, 0); g.lineTo(A, 0);   // top and bottom always
    if (e0) { g.moveTo(0, -WH); g.lineTo(0, 0); }                          // joints only between different paints / at the ends
    if (e1) { g.moveTo(A, -WH); g.lineTo(A, 0); }
    g.stroke();
    return (IMG[key] = c);
  };
  ZC.wallThumb = function (id) {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; const g = cv.getContext('2d');
    g.translate(18, 90); g.scale(1.5, 0.65); wallTexture(g, id); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(0, -WH, A, WH);
    return cv;
  };
  ZC.floorThumb = function (id) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const g = cv.getContext('2d');
    for (const [dx, dy, v] of [[-24, 0, 0], [24, 0, 1], [0, -12, 1], [0, 12, 0]]) g.drawImage(ZC.floorImg(id, v), 48 + dx - A * 0.8, 48 + dy - B * 0.8, ZC.TW * 0.8 + 3, ZC.TH * 0.8 + 3);
    return cv;
  };

  // ---------- door + curbs ----------
  function curbImg(kind) {
    return ZC.cachedImage('curb|' + kind, g => {
      const c = bc('#8f94a2');
      if (kind === 'Y') { const f = box(g, -0.5, 0.36, 0.5, 0.52, 0, 12, c); speck(g, f.L, 3, 5, 'rgba(40,40,60,.35)', 2); }
      else { const f = box(g, 0.36, -0.5, 0.52, 0.5, 0, 12, c); speck(g, f.R, 3, 5, 'rgba(40,40,60,.35)', 2); }
    });
  }
  function doorImg() {
    return ZC.cachedImage('door', g => {
      const wood = bc('#6b3d22');
      box(g, -0.5, 0.34, -0.36, 0.52, 0, 100, wood); box(g, 0.36, 0.34, 0.5, 0.52, 0, 100, wood);
      const lt = box(g, -0.5, 0.34, 0.5, 0.52, 92, 112, bc('#8a5a30'));
      lines(g, lt.L, [0.5], '#4a2a16', false, 2);
      const c = lerp2(lt.L);
      ZC.prim.skull(g, c[0], c[1] - 1, 0.55);
      for (const [u, z] of [[-0.43, 30], [-0.43, 70], [0.43, 30], [0.43, 70]]) { const q = P(u, 0.52, z); ZC.prim.ell(g, q[0], q[1], 2.4, 2.4, '#c9a02a', 1.5); }
    });
    function lerp2(f) { return [(f[0][0] + f[2][0]) / 2, (f[0][1] + f[2][1]) / 2]; }
  }

  // the door leaf swings inwards around its left hinge; open = 0 (closed) .. 1 (wide open)
  function drawDoorLeaf(ctx, cx, cy, open) {
    const th = open * Math.PI * 0.5 * 0.94, hu = -0.36, hv = 0.43, L = 0.72, Z = 92;
    const eu = hu + L * Math.cos(th), ev = hv - L * Math.sin(th);
    const q = [P(hu, hv, 0), P(eu, ev, 0), P(eu, ev, Z), P(hu, hv, Z)];
    const lerpQ = (f, z) => { const b = [q[0][0] + (q[1][0] - q[0][0]) * f, q[0][1] + (q[1][1] - q[0][1]) * f]; return [b[0], b[1] - Z * z]; };
    ctx.save(); ctx.translate(cx, cy);
    const col = mix('#8a5a30', '#000000', 0.12 + open * 0.28);
    poly(ctx, q, col, 3);
    ctx.strokeStyle = 'rgba(40,22,10,.6)'; ctx.lineWidth = 1.8; ctx.beginPath();
    for (const f of [0.25, 0.5, 0.75]) { const a = lerpQ(f, 0), b = lerpQ(f, 1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4; ctx.beginPath();
    for (const z of [0.2, 0.78]) { const a = lerpQ(0, z), b = lerpQ(1, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    if (open < 0.5) { const m = lerpQ(0.5, 0.52); ZC.prim.skull(ctx, m[0], m[1], 0.5 * Math.cos(th)); }
    const k = lerpQ(0.88, 0.45); ell(ctx, k[0], k[1], 3, 3, '#e0b840', 1.5);
    ctx.restore();
  }

  // ---------- helpers ----------
  const cafe = () => ZC.state.cafe;

  // highlight of one wall segment while painting walls
  function hiWall(ctx, side, i) {
    const p = side === 'R' ? [ZC.iso(i, 0), ZC.iso(i + 1, 0)] : [ZC.iso(0, i), ZC.iso(0, i + 1)];
    ctx.fillStyle = 'rgba(255,230,90,.38)'; ctx.strokeStyle = '#ffe24a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[1][0], p[1][1] - WH); ctx.lineTo(p[0][0], p[0][1] - WH); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // which wall segment is under a world point? -> ['R', x] | ['L', y] | null
  ZC.wallAt = function (wx, wy) {
    const c = cafe();
    let x = wx / A, h = x * B - wy;
    if (x >= 0 && x < c.w && h >= 0 && h <= WH) return ['R', Math.floor(x)];
    const y = -wx / A; h = y * B - wy;
    if (y >= 0 && y < c.h && h >= 0 && h <= WH) return ['L', Math.floor(y)];
    return null;
  };

  function dishTarget(table, chair) { // screen pos on the table top between table centre and chair
    const [px, py] = ZC.iso(table.x + 0.5 + (chair.x - table.x) * 0.2, table.y + 0.5 + (chair.y - table.y) * 0.2);
    return [px, py - 38];
  }

  function drawBubble(ctx, cu, px, py) {
    const by = py - 100, p = Math.max(0, cu.patience / cu.maxPatience);
    ZC.ink(ctx, 3);
    ell(ctx, px, by, 18, 16, '#fff9ec');
    ctx.beginPath(); ctx.moveTo(px - 4, by + 14); ctx.lineTo(px, by + 24); ctx.lineTo(px + 5, by + 13); ctx.fillStyle = '#fff9ec'; ctx.fill(); ctx.stroke();
    ell(ctx, px, by, 18, 16, null);
    ctx.strokeStyle = p > 0.6 ? '#5fc23f' : p > 0.3 ? '#f2b630' : '#e2483a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(px, by, 12, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = 'bold 15px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (cu.waiter) ZC.drawIcon(ctx, 'dots', px, by + 1, 16); else ctx.fillText('?', px, by + 1);
  }

  function stoveBar(ctx, o, cx, top, color, ink, label) {
    const c = o.cook, p = c.progress / Math.max(1, c.total), left = Math.max(0, Math.ceil(c.total - c.progress));
    ZC.ink(ctx, 2.5); ZC.rrect(ctx, cx - 28, top, 56, 11, 5, '#2a2630');
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(cx - 26, top + 2, 52 * Math.min(1, p), 7, 3); ctx.fill();
    const txt = label || (left >= 3600 ? `${Math.floor(left / 3600)}h${String(Math.floor(left % 3600 / 60)).padStart(2, '0')}` : left >= 60 ? `${Math.floor(left / 60)}m${String(left % 60).padStart(2, '0')}s` : `${left}s`);
    ctx.font = 'bold 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = ink;
    ctx.strokeText(txt, cx, top - 8); ctx.fillText(txt, cx, top - 8);
  }

  function drawCarry(ctx, a, px, py, t) {
    const c = a.carry; if (!c) return;
    if (ZC.isChar(a.sprite) && (c.kind === 'dish' || c.kind === 'batch')) return;   // already in the character's hands
    const bob = Math.sin(t * 8) * 1.5 - (ZC.isChar(a.sprite) ? 14 : 0);
    if (c.kind === 'dish' || c.kind === 'batch') ZC.drawFood(ctx, c.r, px, py - 82 + bob, c.kind === 'batch' ? 15 : 12);
    else if (c.kind === 'dirty') ZC.drawDirtyPlate(ctx, px, py - 80 + bob, 12);
    else if (c.kind === 'bag') { ZC.ink(ctx, 3); ZC.rrect(ctx, px - 13, py - 100 + bob, 26, 20, 6, '#b8935a'); ctx.fillStyle = '#e04a5a'; ctx.beginPath(); ctx.arc(px - 4, py - 92 + bob, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#5fb840'; ctx.beginPath(); ctx.arc(px + 5, py - 90 + bob, 3, 0, TAU); ctx.fill(); }
  }

  // a customer being turned: shakes, goes green, spits toxic bubbles
  function drawInfecting(ctx, a, t, px, py, s) {
    const p = 1 - a.infT / 1.7, sh = Math.sin(t * 60) * (1 + p * 2.5);
    ctx.strokeStyle = `rgba(150,255,100,${0.5 * (1 - p) + 0.2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py + 1, 20 + p * 30, 9 + p * 12, 0, 0, TAU); ctx.stroke();
    const anim = 'idle_' + a.dir;
    ZC.drawSprite(ctx, a.sprite, anim, t + a.phase, px + sh, py, s, {});
    ZC.drawSprite(ctx, (ZC.PROFILES[a.type] || ZC.PROFILES.pirate_zombie).sprite, anim, t + a.phase, px + sh, py, s, { alpha: Math.min(1, p * 1.4) });   // the zombie it is turning into
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.9 + i * 0.37) % 1, bx = px + Math.sin(i * 2.4 + t * 3) * 18, by = py - 10 - ph * 70;
      ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = '#b6ff7a'; ZC.ink(ctx, 1.5); ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3), 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawActor(ctx, a, t, view) {
    let [px, py] = ZC.iso(a.x + 0.5, a.y + 0.5);
    py += 6;
    const s = ZC.ACTOR_SCALE;
    if (a.kind === 'customer' && (a.state === 'wait' || a.state === 'eat')) py -= 14;
    ZC.shadowEll(ctx, px, py + 1, 19, 8);
    if (a.hop > 0) py -= Math.sin((1 - a.hop / 0.35) * Math.PI) * 16;   // little bounce after being dropped
    if (a.kind === 'customer' && a.state === 'infect') return drawInfecting(ctx, a, t, px, py, s);
    const z = a.kind === 'zombie' ? ZC.zombieData(a.id) : null;
    if (a.kind === 'zombie' && (a.state === 'collapsed' || a.resting)) {   // on the floor: knocked out by exhaustion, or resting
      ZC.drawSprite(ctx, a.sprite, 'die', 0, px, py, s, { tint: a.tint, frame: -1 });
      ctx.fillStyle = a.resting ? '#bfe6ff' : '#ffb0a0'; ctx.font = 'bold 16px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      const zy = py - 44 - (t * 10 % 14); ctx.strokeText('z', px + 14 + Math.sin(t * 2) * 3, zy); ctx.fillText('z', px + 14 + Math.sin(t * 2) * 3, zy);
      if (z) drawEnergy(ctx, z, px, py - 34, a.resting ? '#6fd6ff' : '#e2483a');
      return;
    }
    let anim, at = t + a.phase;
    const ch = ZC.isChar(a.sprite), up = ch ? 12 : 0, plate = a.carry && (a.carry.kind === 'dish' || a.carry.kind === 'batch');
    if (ch) {          // the animated characters: working pose, walking with the plate (it is part of the picture), shuffle, idle
      if (a.working && a.mood !== 'distracted') anim = 'work_' + a.dir;
      else if (plate) { anim = 'carry_' + a.dir; if (!a.moving) at = 0; }
      else anim = (a.moving ? 'walk_' : 'idle_') + a.dir;
    } else if (a.working && a.mood !== 'distracted') { anim = 'attack_' + (a.dir === 'left' ? 'left' : 'right'); at = (t * 1.1 + a.phase) % ZC.animLength(a.sprite, anim); }
    else anim = (a.moving ? 'walk_' : 'idle_') + a.dir;
    ZC.drawSprite(ctx, a.sprite, anim, at, px, py, s, { tint: a.tint || a.variant, alpha: a.alpha != null && a.alpha < 1 ? Math.max(0, a.alpha) : null });
    if (a.kind === 'zombie') drawCarry(ctx, a, px, py, t);
    if (a.kind === 'zombie' && a.acc) ZC.drawAccessory(ctx, a.acc, px, py - 80, a.dir, t);
    if (z && !z.chef) {   // what the worker is going through, readable without opening a menu
      const pc = ZC.zPct(z), E = ZC.CFG.energy;
      if (a.mood === 'attack' || a.hungerT != null) {            // starving: red pulse and the seconds left to react
        const k = 0.5 + 0.5 * Math.sin(t * 12);
        ctx.strokeStyle = `rgba(255,70,50,${0.5 + 0.5 * k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(px, py + 1, 26, 11, 0, 0, TAU); ctx.stroke();
        ZC.ink(ctx, 3); ell(ctx, px, py - 104 - up, 15, 14, '#ff5a45');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a.hungerT != null ? String(Math.ceil(a.hungerT)) : '!', px, py - 103 - up);
      } else if (a.mood === 'distracted') {
        ZC.ink(ctx, 2.5); ell(ctx, px + 12, py - 98 - up, 12, 11, '#fff9ec'); ZC.drawIcon(ctx, 'dots', px + 12, py - 98 - up, 16);
      }
      if (pc <= E.warn || a.mood) drawEnergy(ctx, z, px, py - 86 - up, pc <= E.distract ? '#e2483a' : '#f2b630');
    }
    if (a.kind === 'customer' && a.special) {   // unique customer: painted accessory + a bobbing gold star
      const sp = ZC.SPECIALS[a.special], al = a.alpha != null ? Math.max(0, Math.min(1, a.alpha)) : 1;
      ctx.save(); ctx.globalAlpha = al;
      ZC.drawAccessory(ctx, sp.acc, px, py - 80, a.dir, t);
      ZC.drawIcon(ctx, 'star', px, py - 132 + Math.sin(t * 3 + a.phase) * 3, 20);
      ctx.restore();
    }
    if (a.kind === 'customer' && a.vip) {
      ctx.font = '600 13px \"Fredoka\", \"Nunito\", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.strokeText('VIP', px, py - 84); ctx.fillText('VIP', px, py - 84);
    }
  }

  // a small energy bar over a worker that needs attention
  function drawEnergy(ctx, z, px, y, color) {
    const w = 34, p = ZC.zPct(z);
    ZC.ink(ctx, 2); ZC.rrect(ctx, px - w / 2, y, w, 7, 3, '#2a2630');
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(px - w / 2 + 1.5, y + 1.5, Math.max(0, (w - 3) * p), 4, 2); ctx.fill();
  }

  // a piece that was just put down falls the last few pixels and bounces once
  function dropOff(o) {
    const t0 = ZC.view.drops[o.id]; if (t0 == null) return 0;
    const dt = performance.now() / 1000 - t0;
    if (dt < 0.12) return 28 * (1 - (dt / 0.12) ** 2);
    const v = (dt - 0.12) / 0.2;
    return v < 1 ? 7 * Math.sin(v * Math.PI) : 0;
  }

  // ---------- main render ----------
  ZC.worldBBox = function () {
    const c = cafe(), pts = [[-5, -5], [c.w + 5, -5], [-5, c.h + 9], [c.w + 5, c.h + 9]].map(([x, y]) => ZC.iso(x, y));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys) - WH - 20, y1: Math.max(...ys) + 30 };
  };

  ZC.renderCafe = function (ctx, t, view, cam, W, H) {
    const c = cafe(), rt = ZC.rt;
    const vx0 = cam.x - W / 2 / cam.z - 60, vx1 = cam.x + W / 2 / cam.z + 60, vy0 = cam.y - H / 2 / cam.z - 60, vy1 = cam.y + H / 2 / cam.z + 60;
    ctx.fillStyle = grassPattern(ctx);
    ctx.fillRect(vx0, vy0 - 160, vx1 - vx0, vy1 - vy0 + 220);

    // visible tile range
    const cs = [[vx0, vy0 - 140], [vx1, vy0 - 140], [vx0, vy1 + 20], [vx1, vy1 + 20]].map(([x, y]) => ZC.unIso(x, y));
    const tx0 = Math.floor(Math.min(...cs.map(p => p[0]))) - 1, tx1 = Math.ceil(Math.max(...cs.map(p => p[0]))) + 1;
    const ty0 = Math.floor(Math.min(...cs.map(p => p[1]))) - 1, ty1 = Math.ceil(Math.max(...cs.map(p => p[1]))) + 1;
    const putTile = (img, x, y) => { const [cx, cy] = ZC.iso(x + 0.5, y + 0.5); ctx.drawImage(img, cx - A - 2, cy - B - 2, ZC.TW + 4, ZC.TH + 4); };

    ZC.drawTerrain(ctx, tx0, tx1, ty0, ty1, t);

    // road along the front + stone path to the door
    for (const y of [c.h + 7, c.h + 8]) for (let x = Math.max(tx0, -40); x <= Math.min(tx1, c.w + 40); x++) if (y >= ty0 && y <= ty1) putTile(ZC.roadImg('road', (x + y) & 1), x, y);
    for (let y = c.h; y <= c.h + 6; y++) putTile(ZC.roadImg('path', (y & 1)), c.doorX, y);
    // floor
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) putTile(ZC.floorImg(c.floor, (x + y) & 1), x, y);
    // door mat
    { const [mx, my] = ZC.iso(c.doorX + 0.5, c.h - 0.5); ctx.fillStyle = '#7a2a30'; ctx.beginPath(); ctx.moveTo(mx, my - 12); ctx.lineTo(mx + 32, my); ctx.lineTo(mx, my + 12); ctx.lineTo(mx - 32, my); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke(); }
    // rugs (flat decor)
    for (const o of c.objects) if (!o.hidden && ZC.ITEMS[o.type].flat) { const [cx, cy] = ZC.iso(o.x + 0.5, o.y + 0.5); ZC.drawItem(ctx, o.type, cx, cy, o, t); }

    const list = [], pre = [];
    const add = (d, f) => list.push({ d, f });
    const addPre = (d, f) => pre.push({ d, f });

    // walls
    const wst = (side, i) => (c.wallSeg && c.wallSeg[side + i]) || c.wall;
    for (let x = 0; x < c.w; x++) {
      const [wx, wy] = ZC.iso(x, 0), st = wst('R', x), e0 = x === 0 || wst('R', x - 1) !== st, e1 = x === c.w - 1 || wst('R', x + 1) !== st;
      addPre(1000 + x + 0.5, () => ctx.drawImage(ZC.wallImg(st, 'R', (x % 3 === 1 && Math.abs(x + 0.5 - c.w / 2 - 0.5) > 2.2) ? 1 : 0, e0, e1), wx - 4, wy - WH - 8, WW, WHH));
      if (view.paintWall && view.wallHover && view.wallHover[0] === 'R' && view.wallHover[1] === x) addPre(1000.9 + x, () => hiWall(ctx, 'R', x));
    }
    for (let y = 0; y < c.h; y++) {
      const [wx, wy] = ZC.iso(0, y), st = wst('L', y), e0 = y === 0 || wst('L', y - 1) !== st, e1 = y === c.h - 1 || wst('L', y + 1) !== st;
      addPre(1000 + y + 0.5, () => ctx.drawImage(ZC.wallImg(st, 'L', y % 3 === 1 ? 1 : 0, e0, e1), wx - A - 4, wy - WH - 8, WW, WHH));
      if (view.paintWall && view.wallHover && view.wallHover[0] === 'L' && view.wallHover[1] === y) addPre(1000.9 + y, () => hiWall(ctx, 'L', y));
    }
    addPre(1199, () => { const [cx, cy] = ZC.iso(0, 0); ctx.save(); ctx.translate(cx, cy); box(ctx, -0.07, -0.07, 0.07, 0.07, 0, WH + 8, bc('#7a5a3a')); ctx.restore(); });
    // sign above the door side of the right wall
    addPre(1200, () => {
      const [sx, sy] = ZC.iso(c.w / 2 + 0.5, 0);
      ctx.save(); ctx.translate(sx, sy - WH + 10); ctx.transform(1, 0.5, 0, 1, 0, 0);
      ZC.ink(ctx, 4); ZC.rrect(ctx, -60, -4, 120, 26, 6, '#4a2a1a');
      const sign = c.sign || 'ZOMBIE CAFÉ', glow = c.signColor || '#9dff6a';
      ctx.font = '600 19px \"Fredoka\", \"Nunito\", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const sw = ctx.measureText(sign).width; if (sw > 108) ctx.font = '600 ' + Math.floor(19 * 108 / sw) + 'px \"Fredoka\", \"Nunito\", sans-serif';
      ctx.shadowColor = glow; ctx.shadowBlur = 8 + Math.sin(t * 2) * 4; ctx.fillStyle = glow; ctx.fillText(sign, 0, 10); ctx.shadowBlur = 0;
      ctx.restore();
    });

    // curbs and door frame
    for (let x = 0; x < c.w; x++) if (x !== c.doorX) { const [cx, cy] = ZC.iso(x + 0.5, c.h - 0.5); add(x + c.h + 0.45, () => ctx.drawImage(curbImg('Y'), cx - ZC.CACHE_BOX.OX, cy - ZC.CACHE_BOX.OY, ZC.CACHE_BOX.CW, ZC.CACHE_BOX.CH)); }
    for (let y = 0; y < c.h; y++) { const [cx, cy] = ZC.iso(c.w - 0.5, y + 0.5); add(c.w + y + 0.45, () => ctx.drawImage(curbImg('X'), cx - ZC.CACHE_BOX.OX, cy - ZC.CACHE_BOX.OY, ZC.CACHE_BOX.CW, ZC.CACHE_BOX.CH)); }
    { const [cx, cy] = ZC.iso(c.doorX + 0.5, c.h - 0.5), open = rt.door || 0;
      add(c.doorX + c.h + 0.45, () => ctx.drawImage(doorImg(), cx - ZC.CACHE_BOX.OX, cy - ZC.CACHE_BOX.OY, ZC.CACHE_BOX.CW, ZC.CACHE_BOX.CH));
      add(c.doorX + c.h + (open > 0.3 ? -0.2 : 0.46), () => drawDoorLeaf(ctx, cx, cy, open)); }

    // furniture
    for (const o of c.objects) {
      if (o.hidden) continue;
      const it = ZC.ITEMS[o.type];
      if (it.flat) continue;
      const [cx, cy0] = ZC.iso(o.x + 0.5, o.y + 0.5), d = o.x + o.y + 1, cy = cy0 - dropOff(o);
      const sel = view.selected === o;
      const hl = () => { if (sel) { ctx.fillStyle = 'rgba(255,216,74,.4)'; ZC.diamond(ctx, o.x, o.y, 1); ctx.fill(); } };
      if (it.cat === 'chair') {
        add(d, () => { hl(); ZC.drawItem(ctx, o.type, cx, cy, o, t, 'base'); });
        add(d + 0.4, () => ZC.drawItem(ctx, o.type, cx, cy, o, t, 'front'));
      } else if (it.cat === 'table') {
        add(d, () => {
          hl(); ZC.drawItem(ctx, o.type, cx, cy, o, t);
          for (const ch of c.objects) {
            if (ch.type.indexOf('chair') !== 0 || Math.abs(ch.x - o.x) + Math.abs(ch.y - o.y) !== 1) continue;
            const [dx, dy] = dishTarget(o, ch), dirty = rt.dirty[ch.id];
            const cu = rt.customers.find(q => q.seat === ch.id && q.state === 'eat');
            if (cu) ZC.drawFood(ctx, cu.dish, dx, dy, 11);
            else if (dirty) ZC.drawDirtyPlate(ctx, dx, dy, 11);
          }
        });
      } else add(d, () => { hl(); ZC.drawItem(ctx, o.type, cx, cy, o, t); });
    }

    // toxin flasks lying on the floor
    for (const p of rt.pickups || []) {
      const [px, py] = ZC.iso(p.x + 0.5, p.y + 0.5);
      add(p.x + p.y + 1.1, () => {
        const bob = Math.sin(t * 4 + p.x) * 4;
        ctx.globalAlpha = Math.min(1, p.life / 3) * (p.life < 6 ? 0.55 + 0.45 * Math.sin(t * 14) : 1);
        ctx.fillStyle = 'rgba(158,224,96,.35)'; ctx.beginPath(); ctx.ellipse(px, py + 2, 24, 11, 0, 0, TAU); ctx.fill();
        ZC.drawIcon(ctx, 'flask', px, py - 28 + bob, 36); ctx.globalAlpha = 1;
      });
    }
    // actors
    for (const a of rt.customers) add(a.x + a.y + 1 + (a.state === 'wait' || a.state === 'eat' ? 0.2 : 0), () => drawActor(ctx, a, t, view));
    for (const a of rt.zombies) if (!a.held) add(a.x + a.y + 1 + (a.state === 'collapsed' ? -0.1 : 0.05), () => drawActor(ctx, a, t, view));
    if (rt.extraActors) rt.extraActors(add, ctx, t);   // raids draw their own fighters

    // scenery outside the café (infinite, deterministic by tile)
    // what the café covers on screen (floor + the two back walls): trees in front of it turn see-through over this area
    const [lx, ly] = ZC.iso(0, c.h), [tx, ty] = ZC.iso(0, 0), [rx, ry] = ZC.iso(c.w, 0), [bx, by] = ZC.iso(c.w, c.h);
    const cafeShape = [[lx, ly], [lx, ly - WH], [tx, ty - WH], [rx, ry - WH], [rx, ry], [bx, by]];
    const shape = { x0: lx, x1: rx, y0: ty - WH, y1: by };
    const drawOutside = (sc, cx, cy) => {
      const m = ZC.PROPS[sc.name], s = (sc.s || 1), px = cx + (sc.ox || 0) * A * 2, py = cy + (sc.oy || 0) * B * 2;
      if (!m) return;
      const sx0 = px - m.ax * s - 4, sx1 = px + m.w * s + 4, sy0 = py - m.ay * s, sy1 = py + 6;   // sprite box on screen
      if (sx1 < shape.x0 || sx0 > shape.x1 || sy1 < shape.y0 || sy0 > shape.y1) return ZC.drawScenery(ctx, sc, cx, cy);
      ctx.save();   // solid outside the café ...
      ctx.beginPath(); ctx.rect(px - 600, py - 900, 1200, 1400);
      ctx.moveTo(cafeShape[0][0], cafeShape[0][1]); for (const p of cafeShape) ctx.lineTo(p[0], p[1]); ctx.closePath();
      ctx.clip('evenodd'); ZC.drawScenery(ctx, sc, cx, cy); ctx.restore();
      ctx.save();   // ... ghosted over it
      ctx.beginPath(); ctx.moveTo(cafeShape[0][0], cafeShape[0][1]); for (const p of cafeShape) ctx.lineTo(p[0], p[1]); ctx.closePath();
      ctx.clip(); ctx.globalAlpha = 0.32; ZC.drawScenery(ctx, sc, cx, cy); ctx.restore();
    };
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const sc = ZC.sceneryAt(x, y);
      if (!sc) continue;
      const [cx, cy] = ZC.iso(x + 0.5, y + 0.5);
      if (cx < vx0 - 100 || cx > vx1 + 100 || cy < vy0 - 220 || cy > vy1 + 100) continue;
      const d = x + y + 1 + ((sc.ox || 0) + (sc.oy || 0)) * 0.5;
      if (x < 0 || y < 0) addPre(d, () => ZC.drawScenery(ctx, sc, cx, cy));
      else add(d, () => drawOutside(sc, cx, cy));
    }

    pre.sort((p, q) => p.d - q.d);
    for (const it of pre) it.f();
    list.sort((p, q) => p.d - q.d);
    for (const it of list) it.f();
    ZC.drawDragged(ctx, t);

    // ----- overlays -----
    for (const o of c.objects) {
      if (o.hidden || !o.type.startsWith('stove')) continue;
      const st = ZC.stoveStatus(o), [cx, cy] = ZC.iso(o.x + 0.5, o.y + 0.5), top = cy - 100;
      if (st === 'cooking') {
        for (let i = 0; i < 3; i++) {   // steam from the pot while somebody stirs
          const ph = (t * 0.7 + i / 3) % 1;
          ctx.globalAlpha = (1 - ph) * 0.8; ctx.fillStyle = '#f4f6fb'; ZC.ink(ctx, 1.5);
          ctx.beginPath(); ctx.arc(cx + Math.sin(ph * 6 + i * 2) * 7, cy - 52 - ph * 34, 4 + ph * 4, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        stoveBar(ctx, o, cx, top, '#8fe05a', '#fff', null);
      } else if (st === 'paused') {   // nobody is stirring: the bar stops and the seconds until it burns count down
        stoveBar(ctx, o, cx, top, '#f2b630', Math.sin(t * 10) > 0 ? '#ffd84a' : '#ff8a6a', `queima em ${Math.ceil(o.cook.abandon)}s`);
      } else if (st === 'ready') {
        const bob = Math.sin(t * 5) * 4, soon = o.cook.spoil <= ZC.CFG.kitchen.spoilWarn; ZC.ink(ctx, 3);
        ell(ctx, cx, top + bob, 24, 20, soon && Math.sin(t * 10) > 0 ? '#ff8a6a' : '#9dff6a'); ZC.drawFood(ctx, o.cook.r, cx, top + bob + 2, 13);
        if (soon) { ctx.font = 'bold 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = '#ff8a6a';
          const txt = `estraga em ${Math.ceil(o.cook.spoil)}s`; ctx.strokeText(txt, cx, top - 28); ctx.fillText(txt, cx, top - 28); }
      } else if (st === 'spoiled') {
        ZC.ink(ctx, 3); ell(ctx, cx, top, 18, 16, '#c9a24a'); ZC.drawIcon(ctx, 'close', cx, top, 24);
      } else if (st === 'pending') {
        ZC.ink(ctx, 2.5); ell(ctx, cx, top + 6, 16, 14, '#fff9ec'); ZC.drawIcon(ctx, 'skull', cx, top + 6, 22);
      }
      if (view.dragHover === o && ZC.dragging()) { // a held zombie is above this stove: show where it will drop
        ctx.fillStyle = 'rgba(255,230,90,.38)'; ZC.diamond(ctx, o.x, o.y, 1.05); ctx.fill();
        ctx.strokeStyle = '#ffe24a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.globalAlpha = 0.85 + Math.sin(t * 8) * 0.15; ZC.ink(ctx, 2.5); ell(ctx, cx, top - 6, 16, 14, '#fff9ec');
        ZC.drawIcon(ctx, st === 'ready' ? 'plate' : st === 'empty' ? 'book' : 'dots', cx, top - 6, 22); ctx.globalAlpha = 1;
      }
    }
    if (ZC.dragging() && view.dragTile && !view.dragHover) { ctx.fillStyle = 'rgba(160,255,140,.3)'; ZC.diamond(ctx, view.dragTile[0], view.dragTile[1], 1); ctx.fill(); }
    for (const o of c.objects) { // counter servings badge
      if (o.hidden || !o.type.startsWith('counter') || !o.servings) continue;
      const [cx, cy] = ZC.iso(o.x + 0.5, o.y + 0.5), label = String(o.servings);
      ctx.font = 'bold 13px Nunito, sans-serif'; const w = Math.max(22, ctx.measureText(label).width + 12);
      ZC.ink(ctx, 2.5); ZC.rrect(ctx, cx + 14, cy - 14, w, 19, 9, '#ffd84a'); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx + 14 + w / 2, cy - 4);
    }
    for (const a of rt.customers) if (a.state === 'wait') { const [px, py] = ZC.iso(a.x + 0.5, a.y + 0.5); drawBubble(ctx, a, px, py + 6 - 14 - 12); }
    for (const id in rt.badSeat || {}) {   // a chair nobody can use says so
      const o = ZC.objById(+id); if (!o || o.hidden) continue;
      const [cx, cy] = ZC.iso(o.x + 0.5, o.y + 0.5);
      ZC.ink(ctx, 2.5); ell(ctx, cx, cy - 62, 13, 12, '#ffd9c9'); ZC.drawIcon(ctx, 'lock', cx, cy - 62, 17);
    }

    // furniture lifted by a long press: a shadow on the tile it would land on, and the piece floating above it
    if (view.lift && view.hover) {
      const L = view.lift, [hx, hy] = view.hover, ok = ZC.canPlace(L.type, hx, hy, L.o), [cx, cy] = ZC.iso(hx + 0.5, hy + 0.5);
      const now = performance.now() / 1000, u = Math.min(1, (now - L.t0) / 0.22), e = 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2;
      const lift = 30 * e + Math.sin(now * 5) * 1.5 * u;
      ctx.fillStyle = 'rgba(120,150,170,.18)'; ZC.diamond(ctx, L.x, L.y, 1); ctx.fill();
      ctx.fillStyle = ok ? 'rgba(120,255,110,.45)' : 'rgba(255,80,70,.45)'; ZC.diamond(ctx, hx, hy, 1); ctx.fill();
      ZC.shadowEll(ctx, cx, cy + 2, 26 - lift * 0.25, 11 - lift * 0.1);
      ctx.save(); ctx.translate(cx, cy - lift); const sc = 1 + 0.06 * Math.max(0, 1 - Math.abs(u - 0.6) * 2.5); ctx.scale(sc, sc);
      ZC.drawItem(ctx, L.type, 0, 0, L.o, t); ctx.restore();
    }
    // little dust ring where a piece has just been put down
    for (const id of Object.keys(view.drops)) {
      const dt = performance.now() / 1000 - view.drops[id], o = ZC.objById(+id);
      if (!o || dt > 0.45) { if (dt > 0.45) delete view.drops[id]; continue; }
      const [cx, cy] = ZC.iso(o.x + 0.5, o.y + 0.5), k = dt / 0.45;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, A * (0.6 + k * 0.9), B * (0.6 + k * 0.9), 0, 0, TAU); ctx.stroke();
    }

    // placement ghost + edit grid
    if (view.placing && view.hover) {
      const [hx, hy] = view.hover, ok = ZC.canPlace(view.placing.type, hx, hy, view.placing.moving);
      ctx.fillStyle = ok ? 'rgba(120,255,110,.4)' : 'rgba(255,80,70,.4)'; ZC.diamond(ctx, hx, hy, 1); ctx.fill();
      ctx.globalAlpha = 0.75; const [cx, cy] = ZC.iso(hx + 0.5, hy + 0.5);
      ZC.drawItem(ctx, view.placing.type, cx, cy, view.placing.moving || { id: 0 }, t); ctx.globalAlpha = 1;
    }
    if (view.mode === 'edit' || view.placing || view.lift) {
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { ZC.diamond(ctx, x, y, 1); ctx.stroke(); }
    }
    for (const f of rt.fx) {
      const a = 1 - Math.max(0, f.t - 1) / 0.6; const [fx, fy] = ZC.iso(f.x, f.y);
      ctx.globalAlpha = a; ctx.font = '600 19px \"Fredoka\", \"Nunito\", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.fillStyle = f.color; const y = fy - 60 - f.t * 30;
      ctx.strokeText(f.text, fx, y); ctx.fillText(f.text, fx, y); ctx.globalAlpha = 1;
    }
  };
})();
