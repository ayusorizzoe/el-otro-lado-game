// Reusable construction components: walls with real openings, slabs, parapets, windows,
// doors, stairs, railings, exposed block, rebar, water tanks.
//
// Everything is accumulated into a ConstructionBatch and merged per material, so a whole
// building costs a handful of draw calls. Colours are baked per vertex (paint, raw concrete,
// grime at the base, streaks under edges) instead of using textures.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { noise3, fbm3, smoothstep, rng } from '../utils/Math.js';

const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

// ------------------------------------------------------------ finishes
// A finish describes how a surface is coloured: base colour plus weathering.
export const Finish = {
  paint: (color, o = {}) => ({ kind: 'paint', color, grime: 0.2, streak: 0.1, var: 0.025, ...o }),
  concrete: (color = 0x9c978d, o = {}) => ({ kind: 'concrete', color, grime: 0.16, streak: 0.06, var: 0.035, ...o }),
  block: (color = 0x8e8b84, o = {}) => ({ kind: 'block', color, grime: 0.15, streak: 0.05, var: 0.14, ...o }),
  metal: (color = 0x262626, o = {}) => ({ kind: 'metal', color, grime: 0.05, streak: 0, var: 0.08, mat: 'metal', ...o }),
  rust: (color = 0x6e3f2a, o = {}) => ({ kind: 'rust', color, grime: 0, streak: 0, var: 0.25, mat: 'metal', ...o }),
  plain: (color, o = {}) => ({ kind: 'plain', color, grime: 0, streak: 0, var: 0.04, ...o }),
};

function weather(f, x, y, z, nx, ny, nz, out) {
  _c.set(f.color);
  let k = 1 + f.var * (fbm3(x * 1.4, y * 1.4, z * 1.4, 2) + 0.4 * noise3(x * 9, y * 9, z * 9));
  // grime splashed up from the ground
  const base = f.ground ?? 0;
  k *= 1 - f.grime * (1 - smoothstep(0, 0.55, y - base)) * (0.6 + 0.4 * noise3(x * 4, 0, z * 4));
  // streaks below the top edge (rain running off parapets and sills)
  if (f.streak && f.top !== undefined && Math.abs(ny) < 0.5) {
    const along = Math.abs(nx) > Math.abs(nz) ? z : x;
    const s = Math.max(0, noise3(along * 7.3, 0.5, 3.1)) * smoothstep(f.top - 1.6, f.top - 0.05, y);
    k *= 1 - f.streak * s * 1.6;
  }
  // upward faces bleached by sun, undersides darker
  if (ny > 0.7) k *= 1.06;
  if (ny < -0.7) k *= 0.82;
  out.r = _c.r * k; out.g = _c.g * k; out.b = _c.b * k;
  if (f.kind === 'concrete' || f.kind === 'block') {
    // faint warm/cool mottling typical of cast concrete
    const m = noise3(x * 2.2, y * 2.2, z * 2.2) * 0.03;
    out.r += m; out.b -= m * 0.5;
  }
}

// ------------------------------------------------------------ batch
export class ConstructionBatch {
  constructor(materials) {
    this.materials = materials;
    this.groups = { construction: [], metal: [], glass: [] };
    this.jitter = 0.002;
  }

  // adds an already-positioned geometry with the given finish
  add(geo, finish, opts = {}) {
    if (geo.index) geo = geo.toNonIndexed();
    if (geo.attributes.uv) geo.deleteAttribute('uv');
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const jit = opts.jitter ?? this.jitter;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      _n.fromBufferAttribute(nor, i);
      weather(finish, _v.x, _v.y, _v.z, _n.x, _n.y, _n.z, _c);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
      if (jit > 0) {
        // same offset for coincident vertices, so faces stay closed
        pos.setXYZ(i,
          _v.x + noise3(_v.x * 3.1 + 7, _v.y * 3.1, _v.z * 3.1) * jit,
          _v.y + noise3(_v.x * 3.1, _v.y * 3.1 + 7, _v.z * 3.1) * jit * 0.5,
          _v.z + noise3(_v.x * 3.1, _v.y * 3.1, _v.z * 3.1 + 7) * jit);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = opts.mat ?? finish.mat ?? 'construction';
    this.groups[m].push(geo);
    return geo;
  }

  // axis-aligned box from min corner to max corner, subdivided for weathering detail
  box(x0, y0, z0, x1, y1, z1, finish, opts = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    if (w <= 1e-4 || h <= 1e-4 || d <= 1e-4) return null;
    const seg = opts.seg ?? 0.9;
    const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.ceil(w / seg)), Math.max(1, Math.ceil(h / seg)), Math.max(1, Math.ceil(d / seg)));
    if (opts.rotate) opts.rotate(g);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return this.add(g, finish, opts);
  }

  // box centred at c with size, rotated about its centre (yaw around y, pitch around x)
  orientedBox(c, size, rot, finish, opts = {}) {
    const g = new THREE.BoxGeometry(size[0], size[1], size[2], 1, 1, Math.max(1, Math.ceil(size[2] / 0.3)));
    if (rot.x) g.rotateX(rot.x);
    if (rot.z) g.rotateZ(rot.z);
    if (rot.y) g.rotateY(rot.y);
    g.translate(c[0], c[1], c[2]);
    return this.add(g, finish, opts);
  }

  cylinder(c, rTop, rBot, h, finish, opts = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, opts.radial ?? 10, opts.hseg ?? 1, opts.open ?? false);
    if (opts.rotX) g.rotateX(opts.rotX);
    if (opts.rotZ) g.rotateZ(opts.rotZ);
    g.translate(c[0], c[1], c[2]);
    return this.add(g, finish, { jitter: 0, ...opts });
  }

  build(name = 'construction') {
    const group = new THREE.Group();
    group.name = name;
    for (const key of Object.keys(this.groups)) {
      const list = this.groups[key];
      if (!list.length) continue;
      const geo = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, this.materials[key]);
      mesh.castShadow = key !== 'glass';
      mesh.receiveShadow = true;
      mesh.name = `${name}-${key}`;
      group.add(mesh);
    }
    this.groups = { construction: [], metal: [], glass: [] };
    return group;
  }
}

// ------------------------------------------------------------ frames along a wall
// A wall line is described in its own 2D frame: `u` runs along the wall, `w` points
// outward (away from the building). axis 'x' = wall runs along x; axis 'z' = along z.
function frame(axis, at, out) {
  // returns converters from (u, y, w) to world (x, y, z)
  if (axis === 'x') return (u, y, w) => [u, y, at + w * out];
  return (u, y, w) => [at + w * out, y, u];
}
function boxUW(b, axis, at, out, u0, u1, y0, y1, w0, w1, finish, opts) {
  const f = frame(axis, at, out);
  const p0 = f(u0, y0, w0), p1 = f(u1, y1, w1);
  return b.box(Math.min(p0[0], p1[0]), y0, Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), y1, Math.max(p0[2], p1[2]), finish, opts);
}

/**
 * Wall with real openings.
 *  axis 'x' | 'z', at: the outer face coordinate, out: +1/-1 outward direction
 *  from/to: extent along the wall, y0/y1: base/top, t: thickness (grows inward)
 *  openings: [{ a, b, y0, y1 }] in wall coordinates
 *  finish(u, y): optional function returning a finish per piece (for patches), else `finish`
 */
export function wall(b, { axis, at, out = 1, from, to, y0, y1, t = 0.16, openings = [], finish }) {
  const ops = [...openings].sort((p, q) => p.a - q.a);
  const fin = { ...finish, ground: finish.ground ?? y0, top: finish.top ?? y1 };
  let u = from;
  for (const o of ops) {
    if (o.a > u) boxUW(b, axis, at, out, u, o.a, y0, y1, -t, 0, fin);
    if (o.y0 > y0) boxUW(b, axis, at, out, o.a, o.b, y0, o.y0, -t, 0, fin);
    if (o.y1 < y1) boxUW(b, axis, at, out, o.a, o.b, o.y1, y1, -t, 0, fin);
    u = o.b;
  }
  if (u < to) boxUW(b, axis, at, out, u, to, y0, y1, -t, 0, fin);
}

/** Window set into an opening: recessed frame, panes, projecting sill, optional grille. */
export function windowUnit(b, { axis, at, out = 1, a, b: bb, y0, y1, t = 0.16, inset = 0.1, grille = true, frameColor = 0x8d8b84, grilleColor = 0x242424, seed = 1 }) {
  const fm = Finish.metal(frameColor);
  const ft = 0.045, fd = 0.05;
  const w0 = -inset - fd, w1 = -inset;
  // frame
  boxUW(b, axis, at, out, a, bb, y0, y0 + ft, w0, w1, fm);
  boxUW(b, axis, at, out, a, bb, y1 - ft, y1, w0, w1, fm);
  boxUW(b, axis, at, out, a, a + ft, y0, y1, w0, w1, fm);
  boxUW(b, axis, at, out, bb - ft, bb, y0, y1, w0, w1, fm);
  // sliding sashes: a centre mullion and slight offset of the two panes
  const mid = (a + bb) / 2;
  boxUW(b, axis, at, out, mid - ft / 2, mid + ft / 2, y0, y1, w0 - 0.015, w1, fm);
  const glass = { kind: 'plain', color: 0x2a3132, var: 0.05, grime: 0, streak: 0, mat: 'glass' };
  boxUW(b, axis, at, out, a + ft, mid, y0 + ft, y1 - ft, w0 + 0.01, w0 + 0.02, glass, { jitter: 0 });
  boxUW(b, axis, at, out, mid, bb - ft, y0 + ft, y1 - ft, w0 + 0.03, w0 + 0.04, glass, { jitter: 0 });
  // a curtain behind one pane, simple and inhabited
  const r = rng(seed);
  const curtain = Finish.plain([0xb9a58a, 0x8a6f6a, 0xc8c2b4, 0x6f7a86][Math.floor(r() * 4)], { var: 0.12 });
  boxUW(b, axis, at, out, a + ft + 0.02, a + (mid - a) * (0.5 + r() * 0.4), y0 + ft + 0.02, y1 - ft - 0.02, w0 - 0.03, w0 - 0.02, curtain, { jitter: 0 });
  // concrete sill projecting past the facade
  boxUW(b, axis, at, out, a - 0.05, bb + 0.05, y0 - 0.06, y0, -inset, 0.05, Finish.concrete(0x9f998e));
  if (grille) {
    const fg = Finish.metal(grilleColor);
    const gw0 = 0.025, gw1 = 0.04;
    const n = Math.max(2, Math.round((bb - a) / 0.17));
    for (let i = 1; i < n; i++) {
      const u = a + ((bb - a) * i) / n;
      boxUW(b, axis, at, out, u - 0.007, u + 0.007, y0, y1, gw0, gw1, fg, { jitter: 0 });
    }
    for (const yy of [y0 + 0.08, y1 - 0.08]) boxUW(b, axis, at, out, a, bb, yy - 0.012, yy + 0.012, gw0 - 0.004, gw1 + 0.004, fg, { jitter: 0 });
    // frame of the grille, anchored into the reveal
    boxUW(b, axis, at, out, a - 0.02, a, y0, y1, -0.02, gw1, fg, { jitter: 0 });
    boxUW(b, axis, at, out, bb, bb + 0.02, y0, y1, -0.02, gw1, fg, { jitter: 0 });
  }
}

/** Metal door with stamped panels, set back in its opening. */
export function doorUnit(b, { axis, at, out = 1, a, b: bb, y0, y1, inset = 0.08, color = 0x6a2f27, handleSide = 1 }) {
  const fm = Finish.metal(color, { var: 0.1 });
  const fr = Finish.metal(0x2c2c2c);
  const w0 = -inset - 0.045, w1 = -inset;
  boxUW(b, axis, at, out, a, bb, y0, y1, w0, w1, fm, { jitter: 0 });
  // frame
  boxUW(b, axis, at, out, a - 0.04, a, y0, y1 + 0.04, w0 - 0.01, w1 + 0.012, fr, { jitter: 0 });
  boxUW(b, axis, at, out, bb, bb + 0.04, y0, y1 + 0.04, w0 - 0.01, w1 + 0.012, fr, { jitter: 0 });
  boxUW(b, axis, at, out, a, bb, y1, y1 + 0.04, w0 - 0.01, w1 + 0.012, fr, { jitter: 0 });
  // raised panels
  const pw = (bb - a - 0.24) / 2;
  const rows = [[y0 + 0.15, y0 + 0.9], [y0 + 1.05, y1 - 0.15]];
  for (const [p0, p1] of rows) for (let i = 0; i < 2; i++) {
    const u0 = a + 0.08 + i * (pw + 0.08);
    boxUW(b, axis, at, out, u0, u0 + pw, p0, p1, w1, w1 + 0.012, fm, { jitter: 0 });
  }
  // handle and lock
  const hu = handleSide > 0 ? bb - 0.09 : a + 0.09;
  boxUW(b, axis, at, out, hu - 0.01, hu + 0.01, y0 + 0.98, y0 + 1.1, w1, w1 + 0.05, Finish.metal(0x9a9890), { jitter: 0 });
}

/** Parapet run with a slightly uneven top, built in short sections like real hand-laid work. */
export function parapet(b, { axis, at, out = 1, from, to, y0, h, t = 0.14, finish, seed = 1, cap = true }) {
  const r = rng(seed);
  let u = from;
  while (u < to - 1e-3) {
    const len = Math.min(to - u, 0.9 + r() * 0.9);
    const hh = h + (r() - 0.5) * 0.035;
    const fin = { ...finish, ground: y0 - 3, top: y0 + hh };
    boxUW(b, axis, at, out, u, u + len, y0, y0 + hh, -t, 0, fin);
    if (cap) boxUW(b, axis, at, out, u - 0.005, u + len + 0.005, y0 + hh, y0 + hh + 0.025, -t - 0.012, 0.012, Finish.concrete(0xa49e93, { grime: 0 }), { jitter: 0.002 });
    u += len;
  }
}

/** Exposed concrete blocks laid in running bond, protruding slightly from a mortar backing. */
export function blockPatch(b, { axis, at, out = 1, from, to, y0, y1, seed = 1 }) {
  const r = rng(seed);
  const bw = 0.4, bh = 0.2, gap = 0.012;
  let row = 0;
  for (let y = y0; y < y1 - 1e-3; y += bh, row++) {
    const yTop = Math.min(y1, y + bh);
    let u = from - (row % 2 ? bw / 2 : 0);
    while (u < to - 1e-3) {
      const a = Math.max(from, u + gap / 2), c = Math.min(to, u + bw - gap / 2);
      if (c - a > 0.02) {
        const shade = 0x8a8780 + 0;
        const tone = 0.9 + r() * 0.18;
        _c.set(shade).multiplyScalar(tone);
        boxUW(b, axis, at, out, a, c, y + gap / 2, yTop - gap / 2, -0.01, 0.006 + r() * 0.004, Finish.block(_c.getHex()), { jitter: 0.0015 });
      }
      u += bw;
    }
  }
}

/** Straight concrete stair: individual steps resting on an inclined slab. */
export function stair(b, { x0, x1, zStart, zEnd, y0, y1, steps, finish }) {
  const dir = Math.sign(zEnd - zStart);
  const run = Math.abs(zEnd - zStart) / steps;
  const rise = (y1 - y0) / (steps + 1); // last riser lands on the landing
  const slabT = 0.13;
  // underside line: from the foot of the stair to below the top step
  const zTopStep = zStart + dir * run * steps;
  const lineY = (z) => y0 + ((z - zStart) / (zTopStep - zStart)) * (y0 + rise * steps - y0) - 0.02;
  for (let i = 0; i < steps; i++) {
    const za = zStart + dir * run * i, zb = zStart + dir * run * (i + 1);
    const top = y0 + rise * (i + 1);
    const bottom = Math.min(lineY(za), lineY(zb)) - slabT * 0.3;
    b.box(x0, Math.max(y0, bottom), Math.min(za, zb) - (dir < 0 ? 0 : 0), x1, top, Math.max(za, zb) + 0.02, { ...finish, ground: y0 - 0.5, top }, { seg: 0.5 });
    // nosing: a thin lip that catches light
    const zn = dir < 0 ? Math.max(za, zb) : Math.min(za, zb);
    b.box(x0, top - 0.03, zn - 0.015, x1, top, zn + 0.015, Finish.concrete(0xaaa59a, { grime: 0 }), { jitter: 0.002 });
  }
  // inclined slab
  const L = Math.hypot(zTopStep - zStart, rise * steps);
  const ang = Math.atan2(rise * steps, Math.abs(zTopStep - zStart));
  const cz = (zStart + zTopStep) / 2;
  const cy = y0 + (rise * steps) / 2 - slabT * 0.9;
  b.orientedBox([(x0 + x1) / 2, cy, cz], [x1 - x0, slabT, L], { x: dir < 0 ? ang : -ang }, { ...finish, ground: y0 - 1 });
  return { rise, run };
}

/** Simple welded railing between points on a (possibly sloped) line. */
export function railing(b, { points, h = 0.95, color = 0x2a2a2a, spacing = 1.1, bars = 0 }) {
  const fm = Finish.metal(color);
  for (let s = 0; s < points.length - 1; s++) {
    const p = points[s], q = points[s + 1];
    const len = Math.hypot(q[0] - p[0], q[2] - p[2]);
    const n = Math.max(1, Math.round(len / spacing));
    for (let i = 0; i <= n; i++) {
      if (s > 0 && i === 0) continue;
      const t = i / n;
      const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + (q[2] - p[2]) * t;
      b.box(x - 0.018, y, z - 0.018, x + 0.018, y + h, z + 0.018, fm, { jitter: 0 });
    }
    // top rail and mid rail follow the slope
    for (const hh of [h, h * 0.5]) {
      const c = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + hh, (p[2] + q[2]) / 2];
      const L3 = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      const yaw = Math.atan2(q[0] - p[0], q[2] - p[2]);
      const pitch = -Math.atan2(q[1] - p[1], len);
      const g = new THREE.BoxGeometry(hh === h ? 0.04 : 0.022, hh === h ? 0.04 : 0.022, L3);
      g.rotateX(pitch); g.rotateY(yaw); g.translate(...c);
      b.add(g, fm, { jitter: 0 });
    }
    for (let i = 1; i < bars; i++) {
      const t = i / bars;
      const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + (q[2] - p[2]) * t;
      b.box(x - 0.008, y + 0.05, z - 0.008, x + 0.008, y + h, z + 0.008, fm, { jitter: 0 });
    }
  }
}

/** A few rebar rods left sticking out of a column top, slightly bent. */
export function rebar(b, { x, y, z, h = 0.7, seed = 1 }) {
  const r = rng(seed);
  const fin = Finish.rust();
  for (const [ox, oz] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) {
    const hh = h * (0.75 + r() * 0.4);
    const g = new THREE.CylinderGeometry(0.0055, 0.0055, hh, 5, 3);
    const p = g.attributes.position;
    const bend = (r() - 0.5) * 0.12, dir = r() * Math.PI * 2;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + hh / 2) / hh;
      p.setX(i, p.getX(i) + Math.cos(dir) * bend * t * t);
      p.setZ(i, p.getZ(i) + Math.sin(dir) * bend * t * t);
    }
    g.translate(x + ox, y + hh / 2, z + oz);
    b.add(g, fin, { jitter: 0 });
  }
  // tie wire band
  b.cylinder([x, y + 0.08, z], 0.075, 0.075, 0.01, Finish.rust(0x4a3a30), { radial: 4, open: true });
}

/** Ribbed polyethylene rooftop water tank on a small stand. */
export function waterTank(b, { x, y, z, r = 0.55, h = 1.15, color = 0x1d1f20 }) {
  // stand: two concrete block rows
  b.box(x - r * 0.9, y, z - r * 0.9, x + r * 0.9, y + 0.2, z + r * 0.9, Finish.block(0x8f8b83), { seg: 0.2 });
  const pts = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rib = (i % 3 === 1) ? 0.012 : 0;
    pts.push(new THREE.Vector2(r * (0.94 + 0.06 * Math.sin(t * Math.PI)) + rib, h * t));
  }
  pts.push(new THREE.Vector2(r * 0.85, h + 0.06));
  pts.push(new THREE.Vector2(r * 0.42, h + 0.12));
  pts.push(new THREE.Vector2(0.001, h + 0.13));
  const g = new THREE.LatheGeometry(pts, 20);
  g.translate(x, y + 0.2, z);
  b.add(g, { kind: 'plain', color, var: 0.08, grime: 0.0, streak: 0 }, { jitter: 0 });
  // lid
  b.cylinder([x, y + 0.2 + h + 0.15, z], 0.17, 0.18, 0.05, Finish.plain(0x1a1b1c));
  // outlet pipe
  b.cylinder([x + r * 0.7, y + 0.28, z], 0.025, 0.025, 0.3, Finish.plain(0xb8b4aa), { rotZ: Math.PI / 2 });
}

/** LP gas cylinder (common on Mexican rooftops). */
export function gasCylinder(b, { x, y, z }) {
  const fin = Finish.plain(0xb5b2a9, { var: 0.08 });
  b.cylinder([x, y + 0.03, z], 0.17, 0.17, 0.06, Finish.plain(0x6a6a66));
  b.cylinder([x, y + 0.55, z], 0.18, 0.18, 0.98, fin, { radial: 14 });
  const dome = new THREE.SphereGeometry(0.18, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.translate(x, y + 1.04, z);
  b.add(dome, fin, { jitter: 0 });
  b.cylinder([x, y + 1.19, z], 0.09, 0.1, 0.1, Finish.plain(0x8a8a84), { open: true, radial: 10 });
  b.cylinder([x, y + 1.24, z], 0.025, 0.025, 0.06, Finish.metal(0x9a8a50));
}

/** Corrugated sheet (lámina) between two heights, sloping along z. */
export function corrugatedSheet(b, { x0, x1, z0, z1, yHigh, yLow, color = 0x8f9493 }) {
  const w = x1 - x0, len = Math.hypot(z1 - z0, yHigh - yLow);
  const g = new THREE.BoxGeometry(w, 0.008, len, Math.round(w / 0.038), 1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.sin((p.getX(i) / 0.076) * Math.PI * 2) * 0.012);
  g.rotateX(Math.atan2(yHigh - yLow, Math.abs(z1 - z0)) * (z1 > z0 ? 1 : -1));
  g.translate((x0 + x1) / 2, (yHigh + yLow) / 2, (z0 + z1) / 2);
  b.add(g, { kind: 'plain', color, var: 0.12, grime: 0, streak: 0, mat: 'metal' }, { jitter: 0 });
}
