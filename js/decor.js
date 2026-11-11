// Decorations, painted in the same isometric style.
(() => {
  const ZC = window.ZC;
  const { P, A, B, TAU, INK, lerp, poly, ell, stroke2, shadow, box, cyl, lines, speck, planks, hoop, clipEll, skull, bone, gem, glowDot, bc, mix, lite, dark, rng } = ZC.prim;
  const D = ZC.DECOR_PAINT = {};
  const WOOD = '#a8683a', STONE = '#8a8f9c', BONE = '#e2d4b2', GOLD = '#ffd84a', PURPLE = '#7a3aa8';
  const stoneBox = { top: '#b5bac6', left: STONE, right: '#5a5f6e' };

  D.barrel = { static(ctx) {
    shadow(ctx, 34, 17);
    const g = cyl(ctx, 0, 0, 0.3, 0, 40, { side: '#9a5d34', top: '#c98a52' });
    clipEll(ctx, g, 40, () => planks(ctx, -.5, -.5, .5, .5, 40, '#8a4f2b', 5));
    hoop(ctx, g, 8, '#3a3640'); hoop(ctx, g, 30, '#3a3640');
    ctx.fillStyle = '#e8d9b5'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('XXX', g.cx, g.cy - 14);
    ell(ctx, g.cx, g.cy - 40, g.rx, g.ry, null, 3);
  } };

  D.crate = { static(ctx) {
    shadow(ctx, 38, 19);
    const f = box(ctx, -0.32, -0.32, 0.32, 0.32, 0, 30, bc('#b98550'));
    lines(ctx, f.L, [0.5], '#6b3d22', false, 2.5); lines(ctx, f.R, [0.5], '#4a2a16', false, 2.5);
    lines(ctx, f.L, [0.12, 0.88], '#6b3d22', true, 3); lines(ctx, f.R, [0.12, 0.88], '#4a2a16', true, 3);
    planks(ctx, -.32, -.32, .32, .32, 30, '#8a5a30', 4);
    box(ctx, -0.12, -0.12, 0.14, 0.14, 30, 38, bc('#8a5a30'), 2.5);
  } };

  D.plant = {
    static(ctx) {
      shadow(ctx, 28, 14);
      cyl(ctx, 0, 0, 0.19, 0, 20, { side: '#b2563a', top: '#4a3020' });
    },
    dyn(ctx, o, t) {
      const sway = Math.sin(t * 2 + (o.id || 0)) * 4, b = P(0, 0, 20), h = [b[0] + sway, b[1] - 46];
      stroke2(ctx, [b, [b[0] - 8, b[1] - 24], h], '#4c8d32', 4, 2.5);
      ell(ctx, b[0] - 13, b[1] - 16, 9, 4.5, '#5fae3c', 2.5); ell(ctx, b[0] + 13, b[1] - 20, 9, 4.5, '#5fae3c', 2.5);
      ell(ctx, h[0], h[1], 16, 13, '#6cc142', 3);
      ctx.fillStyle = '#c23a3a'; ctx.beginPath(); ctx.ellipse(h[0] + 3, h[1] + 3, 11, 4 + Math.abs(Math.sin(t * 3)) * 3, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(h[0] + 3 + i * 4 - 2, h[1] - 1); ctx.lineTo(h[0] + 3 + i * 4, h[1] + 3); ctx.lineTo(h[0] + 3 + i * 4 + 2, h[1] - 1); ctx.fill(); }
      ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(h[0] - 6, h[1] - 9, 2.2, 0, TAU); ctx.arc(h[0] + 7, h[1] - 9, 2.2, 0, TAU); ctx.fill();
    },
  };

  D.lamp = {
    static(ctx) {
      shadow(ctx, 26, 13);
      box(ctx, -0.2, -0.2, 0.2, 0.2, 0, 10, stoneBox);
      const a = P(0, 0, 10), b = P(0, 0, 66); stroke2(ctx, [a, b], '#4a4652', 6, 2.5);
      skull(ctx, b[0], b[1] - 12, 1.15);
    },
    dyn(ctx, o, t) {
      const b = P(0, 0, 66), f = Math.sin(t * 14) * 1.5;
      glowDot(ctx, b[0], b[1] - 12, 62, 'rgba(160,255,120,.4)');
      ctx.fillStyle = '#9dff6a'; ctx.beginPath(); ctx.moveTo(b[0] - 5, b[1] - 24); ctx.quadraticCurveTo(b[0] + f, b[1] - 42, b[0] + 5, b[1] - 24); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    },
  };

  D.chest = { static(ctx) {
    shadow(ctx, 40, 20);
    ctx.fillStyle = GOLD; for (const [u, v, z] of [[-0.12, 0, 34], [0.08, -0.08, 36], [0.14, 0.1, 33]]) { const q = P(u, v, z); ell(ctx, q[0], q[1], 7, 4, GOLD, 2); ell(ctx, q[0] - 1, q[1] - 1, 3, 1.6, '#fff2a0', 0); }
    const f = box(ctx, -0.37, -0.3, 0.37, 0.3, 0, 22, bc('#8a4f2b'));
    const top = box(ctx, -0.37, -0.3, 0.37, 0.3, 22, 30, { top: '#c07a42', left: '#a5643a', right: '#7a4a2a' });
    lines(ctx, f.L, [0.2, 0.8], '#e0b030', true, 4); lines(ctx, top.L, [0.2, 0.8], '#e0b030', true, 4);
    lines(ctx, f.R, [0.5], '#e0b030', true, 4);
    const lk = lerp(lerp(f.L[0], f.L[1], 0.5), lerp(f.L[3], f.L[2], 0.5), 1); ell(ctx, lk[0], lk[1], 4.5, 5, '#e0b030', 2);
    // coins in the front
    for (const [u, v] of [[0.0, 0.0], [-0.2, 0.1]]) { const q = P(u, v, 31); ell(ctx, q[0], q[1], 8, 4, GOLD, 2); }
  } };

  D.pumpkin = { static(ctx) {
    shadow(ctx, 30, 15);
    ell(ctx, 0, -17, 25, 18, '#e8832a', 3); ell(ctx, -10, -17, 14, 17, '#f09a3a', 0); ell(ctx, 10, -17, 14, 17, '#d0701c', 0);
    ctx.strokeStyle = '#a85410'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -35); ctx.quadraticCurveTo(-5, -17, 0, 1); ctx.moveTo(-14, -33); ctx.quadraticCurveTo(-20, -17, -13, -2); ctx.moveTo(14, -33); ctx.quadraticCurveTo(20, -17, 13, -2); ctx.stroke();
    ell(ctx, 0, -2, 25, 6, null, 0);
    stroke2(ctx, [[0, -34], [3, -42]], '#4c8d32', 5, 2);
    ctx.fillStyle = '#ffe24a'; for (const [x, y] of [[-9, -20], [9, -20]]) { ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y - 5); ctx.lineTo(x + 5, y + 4); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-6, -5); ctx.lineTo(-2, -9); ctx.lineTo(2, -5); ctx.lineTo(6, -9); ctx.lineTo(11, -9); ctx.lineTo(8, -2); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  } };

  D.candle = {
    static(ctx) {
      shadow(ctx, 24, 12);
      box(ctx, -0.2, -0.2, 0.2, 0.2, 0, 8, stoneBox);
      const b = P(0, 0, 8);
      skull(ctx, b[0], b[1] - 12, 1.1);
      const c = P(0, 0, 32); // candle on top
      ctx.beginPath(); ctx.roundRect(c[0] - 4, c[1] - 14, 8, 14, 2); ctx.fillStyle = '#f6efe0'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#f6efe0'; ctx.beginPath(); ctx.arc(c[0] + 4, c[1] - 6, 2, 0, TAU); ctx.fill();
    },
    dyn(ctx, o, t) { const c = P(0, 0, 32), f = Math.sin(t * 13) * 1.2; glowDot(ctx, c[0], c[1] - 22, 28, 'rgba(255,220,120,.45)'); ctx.fillStyle = '#ffb83a'; ctx.beginPath(); ctx.moveTo(c[0] - 3.5, c[1] - 14); ctx.quadraticCurveTo(c[0] + f, c[1] - 30, c[0] + 3.5, c[1] - 14); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); },
  };

  D.flowers = { static(ctx) {
    shadow(ctx, 24, 12);
    const g = cyl(ctx, 0, 0, 0.15, 0, 22, { side: '#7a4aa8', top: '#3a2a20' });
    hoop(ctx, g, 16, '#d6b0f0');
    const b = P(0, 0, 22);
    for (const [dx, dy, c] of [[-14, -34, '#c24a6a'], [3, -42, '#e0a030'], [15, -30, '#9a4ac2']]) {
      stroke2(ctx, [b, [b[0] + dx * 0.4, b[1] - 24], [b[0] + dx, b[1] + dy + 20]], '#4c7a32', 3, 2);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ell(ctx, b[0] + dx + Math.cos(a) * 5, b[1] + dy + 20 + Math.sin(a) * 4 + 5, 4, 3.2, c, 1.6); }
      ell(ctx, b[0] + dx, b[1] + dy + 25, 3, 2.6, '#6a4a2a', 1.5);
    }
  } };

  D.tomb = { static(ctx) {
    shadow(ctx, 34, 17);
    ell(ctx, 0, -2, 30, 13, '#5a4030', 2.5); speck(ctx, [[-30, -10], [30, -10], [30, 8], [-30, 8]], 2, 0, '#000');
    const f = box(ctx, -0.27, -0.09, 0.27, 0.09, 4, 46, stoneBox);
    const top = P(0, 0, 46); ctx.beginPath(); ctx.ellipse(top[0], top[1] + 4, 0, 0, 0, 0, 0);
    speck(ctx, f.L, 3, 10, dark(STONE, 0.3)); speck(ctx, f.R, 4, 8, '#3a3f4e');
    const c = lerp(lerp(f.L[0], f.L[1], 0.5), lerp(f.L[3], f.L[2], 0.5), 0.5);
    stroke2(ctx, [[c[0], c[1] - 14], [c[0], c[1] + 10]], '#3a3f4e', 4, 1); stroke2(ctx, [[c[0] - 8, c[1] - 6], [c[0] + 8, c[1] - 6]], '#3a3f4e', 4, 1);
    ctx.fillStyle = '#5a8f3a'; ctx.beginPath(); ctx.ellipse(c[0] - 18, c[1] + 16, 10, 4, 0, 0, TAU); ctx.fill();
  } };

  const rug = (base, edge, fx) => ({ static(ctx) {
    const pts = [P(-0.46, -0.46), P(0.46, -0.46), P(0.46, 0.46), P(-0.46, 0.46)];
    poly(ctx, pts, edge, 2.5);
    poly(ctx, [P(-0.38, -0.38), P(0.38, -0.38), P(0.38, 0.38), P(-0.38, 0.38)], base, 0);
    fx(ctx);
  } });
  D.rug_red = rug('#a02a3a', '#ffd84a', ctx => {
    poly(ctx, [P(-0.24, -0.24), P(0.24, -0.24), P(0.24, 0.24), P(-0.24, 0.24)], '#7a1a2a', 0);
    gem(ctx, 0, 0, 7, '#ffd84a');
    for (const [u, v] of [[-0.33, -0.33], [0.33, -0.33], [0.33, 0.33], [-0.33, 0.33]]) { const q = P(u, v); ell(ctx, q[0], q[1], 3, 1.6, '#ffd84a', 0); }
  });
  D.rug_green = rug('#3e6a2a', '#1f3a18', ctx => {
    for (const [u, v, r] of [[-0.2, -0.1, 9], [0.15, 0.2, 7], [0.22, -0.2, 6], [-0.1, 0.25, 5]]) { const q = P(u, v); ell(ctx, q[0], q[1], r, r * 0.5, '#6aa046', 0); }
    ell(ctx, ...P(0, 0), 5, 2.5, '#d6ff7a', 0);
  });

  D.skeleton = { static(ctx) {
    shadow(ctx, 34, 17);
    const f = box(ctx, -0.3, -0.3, 0.3, 0.3, 0, 16, bc('#b98550')); lines(ctx, f.L, [0.5], '#6b3d22', false, 2); lines(ctx, f.R, [0.5], '#4a2a16', false, 2);
    const b = P(0, 0, 16);
    const hip = [b[0], b[1] - 4];
    box(ctx, -0.12, -0.12, 0.12, 0.12, 16, 22, { top: BONE, left: BONE, right: dark(BONE, 0.2) }, 2.5);
    stroke2(ctx, [[hip[0], hip[1] - 6], [hip[0], hip[1] - 36]], BONE, 6, 2);
    for (const y of [-14, -22, -30]) stroke2(ctx, [[hip[0] - 12, hip[1] + y], [hip[0] + 12, hip[1] + y]], BONE, 4, 1.6);
    stroke2(ctx, [[hip[0] + 8, hip[1] - 30], [hip[0] + 22, hip[1] - 14], [hip[0] + 16, hip[1]]], BONE, 4, 1.6);
    stroke2(ctx, [[hip[0] - 8, hip[1] - 30], [hip[0] - 20, hip[1] - 12], [hip[0] - 12, hip[1] + 2]], BONE, 4, 1.6);
    stroke2(ctx, [[hip[0] + 4, hip[1] - 4], [hip[0] + 22, hip[1] + 2], [hip[0] + 22, hip[1] + 18]], BONE, 5, 1.8);
    skull(ctx, hip[0], hip[1] - 48, 1.05);
    ctx.fillStyle = '#b02a2a'; ctx.beginPath(); ctx.moveTo(hip[0] - 10, hip[1] - 56); ctx.quadraticCurveTo(hip[0], hip[1] - 66, hip[0] + 10, hip[1] - 56); ctx.lineTo(hip[0] + 12, hip[1] - 52); ctx.lineTo(hip[0] - 12, hip[1] - 52); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  } };

  D.potion = {
    static(ctx) {
      shadow(ctx, 40, 20);
      for (const [u, v] of [[-0.2, 0.2], [0.2, 0.2], [0, -0.2]]) { const a = P(u, v, 0), b = P(u, v, 8); stroke2(ctx, [a, b], '#25222b', 5, 2); }
      const g = cyl(ctx, 0, 0, 0.32, 6, 30, { side: '#2e2a34', top: '#1a1820' });
      hoop(ctx, g, 20, '#4a4652');
      ctx.fillStyle = '#7fe04f'; ctx.beginPath(); ctx.ellipse(g.cx, g.cy - 30, g.rx - 5, g.ry - 3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(g.cx, g.cy - 30, g.rx, g.ry, 0, 0, TAU); ctx.stroke();
    },
    dyn(ctx, o, t) {
      const c = P(0, 0, 30);
      glowDot(ctx, c[0], c[1] - 6, 40, 'rgba(127,224,79,.35)');
      for (let i = 0; i < 4; i++) { const q = (t * 0.8 + i * 0.25) % 1; ctx.globalAlpha = 1 - q; ell(ctx, c[0] - 12 + i * 8, c[1] - q * 26, 2.5 + (i % 2) * 2, 2.5 + (i % 2) * 2, '#b8f58a', 1.5); ctx.globalAlpha = 1; }
    },
  };

  D.anchor = { static(ctx) {
    shadow(ctx, 34, 17);
    box(ctx, -0.25, -0.12, 0.25, 0.12, 0, 8, { top: '#8a5a30', left: '#6b3d22', right: '#4a2a16' });
    const s = '#5a6270', b = P(0, 0, 8);
    const stem = [[b[0], b[1] - 4], [b[0], b[1] - 70]];
    stroke2(ctx, stem, s, 8, 3);
    stroke2(ctx, [[b[0] - 18, b[1] - 56], [b[0] + 18, b[1] - 56]], s, 7, 3);
    ctx.lineCap = 'round'; for (const [c, w] of [[INK, 13], [s, 7]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(b[0], b[1] - 22, 26, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); }
    ell(ctx, b[0], b[1] - 76, 6, 6, null, 3);
    ctx.strokeStyle = s; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b[0], b[1] - 76, 4.5, 0, TAU); ctx.stroke();
    stroke2(ctx, [[b[0] - 24, b[1] - 6], [b[0] - 30, b[1] + 6]], s, 7, 2.5); stroke2(ctx, [[b[0] + 24, b[1] - 6], [b[0] + 30, b[1] + 6]], s, 7, 2.5);
    ctx.strokeStyle = '#b8935a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b[0] + 18, b[1] - 56); ctx.quadraticCurveTo(b[0] + 30, b[1] - 40, b[0] + 12, b[1] - 20); ctx.stroke();
  } };

  D.candelabra = {
    static(ctx) {
      shadow(ctx, 28, 14);
      cyl(ctx, 0, 0, 0.18, 0, 8, { side: '#c9a02a', top: '#e0b838' });
      const a = P(0, 0, 8), b = P(0, 0, 54); stroke2(ctx, [a, b], '#c9a02a', 6, 2.5);
      for (const dx of [-22, 0, 22]) {
        stroke2(ctx, [[b[0], b[1] + 4], [b[0] + dx * 0.6, b[1] + 8 - (dx ? 0 : 6)], [b[0] + dx, b[1] - 4 - (dx ? 0 : 6)]], '#c9a02a', 4, 2);
        const cy = b[1] - 6 - (dx ? 0 : 6);
        ctx.beginPath(); ctx.roundRect(b[0] + dx - 3.5, cy - 14, 7, 14, 2); ctx.fillStyle = '#f6efe0'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
      }
    },
    dyn(ctx, o, t) {
      const b = P(0, 0, 54);
      for (const [i, dx] of [-22, 0, 22].entries()) {
        const cy = b[1] - 6 - (dx ? 0 : 6) - 14, f = Math.sin(t * 13 + i) * 1.2;
        glowDot(ctx, b[0] + dx, cy - 8, 24, 'rgba(160,255,120,.4)');
        ctx.fillStyle = '#9dff6a'; ctx.beginPath(); ctx.moveTo(b[0] + dx - 3.5, cy); ctx.quadraticCurveTo(b[0] + dx + f, cy - 17, b[0] + dx + 3.5, cy); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      }
    },
  };

  D.flag = {
    static(ctx) {
      shadow(ctx, 28, 14);
      box(ctx, -0.2, -0.2, 0.2, 0.2, 0, 10, stoneBox);
      const a = P(0, 0, 10), b = P(0, 0, 134); stroke2(ctx, [a, b], '#8a5a30', 6, 2.5);
      ell(ctx, b[0], b[1] - 4, 5, 5, GOLD, 2.5);
    },
    dyn(ctx, o, t) {
      const b = P(0, 0, 130), w = (x) => Math.sin(t * 4 + x * 0.12) * 4;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]);
      for (let x = 0; x <= 56; x += 8) ctx.lineTo(b[0] + 3 + x, b[1] + w(x) + x * 0.04);
      for (let x = 56; x >= 0; x -= 8) ctx.lineTo(b[0] + 3 + x, b[1] + 38 + w(x) + x * 0.04);
      ctx.closePath(); ctx.fillStyle = '#17121c'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      skull(ctx, b[0] + 30, b[1] + 17 + w(30) * 0.6, 0.9, '#f4ecd4');
    },
  };

  D.deadtree = { static(ctx) {
    shadow(ctx, 34, 17);
    const b = P(0, 0, 0), br = '#4a3626';
    stroke2(ctx, [[b[0] - 4, b[1] + 2], [b[0] - 2, b[1] - 40], [b[0] + 4, b[1] - 80]], br, 12, 3);
    for (const [pts] of [[[[b[0] - 2, b[1] - 42], [b[0] - 22, b[1] - 60], [b[0] - 34, b[1] - 92]]], [[[b[0] + 2, b[1] - 55], [b[0] + 26, b[1] - 70], [b[0] + 38, b[1] - 104]]], [[[b[0] + 4, b[1] - 80], [b[0] - 8, b[1] - 102], [b[0] - 4, b[1] - 124]]], [[[b[0] + 5, b[1] - 82], [b[0] + 16, b[1] - 106], [b[0] + 12, b[1] - 120]]]]) stroke2(ctx, pts, br, 6, 2.5);
    stroke2(ctx, [[b[0] - 22, b[1] - 60], [b[0] - 38, b[1] - 62]], br, 4, 2); stroke2(ctx, [[b[0] + 26, b[1] - 70], [b[0] + 42, b[1] - 66]], br, 4, 2);
    ell(ctx, b[0] - 3, b[1] - 20, 3, 5, '#17121c', 0);
  } };

  D.statue = { static(ctx) {
    shadow(ctx, 36, 18);
    const pd = box(ctx, -0.3, -0.3, 0.3, 0.3, 0, 16, stoneBox); speck(ctx, pd.L, 1, 10, '#4a4f5e'); speck(ctx, pd.R, 2, 10, '#3a3f4e');
    const b = P(0, 0, 16), c = '#9aa0ae';
    stroke2(ctx, [[b[0] - 6, b[1] - 2], [b[0] - 6, b[1] - 22]], c, 9, 2.5); stroke2(ctx, [[b[0] + 6, b[1] - 2], [b[0] + 6, b[1] - 22]], c, 9, 2.5);
    poly(ctx, [[b[0] - 14, b[1] - 20], [b[0] + 14, b[1] - 20], [b[0] + 11, b[1] - 52], [b[0] - 11, b[1] - 52]], c, 3);
    stroke2(ctx, [[b[0] - 10, b[1] - 48], [b[0] - 24, b[1] - 50], [b[0] - 34, b[1] - 50]], c, 7, 2.5); stroke2(ctx, [[b[0] + 10, b[1] - 48], [b[0] + 24, b[1] - 52], [b[0] + 34, b[1] - 50]], c, 7, 2.5);
    ell(ctx, b[0], b[1] - 62, 12, 11, c, 3);
    ctx.fillStyle = '#17121c'; ctx.fillRect(b[0] - 7, b[1] - 64, 4, 4); ctx.fillRect(b[0] + 3, b[1] - 64, 4, 4); ctx.fillRect(b[0] - 3, b[1] - 56, 6, 2);
    ctx.fillStyle = '#5a8f3a'; ctx.beginPath(); ctx.ellipse(b[0] + 8, b[1] - 38, 6, 3.5, 0, 0, TAU); ctx.ellipse(b[0] - 10, b[1] - 26, 5, 3, 0, 0, TAU); ctx.fill();
  } };

  D.painting = { static(ctx) {
    shadow(ctx, 30, 15);
    const l1 = P(-0.22, 0.05, 0), l2 = P(0.22, 0.05, 0), top = P(0, 0, 100);
    stroke2(ctx, [l1, [top[0] - 6, top[1] + 34]], '#6b3d22', 5, 2.5); stroke2(ctx, [l2, [top[0] + 6, top[1] + 34]], '#6b3d22', 5, 2.5);
    stroke2(ctx, [P(0, -0.2, 0), [top[0], top[1] + 34]], '#6b3d22', 5, 2.5);
    const f = box(ctx, -0.32, -0.04, 0.32, 0.04, 28, 100, bc('#c9a02a'));
    const c = lerp(lerp(f.L[0], f.L[1], 0.5), lerp(f.L[3], f.L[2], 0.5), 0.5);
    poly(ctx, [[c[0] - 22, c[1] - 24 - 11], [c[0] + 22, c[1] - 24 + 11], [c[0] + 22, c[1] + 24 + 11], [c[0] - 22, c[1] + 24 - 11]].map(([x, y]) => [x * 0.92, y * 0.92 + c[1] * 0.08]), '#1f3a3a', 2);
    ell(ctx, c[0], c[1] - 6, 12, 14, '#c9ffd0', 2); ctx.fillStyle = '#17121c'; ctx.beginPath(); ctx.ellipse(c[0] - 4, c[1] - 9, 2.4, 3.6, 0, 0, TAU); ctx.ellipse(c[0] + 4, c[1] - 7, 2.4, 3.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(c[0], c[1] + 1, 3, 2, 0, 0, TAU); ctx.fill();
  } };

  D.bookshelf = { static(ctx) {
    shadow(ctx, 44, 22);
    const f = box(ctx, -0.42, -0.2, 0.42, 0.2, 0, 118, bc('#7a4a2a'));
    const r = rng(7), cols = ['#a02a3a', '#2a6aa0', '#3e8a3a', '#c9a02a', '#7a3aa8', '#d06a2a', '#e8d9b5'];
    for (const zr of [[12, 34], [44, 66], [76, 98]]) {
      poly(ctx, [P(-0.38, 0.2, zr[0]), P(0.38, 0.2, zr[0]), P(0.38, 0.2, zr[1] + 4), P(-0.38, 0.2, zr[1] + 4)], '#2a1a12', 0);
      let u = -0.37;
      while (u < 0.34) {
        const w = 0.05 + r() * 0.04, h = zr[1] - zr[0] - 4 - r() * 8, col = cols[Math.floor(r() * cols.length)];
        poly(ctx, [P(u, 0.2, zr[0]), P(u + w, 0.2, zr[0]), P(u + w, 0.2, zr[0] + h), P(u, 0.2, zr[0] + h)], col, 1.8);
        u += w + 0.005;
      }
    }
    lines(ctx, f.L, [0.1, 0.37, 0.64, 0.92], '#4a2a16', false, 3); lines(ctx, f.R, [0.5], '#4a2a16', false, 2);
  } };

  D.wheel = { static(ctx) {
    shadow(ctx, 30, 15);
    box(ctx, -0.18, -0.18, 0.18, 0.18, 0, 12, { top: '#8a5a30', left: '#6b3d22', right: '#4a2a16' });
    const c = P(0, 0, 62), br = '#8a5a30';
    stroke2(ctx, [P(0, 0, 12), [c[0], c[1] + 4]], '#6b3d22', 8, 2.5);
    ctx.lineCap = 'round';
    for (const [col, w] of [[INK, 14], [br, 8]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(c[0], c[1], 28, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; stroke2(ctx, [[c[0], c[1]], [c[0] + Math.cos(a) * 40, c[1] + Math.sin(a) * 40]], br, 5, 2); }
    ell(ctx, c[0], c[1], 8, 8, '#c9a02a', 2.5);
  } };

  D.alchemy = {
    static(ctx) {
      shadow(ctx, 44, 22);
      const f = box(ctx, -0.4, -0.3, 0.4, 0.3, 0, 30, bc('#7a4a2a')); lines(ctx, f.L, [0.5], '#4a2a16', true); lines(ctx, f.R, [0.5], '#4a2a16', true); planks(ctx, -.4, -.3, .4, .3, 30, '#a8683a', 3);
      const fl = (u, v, col, h, r) => { const g = cyl(ctx, u, v, r, 30, 30 + h, { side: col, top: lite(col, 0.5) }); return g; };
      fl(-0.22, -0.05, '#d04a8a', 14, 0.1); fl(0.0, 0.1, '#4ab0e0', 10, 0.09);
      const g = cyl(ctx, 0.24, -0.08, 0.1, 30, 40, { side: '#8ae04a', top: '#c8ff9a' });
      const b = P(-0.18, 0.18, 32); poly(ctx, [[b[0] - 8, b[1]], [b[0] + 8, b[1] - 3], [b[0] + 8, b[1] - 8], [b[0] - 8, b[1] - 5]], '#a02a3a', 2);
      void g;
    },
    dyn(ctx, o, t) { const c = P(0.24, -0.08, 40); for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i * 0.33) % 1; ctx.globalAlpha = 1 - q; ell(ctx, c[0] - 4 + i * 4, c[1] - 6 - q * 22, 2.5, 2.5, '#d8ffb0', 1.5); ctx.globalAlpha = 1; } },
  };

  D.globe = { static(ctx) {
    shadow(ctx, 28, 14);
    cyl(ctx, 0, 0, 0.16, 0, 6, { side: '#6b3d22', top: '#8a5a30' });
    const a = P(0, 0, 6), c = P(0, 0, 54);
    stroke2(ctx, [a, [c[0], c[1] + 22]], '#6b3d22', 5, 2);
    ctx.beginPath(); ctx.arc(c[0], c[1], 22, 0, TAU); ctx.fillStyle = '#3a8ac0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(c[0], c[1], 21, 0, TAU); ctx.clip();
    ctx.fillStyle = '#5fb840'; ctx.beginPath(); ctx.ellipse(c[0] - 6, c[1] - 6, 9, 7, 0.4, 0, TAU); ctx.ellipse(c[0] + 8, c[1] + 6, 7, 9, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(c[0] - 8, c[1] - 9, 7, 4, -0.6, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#c9a02a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c[0], c[1], 26, -2.2, 0.9); ctx.stroke();
  } };

  D.gramophone = {
    static(ctx) {
      shadow(ctx, 36, 18);
      const f = box(ctx, -0.28, -0.28, 0.28, 0.28, 0, 30, bc('#8a5a30')); lines(ctx, f.L, [0.5], '#4a2a16', true); lines(ctx, f.R, [0.5], '#4a2a16', true);
      const c = P(0, 0, 30); ell(ctx, c[0], c[1], 20, 10, '#25222b', 2.5); ell(ctx, c[0], c[1], 6, 3, '#c9a02a', 1.5);
      stroke2(ctx, [[c[0] + 14, c[1] - 2], [c[0] + 4, c[1] - 6]], '#c9a02a', 3, 1.5);
      const h = [c[0] - 4, c[1] - 6];
      stroke2(ctx, [h, [h[0] - 2, h[1] - 24]], '#c9a02a', 5, 2);
      poly(ctx, [[h[0] - 4, h[1] - 24], [h[0] - 32, h[1] - 46], [h[0] - 12, h[1] - 56], [h[0] + 14, h[1] - 40]], '#e0b838', 3);
      ell(ctx, h[0] - 14, h[1] - 48, 11, 8, '#a8851e', 0);
    },
    dyn(ctx, o, t) { const c = P(0, 0, 30); for (let i = 0; i < 2; i++) { const q = (t * 0.5 + i * 0.5) % 1; ctx.globalAlpha = 1 - q; ZC.drawIcon(ctx, 'note', c[0] - 30 - i * 8, c[1] - 66 - q * 30, 22); ctx.globalAlpha = 1; } },
  };

  D.coffin = { static(ctx) {
    shadow(ctx, 34, 17);
    const c = '#4a2f2a';
    const pts = [P(-0.18, 0.2, 0), P(0.18, 0.2, 0), P(0.28, 0.2, 80), P(0.18, 0.2, 116), P(-0.18, 0.2, 116), P(-0.28, 0.2, 80)];
    const side = [P(0.18, 0.2, 0), P(0.18, -0.2, 0), P(0.28, -0.2, 80), P(0.18, -0.2, 116), P(0.18, 0.2, 116), P(0.28, 0.2, 80)];
    poly(ctx, side, dark(c, 0.3), 3); poly(ctx, pts, c, 3);
    const lid = [P(-0.12, 0.2, 8), P(0.12, 0.2, 8), P(0.2, 0.2, 80), P(0.12, 0.2, 108), P(-0.12, 0.2, 108), P(-0.2, 0.2, 80)];
    poly(ctx, lid, '#6a4038', 2.5);
    const m = P(0, 0.2, 80); stroke2(ctx, [[m[0], m[1] - 20], [m[0], m[1] + 16]], GOLD, 4, 1.5); stroke2(ctx, [[m[0] - 9, m[1] - 8], [m[0] + 9, m[1] - 8]], GOLD, 4, 1.5);
    for (const z of [30, 62]) { const q = P(-0.2, 0.2, z); ell(ctx, q[0] + 2, q[1], 3, 3, GOLD, 1.5); }
  } };

  D.tank = {
    static(ctx) {
      shadow(ctx, 40, 20);
      box(ctx, -0.36, -0.36, 0.36, 0.36, 0, 8, { top: '#4a4652', left: '#3a3640', right: '#25222b' });
      const f = box(ctx, -0.33, -0.33, 0.33, 0.33, 8, 78, { top: 'rgba(158,255,200,.35)', left: 'rgba(100,230,170,.45)', right: 'rgba(60,170,130,.55)' }, 3);
      lines(ctx, f.L, [0.5], 'rgba(255,255,255,.25)', true, 3);
      box(ctx, -0.36, -0.36, 0.36, 0.36, 78, 86, { top: '#4a4652', left: '#3a3640', right: '#25222b' });
      ctx.fillStyle = 'rgba(255,255,255,.35)'; const q = lerp(f.L[0], f.L[3], 0.7); ctx.beginPath(); ctx.ellipse(q[0] + 14, q[1], 4, 18, 0, 0, TAU); ctx.fill();
    },
    dyn(ctx, o, t) {
      const c = P(0, 0.2, 44), by = Math.sin(t * 1.6) * 5;
      ell(ctx, c[0] - 6, c[1] + by, 8, 8, '#fffbe8', 2); ell(ctx, c[0] - 6, c[1] + by, 4, 4, '#e0453a', 0); ell(ctx, c[0] - 6, c[1] + by, 1.8, 1.8, INK, 0);
      stroke2(ctx, [[c[0] - 6, c[1] + by + 7], [c[0] - 3, c[1] + by + 16], [c[0] - 8, c[1] + by + 22]], '#e07a9a', 3, 1.4);
      for (let i = 0; i < 4; i++) { const q = (t * 0.45 + i * 0.25) % 1; ctx.globalAlpha = 1 - q; ell(ctx, c[0] + 10 + (i % 2) * 6, c[1] + 24 - q * 50, 2.4, 2.4, 'rgba(255,255,255,.7)', 1); ctx.globalAlpha = 1; }
    },
  };

  D.cannon = { static(ctx) {
    shadow(ctx, 44, 22);
    for (const [u, v] of [[-0.12, -0.3], [0.1, 0.3]]) { const c = P(u, v, 12); ell(ctx, c[0], c[1], 14, 14, '#8a5a30', 3); ell(ctx, c[0], c[1], 4, 4, '#3a3640', 2); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; stroke2(ctx, [[c[0] - Math.cos(a) * 12, c[1] - Math.sin(a) * 12], [c[0] + Math.cos(a) * 12, c[1] + Math.sin(a) * 12]], '#6b3d22', 2, 1); } }
    box(ctx, -0.3, -0.16, 0.18, 0.16, 12, 20, bc('#6b3d22'));
    const f = box(ctx, -0.32, -0.12, 0.4, 0.12, 20, 38, bc('#4a4f5e'));
    lines(ctx, f.L, [0.2, 0.8], '#25222b', true, 3);
    const m = P(0.4, 0, 29); ell(ctx, m[0], m[1], 5, 8, '#17121c', 2);
    for (const [u, v] of [[0.3, 0.38], [0.4, 0.46], [0.22, 0.46]]) { const q = P(u, v, 6); ell(ctx, q[0], q[1], 7, 7, '#3a3f4e', 2); ell(ctx, q[0] - 2, q[1] - 2, 2, 2, '#7a8090', 0); }
  } };

  D.armchair = { static(ctx) {
    shadow(ctx, 44, 22);
    box(ctx, -0.36, -0.36, 0.36, -0.2, 8, 66, { top: '#a060d0', left: PURPLE, right: '#4a2070' });
    box(ctx, -0.36, -0.36, -0.2, 0.36, 8, 36, { top: '#a060d0', left: PURPLE, right: '#4a2070' });
    box(ctx, 0.2, -0.36, 0.36, 0.36, 8, 36, { top: '#a060d0', left: PURPLE, right: '#4a2070' });
    const f = box(ctx, -0.2, -0.2, 0.2, 0.36, 8, 26, { top: '#d0508a', left: '#a03a70', right: '#7a2a58' });
    lines(ctx, f.L, [0.2], GOLD, false, 3);
    for (const [u, v] of [[-0.34, 0.34], [0.34, 0.34], [-0.34, -0.34], [0.34, -0.34]]) { const a = P(u, v, 0), b = P(u, v, 9); stroke2(ctx, [a, b], GOLD, 5, 2); }
    gem(ctx, ...P(0.0, -0.2, 58), 5, '#e03a5a'); const c = P(0, -0.2, 66); ell(ctx, c[0], c[1] + 2, 6, 3, GOLD, 2);
  } };

  D.fountain = {
    static(ctx) {
      shadow(ctx, 50, 25);
      const g = cyl(ctx, 0, 0, 0.44, 0, 16, { side: '#8a8f9c', top: '#b5bac6' });
      ell(ctx, g.cx, g.cy - 16, g.rx - 6, g.ry - 3, '#5ac04a', 0);
      cyl(ctx, 0, 0, 0.1, 14, 44, { side: '#8a8f9c' });
      const t = cyl(ctx, 0, 0, 0.25, 40, 48, { side: '#8a8f9c', top: '#b5bac6' });
      ell(ctx, t.cx, t.cy - 48, t.rx - 4, t.ry - 2, '#7ae060', 0);
    },
    dyn(ctx, o, t) {
      const c = P(0, 0, 48);
      ctx.strokeStyle = '#9dff6a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const q = (t * 0.9 + i / 5) % 1, a = (i / 5) * TAU;
        ctx.globalAlpha = 1 - q * 0.6; ctx.beginPath();
        ctx.arc(c[0] + Math.cos(a) * 20 * q, c[1] - 12 + (q * q * 34) - Math.sin(q * Math.PI) * 18 + Math.sin(a) * 6 * q, 3, 0, TAU); ctx.fillStyle = '#b8ff7a'; ctx.fill();
        ctx.globalAlpha = 1;
      }
      stroke2(ctx, [[c[0], c[1] - 2], [c[0], c[1] - 18 - Math.sin(t * 6) * 2]], '#9dff6a', 5, 2);
      const b = P(0, 0, 16); glowDot(ctx, b[0], b[1], 36, 'rgba(120,255,90,.28)');
    },
  };

  // ---------- ground decorations made from the supplied 3D models (see tools/build-props.js) ----------
  const propDecor = (list, shadowRx = 30) => ({ static(ctx) {
    shadow(ctx, shadowRx, shadowRx * 0.5);
    for (const [n, x, y, s, f] of list) ZC.drawProp(ctx, n, x, y, s, !!f);
  } });
  D.cogumelos = propDecor([['shroom8', 16, -2, 1.0], ['shroom4', -16, 2, 1.25, 1], ['shroom2', 2, 10, 1.3]]);
  D.cogumelo_gigante = propDecor([['shroom9', 0, 6, 1.45]], 34);
  D.tronco = propDecor([['log', 0, 12, 0.62]], 44);
  D.toco = propDecor([['stump', 0, 10, 0.85]], 32);
  D.pedra_musgo = propDecor([['rock0', 0, 8, 0.85], ['rock6', 24, 12, 0.7, 1]], 36);
  D.broto = propDecor([['sprout1', -12, 6, 1.2], ['sprout0', 12, 10, 1.3, 1]], 22);
  D.palmeira = propDecor([['palm2', 0, 8, 0.85]], 30);
  D.pinheiro = propDecor([['pine', 0, 8, 0.7]], 34);
})();
