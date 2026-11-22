// Sniffing (Q): motes drift from the cat along the street toward what it smells. Each chapter
// has its own colour. The trail stays until you get there.

import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { dotTexture } from '../rendering/Paint.js';
import { Z } from '../world/Street.js';

const N = 620;
const COLORS = { food: new THREE.Color(0xffd27a), meat: new THREE.Color(0xff8a3c), bread: new THREE.Color(0xff9fc8), phone: new THREE.Color(0x6ac8ff), secret: new THREE.Color(0xffe04d) };

function pointsSystem(count, size) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ map: dotTexture(), size, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return { p, pos, col, geo, mat };
}

// route along the street's aisle so trails don't cut through houses
function route(a, b, via) {
  const pts = [a.clone()];
  // up the stairs: through the given points, once the cat is still down in the street
  if (via && a.y < 3) { pts.push(new THREE.Vector3(a.x, 0.1, Z.aisle)); for (const v of via) if (a.z > v[2] - 1 || a.x < 18) pts.push(new THREE.Vector3(...v)); }
  const direct = via || a.distanceTo(b) < 3.5 || a.y > 1.2 || b.y > 1.2;
  if (!direct) { pts.push(new THREE.Vector3(a.x, 0.1, Z.aisle)); pts.push(new THREE.Vector3(b.x, 0.1, Z.aisle)); }
  pts.push(b.clone());
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, lens, total: lens[lens.length - 1] || 1 };
}
function along(r, s, out) {
  const d = s * r.total;
  let i = 1;
  while (i < r.lens.length - 1 && r.lens[i] < d) i++;
  const t = (d - r.lens[i - 1]) / Math.max(1e-6, r.lens[i] - r.lens[i - 1]);
  return out.lerpVectors(r.pts[i - 1], r.pts[i], Math.min(1, t));
}

export class ScentSystem {
  constructor(scene) {
    this.trail = pointsSystem(N, 0.085);
    this.trail.p.visible = false;
    this.wisp = pointsSystem(80, 0.05);
    this.wisp.mat.opacity = 0.5;
    scene.add(this.trail.p, this.wisp.p);
    this.routes = [];
    this.t = 0; this.cool = 0;
    this._v = new THREE.Vector3();
  }

  // targets: [{ x, y, z, kind }]
  sniff(from, targets) {
    if (this.cool > 0 || !targets.length) return false;
    this.routes = targets.slice(0, 4).map((t) => ({ r: route(from, new THREE.Vector3(t.x, (t.y ?? 0) + 0.2, t.z), t.via), c: COLORS[t.kind] || COLORS.food }));
    this.t = Config.scent.duration; this.cool = Config.scent.duration + Config.scent.cooldown;
    this.trail.p.visible = true;
    return true;
  }

  // keep a trail to one target alive, re-drawn from wherever the cat is now
  follow(from, target, dt) {
    this.rt = (this.rt || 0) - dt;
    if (this.rt <= 0) { this.rt = 0.6; this.routes = [{ r: route(from, new THREE.Vector3(target.x, (target.y ?? 0) + 0.2, target.z), target.via), c: COLORS[target.kind] || COLORS.food }]; }
    if (!this.trail.p.visible) this.t = Config.scent.duration;
    else if (this.t < Config.scent.duration * 0.5) this.t = Config.scent.duration * 0.5;
    this.trail.p.visible = true;
  }

  update(dt, foods, cat) {
    const now = performance.now() / 1000;
    this.cool = Math.max(0, this.cool - dt);
    if (this.t > 0) {
      this.t -= dt;
      const life = 1 - this.t / Config.scent.duration;
      this.trail.mat.opacity = Math.min(1, this.t * 1.5) * 0.9;
      const per = Math.floor(N / this.routes.length);
      this.routes.forEach(({ r, c }, k) => {
        for (let i = 0; i < per; i++) {
          const idx = (k * per + i) * 3;
          const s = (((i / per) + now * 0.15) % 1) * Math.min(1, life * 2.5);
          along(r, s, this._v);
          this.trail.pos[idx] = this._v.x + Math.sin(i * 12.9 + now * 2) * 0.12;
          this.trail.pos[idx + 1] = this._v.y + 0.12 + Math.sin(i * 3.7 + now * 3) * 0.07;
          this.trail.pos[idx + 2] = this._v.z + Math.cos(i * 7.3 + now * 2) * 0.12;
          this.trail.col[idx] = c.r; this.trail.col[idx + 1] = c.g; this.trail.col[idx + 2] = c.b;
        }
      });
      for (let i = per * this.routes.length; i < N; i++) this.trail.pos[i * 3 + 1] = -100;
      this.trail.geo.attributes.position.needsUpdate = true;
      this.trail.geo.attributes.color.needsUpdate = true;
    } else this.trail.p.visible = false;

    // faint wisps rising from food within a few metres
    const near = foods.filter((f) => Math.hypot(f.x - cat.x, f.z - cat.z) < 6).slice(0, 8);
    for (let i = 0; i < 80; i++) {
      const f = near[i % Math.max(1, near.length)];
      const idx = i * 3;
      if (!f) { this.wisp.pos[idx + 1] = -100; continue; }
      const u = ((i * 0.137) + now * 0.25) % 1;
      this.wisp.pos[idx] = f.x + Math.sin(i * 5.1 + now) * 0.08;
      this.wisp.pos[idx + 1] = f.y + 0.05 + u * 0.6;
      this.wisp.pos[idx + 2] = f.z + Math.cos(i * 3.3 + now) * 0.08;
      const a = (1 - u) * 0.8;
      this.wisp.col[idx] = COLORS.food.r * a; this.wisp.col[idx + 1] = COLORS.food.g * a; this.wisp.col[idx + 2] = COLORS.food.b * a;
    }
    this.wisp.geo.attributes.position.needsUpdate = true;
    this.wisp.geo.attributes.color.needsUpdate = true;
  }
}
