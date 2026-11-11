// Isometric painters. Everything is drawn in code with thick dark outlines and 3-tone shading
// to match the Craftpix characters. Static art is cached to offscreen canvases.
(() => {
  const ZC = window.ZC;
  const A = ZC.TW / 2, B = ZC.TH / 2, TAU = Math.PI * 2, INK = '#2b2333';
  const OL = 0.55;   // outline weight: the animated characters have thin outlines, the world follows them
  ZC.INK = INK;
  const P = (u, v, z = 0) => [(u - v) * A, (u + v) * B - z];
  const lerp = (p, q, f) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];

  // ---------- colour helpers ----------
  function rgb(c) {
    if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, f) {
    const x = rgb(a), y = rgb(b);
    return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * f).toString(16).padStart(2, '0')).join('');
  }
  const lite = (c, f = 0.25) => mix(c, '#ffffff', f);
  const dark = (c, f = 0.3) => mix(c, '#000000', f);
  const bc = b => ({ top: lite(b, 0.3), left: b, right: dark(b, 0.3) });
  function rng(seed) { let s = (seed | 0) || 1; return () => ((s = (s * 1664525 + 1013904223) | 0) >>> 0) / 4294967296; }
  ZC.mix = mix; ZC.lite = lite; ZC.dark = dark; ZC.rng = rng;

  // ---------- primitives ----------
  function path(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  function poly(ctx, pts, fill, lw = 3) {
    path(ctx, pts);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw * OL; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function ell(ctx, x, y, rx, ry, fill, lw = 3) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw * OL; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  function stroke2(ctx, pts, col, lw = 3, inkw = 3) { // outlined thick line
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [c, w] of [[INK, lw + (inkw * 2 - 2) * OL], [col, lw]]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    }
  }
  function shadow(ctx, rx = 40, ry = 20, a = 0.3, x = 0, y = 2) {
    ctx.fillStyle = `rgba(10,5,15,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }
  function box(ctx, u0, v0, u1, v1, z0, z1, c, lw = 3) {
    if (typeof c === 'string') c = bc(c);
    const L = [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)];
    const R = [P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)];
    const T = [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)];
    poly(ctx, L, c.left, lw); poly(ctx, R, c.right, lw); poly(ctx, T, c.top, lw);
    return { L, R, T };
  }
  function cyl(ctx, u, v, r, z0, z1, c, lw = 3) {
    const [cx, cy] = P(u, v, 0), rx = r * A * 1.414, ry = r * B * 1.414;
    const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    g.addColorStop(0, lite(c.side, 0.25)); g.addColorStop(0.45, c.side); g.addColorStop(1, dark(c.side, 0.38));
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy - z1); ctx.lineTo(cx - rx, cy - z0);
    ctx.ellipse(cx, cy - z0, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(cx + rx, cy - z1);
    ctx.ellipse(cx, cy - z1, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw * OL; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    if (c.top) ell(ctx, cx, cy - z1, rx, ry, c.top, lw);
    return { cx, cy, rx, ry, z0, z1 };
  }
  function lines(ctx, face, fr, col, vert, lw = 1.6) { // face = [bottom-left, bottom-right, top-right, top-left]
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    for (const f of fr) {
      const p = vert ? lerp(face[0], face[1], f) : lerp(face[0], face[3], f);
      const q = vert ? lerp(face[3], face[2], f) : lerp(face[1], face[2], f);
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
  }
  function speck(ctx, pts, seed, n, col, rmax = 2.6) {
    ctx.save(); path(ctx, pts); ctx.clip();
    const r = rng(seed), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.ellipse(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 1 + r() * rmax, 0.7 + r() * rmax * 0.6, r() * 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function planks(ctx, u0, v0, u1, v1, z, col, n) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 1; i < n; i++) {
      const v = v0 + (v1 - v0) * i / n, a = P(u0, v, z), b = P(u1, v, z);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  }
  function hoop(ctx, g, z, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy - z, g.rx, g.ry, 0, 0.05, Math.PI - 0.05); ctx.stroke();
  }
  function clipEll(ctx, g, z, fn) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(g.cx, g.cy - z, g.rx - 1.5, g.ry - 1, 0, 0, TAU); ctx.clip(); fn(); ctx.restore();
  }
  function skull(ctx, x, y, s, col = '#f4ecd4') {
    ell(ctx, x, y, 9 * s, 8 * s, col, 2.5);
    poly(ctx, [[x - 5 * s, y + 4 * s], [x + 5 * s, y + 4 * s], [x + 4 * s, y + 10 * s], [x - 4 * s, y + 10 * s]], col, 2.5);
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(x - 3.5 * s, y, 2.4 * s, 2.8 * s, 0, 0, TAU); ctx.ellipse(x + 3.5 * s, y, 2.4 * s, 2.8 * s, 0, 0, TAU); ctx.fill();
    ctx.fillRect(x - 1.2 * s, y + 4.5 * s, 2.4 * s, 2 * s);
  }
  function bone(ctx, u, v, z0, z1, col) { // vertical bone with knobs
    const a = P(u, v, z0), b = P(u, v, z1);
    stroke2(ctx, [a, b], col, 7, 2.5);
    for (const p of [a, b]) { ell(ctx, p[0] - 4, p[1], 4.5, 4, col, 2.2); ell(ctx, p[0] + 4, p[1], 4.5, 4, col, 2.2); }
  }
  function gem(ctx, x, y, r, col) {
    poly(ctx, [[x, y - r], [x + r, y], [x, y + r], [x - r, y]], col, 2);
  }
  function glowDot(ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  ZC.ink = (ctx, w = 3) => { ctx.lineWidth = w * OL; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
  ZC.rrect = (ctx, x, y, w, h, r, fill, stroke = true) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) ctx.stroke();
  };
  ZC.shadowEll = (ctx, x, y, rx, ry) => { ctx.fillStyle = 'rgba(14,10,24,.24)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
  ZC.prim = { P, A, B, TAU, INK, lerp, path, poly, ell, stroke2, shadow, box, cyl, lines, speck, planks, hoop, clipEll, skull, bone, gem, glowDot, bc, mix, lite, dark, rng };

  // ---------- painter registry ----------
  const PT = ZC.PAINT = {};   // category / decor id -> { static(ctx,v), dyn(ctx,o,t,v) }
  const THEME = {};
  ZC.THEMES.forEach(t => (THEME[t.id] = t));

  // ================= TABLES =================
  PT.table = {
    static(ctx, v) {
      const p = v.pal; shadow(ctx, 48, 24);
      switch (v.theme) {
        case 'wood': {
          const g = cyl(ctx, 0, 0, 0.34, 0, 30, { side: p.base, top: p.light });
          clipEll(ctx, g, 30, () => planks(ctx, -0.5, -0.5, 0.5, 0.5, 30, dark(p.light, 0.25), 6));
          ctx.strokeStyle = dark(p.base, 0.35); ctx.lineWidth = 1.5; ctx.beginPath();
          for (let i = -2; i <= 2; i++) { const x = g.cx + i * g.rx * 0.38, s = Math.sqrt(1 - ((x - g.cx) / g.rx) ** 2); ctx.moveTo(x, g.cy - 30 + g.ry * s); ctx.lineTo(x, g.cy + g.ry * s); }
          ctx.stroke();
          hoop(ctx, g, 7, p.trim); hoop(ctx, g, 22, p.trim);
          ell(ctx, g.cx, g.cy - 30, g.rx, g.ry, null, 3);
          break;
        }
        case 'stone': {
          const lg = box(ctx, -0.2, -0.2, 0.2, 0.2, 0, 24, { top: p.light, left: p.base, right: p.dark });
          speck(ctx, lg.L, 5, 12, dark(p.base, 0.3)); speck(ctx, lg.R, 6, 12, dark(p.dark, 0.3));
          const f = box(ctx, -0.44, -0.44, 0.44, 0.44, 24, 35, { top: p.light, left: p.base, right: p.dark });
          lines(ctx, f.L, [0.5], dark(p.base, 0.3), true); speck(ctx, f.T, 3, 18, dark(p.light, 0.25)); speck(ctx, f.L, 9, 10, dark(p.base, 0.3));
          ctx.strokeStyle = dark(p.light, 0.4); ctx.lineWidth = 1.5; ctx.beginPath();
          let a = P(-0.1, -0.3, 35), b = P(0.05, -0.05, 35), c2 = P(0.3, 0.1, 35); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
          // moss
          ctx.fillStyle = '#5a8f3a'; const m = P(-0.3, 0.35, 35); ctx.beginPath(); ctx.ellipse(m[0], m[1], 9, 4, 0, 0, TAU); ctx.fill();
          break;
        }
        case 'toxic': {
          cyl(ctx, 0, 0, 0.13, 0, 26, { side: p.dark });
          const g = cyl(ctx, 0, 0, 0.4, 25, 34, { side: p.base, top: p.light });
          clipEll(ctx, g, 34, () => { ctx.fillStyle = lite(p.light, 0.3); ctx.beginPath(); ctx.ellipse(g.cx - 8, g.cy - 36, 14, 4, 0.2, 0, TAU); ctx.fill(); });
          // slime drips along the front rim
          ctx.fillStyle = p.accent; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          for (const [dx, h] of [[-0.55, 12], [-0.1, 18], [0.45, 9]]) {
            const x = g.cx + dx * g.rx, s = Math.sqrt(1 - (dx * 0.55) ** 2), y = g.cy - 34 + g.ry * s * 0.95;
            ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 5, y + h); ctx.arc(x, y + h, 5, Math.PI, 0, true); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          for (const [dx, dy, r] of [[-12, -1, 3.5], [10, 3, 2.6], [2, -5, 2]]) ell(ctx, g.cx + dx, g.cy - 36 + dy, r, r * 0.8, p.accent, 1.5);
          break;
        }
        case 'bone': {
          const legs = [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]];
          for (const [u, w] of legs) bone(ctx, u, w, 0, 26, p.base);
          const f = box(ctx, -0.46, -0.46, 0.46, 0.46, 25, 34, { top: p.light, left: p.base, right: p.dark });
          speck(ctx, f.T, 4, 14, dark(p.light, 0.18)); speck(ctx, f.L, 5, 8, dark(p.base, 0.2));
          const s = P(0, 0, 34); skull(ctx, s[0], s[1] - 6, 0.62, p.light);
          break;
        }
        case 'royal': {
          const f = box(ctx, -0.4, -0.4, 0.4, 0.4, 0, 30, { top: p.light, left: p.base, right: p.dark });
          lines(ctx, f.L, [0.14], p.accent, false, 4); lines(ctx, f.R, [0.14], p.accent, false, 4);
          lines(ctx, f.L, [0.86], p.accent, false, 3); lines(ctx, f.R, [0.86], p.accent, false, 3);
          for (let i = 1; i < 6; i++) { // fringe dots
            const q = lerp(f.L[0], f.L[1], i / 6); ell(ctx, q[0], q[1] - 1, 2.2, 2.2, p.accent, 1.5);
            const q2 = lerp(f.R[0], f.R[1], i / 6); ell(ctx, q2[0], q2[1] - 1, 2.2, 2.2, p.accent, 1.5);
          }
          const top = box(ctx, -0.46, -0.46, 0.46, 0.46, 30, 34, { top: lite(p.light, 0.15), left: p.accent, right: dark(p.accent, 0.25) });
          const c = P(0, 0, 34); ell(ctx, c[0], c[1], 14, 7, p.accent, 2); ell(ctx, c[0], c[1] - 1, 8, 4, lite(p.accent, 0.4), 0);
          gem(ctx, c[0], c[1] - 1, 3, '#e03a5a');
          void top;
          break;
        }
      }
    },
  };

  // ================= CHAIRS =================
  PT.chair = {
    static(ctx, v) {
      const p = v.pal, [dx, dy] = v.face;
      const bx = -dx, by = -dy; // back side (opposite the table)
      const backFront = bx > 0 || by > 0;
      const drawBack = () => {
        const u0 = bx ? (bx > 0 ? 0.17 : -0.27) : -0.25, u1 = bx ? (bx > 0 ? 0.27 : -0.17) : 0.25;
        const v0 = by ? (by > 0 ? 0.17 : -0.27) : -0.25, v1 = by ? (by > 0 ? 0.27 : -0.17) : 0.25;
        switch (v.theme) {
          case 'wood': { const f = box(ctx, u0, v0, u1, v1, 16, 46, bc(p.base)); planks(ctx, -.5, -.5, .5, .5, 0, '#0000', 1); lines(ctx, f.L, [0.5], dark(p.base, 0.3), false); lines(ctx, f.R, [0.5], dark(p.base, 0.4), false); break; }
          case 'stone': { const f = box(ctx, u0, v0, u1, v1, 16, 44, { top: p.light, left: p.base, right: p.dark }); speck(ctx, f.L, 3, 8, dark(p.base, 0.3)); speck(ctx, f.R, 4, 8, dark(p.dark, 0.3)); break; }
          case 'toxic': { const f = box(ctx, u0, v0, u1, v1, 16, 48, { top: p.accent, left: p.base, right: p.dark }); speck(ctx, f.L, 3, 6, p.accent, 2); break; }
          case 'bone': {
            const s = bx || by;
            for (const k of [-0.14, 0.14]) { if (bx) bone(ctx, bx > 0 ? 0.22 : -0.22, k, 14, 50, p.base); else bone(ctx, k, by > 0 ? 0.22 : -0.22, 14, 50, p.base); }
            const f = box(ctx, u0, v0, u1, v1, 28, 34, { top: p.light, left: p.base, right: p.dark }); void f; void s; break;
          }
          case 'royal': { const f = box(ctx, u0, v0, u1, v1, 16, 54, { top: p.light, left: p.base, right: p.dark }); lines(ctx, f.L, [0.9], p.accent, false, 3); lines(ctx, f.R, [0.9], p.accent, false, 3); const c = P((u0 + u1) / 2, (v0 + v1) / 2, 56); ell(ctx, c[0], c[1], 4, 3, p.accent, 2); break; }
        }
      };
      if (v.part === 'front') { if (backFront) drawBack(); return; }
      shadow(ctx, 30, 15);
      if (!backFront) drawBack();
      switch (v.theme) {
        case 'wood': { const g = cyl(ctx, 0, 0, 0.23, 0, 17, { side: p.base, top: p.light }); clipEll(ctx, g, 17, () => planks(ctx, -.5, -.5, .5, .5, 17, dark(p.light, 0.25), 4)); hoop(ctx, g, 6, p.trim); break; }
        case 'stone': { const f = box(ctx, -0.25, -0.25, 0.25, 0.25, 0, 17, { top: p.light, left: p.base, right: p.dark }); speck(ctx, f.L, 1, 8, dark(p.base, 0.3)); speck(ctx, f.T, 2, 8, dark(p.light, 0.2)); break; }
        case 'toxic': { cyl(ctx, 0, 0, 0.12, 0, 12, { side: p.dark }); const g = cyl(ctx, 0, 0, 0.25, 11, 18, { side: p.base, top: p.light }); ell(ctx, g.cx - 5, g.cy - 20, 3, 2, p.accent, 1.5); ctx.fillStyle = p.accent; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.cx + 8, g.cy - 8); ctx.lineTo(g.cx + 8, g.cy + 4); ctx.arc(g.cx + 12, g.cy + 4, 4, Math.PI, 0, true); ctx.lineTo(g.cx + 16, g.cy - 8); ctx.closePath(); ctx.fill(); ctx.stroke(); break; }
        case 'bone': { for (const [u, w] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bone(ctx, u, w, 0, 12, p.base); box(ctx, -0.27, -0.27, 0.27, 0.27, 11, 17, { top: p.light, left: p.base, right: p.dark }); break; }
        case 'royal': { for (const [u, w] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const a = P(u, w, 0), b = P(u, w, 9); stroke2(ctx, [a, b], p.accent, 5, 2); } const f = box(ctx, -0.27, -0.27, 0.27, 0.27, 9, 19, { top: '#d0508a', left: p.base, right: p.dark }); lines(ctx, f.L, [0.2], p.accent, false, 3); lines(ctx, f.R, [0.2], p.accent, false, 3); break; }
      }
    },
  };

  // ================= STOVES =================
  PT.stove = {
    static(ctx, v) {
      const p = v.pal; shadow(ctx, 50, 25);
      const body = { top: dark(p.base, 0.45), left: p.base, right: p.dark };
      const f = box(ctx, -0.43, -0.43, 0.43, 0.43, 0, 28, body);
      // oven opening on the left face
      const op = [P(-0.26, 0.43, 4), P(0.26, 0.43, 4), P(0.26, 0.43, 19), P(-0.26, 0.43, 19)];
      poly(ctx, op, '#1b1218', 2.5);
      switch (v.theme) {
        case 'wood': lines(ctx, f.L, [0.5, 0.8], dark(p.base, 0.4), false); lines(ctx, f.R, [0.33, 0.66], dark(p.dark, 0.4), false); lines(ctx, f.R, [0.5], dark(p.dark, 0.3), true); break;
        case 'stone': speck(ctx, f.L, 2, 14, dark(p.base, 0.3)); speck(ctx, f.R, 3, 14, dark(p.dark, 0.3)); lines(ctx, f.R, [0.5], dark(p.dark, 0.35), true); break;
        case 'toxic': lines(ctx, f.L, [0.06], p.accent, false, 3); for (let i = 0; i < 6; i++) { const q = lerp(f.R[0], f.R[1], (i + 0.5) / 6); ell(ctx, q[0], q[1] - 24, 1.8, 1.8, p.trim, 0); } lines(ctx, f.R, [0.1, 0.25, 0.4, 0.55, 0.7, 0.85], 'rgba(214,255,122,.35)', true, 3); break;
        case 'bone': { const q = lerp(lerp(f.R[0], f.R[1], 0.5), lerp(f.R[3], f.R[2], 0.5), 0.5); skull(ctx, q[0], q[1] - 1, 0.55, p.light); speck(ctx, f.L, 8, 12, p.dark, 1.8); break; }
        case 'royal': lines(ctx, f.L, [0.07], p.accent, false, 3); lines(ctx, f.R, [0.07], p.accent, false, 3); gem(ctx, ...lerp(lerp(f.R[0], f.R[1], 0.5), lerp(f.R[3], f.R[2], 0.5), 0.5), 5, '#e03a5a'); gem(ctx, ...P(-0.3, 0.44, 24), 3, '#5ae0e0'); gem(ctx, ...P(0.3, 0.44, 24), 3, '#5ae0e0'); break;
      }
      // knobs
      for (const u of [-0.3, 0, 0.3]) { const q = P(u, 0.43, 24); ell(ctx, q[0], q[1], 3.2, 3.2, p.accent, 2); }
      // burner plate
      const c = P(0, 0, 28); ell(ctx, c[0], c[1], 26, 13, '#25222b', 2.5);
    },
    dyn(ctx, o, t, v) {
      const st = ZC.stoveStatus(o), R = o.cook && ZC.DISHES[o.cook.r], busy = st === 'cooking' || st === 'pending';
      if (busy) { // fire inside the oven
        const q = P(0, 0.43, 4); const fl = Math.sin(t * 16) * 2.5;
        ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(q[0] - 12, q[1]); ctx.lineTo(q[0] - 6, q[1] - 14 - fl); ctx.lineTo(q[0], q[1] - 6); ctx.lineTo(q[0] + 6, q[1] - 16 + fl); ctx.lineTo(q[0] + 12, q[1]); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.moveTo(q[0] - 6, q[1]); ctx.lineTo(q[0] - 1, q[1] - 9 + fl); ctx.lineTo(q[0] + 6, q[1]); ctx.closePath(); ctx.fill();
      }
      const pot = v.theme === 'royal' ? '#b8bcc8' : v.theme === 'bone' ? '#6a6050' : '#3a3640';
      const g = cyl(ctx, 0, 0, 0.27, 28, 46, { side: pot, top: dark(pot, 0.35) });
      ell(ctx, g.cx, g.cy - 46, g.rx - 3, g.ry - 2, '#1a1820', 0);
      let liquid = null;
      if (busy || st === 'ready' || st === 'paused') liquid = st === 'pending' ? '#4a4452' : ZC.FOOD_COLOR[ZC.DISHES[o.cook.r].base] || '#8a6a3a';
      if (st === 'spoiled') liquid = '#4f4a2a';
      if (liquid) {
        ell(ctx, g.cx, g.cy - 45, g.rx - 4, g.ry - 3, liquid, 0);
        if (st !== 'pending') {
          ctx.fillStyle = lite(liquid, 0.4);
          for (let i = 0; i < 3; i++) { const q = (t * 1.2 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(g.cx - 10 + i * 10, g.cy - 46 - q * 3, 1.8 + q * 1.6, 0, TAU); ctx.fill(); }
        }
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(g.cx, g.cy - 46, g.rx, g.ry, 0, 0, TAU); ctx.stroke();
      // handles
      for (const s of [-1, 1]) ell(ctx, g.cx + s * (g.rx + 3), g.cy - 40, 4, 5, null, 3);
      if (busy && st === 'cooking') {
        ctx.strokeStyle = 'rgba(235,245,235,.5)'; ctx.lineWidth = 3;
        for (let i = 0; i < 2; i++) {
          const q = (t * 0.6 + i * 0.5) % 1; ctx.globalAlpha = 1 - q;
          ctx.beginPath(); ctx.moveTo(g.cx - 8 + i * 16, g.cy - 52 - q * 28); ctx.quadraticCurveTo(g.cx + i * 16, g.cy - 60 - q * 28, g.cx - 8 + i * 16, g.cy - 68 - q * 28); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      if (st === 'spoiled') { ctx.fillStyle = INK; for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.7; ctx.beginPath(); ctx.arc(g.cx + Math.cos(a) * 18, g.cy - 62 + Math.sin(a * 1.3) * 8, 2, 0, TAU); ctx.fill(); } }
    },
  };

  // ================= FRIDGES =================
  PT.fridge = {
    static(ctx, v) {
      const p = v.pal; shadow(ctx, 44, 22);
      const f = box(ctx, -0.34, -0.34, 0.34, 0.34, 0, 98, { top: lite(p.base, 0.35), left: p.base, right: p.dark });
      // doors: seam in the middle of the left face, freezer split
      lines(ctx, f.L, [0.5], dark(p.base, 0.55), true, 2.5);
      lines(ctx, f.L, [0.66], dark(p.base, 0.45), false, 2.5); lines(ctx, f.R, [0.66], dark(p.dark, 0.3), false, 2.5);
      const h1 = P(-0.06, 0.34, 40), h2 = P(0.06, 0.34, 40), h3 = P(-0.06, 0.34, 76), h4 = P(0.06, 0.34, 76);
      stroke2(ctx, [[h1[0], h1[1] - 8], [h1[0], h1[1] + 8]], p.accent, 4, 2); stroke2(ctx, [[h2[0], h2[1] - 8], [h2[0], h2[1] + 8]], p.accent, 4, 2);
      stroke2(ctx, [[h3[0], h3[1] - 6], [h3[0], h3[1] + 6]], p.accent, 4, 2); stroke2(ctx, [[h4[0], h4[1] - 6], [h4[0], h4[1] + 6]], p.accent, 4, 2);
      const mid = (face, fx, fz) => lerp(lerp(face[0], face[1], fx), lerp(face[3], face[2], fx), fz);
      switch (v.theme) {
        case 'wood': lines(ctx, f.L, [0.25, 0.4, 0.8, 0.92], dark(p.base, 0.3), false); lines(ctx, f.R, [0.2, 0.4, 0.6, 0.8], dark(p.dark, 0.3), false); lines(ctx, f.L, [0.12], p.trim, false, 4); lines(ctx, f.R, [0.12], p.trim, false, 4); break;
        case 'stone': speck(ctx, f.L, 3, 22, dark(p.base, 0.3)); speck(ctx, f.R, 4, 22, dark(p.dark, 0.3)); { const q = mid(f.L, 0.25, 0.8); ctx.fillStyle = '#cfe8ff'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 8, 4, 0, 0, TAU); ctx.fill(); } break;
        case 'toxic': { const q = mid(f.R, 0.5, 0.75); poly(ctx, [[q[0] - 12, q[1] - 12], [q[0] + 12, q[1] - 12 + 5], [q[0] + 12, q[1] + 12 + 5], [q[0] - 12, q[1] + 12]], '#1a3a16', 2.5); glowDot(ctx, q[0], q[1], 16, 'rgba(158,224,96,.8)'); ell(ctx, q[0], q[1] + 1, 4, 4, p.accent, 1.5); const q2 = mid(f.L, 0.25, 0.45); ZC.drawIcon(ctx, 'skull', q2[0], q2[1] + 2, 16); } break;
        case 'bone': { const q = mid(f.R, 0.5, 0.78); skull(ctx, q[0], q[1], 0.9, p.light); const q2 = mid(f.L, 0.25, 0.3); bone(ctx, 0, 0.34, 0, 0, p.base); void q2; speck(ctx, f.L, 5, 14, p.dark, 1.8); } break;
        case 'royal': lines(ctx, f.L, [0.06, 0.94], p.accent, false, 3); lines(ctx, f.R, [0.06, 0.94], p.accent, false, 3); lines(ctx, f.L, [0.08, 0.92], p.accent, true, 2.5); gem(ctx, ...mid(f.R, 0.5, 0.8), 6, '#e03a5a'); gem(ctx, ...mid(f.L, 0.25, 0.8), 4, '#5ae0e0'); gem(ctx, ...mid(f.L, 0.75, 0.8), 4, '#5ae0e0'); break;
      }
      // frost sparkle
      ctx.fillStyle = 'rgba(210,235,255,.9)'; const s = P(0.2, 0.2, 98); ctx.beginPath(); ctx.arc(s[0], s[1], 2, 0, TAU); ctx.fill();
    },
  };

  // ================= SINKS =================
  PT.sink = {
    static(ctx, v) {
      const p = v.pal; shadow(ctx, 48, 24);
      const f = box(ctx, -0.44, -0.44, 0.44, 0.44, 0, 30, { top: lite(p.light, 0.15), left: p.base, right: p.dark });
      lines(ctx, f.L, [0.5], dark(p.base, 0.4), true); lines(ctx, f.R, [0.5], dark(p.dark, 0.4), true);
      if (v.theme === 'wood') { lines(ctx, f.L, [0.3, 0.6], dark(p.base, 0.3), false); }
      if (v.theme === 'stone') { speck(ctx, f.L, 2, 12, dark(p.base, 0.3)); speck(ctx, f.R, 3, 12, dark(p.dark, 0.3)); }
      if (v.theme === 'toxic') { lines(ctx, f.L, [0.1], p.accent, false, 3); }
      if (v.theme === 'bone') { speck(ctx, f.L, 4, 10, p.dark, 1.6); speck(ctx, f.R, 5, 10, dark(p.dark, 0.3), 1.6); }
      if (v.theme === 'royal') { lines(ctx, f.L, [0.1, 0.9], p.accent, false, 3); lines(ctx, f.R, [0.1, 0.9], p.accent, false, 3); }
      // basin
      const c = P(0, 0.04, 30);
      ell(ctx, c[0], c[1], 28, 14, dark(p.light, 0.2), 2.5);
      ell(ctx, c[0], c[1] + 1, 23, 10.5, v.theme === 'toxic' ? '#7acb4a' : '#4a7a9a', 0);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(c[0] - 7, c[1] - 1, 7, 2.2, 0.2, 0, TAU); ctx.fill();
      // faucet at the back corner
      const b = P(-0.3, -0.3, 30), top = P(-0.3, -0.3, 54);
      stroke2(ctx, [b, top, [top[0] + 9, top[1] + 2], [top[0] + 12, top[1] + 9]], v.theme === 'royal' ? p.accent : '#b8c0c8', 6, 2.5);
      ell(ctx, top[0] - 1, top[1], 4.5, 4, v.theme === 'royal' ? p.accent : '#8a929a', 2);
    },
    dyn(ctx, o, t) {
      const n = ZC.rt.sinkLoad ? ZC.rt.sinkLoad[o.id] || 0 : 0;
      const w = ZC.rt.washing ? ZC.rt.washing[o.id] : 0;
      const c = P(0, 0.04, 30);
      if (w > 0) { // bubbles
        for (let i = 0; i < 4; i++) { const q = (t * 0.9 + i * 0.25) % 1; ctx.globalAlpha = 1 - q; ell(ctx, c[0] - 10 + i * 7, c[1] - 4 - q * 14, 3 + (i % 2), 3 + (i % 2), '#eaf6ff', 1.5); ctx.globalAlpha = 1; }
      }
      void n;
    },
  };

  // ================= COUNTERS =================
  PT.counter = {
    static(ctx, v) {
      const p = v.pal; shadow(ctx, 50, 25);
      const f = box(ctx, -0.42, -0.42, 0.42, 0.42, 0, 30, { top: p.light, left: p.base, right: p.dark });
      const t = box(ctx, -0.47, -0.47, 0.47, 0.47, 30, 37, { top: lite(p.light, 0.2), left: lite(p.base, 0.1), right: p.dark });
      lines(ctx, f.L, [0.5], dark(p.base, 0.4), true); lines(ctx, f.R, [0.5], dark(p.dark, 0.4), true);
      switch (v.theme) {
        case 'wood': lines(ctx, f.L, [0.25, 0.75], dark(p.base, 0.25), true, 1.2); planks(ctx, -.47, -.47, .47, .47, 37, dark(p.light, 0.25), 5); break;
        case 'stone': speck(ctx, f.L, 2, 12, dark(p.base, 0.3)); speck(ctx, f.R, 3, 12, dark(p.dark, 0.3)); speck(ctx, t.T, 4, 14, dark(p.light, 0.25)); break;
        case 'toxic': lines(ctx, f.L, [0.12], p.accent, false, 3); lines(ctx, f.R, [0.12], p.accent, false, 3); ell(ctx, ...P(0.2, 0.2, 37), 4, 2.6, p.accent, 1.5); break;
        case 'bone': { const q = lerp(lerp(f.L[0], f.L[1], 0.25), lerp(f.L[3], f.L[2], 0.25), 0.5); skull(ctx, q[0], q[1], 0.5, p.light); const q2 = lerp(lerp(f.R[0], f.R[1], 0.5), lerp(f.R[3], f.R[2], 0.5), 0.5); skull(ctx, q2[0], q2[1], 0.5, p.light); break; }
        case 'royal': lines(ctx, f.L, [0.1, 0.9], p.accent, false, 3); lines(ctx, f.R, [0.1, 0.9], p.accent, false, 3); gem(ctx, ...lerp(lerp(f.L[0], f.L[1], 0.5), lerp(f.L[3], f.L[2], 0.5), 0.5), 5, '#e03a5a'); break;
      }
    },
    dyn(ctx, o, t, v) {
      if (!o.servings) return;
      const n = Math.min(3, Math.ceil(o.servings / 12));
      for (let i = 0; i < n; i++) {
        const q = P(-0.22 + i * 0.22, -0.22 + i * 0.22, 37);
        ZC.drawFood(ctx, o.recipe, q[0], q[1] - 3, 13);
      }
    },
  };

  // ================= drawing + cache =================
  const CACHE = {}, CW = 260, CH = 320, OX = 130, OY = 250, SC = 2;
  function cached(key, fn) {
    let c = CACHE[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = CW * SC; c.height = CH * SC;
      const g = c.getContext('2d'); g.scale(SC, SC); g.translate(OX, OY); fn(g);
      CACHE[key] = c;
    }
    return c;
  }
  ZC.cachedImage = cached;
  ZC.CACHE_BOX = { CW, CH, OX, OY };

  function chairFace(o) { // direction (dx,dy) from the chair to its table
    const t = o && o.id ? ZC.tableFor(o) : null;
    if (!t) return [1, 0];
    return [Math.sign(t.x - o.x), Math.sign(t.y - o.y)];
  }

  // Draws item `type` with its floor-centre at (sx, sy). part: 'all' | 'base' | 'front' (chairs only).
  ZC.drawItem = function (ctx, type, sx, sy, o, t, part = 'all') {
    const it = ZC.ITEMS[type];
    if (!it) return;
    o = o || { id: 0, servings: 0, cook: null };
    t = t || 0;
    let painter, v;
    if (it.cat === 'decor') { painter = ZC.DECOR_PAINT[type]; v = { theme: null, pal: null }; }
    else { painter = PT[it.cat]; const th = THEME[it.theme]; v = { theme: th.id, pal: th.pal }; }
    if (!painter) return;
    ctx.save(); ctx.translate(sx, sy);
    const parts = it.cat === 'chair' ? (part === 'all' ? ['base', 'front'] : [part]) : ['base'];
    if (it.cat === 'chair') v.face = chairFace(o);
    for (const pt of parts) {
      v.part = pt;
      if (painter.static) {
        const key = type + '|' + (it.cat === 'chair' ? v.face.join(',') + '|' + pt : '');
        const img = cached(key, g => painter.static(g, v));
        ctx.drawImage(img, -OX, -OY, CW, CH);
      }
    }
    if (painter.dyn && part !== 'front') painter.dyn(ctx, o, t, v);
    ctx.restore();
  };
  ZC.paintItem = (ctx, type, x, y, o, t) => ZC.drawItem(ctx, type, x, y, o, t);

  // ================= FOOD =================
  ZC.FOOD_COLOR = { sanduiche: '#c9a063', costela: '#a8482c', caldo: '#5a4a78', ensopado: '#9b6a3a', grogue: '#4f9e35', espeto: '#e89a9a', torta: '#d9a560', sopa_olho: '#6fbf4a', polvo: '#d05538', hamburguer: '#d89a48', pizza: '#e8b050', bolo: '#f0a8c4', banquete: '#b8652c' };
  function plate(ctx, x, y, r) {
    ell(ctx, x, y + r * 0.1, r, r * 0.5, '#f1ead8', Math.max(1.6, r * 0.14));
    ell(ctx, x, y + r * 0.05, r * 0.72, r * 0.36, '#dcd3bc', 0);
  }
  const FOOD = {
    sanduiche(ctx, x, y, r) {   // two slices of bread with something green and something red sticking out
      ell(ctx, x, y - r * 0.02, r * 0.62, r * 0.3, '#c9a063', Math.max(1.4, r * 0.1));
      ell(ctx, x, y - r * 0.16, r * 0.66, r * 0.2, '#5fb840', 0); ell(ctx, x + r * 0.1, y - r * 0.2, r * 0.56, r * 0.16, '#d0453a', 0);
      ell(ctx, x, y - r * 0.36, r * 0.6, r * 0.3, '#e0b878', Math.max(1.4, r * 0.1));
      ell(ctx, x - r * 0.2, y - r * 0.44, r * 0.08, r * 0.04, '#fff3d0', 0); ell(ctx, x + r * 0.18, y - r * 0.4, r * 0.08, r * 0.04, '#fff3d0', 0);
    },
    costela(ctx, x, y, r) {     // a rack of ribs: dark meat with pale bones across it
      ell(ctx, x, y - r * 0.14, r * 0.72, r * 0.36, '#a8482c', Math.max(1.6, r * 0.11));
      ell(ctx, x - r * 0.1, y - r * 0.24, r * 0.4, r * 0.14, '#cf6a42', 0);
      for (const dx of [-0.42, -0.14, 0.14, 0.42]) stroke2(ctx, [[x + dx * r, y - r * 0.44], [x + dx * r + r * 0.06, y + r * 0.14]], '#f4ecd4', Math.max(1.6, r * 0.1), 1.2);
    },
    caldo(ctx, x, y, r) {       // a dark purple broth with two pale bubbles and a wisp of steam
      ell(ctx, x, y - r * 0.05, r * 0.68, r * 0.35, '#5a4a78', Math.max(1.4, r * 0.1));
      ell(ctx, x - r * 0.2, y - r * 0.1, r * 0.13, r * 0.07, '#9a86c4', 0); ell(ctx, x + r * 0.22, y, r * 0.09, r * 0.05, '#9a86c4', 0);
      stroke2(ctx, [[x, y - r * 0.3], [x + r * 0.12, y - r * 0.5], [x - r * 0.06, y - r * 0.72]], '#e8e2f4', Math.max(1.3, r * 0.08), 1);
    },
    ensopado(ctx, x, y, r) {
      ell(ctx, x, y - r * 0.05, r * 0.66, r * 0.34, '#a0703c', Math.max(1.4, r * 0.1));
      ell(ctx, x - r * 0.15, y - r * 0.08, r * 0.2, r * 0.1, '#c99a60', 0); ell(ctx, x + r * 0.2, y, r * 0.14, r * 0.07, '#7a4a22', 0);
      stroke2(ctx, [[x + r * 0.15, y - r * 0.1], [x + r * 0.5, y - r * 0.5], [x + r * 0.75, y - r * 0.4]], '#e8a0a0', Math.max(1.5, r * 0.1), 1.2);
    },
    grogue(ctx, x, y, r) {
      const w = r * 0.34, top = y - r * 0.95, bot = y - r * 0.02;
      ctx.beginPath(); ctx.roundRect(x - w, top, w * 2, bot - top, r * 0.1);
      ctx.fillStyle = '#5fb840'; ctx.fill(); ctx.lineWidth = Math.max(1.6, r * 0.12); ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - w * 0.6, top + r * 0.2, w * 0.4, (bot - top) * 0.6);
      ell(ctx, x, top, w, r * 0.14, '#b8f58a', Math.max(1.4, r * 0.1));
      ctx.beginPath(); ctx.arc(x + w + r * 0.12, y - r * 0.5, r * 0.2, -1.4, 1.4); ctx.lineWidth = r * 0.14; ctx.strokeStyle = INK; ctx.stroke();
    },
    espeto(ctx, x, y, r) {
      stroke2(ctx, [[x - r * 0.75, y + r * 0.1], [x + r * 0.75, y - r * 0.5]], '#9a6a3a', Math.max(1.5, r * 0.1), 1.2);
      for (let i = 0; i < 3; i++) {
        const px = x - r * 0.4 + i * r * 0.4, py = y + r * 0.02 - i * r * 0.2;
        ctx.save(); ctx.translate(px, py); ctx.rotate(-0.4);
        ctx.beginPath(); ctx.roundRect(-r * 0.2, -r * 0.12, r * 0.4, r * 0.24, r * 0.1); ctx.fillStyle = '#e8a0a0'; ctx.fill(); ctx.lineWidth = Math.max(1.4, r * 0.09); ctx.strokeStyle = INK; ctx.stroke();
        ell(ctx, r * 0.1, 0, r * 0.06, r * 0.05, '#f6e0d0', 0);
        ctx.restore();
      }
    },
    torta(ctx, x, y, r) {
      ell(ctx, x, y - r * 0.05, r * 0.74, r * 0.4, '#d9a560', Math.max(1.5, r * 0.11));
      ell(ctx, x, y - r * 0.1, r * 0.55, r * 0.28, '#e88aa8', 0);
      ctx.strokeStyle = '#c0607e'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.beginPath();
      ctx.arc(x - r * 0.12, y - r * 0.1, r * 0.14, 0, Math.PI * 1.6); ctx.arc(x + r * 0.14, y - r * 0.1, r * 0.14, Math.PI, Math.PI * 2.6); ctx.stroke();
      ctx.fillStyle = '#17121c'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.05); ctx.lineTo(x + r * 0.7, y - r * 0.2); ctx.lineTo(x + r * 0.6, y + r * 0.12); ctx.closePath(); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    },
    sopa_olho(ctx, x, y, r) {
      ell(ctx, x, y - r * 0.05, r * 0.68, r * 0.36, '#6fbf4a', Math.max(1.5, r * 0.11));
      for (const [dx, dy, s] of [[-0.25, -0.1, 0.2], [0.18, -0.02, 0.22], [0.0, -0.3, 0.17]]) {
        ell(ctx, x + dx * r, y + dy * r - r * 0.12, r * s, r * s, '#fffbe8', Math.max(1.2, r * 0.08));
        ell(ctx, x + dx * r, y + dy * r - r * 0.12, r * s * 0.5, r * s * 0.5, '#e0453a', 0); ell(ctx, x + dx * r, y + dy * r - r * 0.12, r * s * 0.22, r * s * 0.22, '#17121c', 0);
      }
    },
    polvo(ctx, x, y, r) {
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.45, sx = x + Math.sin(a) * r * 0.2;
        stroke2(ctx, [[sx, y - r * 0.15], [x + Math.sin(a) * r * 0.5, y + r * 0.1], [x + Math.sin(a) * r * 0.85, y + r * 0.05 - (i % 2) * r * 0.12]], '#d05538', Math.max(2, r * 0.17), 1.4);
      }
      ell(ctx, x, y - r * 0.5, r * 0.4, r * 0.38, '#e0654a', Math.max(1.5, r * 0.11));
      ell(ctx, x - r * 0.14, y - r * 0.5, r * 0.08, r * 0.1, '#fff', 0); ell(ctx, x + r * 0.14, y - r * 0.5, r * 0.08, r * 0.1, '#fff', 0);
      ell(ctx, x - r * 0.12, y - r * 0.48, r * 0.035, r * 0.05, INK, 0); ell(ctx, x + r * 0.16, y - r * 0.48, r * 0.035, r * 0.05, INK, 0);
    },
    hamburguer(ctx, x, y, r) {
      const w = r * 0.58;
      ell(ctx, x, y - r * 0.02, w, r * 0.22, '#d89a48', Math.max(1.5, r * 0.1));
      ell(ctx, x, y - r * 0.16, w * 0.95, r * 0.16, '#5a3320', Math.max(1.4, r * 0.09));
      ell(ctx, x, y - r * 0.27, w * 1.02, r * 0.14, '#7ad04a', Math.max(1.4, r * 0.09));
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.38, w, r * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#e8aa58'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#f6e6b0'; for (const dx of [-0.25, 0, 0.25]) ell(ctx, x + dx * r, y - r * 0.55 + Math.abs(dx) * r * 0.3, r * 0.04, r * 0.025, '#f6e6b0', 0);
    },
    pizza(ctx, x, y, r) {
      ell(ctx, x, y - r * 0.02, r * 0.86, r * 0.46, '#e8b050', Math.max(1.5, r * 0.11));
      ell(ctx, x, y - r * 0.04, r * 0.7, r * 0.36, '#e05a3a', 0); ell(ctx, x, y - r * 0.05, r * 0.62, r * 0.32, '#f4d070', 0);
      for (const [dx, dy] of [[-0.3, 0], [0.2, -0.08], [0.0, 0.1], [0.38, 0.08], [-0.1, -0.15]]) ell(ctx, x + dx * r, y + dy * r * 0.9, r * 0.1, r * 0.06, '#b83a30', 0);
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.moveTo(x, y - r * 0.04); ctx.lineTo(x + r * 0.84, y + r * 0.1); ctx.moveTo(x, y - r * 0.04); ctx.lineTo(x + r * 0.5, y + r * 0.36); ctx.stroke();
    },
    bolo(ctx, x, y, r) {
      const w = r * 0.5, top = y - r * 0.55;
      ctx.beginPath(); ctx.moveTo(x - w, top); ctx.lineTo(x - w, y - r * 0.05); ctx.ellipse(x, y - r * 0.05, w, r * 0.22, 0, Math.PI, 0, true); ctx.lineTo(x + w, top); ctx.closePath();
      ctx.fillStyle = '#e88aa8'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#fdf0f4'; ctx.beginPath(); ctx.ellipse(x, top, w, r * 0.22, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ell(ctx, x - r * 0.12, top - r * 0.03, r * 0.17, r * 0.09, '#f2a0b8', 0); ell(ctx, x + r * 0.14, top - r * 0.02, r * 0.16, r * 0.09, '#f2a0b8', 0);
      for (const dx of [-0.25, 0.25]) { stroke2(ctx, [[x + dx * r, top], [x + dx * r, top - r * 0.3]], '#f6e07a', Math.max(1.5, r * 0.08), 1); ell(ctx, x + dx * r, top - r * 0.38, r * 0.05, r * 0.08, '#ff9a2a', 0); }
    },
    banquete(ctx, x, y, r) {
      stroke2(ctx, [[x - r * 0.55, y - r * 0.18], [x - r * 0.9, y - r * 0.3]], '#f4ecd4', Math.max(2.2, r * 0.14), 1.4);
      ell(ctx, x - r * 0.95, y - r * 0.34, r * 0.1, r * 0.1, '#f4ecd4', Math.max(1.2, r * 0.08));
      ell(ctx, x, y - r * 0.28, r * 0.66, r * 0.4, '#b8652c', Math.max(1.6, r * 0.11));
      ell(ctx, x - r * 0.15, y - r * 0.38, r * 0.3, r * 0.12, '#dd8a48', 0);
      for (const dx of [-0.7, 0.7, 0.2]) ell(ctx, x + dx * r, y + r * 0.1, r * 0.14, r * 0.07, '#5fb840', 1);
    },
  };
  // rid is a dish key: 'grogue' or 'grogue:fancy'. A coloured bead on the rim of the plate says which variant it is.
  ZC.drawFood = function (ctx, key, x, y, r) {
    const [rid, v] = String(key).split(':');
    plate(ctx, x, y, r);
    (FOOD[rid] || FOOD.ensopado)(ctx, x, y, r);
    if (v && ZC.RVAR[v]) ell(ctx, x + r * 0.78, y - r * 0.12, r * 0.2, r * 0.2, ZC.RVAR[v].color, Math.max(1, r * 0.1));
  };
  ZC.drawDirtyPlate = function (ctx, x, y, r) {
    plate(ctx, x, y, r);
    ctx.fillStyle = '#6a4a2a';
    for (const [dx, dy, s] of [[-0.3, -0.05, 0.12], [0.22, 0.05, 0.1], [0, -0.14, 0.08]]) ell(ctx, x + dx * r, y + dy * r, r * s, r * s * 0.6, '#6a4a2a', 0);
    stroke2(ctx, [[x - r * 0.25, y + r * 0.12], [x + r * 0.25, y - r * 0.12]], '#f4ecd4', Math.max(1.6, r * 0.1), 1);
  };
  ZC.foodThumb = function (rid, size = 64) {
    const cv = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + 'px';
    const g = cv.getContext('2d'); g.scale(d, d);
    ZC.drawFood(g, rid, size / 2, size * 0.62, size * 0.38);
    return cv;
  };
})();
