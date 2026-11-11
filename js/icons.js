// Interface icons painted in code (thick dark outline, 3 tones) so the UI never needs emoji.
// ZC.icon(name, px) -> <canvas> element, ZC.iconURL(name) -> data URL, ZC.drawIcon(ctx, name, x, y, size) -> centred on (x, y).
(() => {
  const ZC = window.ZC;
  const INK = '#17121c', TAU = Math.PI * 2, N = 128;   // icons are authored on a 64 x 64 grid
  const P = {};

  const outline = (g, w = 3.5) => { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; };
  const fillStroke = (g, fill, w = 3.5) => { if (fill) { g.fillStyle = fill; g.fill(); } outline(g, w); g.stroke(); };
  const rrect = (g, x, y, w, h, r, fill, lw = 3.5) => { g.beginPath(); g.roundRect(x, y, w, h, r); fillStroke(g, fill, lw); };
  const circ = (g, x, y, r, fill, lw = 3.5) => { g.beginPath(); g.arc(x, y, r, 0, TAU); fillStroke(g, fill, lw); };
  const ell = (g, x, y, rx, ry, fill, lw = 3.5) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); fillStroke(g, fill, lw); };
  const poly = (g, pts, fill, lw = 3.5) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); fillStroke(g, fill, lw); };
  const line2 = (g, pts, col, w, inkExtra = 4) => { // outlined thick stroke
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [c, lw] of [[INK, w + inkExtra], [col, w]]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  };
  const gloss = (g, x, y, r, a0, a1) => { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); };

  // ----- toxin: a round-bottom glass flask with bubbling green liquid, cork and a skull label -----
  P.flask = g => {
    const bulb = () => { g.beginPath(); g.arc(32, 42, 19, 0, TAU); };
    const neck = () => { g.beginPath(); g.rect(25, 12, 14, 18); };
    // union outline: thick ink under, glass over
    g.fillStyle = INK; g.strokeStyle = INK; g.lineWidth = 7; g.lineJoin = 'round';
    bulb(); g.fill(); g.stroke(); neck(); g.fill(); g.stroke();
    g.fillStyle = '#cfe9e4'; bulb(); g.fill(); neck(); g.fill();
    // liquid
    g.save(); bulb(); g.clip();
    const lq = g.createLinearGradient(0, 30, 0, 62); lq.addColorStop(0, '#b8ff7a'); lq.addColorStop(0.45, '#6fd43f'); lq.addColorStop(1, '#2f8a22');
    g.fillStyle = lq; g.fillRect(8, 33, 48, 34);
    g.fillStyle = '#d6ffa6'; g.beginPath(); g.ellipse(32, 33.5, 17, 3.2, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(40, 52, 16, 10, 0, 0, TAU); g.fill();
    g.restore();
    // bubbles
    g.fillStyle = 'rgba(235,255,210,.9)'; outline(g, 1.6);
    for (const [x, y, r] of [[26, 44, 3.2], [37, 50, 2.4], [33, 39, 2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
    // glass highlights + neck lip
    gloss(g, 32, 42, 14, Math.PI * 0.95, Math.PI * 1.35);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(28.5, 15); g.lineTo(28.5, 26); g.stroke();
    rrect(g, 21, 10, 22, 6, 2.5, '#9fd0c8', 3);
    // cork
    rrect(g, 24, 2, 16, 10, 3, '#b9854f', 3.2);
    g.strokeStyle = 'rgba(70,40,20,.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(28, 5); g.lineTo(28, 10); g.moveTo(34, 4); g.lineTo(34, 9); g.stroke();
    // bulb outline again (clean edge over liquid)
    outline(g, 3.5); g.beginPath(); g.arc(32, 42, 19, Math.PI * 0.72, Math.PI * 2.28); g.stroke();
    g.beginPath(); g.moveTo(25, 28); g.lineTo(25, 15); g.moveTo(39, 28); g.lineTo(39, 15); g.stroke();
  };

  P.coin = g => {
    circ(g, 32, 32, 25, '#d9a21c', 4);
    circ(g, 32, 32, 19, '#ffd84a', 3);
    g.strokeStyle = '#b57f10'; g.lineWidth = 2.6; g.beginPath(); g.arc(32, 32, 13, 0.4, TAU - 0.4); g.stroke();
    g.fillStyle = '#fff2a0'; g.beginPath(); g.ellipse(24, 22, 6, 3.4, -0.6, 0, TAU); g.fill();
    // tiny skull in the middle
    g.fillStyle = '#b57f10'; g.beginPath(); g.arc(32, 31, 6.2, 0, TAU); g.fill(); g.fillRect(28.5, 34, 7, 5);
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(29.7, 31, 1.7, 0, TAU); g.arc(34.3, 31, 1.7, 0, TAU); g.fill();
  };

  P.syringe = g => {
    g.save(); g.translate(32, 32); g.rotate(-Math.PI / 4);
    line2(g, [[-26, 0], [-18, 0]], '#7a7f8c', 4, 4);                        // plunger rod
    rrect(g, -30, -9, 6, 18, 2, '#a8adba', 3);                              // thumb rest
    rrect(g, -18, -9, 34, 18, 4, '#d9efe9', 3.5);                           // barrel
    g.fillStyle = '#7fe04f'; g.fillRect(-4, -6, 18, 12);                    // liquid
    g.fillStyle = '#d6ffa6'; g.fillRect(-4, -6, 18, 3);
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); for (const x of [-12, -6, 0, 6, 12]) { g.moveTo(x, -9); g.lineTo(x, -5); } g.stroke();
    rrect(g, 16, -6, 6, 12, 2, '#a8adba', 3);                               // hub
    line2(g, [[22, 0], [31, 0]], '#e8ecf4', 2.4, 3.6);                      // needle
    g.restore();
  };

  P.brain = g => {
    const pink = '#e98ab0', dk = '#c25a86';
    ell(g, 24, 33, 15, 17, pink, 3.5); ell(g, 40, 33, 15, 17, pink, 3.5);
    ell(g, 32, 24, 17, 12, '#f2a4c4', 3);
    g.strokeStyle = dk; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(32, 14); g.quadraticCurveTo(28, 26, 33, 36); g.quadraticCurveTo(36, 44, 31, 50);
    g.moveTo(18, 28); g.quadraticCurveTo(24, 24, 27, 30); g.moveTo(37, 27); g.quadraticCurveTo(44, 23, 48, 30);
    g.moveTo(17, 40); g.quadraticCurveTo(24, 36, 28, 42); g.moveTo(37, 40); g.quadraticCurveTo(43, 37, 49, 42); g.stroke();
    rrect(g, 28, 46, 8, 10, 3, '#d9a0b8', 3);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(21, 24, 5, 3, -0.6, 0, TAU); g.fill();
  };

  P.hammer = g => {
    g.save(); g.translate(32, 32); g.rotate(Math.PI / 4);
    rrect(g, -4.5, -8, 9, 38, 3, '#b9854f', 3.5);
    g.strokeStyle = 'rgba(70,40,20,.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-1, 2); g.lineTo(-1, 24); g.stroke();
    rrect(g, -18, -22, 36, 17, 4, '#9aa0ae', 3.5);
    g.fillStyle = '#d8dce6'; g.fillRect(-15, -20, 30, 4);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-15, -10, 30, 3);
    g.restore();
  };

  P.book = g => {
    rrect(g, 13, 7, 40, 50, 4, '#f1e6c8', 3.5);              // page block
    rrect(g, 10, 6, 38, 50, 5, '#8e2a36', 3.5);              // cover
    g.fillStyle = '#6a1a26'; g.fillRect(14, 8, 6, 46);        // spine shade
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 10); g.lineTo(46, 10); g.stroke();
    circ(g, 33, 28, 9, '#ffd84a', 3);
    g.fillStyle = '#8e2a36'; g.beginPath(); g.arc(33, 27, 4, 0, TAU); g.fill(); g.fillRect(31, 29, 4, 5);
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(31.4, 27, 1.2, 0, TAU); g.arc(34.6, 27, 1.2, 0, TAU); g.fill();
    g.fillStyle = '#ffd84a'; g.fillRect(22, 44, 22, 3.5); g.fillRect(26, 50, 14, 2.5);
  };

  P.scroll = g => {
    rrect(g, 14, 10, 36, 44, 3, '#f1e0b0', 3.5);
    ell(g, 32, 10, 20, 6, '#d9bf86', 3.5); ell(g, 32, 54, 20, 6, '#d9bf86', 3.5);
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath();
    for (const [y, x2] of [[22, 42], [29, 40], [36, 36]]) { g.moveTo(21, y); g.lineTo(x2, y); } g.stroke();
    circ(g, 41, 44, 7, '#c0392b', 3); g.fillStyle = '#f4ecd4'; g.beginPath(); g.arc(41, 43.5, 2.8, 0, TAU); g.fill(); g.fillRect(39.6, 45, 2.8, 3);
  };

  P.menu = g => {
    for (const [y, c] of [[12, '#c98a52'], [26, '#b9854f'], [40, '#a8723f']]) { rrect(g, 8, y, 48, 12, 5, c, 3.5); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(13, y + 2.5, 38, 2.5); }
  };

  const star = (g, fill) => {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27; pts.push([32 + Math.cos(a) * r, 34 + Math.sin(a) * r]); }
    poly(g, pts, fill, 3.5); return pts;
  };
  P.star = g => { const p = star(g, '#ffd84a'); g.fillStyle = '#fff2a0'; g.beginPath(); g.ellipse(27, 24, 5, 3, -0.7, 0, TAU); g.fill(); };
  P.starempty = g => { star(g, '#4a4552'); };
  P.starhalf = g => {
    star(g, '#4a4552');
    g.save(); g.beginPath(); g.rect(0, 0, 32, 64); g.clip();
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27; pts.push([32 + Math.cos(a) * r, 34 + Math.sin(a) * r]); }
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = '#ffd84a'; g.fill(); outline(g, 3.5); g.stroke(); g.restore();
  };

  P.close = g => { line2(g, [[16, 16], [48, 48]], '#e2483a', 8, 5); line2(g, [[48, 16], [16, 48]], '#e2483a', 8, 5); };
  P.check = g => { line2(g, [[14, 34], [27, 47], [50, 18]], '#5fd03a', 9, 5); };
  P.clock = g => {
    circ(g, 32, 32, 24, '#f4ecd4', 4);
    g.strokeStyle = INK; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 17); g.moveTo(32, 32); g.lineTo(43, 38); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(32, 32, 3, 0, TAU); g.fill();
    g.fillStyle = '#c0392b'; for (const [x, y] of [[32, 11], [53, 32], [32, 53], [11, 32]]) { g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); }
  };
  P.lock = g => {
    g.strokeStyle = INK; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.arc(32, 26, 11, Math.PI, 0); g.lineTo(43, 34); g.moveTo(21, 26); g.lineTo(21, 34); g.stroke();
    g.strokeStyle = '#b8bdc9'; g.lineWidth = 6; g.beginPath(); g.arc(32, 26, 11, Math.PI, 0); g.lineTo(43, 34); g.moveTo(21, 26); g.lineTo(21, 34); g.stroke();
    rrect(g, 13, 30, 38, 28, 6, '#e0b840', 3.5);
    g.fillStyle = INK; g.beginPath(); g.arc(32, 42, 4, 0, TAU); g.fill(); g.fillRect(30.4, 42, 3.2, 9);
  };
  P.plate = g => {
    ell(g, 32, 40, 27, 14, '#c9ced9', 3.5); ell(g, 32, 38, 21, 10, '#f4f6fb', 3);
    ell(g, 32, 37, 12, 5.5, '#ffb04a', 2.5);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (const [x, ph] of [[24, 0], [32, 1], [40, 2]]) { g.beginPath(); g.moveTo(x, 24); g.quadraticCurveTo(x - 4, 18, x, 12 + ph); g.quadraticCurveTo(x + 4, 6, x, 2 + ph * 2); g.stroke(); }
  };
  P.bone = g => {
    g.save(); g.translate(32, 32); g.rotate(-Math.PI / 4);
    g.beginPath(); g.rect(-20, -6, 40, 12); fillStroke(g, '#f4ecd4', 3.5);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * 21, sy * 7, 7.5, 0, TAU); fillStroke(g, '#f4ecd4', 3.5); }
    g.fillStyle = '#f4ecd4'; g.fillRect(-19, -4, 38, 8);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(-19, 1, 38, 3);
    g.restore();
  };
  P.skull = g => {
    circ(g, 32, 28, 20, '#f4ecd4', 4); rrect(g, 21, 38, 22, 17, 5, '#f4ecd4', 3.5);
    g.fillStyle = INK; g.beginPath(); g.ellipse(24, 29, 5.5, 6.5, 0, 0, TAU); g.ellipse(40, 29, 5.5, 6.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(32, 35); g.lineTo(29, 41); g.lineTo(35, 41); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); for (const x of [26.5, 32, 37.5]) { g.moveTo(x, 47); g.lineTo(x, 55); } g.stroke();
  };
  P.dots = g => { for (const x of [14, 32, 50]) circ(g, x, 32, 6, '#17121c', 0.1); };
  P.note = g => {
    line2(g, [[40, 12], [40, 44]], '#9dff6a', 5, 4); line2(g, [[40, 12], [52, 22], [50, 32]], '#9dff6a', 5, 4);
    ell(g, 32, 46, 11, 8, '#9dff6a', 3.5);
  };
  P.arrowl = g => { poly(g, [[44, 10], [14, 32], [44, 54]], '#c98a52', 4); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(40, 17); g.lineTo(22, 31); g.lineTo(26, 32); g.lineTo(42, 22); g.fill(); };
  P.arrowr = g => { poly(g, [[20, 10], [50, 32], [20, 54]], '#c98a52', 4); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(24, 17); g.lineTo(42, 31); g.lineTo(38, 32); g.lineTo(22, 22); g.fill(); };
  P.target = g => {
    circ(g, 32, 32, 22, '#f4ecd4', 4); circ(g, 32, 32, 13, '#e2483a', 3.5); circ(g, 32, 32, 5, '#f4ecd4', 3);
    line2(g, [[32, 4], [32, 14]], '#17121c', 3, 0); line2(g, [[32, 50], [32, 60]], '#17121c', 3, 0); line2(g, [[4, 32], [14, 32]], '#17121c', 3, 0); line2(g, [[50, 32], [60, 32]], '#17121c', 3, 0);
  };
  P.x = P.close;

  // ----- cache + public API -----
  const cache = {};
  function sheet(name) {
    if (cache[name]) return cache[name];
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'); g.scale(N / 64, N / 64);
    if (P[name]) P[name](g);
    return (cache[name] = cv);
  }
  ZC.iconURL = name => sheet(name).toDataURL();
  ZC.drawIcon = (ctx, name, x, y, size) => ctx.drawImage(sheet(name), x - size / 2, y - size / 2, size, size);
  ZC.icon = (name, px = 20) => {
    const cv = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1), s = Math.round(px * d);
    cv.width = cv.height = s; cv.className = 'gi'; cv.style.width = cv.style.height = px + 'px';
    cv.getContext('2d').drawImage(sheet(name), 0, 0, s, s);
    return cv;
  };
  ZC.hasIcon = n => !!P[n];

  // CSS currency icons (HUD pills, prices)
  const root = document.documentElement.style;
  root.setProperty('--ic-flask', `url(${ZC.iconURL('flask')})`);
  root.setProperty('--ic-coin', `url(${ZC.iconURL('coin')})`);
})();
