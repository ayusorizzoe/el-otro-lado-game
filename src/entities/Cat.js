// The black cat: a low-poly figure (about the polycount of the props) built from a few
// shapes, with pivots for legs, head and tail so it can walk, sit, jump and sleep.
// Forward is +z. Feet at y = 0.

import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Cat extends Entity {
  constructor(materials) {
    super('cat');
    const M = materials.catCoat;
    const body = new THREE.Group();
    this.body = body;
    this.object3d.add(body);
    const mesh = (geo, mat = M) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

    const torso = mesh(new THREE.CylinderGeometry(0.07, 0.066, 0.34, 8, 1));
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1, 1, 1.12);
    torso.position.set(0, 0.2, -0.01);
    const chest = mesh(new THREE.SphereGeometry(0.082, 8, 6)); chest.position.set(0, 0.195, 0.13); chest.scale.set(1, 1.05, 1);
    const haunch = mesh(new THREE.SphereGeometry(0.078, 8, 6)); haunch.position.set(0, 0.205, -0.16); haunch.scale.set(1.05, 1, 1.05);
    const ruff = mesh(new THREE.SphereGeometry(0.064, 8, 6)); ruff.position.set(0, 0.25, 0.2);
    body.add(torso, chest, haunch, ruff);

    // head
    const head = new THREE.Group();
    head.position.set(0, 0.3, 0.255);
    const skull = mesh(new THREE.SphereGeometry(0.064, 8, 6)); skull.scale.set(1.12, 0.94, 1);
    const muzzle = mesh(new THREE.SphereGeometry(0.03, 6, 4)); muzzle.position.set(0, -0.022, 0.054); muzzle.scale.set(1.25, 0.8, 1);
    head.add(skull, muzzle);
    this.ears = []; this.eyes = [];
    for (const s of [1, -1]) {
      const earP = new THREE.Group(); earP.position.set(s * 0.036, 0.05, -0.008); head.add(earP); this.ears.push({ g: earP, s });
      const ear = mesh(new THREE.ConeGeometry(0.028, 0.065, 4)); ear.position.set(0, 0.012, 0); ear.rotation.z = -s * 0.28; ear.rotation.y = Math.PI / 4; earP.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 8, 6), materials.catEye); eye.position.set(s * 0.026, 0.008, 0.05);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), materials.dark); pupil.scale.set(0.006, 0.0075, 0.003); pupil.position.set(0, 0, 0.012);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(1, 4, 3), materials.glint); glint.scale.setScalar(0.0025); glint.position.set(-0.004, 0.005, 0.0125);
      eye.add(pupil, glint);
      head.add(eye); this.eyes.push(eye);
    }
    body.add(head);
    this.head = head;

    // legs: pivot at the shoulder / hip
    this.legs = [];
    for (const [x, y, z] of [[0.04, 0.19, 0.13], [-0.04, 0.19, 0.13], [0.045, 0.2, -0.16], [-0.045, 0.2, -0.16]]) {
      const p = new THREE.Group(); p.position.set(x, y, z);
      const leg = mesh(new THREE.CylinderGeometry(0.023, 0.017, 0.19, 5)); leg.position.y = -0.095;
      const paw = mesh(new THREE.SphereGeometry(0.021, 5, 3)); paw.position.set(0, -0.187, 0.008); paw.scale.set(1, 0.55, 1.25);
      p.add(leg, paw);
      body.add(p);
      this.legs.push(p);
    }

    // tail: chained segments
    this.tail = [];
    let parent = new THREE.Group(); parent.position.set(0, 0.23, -0.22); body.add(parent);
    const radii = [0.022, 0.019, 0.016, 0.013, 0.01];
    for (let i = 0; i < radii.length; i++) {
      const seg = new THREE.Group();
      const g = new THREE.CylinderGeometry(radii[i] * 0.85, radii[i], 0.075, 5);
      g.rotateX(Math.PI / 2); g.translate(0, 0, -0.0375);
      seg.add(mesh(g));
      if (i > 0) seg.position.z = -0.075;
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
    }

    this.phase = 0;
    this.sit = 0;
    this.sleep = 0;
    this.t = 0;
    this.settle = 0;
    this.prevSpeed = 0;
    this.lookYaw = 0; this.lookPitch = 0;
  }

  // the collar, piece by piece: 'ribbon' | 'bell' | 'tag' | 'name'
  wear(part) {
    if (!this.collar) { this.collar = new THREE.Group(); this.collar.position.set(0, 0.268, 0.2); this.collar.rotation.x = 0.75; this.body.add(this.collar); }
    const add = (geo, hex, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0.25, emissive: hex, emissiveIntensity: 0.25 })); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; this.collar.add(m); return m; };
    if (part === 'ribbon') { add(new THREE.TorusGeometry(0.072, 0.015, 6, 18), 0xe0332a, 0, 0, 0, Math.PI / 2); for (const s of [1, -1]) { const b = add(new THREE.ConeGeometry(0.026, 0.06, 5), 0xe0332a, s * 0.034, 0.012, -0.08); b.rotation.z = s * Math.PI / 2; } }
    if (part === 'bell') add(new THREE.SphereGeometry(0.026, 10, 8), 0xffc93a, 0, -0.02, 0.085);
    if (part === 'tag') this.tag = add(new THREE.CylinderGeometry(0.03, 0.03, 0.007, 14), 0xc8d0d8, 0.035, -0.03, 0.08, Math.PI / 2);
    if (part === 'name' && this.tag) this.tag.material.color.set(0xffe9a8);
  }

  roll() { this.rollT = 0.9; }
  get rolling() { return this.rollT > 0; }
  paw() { this.pawT = 0.28; }

  // state: { speed, grounded, sitting, sleeping, rubbing, crouch, look: {x,y,z}|null, running }
  animate(dt, s) {
    this.t += dt;
    const moving = s.speed > 0.15;
    this.phase += dt * (moving ? 4 + s.speed * 3 : 0.5);
    this.sit += ((s.sitting ? 1 : 0) - this.sit) * Math.min(1, 5 * dt);
    this.sleep += ((s.sleeping ? 1 : 0) - this.sleep) * Math.min(1, 4 * dt);
    // settling: when the cat stops, the body dips and recovers
    if (this.prevSpeed > 1.2 && s.speed < 0.3) this.settle = 1;
    this.prevSpeed = s.speed;
    this.settle = Math.max(0, this.settle - dt * 2.2);
    const settle = Math.sin(this.settle * Math.PI) * 0.025;
    const crouch = Math.max(s.crouch || 0, (s.crouchHold || 0) * 0.85);
    this.eyes.forEach((e) => { e.scale.y = 1 - 0.92 * Math.max(this.sleep, this.rolling ? 0.7 : 0); });
    // a full roll onto the back and over; a quick tap with a front paw
    this.rollT = Math.max(0, (this.rollT || 0) - dt); this.pawT = Math.max(0, (this.pawT || 0) - dt);
    const ru = this.rollT > 0 ? 1 - this.rollT / 0.9 : 0, rs = ru * ru * (3 - 2 * ru), rl = Math.sin(ru * Math.PI);
    const pw = this.pawT > 0 ? Math.sin((1 - this.pawT / 0.28) * Math.PI) : 0;
    const sw = moving ? Math.min(1, s.speed / 2) : 0;
    const a = Math.sin(this.phase * 2);
    const swing = [a, -a, -a, a];
    this.legs.forEach((l, i) => {
      let r = swing[i] * (s.running ? 0.95 : 0.7) * sw;
      if (!s.grounded) r = i < 2 ? -0.7 : 0.7;
      r = r * (1 - this.sit) + (i >= 2 ? -1.2 : 0.1) * this.sit;
      r = r * (1 - this.sleep) + (i < 2 ? -1.45 : 1.45) * this.sleep;
      if (rl > 0) r += (i < 2 ? -0.9 : 0.9) * rl + Math.sin(this.t * 22 + i) * 0.3 * rl;
      l.rotation.x = r + crouch * (i < 2 ? -0.35 : 0.45) - (i === 0 ? 1.5 * pw : 0);
    });
    this.body.rotation.x = -0.4 * this.sit + crouch * 0.08 + (s.running ? 0.04 * Math.sin(this.phase * 2) : 0);
    this.body.position.y = Math.abs(Math.cos(this.phase * 2)) * 0.012 * sw - 0.05 * this.sit - 0.13 * this.sleep - settle - crouch * 0.05;
    this.body.position.z = -0.06 * this.sit;
    this.body.rotation.z = s.rubbing ? Math.sin(this.t * 9) * 0.12 : (s.crouchHold ? Math.sin(this.t * 16) * 0.05 : 0);
    if (ru > 0) { this.body.rotation.z = rs * Math.PI * 2; this.body.position.y = 0.2 * (1 - Math.cos(rs * Math.PI * 2)) * 0.9 - rl * 0.1; }
    // the head turns toward whatever is going on nearby, within a comfortable range
    let ly = Math.sin(this.t * 0.35) * (this.sit > 0.5 ? 0.35 : 0.08), lp = 0;
    if (s.look && this.sleep < 0.5) {
      const o = this.object3d.position, yaw = this.object3d.rotation.y;
      let d = Math.atan2(s.look.x - o.x, s.look.z - o.z) - yaw;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) < 1.8) { ly = Math.max(-1.0, Math.min(1.0, d)); lp = -Math.max(-0.5, Math.min(0.6, Math.atan2((s.look.y ?? 0) + 1.2 - o.y - 0.3, Math.hypot(s.look.x - o.x, s.look.z - o.z)) * 0.6)); }
    }
    this.lookYaw += (ly - this.lookYaw) * Math.min(1, 3 * dt);
    this.lookPitch += (lp - this.lookPitch) * Math.min(1, 3 * dt);
    this.head.rotation.y = this.lookYaw * (1 - this.sleep) + this.sleep * 0.8;
    this.head.rotation.x = 0.3 * this.sit + 0.5 * this.sleep + this.lookPitch * (1 - this.sleep) + Math.sin(this.t * 0.7) * 0.03 + (s.running ? 0.15 : 0);
    // ears: forward when attentive, back when running, a twitch now and then
    const twitch = Math.max(0, Math.sin(this.t * 0.9 + 1.7)) ** 30;
    this.ears.forEach((e, i) => {
      const back = s.running ? 0.55 : this.sleep * 0.4;
      e.g.rotation.x = -back + (s.look ? -0.1 : 0) + (i === 0 ? twitch * 0.5 : 0);
      e.g.rotation.z = -e.s * (back * 0.4 + (s.look ? 0 : 0.1));
    });
    this.tail.forEach((t, i) => {
      const base = moving ? (s.running ? 0.05 : 0.35) : -0.25;
      t.rotation.x = base * (i === 0 ? 1.2 : 0.35) * (1 - this.sleep) - this.sleep * 0.1 + (i > 2 ? Math.sin(this.t * 1.1 - i) * 0.08 : 0);
      t.rotation.y = Math.sin(this.t * (moving ? 5 : 1.3) - i * 0.8) * (0.08 + i * 0.07) * (s.look && !moving ? 1.6 : 1) + this.sleep * 0.55;
    });
  }
}
