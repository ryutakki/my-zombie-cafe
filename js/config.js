// Balance and rule configuration.
// Every number in this file is a PROPOSAL for this game, chosen to validate the loop. None of them is a value
// taken from the original Zombie Café. Rules that differ between editions of the original are flagged "edition".
window.ZC = window.ZC || {};
(() => {
  const ZC = window.ZC;
  ZC.CFG = {
    // ---- session: the simulation only advances while the game is open and visible ----
    maxStep: 0.1,                 // largest simulated step per frame (s). A suspended tab never produces a time jump.

    // ---- kitchen ----
    kitchen: {
      timeScale: 1,               // multiplies every recipe time
      abandon: 45,                // s a pot survives with nobody stirring before it burns (progress is kept meanwhile)
      spoilMin: 180,              // a finished batch left on the stove spoils after max(spoilMin, time * spoilFactor) s
      spoilFactor: 2,
      spoilWarn: 30,              // warn this many seconds before a finished batch spoils
      fridgeSlots: 2,             // batches of looted food kept per fridge
      stirDrain: 0.03,            // energy per second spent by the cook at the pot
      secPerToxin: 240,           // speeding up costs 1 toxin per this many seconds left
    },

    // ---- service ----
    service: {
      eat: 6,                     // s a customer takes to eat
      maxCustomers: 14,           // simulation cap, whatever the reputation says
      maxArriving: 3,             // customers on their way to the door at the same time
      cleanMaxWait: 25,           // a dirty plate older than this jumps ahead of serving (cleaning can not be postponed for ever)
      patienceBase: 35,           // s
      patiencePerAmbience: 8,     // extra s of patience per point of ambience (decoration)
      fullNote: 20,               // s between two "café is full" reputation notes
    },
    drain: { cookStart: 3, transfer: 2, serve: 2, clean: 1 },   // energy per finished job, times the worker's wear

    // ---- energy, rest, distraction, hunger ----
    energy: {
      warn: 0.35,                 // below this fraction of the maximum the worker shows a warning
      distract: 0.28,             // below this it may stop working for a moment
      distractEvery: 14,          // average s between distractions while below the line
      distractTime: [3, 6],       // s a distraction lasts
      reactWindow: 10,            // s between "is about to attack" and the attack: time to order rest or feed it
      attackCooldown: 75,         // s before the same worker may snap again
      attackGain: 0.12,           // fraction of the maximum energy recovered by eating a customer (small on purpose)
      collapseWake: 0.25,         // a collapsed worker gets up at this fraction
      collapseRecover: 0.5,       // collapsed workers recover at this share of their normal rest rate
      restUntil: 1,               // resting ends at this fraction, then the worker goes back to its job
      reserveFreezes: true,       // edition: energy does not change while a worker is stored in the reserve
      chefDrains: false,          // edition: the main chef does not get tired from work in the café
    },

    // ---- staff ----
    staff: {
      variation: 0.1,             // every recruit is the profile +/- this much
      growth: 0.05,               // energy and strength gained per zombie level
      tipGrowth: 0.015,
      maxLevel: 10,
      xpBase: 12, xpPow: 1.6,     // xp to go from level n to n+1 = xpBase * n^xpPow
      xpServe: 1, xpCook: 3, xpRaidKill: 4, xpRaidWin: 6,
      reserveBase: 2, reservePerLevels: 4,   // reserve slots = base + floor(level / perLevels)
    },

    // ---- reputation (operational, 0..5) ----
    rep: {
      start: 1.5,
      // each event pulls the score towards `to` by `w`
      fast: { to: 5, w: 0.04, why: 'serviço rápido' },
      ok: { to: 3.4, w: 0.04, why: 'atendimento concluído' },
      slow: { to: 1.2, w: 0.09, why: 'demora no atendimento' },
      nofood: { to: 0.8, w: 0.1, why: 'clientes sem comida' },
      full: { to: 2, w: 0.03, why: 'café lotado' },
      attack: { to: 0, w: 0.3, why: 'surto no salão' },
      burnt: { to: 2, w: 0.02, why: 'comida desperdiçada' },
      logSize: 8,
      spawnBase: 10, spawnPerStar: 1.5, spawnMin: 3,   // s between customers = max(min, base - perStar * stars)
      criticBonus: { stars: 0.5, time: 180 },          // a critic served quickly lends temporary stars
    },

    // ---- economy ----
    economy: {
      rescue: true,               // own rule: with no money and no food anywhere the cheapest known recipe is free
      sellBack: 0.5,
    },

    // ---- raids ----
    raid: {
      minEnergy: 0.2,             // a worker below this fraction can not be sent
      enemyDamage: 0.8,
      bossHp: 2.0, bossDamage: 1.35, bossScale: 1.18,
      eatHeal: 0.25,              // fraction of the maximum energy regained per devoured corpse
      cooldown: 90,               // s of session time before the same café can be raided again
      retreatShare: 0.5,          // retreating keeps this share of the coins already taken from fallen defenders
      defenderCoins: 0.12,        // share of the prize carried by each ordinary defender
      lootBeforeWin: false,       // edition: stealing the food before the boss falls (kept off)
      capture: true,              // own rule kept from the prototype: a win may bring one captured human
      reviveTime: 150,            // s of session time a knocked-out worker needs
      reviveEnergy: 0.2,          // fraction of the maximum it comes back with
      reviveToxin: 1,             // toxin to bring it back at once
    },

    // ---- daily return ----
    daily: { trigger: 'cook' },   // edition: "Frequent Fryer" rewards cooking on the day, not opening the game
  };
})();
