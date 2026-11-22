// Life at cat height. Your hand-painted GLB props plus simple procedural ones, scattered
// at random over the street's slots (sills, steps, doorsteps, curbs, stall tables) each
// new game. Small things on ledges can be knocked off by the cat.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bakeGroup } from '../rendering/Bake.js';

const PROP_DIR = `${import.meta.env.BASE_URL}assets/models/props_GLBFiles/`;
const GLB = ['Cup', 'Soda', 'Cigs', 'Monitor', 'Noodles'];       // Bottle export is broken; sword removed
const MATERIAL = { default: { roughness: 0.88, metalness: 0 }, Soda: { roughness: 0.5, metalness: 0.3 } };

const loader = new GLTFLoader();
const cache = new Map();

async function loadProp(name) {
  if (!cache.has(name)) {
    cache.set(name, loader.loadAsync(`${PROP_DIR}props_${name}.glb`).then((gltf) => {
      const inner = gltf.scene;
      const box = new THREE.Box3().setFromObject(inner);
      const c = box.getCenter(new THREE.Vector3());
      inner.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
      inner.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; Object.assign(m.material, MATERIAL[name] ?? MATERIAL.default); } });
      return inner;
    }).catch(() => null));
  }
  const inner = await cache.get(name);
  if (!inner) return null;
  const g = new THREE.Group();
  g.add(inner.clone());
  return g;
}

// ---------------------------------------------------------------- procedural props (few polygons each)
function makers(M) {
  const mesh = (geo, hex, kind) => { const m = new THREE.Mesh(geo, M.color(hex, kind)); m.castShadow = true; m.receiveShadow = true; return m; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return {
    can: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8), pick([0xb5402f, 0xd9a23a, 0x3f7a4a, 0x2f5a9a]))); g.children[0].position.y = 0.06; return { g, small: true }; },
    chileCan: () => {
      const g = new THREE.Group();
      const c = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 8), 0xa9a69c); c.position.y = 0.055;
      const band = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 8, 1, true), pick([0xb5402f, 0xd9a23a])); band.position.y = 0.06;
      g.add(c, band);
      for (let i = 0; i < 5; i++) { const l = mesh(new THREE.ConeGeometry(0.015, 0.18 + Math.random() * 0.1, 3), 0x5f7d45); l.position.set((Math.random() - 0.5) * 0.04, 0.2, (Math.random() - 0.5) * 0.04); l.rotation.set((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8); g.add(l); }
      return { g, small: false };
    },
    bucket: () => { const g = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.28, 8), pick([0x3f6fa6, 0xc23b2e, 0xe0c050, 0x5aa36a])); b.position.y = 0.14; g.add(b); return { g, solid: [0.15, 0.28] }; },
    chair: () => {
      const g = new THREE.Group(); const col = pick([0xd23a2a, 0xe8e8e8, 0x3a6aa6, 0x2f8a5a]);
      const seat = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), col); seat.position.y = 0.44;
      const back = mesh(new THREE.BoxGeometry(0.42, 0.4, 0.04), col); back.position.set(0, 0.66, -0.2);
      g.add(seat, back);
      for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.44, 4), col); l.position.set(x, 0.22, z); g.add(l); }
      return { g, solid: [0.22, 0.46], top: 0.46 };
    },
    crate: () => {
      const g = new THREE.Group(); const b = mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35), pick([0xb98b4f, 0x3e6fa0, 0xc0453a]), 'wall'); b.position.y = 0.15; g.add(b);
      for (let i = 0; i < 4; i++) { const f = mesh(new THREE.IcosahedronGeometry(0.06, 0), pick([0xc2402e, 0xe0b040, 0x6a9a3a, 0xd47a2a])); f.position.set(-0.15 + i * 0.1, 0.32, (Math.random() - 0.5) * 0.15); g.add(f); }
      return { g, solid: [0.27, 0.32], top: 0.34 };
    },
    tire: () => { const g = new THREE.Group(); const t = mesh(new THREE.TorusGeometry(0.24, 0.09, 5, 10), 0x222222); t.rotation.x = Math.PI / 2; t.position.y = 0.09; g.add(t); return { g, solid: [0.3, 0.18], top: 0.18 }; },
    shoes: () => { const g = new THREE.Group(); const c = pick([0x3a3530, 0xd8d4ca, 0x7a2a2a]); for (const x of [-0.06, 0.06]) { const s = mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), c); s.position.set(x, 0.035, (Math.random() - 0.5) * 0.06); s.rotation.y = (Math.random() - 0.5) * 0.4; g.add(s); } return { g }; },
    bag: () => { const g = new THREE.Group(); const b = mesh(new THREE.IcosahedronGeometry(0.2, 0), pick([0x1e1f21, 0xd8d0c0, 0x4a6aa0])); b.scale.set(1, 1.1, 0.9); b.position.y = 0.2; g.add(b); return { g, solid: [0.18, 0.4], top: 0.38 }; },
    box: () => { const g = new THREE.Group(); const b = mesh(new THREE.BoxGeometry(0.45, 0.32, 0.36), 0xb08a58, 'wall'); b.position.y = 0.16; g.add(b); return { g, solid: [0.25, 0.32], top: 0.32 }; },
    bicycle: () => {
      const g = new THREE.Group(); const col = pick([0x8a2a2a, 0x2a4a8a, 0x3a3a3a]);
      for (const z of [-0.5, 0.5]) { const w = mesh(new THREE.TorusGeometry(0.3, 0.02, 4, 10), 0x1e1e1e); w.rotation.y = Math.PI / 2; w.position.set(0, 0.32, z); g.add(w); }
      const f = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.9), col); f.position.set(0, 0.55, 0); f.rotation.x = 0.1; g.add(f);
      const s = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 4), col); s.position.set(0, 0.55, -0.2); g.add(s);
      g.rotation.z = 0.25;
      return { g };
    },
    plate: () => { const g = new THREE.Group(); const p = mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.03, 8), pick([0xc98a8a, 0xe6e0d4, 0x8ab0c9])); p.position.y = 0.015; g.add(p); return { g, small: true }; },
  };
}

/**
 * slots: [{ x, y, z, kind: 'ledge'|'floor'|'table' }]. Returns { group, knockables, solids }.
 * knockables fall when the cat walks into them on a ledge; solids become collision boxes.
 */
export async function scatterProps(materials, slots) {
  const group = new THREE.Group();
  group.name = 'props';
  const K = makers(materials);
  const shuffled = slots.slice().sort(() => Math.random() - 0.5);
  const knockables = [], solids = [];
  let si = 0;
  const take = (pred) => { for (let k = si; k < shuffled.length; k++) if (pred(shuffled[k])) { const s = shuffled[k]; shuffled.splice(k, 1); return s; } return null; };

  // your props: each once, on a ledge or table if possible
  for (const name of GLB) {
    const s = take((x) => (name === 'Monitor' ? x.kind === 'floor' : x.kind !== 'floor')) || take(() => true);
    if (!s) break;
    const o = await loadProp(name);
    if (!o) continue;
    o.position.set(s.x, s.y, s.z);
    o.rotation.y = Math.random() * Math.PI * 2;
    group.add(o);
    if (name !== 'Monitor' && s.y > 0.3) knockables.push({ obj: o, vy: 0, falling: false, ground: 0 });
  }
  // procedural props
  const floorKinds = ['bucket', 'chair', 'crate', 'tire', 'shoes', 'bag', 'box', 'bicycle', 'chileCan', 'chileCan', 'plate'];
  const ledgeKinds = ['can', 'can', 'chileCan', 'plate'];
  for (const s of shuffled) {
    if (Math.random() < 0.25) continue;
    const kind = s.kind === 'floor' ? floorKinds[Math.floor(Math.random() * floorKinds.length)] : ledgeKinds[Math.floor(Math.random() * ledgeKinds.length)];
    const p = K[kind]();
    bakeGroup(p.g, materials.figure);
    p.g.position.set(s.x, s.y, s.z);
    p.g.rotation.y = Math.random() * Math.PI * 2;
    group.add(p.g);
    if (p.small && s.y > 0.3) knockables.push({ obj: p.g, vy: 0, falling: false, ground: 0 });
    if (p.solid && s.kind === 'floor') solids.push({ x: s.x, z: s.z, r: p.solid[0], y0: s.y, top: s.y + (p.top ?? p.solid[1]) });
  }
  return { group, knockables, solids };
}

// knock small things off ledges when the cat walks into them
export function updateKnockables(list, cat, dt, groundAt, onLand) {
  for (const k of list) {
    const o = k.obj;
    if (!k.falling) {
      if (Math.abs(cat.y - o.position.y) < 0.25 && Math.hypot(cat.x - o.position.x, cat.z - o.position.z) < 0.22) {
        k.falling = true;
        const dx = o.position.x - cat.x, dz = o.position.z - cat.z, l = Math.hypot(dx, dz) || 1;
        k.vx = (dx / l) * 1.2; k.vz = (dz / l) * 1.2; k.vy = 1.5;
        k.ground = groundAt(o.position.x + k.vx * 0.3, o.position.z + k.vz * 0.3, o.position.y - 0.3);
      }
      continue;
    }
    if (k.done) continue;
    k.vy -= 18 * dt;
    o.position.x += k.vx * dt; o.position.z += k.vz * dt; o.position.y += k.vy * dt;
    o.rotation.x += dt * 6; o.rotation.z += dt * 4;
    if (o.position.y <= k.ground) { o.position.y = k.ground; o.rotation.x = Math.PI / 2; o.rotation.z = 0; k.done = true; if (onLand) onLand(o.position); }
  }
}
