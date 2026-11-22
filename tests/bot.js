// A bot that plays through the real game loop using only keys, with a fixed time step.
// In the dev console:  const { rig, newcomer } = await import("/tests/bot.js"); const b = rig(__game); b.tap("KeyW"); await newcomer(b)
// It is imperfect on purpose (reaction delay, 8 directions), so it says something about difficulty.

const ALL = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space'];
export function rig(g) {
  g.renderer.setLoop(null); g.renderer.render = () => {}; g.cam.blockers = [];
  g.time.tick = () => { g.time.delta = 1 / 60; g.time.elapsed += 1 / 60; return 1 / 60; };
  g.ui.fade = () => Promise.resolve();
  const I = g.input;
  const bot = {
    g, I, frames: 0,
    keys(dx, dz, run) {
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].forEach((k) => I.keys.delete(k));
      if (!dx && !dz) return;
      const y = g.cam.yaw, f = -Math.sin(y) * dx - Math.cos(y) * dz, r = Math.cos(y) * dx - Math.sin(y) * dz, l = Math.hypot(f, r);
      if (f / l > 0.38) I.keys.add('KeyW'); if (f / l < -0.38) I.keys.add('KeyS');
      if (r / l > 0.38) I.keys.add('KeyD'); if (r / l < -0.38) I.keys.add('KeyA');
      if (run) I.keys.add('ShiftLeft');
    },
    tap(k) { I.keys.add(k); I.pressed.add(k); this.step(); I.keys.delete(k); },
    step(n = 1) { for (let i = 0; i < n; i++) { g._tick(); this.frames++; } },
    async settle() { for (let i = 0; i < 400 && g.busy && !g.state.ended; i++) { this.step(); await new Promise((r) => setTimeout(r, 10)); } },
    go(x, z, { run = false, near = 0.35, secs = 25 } = {}) {
      const p = g.ctrl.pos;
      for (let i = 0; i < secs * 60; i++) { const dx = x - p.x, dz = z - p.z; if (Math.hypot(dx, dz) < near) { this.keys(); return true; } this.keys(dx, dz, run); this.step(); }
      this.keys(); return false;
    },
    path(list, o) { return list.every(([x, z]) => this.go(x, z, o)); },
    stop() { ALL.forEach((k) => I.keys.delete(k)); },
    until(fn, secs = 60) { for (let i = 0; i < secs * 60; i++) { if (fn()) return true; this.step(); } return false; },
  };
  return bot;
}

// Pest Patrol: react late, run in, crouch and pounce when it's about the right distance
export function pest(b, react = 18) {
  const g = b.g, p = g.ctrl.pos, C = g.challenges, c = C.active; let hold = 0, t = 0;
  while (C.active === c && t++ < 60 * 90) {
    const q = c.pests.filter((x) => !x.done && x.state === 'run' && x.t * 60 > 60 + react).sort((m, n) => Math.hypot(m.x - p.x, m.z - p.z) - Math.hypot(n.x - p.x, n.z - p.z))[0];
    if (!q) { const f = c.r.foodAt, d = Math.hypot(f.x - p.x, f.z - p.z); if (d > 1.2) b.keys(f.x - p.x, f.z - p.z); else b.keys(); if (hold) { b.I.keys.delete('Space'); hold = 0; } }
    else {
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      // b.aim: how far off (in metres) the bot thinks each animal is
      if (b.aim && (!q.ex || t % 40 === 0)) { q.ex = (Math.random() - 0.5) * 2 * b.aim; q.ez = (Math.random() - 0.5) * 2 * b.aim; }
      b.keys(q.x + (q.ex || 0) - p.x, q.z + (q.ez || 0) - p.z, d > 1.6 && !hold);
      if (!hold && d < 1.7 && g.ctrl.grounded) { b.I.keys.add('Space'); hold = 1; }
      else if (hold && (d < 1.1 || hold++ > 14)) { b.I.keys.delete('Space'); hold = 0; }
    }
    b.step();
  }
  b.stop();
  return { ...C.lastResult, caught: c.caught, stolen: c.stolen, secs: Math.round(t / 60) };
}

const done = (g, c, t, extra) => ({ ...g.challenges.lastResult, ...extra, secs: Math.round(t / 60) });

// The pattern: remember what lit up; `slip` is the chance of pressing the wrong one
export function pattern(b, react = 24, slip = 0) {
  const g = b.g, C = g.challenges, c = C.active; let t = 0, w = 0;
  while (C.active === c && t++ < 60 * 120) {
    if (c.phase === 'play' && ++w > react) { w = 0; const k = Math.random() < slip ? Math.floor(Math.random() * 4) : c.seq[c.i]; b.I.pressed.add(c.pads[k].keys[0]); }
    b.step();
  }
  b.stop(); return done(g, c, t, { round: c.round, mistakes: c.mistakes });
}

// The napkins. Told only where each one ended up (as if it had watched them fly)
export function hunt(b, go) {
  const g = b.g, p = g.ctrl.pos, C = g.challenges, c = C.active; let t = 0;
  while (C.active === c && t++ < 200) {
    if (!c.target || c.t < 3.2) { b.step(20); continue; }
    go(c.target, () => C.active !== c);
  }
  b.stop(); return done(g, c, t, { got: c.got, left: Math.round(c.left) });
}

// The race: run at each flag, jumping when it's higher; `slow` adds hesitation (frames) per flag
export function race(b, slow = 20) {
  const g = b.g, p = g.ctrl.pos, C = g.challenges, c = C.active; let t = 0, wait = 0, last = -1;
  while (C.active === c && t++ < 60 * 40) {
    if (c.ready > 0) { b.step(); continue; }
    const f = c.arrow || { x: p.x, y: p.y, z: p.z };
    if (c.i !== last) { last = c.i; wait = slow; }
    if (wait-- > 0) b.keys();
    else {
      const dx = f.x - p.x, dz = f.z - p.z, d = Math.hypot(dx, dz);
      // up the stair first: it opens from the street side
      if (c.i === 0 && p.z > 4.9 && Math.abs(p.x - 3.68) > 0.2) b.keys(3.68 - p.x, 5.2 - p.z, true);
      else if (c.i === 1 && p.z > 0.4 && p.x > 3.25 && p.y < 2.85) b.keys(3.7 - p.x, -1, true);
      else if (c.i === 1 && p.x > 3.2) b.keys(-1, (-0.3 - p.z) * 2, false);
      else if (c.i === 3 && p.y < 4.5 && p.z < -2.2) b.keys(2.3 - p.x, 1);
      else if (c.i === 4 && p.y < 5.5) b.keys(-1, (-3.0 - p.z) * 2);
      else b.keys(dx, dz, d > 1.4);
      if (f.y - p.y > 0.4 && (d < 1.7 || (c.i === 4 && p.x < 2.35)) && g.ctrl.grounded && c.i >= 2) b.I.pressed.add('Space');
    }
    b.step();
  }
  b.stop(); return done(g, c, t, { flags: c.i });
}
export function cans(b, slow = 12) {
  const g = b.g, p = g.ctrl.pos, C = g.challenges, c = C.active; let t = 0, wait = 0, cur = null;
  while (C.active === c && t++ < 60 * 45) {
    if (c.ready > 0) { b.step(); continue; }
    const k = cur && !cur.down ? cur : C.cans.filter((q) => !q.down).sort((m, n) => Math.hypot(m.at[0] - p.x, m.at[2] - p.z) - Math.hypot(n.at[0] - p.x, n.at[2] - p.z))[0];
    if (!k) { b.step(); continue; }
    if (k !== cur) { cur = k; wait = slow; }
    const dx = k.at[0] - p.x, dz = k.at[2] - p.z, d = Math.hypot(dx, dz);
    if (wait-- > 0) b.keys(); else b.keys(dx, dz, d > 1.2);
    if (k.at[1] - p.y > 0.35 && d < 1.1 && g.ctrl.grounded) b.I.pressed.add('Space');
    b.step();
  }
  b.stop(); return done(g, c, t, { n: c.n });
}
// the dog: walk, steer around litter when it's noticed in time, stop when the noise gets high
export function dogGame(b, limit = 0.7, care = 1) {
  const g = b.g, p = g.ctrl.pos, C = g.challenges, c = C.active; let t = 0, hold = false;
  while (C.active === c && t++ < 60 * 80) {
    if (c.ready > 0 || !c.arrow) { b.step(); continue; }
    if (c.noise > limit) hold = true; if (c.noise < 0.15) hold = false;
    let dx = c.arrow.x - p.x, dz = c.arrow.z - p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    if (care) for (const q of c.litter) { const ex = p.x - q.x, ez = p.z - q.z, d = Math.hypot(ex, ez); if (d < 0.75) { const k = care * (0.75 - d) * 2.4 / (d || 1); dx += ex * k; dz += ez * k * 0.4; } }
    if (hold) b.keys(); else b.keys(dx, dz);
    b.step();
  }
  b.stop(); return done(g, c, t, { noise: +c.noise.toFixed(2), carry: c.carry });
}

// A newcomer: knows nothing but the goal line and the warnings. Presses Q or E when told to,
// walks where the arrow points, sits still to listen, retries what it loses.
const ALLEY = [[-11.7, 7.95], [-11.7, 5.0]], YARD = [[-11.7, 7.95], [-12.4, 4], [-12.5, -4.8], [-14, -5.6]];
export async function newcomer(b, o = {}) {
  const { aim = 1.2, react = 30, slip = 0.05, secrets = true, who = null, maxTries = 8 } = o;
  const g = b.g, S = g.state, Y = g.story, p = g.ctrl.pos, log = [], stat = { warn: 0, safe: 0, caught: 0 }, tries = {}; b.aim = aim; b.log = log; let last = '', out = false;
  const clock = () => Math.round(b.frames / 60);
  const note = (t) => { if (t !== last) { last = t; log.push(`${clock()}s h${S.hour.toFixed(1)} ${t}`); } };
  const D = g.dangers, up = D.update.bind(D);
  D.update = (...a) => { const e = up(...a); if (e && e.type in stat) { stat[e.type]++; note(`${e.kind} ${e.type}`); } return e; };
  const people = () => [...g.residents.list.map((r) => r.actor.pos), ...g.market.vendors.filter((v) => v.h.object3d.visible).map((v) => v.h.object3d.position)].sort((m, n) => Math.hypot(m.x - p.x, m.z - p.z) - Math.hypot(n.x - p.x, n.z - p.z));
  const flee = () => { const q = people()[0]; if (q && Math.hypot(q.x - p.x, q.z - p.z) > 1) b.keys(q.x - p.x, q.z - p.z, true); else b.keys(); b.step(); };
  const toward = (x, z, secs, near = 0.5, stop = null) => {
    let still = 0;
    for (let i = 0; i < secs * 60 && !S.ended && !g.busy && !(stop && stop()); i++) {
      if (D.state === 'warn' || D.state === 'chase') { if (D.state === 'chase' || D.t < 2.4) { flee(); continue; } }
      const dx = x - p.x, dz = z - p.z; if (Math.hypot(dx, dz) < near) break;
      if (still > 25) { const s = Math.random() < 0.5 ? 1 : -1; for (let k = 0; k < 40 && !(stop && stop()); k++) { b.keys(-dz * s + dx * 0.2, dx * s + dz * 0.2); if (k === 5) b.I.pressed.add('Space'); b.step(); } still = 0; }
      const ox = p.x, oz = p.z; b.keys(dx, dz, Math.hypot(dx, dz) > 4); b.step(); still = Math.hypot(p.x - ox, p.z - oz) < 0.004 ? still + 1 : 0;
    }
    b.keys();
  };
  const visit = (t, stop) => {
    if (p.z < 4.6 && t.z > 4.6 && p.x < -9) for (const q of YARD.slice().reverse()) toward(q[0], q[1], 8, 0.5, stop);
    if (p.y > 2 && t.y < 2) { toward(2.6, 1.0, 4, 0.5, stop); toward(3.0, -0.3, 4, 0.4, stop); toward(3.7, 0.0, 4, 0.4, stop); toward(3.7, 5.2, 6, 0.4, stop); }
    if (t.z < 0) { if (p.z > 4) for (const q of YARD) toward(q[0], q[1], 14, 0.4, stop); }
    else if (t.y > 2) { toward(p.x, 7.95, 4, 0.6, stop); toward(3.68, 7.9, 20, 0.3, stop); toward(3.68, 5.1, 5, 0.25, stop); toward(3.7, 0.0, 8, 0.3, stop); toward(3.0, -0.3, 4, 0.4, stop); }
    else { if (Math.abs(p.z - 7.95) > 1.2 && Math.abs(p.x - t.x) > 2) toward(p.x, 7.95, 4, 0.5, stop); if (Math.abs(p.x - t.x) > 1.5) toward(t.x, 7.95, 12, 0.8, stop); }
    toward(t.x, t.z, 5, 0.3, stop);
  };
  const play = (c) => (c.type === 'pest' ? pest(b, react) : c.type === 'pattern' ? pattern(b, react, slip) : c.type === 'hunt' ? hunt(b, visit) : c.type === 'race' ? race(b, react / 2) : c.type === 'cans' ? cans(b, react / 2) : dogGame(b, 0.7, 1));
  // wander past the hidden places first
  if (secrets) for (const q of [[-11.7, 6.2], [-12.5, 3.4], [-12.6, -4.2], [-12.5, 3.4], [-11.7, 7.9], [3.6, 7.6]]) { if (D.busy) break; toward(q[0], q[1], 14, 0.5); await new Promise((r) => setTimeout(r)); }
  let guard = 0;
  while (!S.ended && guard++ < 4000 && clock() < 1500) {
    await new Promise((r) => setTimeout(r));
    if (g.busy) { await b.settle(); b.step(); continue; }
    if (D.state === 'warn' || D.state === 'chase') { flee(); continue; }
    if (g.ending) { b.step(50); const e = g.ending; b.tap(e.won || (tries[e.type] || 0) < maxTries ? 'KeyE' : 'Space'); continue; }
    const c = g.challenges.active;
    if (c) { const q = play(c); tries[c.type] = (tries[c.type] || 0) + 1; note(`${c.type} ${q.won ? 'WON' : 'lost'} ${JSON.stringify(q)}`); continue; }
    if (Y.phase === 'name') { b.step(10); continue; }
    if (Y.phase === 'choose' && who) { const r = g.residents.get(who); if (r.actor.distTo(p) < 2.6 && g.act) { b.tap('KeyE'); continue; } visit({ x: r.actor.pos.x, y: 0, z: r.actor.pos.z + (who === 'taquero' ? -1.8 : 1.6) }, () => r.actor.distTo(p) < 2.4); continue; }
    if (Y.phase === 'play' && !Y.smelled) { b.tap('KeyQ'); continue; }
    const goal = g.goal; if (!goal) { b.step(); continue; }
    note(goal.text);
    const cur = Y.current;
    if (secrets && Y.phase === 'play' && cur && !cur.d && Y.secrets.some((q) => q.found && !q.won && (tries[q.id] || 0) < maxTries)) { b.tap('KeyQ'); b.step(2); continue; }
    if (Y.phase === 'play' && cur && cur.d && (tries[cur.id] || 0) >= maxTries) { b.tap('KeyQ'); b.step(5); continue; }
    if (Y.phase === 'play' && cur && cur.c && !Y.conv(cur.c).done && !goal.target) { b.keys(); b.step(30); continue; }
    if (g.act && !(/latas|perro|gato/.test(g.act.text) && cur && !cur.d)) { b.tap('KeyE'); continue; }
    const t = goal.target;
    if (!t) { b.step(30); continue; }
    if (Y.phase === 'home') { const d = Math.hypot(t.x - p.x, t.z - p.z); if (d > 1.5) toward(t.x, t.z, 2, 1.4); else b.step(5); continue; }
    visit(t, () => g.act && !(/latas|perro|gato/.test(g.act.text) && cur && !cur.d));
  }
  b.stop(); D.update = up;
  return { ended: S.ended, secs: clock(), stat, tries, won: [...Y.stalls, ...Y.secrets].filter((q) => q.won).map((q) => q.id + ':' + q.best), heard: S.heard, log };
}
