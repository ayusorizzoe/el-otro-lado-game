// A low-poly person (about the polycount of the props): a few tapered shapes, flat colours.
// Faces +z. Pivots for arms, legs and head allow standing, sitting, walking and gesturing.

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { bakeGroup } from '../rendering/Bake.js';

export class Human extends Entity {
  // look: { skin, hair, top, bottom, shoes, female, old, child, cap, apron, veil,
  //         paperHat, mustache, bun, headphones, scarf, shawl, key (one of the three: warm outline) }
  constructor(materials, look = {}, name = 'human') {
    super(name);
    const M = (hex, kind) => materials.color(hex, kind);
    const k = look.child ? 0.72 : look.old ? 0.95 : look.female ? 0.94 : 1;
    const root = new THREE.Group();
    root.scale.setScalar(k);
    this.object3d.add(root);
    this.root = root;
    const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
    const skin = M(look.skin ?? 0xa47452, 'skin');
    const top = M(look.top ?? 0x8a8a8a);
    const bottom = M(look.bottom ?? 0x3a3e46);
    const shoes = M(look.shoes ?? 0x2a2522);

    // torso and hips
    const torso = mesh(new THREE.CylinderGeometry(look.female ? 0.15 : 0.17, look.female ? 0.15 : 0.15, 0.56, 7), top);
    torso.position.y = 1.18; torso.scale.z = 0.62;
    const hips = mesh(new THREE.CylinderGeometry(look.female ? 0.16 : 0.15, 0.15, 0.2, 7), look.veil ? top : bottom);
    hips.position.y = 0.88; hips.scale.z = 0.7;
    root.add(torso, hips);
    if (look.apron) { const ap = mesh(new THREE.BoxGeometry(0.28, 0.5, 0.02), M(look.apron)); ap.position.set(0, 0.95, 0.12); root.add(ap); }
    if (look.veil) { const skirt = mesh(new THREE.CylinderGeometry(0.17, 0.25, 0.75, 7), top); skirt.position.y = 0.42; root.add(skirt); }

    // head
    const head = new THREE.Group(); head.position.y = 1.52; root.add(head);
    const neck = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 5), skin); neck.position.y = -0.03;
    const face = mesh(new THREE.IcosahedronGeometry(0.11, 1), skin); face.position.y = 0.12; face.scale.set(0.88, 1.08, 0.95);
    const nose = mesh(new THREE.ConeGeometry(0.018, 0.04, 4), skin); nose.position.set(0, 0.11, 0.1); nose.rotation.x = Math.PI / 2;
    const hair = mesh(new THREE.IcosahedronGeometry(0.115, 1), M(look.hair ?? 0x1e1814)); hair.position.set(0, 0.16, -0.02); hair.scale.set(0.92, 0.85, 0.98);
    head.add(neck, face, nose, hair);
    if (look.female && !look.veil) { const tail = mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.22, 5), M(look.hair ?? 0x1e1814)); tail.position.set(0, 0.05, -0.12); tail.rotation.x = 0.3; head.add(tail); }
    if (look.cap) { const cap = mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.07, 8), M(look.cap)); cap.position.y = 0.22; const brim = mesh(new THREE.BoxGeometry(0.16, 0.015, 0.1), M(look.cap)); brim.position.set(0, 0.195, 0.12); head.add(cap, brim); }
    if (look.paperHat) { const hat = mesh(new THREE.CylinderGeometry(0.125, 0.11, 0.17, 8), M(look.paperHat)); hat.position.y = 0.29; head.add(hat); }
    if (look.mustache) { const mu = mesh(new THREE.BoxGeometry(0.11, 0.025, 0.03), M(look.mustache)); mu.position.set(0, 0.075, 0.1); head.add(mu); }
    if (look.bun) { const bu = mesh(new THREE.IcosahedronGeometry(0.075, 1), M(look.hair)); bu.position.set(0, 0.27, -0.07); head.add(bu); }
    if (look.headphones) { const band = mesh(new THREE.TorusGeometry(0.135, 0.022, 5, 12, Math.PI), M(look.headphones)); band.position.y = 0.13; head.add(band); for (const s of [1, -1]) { const cup = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 8), M(look.headphones)); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.125, 0.12, 0); head.add(cup); } }
    if (look.scarf) { const sc = mesh(new THREE.TorusGeometry(0.1, 0.038, 5, 10), M(look.scarf)); sc.rotation.x = Math.PI / 2; sc.position.y = 1.46; root.add(sc); }
    if (look.shawl) { const sh = mesh(new THREE.CylinderGeometry(0.13, 0.31, 0.36, 8), M(look.shawl)); sh.position.y = 1.32; sh.scale.z = 0.75; root.add(sh); }
    if (look.veil) { const v = mesh(new THREE.IcosahedronGeometry(0.125, 1), M(look.veil)); v.position.set(0, 0.15, -0.03); v.scale.set(1, 0.95, 1.05); const back = mesh(new THREE.BoxGeometry(0.22, 0.25, 0.04), M(look.veil)); back.position.set(0, 0.02, -0.11); head.add(v, back); }
    for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), materials.dark); e.position.set(s * 0.035, 0.13, 0.092); head.add(e); }
    this.head = head;

    // limbs: pivots at shoulder and hip, knees and elbows for sitting / gesturing
    const limb = (r0, r1, len, mat) => { const g = new THREE.CylinderGeometry(r1, r0, len, 6); g.translate(0, -len / 2, 0); return mesh(g, mat); };
    this.arms = []; this.legs = [];
    for (const s of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(s * (look.female ? 0.19 : 0.215), 1.42, 0);
      const upper = limb(0.05, 0.042, 0.3, look.shortSleeve ? skin : top);
      if (look.shortSleeve) { const sleeve = limb(0.062, 0.058, 0.15, top); sh.add(sleeve); }
      const el = new THREE.Group(); el.position.y = -0.3;
      const fore = limb(0.04, 0.032, 0.26, look.shortSleeve ? skin : top);
      const hand = mesh(new THREE.SphereGeometry(0.045, 5, 4), skin); hand.position.y = -0.29; hand.scale.set(0.8, 1.15, 0.6);
      el.add(fore, hand); sh.add(upper, el); root.add(sh);
      this.arms.push({ sh, el });
      const hip = new THREE.Group(); hip.position.set(s * 0.085, 0.86, 0);
      const thigh = limb(0.075, 0.06, 0.42, look.veil ? top : bottom);
      const kn = new THREE.Group(); kn.position.y = -0.42;
      const shin = limb(0.058, 0.048, 0.4, look.veil ? skin : bottom);
      const shoe = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), shoes); shoe.position.set(0, -0.41, 0.05);
      kn.add(shin, shoe); hip.add(thigh, kn); root.add(hip);
      this.legs.push({ hip, kn });
    }
    bakeGroup(root, look.key ? materials.figureKey : materials.figure);
    this.t = Math.random() * 10;
    this.seed = Math.random() * 6.28;
    this.phase = 0;
    this.sitAmt = 0;
  }

  // opts: { speed, sit, curb, lean, phone, work, talking, headTurn, headPitch }
  animate(dt, o = {}) {
    this.t += dt;
    this.phase += dt * (o.speed || 0) * 4.5;
    const sitGoal = o.curb ? 1.35 : o.sit ? 1 : 0;
    this.sitAmt += (sitGoal - this.sitAmt) * Math.min(1, 5 * dt);
    const blend = (k, goal) => { this[k] = (this[k] || 0) + ((goal ? 1 : 0) - (this[k] || 0)) * Math.min(1, 4 * dt); return this[k]; };
    const lean = blend('_lean', o.lean), phone = blend('_phone', o.phone), work = blend('_work', o.work);
    const moving = o.speed > 0.05;
    const s = Math.sin(this.phase) * (moving ? 0.5 : 0);
    const sit = Math.min(1, this.sitAmt), deep = Math.max(0, this.sitAmt - 1) / 0.35;
    // idle weight shift so nobody stands perfectly still
    const sway = Math.sin(this.t * 0.6 + this.seed) * 0.025 * (1 - sit);
    this.legs.forEach((l, i) => {
      l.hip.rotation.x = (i ? -s : s) - sit * (1.5 + deep * 0.6) + (i ? sway : -sway) * 2;
      l.kn.rotation.x = sit * (1.5 + deep * 0.6) + (moving ? Math.max(0, -Math.sin(this.phase + i * Math.PI)) * 0.5 : 0);
    });
    const talk = o.talking ? Math.max(0, Math.sin(this.t * 2.2 + this.seed)) : 0;
    const busy = Math.sin(this.t * 3.1 + this.seed) * 0.25 * work;
    this.arms.forEach((a, i) => {
      let sh = (i ? s : -s) * 0.8 - sit * 0.5 - (i === 0 ? talk * 0.6 : 0);
      let el = -sit * 0.9 - (i === 0 ? talk * 0.7 : 0) - 0.1;
      sh = sh * (1 - work) + (-0.75 + (i ? busy : -busy)) * work;
      el = el * (1 - work) + (-0.7 + busy) * work;
      sh = sh * (1 - lean) + 0.15 * lean;
      if (i === 0) { sh = sh * (1 - phone) - 0.6 * phone; el = el * (1 - phone) - 1.9 * phone; }
      a.sh.rotation.x = sh; a.el.rotation.x = el;
      a.sh.rotation.z = (i ? -1 : 1) * (0.06 + 0.12 * lean);
    });
    // lowered by exactly as much as the bent legs leave between hip and foot
    const bend = sit * (1.5 + deep * 0.6);
    this.root.position.y = -0.42 * (1 - Math.cos(bend)) + (moving ? Math.abs(Math.cos(this.phase)) * 0.03 : Math.sin(this.t * 1.3) * 0.004);
    this.root.position.z = sit * 0.08 - lean * 0.06;
    this.root.rotation.x = -lean * 0.07 + work * 0.12;
    this.root.rotation.z = sway;
    this.head.rotation.y = (o.headTurn || 0) + (o.talking ? Math.sin(this.t * 1.6) * 0.15 : Math.sin(this.t * 0.3 + this.seed) * 0.12);
    this.head.rotation.x = sit * 0.15 + phone * 0.45 + work * 0.35 + (o.headPitch || 0);
  }
}
