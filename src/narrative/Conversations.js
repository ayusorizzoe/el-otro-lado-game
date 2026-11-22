// Overheard conversations. People who are talking show "· · ·" from far off. Sit still near
// them and you hear every word, one line at a time, from where you left off; walk away and
// it waits for you. A conversation is complete once every line has been heard.
// Only one conversation is ever audible at a time: the nearest one.

import { CONVERSATIONS } from './Content.js';
import { Actor } from './Actor.js';

const NEAR = 4.2;

// how long the cat must be still before it starts to listen: briefly at the three stalls,
// longer for one it just happens to be near
const SIT = 0.9, SIT_OTHER = 2.5;

export class Narrative {
  constructor(scene, materials, state, anchors, residents, story) {
    this.state = state; this.story = story;
    this.residents = residents;
    this.listening = false;     // close enough to hear every word
    this.line = null;           // { name, text, alpha } for the subtitle
    this.focus = null;          // where the people being heard are
    this.convs = CONVERSATIONS.map((c) => {
      let marks;
      if (c.host) marks = [residents.get(c.host).mark, residents.get(c.host).guest];
      else {
        const s = anchors.spots[c.spot];
        const tx = Math.cos(s.face), tz = -Math.sin(s.face), sep = s.pose === 'bench' ? 0.5 : 0.48;
        marks = [-1, 1].map((sg) => ({ x: s.x + tx * sep * sg, z: s.z + tz * sep * sg, face: s.pose === 'bench' ? s.face : s.face + sg * 0.85 }));
      }
      const actors = c.speakers.map((sp) => (sp.host ? residents.get(c.host).actor : new Actor(scene, materials, sp.look, sp.name)));
      return {
        def: c, marks, actors, poses: c.poses || [{}, {}], center: { x: (marks[0].x + marks[1].x) / 2, z: (marks[0].z + marks[1].z) / 2 },
        line: 0, lineT: 0, done: false, active: false, speaking: -1,
      };
    });
  }

  // o: { mute (a challenge or a danger is on), idle (seconds the cat has been still) }
  update(dt, cat, { mute = false, idle = 0, only = null } = {}) {
    const S = this.state, bubbles = [];
    const was = this.current;
    this.listening = false; this.line = null; this.focus = null; this.near = null; this.current = null;
    let nearest = null, nd = Infinity;

    for (const C of this.convs) {
      const d = C.def, host = d.host && this.residents.get(d.host);
      const active = host ? !host.home : S.windowActive(d.from, d.to);
      if (active && !C.active) { C.active = true; C.actors.forEach((a, i) => { if (!d.speakers[i].host) a.arrive(C.marks[i]); }); }
      if (!active && C.active) { C.active = false; C.actors.forEach((a, i) => { if (!d.speakers[i].host) a.leave(); }); }
      C.present = C.active && C.actors.every((a) => a.here);
      C.dist = Math.hypot(cat.x - C.center.x, cat.z - C.center.z);
      C.speaking = -1;
      if (C.present && !C.done && cat.y < 3.2 && C.dist < nd && (!only || only(d.id))) { nd = C.dist; nearest = C; }
    }

    const inReach = nearest && !mute && nd < NEAR && cat.y < 1.8;
    if (inReach) this.near = nearest;
    // sit still to start; once listening, shifting about is fine as long as you stay close
    const hear = inReach && (was === nearest || idle > (nearest.def.host ? SIT : SIT_OTHER)) ? nearest : null;

    for (const C of this.convs) {
      const d = C.def;
      if (C === hear) {
        const [who, text] = d.lines[C.line], dur = 2.8 + text.length * 0.066;
        C.lineT += dt;
        C.speaking = who;
        this.listening = true; this.current = C; this.focus = C.center;
        this.line = { name: d.speakers[who].name, text, alpha: Math.max(0, Math.min(1, C.lineT * 4, (dur - C.lineT) * 3 + 0.2)), title: d.title, n: C.line + 1, of: d.lines.length };
        if (C.lineT >= dur) {
          C.line++; C.lineT = 0;
          if (C.line >= d.lines.length) { C.done = true; this.current = null; S.markHeard(d.id); S.events.push({ type: 'heard', id: d.id }); }
        }
      } else if (C.present && !C.done) {
        // talking on their own, out of earshot
        C.speaking = Math.floor(performance.now() / 3200) % 2;
        if (C.lineT > 0) C.lineT = 0;
        if (!mute && C.dist < 30 && (!only || only(d.id))) bubbles.push({ obj: C.actors[1].h.object3d, text: C.dist < NEAR + 1 ? 'platican…' : '· · ·', talk: true, alpha: C.dist < 14 ? 1 : 0.75 });
      }
      if (d.host) this.residents.get(d.host).talking = C.speaking === 0;
      C.actors.forEach((a, i) => {
        if (!d.speakers[i].host) a.update(dt, { talking: C.speaking === i, pose: a.here ? C.poses[i] : {} }, cat);
      });
    }
    return bubbles;
  }
}
