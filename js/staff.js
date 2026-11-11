// Staff: character profiles, recruited instances, attributes, roles, energy, rest, distraction, hunger and zombie XP.
// A profile is a kind of character; an instance (an entry of state.zombies) is one recruit with its own numbers.
window.ZC = window.ZC || {};
(() => {
  const ZC = window.ZC, CFG = ZC.CFG;
  const rand = (a, b) => a + Math.random() * (b - a);

  // energy = stamina at work AND resistance in raids; speed = walking; tip = share of the price left as a tip;
  // str = damage in raids; hunger = fraction of energy below which it may attack a customer (lower is safer);
  // wear = how fast work tires it; recover = energy per second while resting.
  ZC.PROFILES = {
    pirate_zombie: { name: 'Zumbi Comum', job: 'Equilibrado', energy: 100, speed: 1.0, tip: 0.30, str: 9, hunger: 0.15, wear: 1.0, recover: 0.9, desc: 'Faz de tudo um pouco, sem brilhar em nada.' },
    robber: { name: 'Ladrão', job: 'Atendente ligeiro', energy: 80, speed: 1.25, tip: 0.50, str: 6, hunger: 0.18, wear: 1.1, recover: 1.0, desc: 'Rápido e bom de gorjeta, mas cansa cedo e bate fraco.' },
    thug: { name: 'Brutamontes', job: 'Trabalhador resistente', energy: 140, speed: 0.85, tip: 0.15, str: 11, hunger: 0.10, wear: 0.8, recover: 0.7, desc: 'Aguenta turnos longos e pancada. Lento e ruim de gorjeta.' },
    assassin: { name: 'Assassino', job: 'Lutador', energy: 90, speed: 1.15, tip: 0.10, str: 14, hunger: 0.25, wear: 1.2, recover: 0.9, desc: 'O melhor nas invasões. No salão rende pouco e fica faminto cedo.' },
    pirate_leader: { name: 'Capitão', job: 'Anfitrião', energy: 105, speed: 1.0, tip: 0.45, str: 10, hunger: 0.15, wear: 1.0, recover: 0.8, desc: 'Carismático: ótimas gorjetas e luta razoável.' },
    squidman: { name: 'Homem-Lula', job: 'Colosso', energy: 130, speed: 0.95, tip: 0.20, str: 13, hunger: 0.12, wear: 0.9, recover: 0.8, desc: 'Forte e resistente. Raro de aparecer.' },
    chef: { name: 'Chef', job: 'Dono do café', energy: 100, speed: 1.0, tip: 0.35, str: 8, hunger: 0, wear: 0, recover: 1, desc: 'Você. Não se cansa trabalhando no café e nunca vai para a reserva.' },
  };
  ZC.ROLES = { serve: 'Atender', cook: 'Cozinhar', rest: 'Descansar', reserve: 'Reserva' };

  const r2 = v => Math.round(v * 100) / 100;
  ZC.rollStats = function (type) {
    const p = ZC.PROFILES[type] || ZC.PROFILES.pirate_zombie, v = CFG.staff.variation;
    return { energy: Math.round(p.energy * (1 + rand(-v, v))), speed: r2(p.speed * (1 + rand(-v, v) * 0.6)), tip: r2(p.tip * (1 + rand(-v, v))), str: r2(p.str * (1 + rand(-v, v))) };
  };
  // o: { id, name, sprite, tint, st, chef, role }
  ZC.makeStaff = function (type, o = {}) {
    const z = { id: o.id, type, sprite: o.sprite || type, tint: o.tint || false, name: o.name || ZC.PROFILES[type].name,
      st: o.st || ZC.rollStats(type), lvl: 1, xp: 0, role: o.role || 'serve' };
    if (o.chef) { z.chef = true; z.acc = 'chef'; }
    z.energy = ZC.zMax(z);
    return z;
  };

  const grow = z => 1 + CFG.staff.growth * ((z.lvl || 1) - 1);
  const prof = z => ZC.PROFILES[z.type] || ZC.PROFILES.pirate_zombie;
  ZC.profileOf = prof;
  ZC.zMax = z => Math.round(z.st.energy * grow(z));
  ZC.zStr = z => z.st.str * grow(z);
  ZC.zSpeed = z => z.st.speed;
  ZC.zTip = z => (z ? z.st.tip + CFG.staff.tipGrowth * ((z.lvl || 1) - 1) : 0.2);
  ZC.zHunger = z => prof(z).hunger;
  ZC.zWear = z => (z.chef && !CFG.energy.chefDrains ? 0 : prof(z).wear);
  ZC.zRecover = z => prof(z).recover;
  ZC.zPct = z => Math.max(0, Math.min(1, z.energy / ZC.zMax(z)));
  ZC.zXpNeed = z => Math.round(CFG.staff.xpBase * Math.pow(z.lvl, CFG.staff.xpPow));
  // hunger tolerance shown as 1..5 (5 = hardly ever snaps)
  ZC.hungerStars = h => Math.max(1, Math.min(5, Math.round(5 - (h - 0.10) / 0.0375)));
  ZC.zombieData = id => ZC.state.zombies.find(z => z.id === id);

  // who is where: in the café, stored, away on a raid, or knocked out
  ZC.staffActive = z => z.role !== 'reserve' && !z.away && !(z.revive > 0);
  ZC.crew = () => ZC.state.zombies.filter(z => !z.chef);                       // every zombie you own
  ZC.team = () => ZC.state.zombies.filter(z => !z.chef && z.role !== 'reserve');   // counts against the level limit
  ZC.stored = () => ZC.state.zombies.filter(z => z.role === 'reserve');
  ZC.reserveCap = () => CFG.staff.reserveBase + Math.floor(ZC.state.level / CFG.staff.reservePerLevels);
  ZC.staffWhere = function (z) {
    if (z.revive > 0) return 'Reanimando';
    if (z.away) return 'Na invasão';
    return ZC.ROLES[z.role] || z.role;
  };

  ZC.drain = function (z, n) {
    if (!z || n <= 0) return;
    z.energy = Math.max(0, z.energy - n * ZC.zWear(z));
  };

  ZC.zXP = function (id, n) {
    const z = typeof id === 'object' ? id : ZC.zombieData(id);
    if (!z || z.chef || z.lvl >= CFG.staff.maxLevel) return;
    z.xp += n;
    while (z.lvl < CFG.staff.maxLevel && z.xp >= ZC.zXpNeed(z)) {
      z.xp -= ZC.zXpNeed(z);
      const before = ZC.zMax(z);
      z.lvl++;
      z.energy += ZC.zMax(z) - before;   // the new maximum comes filled: the level is not a free refill of the rest
      ZC.toast(`${z.name} subiu para o nível ${z.lvl}! Mais energia e força.`, 'level');
    }
    if (z.lvl >= CFG.staff.maxLevel) z.xp = 0;
  };

  // ---------- roles ----------
  // Returns null when done, or the reason it can not be done.
  ZC.setRole = function (z, role) {
    const s = ZC.state;
    if (z.revive > 0) return `${z.name} está sendo reanimado.`;
    if (z.away) return `${z.name} está numa invasão.`;
    if (z.role === role) return null;
    if (z.chef && (role === 'rest' || role === 'reserve')) return 'O chef não descansa nem vai para a reserva.';
    if (role === 'reserve' && ZC.stored().length >= ZC.reserveCap()) return `A reserva está cheia (${ZC.reserveCap()} vagas).`;
    if (z.role === 'reserve' && ZC.team().length >= ZC.maxZombies(s.level)) return `Limite de ${ZC.maxZombies(s.level)} zumbis ativos no nível ${s.level}.`;
    const a = ZC.zombieActor(z.id);
    if (a) { ZC.abortActor(a); a.resting = false; a.restWalk = false; a.mood = null; a.hungerT = null; }
    if (role === 'rest' || role === 'reserve') { if (z.role === 'serve' || z.role === 'cook') z.prevRole = z.role; }
    z.role = role;
    ZC.syncZombies();
    ZC.save();
    return null;
  };

  // ---------- per-frame behaviour of one worker in the café. Returns true when it used up the frame. ----------
  ZC.staffTick = function (a, z, dt) {
    const E = CFG.energy, max = ZC.zMax(z);
    if (a.state === 'collapsed') {
      z.energy = Math.min(max, z.energy + ZC.zRecover(z) * E.collapseRecover * dt);
      if (z.energy >= max * E.collapseWake) { a.state = 'idle'; a.wanderT = 1; ZC.toast(`${z.name} levantou, mas ainda está fraco. Deixe-o descansar.`); }
      return true;
    }
    if (z.chef) return false;
    if (z.energy <= 0) {
      ZC.abortActor(a);
      a.state = 'collapsed'; a.mood = null; a.hungerT = null; a.resting = false; a.restWalk = false;
      if (z.role === 'rest') z.role = z.prevRole || 'serve';
      ZC.toast(`${z.name} desabou de cansaço! Vai demorar para levantar.`, 'bad');
      return true;
    }
    // ---- resting: walk to a quiet spot by the wall, lie down, recover ----
    if (z.role === 'rest') {
      if (a.restWalk) { if (ZC.stepActor(a, dt)) { a.restWalk = false; a.resting = true; ZC.stat('rested'); } return true; }
      if (!a.resting) {
        const c = ZC.state.cafe, spots = [];
        for (let y = 0; y < c.h - 1; y++) for (const x of [0, c.w - 1]) if (ZC.tileFree(x, y)) spots.push([x, y]);
        if (spots.length && ZC.goActor(a, spots)) a.restWalk = true; else { a.resting = true; ZC.stat('rested'); }
        return true;
      }
      z.energy = Math.min(max, z.energy + ZC.zRecover(z) * dt);
      if (z.energy >= max * E.restUntil) {
        z.role = z.prevRole || 'serve'; a.resting = false; a.warned = false;
        ZC.toast(`${z.name} descansou e voltou ao trabalho.`, 'good'); ZC.save();
      }
      return true;
    }
    if (a.resting || a.restWalk) { a.resting = false; a.restWalk = false; a.path = null; }

    const pct = z.energy / max;
    // ---- how fast it is getting tired (for the "time left" estimate) ----
    a.rateT = (a.rateT || 0) + dt;
    if (a.rateT >= 5) {
      const used = Math.max(0, (a.rateE == null ? z.energy : a.rateE) - z.energy) / a.rateT;
      a.rate = a.rate == null ? used : a.rate * 0.7 + used * 0.3;
      a.rateE = z.energy; a.rateT = 0;
    }
    if (pct <= E.warn && !a.warned) {
      a.warned = true;
      const left = ZC.restEta(a, z);
      ZC.toast(`${z.name} está cansado` + (left ? ` (cerca de ${left}s até precisar parar)` : '') + '. Toque nele e mande descansar.', 'bad');
    } else if (pct > E.warn + 0.08) a.warned = false;

    // ---- the attack itself ----
    if (a.mood === 'attack') { attackTick(a, z, dt); return true; }
    z.snapCd = Math.max(0, (z.snapCd || 0) - dt);
    // ---- hunger: a warning first, then it goes for a customer ----
    if (pct <= ZC.zHunger(z) && !(z.snapCd > 0)) {
      if (a.hungerT == null) {
        a.hungerT = E.reactWindow;
        ZC.fx(a.x + 0.5, a.y - 0.2, 'FOME!', '#ff6a5a');
        ZC.toast(`${z.name} está faminto e vai atacar um cliente em ${E.reactWindow}s! Mande descansar ou dê um Cérebro.`, 'bad');
      }
      a.hungerT -= dt;
      if (a.hungerT <= 0) { a.hungerT = null; if (startAttack(a, z)) return true; z.snapCd = 8; }
    } else a.hungerT = null;
    // ---- distraction: stops whatever it is doing for a few seconds ----
    if (a.mood === 'distracted') {
      a.moodT -= dt; a.moving = false;
      if (a.moodT <= 0) a.mood = null;
      return true;
    }
    if (pct <= E.distract && Math.random() < dt / E.distractEvery) {
      a.mood = 'distracted'; a.moodT = rand(E.distractTime[0], E.distractTime[1]);
      ZC.stat('distractions');
      return true;
    }
    return false;
  };

  // seconds of work left before the hunger line, from the recent drain rate (null when unknown)
  ZC.restEta = function (a, z) {
    if (!a || !a.rate || a.rate < 0.01) return null;
    const left = z.energy - ZC.zMax(z) * Math.max(ZC.zHunger(z), CFG.energy.distract);
    return left > 0 ? Math.round(left / a.rate) : 0;
  };

  function startAttack(a, z) {
    const rt = ZC.rt;
    const prey = rt.customers.filter(cu => !cu.gone && (cu.state === 'wait' || cu.state === 'eat' || (cu.state === 'enter' && ZC.inCafe(Math.round(cu.x), Math.round(cu.y)))));
    if (!prey.length) return false;
    prey.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    ZC.abortActor(a);
    a.mood = 'attack'; a.victim = prey[0].aid; a.atkT = 9; a.bite = 0; a.repath = 0;
    return true;
  }
  function attackTick(a, z, dt) {
    const rt = ZC.rt, cu = rt.customers.find(q => q.aid === a.victim && !q.gone);
    a.atkT -= dt;
    if (!cu || cu.state === 'leave' || cu.state === 'flee' || cu.state === 'infect' || a.atkT <= 0) {   // the prey got away
      a.mood = null; a.working = null; a.path = null; a.moving = false; z.snapCd = 10; return;
    }
    if (a.bite > 0) {
      a.bite -= dt; a.working = 'work'; a.moving = false;
      if (a.bite <= 0) {
        a.working = null; a.mood = null;
        z.energy = Math.min(ZC.zMax(z), z.energy + ZC.zMax(z) * CFG.energy.attackGain);
        z.snapCd = CFG.energy.attackCooldown;
        ZC.outburst(a, z, cu);
      }
      return;
    }
    if (Math.hypot(cu.x - a.x, cu.y - a.y) <= 1.35) {
      a.path = null; a.moving = false; a.bite = 1.3;
      a.dir = ZC.dirName(cu.x - a.x, cu.y - a.y);
      ZC.fx(cu.x + 0.5, cu.y - 0.2, 'Socorro!', '#ff6a5a');
      return;
    }
    a.repath -= dt;
    if (a.repath <= 0 || !a.path || !a.path.length) {
      a.repath = 0.6;
      const tx = Math.round(cu.x), ty = Math.round(cu.y);
      const goals = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(([x, y]) => ZC.tileFree(x, y));
      if (!goals.length || !ZC.goActor(a, goals)) { a.mood = null; z.snapCd = 10; return; }
    }
    ZC.stepActor(a, dt * 1.25);
  }

  // ---------- once per frame for the whole staff: reanimation timers ----------
  ZC.staffGlobalTick = function (dt) {
    let woke = false;
    for (const z of ZC.state.zombies) {
      if (!(z.revive > 0)) continue;
      z.revive -= dt;
      if (z.revive <= 0) {
        z.revive = 0;
        z.energy = Math.max(z.energy, Math.round(ZC.zMax(z) * CFG.raid.reviveEnergy));
        ZC.toast(`${z.name} foi reanimado, mas voltou fraco. Ele ainda precisa descansar.`, 'good');
        woke = true;
      }
    }
    if (woke) { ZC.syncZombies(); ZC.save(); }
  };
  // pay toxin to bring a knocked-out worker back right now (energy is still the low "revive" amount)
  ZC.reviveNow = function (z) {
    if (!(z.revive > 0)) return false;
    if (!ZC.spendToxin(CFG.raid.reviveToxin, 'reanimar')) { ZC.toast('Toxina insuficiente.', 'bad'); return false; }
    z.revive = 0.001;
    ZC.staffGlobalTick(1);
    return true;
  };
  // a brain fills the energy bar: paid once, applied once
  ZC.feedBrain = function (z) {
    if (z.chef || z.revive > 0 || z.energy >= ZC.zMax(z)) return false;
    if (!ZC.spendToxin(1, 'cérebro')) { ZC.toast('Toxina insuficiente.', 'bad'); return false; }
    z.energy = ZC.zMax(z); z.snapCd = 0;
    const a = ZC.zombieActor(z.id);
    if (a) { a.hungerT = null; a.warned = false; if (a.mood === 'distracted') a.mood = null; }
    ZC.save();
    return true;
  };

  ZC.fireStaff = function (z) {
    const s = ZC.state, i = s.zombies.indexOf(z);
    if (i < 0 || z.chef || z.away || z.revive > 0) return false;
    if (ZC.dragging && ZC.dragging() && ZC.dragging().a.id === z.id) ZC.dragCancel();
    const a = ZC.zombieActor(z.id);
    if (a) ZC.abortActor(a);
    s.zombies.splice(i, 1);
    ZC.syncZombies(); ZC.save();
    return true;
  };
})();
