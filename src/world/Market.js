// The people of the street. Vendors work their stalls (prepare, rearrange, lean, turn to
// customers). Shoppers have destinations: they browse stalls, stop in
// doorways to check their phones, sit on the curb or a bench, meet someone and chat, look at
// the sea from the viewpoint. They notice the cat now and then, and step aside if it runs
// between their feet. Simple state machines over a small waypoint graph.

import { Human } from '../entities/Human.js';
import { collision } from '../systems/CollisionSystem.js';

const SKINS = [0xa47452, 0x8f6448, 0xb07c58, 0x9a6a48, 0xc08a64, 0x86593e];
// the crowd wears quiet colours, so the three people who matter stand out
const TOPS = [0x7d7168, 0x66707c, 0xa39c90, 0x6f7a6c, 0x84645a, 0x45454c, 0x9a8a6c, 0x6c6474, 0xb0aca2, 0x5c6c74];
const BOTTOMS = [0x2a2e38, 0x3a4a5a, 0x4a3e34, 0x5a5550, 0x2a2a2a, 0x3f4c63];
const HAIR = [0x1e1814, 0x2a2018, 0x3a2a20, 0x8a8478];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const look = () => ({ skin: pick(SKINS), top: pick(TOPS), bottom: pick(BOTTOMS), hair: pick(HAIR), female: Math.random() < 0.5, old: Math.random() < 0.15, child: Math.random() < 0.08, cap: Math.random() < 0.15 ? pick([0x3a4250, 0x5a4a44, 0x8a8a84]) : undefined, shortSleeve: Math.random() < 0.4 });

export const BARKS = [
  '¡Pásele, pásele!', '¡Qué le damos, güera!', 'A veinte el kilo.', '¡Llévelo, llévelo!', 'Aguacate pa\'hoy, pa\'mañana.',
  'Tres por cincuenta.', '¿Qué va a llevar, joven?', 'Pruébele sin compromiso.', 'Ya mero recojo, aprovéchele.',
];
const RECOGNIZE = ['¿Otra vez tú, michi?', 'Ahí está el negrito.', 'Ya llegó mi cliente.', 'Hoy no hay nada, ¿eh?'];

// waypoints (x, z) and links: the street spine, the plaza, the alley and courtyard, the slope
const N = {
  w2: [-25.8, 7.8], w1: [-21.5, 7.8], s0: [-18.5, 7.95], s1: [-12.6, 7.95], s2: [-8, 7.95], s3: [-4, 7.95], s4: [0, 7.95], s5: [4, 7.95], s6: [8, 7.95], s7: [12.5, 7.95], s8: [17.5, 7.95],
  p1: [-4.6, 13.0], p2: [1.6, 13.4], p3: [6.0, 12.3],
};
const LINKS = [['w2', 'w1'], ['w1', 's0'], ['s0', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 's4'], ['s4', 's5'], ['s5', 's6'], ['s6', 's7'], ['s7', 's8'],
  ['s3', 'p1'], ['s4', 'p2'], ['s5', 'p3'], ['p1', 'p2'], ['p2', 'p3']];
const ADJ = {};
for (const [a, b] of LINKS) { (ADJ[a] = ADJ[a] || []).push(b); (ADJ[b] = ADJ[b] || []).push(a); }
const nearestNode = (x, z) => Object.keys(N).reduce((best, k) => (Math.hypot(N[k][0] - x, N[k][1] - z) < Math.hypot(N[best][0] - x, N[best][1] - z) ? k : best), 's4');
function route(from, to) {
  const prev = { [from]: null }, q = [from];
  while (q.length) { const c = q.shift(); if (c === to) break; for (const n of ADJ[c] || []) if (!(n in prev)) { prev[n] = c; q.push(n); } }
  const path = [];
  for (let c = to; c; c = prev[c]) path.unshift(N[c]);
  return path;
}

export class Market {
  constructor(scene, materials, anchors) {
    this.anchors = anchors;
    this.stalls = anchors.stalls;
    this.day = 1;
    this.vendors = this.stalls.filter((st) => !st.person).map((st) => {
      const h = new Human(materials, { ...look(), apron: Math.random() < 0.6 ? pick([0xa8a08c, 0x78828c, 0x94807a]) : undefined, child: false });
      scene.add(h.object3d);
      return { h, st, x: st.x + (Math.random() - 0.5) * 0.5, z: st.z, act: 'work', actT: Math.random() * 6, bark: null, barkT: 0, next: 2 + Math.random() * 10, customer: 0 };
    });
    this.walkers = [];
    for (let i = 0; i < 18; i++) {
      const h = new Human(materials, look());
      scene.add(h.object3d);
      const n = pick(Object.keys(N).filter((k) => k[0] === 's'));
      this.walkers.push({
        h, night: i < 5, x: N[n][0] + (Math.random() - 0.5), z: N[n][1] + (Math.random() - 0.5), node: n, path: [], act: null, actT: Math.random() * 4,
        speed: 0.75 + Math.random() * 0.6, from: 7 + Math.random() * 3, to: 15 + Math.random() * 6, yaw: 0, look: 0, lookT: 0, side: 0, partner: null,
      });
    }
  }

  // changes across the three days: stalls rearranged, some closed, fewer people
  setDay(day) {
    this.day = day;
    const closed = day === 2 ? [3] : day === 3 ? [1, 4, 6, 9] : [];
    for (const v of this.vendors) {
      v.st.closed = closed.includes(v.st.i);
      v.st.goods.visible = !v.st.closed;
      if (day === 2 && v.st.i === 7) v.st.goods.position.x = 0.35;       // a stall laid out differently
    }
    this.walkers.forEach((w) => { w.off = false; });
  }

  vendorsOn(hour) { return hour >= 8 && hour < 17; }

  nearestVendor(p, reach) {
    let best = null, bd = reach;
    for (const v of this.vendors) {
      if (!v.h.object3d.visible) continue;
      const q = v.h.object3d.position, d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd && Math.abs(p.y - q.y) < 0.8) { bd = d; best = v; }
    }
    return best;
  }

  // is someone minding a stall right here? (passers-by don't count as protection)
  anyoneNear(p, reach) {
    return this.vendors.some(({ h: { object3d: o } }) => o.visible && Math.abs(o.position.y - p.y) < 1 && Math.hypot(o.position.x - p.x, o.position.z - p.z) < reach);
  }

  // standing in the camera's face, or between it and the cat
  blocks({ cam, cat }, o) {
    if (cam.y > o.y + 3.2) return false;
    const dx = cat.x - cam.x, dz = cat.z - cam.z, t = Math.max(0, Math.min(0.88, ((o.x - cam.x) * dx + (o.z - cam.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(o.x - cam.x - dx * t, o.z - cam.z - dz * t) < (t < 0.2 ? 1.5 : 0.6);
  }

  // choose what a shopper does next
  plan(w) {
    const r = Math.random();
    const open = this.stalls.filter((s) => !s.closed);
    let target, act, face;
    if (r < 0.42 && open.length) {
      const s = pick(open);
      target = [s.table.x + (Math.random() - 0.5) * 0.8, s.table.z + s.side * 0.85]; act = 'browse'; face = s.side > 0 ? Math.PI : 0;
      if (!s.person) s.customerT = 6;
    } else if (r < 0.55) { const x = -16 + Math.random() * 30; target = [x, 5.05]; act = 'phone'; face = Math.PI; }
    else if (r < 0.65) { const x = -17 + Math.random() * 26; target = [x, 5.6]; act = 'curb'; face = 0; }
    else if (r < 0.75) { const b = pick(this.anchors.benches.slice(0, 1)); target = [b.x + (Math.random() < 0.5 ? -0.55 : 0.55), b.z]; act = 'sit'; face = b.face; }
    else if (r < 0.82) { target = [-26.6, 7.2 + Math.random() * 1.2]; act = 'view'; face = -Math.PI / 2; }
    else {
      // meet someone and chat
      const other = this.walkers.find((o) => o !== w && o.h.object3d.visible && !o.partner && o.act !== 'chat');
      const n = pick(['s2', 's4', 's6', 'p2', 's1']);
      target = [N[n][0] + 0.4, N[n][1]]; act = 'chat'; face = -Math.PI / 2;
      if (other) { other.partner = w; w.partner = other; other.path = route(nearestNode(other.x, other.z), n).concat([[N[n][0] - 0.4, N[n][1]]]); other.goal = { act: 'chat', face: Math.PI / 2 }; other.act = null; }
    }
    const path = route(nearestNode(w.x, w.z), nearestNode(target[0], target[1]));
    w.path = path.concat([target]);
    w.goal = { act, face };
    w.act = null;
  }

  // quiet: someone is being overheard or a challenge is on, so nobody shouts over it
  // view: { cam, clear: {x, z, r} | null } — passers-by keep out of the camera's face and
  // out of the space a challenge needs
  update(dt, hour, cat, catSpeed, quiet = false, view = null) {
    const bubbles = [];
    const on = this.vendorsOn(hour);
    for (const v of this.vendors) {
      const o = v.h.object3d;
      o.visible = on && !v.st.closed;
      if (!o.visible) continue;
      const d = Math.hypot(cat.x - v.x, cat.z - v.z);
      // activity cycle; slower in the afternoon, sometimes sitting
      v.actT -= dt;
      if (v.actT <= 0) { const r = Math.random(); v.act = r < 0.55 ? 'work' : r < 0.85 ? 'lean' : 'work'; v.actT = 5 + Math.random() * 10; }
      const customer = (v.st.customerT || 0) > 0;
      if (customer) v.st.customerT -= dt;
      let yaw = v.st.face, headTurn = 0, dz = 0;
      if (d < 1.4 && cat.y < 1) { headTurn = Math.max(-0.9, Math.min(0.9, Math.atan2(cat.x - v.x, cat.z - v.z) - yaw)) * 0.8; dz = -v.st.side * 0.15; }
      o.position.set(v.x, collision.groundAt(v.x, v.z + dz, 0.4), v.z + dz);
      o.rotation.y = yaw;
      v.next -= dt;
      if (quiet) { v.barkT = 0; v.next = Math.max(v.next, 2); }
      if (v.next <= 0 && d < 9) {
        v.bark = d < 3 && Math.random() < 0.5 ? pick(RECOGNIZE) : pick(BARKS);
        v.barkT = 2.6; v.next = 8 + Math.random() * 12;
      }
      if (v.barkT > 0) { v.barkT -= dt; bubbles.push({ obj: o, text: v.bark, alpha: Math.min(1, v.barkT * 2), small: true, dist: d }); }
      v.h.animate(dt, { work: v.act === 'work' && !customer, lean: v.act === 'lean', talking: v.barkT > 0 || customer, headTurn });
    }

    for (const w of this.walkers) {
      const active = !w.off && (w.night ? (hour >= 17.5 || hour < 1) : (hour >= w.from && hour < w.to));
      const o = w.h.object3d;
      o.visible = active && !(view && this.blocks(view, o.position));
      if (!active) continue;
      const K = view && view.clear;
      if (K) { const kx = w.x - K.x, kz = w.z - K.z, kd = Math.hypot(kx, kz) || 1; if (kd < K.r) { const push = Math.min(K.r - kd, dt * 4); w.x += (kx / kd) * push; w.z += (kz / kd) * push; if (kd < K.r - 0.5) o.visible = false; } }
      let speed = 0;
      const dc = Math.hypot(cat.x - w.x, cat.z - w.z);
      if (w.path.length) {
        const [tx, tz] = w.path[0];
        const dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
        if (d < 0.15) { w.path.shift(); if (!w.path.length) { w.act = w.goal.act; w.actT = 5 + Math.random() * 10; } }
        else {
          speed = (w.h.sitAmt > 0.12 ? 0 : 1) * w.speed * (w.goal && w.goal.act === 'chat' && w.partner ? 1.1 : 1);
          w.x += (dx / d) * speed * dt; w.z += (dz / d) * speed * dt;
          let a = Math.atan2(dx, dz) - w.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
          w.yaw += a * Math.min(1, 6 * dt);
        }
      } else if (w.act) {
        w.actT -= dt;
        let a = w.goal.face - w.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
        w.yaw += a * Math.min(1, 3 * dt); w.faced = Math.abs(a) < 0.25;
        if (w.actT <= 0 && !(w.act === 'chat' && w.partner && w.partner.path.length)) {
          if (w.partner) { w.partner.partner = null; w.partner = null; }
          this.plan(w);
        }
      } else {
        w.actT -= dt;
        if (w.actT <= 0) this.plan(w);
      }
      // the cat: step aside if it runs through, sometimes glance down at it
      if (dc < 0.9 && catSpeed > 2 && cat.y < 0.5) { w.side += dt * 2; w.lookT = 1.5; }
      else w.side = Math.max(0, w.side - dt);
      if (dc < 2 && w.lookT <= 0 && Math.random() < dt * 0.3) w.lookT = 1.2 + Math.random();
      w.lookT -= dt;
      const sx = Math.cos(w.yaw) * Math.min(0.5, w.side * 0.3), sz = -Math.sin(w.yaw) * Math.min(0.5, w.side * 0.3);
      w.y = w.act === 'curb' ? 0 : w.act === 'sit' ? collision.groundAt(w.x, w.z, 0.3) : collision.groundAt(w.x + sx, w.z + sz, Math.max(0.3, (w.y || 0) + 0.3));
      o.position.set(w.x + sx, w.y, w.z + sz);
      o.rotation.y = w.yaw;
      const lookAt = w.lookT > 0 ? Math.max(-1, Math.min(1, Math.atan2(cat.x - w.x, cat.z - w.z) - w.yaw)) : 0;
      w.h.animate(dt, {
        speed, phone: w.act === 'phone', curb: w.act === 'curb' && w.faced, sit: w.act === 'sit' && w.faced, talking: w.act === 'chat' && !!w.partner,
        headTurn: lookAt * 0.7, headPitch: w.lookT > 0 ? 0.35 : 0,
      });
    }
    return bubbles;
  }

  // someone reacts to a noise (a knocked can)
  startle(x, z) {
    for (const w of this.walkers) if (w.h.object3d.visible && Math.hypot(w.x - x, w.z - z) < 5) w.lookT = 1.8;
  }
}
