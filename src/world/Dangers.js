// Every so often the street turns on the cat, always with a warning first:
//  dog      chases on the ground  → get up high, or next to a person
//  cart     a hand truck barrels down the street → get up high, or next to a person, or off its line
//  tomcat   climbs anything       → get next to a person
// Being caught leaves the cat dizzy and slow for a few seconds.

import * as THREE from 'three';
import { collision } from '../systems/CollisionSystem.js';
import { bakeGroup } from '../rendering/Bake.js';
import { Cat } from '../entities/Cat.js';
import { Human } from '../entities/Human.js';
import { DANGER } from '../narrative/Content.js';

const WARN = 3.2, SAFE_Y = 0.7;
const SPEED = { dog: 3.7, tomcat: 3.1, cart: 5.2 };
const LIMIT = { dog: 13, tomcat: 11, cart: 8 };
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export function makeDog(materials) {
  const g = new THREE.Group();
  const col = materials.color(0x6a4a2e), dark = materials.color(0x2a2220);
  const mesh = (geo, m = col) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; return x; };
  const body = mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.62, 6)); body.rotation.x = Math.PI / 2; body.position.y = 0.48;
  const chest = mesh(new THREE.SphereGeometry(0.16, 6, 4)); chest.position.set(0, 0.5, 0.25);
  const head = new THREE.Group(); head.position.set(0, 0.66, 0.42);
  const skull = mesh(new THREE.BoxGeometry(0.18, 0.17, 0.2));
  const snout = mesh(new THREE.BoxGeometry(0.1, 0.09, 0.14), dark); snout.position.set(0, -0.03, 0.15);
  for (const s of [1, -1]) { const e = mesh(new THREE.ConeGeometry(0.04, 0.1, 4), dark); e.position.set(s * 0.06, 0.12, -0.02); head.add(e); }
  head.add(skull, snout);
  const legs = [];
  for (const [x, z] of [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.24], [0.09, -0.24]]) {
    const p = new THREE.Group(); p.position.set(x, 0.42, z);
    const l = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.42, 5)); l.position.y = -0.21;
    p.add(l); g.add(p); legs.push(p);
  }
  const tail = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 4)); tail.position.set(0, 0.6, -0.42); tail.rotation.x = -0.9;
  g.add(body, chest, head, tail);
  return { g, legs, head, body, chest };
}

export class Dangers {
  constructor(scene, materials) {
    const dog = makeDog(materials);
    this.dogM = dog;
    // the rival: the same cat, orange and scruffy
    this.tom = new Cat({ ...materials, catCoat: materials.color(0xb5652a), catEye: materials.catEye, dark: materials.dark, glint: materials.glint });
    this.tom.object3d.scale.setScalar(1.25);
    // a hand truck stacked with crates, and the man pushing it
    const cart = new THREE.Group(), box = new THREE.Group();
    const add = (w, h, d, x, y, z, hex) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.color(hex)); m.position.set(x, y, z); m.castShadow = true; box.add(m); };
    add(0.6, 0.05, 0.45, 0, 0.14, 0.2, 0x5a5a5a);
    for (const s of [-1, 1]) { add(0.04, 1.25, 0.04, s * 0.22, 0.75, -0.05, 0xc23b2e); add(0.08, 0.26, 0.26, s * 0.32, 0.14, -0.05, 0x1e1e1e); }
    add(0.58, 0.32, 0.42, 0, 0.33, 0.2, 0x3e6fa0); add(0.56, 0.32, 0.42, 0.02, 0.66, 0.2, 0xc0883a); add(0.54, 0.3, 0.4, -0.02, 0.98, 0.2, 0x3f8a5a);
    bakeGroup(box, materials.figure); cart.add(box);
    this.man = new Human(materials, { top: 0x4a4a52, bottom: 0x2e2e34, cap: 0x2a2a2e, skin: 0x8f6448 });
    this.man.object3d.position.set(0, 0, -0.55); cart.add(this.man.object3d);
    this.mesh = { dog: dog.g, tomcat: this.tom.object3d, cart };
    for (const m of Object.values(this.mesh)) { m.visible = false; scene.add(m); }
    this.next = 30; this.skip = new Set(); this.kind = null; this.state = 'idle'; this.t = 0; this.last = null; this.count = 0; this.phase = 0;
  }

  get busy() { return this.state !== 'idle'; }
  get text() { return this.busy ? DANGER[this.kind].warn : ''; }
  // is the cat safe from this kind right now?
  safe(cat, person) {
    if (person) return true;
    if (this.kind === 'tomcat') return false;
    return cat.y > SAFE_Y;
  }

  begin(kind, cat) {
    this.kind = kind; this.state = 'warn'; this.t = WARN; this.last = kind; this.count++; this.safeT = 0;
    // it starts down the street, on the side with more room
    const dir = cat.x > 0 ? -1 : 1, far = kind === 'cart' ? 15 : 10.5;
    this.x = Math.max(-19, Math.min(19, cat.x + dir * far)); this.z = 7.95; this.dir = -dir;
    if (kind === 'cart') this.z = Math.max(7.0, Math.min(9.0, cat.z));
    if (Math.hypot(this.x - cat.x, this.z - cat.z) < 6) { this.x = cat.x - dir * far; this.x = Math.max(-26, Math.min(19, this.x)); this.dir = dir; }
    this.yaw = Math.atan2(cat.x - this.x, cat.z - this.z);
    this.mesh[kind].visible = true;
  }

  stop() { if (this.kind) this.mesh[this.kind].visible = false; this.state = 'idle'; this.kind = null; this.next = 55 + Math.random() * 30; }

  // o: { allow, person (someone minding a stall is right there), people (anyone minding one at all) }. Returns an event or null.
  update(dt, cat, o) {
    if (this.state === 'idle') {
      if (!o.allow) return null;
      this.next -= dt;
      if (this.next > 0) return null;
      const street = cat.z > 5.4 && cat.z < 13;
      // the rival cat only when there's someone to run to; a hand truck only in the street
      const kinds = ['dog', street && 'cart', o.people && 'tomcat'].filter((k) => k && !this.skip.has(k) && (k !== this.last || (!street && !o.people)));
      if (!kinds.length) { this.next = 30; return null; }
      this.begin(kinds[Math.floor(Math.random() * kinds.length)], cat);
      return { type: 'warn', kind: this.kind };
    }
    let ev = null;
    this.t -= dt;
    const dx = cat.x - this.x, dz = cat.z - this.z, d = Math.hypot(dx, dz);
    const safe = this.safe(cat, o.person);
    let speed = 0;
    if (this.state === 'warn') {
      this.yaw = Math.atan2(dx, dz);
      speed = this.kind === 'cart' ? 0 : 2.6;
      if (this.t <= 0) { this.state = 'chase'; this.t = LIMIT[this.kind]; ev = { type: 'go', kind: this.kind }; }
    } else if (this.state === 'chase') {
      speed = SPEED[this.kind];
      this.safeT = safe ? (this.safeT || 0) + dt : 0;
      if (this.kind === 'cart') {
        this.x += this.dir * speed * dt; this.yaw = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2; speed = 0;
        if (d < 0.75 && !safe) ev = this.caught();
        else if (this.t <= 0 || (cat.x - this.x) * this.dir < -2.5 || Math.abs(this.x) > 22) ev = this.escaped();
      } else if (d < 0.5 && !safe) ev = this.caught();
      else if (this.safeT > 1.6 || this.t <= 0 || d > 22) ev = this.escaped();
      else if (safe && d < 1.5) speed = 0;
    } else if (this.state === 'leave') {
      speed = 2.4; if (this.t <= 0) { this.stop(); return null; }
    }
    if (speed > 0) {
      const s = this.state === 'leave' ? -1 : 1, l = d || 1;
      const y = this.kind === 'tomcat' ? cat.y : collision.groundAt(this.x, this.z, 0.4);
      const r = collision.resolve(this.x + s * (dx / l) * speed * dt, this.z + s * (dz / l) * speed * dt, 0.2, y, 0.3, 0.5);
      this.x = r.x; this.z = r.z;
      this.yaw += wrap(Math.atan2(s * dx, s * dz) - this.yaw) * Math.min(1, 8 * dt);
    }
    const m = this.mesh[this.kind];
    if (!m) return ev;
    const gy = collision.groundAt(this.x, this.z, this.kind === 'tomcat' ? cat.y + 0.4 : 0.5);
    this.y = this.kind === 'tomcat' && this.y !== undefined && this.state !== 'warn' ? this.y + (gy - this.y) * Math.min(1, 8 * dt) : gy;
    m.position.set(this.x, this.y, this.z); m.rotation.y = this.yaw;
    this.phase += dt * speed * 5;
    if (this.kind === 'dog') this.dogM.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * Math.min(1, speed / 2); });
    if (this.kind === 'tomcat') this.tom.animate(dt, { speed, grounded: true, running: speed > 2, look: null });
    if (this.kind === 'cart') this.man.animate(dt, { speed: this.state === 'warn' ? 0 : 2.4, work: true });
    return ev;
  }
  caught() { const kind = this.kind; this.state = 'leave'; this.t = 2.5; return { type: 'caught', kind }; }
  escaped() { const kind = this.kind; this.state = 'leave'; this.t = 2.5; return { type: 'safe', kind }; }
}
