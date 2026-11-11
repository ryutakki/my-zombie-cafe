// Colour variations of the existing characters. Use one as a tint: ZC.drawSprite(ctx, base, anim, t, x, y, s, { tint: 'afogado' }).
// `filter` is a canvas filter applied to every frame of the sprite sheet once (see strip() in assets.js).
window.ZC = window.ZC || {};
(() => {
  const ZC = window.ZC;
  ZC.VARIANTS = {
    afogado:   { base: 'pirate_zombie', name: 'Zumbi Afogado',      filter: 'hue-rotate(35deg) saturate(1.25)' },
    doce:      { base: 'pirate_zombie', name: 'Zumbi Doce',         filter: 'hue-rotate(150deg) saturate(1.1) brightness(1.18)' },
    acido:     { base: 'pirate_zombie', name: 'Zumbi Ácido',        filter: 'hue-rotate(-75deg) saturate(1.9) brightness(.95)' },
    gelo:      { base: 'pirate_zombie', name: 'Zumbi Gelo',         filter: 'hue-rotate(235deg) saturate(1.35)' },
    abissal:   { base: 'squidman',      name: 'Lula Abissal',       filter: 'hue-rotate(85deg) saturate(1.3) brightness(.9)' },
    carmesim:  { base: 'squidman',      name: 'Lula Carmesim',      filter: 'hue-rotate(-95deg) saturate(1.5)' },
    noturno:   { base: 'robber',        name: 'Ladrão Noturno',     filter: 'hue-rotate(205deg) saturate(1.5) brightness(.55) contrast(1.15)' },
    ferrugem:  { base: 'thug',          name: 'Brutamontes Ferrugem', filter: 'hue-rotate(-20deg) saturate(1.9) sepia(.35) brightness(.9)' },
    fantasma:  { base: 'assassin',      name: 'Assassino Fantasma', filter: 'grayscale(.85) hue-rotate(170deg) brightness(1.35) contrast(.9)' },
    dourado:   { base: 'pirate_leader', name: 'Capitão Dourado',    filter: 'sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.12)' },
  };
})();
