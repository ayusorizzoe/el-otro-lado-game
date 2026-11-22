// Mice and pigeons.
// Mice forage along walls near their holes; when the cat comes close they bolt for the
// nearest hole and vanish, then reappear somewhere else later. Run into one or pounce
// (Space) when close to catch it.
// Pigeons gather in flocks on open ground and near food; they scatter together when the
// cat runs at them, land elsewhere, and drift back to where they were after a while.

import * as THREE from 'three';
import { collision } from '../systems/CollisionSystem.js';
import { bakeGroup } from '../rendering/Bake.js';

const HOLES = [[-12.2, 4.6], [-3.4, 4.65], [6.6, 4.0], [-7.85, 11.6], [8.0, 9.85], [-18.9, -7.9], [-6.2, -8.2], [19.3, 9.6], [-14.9, 9.7], [-19.4, 6.0]];
const FLOCK_SPOTS = [[0.8, 13.5], [-10.5, 7.9], [9.5, 7.6], [-22.5, 7.8], [22.5, -2.5], [-12, -6.5]];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function mouseMesh(materials) {
  const g = new THREE.Group();
  const c = materials.color(0x6e665e), e = materials.color(0x9a7a7a);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), c); body.scale.set(0.8, 0.7, 1.4); body.position.y = 0.03;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 5), c); head.rotation.x = Math.PI / 2; head.position.set(0, 0.03, 0.06);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.09, 3), e); tail.rotation.x = Math.PI / 2 - 0.3; tail.position.set(0, 0.02, -0.08);
  for (const s of [1, -1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), e); ear.position.set(s * 0.015, 0.06, 0.04); g.add(ear); }
  g.add(body, head, tail);
  bakeGroup(g, materials.figure);
  return g;
}
function birdMesh(materials) {
  const g = new THREE.Group();
  const col = materials.color(pick([0x8a8a92, 0x6a6a72, 0xa0a0a8, 0x7a7068]));
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), col); body.scale.set(0.9, 0.85, 1.4); body.position.y = 0.07;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), col); head.position.set(0, 0.13, 0.07);
  const wings = [];
  for (const s of [1, -1]) { const w = new THREE.Group(); w.position.set(s * 0.04, 0.09, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.07), col); m.position.x = s * 0.07; w.add(m); g.add(w); wings.push(w); }
  const headP = new THREE.Group(); headP.position.copy(head.position); head.position.set(0, 0, 0); headP.add(head);
  g.add(body, headP);
  bakeGroup(g, materials.figure, { shadow: false });
  return { g, wings, head: headP };
}

export class Critters {
  constructor(scene, materials) {
    this.mice = [];
    for (let i = 0; i < 7; i++) {
      const m = mouseMesh(materials);
      scene.add(m);
      const h = HOLES[i % HOLES.length];
      this.mice.push({ m, home: h, x: h[0], z: h[1], tx: h[0], tz: h[1], wait: Math.random() * 4, state: 'forage', hideT: 0, yaw: 0, night: i % 2 === 1 });
    }
    // flocks: each pigeon belongs to a spot it returns to
    this.birds = [];
    FLOCK_SPOTS.forEach((spot, k) => {
      const n = k === 0 ? 8 : 4;
      for (let i = 0; i < n; i++) {
        const { g, wings, head } = birdMesh(materials);
        scene.add(g);
        const ox = (Math.random() - 0.5) * 2, oz = (Math.random() - 0.5) * 1.4;
        this.birds.push({ g, wings, head, home: spot, ox, oz, x: spot[0] + ox, z: spot[1] + oz, y: 0, fly: 0, sx: 0, sz: 0, sy: 0, tx: 0, tz: 0, yaw: Math.random() * 6, hop: Math.random() * 3, away: 0, peck: Math.random() * 5 });
      }
    });
    this.noise = null;
  }

  tryCatch(cat, pounce) {
    for (const m of this.mice) {
      if (m.state === 'hidden' || !m.m.visible) continue;
      const d = Math.hypot(cat.x - m.x, cat.z - m.z);
      if (cat.y < 0.5 && (d < 0.24 || (pounce && d < 0.8))) {
        m.state = 'hidden'; m.hideT = 50 + Math.random() * 40; m.m.visible = false;
        return true;
      }
    }
    return false;
  }

  nearestMouse(cat) {
    let best = null, bd = 16;
    for (const m of this.mice) {
      if (m.state === 'hidden' || !m.m.visible) continue;
      const d = Math.hypot(cat.x - m.x, cat.z - m.z);
      if (d < bd) { bd = d; best = { x: m.x, y: 0.12, z: m.z }; }
    }
    return best;
  }

  // the nearest moving creature, for the cat to look at
  nearestCreature(cat, range = 3) {
    let best = null, bd = range;
    for (const m of this.mice) if (m.m.visible && m.state !== 'hidden') { const d = Math.hypot(cat.x - m.x, cat.z - m.z); if (d < bd) { bd = d; best = m.m.position; } }
    for (const b of this.birds) { const d = Math.hypot(cat.x - b.x, cat.z - b.z); if (d < bd) { bd = d; best = b.g.position; } }
    return best;
  }

  // a loud noise (a knocked can) scatters nearby pigeons
  scare(x, z, r = 4) { this.noise = { x, z, r }; }

  scatterFlock(b, from) {
    const spot = pick(FLOCK_SPOTS.filter((s) => s !== b.home));
    b.fly = 1; b.sx = b.x; b.sz = b.z; b.sy = b.y;
    b.tx = spot[0] + b.ox; b.tz = spot[1] + b.oz; b.away = 20 + Math.random() * 25;
    b.dest = spot;
  }

  update(dt, hour, cat, catSpeed, foods) {
    const h = hour % 24, night = h < 6 || h > 20;
    for (const m of this.mice) {
      if (m.state === 'hidden') {
        m.hideT -= dt;
        if (m.hideT <= 0) { const hole = pick(HOLES); m.home = hole; m.x = hole[0]; m.z = hole[1]; m.state = 'forage'; m.wait = 1; }
        m.m.visible = false;
        continue;
      }
      const on = m.night ? night || h > 17 : true;
      m.m.visible = on;
      if (!on) continue;
      const dx = m.x - cat.x, dz = m.z - cat.z, d = Math.hypot(dx, dz);
      let speed = 0;
      if (m.state !== 'flee' && d < 2.3 && cat.y < 0.6) {
        // bolt for the nearest hole that isn't behind the cat
        let best = m.home, bd = Infinity;
        for (const hole of HOLES) {
          const hx = hole[0] - m.x, hz = hole[1] - m.z, hd = Math.hypot(hx, hz);
          const towardCat = (hx * -dx + hz * -dz) / ((hd || 1) * (d || 1));
          const score = hd + (towardCat > 0.5 ? 20 : 0);
          if (score < bd) { bd = score; best = hole; }
        }
        m.state = 'flee'; m.tx = best[0]; m.tz = best[1];
      }
      if (m.state === 'flee') {
        speed = 2.7;
        if (Math.hypot(m.tx - m.x, m.tz - m.z) < 0.15) { m.state = 'hidden'; m.hideT = 6 + Math.random() * 10; continue; }
      } else if (m.wait > 0) m.wait -= dt;
      else if (Math.hypot(m.tx - m.x, m.tz - m.z) < 0.1) {
        m.wait = 1 + Math.random() * 4;
        m.tx = m.home[0] + (Math.random() - 0.5) * 3; m.tz = m.home[1] + (Math.random() - 0.5) * 0.6;
      } else speed = 0.8;
      if (speed > 0) {
        const ex = m.tx - m.x, ez = m.tz - m.z, l = Math.hypot(ex, ez) || 1;
        const res = collision.resolve(m.x + (ex / l) * speed * dt, m.z + (ez / l) * speed * dt, 0.05, 0.1, 0.05, 0.08);
        m.x = res.x; m.z = res.z;
        m.yaw = Math.atan2(ex, ez);
      }
      m.m.position.set(m.x, collision.groundAt(m.x, m.z, 0.3), m.z);
      m.m.rotation.y = m.yaw;
    }

    const now = performance.now();
    const noise = this.noise; this.noise = null;
    for (const b of this.birds) {
      const d = Math.hypot(cat.x - b.x, cat.z - b.z);
      const threatened = (d < (catSpeed > 2 ? 3.8 : 1.4) && cat.y < 2) || (noise && Math.hypot(noise.x - b.x, noise.z - b.z) < noise.r);
      if (b.fly <= 0 && threatened) {
        // the whole flock lifts together
        const spot = pick(FLOCK_SPOTS.filter((s) => s !== b.home));
        for (const o of this.birds) if (o.home === b.home && o.fly <= 0 && Math.hypot(o.x - b.x, o.z - b.z) < 4) {
          o.fly = 1 + Math.random() * 0.15; o.sx = o.x; o.sz = o.z; o.sy = o.y;
          o.tx = spot[0] + o.ox; o.tz = spot[1] + o.oz; o.away = 18 + Math.random() * 20;
        }
      }
      if (b.fly > 0) {
        b.fly += dt * 0.45;
        const t = Math.min(1, b.fly - 1);
        b.x = b.sx + (b.tx - b.sx) * t; b.z = b.sz + (b.tz - b.sz) * t;
        b.y = b.sy * (1 - t) + Math.sin(t * Math.PI) * 5;
        b.yaw = Math.atan2(b.tx - b.sx, b.tz - b.sz);
        const f = Math.sin(now * 0.035 + b.ox * 5) * 0.9;
        b.wings[0].rotation.z = f; b.wings[1].rotation.z = -f;
        if (t >= 1) { b.fly = 0; b.y = 0; }
      } else {
        b.wings[0].rotation.z = 0; b.wings[1].rotation.z = 0;
        // drift back home after a while
        if (b.away > 0) { b.away -= dt; if (b.away <= 0) { b.fly = 1; b.sx = b.x; b.sz = b.z; b.sy = 0; b.tx = b.home[0] + b.ox; b.tz = b.home[1] + b.oz; } }
        b.hop -= dt; b.peck -= dt;
        if (b.hop < 0) { b.hop = 0.5 + Math.random() * 2.5; b.yaw += (Math.random() - 0.5) * 2; b.x += Math.sin(b.yaw) * 0.12; b.z += Math.cos(b.yaw) * 0.12; }
        b.head.position.y = b.peck < 0.3 ? 0.08 : 0.13;
        if (b.peck < 0) b.peck = 1 + Math.random() * 4;
      }
      b.g.position.set(b.x, b.y + collision.groundAt(b.x, b.z, 0.3), b.z);
      b.g.rotation.y = b.yaw;
    }
  }
}
