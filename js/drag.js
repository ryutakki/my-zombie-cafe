// Picking a zombie up and carrying it around: the body dangles from the grip like a pendulum.
(() => {
  const ZC = window.ZC;
  const L = 74;          // grip -> feet
  let D = null;
  ZC.dragging = () => D;

  ZC.dragStart = function (a, wx, wy) {
    ZC.abortActor(a);
    a.held = true; a.working = null; a.moving = false; a.path = null; a.carry = null;
    D = { a, tx: wx, ty: wy, px: wx, py: wy, pvx: 0, ang: 0, av: 0, legT: 0, lift: 0 };
    ZC.fx(a.x + 0.5, a.y + 0.2, '!', '#ffd84a');
  };
  ZC.dragMove = function (wx, wy) { if (D) { D.tx = wx; D.ty = wy; } };
  ZC.dragCancel = function () { if (D) { D.a.held = false; ZC.dropZombie(D.a, D.a.x, D.a.y); D = null; } };
  ZC.dragEnd = function () { const d = D; D = null; return d; };

  ZC.updateDrag = function (dt) {
    if (!D || dt <= 0) return;
    const ox = D.px;
    const k = 1 - Math.exp(-dt * 16);            // the grip lags a little behind the pointer
    D.px += (D.tx - D.px) * k; D.py += (D.ty - D.py) * k;
    const vx = (D.px - ox) / dt;
    const ax = Math.max(-5000, Math.min(5000, (vx - D.pvx) / dt)); D.pvx = vx;
    const g = 1600, damp = 2.2, n = 4;
    for (let i = 0; i < n; i++) {                // pendulum driven by the horizontal acceleration of the grip
      const h = dt / n;
      const acc = -(g / L) * Math.sin(D.ang) - (ax / L) * Math.cos(D.ang) - damp * D.av;
      D.av += acc * h; D.ang += D.av * h;
    }
    D.ang = Math.max(-1.3, Math.min(1.3, D.ang));
    D.legT += dt * (1 + Math.min(3, Math.abs(vx) / 200));
    D.lift = Math.min(1, D.lift + dt * 8);
  };

  // drawn on top of everything, in world coordinates
  ZC.drawDragged = function (ctx, t) {
    if (!D) return;
    const a = D.a, s = ZC.ACTOR_SCALE, lift = D.lift;
    ZC.shadowEll(ctx, D.tx, D.ty + 4, 20 - lift * 2, 9);
    ctx.save();
    ctx.translate(D.px, D.py - L + (1 - lift) * 10);
    ctx.rotate(D.ang);
    const stretch = 1 + Math.min(0.1, Math.abs(D.av) * 0.012);
    ctx.scale(1 / stretch, stretch);
    ZC.drawSprite(ctx, a.sprite, 'walk_front', D.legT * 1.4, 0, L, s, { tint: a.tint });
    ctx.restore();
    ZC.ink(ctx, 3); ctx.fillStyle = '#ffd84a';
    ctx.beginPath(); ctx.arc(D.px, D.py - L - 2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
})();
