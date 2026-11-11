// Sprite loading, zombie tinting and animated drawing.
(() => {
  const ZC = window.ZC;
  const SPRITES = window.SPRITES;
  const CHARS = window.CHARS || {};      // the animated zombies and chefs (js/chars-manifest.js): sheets of 6 frames x 4 directions
  const CIMG = {};
  const imgs = {};
  const tinted = {};
  const PROP_IMG = {};

  ZC.loadAssets = function (onProgress) {
    const jobs = [];
    // the first characters of the project (assets/sprites) are no longer drawn by the game: set ZC.LOAD_OLD_SPRITES to bring them back
    if (ZC.LOAD_OLD_SPRITES) for (const [c, m] of Object.entries(SPRITES)) for (const a of Object.keys(m.anims)) jobs.push([c, a]);
    const props = Object.keys(ZC.PROPS || {});
    const cjobs = [];
    for (const [c, m] of Object.entries(CHARS)) for (const k of Object.keys(m.sheets)) cjobs.push([c, k]);
    const total = jobs.length + props.length + cjobs.length;
    let done = 0;
    const sprites = jobs.map(([c, a]) => new Promise(res => {
      const im = new Image();
      im.onload = () => { imgs[c + '/' + a] = im; onProgress(++done / total); res(); };
      im.onerror = () => { console.warn('sprite missing', c, a); onProgress(++done / total); res(); };
      im.src = `assets/sprites/${c}/${a}.png`;
    }));
    const propImgs = props.map(n => new Promise(res => {
      const im = new Image();
      im.onload = () => { PROP_IMG[n] = stylizeProp(im); onProgress(++done / total); res(); };
      im.onerror = () => { console.warn('prop missing', n); onProgress(++done / total); res(); };
      im.src = ZC.PROPS[n].src;
    }));
    const chars = cjobs.map(([c, k]) => new Promise(res => {
      const im = new Image();
      im.onload = () => { CIMG[c + '/' + k] = im; onProgress(++done / total); res(); };
      im.onerror = () => { console.warn('character sheet missing', c, k); onProgress(++done / total); res(); };
      im.src = `assets/chars/${c}/${k}.png`;
    }));
    return Promise.all(sprites.concat(propImgs, chars));
  };

  // ---------- animated characters ----------
  // Rows of a sheet: front-left, front-right, back-left, back-right. The grid directions of the game map to them:
  // +x walks to the lower right of the screen (front-right), +y to the lower left (front-left), -x to the upper left, -y to the upper right.
  const DIRROW = { front: 0, right: 1, left: 2, back: 3 }, SIDEROW = { left: 0, right: 1 };
  const CHAR_K = 1.3;            // the new characters are drawn a little bigger than the old ones, for readability
  ZC.isChar = c => !!CHARS[c];
  ZC.charName = c => (CHARS[c] || {}).name;
  const msSum = a => a.reduce((n, v) => n + v, 0);
  function frameAt(sh, t, loop) {
    const total = msSum(sh.ms);
    let ms = Math.max(0, t) * 1000, done = false;
    if (loop) ms %= total; else if (ms >= total) { ms = total - 1; done = true; }
    let f = 0;
    for (let acc = 0; f < sh.ms.length; f++) { acc += sh.ms[f]; if (ms < acc) break; }
    return [Math.min(f, sh.ms.length - 1), done];
  }
  // seconds from the start of an attack to the frame that hits
  ZC.hitTime = c => { const m = CHARS[c]; if (!m) return 0.3; const sh = m.sheets.attack; return msSum(sh.ms.slice(0, sh.impact == null ? 2 : sh.impact)) / 1000; };

  // anim names: idle_/walk_/carry_/work_ + front|back|left|right, attack_/hurt_ + left|right, die
  //   walk = the hands-forward shuffle of the working pose with a bob; carry = walking with the plate (the plate is part of the picture)
  function drawChar(ctx, c, anim, t, x, y, s, o) {
    const m = CHARS[c], cut = anim.lastIndexOf('_'), kind = cut < 0 ? anim : anim.slice(0, cut), dir = cut < 0 ? 'front' : anim.slice(cut + 1);
    const k = o.raw ? 1 : CHAR_K, sc = s * k;
    let sheet = 'work', row = DIRROW[dir] != null ? DIRROW[dir] : 0, f = 0, done = false, bob = 0, rot = 0, flash = false, dx = 0, sy = 1;
    if (kind === 'idle') { sy = 1 + 0.012 * Math.sin(t * 3); }
    else if (kind === 'walk') { [f] = frameAt(m.sheets.work, t, true); bob = Math.abs(Math.sin(t * Math.PI / 0.42)) * 3.2; }
    else if (kind === 'work') { [f] = frameAt(m.sheets.work, t, true); }
    else if (kind === 'carry') { sheet = 'walk'; [f] = frameAt(m.sheets.walk, t, true); bob = Math.abs(Math.sin(t * Math.PI / 0.39)) * 1.6; }
    else if (kind === 'attack') { sheet = 'attack'; row = SIDEROW[dir] != null ? SIDEROW[dir] : 1; [f, done] = frameAt(m.sheets.attack, t, false); }
    else if (kind === 'hurt') { row = SIDEROW[dir] != null ? SIDEROW[dir] : 1; flash = t < 0.18; dx = Math.sin(t * 70) * 2.2 * Math.max(0, 1 - t / 0.35); done = t >= 0.4; }
    else if (kind === 'die') { row = 0; const p = o.frame != null ? 1 : Math.min(1, t / 0.45); rot = -p * Math.PI / 2; done = p >= 1; }
    const im = CIMG[c + '/' + sheet];
    if (!im) return true;
    const W = m.fw * sc, H = m.fh * sc;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.translate(x + dx * sc, y - bob * sc);
    if (rot) { ctx.translate(-4 * sc, 0); ctx.rotate(rot); ctx.translate(0, 3 * sc); }
    if (sy !== 1) ctx.scale(1, sy);
    if (flash) ctx.filter = 'brightness(1.7) saturate(.5)';
    ctx.drawImage(im, f * m.fw, row * m.fh, m.fw, m.fh, -m.ax * sc, -m.ay * sc, W, H);
    ctx.restore();
    return done;
  }

  // Props come from plain 3D renders; paint them into the game's look: warm light from above, cool shade below,
  // slightly richer colours and the same dark ink outline the characters and furniture have.
  const PAD = 3;
  function stylizeProp(im) {
    const w = im.width, h = im.height, cv = document.createElement('canvas');
    cv.width = w + PAD * 2; cv.height = h + PAD * 2;
    const g = cv.getContext('2d');
    // body: a touch more saturation and contrast, then a vertical light/shade wash that keeps the alpha
    const body = document.createElement('canvas'); body.width = w; body.height = h;
    const b = body.getContext('2d');
    b.filter = 'saturate(1.1) contrast(1.04) brightness(1.1)'; b.drawImage(im, 0, 0); b.filter = 'none';
    b.globalCompositeOperation = 'source-atop';
    const gr = b.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,238,160,.18)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,20,60,.16)');
    b.fillStyle = gr; b.fillRect(0, 0, w, h);
    // ink: the silhouette in the outline colour, stamped around the body
    const ink = document.createElement('canvas'); ink.width = w; ink.height = h;
    const k = ink.getContext('2d'); k.drawImage(im, 0, 0);
    k.globalCompositeOperation = 'source-in'; k.fillStyle = '#2b2333'; k.fillRect(0, 0, w, h);
    for (let a = 0; a < 16; a++) {
      const r = a % 2 ? 0.9 : 1.3, an = a / 16 * Math.PI * 2;
      g.drawImage(ink, PAD + Math.cos(an) * r, PAD + Math.sin(an) * r);
    }
    g.drawImage(ink, PAD, PAD + 0.9);   // a little weight at the bottom, like the furniture
    g.drawImage(body, PAD, PAD);
    return cv;
  }

  // Static scenery/decoration sprites rendered from the 3D models (see tools/build-props.js).
  // (x, y) is the point on the ground the prop stands on.
  ZC.drawProp = function (ctx, name, x, y, s = 1, flip = false, alpha = 1) {
    const im = PROP_IMG[name], m = ZC.PROPS && ZC.PROPS[name];
    if (!im || !m) return;
    if (alpha < 1) { ctx.save(); ctx.globalAlpha = alpha; }
    const p = PAD * s, W = m.w * s + 2 * p, H = m.h * s + 2 * p;   // the stylized image carries a margin for the outline
    if (flip) {
      ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1);
      ctx.drawImage(im, -m.ax * s - p, -m.ay * s - p, W, H); ctx.restore();
    } else ctx.drawImage(im, x - m.ax * s - p, y - m.ay * s - p, W, H);
    if (alpha < 1) ctx.restore();
  };

  // Humans turned into zombies: multiply a sickly green over the sprite, keep the alpha.
  function strip(c, a, tint) {
    const k = c + '/' + a;
    const im = imgs[k];
    if (!im || !tint) return im;
    const tk = typeof tint === 'string' ? k + '|' + tint : k;
    if (tinted[tk]) return tinted[tk];
    const cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d');
    if (typeof tint === 'string' && ZC.VARIANTS && ZC.VARIANTS[tint]) {   // colour variant: filter the whole frame strip
      g.filter = ZC.VARIANTS[tint].filter; g.drawImage(im, 0, 0); g.filter = 'none';
      return (tinted[tk] = cv);
    }
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#93e07c';
    g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(im, 0, 0);
    tinted[k] = cv;
    return cv;
  }

  ZC.animLength = (c, a) => {
    if (CHARS[c]) return a.indexOf('attack') === 0 ? msSum(CHARS[c].sheets.attack.ms) / 1000 : a.indexOf('hurt') === 0 ? 0.4 : 1;
    const m = SPRITES[c].anims[a]; return m.n / m.fps;
  };

  // Draws character `c` with feet at (x, y). Returns true when a non-looping anim has finished.
  ZC.drawSprite = function (ctx, c, anim, t, x, y, s, o = {}) {
    if (CHARS[c]) return drawChar(ctx, c, anim, t, x, y, s, o);
    const m = SPRITES[c];
    if (!m.anims[anim]) anim = 'idle_front';
    const a = m.anims[anim];
    const im = strip(c, anim, o.tint);
    if (!im) return true;
    let f = Math.floor(t * a.fps);
    let done = false;
    if (o.frame != null) f = o.frame < 0 ? a.n + o.frame : o.frame;
    else if (a.loop) f = ((f % a.n) + a.n) % a.n;
    else if (f >= a.n) { f = a.n - 1; done = true; }
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha = o.alpha; }
    ctx.drawImage(im, f * m.fw, 0, m.fw, m.fh, x - m.ax * s, y - m.ay * s, m.fw * s, m.fh * s);
    if (o.alpha != null) ctx.restore();
    return done;
  };

  // Small full-body canvas for menus.
  ZC.portrait = function (c, tint, size = 72) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * dpr;
    cv.style.width = cv.style.height = size + 'px';
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const s = ZC.isChar(c) ? (size * 0.9) / 112 : (size * 0.9) / 128;
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.beginPath(); g.ellipse(size / 2, size - 6, size * 0.22, size * 0.06, 0, 0, Math.PI * 2); g.fill();
    ZC.drawSprite(g, c, 'idle_front', 0, size / 2, size - 5, s, { tint, frame: 0, raw: true });
    return cv;
  };
})();
