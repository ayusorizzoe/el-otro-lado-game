// The games. Each says what it takes to win before it starts, can be lost, and can be tried
// again at once; each ends on a panel that says how it went, and once won it is done. They happen in the street itself.
//
//  for the collar:  pest (taquero)  hunt (pan)  pattern (celulares)
//  hidden:          race (roofs)    cans (courtyard)   dog (alley)

import * as THREE from 'three';
import { collision } from '../systems/CollisionSystem.js';
import { CANS, CHALLENGE, NAPKIN_SPOTS, RACE, SECRETS } from '../narrative/Content.js';
import { Cat } from '../entities/Cat.js';
import { makeDog } from '../world/Dangers.js';

const PEST = { need: 8, secs: 60, maxStolen: 5, tell: 1.0 };
const PATTERN = { rounds: [4, 5, 6, 7], mistakes: 3 };
const HUNT = { need: 5, secs: 75 };
const CAN = { need: 10, secs: 18 };
const DOG = { x: -11.8, z: -2.3, secs: 60, exit: 4.4 };
const LOW = new Set(['pest', 'hunt', 'pattern', 'race', 'dog']);          // games where a smaller result is better
const PADS = [                                   // up, left, down, right — as the keys sit
  { keys: ['KeyW', 'ArrowUp'], x: 0, z: -0.88, hex: 0xffd34d, f: 523 },
  { keys: ['KeyA', 'ArrowLeft'], x: -0.8, z: 0.1, hex: 0x4dc3ff, f: 392 },
  { keys: ['KeyS', 'ArrowDown'], x: 0, z: 0.82, hex: 0xff7a5c, f: 330 },
  { keys: ['KeyD', 'ArrowRight'], x: 0.8, z: 0.1, hex: 0x7dff8a, f: 440 },
];

export class Challenges {
  constructor(scene, materials, game) {
    this.scene = scene; this.M = materials; this.game = game;
    this.active = null;
    this.mesh = (geo, hex) => { const m = new THREE.Mesh(geo, materials.color(hex)); m.castShadow = true; return m; };
    // where a pounce will land: a soft dark spot on the ground
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(0.24, 18), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
    this.spot.rotation.x = -Math.PI / 2; this.spot.visible = false;
    scene.add(this.spot);
    this.reach = 0;              // 1 once the cat has learned to pounce farther
    // the hidden games' inhabitants: a rival by the stair, a dog asleep in the alley
    this.rival = new Cat({ ...materials, catCoat: materials.color(0xb5652a), catEye: materials.catEye, dark: materials.dark, glint: materials.glint });
    this.rival.object3d.scale.setScalar(1.2); scene.add(this.rival.object3d);
    this.sleeper = makeDog(materials); this.sleeper.legs.forEach((l, k) => { l.rotation.x = k < 2 ? -1.4 : 1.4; l.position.y = 0.2; });
    this.sleeper.g.children.forEach((m) => { if (!this.sleeper.legs.includes(m)) m.position.y -= 0.3; });
    this.sleeper.g.position.set(DOG.x, 0, DOG.z); this.sleeper.g.rotation.y = 0.15; scene.add(this.sleeper.g);
    this.bone = new THREE.Group(); { const b = this.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), 0xf2ead8); b.rotation.z = Math.PI / 2; this.bone.add(b); for (const sx of [1, -1]) for (const sy of [1, -1]) { const k = this.mesh(new THREE.IcosahedronGeometry(0.028, 0), 0xf2ead8); k.position.set(sx * 0.085, sy * 0.02, 0); this.bone.add(k); } }
    this.resetBone();
    // the cans stand in the courtyard from the start
    this.cans = CANS.map((at, i) => {
      const m = new THREE.Group(), c = [0xd0312a, 0x2f7ad0, 0x2f9a56, 0xf0b429][i % 4];
      const b = this.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 10), c); b.position.y = 0.085; m.add(b);
      for (const y of [0.006, 0.168]) { const r = this.mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.012, 10), 0xc8ccd0); r.position.y = y; m.add(r); }
      scene.add(m); return { m, at, down: false, v: null };
    });
    this.resetCans();
    this.flags = RACE.flags.map(([x, y, z], i) => {
      const m = new THREE.Group();
      const pole = this.mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5), 0xd8d4c8); pole.position.y = 0.55;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshStandardMaterial({ color: i === RACE.flags.length - 1 ? 0xffc21a : 0xff3d7f, side: THREE.DoubleSide, emissive: 0xff3d7f, emissiveIntensity: 0.25 })); cloth.position.set(0.22, 0.95, 0);
      m.add(pole, cloth); m.position.set(x, y, z); m.visible = false; m.cloth = cloth; scene.add(m); return m;
    });
  }
  resetBone() { this.scene.add(this.bone); this.bone.position.set(DOG.x + 0.35, 0.05, DOG.z + 0.95); this.bone.rotation.set(0, 0.6, 0); this.bone.scale.setScalar(1); this.bone.visible = true; }
  resetCans() { for (const c of this.cans) { c.down = false; c.v = null; c.m.position.set(...c.at); c.m.rotation.set(0, 0, 0); } }
  scoreText(type, v) { return type === 'cans' ? `${v} latas` : type === 'pattern' ? `${v} errores` : `${v} s`; }

  start(r, type) {
    const g = this.game;
    this.active = { type, r, t: 0, ready: 2.6, things: [], how: CHALLENGE[type].how, low: LOW.has(type), scoreText: (v) => this.scoreText(type, v), ...this['make_' + type](r) };
    g.ui.toast('');
    g.residents.speak(r, r.def.lines[type], 3.5);
    g.ctrl.frozen = true; g.ctrl.vel.set(0, 0, 0);
    g.ui.card(CHALLENGE[type].title, CHALLENGE[type].win);
  }

  // quiet: interrupted (walked off, fell asleep), which costs nothing
  finish(won, quiet = false) {
    const c = this.active, g = this.game, r = c.r;
    this.active = null;
    this.spot.visible = false; this.charge = 0; this.wasHeld = false;
    g.ctrl.speedScale = 1; g.ctrl.crouchHold = 0; g.ctrl.frozen = false;
    g.ui.card(null);
    c.things.forEach((t) => t.removeFromParent());
    if (c.end) c.end();
    (c.pests || []).forEach((p) => p.m.removeFromParent());
    g.ui.setChallenge(''); g.ui.setWatch(0);
    if (quiet) g.ui.flash(CHALLENGE.left, 'info', 2);
    else {
      if (won) { g.residents.speak(r, r.def.won[c.type], 4.5); g.audio.good(); g.audio.purr(); } else { g.residents.speak(r, r.def.lost, 3.5); g.audio.bad(); }
      // the game stops here: a panel says whether it was won, why, and what comes next
      g.showResult({ r, type: c.type, won, ...g.story.result(c, won, won ? c.score() : 0) });
    }
    this.lastResult = { key: r.key, type: c.type, won };
  }
  cancel() { if (this.active) this.finish(false, true); }

  // a small result inside a challenge: always visible, always audible
  hit(text) { this.game.ui.flash(text, 'good'); this.game.audio.good(); }
  miss(text) { this.game.ui.flash(text, 'bad'); this.game.audio.bad(); }

  // ---------------------------------------------------------------- rats
  make_pest(r) {
    const f = r.foodAt, pts = [], things = [];
    for (let k = 0; k < 60 && pts.length < 6; k++) {
      const a = (k * 2.399) % (Math.PI * 2), d = 2.4 + (k % 4) * 0.35;
      const x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d;
      if (collision.resolve(x, z, 0.2, 0.12, 0.3, 0.6).blocked || collision.groundAt(x, z, 1) > 0.3) continue;
      let clear = true;
      for (let t = 0.1; t < 1; t += 0.1) if (collision.resolve(x + (f.x - x) * t, z + (f.z - z) * t, 0.08, 0.12, 0.3, 0.1).blocked) clear = false;
      if (!clear || pts.some((p) => Math.hypot(p.x - x, p.z - z) < 1.1)) continue;
      const bag = k % 2 ? this.mesh(new THREE.BoxGeometry(0.34, 0.2, 0.28), 0xb98b4f) : this.mesh(new THREE.IcosahedronGeometry(0.17, 0), 0x3b3d44);
      const y = collision.groundAt(x, z, 0.5);
      bag.position.set(x, y + 0.1, z); bag.rotation.y = a;
      this.scene.add(bag); things.push(bag);
      pts.push({ x, z, y, bag });
    }
    // what they're after: a tray of meat
    const food = new THREE.Group();
    const tray = this.mesh(new THREE.BoxGeometry(0.56, 0.04, 0.4), 0xb9b2a2); tray.position.y = 0.1; food.add(tray);
    const under = this.mesh(new THREE.BoxGeometry(0.44, 0.1, 0.3), 0xc23b2e); under.position.y = 0.04; food.add(under);
    const bits = [];
    for (let i = 0; i < PEST.maxStolen + 1; i++) { const b = this.mesh(new THREE.BoxGeometry(0.15, 0.05, 0.1), i % 2 ? 0x9a4a2a : 0xb5623a); b.position.set(-0.18 + (i % 3) * 0.18, 0.14, i < 3 ? -0.08 : 0.08); b.rotation.y = i * 0.7; food.add(b); bits.push(b); }
    // what to protect: a ring on the ground and an arrow over it
    const glow = (hex, o = {}) => new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide, ...o });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 36), glow(0xffc21a, { transparent: true, opacity: 0.85, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; food.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), glow(0xffc21a)); arrow.rotation.x = Math.PI; arrow.position.y = 0.75; food.add(arrow);
    food.position.set(f.x, collision.groundAt(f.x, f.z, 0.5), f.z);
    this.scene.add(food); things.push(food);
    return { food, bits, ring, arrowMesh: arrow, pts, things, pests: [], spawned: 0, caught: 0, stolen: 0, next: 3.0, last: -1, need: PEST.need, boss: null, score() { return Math.round(this.t); } };
  }

  ratMesh(big) {
    const g = new THREE.Group(), c = big ? 0x6a5a4c : 0x94836f;
    const b = this.mesh(new THREE.SphereGeometry(0.075, 7, 5), c); b.scale.set(big ? 1.15 : 0.85, big ? 1.1 : 0.8, 1.6); b.position.y = 0.06;
    const h = this.mesh(new THREE.ConeGeometry(0.045, 0.12, 6), c); h.rotation.x = Math.PI / 2; h.position.set(0, 0.06, 0.15);
    const t = this.mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.24, 4), 0xc98f8f); t.rotation.x = Math.PI / 2; t.position.set(0, 0.04, -0.22);
    g.add(b, h, t);
    for (const s of [1, -1]) { const e = this.mesh(new THREE.SphereGeometry(0.024, 5, 4), 0xc98f8f); e.position.set(s * 0.032, 0.11, 0.1); g.add(e); }
    if (big) g.scale.setScalar(2.1);
    return g;
  }

  update_pest(c, dt, input, cat) {
    const g = this.game, ctrl = g.ctrl, f = c.r.foodAt;
    const held = input.down('Space');
    if (held && ctrl.grounded) this.charge = Math.min(1, (this.charge || 0) + dt / 0.6);
    const reach = 0.9 + (1.5 + 0.8 * this.reach) * (this.charge || 0);
    this.spot.visible = held && ctrl.grounded;
    if (this.spot.visible) {
      const sx = cat.x + Math.sin(ctrl.yaw) * reach, sz = cat.z + Math.cos(ctrl.yaw) * reach;
      this.spot.position.set(sx, collision.groundAt(sx, sz, cat.y + 0.4) + 0.03, sz);
    }
    ctrl.speedScale = held ? 0.45 : 1; ctrl.crouchHold = held ? 1 : 0;
    if (!held && this.wasHeld && ctrl.grounded) { ctrl.pounce(reach); this.charge = 0; }
    this.wasHeld = held;

    c.next -= dt;
    const bossDue = c.caught >= c.need && !c.boss;
    if (c.next <= 0 && !c.boss) {
      // they come from where the camera is looking, so you can see them start
      const cam = g.cam.camera, e = cam.matrixWorld.elements, fx = -e[8], fz = -e[10], fl = Math.hypot(fx, fz) || 1;
      const seen = c.pts.map((p, k) => { const px = p.x - cam.position.x, pz = p.z - cam.position.z; return { k, a: (px * fx + pz * fz) / (fl * (Math.hypot(px, pz) || 1)) }; }).filter((o) => o.k !== c.last).sort((m, n) => n.a - m.a);
      const good = seen.filter((o) => o.a > 0.82), from = good.length ? good : seen.slice(0, 2);
      const i = from[Math.floor(Math.random() * from.length)].k;
      c.last = i; const p = c.pts[i];
      const m = this.ratMesh(bossDue);
      m.position.set(p.x, p.y, p.z); m.visible = false;
      this.scene.add(m);
      const q = { m, p, x: p.x, z: p.z, state: 'tell', t: 0, done: false, hp: bossDue ? 3 : 1, stun: 0 };
      if (bossDue) { c.boss = q; for (const o of c.pests) { o.done = true; o.m.visible = false; } for (const t of c.pts) if (t !== p) t.bag.rotation.z = 0; g.ui.flash('¡La rata gorda! Tres golpes', 'info', 1.8); }
      c.pests.push(q); c.spawned++; c.next = c.spawned % 4 === 3 ? 0.4 : Math.max(1.5, 2.7 - c.spawned * 0.09);      // every fourth brings a friend
      g.audio.rustle(g.pan({ x: p.x, y: 0.2, z: p.z }));
    }
    for (const q of c.pests) {
      if (q.done) continue;
      q.t += dt; q.stun -= dt;
      const boss = q === c.boss;
      if (q.state === 'tell') {
        q.p.bag.rotation.z = Math.sin(q.t * 45) * 0.2; q.p.bag.position.x = q.p.x + Math.sin(q.t * 60) * 0.02;
        if (q.t > PEST.tell) { q.state = 'run'; q.m.visible = true; q.p.bag.rotation.z = 0; q.p.bag.position.x = q.p.x; }
        continue;
      }
      const dx = f.x - q.x, dz = f.z - q.z, l = Math.hypot(dx, dz) || 1, wig = Math.sin(q.t * 9 + q.p.x) * 0.25;
      let vx = (dx / l) + (-dz / l) * wig, vz = (dz / l) + (dx / l) * wig, speed = boss ? 1.0 : 1.35 + Math.min(0.35, c.caught * 0.04);
      if (q.stun > 0) { vx = q.kx; vz = q.kz; speed = 4.2 * q.stun; }
      const s = collision.resolve(q.x + vx * speed * dt, q.z + vz * speed * dt, 0.08, 0.12, 0.3, 0.1); q.x = s.x; q.z = s.z;
      q.m.position.set(q.x, collision.groundAt(q.x, q.z, 0.5) + (q.stun > 0 ? Math.sin(Math.max(0, q.stun) * 4) * 0.2 : 0), q.z);
      q.m.rotation.y = Math.atan2(vx, vz) + (q.stun > 0 ? q.stun * 12 : 0);
      const d = Math.hypot(cat.x - q.x, cat.z - q.z), pouncing = ctrl.lungeT > -0.18;
      // you have to go for them: sitting on the meat doesn't catch anything
      if (q.stun <= 0 && (pouncing || ctrl.speed > 0.8) && d < (pouncing ? 0.65 + 0.25 * this.reach : 0.3) + (boss ? 0.2 : 0) && cat.y < 1.1) {
        q.hp--;
        if (q.hp > 0 && boss) { q.stun = 0.75; q.kx = -dx / l; q.kz = -dz / l; this.hit(`¡Zas! faltan ${q.hp}`); g.audio.squeak(); }
        else { q.done = true; q.m.visible = false; g.audio.squeak(); if (boss) c.fat = true; else { c.caught++; if (c.caught === c.need) c.next = 0.9; this.hit(`¡Atrapada! ${c.caught}/${c.need}`); } }
      } else if (l < 0.3 && q.stun <= 0) {
        c.stolen++; c.alarm = 0.8; const bit = c.bits.pop(); if (bit) bit.removeFromParent();
        this.miss(`¡Se llevó carne! ${c.stolen}/${PEST.maxStolen + 1}`);
        if (boss) { q.stun = 0.9; q.kx = Math.cos(q.t * 7); q.kz = Math.sin(q.t * 7); } else { q.done = true; q.m.visible = false; }
      }
    }
    // the ring turns red when a rat is close to the meat
    const close = c.pests.some((q) => !q.done && q.state === 'run' && q.stun <= 0 && Math.hypot(q.x - f.x, q.z - f.z) < 1.1);
    c.alarm = Math.max(0, (c.alarm || 0) - dt);
    const hot = close || c.alarm > 0;
    c.ring.material.color.set(hot ? 0xff3a22 : 0xffc21a); c.arrowMesh.material.color.set(hot ? 0xff3a22 : 0xffc21a);
    c.ring.scale.setScalar(hot ? 1 + Math.sin(c.t * 18) * 0.08 : 1);
    c.arrowMesh.position.y = 0.75 + Math.sin(c.t * 4) * 0.06; c.arrowMesh.rotation.y += dt * 2;
    c.mark = `${CHALLENGE.pest.meat} ${c.bits.length}/${PEST.maxStolen + 1}`;
    const left = PEST.secs - c.t;
    g.ui.setChallenge(`${c.boss ? `ÚLTIMA: la rata gorda   ·   golpes ${3 - Math.max(0, c.boss.hp)}/3` : `ratas ${c.caught}/${c.need}`}   ·   ${Math.max(0, Math.ceil(left))} s`, c.how);
    if (c.fat) return this.finish(true);
    if (c.stolen > PEST.maxStolen || left <= 0) { c.why = left <= 0 ? CHALLENGE.time : CHALLENGE.pest.robbed; return this.finish(false); }
    if (Math.hypot(cat.x - f.x, cat.z - f.z) > 10) this.finish(false, true);
  }

  // ---------------------------------------------------------------- the napkins: hot and cold
  make_hunt(r) {
    const pool = NAPKIN_SPOTS.slice().sort(() => Math.random() - 0.5), high = pool.filter((s) => s[1] > 0.6).slice(0, 1), low = pool.filter((s) => s[1] <= 0.6);
    const things = [], items = high.concat(low).slice(0, HUNT.need).map((s, i) => {
      const m = new THREE.Group();
      const hex = [0xf2d8e6, 0xffe9a8, 0xcfe9ff, 0xd9f2c4, 0xffd0b8][i];
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34, 4, 4), new THREE.MeshStandardMaterial({ color: hex, side: THREE.DoubleSide, roughness: 0.9, emissive: hex, emissiveIntensity: 0.25 }));
      const flower = new THREE.Mesh(new THREE.CircleGeometry(0.07, 6), new THREE.MeshStandardMaterial({ color: 0xc23b6e, side: THREE.DoubleSide, roughness: 0.9 })); flower.position.z = 0.012;
      cloth.castShadow = true; cloth.add(flower); cloth.rotation.x = -Math.PI / 2 + 0.25; m.add(cloth);
      const from = { x: r.mark.x + (i - 2) * 0.25, y: 1.0, z: r.mark.z + 0.6 };
      m.position.set(from.x, from.y, from.z);
      this.scene.add(m); things.push(m);
      return { m, cloth, from, to: { x: s[0], y: s[1], z: s[2] }, fly: -0.25 * i, dur: 3.2, got: false, hopped: false, seed: i * 2.1 };
    });
    return { things, items, got: 0, left: HUNT.secs, score() { return HUNT.secs - Math.floor(this.left); } };
  }

  update_hunt(c, dt, input, cat) {
    const g = this.game;
    c.t += dt;
    if (c.t > 3) c.left -= dt;
    let best = null, bd = Infinity;
    for (const n of c.items) {
      if (n.got) continue;
      if (n.fly < n.dur) {
        n.fly += dt;
        const k = Math.max(0, Math.min(1, n.fly / n.dur)), e = k * k * (3 - 2 * k), arc = Math.sin(k * Math.PI) * (n.dur > 2 ? 2.4 : 0.9);
        n.m.position.set(n.from.x + (n.to.x - n.from.x) * e, n.from.y + (n.to.y + 0.12 - n.from.y) * e + arc, n.from.z + (n.to.z - n.from.z) * e);
        n.m.rotation.y += dt * 7; n.cloth.rotation.x = -Math.PI / 2 + Math.sin(c.t * 9 + n.seed) * 0.7;
      } else {
        n.m.position.y = n.to.y + 0.12 + Math.abs(Math.sin(c.t * 3 + n.seed)) * 0.06;
        n.cloth.rotation.x = -Math.PI / 2 + 0.25 + Math.sin(c.t * 5 + n.seed) * 0.15;
        const d = Math.hypot(cat.x - n.to.x, cat.z - n.to.z), h = Math.abs(cat.y - n.to.y);
        // the wind snatches it once, just as you reach for it
        if (!n.hopped && d < 1.0 && h < 0.6 && n.to.y < 0.6) {
          n.hopped = true;
          const a = Math.atan2(n.to.x - cat.x, n.to.z - cat.z) + (Math.random() - 0.5);
          const s = collision.resolve(n.to.x + Math.sin(a) * 1.5, n.to.z + Math.cos(a) * 1.5, 0.35, n.to.y, 0.3, 0.5);
          if (collision.groundAt(s.x, s.z, n.to.y + 0.5) < 0.3) { n.from = { x: n.to.x, y: n.to.y + 0.12, z: n.to.z }; n.to = { x: s.x, y: collision.groundAt(s.x, s.z, n.to.y + 0.3), z: s.z }; n.fly = 0; n.dur = 0.8; g.audio.flutter(); }
        } else if (d < 0.6 && h < 0.7) { n.got = true; n.m.visible = false; c.got++; this.hit(`¡Una servilleta! ${c.got}/${HUNT.need}`); continue; }
      }
      const d = Math.hypot(cat.x - n.to.x, cat.z - n.to.z, (cat.y - n.to.y) * 1.5);
      if (d < bd) { bd = d; best = n; }
    }
    const heat = bd < 2 ? 4 : bd < 5 ? 3 : bd < 9 ? 2 : bd < 15 ? 1 : 0;
    c.heat = heat; c.target = best && best.fly >= best.dur ? best.to : null;
    // a quicker tick the closer you are
    c.tick = (c.tick || 0) - dt;
    if (best && c.t > 3.2 && c.tick <= 0) { c.tick = [2.2, 1.5, 0.9, 0.5, 0.22][heat]; g.audio.note(220 + heat * 110, 0.05, 0.025); }
    g.ui.setChallenge(c.t < 3.2 ? 'mira hacia dónde vuelan…' : `servilletas ${c.got}/${HUNT.need}   ·   ${CHALLENGE.hunt.heat[heat]}   ·   ${Math.max(0, Math.ceil(c.left))} s`, c.how, ['#8fb8ff', '#b9d0ff', '#ffe2a0', '#ffb469', '#ff7a5c'][heat]);
    if (c.got >= HUNT.need) this.finish(true);
    else if (c.left <= 0) this.finish(false);
  }

  // ---------------------------------------------------------------- the pattern: paws on phones
  make_pattern(r) {
    const cx = r.foodAt.x, cz = r.foodAt.z, g = this.game;
    const root = new THREE.Group(); root.position.set(cx, collision.groundAt(cx, cz, 0.4) + 0.01, cz);
    const cloth = this.mesh(new THREE.BoxGeometry(2.3, 0.02, 2.4), 0x3a3f5c); root.add(cloth);
    const pads = PADS.map((p) => {
      const ph = new THREE.Group(); ph.position.set(p.x, 0.03, p.z);
      const body = this.mesh(new THREE.BoxGeometry(0.28, 0.035, 0.5), 0x101014);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.42), new THREE.MeshStandardMaterial({ color: p.hex, roughness: 0.5, emissive: p.hex, emissiveIntensity: 0.12 })); screen.position.y = 0.022;
      const key = g.ui.label(p.keys[0].slice(3)); key.position.set(0, 0.034, 0); key.rotation.x = -Math.PI / 2; key.scale.setScalar(0.2);
      ph.add(body, screen, key); root.add(ph);
      return { ...p, screen, ph, glow: 0 };
    });
    this.scene.add(root);
    g.ctrl.place(cx, root.position.y + 0.02, cz, Math.PI); g.ctrl.vel.set(0, 0, 0);
    return { things: [root], pads, round: 0, seq: this.sequence(PATTERN.rounds[0]), i: 0, phase: 'show', wait: 0.8, mistakes: 0, frozen: true, score() { return this.mistakes; } };
  }
  sequence(n) { const s = []; while (s.length < n) { const k = Math.floor(Math.random() * 4); if (k !== s[s.length - 1] || Math.random() < 0.2) s.push(k); } return s; }

  update_pattern(c, dt, input) {
    const g = this.game;
    // look straight down the cloth, toward the stall, so the keys match the phones
    let dy = -g.cam.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    g.cam.yaw += dy * Math.min(1, 5 * dt); g.cam.pitch += (0.95 - g.cam.pitch) * Math.min(1, 4 * dt);
    c.wait -= dt;
    const light = (k) => { c.pads[k].glow = 1; g.audio.note(c.pads[k].f, 0.09, 0.3); };
    if (c.phase === 'show') {
      if (c.wait <= 0) {
        if (c.i < c.seq.length) { light(c.seq[c.i++]); c.wait = 0.68 - c.round * 0.06; }
        else { c.phase = 'play'; c.i = 0; g.ui.flash('¡Te toca!', 'info', 0.9); }
      }
    } else if (c.phase === 'play') {
      const k = c.pads.findIndex((p) => input.hit(...p.keys));
      if (k >= 0) {
        g.ctrl.yaw = Math.atan2(c.pads[k].x, c.pads[k].z); g.cat.paw(); light(k);
        if (k === c.seq[c.i]) {
          c.i++;
          if (c.i === c.seq.length) {
            c.round++;
            if (c.round >= PATTERN.rounds.length) return this.finish(true);
            this.hit(`¡Bien! ronda ${c.round + 1} de ${PATTERN.rounds.length}`);
            c.seq = this.sequence(PATTERN.rounds[c.round]); c.phase = 'show'; c.i = 0; c.wait = 1.5;
          }
        } else {
          c.mistakes++;
          if (c.mistakes >= PATTERN.mistakes) return this.finish(false);
          this.miss('Esa no. Mira otra vez'); c.phase = 'show'; c.i = 0; c.wait = 1.5;
        }
      }
    }
    for (const p of c.pads) { p.glow = Math.max(0, p.glow - dt * 2.4); p.screen.material.emissiveIntensity = 0.12 + p.glow * 2.2; p.ph.position.y = 0.03 - p.glow * 0.015; }
    g.ui.setChallenge(`ronda ${c.round + 1}/${PATTERN.rounds.length}   ·   ${c.phase === 'show' ? 'mira…' : `tu turno ${'●'.repeat(c.i)}${'○'.repeat(c.seq.length - c.i)}`}   ·   errores ${c.mistakes}/${PATTERN.mistakes}`, c.how);
  }

  // ---------------------------------------------------------------- the race up to the roof
  make_race(r) {
    const g = this.game, at = r.actor.pos;
    g.ctrl.place(at.x + 0.2, at.y, at.z + 0.6, Math.PI);
    const pts = [{ x: at.x - 0.25, y: at.y, z: at.z + 0.2 }, ...RACE.flags.map(([x, y, z]) => ({ x, y, z }))], lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, (pts[i].y - pts[i - 1].y) * 1.4, pts[i].z - pts[i - 1].z));
    this.flags.forEach((f) => { f.visible = true; });
    return { pts, lens, i: 0, score() { return Math.round(this.t * 10) / 10; }, end: () => { this.flags.forEach((f) => { f.visible = false; }); } };
  }
  update_race(c, dt, input, cat) {
    const g = this.game, k = Math.min(1, c.t / RACE.secs), L = c.lens[c.lens.length - 1] * k;
    let n = 1; while (n < c.lens.length - 1 && c.lens[n] < L) n++;
    const a = c.pts[n - 1], b = c.pts[n], u = Math.min(1, (L - c.lens[n - 1]) / (c.lens[n] - c.lens[n - 1])), climb = b.y - a.y > 0.5 && n > 2;
    const o = this.rival.object3d;
    o.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * (climb ? Math.min(1, u * 1.6) : u) + (climb ? Math.sin(u * Math.PI) * 0.35 : 0), a.z + (b.z - a.z) * u);
    o.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    this.rival.animate(dt, { speed: 3, grounded: !climb, running: true, look: null });
    this.flags.forEach((f, i) => { f.cloth.material.emissiveIntensity = i === c.i ? 0.9 : 0.1; f.visible = i >= c.i; });
    const [x, y, z] = RACE.flags[c.i];
    c.arrow = { x, y, z };
    if (Math.hypot(cat.x - x, cat.z - z) < 0.75 && Math.abs(cat.y - y) < 0.7) { c.i++; if (c.i >= RACE.flags.length) return this.finish(true); g.audio.note(520 + c.i * 110, 0.07, 0.2); }
    g.ui.setChallenge(`bandera ${c.i}/${RACE.flags.length}   ·   el gato va en ${Math.min(RACE.flags.length, n - 1)}   ·   ${Math.max(0, RACE.secs - c.t).toFixed(1)} s`, c.how);
    if (k >= 1) { c.why = CHALLENGE.race.lost; this.finish(false); }
  }

  // ---------------------------------------------------------------- the cans in the courtyard
  make_cans(r) { this.resetCans(); return { n: 0, score() { return this.n; } }; }
  update_cans(c, dt, input, cat) {
    const g = this.game, pouncing = g.ctrl.lungeT > -0.18;
    for (const k of this.cans) {
      if (k.down) continue;
      const d = Math.hypot(cat.x - k.at[0], cat.z - k.at[2]), dy = k.at[1] - cat.y;
      if (d < (pouncing ? 0.7 : 0.5) && dy < 0.55 && dy > -0.5) {
        k.down = true; c.n++;
        const l = d || 1; k.v = { x: ((k.at[0] - cat.x) / l) * 1.6 + g.ctrl.vel.x * 0.3, y: 2.4, z: ((k.at[2] - cat.z) / l) * 0.6 + 0.8 };
        g.audio.clink(g.pan({ x: k.at[0], y: k.at[1], z: k.at[2] })); g.ui.flash(`${c.n}`, c.n >= CAN.need ? 'good' : 'info', 0.5);
      }
    }
    const left = CAN.secs - c.t;
    g.ui.setChallenge(`latas ${c.n}/${CAN.need}   ·   ${Math.max(0, left).toFixed(1)} s`, c.how);
    if (c.n >= this.cans.length || left <= 0) this.finish(c.n >= CAN.need);
    else if (cat.z > 0) this.finish(false, true);
  }

  // ---------------------------------------------------------------- the sleeping dog
  make_dog(r) {
    const things = [], litter = [];
    for (let k = 0; k < 60 && litter.length < 11; k++) {
      const x = -12.55 + Math.random() * 1.6, z = -0.9 + Math.random() * 4.3;
      if (litter.some((l) => Math.hypot(l.x - x, l.z - z) < 0.62)) continue;
      const bag = litter.length % 2 ? this.mesh(new THREE.IcosahedronGeometry(0.11, 0), [0xe0402e, 0xf0b429, 0x2f7ad0][litter.length % 3]) : this.mesh(new THREE.BoxGeometry(0.24, 0.03, 0.18), 0xd8d0c0);
      bag.scale.y = litter.length % 2 ? 0.45 : 1; bag.position.set(x, 0.04, z); bag.rotation.y = Math.random() * 6;
      this.scene.add(bag); things.push(bag); litter.push({ x, z, bag, on: false });
    }
    this.resetBone();
    this.game.ctrl.place(-11.7, 0, 3.9, Math.PI);
    return { things, litter, noise: 0, carry: false, air: false, score() { return Math.round(this.t); }, end: () => { if (!this.game.story.has('dog')) this.resetBone(); } };
  }
  update_dog(c, dt, input, cat) {
    const g = this.game, ctrl = g.ctrl, d = Math.hypot(cat.x - DOG.x, cat.z - DOG.z);
    const near = Math.max(0.4, Math.min(1.35, 1.6 - d / 5)) * (c.carry ? 1.15 : 1);
    let add = ctrl.speed < 0.25 ? -0.3 : ctrl.running ? 0.85 : 0.2;
    if (add > 0) add *= near;
    c.noise += add * dt;
    if (!ctrl.grounded) c.air = true; else if (c.air) { c.air = false; c.noise += 0.3 * near; g.audio.tick(0, 0.03); }
    for (const l of c.litter) {
      const on = Math.hypot(cat.x - l.x, cat.z - l.z) < 0.26 && cat.y < 0.2;
      if (on && !l.on) { c.noise += 0.26 * near; g.audio.rustle(g.pan({ x: l.x, y: 0, z: l.z })); g.ui.flash('¡crac!', 'bad', 0.6); l.bag.rotation.z += 0.4; }
      l.on = on;
    }
    c.noise = Math.max(0, c.noise);
    // its ear and head react before it wakes
    this.sleeper.head.rotation.x = -0.35 * Math.min(1, c.noise) + Math.sin(c.t * 1.6) * 0.03;
    if (!c.carry && Math.hypot(cat.x - this.bone.position.x, cat.z - this.bone.position.z) < 0.4) {
      c.carry = true; g.cat.head.add(this.bone); this.bone.position.set(0, -0.04, 0.09); this.bone.rotation.set(0, 0, 0); this.bone.scale.setScalar(0.8); this.hit('¡Lo tienes! Ahora, sin ruido');
    }
    const n = Math.round(Math.min(1, c.noise) * 12);
    c.arrow = c.carry ? { x: -11.7, y: 0, z: DOG.exit + 0.4 } : { x: DOG.x + 0.35, y: 0, z: DOG.z + 0.95 };
    g.ui.setChallenge(`ruido ${'▮'.repeat(n)}${'▯'.repeat(12 - n)}   ·   ${Math.max(0, Math.ceil(DOG.secs - c.t))} s`, c.how, c.noise > 0.75 ? '#ff7a5c' : c.noise > 0.4 ? '#ffe2a0' : '#b9ffb0');
    if (c.noise >= 1) { g.audio.bark(); g.dizzy(2.5, { x: DOG.x, z: DOG.z }); this.finish(false); }
    else if (c.carry && cat.z > DOG.exit) { this.bone.removeFromParent(); this.finish(true); this.bone.visible = false; }
    else if (c.t > DOG.secs) { c.why = CHALLENGE.time; this.finish(false); }
    else if (!c.carry && cat.z > 6.5) this.finish(false, true);
  }

  // things that are there all the time
  idle(dt) {
    const c = this.active, g = this.game;
    if (!c || c.type !== 'race') {
      const at = SECRETS[0].at;
      this.rival.object3d.position.set(at[0] - 0.25, at[1], at[2]); this.rival.object3d.rotation.y = 0.2;
      this.rival.animate(dt, { speed: 0, grounded: true, sitting: true, look: null });
      this.rival.object3d.visible = !(g.dangers.kind === 'tomcat');
    }
    if (!c || c.type !== 'dog') { this.sleeper.head.rotation.x = Math.sin(performance.now() / 700) * 0.05; this.sleeper.g.scale.y = 1 + Math.sin(performance.now() / 900) * 0.02; }
    for (const k of this.cans) if (k.v) {
      k.v.y -= 12 * dt; const p = k.m.position;
      p.x += k.v.x * dt; p.y += k.v.y * dt; p.z += k.v.z * dt; k.m.rotation.x += dt * 9; k.m.rotation.z += dt * 6;
      if (p.y < 0.05 && k.v.y < 0) { p.y = 0.05; k.v = null; k.m.rotation.set(Math.PI / 2, 0, Math.random() * 3); }
    }
  }

  update(dt, input, cat) {
    this.idle(dt);
    const c = this.active;
    if (!c) return;
    if (c.ready > 0) {
      const was = Math.ceil(c.ready / 0.65); c.ready -= dt; const now = Math.ceil(c.ready / 0.65);
      if (now !== was && now > 0 && now < 4) { this.game.ui.flash(String(now), 'info', 0.5); this.game.audio.note(440, 0.06, 0.12); }
      if (c.ready <= 0) { this.game.ui.card(null); this.game.ui.flash('¡Ya!', 'good', 0.6); this.game.audio.note(880, 0.08, 0.25); this.game.ctrl.frozen = !!c.frozen; }
      return;
    }
    if (c.type !== 'hunt') c.t += dt;
    this['update_' + c.type](c, dt, input, cat);
  }
}
