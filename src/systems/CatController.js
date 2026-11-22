// Moves the cat: camera-relative walking, running, jumping onto things, gravity, collisions.

import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { collision } from './CollisionSystem.js';

const C = Config.cat;

export class CatController {
  constructor(cat) {
    this.cat = cat;
    this.pos = cat.object3d.position;
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.yaw = cat.object3d.rotation.y;
    this.grounded = true;
    this.idle = 0;
    this.sleeping = false;
    this.rubT = 0;
    this.speed = 0;
    this.running = false;
    this.speedScale = 1; this.jumpScale = 1; this.crouchHold = 0; this.lungeT = -1; this.frozen = false; this.runScale = 1;
  }

  // a committed leap that lands `dist` metres ahead
  pounce(dist) {
    const vy = 4.2, t = (2 * vy) / C.gravity;
    this.vy = vy; this.grounded = false; this.lungeT = t; this.crouch = 0;
    this.vel.set(Math.sin(this.yaw) * dist / t, 0, Math.cos(this.yaw) * dist / t);
  }

  place(x, y, z, yaw = this.yaw) { this.pos.set(x, y, z); this.vy = 0; this.yaw = yaw; }

  update(dt, input, camYaw, { starving = false, locked = false } = {}) {
    const p = this.pos;
    let mx = 0, mz = 0;
    if (!locked && !this.frozen && !this.cat.rolling && !this.sleeping && this.rubT <= 0) {
      const m = input.move;
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      mx = fx * m.fwd + rx * m.right; mz = fz * m.fwd + rz * m.right;
      const l = Math.hypot(mx, mz);
      if (l > 0) { mx /= l; mz /= l; }
      if (input.hit('Space') && this.grounded) { this.vy = C.jump * this.jumpScale; this.grounded = false; this.crouch = 1; }
    }
    this.running = input.down('ShiftLeft', 'ShiftRight') && !starving && (mx || mz);
    const max = (starving ? C.starving : this.running ? C.run * this.runScale : C.walk) * this.speedScale;
    this.lungeT -= dt;
    const k = this.lungeT > 0 ? 0 : Math.min(1, (this.grounded ? 12 : 4) * dt);
    this.vel.x += (mx * max - this.vel.x) * k;
    this.vel.z += (mz * max - this.vel.z) * k;
    if (mx || mz) {
      let d = Math.atan2(mx, mz) - this.yaw;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.yaw += d * Math.min(1, 10 * dt);
    }
    if (this.rubT > 0) this.rubT -= dt;

    // horizontal
    let nx = p.x + this.vel.x * dt, nz = p.z + this.vel.z * dt;
    const res = collision.resolve(nx, nz, C.radius, p.y, C.step, C.height);
    const B = Config.street;
    p.x = Math.max(B.minX, Math.min(B.maxX, res.x));
    p.z = Math.max(B.minZ, Math.min(B.maxZ, res.z));

    // vertical
    const g = collision.groundAt(p.x, p.z, p.y + C.step);
    if (this.grounded && this.vy <= 0) {
      if (g >= p.y - 0.4) p.y += (g - p.y) * Math.min(1, 20 * dt);
      else this.grounded = false;
    }
    if (!this.grounded) {
      this.vy -= C.gravity * dt;
      p.y += this.vy * dt;
      const g2 = collision.groundAt(p.x, p.z, p.y + Math.max(C.step, -this.vy * dt + 0.02));
      if (this.vy <= 0 && p.y <= g2) { p.y = g2; this.vy = 0; this.grounded = true; }
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.idle = (mx || mz || !this.grounded || this.cat.rolling) ? 0 : this.idle + dt;
    this.cat.object3d.rotation.y = this.yaw;
    this.crouch = Math.max(0, (this.crouch || 0) - dt * 8);
    this.cat.animate(dt, {
      speed: this.speed, grounded: this.grounded, running: this.running, crouch: this.crouch, crouchHold: this.crouchHold, look: this.lookAt || null,
      sitting: this.idle > C.sitDelay && !this.sleeping && !this.frozen && !this.cat.rolling, sleeping: this.sleeping, rubbing: this.rubT > 0,
    });
  }

  rubAgainst(target) {
    this.rubT = 1.4;
    this.yaw = Math.atan2(target.x - this.pos.x, target.z - this.pos.z) + Math.PI / 2;
    this.vel.set(0, 0, 0);
  }
}
