// The neighbourhood: a tianguis street that widens into a small plaza, a narrow residential
// stretch to the east, an alley to a back courtyard, a short street rising west to a
// viewpoint over the sea, and a raised mirador to the east facing the border wall.
// Rooftops connect along the north row; the mirador can be reached from a roof.
//
// North houses face +z; south houses are rotated to face -z. The street runs along x.

import * as THREE from 'three';
import { ConstructionBatch, Finish, stair, railing } from './Architecture.js';
import { buildHouse, HOUSE } from './House.js';
import { scatterProps } from './Props.js';
import { stallGoods, sign } from './Goods.js';
import { collision } from '../systems/CollisionSystem.js';
import { windMaterial, colorize } from '../rendering/Wind.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../utils/Math.js';

export const Z = { northFront: 4.5, curbN: 5.7, curbS: 10.2, southFront: 11.45, aisle: 7.95, plazaBack: 14.85 };
const SW = HOUSE.sidewalk;
export const BOUNDS = { minX: -27.2, maxX: 24.8, minZ: -8.3, maxZ: 23 };

const PAL = {
  ochre: { low: 0xd2b46e, up: 0xc9c2b2, zoclo: 0x5d6b4a },
  salmon: {},
  teal: { low: 0x9cb7b0, up: 0xd8cfbf, zoclo: 0x3e5b63, upper: false },
  rose: { low: 0xc7a3b8, up: 0xb9c4a0, zoclo: 0x6a4a5a },
  cream: { low: 0xe0cfa8, up: 0xc28b70, zoclo: 0x8a4a3a, upper: false },
  sage: { low: 0xb7c49a, up: 0xe6dccb, zoclo: 0x4a5a3a },
  blue: { low: 0x8fb3c2, up: 0xd9b9a0, zoclo: 0x3a4a6a, upper: false },
  coral: { low: 0xd98a6a, up: 0xcfc28a, zoclo: 0x6a3a2a },
  sand: { low: 0xcfc28a, up: 0x9fbab0, zoclo: 0x5a5a3a },
};
// varied setbacks: the plaza houses sit back, the east house pushes into the street
const HOUSES = [
  { x: -16.2, z: 0, flip: false, ...PAL.ochre },
  { x: -7.45, z: 0, flip: false, ...PAL.rose },
  { x: 0, z: 0, flip: false, ...PAL.salmon },                  // the hero house: stair, box, roof route
  { x: 7.6, z: -0.6, flip: false, ...PAL.teal },
  { x: 15.2, z: 0, flip: false, ...PAL.sage },
  { x: -11.4, z: 16.1, flip: true, ...PAL.blue },
  { x: -3.8, z: 19.5, flip: true, ...PAL.coral },
  { x: 3.8, z: 19.5, flip: true, ...PAL.cream },
  { x: 11.4, z: 14.6, flip: true, ...PAL.sand },
];
const TARPS = [0xd1477a, 0x3a7fc0, 0x5aa36a, 0xe0a030, 0x7a5ab0, 0xc23b2e, 0x2e9aa6, 0xe07a30];
const WALL = 0xa29c91;

export async function buildStreet(scene, materials) {
  const group = new THREE.Group();
  group.name = 'street';
  scene.add(group);
  const blockers = [], slots = [];
  const b = new ConstructionBatch(materials);
  b.jitter = 0.001;
  const sway = [];                       // geometries that move with the wind
  const r = rng(4);
  const wall = (x0, z0, x1, z1, h, col = WALL, y0 = 0) => {
    b.box(x0, y0, z0, x1, y0 + h, z1, Finish.concrete(col, { ground: y0, top: y0 + h }), { seg: 1.2 });
    collision.box(x0, y0, z0, x1, y0 + h, z1);
  };

  // ---------------------------------------------------------------- ground surfaces
  b.box(-19.6, -0.02, Z.curbN, 19.6, 0.005, 10.4, { kind: 'plain', color: 0x5f5c58, var: 0.06, grime: 0, streak: 0 }, { seg: 2 });
  // north sidewalk, all along
  b.box(-19.6, -0.1, Z.northFront - 0.6, 19.6, SW, Z.curbN, Finish.concrete(0x9e998f, { grime: 0.05, ground: -0.1 }), { seg: 1.2 });
  collision.box(-19.6, 0, Z.northFront - 0.6, 19.6, SW, Z.curbN);
  // south sidewalk (west part) and the plaza paving
  b.box(-19.6, -0.1, Z.curbS, -7.95, SW, Z.southFront, Finish.concrete(0x9e998f, { grime: 0.05, ground: -0.1 }), { seg: 1.2 });
  collision.box(-19.6, 0, Z.curbS, -7.95, SW, Z.southFront);
  b.box(-7.95, -0.1, Z.curbS, 7.25, SW, Z.plazaBack, Finish.concrete(0xb0a690, { grime: 0.04, var: 0.12, ground: -0.1 }), { seg: 1.0 });
  collision.box(-7.95, 0, Z.curbS, 7.25, SW, Z.plazaBack);
  for (const [x0, x1, z] of [[-19.6, 7.25, Z.curbS + 0.06], [-19.6, 19.6, Z.curbN - 0.06]]) b.box(x0, -0.12, z - 0.06, x1, SW + 0.005, z + 0.06, Finish.concrete(0xa7a297, { grime: 0.2, ground: -0.1 }), { seg: 1.2 });
  // alley and back courtyard (bare earth and broken concrete)
  b.box(-19.5, -0.02, -8.5, -3.0, 0.004, 4.0, { kind: 'plain', color: 0x8f8574, var: 0.1, grime: 0, streak: 0 }, { seg: 1.5 });

  // ---------------------------------------------------------------- the plaza: tree, bench, a place to gather
  b.box(3.6, SW, 13.0, 5.4, SW + 0.45, 14.6, Finish.concrete(0xb6a68c));
  collision.box(3.6, 0, 13.0, 5.4, SW + 0.45, 14.6);
  b.cylinder([4.5, SW + 2.0, 13.8], 0.12, 0.18, 3.2, Finish.plain(0x6b5643), { radial: 6 });
  collision.box(4.38, 0, 13.68, 4.62, 3.6, 13.92);
  const crown = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.IcosahedronGeometry(0.9 + r() * 0.5, 0);
    g.translate(4.5 + (r() - 0.5) * 1.4, SW + 3.6 + r() * 0.8, 13.8 + (r() - 0.5) * 1.4);
    crown.push(colorize(g, [0x6f8a52, 0x5f7d4c, 0x7d9459][i % 3], (x, y) => Math.max(0, (y - SW - 3.2) / 1.5)));
  }
  sway.push(...crown);
  const bench = (x, z, face) => {
    const zz = face > 0 ? 0.25 : -0.25;
    b.box(x - 0.9, SW + 0.4, z - 0.22, x + 0.9, SW + 0.47, z + 0.22, Finish.plain(0x7a5a40));
    b.box(x - 0.9, SW + 0.47, z + zz - 0.04, x + 0.9, SW + 0.85, z + zz + 0.04, Finish.plain(0x7a5a40));
    for (const ox of [-0.75, 0.75]) b.box(x + ox - 0.05, SW, z - 0.2, x + ox + 0.05, SW + 0.4, z + 0.2, Finish.metal(0x4b4a4c), { jitter: 0 });
    collision.box(x - 0.9, 0, z - 0.22, x + 0.9, SW + 0.47, z + 0.22);
  };
  bench(-5.4, 14.35, 1);

  // ---------------------------------------------------------------- west: the street rises to a viewpoint over the sea
  const slopeTop = 1.5;
  b.orientedBox([-21.8, slopeTop / 2 - 0.15, 7.8], [Math.hypot(4.4, slopeTop) + 0.05, 0.3, 5.6], { z: -Math.atan2(slopeTop, 4.4) }, { kind: 'plain', color: 0x6a6660, var: 0.06, grime: 0, streak: 0 }, { jitter: 0 });
  collision.ramp(-24, 5.0, -19.6, 10.6, 'x', -19.6, -24, 0, slopeTop, -0.5);
  b.box(-27.5, -0.5, 5.0, -24, slopeTop, 10.6, Finish.concrete(0x9e998f, { top: slopeTop, ground: -0.5 }));
  collision.box(-27.5, -0.5, 5.0, -24, slopeTop, 10.6);
  wall(-27.6, 4.5, -19.6, 5.0, 3.2, 0xb38f7c);                       // high retaining wall on the north side
  wall(-27.6, 10.6, -19.6, 11.1, 2.4, 0xc9b49a);                      // garden wall to the south
  railing(b, { points: [[-27.4, slopeTop, 5.1], [-27.4, slopeTop, 10.5]], h: 1.0, spacing: 0.9, bars: 14 });
  collision.box(-27.5, slopeTop, 5.0, -27.3, slopeTop + 1.0, 10.6);
  // a private courtyard glimpsed over a wall south of the west sidewalk
  wall(-19.6, 11.45, -15.6, 11.7, 1.95, 0xd8cfbf);
  b.cylinder([-17.6, 1.6, 13.5], 0.1, 0.14, 3.2, Finish.plain(0x6b5643), { radial: 6 });
  { const g = new THREE.IcosahedronGeometry(1.3, 0); g.translate(-17.6, 3.6, 13.5); sway.push(colorize(g, 0x5f7d4c, (x, y) => Math.max(0, (y - 3) / 1.3))); }

  // ---------------------------------------------------------------- east: stairs up to the mirador facing the border
  const M = { x0: 19.6, x1: 25, z0: -6.2, z1: 5.2, y: 4.2 };
  b.box(M.x0, 0, M.z0, M.x1, M.y, M.z1, Finish.concrete(0x9a948a, { top: M.y }), { seg: 1.5 });
  collision.box(M.x0, 0, M.z0, M.x1, M.y, M.z1);
  stair(b, { x0: M.x0, x1: M.x0 + 1.0, zStart: 10.3, zEnd: 5.2, y0: 0, y1: M.y, steps: 18, finish: Finish.concrete(0xa09a8f) });
  for (let i = 0; i < 6; i++) {
    const za = 10.3 - (5.1 / 6) * i, zb = 10.3 - (5.1 / 6) * (i + 1), ya = (M.y / 6) * i, yb = (M.y / 6) * (i + 1);
    collision.box(M.x0, Math.max(0, ya - 0.4), zb, M.x0 + 1.0, yb, za, { ramp: { axis: 'z', from: za, to: zb, lo: ya, hi: yb } });
  }
  railing(b, { points: [[M.x0 + 1.0, 0.2, 10.2], [M.x0 + 1.0, M.y, 5.2]], h: 0.9, spacing: 1.4 });
  railing(b, { points: [[M.x0 + 0.05, M.y, M.z0 + 0.05], [M.x1 - 0.05, M.y, M.z0 + 0.05], [M.x1 - 0.05, M.y, M.z1 - 0.05], [M.x0 + 1.1, M.y, M.z1 - 0.05]], h: 1.0, spacing: 1.0, bars: 40 });
  railing(b, { points: [[M.x0 + 0.05, M.y, M.z0 + 0.05], [M.x0 + 0.05, M.y, -1.6]], h: 1.0, spacing: 1.0, bars: 6 });
  collision.box(M.x0, M.y, M.z0, M.x1, M.y + 1.0, M.z0 + 0.1);
  collision.box(M.x1 - 0.1, M.y, M.z0, M.x1, M.y + 1.0, M.z1);
  collision.box(M.x0 + 1.0, M.y, M.z1 - 0.1, M.x1, M.y + 1.0, M.z1);
  collision.box(M.x0, M.y, M.z0, M.x0 + 0.1, M.y + 1.0, -1.6);       // gap left toward the roof next door
  bench(23.4, -5.3, 1);
  // the block south of the narrow stretch, closing the east end
  b.box(14.7, 0, 10.4, 25, 6.6, 20.5, Finish.paint(0xc9c2b2, { ground: 0, top: 6.6 }), { seg: 1.5 });
  collision.box(14.7, 0, 10.4, 25, 6.6, 20.5);
  for (let x = 15.3; x < 24.5; x += 2.6) for (const y of [1.3, 4.0]) b.box(x, y, 10.37, x + 1.1, y + 1.0, 10.41, { kind: 'plain', color: 0x2a3132, var: 0.05, grime: 0, streak: 0, mat: 'glass' }, { jitter: 0 });
  b.box(16.6, 0, 10.32, 17.5, 2.15, 10.4, Finish.metal(0x5a2e26), { jitter: 0 });   // the taquero's door
  wall(24.9, 5.2, 25.3, 10.4, 3.0);                                                  // east end of the nook

  // ---------------------------------------------------------------- the back courtyard behind the north row, reached by the alley
  wall(-19.8, -8.7, -2.9, -8.4, 2.6, 0x9a9283);
  wall(-19.8, -8.7, -19.5, -4.5, 2.6, 0x9a9283);
  wall(-3.2, -8.7, -2.9, -4.5, 2.2, 0x9a9283);
  // lean-to sheet and a few things living there
  b.orientedBox([-17.6, 1.6, -7.7], [2.2, 0.03, 1.4], { x: 0.25 }, Finish.metal(0x8d9392), { jitter: 0 });
  collision.box(-18.7, 1.45, -8.4, -16.5, 1.75, -7.0);
  for (const z of [-7.0]) for (const x of [-18.6, -16.6]) b.box(x - 0.03, 0, z - 0.03, x + 0.03, 1.45, z + 0.03, Finish.metal(0x4a4a48), { jitter: 0 });
  // clothesline across the courtyard
  for (const x of [-15.5, -9.5]) b.cylinder([x, 0.9, -6.0], 0.025, 0.025, 1.8, Finish.metal(0x5a5a5a), { radial: 4 });
  for (let i = 0; i < 6; i++) {
    const x = -15.0 + i * 0.95, h = 0.4 + r() * 0.35, w = 0.35 + r() * 0.3;
    const g = new THREE.PlaneGeometry(w, h, 1, 2); g.translate(x, 1.75 - h / 2, -6.0);
    sway.push(colorize(g, [0xc94f4f, 0xe8e2d0, 0x4f78a8, 0xe0c050, 0x7aa36a, 0xd98fb0][i], (xx, y) => Math.max(0, (1.75 - y) / h)));
  }
  { const g = new THREE.CylinderGeometry(0.008, 0.008, 6.0, 3, 1); g.rotateZ(Math.PI / 2); g.translate(-12.5, 1.76, -6.0); sway.push(colorize(g, 0xdddddd, 0)); }
  b.cylinder([-6.0, 0.25, -7.6], 0.25, 0.3, 0.5, Finish.plain(0xb25a3a), { radial: 7 });
  { const g = new THREE.IcosahedronGeometry(0.5, 0); g.translate(-6.0, 0.9, -7.6); sway.push(colorize(g, 0x6d8a4f, (x, y) => Math.max(0, y - 0.6))); }

  // ---------------------------------------------------------------- utility poles and cables (the layered silhouette)
  const poles = [[-14.0, 5.5], [-4.6, 5.5], [5.2, 5.5], [13.6, 5.5], [-9.6, 10.4], [3.4, 10.4]];
  const lamps = [];
  for (const [x, z] of poles) {
    b.cylinder([x, 3.6, z], 0.09, 0.13, 7.2, Finish.plain(0x7a6a58, { var: 0.08 }), { radial: 6 });
    b.box(x - 0.6, 6.7, z - 0.05, x + 0.6, 6.8, z + 0.05, Finish.plain(0x6a5a48), { jitter: 0 });
    collision.box(x - 0.12, 0, z - 0.12, x + 0.12, 7.2, z + 0.12);
    lamps.push(new THREE.Vector3(x, 5.0, z + (z < 8 ? 0.4 : -0.4)));
    b.box(x - 0.15, 4.95, z - 0.35, x + 0.15, 5.05, z + 0.35, Finish.metal(0x6e6e6a), { jitter: 0 });
  }
  const cable = (a, c, sag, rad = 0.012, hex = 0x1e1e20) => {
    const mid = new THREE.Vector3().lerpVectors(a, c, 0.5); mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, c);
    const g = new THREE.TubeGeometry(curve, 10, rad, 3, false);
    const p = g.attributes.position;
    const len = a.distanceTo(c);
    sway.push(colorize(g, hex, (x, y, z) => {
      const t = Math.min(1, Math.hypot(x - a.x, z - a.z) / Math.max(0.01, Math.hypot(c.x - a.x, c.z - a.z)));
      return Math.sin(t * Math.PI) * Math.min(1, len / 8) * 0.6;
    }));
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // along the north side, three wires between poles
  for (let i = 0; i < 3; i++) {
    const order = [[-14.0, 5.5], [-4.6, 5.5], [5.2, 5.5], [13.6, 5.5]];
    for (let k = 0; k < order.length - 1; k++) cable(V(order[k][0], 6.75 - i * 0.18, order[k][1] + (i - 1) * 0.15), V(order[k + 1][0], 6.75 - i * 0.18, order[k + 1][1] + (i - 1) * 0.15), 0.55 + i * 0.1);
  }
  // crossing the street, and service drops to the houses
  cable(V(-4.6, 6.6, 5.5), V(-9.6, 6.6, 10.4), 0.7);
  cable(V(5.2, 6.6, 5.5), V(3.4, 6.6, 10.4), 0.6);
  cable(V(-4.6, 6.5, 5.5), V(3.4, 6.5, 10.4), 0.9, 0.018);
  for (const [px, hx, hz] of [[-14.0, -15.5, 4.6], [-14.0, -10.0, 4.6], [-4.6, -6.5, 4.6], [-4.6, -1.0, 4.6], [5.2, 2.5, 4.6], [5.2, 8.5, 4.0], [13.6, 12.5, 4.6], [13.6, 17.5, 4.6]]) cable(V(px, 6.4, 5.5), V(hx, 2.75, hz), 0.35, 0.008);
  for (const [px, pz, hx, hz] of [[-9.6, 10.4, -12.5, 11.5], [-9.6, 10.4, -6.0, 14.9], [3.4, 10.4, 1.5, 14.9], [3.4, 10.4, 6.0, 14.9], [13.6, 5.5, 12.0, 9.9]]) cable(V(px, 6.3, pz), V(hx, 2.75, hz), 0.3, 0.008);
  // a few strings of papel picado, only over the plaza
  for (const [x0, z0, x1, z1] of [[-7.6, 11.6, 6.8, 14.4], [-7.6, 14.4, 6.8, 11.6]]) {
    const n = 18;
    for (let i = 1; i < n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = 4.2 - Math.sin(t * Math.PI) * 0.6;
      const g = new THREE.PlaneGeometry(0.24, 0.26, 1, 2); g.translate(0, -0.13, 0); g.rotateY(Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2); g.translate(x, y, z);
      sway.push(colorize(g, TARPS[i % TARPS.length], (xx, yy) => Math.max(0, (y - yy) / 0.26) * 0.8 + 0.2));
    }
    cable(V(x0, 4.2, z0), V(x1, 4.2, z1), 0.6, 0.006, 0xd8d8d0);
  }

  // ---------------------------------------------------------------- tianguis stalls
  const stalls = [];
  const stallSpots = [
    // north curb, facing the street (side +1: vendor at the curb, tarp slopes back)
    ...[-14.6, -8.6, -5.4, -1.8, 1.8, 5.4, 10.0].map((x) => ({ x, zt: Z.curbN + 0.75, zv: Z.curbN + 0.22, side: 1 })),
    // the plaza, facing north (side -1)
    ...[-6.0, -3.2, 2.0].map((x) => ({ x, zt: 12.0, zv: 12.55, side: -1 })),
    // west south curb
    { x: -14.0, zt: Z.curbS - 0.75, zv: Z.curbS - 0.22, side: -1 },
  ];
  const tarpGeos = [];
  stallSpots.forEach((s, i) => {
    const { x, zt, zv, side } = s;
    const gb = new ConstructionBatch(materials);
    gb.jitter = 0.001;
    // frame and table (stay up every day)
    b.box(x - 0.8, 0.76, zt - 0.33, x + 0.8, 0.8, zt + 0.33, Finish.plain(0xbdb5a6, { var: 0.05 }));
    for (const [ox, oz] of [[-0.75, -0.28], [0.75, -0.28], [-0.75, 0.28], [0.75, 0.28]]) b.box(x + ox - 0.02, 0, zt + oz - 0.02, x + ox + 0.02, 0.76, zt + oz + 0.02, Finish.metal(0x5a5a5a), { jitter: 0 });
    for (const ox of [-1.0, 1.0]) b.cylinder([x + ox, 1.0, zt - side * 0.45], 0.025, 0.025, 2.0, Finish.metal(0x6a6a6a), { radial: 4 });
    collision.box(x - 0.8, 0.72, zt - 0.33, x + 0.8, 0.8, zt + 0.33);
    collision.box(x - 1.15, 1.9, zt - side * 0.25 - 0.85, x + 1.15, 2.0, zt - side * 0.25 + 0.85);
    // tarp: a segmented sheet whose free edge flutters
    const tg = new THREE.PlaneGeometry(2.3, 1.7, 4, 3);
    tg.rotateX(-Math.PI / 2 + side * 0.12);
    tg.translate(x, 1.98, zt - side * 0.25);
    tarpGeos.push(colorize(tg, TARPS[(i * 3 + 1) % TARPS.length], (px, py, pz) => {
      const edge = Math.abs(pz - (zt - side * 0.25)) / 0.85;
      return 0.15 + 0.5 * edge * edge + 0.2 * Math.abs(px - x) / 1.15;
    }));
    // goods (packed away on days the stall is closed)
    stallGoods(gb, i, x, 0.8, zt, side);
    const goods = gb.build('stall-goods');
    group.add(goods);
    stalls.push({ x, z: zv, face: side > 0 ? 0 : Math.PI, table: { x, z: zt }, side, goods, i });
    slots.push({ x: x - 0.55, y: 0.8, z: zt + side * 0.2, kind: 'table' }, { x: x + 0.5, y: 0.8, z: zt + side * 0.2, kind: 'table' });
  });
  sway.push(...tarpGeos);

  // ---------------------------------------------------------------- the taquero's taco stand in the plaza
  const stand = { x: -0.6, z: 12.2 };
  const sx = stand.x, sz = stand.z;
  b.box(sx - 0.9, SW, sz - 0.3, sx + 0.9, 1.05, sz + 0.3, Finish.paint(0xe8e2d0, { grime: 0.15, ground: SW }));
  b.box(sx - 0.95, 1.05, sz - 0.35, sx + 0.95, 1.1, sz + 0.35, Finish.metal(0xb9b2a2));
  // the trompo: meat on a spit, a pineapple on top; tortillas, salsas and limes beside it
  b.cylinder([sx + 0.5, 1.12, sz], 0.2, 0.2, 0.04, Finish.metal(0x8a8a8a), { radial: 12 });
  b.cylinder([sx + 0.5, 1.5, sz], 0.012, 0.012, 0.95, Finish.metal(0xb0b0b0), { radial: 5 });
  for (let k = 0; k < 8; k++) b.cylinder([sx + 0.5 + Math.sin(k * 2.1) * 0.012, 1.19 + k * 0.068, sz + Math.cos(k * 2.1) * 0.012], 0.095 + k * 0.014, 0.085 + k * 0.014, 0.066, Finish.plain([0xa8452a, 0xc0562e, 0x8e3a24][k % 3], { var: 0.1 }), { radial: 10 });
  b.cylinder([sx + 0.5, 1.8, sz], 0.085, 0.1, 0.15, Finish.plain(0xe8b83a, { var: 0.08 }), { radial: 8 });
  for (let k = 0; k < 5; k++) { const g = new THREE.ConeGeometry(0.022, 0.16, 4); g.rotateX(0.4 * Math.cos(k * 1.26)); g.rotateZ(0.4 * Math.sin(k * 1.26)); g.translate(sx + 0.5 - Math.sin(k * 1.26) * 0.03, 1.94, sz + Math.cos(k * 1.26) * 0.03); b.add(g, Finish.plain(0x4f8a3a), { jitter: 0 }); }
  for (let k = 0; k < 5; k++) b.cylinder([sx - 0.1, 1.115 + k * 0.016, sz + 0.05], 0.1, 0.1, 0.014, Finish.plain(0xecd9a8, { var: 0.06 }), { radial: 12 });
  for (const [ox, h] of [[-0.45, 0xb5281e], [-0.62, 0x4f8a3a], [-0.79, 0xe8e0c8]]) { b.cylinder([sx + ox, 1.15, sz - 0.12], 0.07, 0.055, 0.1, Finish.plain(0x3a3a3a), { radial: 10 }); b.cylinder([sx + ox, 1.2, sz - 0.12], 0.06, 0.06, 0.012, Finish.plain(h), { radial: 10 }); }
  for (let k = 0; k < 3; k++) { const px = sx - 0.75 + k * 0.28; b.cylinder([px, 1.11, sz + 0.18], 0.1, 0.07, 0.02, Finish.plain(0xe85a7a, { var: 0.02 }), { radial: 10 }); b.orientedBox([px, 1.135, sz + 0.18], [0.13, 0.035, 0.07], { y: k }, Finish.plain(0xecd9a8)); b.orientedBox([px, 1.155, sz + 0.18], [0.11, 0.025, 0.03], { y: k }, Finish.plain(0xa8452a)); }
  for (const ox of [-1.0, 1.0]) b.cylinder([sx + ox, 1.3, sz - 0.55], 0.03, 0.03, 2.4, Finish.metal(0x6a6a6a), { radial: 4 });
  { const tg = new THREE.PlaneGeometry(2.4, 1.5, 4, 3); tg.rotateX(-Math.PI / 2 + 0.15); tg.translate(sx, 2.45, sz - 0.2); sway.push(colorize(tg, 0xc23b2e, (px, py, pz) => 0.1 + 0.4 * Math.abs(pz - (sz - 0.2)) / 0.75)); }
  for (const [ox, oz] of [[-0.7, -0.7], [0.1, -0.75], [0.8, -0.68]]) {
    b.cylinder([sx + ox, 0.22, sz + oz], 0.16, 0.18, 0.44, Finish.plain(0xd23a2a), { radial: 6 });
    collision.box(sx + ox - 0.16, 0, sz + oz - 0.16, sx + ox + 0.16, 0.44, sz + oz + 0.16);
  }
  collision.box(sx - 0.95, 0, sz - 0.35, sx + 0.95, 1.1, sz + 0.35);
  // a sheltered corner behind the stand: crates and a sheet against the house front
  b.orientedBox([-2.4, 1.25, 14.3], [1.6, 0.03, 1.0], { x: -0.3 }, Finish.metal(0x8d9392), { jitter: 0 });
  collision.box(-3.2, 1.1, 13.8, -1.6, 1.4, 14.8);
  for (const [x, z] of [[-3.0, 14.4], [-1.8, 14.5]]) b.box(x - 0.25, SW, z - 0.2, x + 0.25, SW + 0.5, z + 0.2, Finish.plain(0xb98b4f), { jitter: 0.002 });
  collision.box(-3.25, 0, 14.2, -2.75, SW + 0.5, 14.6);

  // the climb: a crate on the terrace up to the ledge, and flat crates in the back courtyard
  const solid = (x0, y0, z0, x1, y1, z1, hex) => { b.box(x0, y0, z0, x1, y1, z1, Finish.plain(hex, { var: 0.08 })); collision.box(x0, y0, z0, x1, y1, z1); };
  solid(1.8, 2.92, -2.05, 2.8, 3.9, -1.15, 0x3e6fa0);
  // side by side and against the back wall, so there's no gap to get stuck in
  [[-18.0, 0.5], [-16.8, 0.9], [-15.6, 0.4], [-14.4, 1.05], [-13.2, 0.6], [-9.8, 0.8]].forEach(([x, y], i) => solid(x - 0.6, 0, -8.45, x + 0.6, y, -7.45, [0x9c7a50, 0x8a6a40, 0xb98b4f][i % 3]));

  // a cardboard box under the hero house's stair
  const card = Finish.plain(0xb08a58, { var: 0.08 });
  b.box(3.48, SW, 1.75, 3.98, SW + 0.01, 2.15, card);
  b.box(3.48, SW, 1.75, 3.49, SW + 0.34, 2.15, card);
  b.box(3.97, SW, 1.75, 3.98, SW + 0.34, 2.15, card);
  b.box(3.48, SW, 1.75, 3.98, SW + 0.34, 1.76, card);
  group.add(b.build('street-ground'));

  // signs over the three stalls that matter
  for (const [text, bg, fg, x, y, z, ry, w] of [
    ['TACOS', '#c8261c', '#fff3d0', sx, 0.62, sz - 0.315, Math.PI, 1.5], ['TACOS', '#c8261c', '#fff3d0', sx, 2.78, sz - 0.95, Math.PI, 1.9],
    ['PAN DULCE', '#d81b72', '#fff3d0', stalls[5].x, 2.32, stalls[5].table.z + 0.64, 0, 1.9], ['CELULARES', '#1b4fd8', '#ffe14d', stalls[2].x, 2.32, stalls[2].table.z + 0.64, 0, 1.9],
  ]) { const m = sign(text, bg, fg, w, 0.44); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); }

  // swaying things: one merged mesh, one material
  const swayMesh = new THREE.Mesh(mergeGeometries(sway.map((g) => (g.index ? g.toNonIndexed() : g)), false), windMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), 0.16, 'wind-std'));
  swayMesh.castShadow = true; swayMesh.receiveShadow = true;
  group.add(swayMesh);
  blockers.push(swayMesh);

  // ---------------------------------------------------------------- houses
  const rise = (HOUSE.h1 + HOUSE.slab - SW) / (HOUSE.stair.steps + 1);
  for (const h of HOUSES) {
    const zc = h.z;
    const { group: hg, colliders } = buildHouse(materials, h);
    hg.position.set(h.x, 0, zc);
    if (h.flip) hg.rotation.y = Math.PI;
    group.add(hg);
    hg.traverse((m) => { if (m.isMesh) blockers.push(m); });
    const s = h.flip ? -1 : 1;
    const W = (lx, lz) => [h.x + s * lx, zc + s * lz];
    for (const [x0, y0, z0, x1, y1, z1, extra] of colliders) {
      const [wx0, wz0] = W(x0, z0), [wx1, wz1] = W(x1, z1);
      let e = extra;
      if (extra && extra.ramp) e = { ramp: { ...extra.ramp, from: zc + s * extra.ramp.from, to: zc + s * extra.ramp.to } };
      collision.box(wx0, y0, wz0, wx1, y1, wz1, e);
    }
    const slot = (lx, y, lz, kind) => { const [x, z] = W(lx, lz); slots.push({ x, y, z, kind }); };
    slot(0.6, 0.95, 4.49, 'ledge'); slot(1.5, 0.95, 4.49, 'ledge');
    slot(-2.0, 0.14, 4.2, 'floor');
    for (const i of [2, 6, 10]) slot(3.42, SW + rise * (i + 1), HOUSE.stair.zStart - 0.28 * (i + 0.5), 'ledge');
    slot(-2.2, 2.92, 3.6, 'floor');
    if (!h.flip && Math.abs(h.x) > 1) { slot(-0.9, SW, 4.85 + zc * -0, 'floor'); slot(2.6, SW, 4.9, 'floor'); }
  }
  // extra slots in the courtyard, plaza and on the mirador
  for (const [x, z] of [[-8, -8.0], [-4.2, -6.5], [-18.6, -5.0]]) slots.push({ x, y: 0, z, kind: 'floor' });
  for (const [x, z] of [[6.6, 14.4], [-7.4, 12.6], [1.0, 14.4]]) slots.push({ x, y: SW, z, kind: 'floor' });
  slots.push({ x: 24.3, y: M.y, z: 4.6, kind: 'floor' }, { x: -26.8, y: slopeTop, z: 9.9, kind: 'floor' });

  const props = await scatterProps(materials, slots);
  group.add(props.group);
  for (const s of props.solids) collision.box(s.x - s.r, s.y0, s.z - s.r, s.x + s.r, s.top, s.z + s.r);

  // ---------------------------------------------------------------- anchors
  const F1 = HOUSE.h1 + HOUSE.slab;
  const anchors = {
    start: { x: -16.4, y: 0, z: 8.1, yaw: 1.5 },
    stand,
    beto: { x: sx - 0.1, z: sz + 0.55, face: Math.PI },
    lalo: { x: sx + 0.45, z: sz - 0.85, face: 0 },
    betoHome: { x: 17.05, z: 10.0 },
    betoRoute: [[sx - 0.1, sz + 0.55], [sx + 1.4, 10.9], [6.0, 8.2], [14.0, 8.0], [17.05, 9.4], [17.05, 10.0]],
    spots: {
      citas: { x: -8.9, z: 4.95, face: 0, pose: 'lean' },        // two women against a wall by the alley
      veinte: { x: -5.4, z: 14.3, face: Math.PI, pose: 'bench' }, // on the plaza bench
      madrugada: { x: 12.6, z: 5.6, face: 0, pose: 'curb' },     // on the curb in the narrow stretch
    },
    stalls,
    plaza: { x: 0, z: 13 },
    benches: [{ x: -5.4, z: 14.3, face: Math.PI }, { x: 23.4, z: -5.3, face: 0 }],
    alley: { x: -11.35, z: 2.0 },
  };
  return { group, blockers, lamps, anchors, knockables: props.knockables, bounds: BOUNDS };
}
