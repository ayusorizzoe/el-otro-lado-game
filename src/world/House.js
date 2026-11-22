// An ordinary two-storey house of the kind built incrementally in Tijuana:
// a full ground floor, an upper floor added later over part of the roof, a separate
// exterior stair to the upper unit, a roof terrace with a washbasin and gas cylinder.
// Above head height it stays deliberately plain; the life of the place is at cat height
// (see Props.js).
//
// House-local coordinates: front facade faces +z, x across the lot, origin at the
// centre of the footprint at street-side ground level.

import * as THREE from 'three';
import { ConstructionBatch, Finish, wall, windowUnit, doorUnit, parapet, stair, railing, waterTank, gasCylinder, corrugatedSheet } from './Architecture.js';

// dimensions (m)
export const HOUSE = {
  W: 6.5, D: 9.0,            // footprint
  wallT: 0.16,
  h1: 2.75, slab: 0.15,      // ground floor wall height, slab thickness
  h2: 2.55,                  // upper floor wall height
  upper: { x0: -3.25, x1: 1.65, z0: -4.5, z1: 1.8 },
  sidewalk: 0.12,
  stair: { x0: 3.25, x1: 4.15, zStart: 4.3, steps: 14 },
};

const PAINT_LOW_DEFAULT = 0xc28b70;     // faded salmon
const ZOCLO_DEFAULT = 0x7b4b3e;         // painted base band
const PAINT_UP_DEFAULT = 0xb7bda6;      // later, paler paint on the upper unit
const RAW = 0xa29c91;           // unpainted plaster (party walls)
const CONCRETE = 0x9b958b;

// opts: { low, up, zoclo: paint colours, upper: bool, seed }
// Returns { group, colliders } with colliders in house-local coordinates.
export function buildHouse(materials, opts = {}) {
  const H = HOUSE;
  const PAINT_LOW = opts.low ?? PAINT_LOW_DEFAULT, PAINT_UP = opts.up ?? PAINT_UP_DEFAULT, ZOCLO = opts.zoclo ?? ZOCLO_DEFAULT;
  const hasUpper = opts.upper !== false;
  const cols = [];
  const col = (x0, y0, z0, x1, y1, z1, extra) => cols.push([x0, y0, z0, x1, y1, z1, extra]);
  const b = new ConstructionBatch(materials);
  const x0 = -H.W / 2, x1 = H.W / 2, z0 = -H.D / 2, z1 = H.D / 2;
  const t = H.wallT;
  const F1 = H.h1 + H.slab;                 // upper floor level (2.9)
  const R2 = F1 + H.h2;                     // upper wall top
  const ROOF = R2 + H.slab;                 // upper roof surface (5.6)
  const U = H.upper;

  const low = Finish.paint(PAINT_LOW);
  const up = Finish.paint(PAINT_UP);
  const raw = Finish.concrete(RAW, { var: 0.11 });

  // ---------------------------------------------------------------- ground floor
  // front: recessed entrance (left) and a wide barred window (right)
  const entry = { a: -2.65, b: -1.35 };
  const alcoveDepth = 0.62;
  wall(b, { axis: 'x', at: z1, out: 1, from: x0, to: x1, y0: 0, y1: H.h1, t, finish: low,
    openings: [{ a: entry.a, b: entry.b, y0: 0, y1: 2.36 }, { a: 0.15, b: 1.95, y0: 0.95, y1: 2.12 }] });
  windowUnit(b, { axis: 'x', at: z1, out: 1, a: 0.15, b: 1.95, y0: 0.95, y1: 2.12, t, seed: 3 });
  // painted base band (zócalo), interrupted at the entrance
  for (const [a, c] of [[x0, entry.a], [entry.b, x1]]) {
    b.box(a, 0, z1, c, 0.62, z1 + 0.012, Finish.paint(ZOCLO, { grime: 0.3, ground: 0 }), { seg: 0.25 });
  }
  // the alcove: two short side walls, back wall with the door, soffit, raised floor
  const zIn = z1 - alcoveDepth;
  b.box(entry.a - t, 0, zIn, entry.a, H.h1, z1 - t, low);
  b.box(entry.b, 0, zIn, entry.b + t, H.h1, z1 - t, low);
  wall(b, { axis: 'x', at: zIn, out: 1, from: entry.a, to: entry.b, y0: 0, y1: H.h1, t, finish: low,
    openings: [{ a: -2.45, b: -1.55, y0: 0.14, y1: 2.24 }] });
  doorUnit(b, { axis: 'x', at: zIn, out: 1, a: -2.45, b: -1.55, y0: 0.14, y1: 2.24, handleSide: 1 });
  b.box(entry.a, 2.36, zIn, entry.b, H.h1, z1, low);
  b.box(entry.a, 0, zIn, entry.b, 0.14, z1, Finish.concrete(CONCRETE, { grime: 0.1 }));
  b.box(entry.a - 0.05, 0, z1, entry.b + 0.05, 0.07, z1 + 0.22, Finish.concrete(0xa19b90));   // doorstep

  // right side: plain wall along the stair
  wall(b, { axis: 'z', at: x1, out: 1, from: z0, to: z1, y0: 0, y1: H.h1, t, finish: low });
  b.box(x1, 0, z0, x1 + 0.012, 0.62, z1, Finish.paint(ZOCLO, { grime: 0.3, ground: 0 }), { seg: 0.25 });
  // left side: party wall, left in raw plaster
  wall(b, { axis: 'z', at: x0, out: -1, from: z0, to: z1, y0: 0, y1: H.h1, t, finish: raw });
  // back
  wall(b, { axis: 'x', at: z0, out: -1, from: x0, to: x1, y0: 0, y1: H.h1, t, finish: low });

  // first slab, with the small cantilevered edge (volado) at front and right
  b.box(x0, H.h1, z0, x1 + 0.1, F1, z1 + 0.12, Finish.concrete(CONCRETE, { top: F1 }));
  // roof terrace surface: a thin screed with a slightly different tone
  b.box(U.x1, F1, z0 + t, x1 - 0.14, F1 + 0.02, z1 - 0.14, Finish.concrete(0x9a9184, { grime: 0, var: 0.12 }), { jitter: 0.001 });
  b.box(x0 + 0.14, F1, U.z1, U.x1, F1 + 0.02, z1 - 0.14, Finish.concrete(0x9a9184, { grime: 0, var: 0.12 }), { jitter: 0.001 });

  // ---------------------------------------------------------------- upper floor
  if (hasUpper) {
  // front of the upper unit faces the terrace
  wall(b, { axis: 'x', at: U.z1, out: 1, from: U.x0, to: U.x1, y0: F1, y1: R2, t, finish: up,
    openings: [{ a: -2.6, b: -1.3, y0: F1 + 0.95, y1: F1 + 2.05 }] });
  windowUnit(b, { axis: 'x', at: U.z1, out: 1, a: -2.6, b: -1.3, y0: F1 + 0.95, y1: F1 + 2.05, t, seed: 9 });
  // right side of the upper unit: its own door off the stair landing
  wall(b, { axis: 'z', at: U.x1, out: 1, from: U.z0, to: U.z1, y0: F1, y1: R2, t, finish: up,
    openings: [{ a: -0.95, b: -0.05, y0: F1 + 0.02, y1: F1 + 2.12 }] });
  doorUnit(b, { axis: 'z', at: U.x1, out: 1, a: -0.95, b: -0.05, y0: F1 + 0.02, y1: F1 + 2.12, color: 0x3f4a4f, handleSide: -1 });
  // left and back
  wall(b, { axis: 'z', at: U.x0, out: -1, from: U.z0, to: U.z1, y0: F1, y1: R2, t, finish: raw });
  wall(b, { axis: 'x', at: U.z0, out: -1, from: U.x0, to: U.x1, y0: F1, y1: R2, t, finish: up });
  // upper roof slab, walkable
  b.box(U.x0, R2, U.z0, U.x1 + 0.08, ROOF, U.z1 + 0.1, Finish.concrete(CONCRETE, { top: ROOF }));
  }

  // ---------------------------------------------------------------- parapets
  const parFin = (base) => ({ ...base });
  // terrace: front and left solid, right side low wall with railing (added later), back solid
  parapet(b, { axis: 'x', at: z1 + 0.12, out: 1, from: x0, to: x1 + 0.1, y0: F1, h: 0.95, finish: parFin(low), seed: 21 });
  parapet(b, { axis: 'z', at: x0, out: -1, from: hasUpper ? U.z1 : z0, to: z1 + 0.12 - 0.14, y0: F1, h: 0.95, finish: parFin(raw), seed: 22 });
  const gap = { a: -0.88, b: 0.32 };       // opening to the stair landing
  parapet(b, { axis: 'z', at: x1 + 0.1, out: 1, from: z0, to: gap.a, y0: F1, h: 0.45, finish: parFin(low), seed: 23 });
  parapet(b, { axis: 'z', at: x1 + 0.1, out: 1, from: gap.b, to: z1 + 0.12 - 0.14, y0: F1, h: 0.45, finish: parFin(low), seed: 24 });
  railing(b, { points: [[x1 + 0.03, F1 + 0.47, z0 + 0.1], [x1 + 0.03, F1 + 0.47, gap.a]], h: 0.5, spacing: 0.9, bars: 12 });
  railing(b, { points: [[x1 + 0.03, F1 + 0.47, gap.b], [x1 + 0.03, F1 + 0.47, z1 - 0.05]], h: 0.5, spacing: 0.9, bars: 14 });
  parapet(b, { axis: 'x', at: z0, out: -1, from: hasUpper ? U.x1 : x0, to: x1 + 0.1, y0: F1, h: 0.95, finish: parFin(low), seed: 25 });
  // upper roof: low parapet all round
  if (hasUpper) {
  parapet(b, { axis: 'x', at: U.z1 + 0.1, out: 1, from: U.x0, to: U.x1 + 0.08, y0: ROOF, h: 0.36, t: 0.12, finish: parFin(up), seed: 31 });
  parapet(b, { axis: 'x', at: U.z0, out: -1, from: U.x0, to: U.x1 + 0.08, y0: ROOF, h: 0.36, t: 0.12, finish: parFin(up), seed: 32 });
  parapet(b, { axis: 'z', at: U.x0, out: -1, from: U.z0 + 0.12, to: U.z1 + 0.1 - 0.12, y0: ROOF, h: 0.36, t: 0.12, finish: parFin(raw), seed: 33 });
  parapet(b, { axis: 'z', at: U.x1 + 0.08, out: 1, from: U.z0 + 0.12, to: U.z1 + 0.1 - 0.12, y0: ROOF, h: 0.36, t: 0.12, finish: parFin(up), seed: 34 });
  }


  // ---------------------------------------------------------------- exterior stair
  const S = H.stair;
  const st = stair(b, { x0: S.x0, x1: S.x1, zStart: S.zStart, zEnd: S.zStart - 0.28 * S.steps, y0: H.sidewalk, y1: F1, steps: S.steps, finish: Finish.concrete(0xa09a8f) });
  const zTop = S.zStart - 0.28 * S.steps;          // 0.38
  // landing slab and its column
  b.box(S.x0, F1 - 0.14, -0.9, S.x1, F1, zTop, Finish.concrete(CONCRETE, { top: F1 }));
  b.box(S.x1 - 0.2, H.sidewalk, -0.88, S.x1, F1 - 0.14, -0.68, Finish.concrete(0x9a948a));
  // handrail along the outer edge, then around the landing
  railing(b, { points: [[S.x1 - 0.03, H.sidewalk + st.rise, S.zStart - 0.14], [S.x1 - 0.03, F1, zTop]], h: 0.9, spacing: 1.3 });
  railing(b, { points: [[S.x1 - 0.03, F1, zTop], [S.x1 - 0.03, F1, -0.87], [x1 + 0.12, F1, -0.87]], h: 0.95, spacing: 0.9, bars: 5 });

  // ---------------------------------------------------------------- roof terrace life (restrained)
  // concrete washbasin (lavadero) against the upper unit's side wall, under a corrugated sheet
  if (hasUpper) {
  const lx0 = U.x1 + 0.02, lx1 = U.x1 + 0.72, lz0 = -3.9, lz1 = -2.9;
  b.box(lx0, F1, lz0, lx1, F1 + 0.78, lz1, Finish.block(0x8c8981), { seg: 0.2 });
  b.box(lx0 - 0.02, F1 + 0.78, lz0 - 0.04, lx1 + 0.04, F1 + 0.9, lz1 + 0.04, Finish.concrete(0xa7a197, { grime: 0 }));
  corrugatedSheet(b, { x0: U.x1 - 0.05, x1: U.x1 + 1.25, z0: -4.4, z1: -2.3, yHigh: F1 + 2.0, yLow: F1 + 1.9, color: 0x8d9392 });
  // sheet supported by two thin poles
  for (const z of [-4.3, -2.4]) b.box(U.x1 + 1.15, F1, z - 0.02, U.x1 + 1.19, F1 + 1.92, z + 0.02, Finish.metal(0x4a4a48), { jitter: 0 });
  gasCylinder(b, { x: x1 - 0.42, y: F1, z: z0 + 0.45 });
  waterTank(b, { x: U.x0 + 0.95, y: ROOF, z: U.z0 + 1.0 });
  } else {
    gasCylinder(b, { x: x1 - 0.42, y: F1, z: z0 + 0.45 });
    waterTank(b, { x: x0 + 1.0, y: F1, z: z0 + 1.0 });
  }

  // ---------------------------------------------------------------- collision volumes
  // the cat's route up: stair → landing → terrace → washbasin → sheet → roof parapet → roof
  col(x0, 0, z0, x1 + 0.1, F1 + 0.02, z1 + 0.12);                                   // ground floor (terrace on top)
  col(x0, F1, z1 + 0.12 - 0.14, x1 + 0.1, F1 + 0.95, z1 + 0.12);                    // terrace parapets
  col(x0, F1, hasUpper ? U.z1 : z0, x0 + 0.14, F1 + 0.95, z1 + 0.12);
  col(hasUpper ? U.x1 : x0, F1, z0, x1 + 0.1, F1 + 0.95, z0 + 0.14);
  col(x1 + 0.1 - 0.14, F1, z0, x1 + 0.1, F1 + 0.97, gap.a);
  col(x1 + 0.1 - 0.14, F1, gap.b, x1 + 0.1, F1 + 0.97, z1 + 0.12);
  if (hasUpper) {
    col(U.x0, F1, U.z0, U.x1 + 0.08, ROOF, U.z1 + 0.1);                               // upper unit (roof on top)
    col(U.x0, ROOF, U.z1 + 0.1 - 0.12, U.x1 + 0.08, ROOF + 0.36, U.z1 + 0.1);
    col(U.x0, ROOF, U.z0, U.x1 + 0.08, ROOF + 0.36, U.z0 + 0.12);
    col(U.x0, ROOF, U.z0, U.x0 + 0.12, ROOF + 0.36, U.z1 + 0.1);
    col(U.x1 + 0.08 - 0.12, ROOF, U.z0, U.x1 + 0.08, ROOF + 0.36, U.z1 + 0.1);
    col(U.x1 + 0.02, F1, -3.94, U.x1 + 0.76, F1 + 0.9, -2.86);                         // washbasin
    col(U.x1 - 0.05, F1 + 1.88, -4.4, U.x1 + 1.25, F1 + 1.98, -2.3);                   // corrugated sheet
    col(U.x0 + 0.4, ROOF, U.z0 + 0.45, U.x0 + 1.5, ROOF + 1.5, U.z0 + 1.55);           // water tank
  }
  col(x1 - 0.62, F1, z0 + 0.25, x1 - 0.22, F1 + 1.3, z0 + 0.65);                      // gas cylinder
  // the stair as stepped ramp pieces, leaving the space underneath open
  const pieces = 5;
  for (let i = 0; i < pieces; i++) {
    const za = S.zStart - (S.zStart - zTop) * (i / pieces), zb = S.zStart - (S.zStart - zTop) * ((i + 1) / pieces);
    const ya = H.sidewalk + (F1 - H.sidewalk) * (i / pieces), yb = H.sidewalk + (F1 - H.sidewalk) * ((i + 1) / pieces);
    col(S.x0, Math.max(0, ya - 0.35), zb, S.x1, yb, za, { ramp: { axis: 'z', from: za, to: zb, lo: ya, hi: yb } });
  }
  col(S.x0, F1 - 0.14, -0.9, S.x1, F1, zTop);                                          // landing
  col(S.x1 - 0.2, 0, -0.88, S.x1, F1 - 0.14, -0.68);                                   // its column

  const group = b.build('house');
  group.userData.levels = { F1, R2, ROOF };
  return { group, colliders: cols };
}
