// Air: dust motes drifting with the wind around the cat (brighter in sunlight), and a few
// scraps of loose paper skittering along the street. Cheap, batched, spatially coherent.

import * as THREE from 'three';
import { wind } from '../rendering/Wind.js';
import { dotTexture } from '../rendering/Paint.js';
import { collision } from '../systems/CollisionSystem.js';

const DUST = 260, BOX = 14;

export class Atmosphere {
  constructor(scene, materials) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(DUST * 3);
    this.seed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * BOX; this.pos[i * 3 + 1] = Math.random() * 4; this.pos[i * 3 + 2] = (Math.random() - 0.5) * BOX;
      this.seed[i] = Math.random() * 10;
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ map: dotTexture(), color: 0xfff2d8, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(g, this.mat);
    this.dust.frustumCulled = false;
    this.geo = g;
    scene.add(this.dust);

    // loose paper and wrappers
    this.paper = [];
    const pg = new THREE.PlaneGeometry(0.14, 0.1);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(pg, materials.color([0xe8e2d0, 0xd8c8a8, 0xc94f4f, 0x8ab0c9][i % 4]));
      m.material.side = THREE.DoubleSide;
      const x = -18 + Math.random() * 36, z = 6 + Math.random() * 4;
      m.position.set(x, 0.01, z);
      m.rotation.x = -Math.PI / 2;
      scene.add(m);
      this.paper.push({ m, vx: 0, vz: 0, vy: 0, spin: Math.random() * 6 });
    }
  }

  update(dt, center, sunlight) {
    const w = wind.dir, st = wind.strength, t = wind.t;
    const p = this.pos;
    for (let i = 0; i < DUST; i++) {
      const k = i * 3, s = this.seed[i];
      p[k] += (w.x * st * 0.6 + Math.sin(t * 0.7 + s) * 0.08) * dt;
      p[k + 1] += (Math.sin(t * 0.5 + s * 2) * 0.05 - 0.01) * dt;
      p[k + 2] += (w.z * st * 0.6 + Math.cos(t * 0.6 + s) * 0.08) * dt;
      // keep the motes in a box that follows the cat (wrap around)
      const rx = p[k] - center.x, rz = p[k + 2] - center.z;
      if (rx > BOX / 2) p[k] -= BOX; if (rx < -BOX / 2) p[k] += BOX;
      if (rz > BOX / 2) p[k + 2] -= BOX; if (rz < -BOX / 2) p[k + 2] += BOX;
      if (p[k + 1] < center.y - 0.5) p[k + 1] += 4; if (p[k + 1] > center.y + 3.5) p[k + 1] -= 4;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.mat.opacity = 0.12 + sunlight * 0.45;

    for (const q of this.paper) {
      const gust = st > 0.6 ? (st - 0.6) * 4 : 0;
      q.vx += (w.x * st * 1.2 - q.vx) * dt * 1.5; q.vz += (w.z * st * 1.2 - q.vz) * dt * 1.5;
      if (q.m.position.y < 0.02 && Math.random() < gust * dt) q.vy = 1 + Math.random();
      q.vy -= 4 * dt;
      const o = q.m.position;
      const g = collision.groundAt(o.x, o.z, o.y + 0.3);
      o.x += q.vx * dt * (o.y > g + 0.02 ? 1 : 0.35); o.z += q.vz * dt * (o.y > g + 0.02 ? 1 : 0.35);
      o.y = Math.max(g + 0.01, o.y + q.vy * dt);
      if (o.y <= g + 0.011) q.vy = 0;
      q.spin += dt * (o.y > g + 0.05 ? 6 : 0.5);
      q.m.rotation.set(-Math.PI / 2 + Math.sin(q.spin) * (o.y > g + 0.05 ? 1 : 0.1), 0, q.spin * 0.3);
      if (o.x > 19) o.x = -19; if (o.x < -19) o.x = 19;
      if (o.z < 5.8 || o.z > 10.2) o.z = 6 + Math.random() * 4;
    }
  }
}
