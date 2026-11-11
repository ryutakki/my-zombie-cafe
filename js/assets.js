// Sprite loading, zombie tinting and animated drawing.
(() => {
  const ZC = window.ZC;
  const SPRITES = window.SPRITES;
  const imgs = {};
  const tinted = {};
  const PROP_IMG = {};

  ZC.loadAssets = function (onProgress) {
    const jobs = [];
    for (const [c, m] of Object.entries(SPRITES)) for (const a of Object.keys(m.anims)) jobs.push([c, a]);
    const props = Object.keys(ZC.PROPS || {});
    const total = jobs.length + props.length;
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
    return Promise.all(sprites.concat(propImgs));
  };

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
    b.filter = 'saturate(1.18) contrast(1.08) brightness(1.02)'; b.drawImage(im, 0, 0); b.filter = 'none';
    b.globalCompositeOperation = 'source-atop';
    const gr = b.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,238,160,.16)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(24,12,48,.30)');
    b.fillStyle = gr; b.fillRect(0, 0, w, h);
    // ink: the silhouette in the outline colour, stamped around the body
    const ink = document.createElement('canvas'); ink.width = w; ink.height = h;
    const k = ink.getContext('2d'); k.drawImage(im, 0, 0);
    k.globalCompositeOperation = 'source-in'; k.fillStyle = '#17121c'; k.fillRect(0, 0, w, h);
    for (let a = 0; a < 16; a++) {
      const r = a % 2 ? 1.5 : 2.1, an = a / 16 * Math.PI * 2;
      g.drawImage(ink, PAD + Math.cos(an) * r, PAD + Math.sin(an) * r);
    }
    g.drawImage(ink, PAD, PAD + 1.6);   // a little weight at the bottom, like the furniture
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

  ZC.animLength = (c, a) => { const m = SPRITES[c].anims[a]; return m.n / m.fps; };

  // Draws character `c` with feet at (x, y). Returns true when a non-looping anim has finished.
  ZC.drawSprite = function (ctx, c, anim, t, x, y, s, o = {}) {
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
    const s = (size * 0.9) / 128;
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.beginPath(); g.ellipse(size / 2, size - 6, size * 0.22, size * 0.06, 0, 0, Math.PI * 2); g.fill();
    ZC.drawSprite(g, c, 'idle_front', 0, size / 2, size - 5, s, { tint, frame: 0 });
    return cv;
  };
})();
