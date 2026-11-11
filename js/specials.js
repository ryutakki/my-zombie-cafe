// Unique customers: a recoloured human sprite with a painted accessory, and a perk (or a catch) of their own.
window.ZC = window.ZC || {};
(() => {
  const ZC = window.ZC;
  const TAU = Math.PI * 2;

  // pay = multiplier on the dish price, patience = multiplier on how long they wait, minLevel = when they start showing up
  ZC.SPECIALS = {
    policial: { name: 'Policial Podre',        sprite: 'thug',          look: 'z_grandalhao',          acc: 'cap',   minLevel: 1,  minRep: 0,   weight: 3, pay: 1.5, patience: 1.3, desc: 'Paga 50% a mais e é bem paciente.' },
    bruxa:    { name: 'Bruxa do Pântano',      sprite: 'robber',        look: 'z_mulher',        acc: 'witch', minLevel: 3,  minRep: 2,   weight: 3, pay: 1.2, toxin: 1,      desc: 'Deixa 1 toxina de gorjeta.' },
    critico:  { name: 'Crítico Gastronômico',  sprite: 'assassin',      look: 'z_careca',      acc: 'chef',  minLevel: 5,  minRep: 2.5, weight: 2, pay: 1.5, xp: 6, mastery: 1, critic: true, desc: 'Servido rápido, elogia: XP extra e meia estrela temporária.' },
    popstar:  { name: 'Estrela Pop Defunta',   sprite: 'robber',        look: 'z_adolescente',        acc: 'shades', minLevel: 7, minRep: 3,  weight: 2, pay: 2,   fans: 2, desc: 'Paga o dobro e chega com 2 fãs.' },
    magnata:  { name: 'Magnata Pirata',        sprite: 'pirate_leader', look: 'z_idoso', acc: 'monocle',   minLevel: 10, minRep: 3.5, weight: 1, pay: 3,   patience: 0.6, desc: 'Paga o triplo, mas não tem paciência.' },
  };

  // colour looks (see js/variants.js): flagged `special` so ordinary customers never use them
  const V = ZC.VARIANTS;
  V.sp_policial = { base: 'thug',          special: true, name: 'Policial Podre',       filter: 'saturate(.9) brightness(.82) contrast(1.1)' };
  V.sp_bruxa    = { base: 'robber',        special: true, name: 'Bruxa do Pântano',     filter: 'hue-rotate(60deg) saturate(.9) brightness(.9)' };
  V.sp_critico  = { base: 'assassin',      special: true, name: 'Crítico Gastronômico', filter: 'grayscale(.4) brightness(1.3) contrast(.95)' };
  V.sp_popstar  = { base: 'robber',        special: true, name: 'Estrela Pop Defunta',  filter: 'saturate(1.5) brightness(1.12) hue-rotate(-18deg)' };
  V.sp_magnata  = { base: 'pirate_leader', special: true, name: 'Magnata Pirata',       filter: 'sepia(.35) brightness(.78) contrast(1.15)' };
  for (const [id, sp] of Object.entries(ZC.SPECIALS)) sp.variant = 'sp_' + id;

  // ---------- accessories, painted on the head (x = centre of the head, y = top of the head) ----------
  const INK = '#2b2333';
  const stroke = (ctx, w = 2.6) => { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
  const fillStroke = (ctx, fill, w) => { ctx.fillStyle = fill; ctx.fill(); stroke(ctx, w); ctx.stroke(); };
  const side = dir => dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

  const ACC = {
    cap(ctx, x, y, dir) {   // police cap: blue dome, black visor, gold badge
      const sd = side(dir), vx = sd * 7;
      ctx.beginPath(); ctx.ellipse(x + sd * 1, y + 1, 15, 10, 0, Math.PI, TAU); ctx.lineTo(x + 15 + sd, y + 4); ctx.lineTo(x - 15 + sd, y + 4); ctx.closePath(); fillStroke(ctx, '#2f56b8');
      ctx.beginPath(); ctx.rect(x - 16 + sd, y + 1, 32, 5); fillStroke(ctx, '#1d2b52', 2);
      if (dir !== 'back') {
        ctx.beginPath(); ctx.ellipse(x + vx, y + 7, 12, 3.4, 0, 0, TAU); fillStroke(ctx, '#17121c', 2);
        ctx.beginPath(); ctx.arc(x + sd * 4, y - 5, 3.6, 0, TAU); fillStroke(ctx, '#ffd84a', 1.6);
      }
    },
    chef(ctx, x, y, dir) {   // tall chef's hat
      ctx.beginPath(); ctx.arc(x - 9, y - 10, 8, 0, TAU); ctx.arc(x + 9, y - 10, 8, 0, TAU); ctx.arc(x, y - 17, 10, 0, TAU); fillStroke(ctx, '#fbfbf2');
      ctx.beginPath(); ctx.rect(x - 14, y - 9, 28, 14); fillStroke(ctx, '#fbfbf2');
      ctx.strokeStyle = 'rgba(23,18,28,.25)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 5, y - 8); ctx.lineTo(x - 5, y + 4); ctx.moveTo(x + 5, y - 8); ctx.lineTo(x + 5, y + 4); ctx.stroke();
    },
    witch(ctx, x, y, dir) {   // purple pointed hat with a gold buckle, tip bent to the side
      ctx.beginPath(); ctx.ellipse(x, y + 4, 22, 6.5, 0, 0, TAU); fillStroke(ctx, '#4c2f7a');
      ctx.beginPath(); ctx.moveTo(x - 12, y + 3); ctx.quadraticCurveTo(x - 6, y - 16, x + 8, y - 30); ctx.quadraticCurveTo(x + 14, y - 33, x + 17, y - 26); ctx.quadraticCurveTo(x + 10, y - 14, x + 12, y + 3); ctx.closePath(); fillStroke(ctx, '#6a45a3');
      ctx.beginPath(); ctx.rect(x - 11, y - 4, 23, 6); fillStroke(ctx, '#2a1a45', 2);
      ctx.beginPath(); ctx.rect(x - 3, y - 5, 7, 8); fillStroke(ctx, '#ffd84a', 1.6);
    },
    monocle(ctx, x, y, dir) {   // the tycoon: gold monocle on a chain, plus a pile of gold on the hat
      const sd = side(dir);
      if (dir !== 'back') {
        const mx = x + (sd || 1) * 6, my = y + 24;
        ctx.beginPath(); ctx.arc(mx, my, 7, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); stroke(ctx, 3.6); ctx.stroke(); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.8; ctx.stroke();
        stroke(ctx, 2); ctx.beginPath(); ctx.moveTo(mx + 3, my + 6); ctx.quadraticCurveTo(mx + 8, my + 18, mx + 2, my + 30); ctx.stroke();
      }
      ZC.drawIcon(ctx, 'coin', x - 2, y - 14, 18);
    },
    shades(ctx, x, y, dir, t) {   // pop star: sunglasses and a glittering star in the hair
      const sd = side(dir);
      if (dir !== 'back') {
        ctx.beginPath(); ctx.roundRect(x - 12 + sd * 3, y + 10, 24, 7.5, 3); fillStroke(ctx, '#17121c', 2);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - 9 + sd * 3, y + 11.5, 5, 1.8);
      }
      ZC.drawIcon(ctx, 'star', x + 11, y - 6, 22);
      const tw = 0.5 + 0.5 * Math.sin(t * 6); ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * tw})`;
      ctx.beginPath(); ctx.arc(x + 20, y - 15, 1.6 + tw, 0, TAU); ctx.fill();
    },
  };

  ZC.drawAccessory = (ctx, kind, x, y, dir, t) => { const f = ACC[kind]; if (f) { ctx.save(); f(ctx, x, y, dir, t); ctx.restore(); } };
})();
