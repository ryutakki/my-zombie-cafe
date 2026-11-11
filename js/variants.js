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
    noturno:   { base: 'robber',        name: 'Ladrão Noturno',     filter: 'saturate(.9) brightness(.7) contrast(1.12)' },
    ferrugem:  { base: 'thug',          name: 'Brutamontes Ferrugem', filter: 'saturate(1.2) sepia(.25) brightness(.92)' },
    fantasma:  { base: 'assassin',      name: 'Assassino Fantasma', filter: 'grayscale(.55) brightness(1.2) contrast(.95)' },
    dourado:   { base: 'pirate_leader', name: 'Capitão Dourado',    filter: 'sepia(.55) saturate(1.5) brightness(1.08)' },
  };
})();
