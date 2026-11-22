// The three people at their stalls, and the walk home with whoever the cat chooses.

import { RESIDENTS } from './Content.js';
import { Actor } from './Actor.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Residents {
  constructor(scene, materials, state, anchors) {
    this.state = state;
    this.list = RESIDENTS.map((def) => {
      const r = this.make(scene, materials, def);
      if (def.key === 'taquero') {
        const st = anchors.stand;
        r.mark = { ...anchors.beto };
        r.guest = { ...anchors.lalo };
        r.foodAt = { x: st.x + 1.9, z: st.z - 1.4 };
      } else {
        const st = anchors.stalls[def.stall];
        st.person = def.key;
        r.mark = { x: st.x + 0.35, z: st.z, face: st.face };
        r.guest = { x: st.table.x - 0.3, z: st.table.z + st.side * 0.95, face: st.side > 0 ? Math.PI : 0 };
        r.foodAt = { x: st.table.x, z: st.table.z + st.side * 2.4 };
      }
      this.put(r, r.mark);
      return r;
    });
  }

  make(scene, materials, def) {
    return { key: def.key, def, actor: new Actor(scene, materials, def.look, def.key), say: null, sayT: 0, callT: 2 + Math.random() * 6, talking: false, pose: {} };
  }
  put(r, at) {
    const a = r.actor;
    a.mark = { ...at }; a.path = []; a.pos = { x: at.x, z: at.z }; a.y = at.y || 0; a.state = 'here'; a.h.object3d.visible = true; a.h.object3d.rotation.y = at.face || 0;
  }

  get(key) { return this.list.find((r) => r.key === key); }
  // the nearest of the three at their stall
  nearest(p, reach) {
    let best = null, bd = reach;
    for (const r of this.list) { const d = r.actor.distTo(p); if (d < bd) { bd = d; best = r; } }
    return best;
  }
  speak(r, text, t = 3.4) { if (text) { r.say = text; r.sayT = t; } }
  walkHome(r) { r.home = true; r.actor.walk(r.def.route, 'door'); }

  // ctx: { quiet, challenge }
  update(dt, cat, ctx) {
    const bubbles = [];
    for (const r of this.list) {
      const a = r.actor, dc = a.distTo(cat), here = a.here, mine = ctx.challenge && ctx.challenge.r === r;
      if (r.sayT > 0) r.sayT -= dt;
      // they call out now and then, never over a conversation or a game
      r.callT -= dt;
      if (here && !ctx.quiet && !ctx.challenge && !r.talking && r.sayT <= 0 && r.callT <= 0 && dc < 9) {
        this.speak(r, pick(r.def.call));
        r.callT = 13 + Math.random() * 10;
      }
      const o = { talking: r.talking || r.sayT > 0, pose: { ...r.pose, ...(here && !r.talking && ctx.naming !== r ? { work: true } : {}) } };
      if (a.state === 'moving') { o.speed = 1.15; if (dc > 4) { o.hold = true; o.face = a.angleTo(cat); o.headPitch = 0.25; } }
      a.update(dt, o, cat);
      if (r.sayT > 0 && r.say && !ctx.quiet && (!ctx.challenge || mine)) bubbles.push({ obj: a.h.object3d, text: r.say, name: r.def.name, alpha: Math.min(1, r.sayT * 2), keep: dc < 6 });
    }
    return bubbles;
  }
}
