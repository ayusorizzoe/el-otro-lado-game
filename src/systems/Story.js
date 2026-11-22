// The collar. Three people at their stalls each give a piece of it (listen first, then win
// their game, in any order), and three hidden games give the cat something to be better with.
// With the collar complete, the cat chooses who writes its name on the tag, and follows them.

import { CHALLENGE, CHAPTERS, PIECES, SECRETS, STORY } from '../narrative/Content.js';

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Story {
  constructor(game) {
    this.game = game;
    this.phase = 'play';              // play | choose | name | home
    this.stalls = CHAPTERS.map((c) => ({ id: c.game, c, won: false, best: null }));
    this.secrets = SECRETS.map((d) => ({ id: d.game, d, won: false, best: null, found: false }));
    this.focus = 0; this.guide = false; this.line = null; this.smelled = false;
  }
  has(id) { return [...this.stalls, ...this.secrets].some((q) => q.id === id && q.won); }
  get pieces() { return this.stalls.filter((q) => q.won).length; }
  get open() { return [...this.stalls, ...this.secrets.filter((q) => q.found)].filter((q) => !q.won); }
  get current() { const l = this.open; return l.length ? l[this.focus % l.length] : null; }
  host(q) { return q.c ? this.game.residents.get(q.c.who) : null; }
  conv(c) { return this.game.narrative.convs.find((k) => k.def.id === c.conv); }
  isHost(id) { return CHAPTERS.some((c) => c.conv === id); }
  quiet(...p) { return p.includes(this.phase); }
  // dangers only in the street, while there's still something to do
  get dangers() { const p = this.game.ctrl.pos; return this.phase === 'play' && this.smelled && p.z > 5.2 && p.z < 13.5 && p.x > -19 && p.x < 19; }
  // who the story cares about right now (their names stand out)
  matters(r) { return this.phase === 'choose' ? true : this.phase === 'play' ? this.current && this.host(this.current) === r : r === this.chosen; }

  done(r) { return this.stalls.some((q) => q.won && this.host(q) === r) && this.phase === 'play'; }

  // where a game is played
  spot(q) {
    if (q.c) { const C = this.conv(q.c); return { x: C.center.x, y: 0.12, z: C.center.z, kind: q.c.kind }; }
    return { x: q.d.at[0], y: q.d.at[1], z: q.d.at[2], kind: 'secret', via: q.d.via };
  }

  update(dt, P) {
    const g = this.game;
    if (!g.challenges.active && this.phase === 'play') for (const q of this.secrets) if (!q.found && flat(P, this.spot(q)) < q.d.reveal && P.y < q.d.at[1] + 2.5) {
      q.found = true; g.audio.found(); g.ui.toast(q.d.hint, 4200); this.focus = this.open.indexOf(q); this.guide = false;
    }
    if (this.phase === 'name') this.naming(dt);
    if (this.phase === 'home') {
      const a = this.chosen.actor;
      if (a.state === 'door' && flat(P, a.pos) < 3 && P.y < 1.5) g.state.end(this.chosen.key);
    }
  }

  // a game ended: what the result panel should say
  result(c, won, score) {
    const g = this.game, q = [...this.stalls, ...this.secrets].find((k) => k.id === c.type);
    if (!won) return { title: STORY.lost, text: c.why || CHALLENGE[c.type].lost, next: CHALLENGE[c.type].win };
    q.won = true; q.best = c.scoreText(score); this.guide = false; this.focus = 0;
    if (q.c) { g.cat.wear(PIECES[q.id].part); g.state.hourGoal = Math.max(g.state.hourGoal, 9.5 + this.pieces * 3); }
    else { g.state.hourGoal += 0.6; this.perk(q.id); }
    g.dangers.next = Math.min(g.dangers.next, 3);          // the street answers
    if (this.pieces === 3) { this.phase = 'choose'; g.state.hourGoal = 18.7; g.dangers.stop(); }
    const left = this.open[0];
    return {
      title: STORY.won, score: q.best,
      text: q.c ? `${PIECES[q.id].title}: ${PIECES[q.id].text}` : `${q.d.reward}: ${q.d.rewardText}`,
      next: this.phase === 'choose' ? STORY.allDone : `${STORY.next} ${left.c ? left.c.go.toLowerCase() : left.d.go.toLowerCase()} (Q)`,
    };
  }
  perk(id) {
    const g = this.game;
    if (id === 'race') g.ctrl.jumpScale = 1.15;
    if (id === 'cans') g.challenges.reach = 1;
    if (id === 'dog') g.dangers.skip.add('dog');
  }

  // what E does here, or null
  action(P) {
    const g = this.game;
    if (this.phase === 'choose') {
      const r = g.residents.nearest(P, 3.2);
      return r && P.y < 1.2 ? { text: `E · irte con ${r.def.name}`, run: () => this.choose(r) } : null;
    }
    if (this.phase !== 'play') return null;
    for (const q of this.stalls) {
      const r = this.host(q);
      if (!q.won && r.actor.distTo(P) < 4.2 && P.y < 1.2 && this.conv(q.c).done) return { text: `E · ${q.c.verb}`, run: () => g.challenges.start(r, q.id) };
    }
    for (const q of this.secrets) {
      const at = this.spot(q);
      if (q.found && !q.won && flat(P, at) < 1.8 && Math.abs(P.y - at.y) < 1) return { text: `E · ${q.d.verb}`, run: () => g.challenges.start(this.actorFor(q), q.id) };
    }
    return null;
  }
  // hidden games have no host, just a place
  actorFor(q) {
    const at = this.spot(q);
    return q.r || (q.r = { key: q.id, def: { name: '', lines: {}, won: {}, lost: '' }, foodAt: { x: at.x, z: at.z }, actor: { h: { object3d: { position: at } }, pos: at, distTo: (p) => flat(p, at) } });
  }

  // Q: pick a trail, or the next one
  sniff() {
    if (this.phase !== 'play') { this.guide = true; return this.phase === 'choose'; }
    if (!this.open.length) return false;
    if (this.guide) this.focus = (this.focus + 1) % this.open.length;
    this.guide = true; this.smelled = true;
    return true;
  }

  goal(P) {
    const g = this.game;
    if (this.phase === 'choose') { const r = g.residents.nearest(P, 99); return { text: STORY.choose, target: { x: r.actor.pos.x, y: 0.12, z: r.actor.pos.z, kind: 'food' } }; }
    if (this.phase === 'home') { const a = this.chosen.actor; return { text: STORY.home, target: { x: a.pos.x, y: (a.y || 0) + 0.1, z: a.pos.z, kind: 'food' } }; }
    const q = this.current;
    if (this.phase !== 'play' || !q) return null;
    if (!this.smelled) return { text: STORY.first, target: null };
    const at = this.spot(q);
    if (!q.c) return { text: q.d.go, target: at };
    const C = this.conv(q.c), r = this.host(q);
    if (C.done) return { text: q.c.ask, target: { x: r.actor.pos.x, y: 0.12, z: r.actor.pos.z, kind: q.c.kind } };
    if (flat(P, C.center) < 4.2 && P.y < 1.8) return { text: C.present ? STORY.listen : STORY.wait, target: null };
    return { text: q.c.go, target: at };
  }

  // ---------------------------------------------------------------- the name
  choose(r) {
    const g = this.game, a = r.actor;
    this.phase = 'name'; this.chosen = r; this.li = 0; this.pt = 0;
    g.ctrl.frozen = true; g.ctrl.vel.set(0, 0, 0); g.ctrl.yaw = Math.atan2(a.pos.x - g.ctrl.pos.x, a.pos.z - g.ctrl.pos.z);
    a.mark.face = g.ctrl.yaw + Math.PI;
    g.audio.purr(3);
  }
  naming(dt) {
    const g = this.game, d = this.chosen.def, l = d.naming[this.li];
    this.pt += dt;
    if (l) { this.line = { name: d.name, text: l, alpha: 1, title: '', n: 0, of: 0 }; if (this.pt > 1.8 + l.length * 0.06) { this.li++; this.pt = 0; } return; }
    this.line = null;
    if (!this.named) { this.named = true; this.pt = 0; g.ui.chapter(d.catName, STORY.named); g.audio.found(); g.cat.wear('name'); }
    if (this.pt > 2.8) {
      g.ctrl.frozen = false; this.phase = 'home';
      g.residents.walkHome(this.chosen);
      g.residents.speak(this.chosen, d.invite, 5);
    }
  }
}
