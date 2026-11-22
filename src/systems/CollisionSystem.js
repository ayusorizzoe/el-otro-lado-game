// Static collision: axis-aligned boxes and ramps (stairs). A ramp's top rises along
// its `axis` from `lo` (at the min end, or max end if `flip`) to `hi`.

export class CollisionSystem {
  constructor() {
    this.boxes = [];
  }

  box(x0, y0, z0, x1, y1, z1, extra = {}) {
    const b = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), ...extra };
    this.boxes.push(b);
    return b;
  }

  // ramp along z (or x): height goes from lo at `from` to hi at `to`
  ramp(x0, z0, x1, z1, axis, from, to, lo, hi, base = 0) {
    return this.box(x0, base, z0, x1, Math.max(lo, hi), z1, { ramp: { axis, from, to, lo, hi } });
  }

  top(b, x, z) {
    if (!b.ramp) return b.y1;
    const r = b.ramp;
    const v = r.axis === 'z' ? z : x;
    const t = Math.min(1, Math.max(0, (v - r.from) / (r.to - r.from)));
    return r.lo + (r.hi - r.lo) * t;
  }

  // highest surface at (x, z) not above yMax
  groundAt(x, z, yMax) {
    let best = 0; // the street level is always there
    for (const b of this.boxes) {
      if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
      const t = this.top(b, x, z);
      if (t <= yMax && t > best) best = t;
    }
    return best;
  }

  // push a circle at feet height y out of anything taller than a step
  resolve(x, z, r, y, step, height) {
    let blocked = false;
    for (let it = 0; it < 2; it++) {
      for (const b of this.boxes) {
        if (b.y0 >= y + height) continue;
        const cx = Math.max(b.x0, Math.min(b.x1, x)), cz = Math.max(b.z0, Math.min(b.z1, z));
        const dx = x - cx, dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r) continue;
        if (this.top(b, cx, cz) <= y + step) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2), push = r - d;
          x += (dx / d) * push; z += (dz / d) * push;
        } else {
          const l = x - b.x0, rr = b.x1 - x, f = z - b.z0, k = b.z1 - z;
          const m = Math.min(l, rr, f, k);
          if (m === l) x = b.x0 - r; else if (m === rr) x = b.x1 + r; else if (m === f) z = b.z0 - r; else z = b.z1 + r;
        }
        blocked = true;
      }
    }
    return { x, z, blocked };
  }
}

export const collision = new CollisionSystem();
