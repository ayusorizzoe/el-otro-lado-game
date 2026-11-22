// Owns the scene and the single update loop, and coordinates the systems:
// cat movement, camera, people, animals, wind and air, sound, the story and its ending.

import * as THREE from 'three';
import { Config } from './Config.js';
import { Time } from './Time.js';
import { GameState } from './GameState.js';
import { Renderer } from '../rendering/Renderer.js';
import { CameraController } from '../rendering/CameraController.js';
import { Lighting } from '../rendering/Lighting.js';
import { Materials } from '../rendering/Materials.js';
import { wind } from '../rendering/Wind.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CatController } from '../systems/CatController.js';
import { ScentSystem } from '../systems/ScentSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { collision } from '../systems/CollisionSystem.js';
import { Cat } from '../entities/Cat.js';
import { buildStreet } from '../world/Street.js';
import { buildDistant } from '../world/Distant.js';
import { Market } from '../world/Market.js';
import { Critters } from '../world/Critters.js';
import { Atmosphere } from '../world/Atmosphere.js';
import { Dangers } from '../world/Dangers.js';
import { updateKnockables } from '../world/Props.js';
import { Narrative } from '../narrative/Conversations.js';
import { Residents } from '../narrative/Residents.js';
import { Challenges } from '../systems/Challenges.js';
import { Story } from '../systems/Story.js';
import { CHALLENGE, CONVERSATIONS, DANGER, RESIDENTS, TEXT } from '../narrative/Content.js';
import { UI } from '../ui/UI.js';

const NO_INPUT = { move: { fwd: 0, right: 0 }, hit: () => false, down: () => false };
const _v = new THREE.Vector3();

export class Game {
  constructor(container) {
    this.time = new Time();
    this.renderer = new Renderer(container);
    this.scene = new THREE.Scene();
    this.materials = new Materials();
    this.lighting = new Lighting(this.scene, this.materials);
    this.cam = new CameraController(this.renderer.aspect);
    this.input = new InputSystem(this.renderer.domElement);
    this.ui = new UI(document.getElementById('ui'));
    this.state = new GameState();
    this.audio = new AudioSystem();
    this.renderer.onResize = (a) => this.cam.setAspect(a);
    this.started = false; this.busy = false; this.bookOpen = false;
    this._tick = this._tick.bind(this);
  }

  async start() {
    const st = await buildStreet(this.scene, this.materials);
    this.street = st;
    this.distant = buildDistant(this.scene, this.materials);
    this.cam.blockers = st.blockers;
    for (const p of st.lamps) this.lighting.addLamp(p, 0xffc27a, 12, 14, [18.2, 30]);
    this.lighting.addLamp(new THREE.Vector3(st.anchors.stand.x, 2.25, st.anchors.stand.z - 0.3), 0xffa64d, 6, 7, [17, 23.1]);

    this.cat = new Cat(this.materials);
    this.scene.add(this.cat.object3d);
    this.ctrl = new CatController(this.cat);
    const a = st.anchors.start;
    this.ctrl.place(a.x, a.y, a.z, a.yaw);
    this.cam.yaw = a.yaw + Math.PI;
    this.cam.target.copy(this.ctrl.pos);

    this.residents = new Residents(this.scene, this.materials, this.state, st.anchors);
    this.story = new Story(this);
    this.narrative = new Narrative(this.scene, this.materials, this.state, st.anchors, this.residents, this.story);
    this.market = new Market(this.scene, this.materials, st.anchors);
    this.market.setDay(1);
    this.critters = new Critters(this.scene, this.materials);
    this.atmosphere = new Atmosphere(this.scene, this.materials);
    this.dangers = new Dangers(this.scene, this.materials);
    this.challenges = new Challenges(this.scene, this.materials, this);
    this.barkT = 0;
    this.dizzyT = 0;
    this.scent = new ScentSystem(this.scene);

    this.renderer.setup(this.scene, this.cam.camera);
    this.ui.ready();
    this.renderer.setLoop(this._tick);
  }

  // where something happens, as a stereo pan relative to the camera
  pan(p) {
    _v.set(p.x, p.y, p.z).sub(this.cam.camera.position);
    const right = new THREE.Vector3(Math.cos(this.cam.yaw), 0, -Math.sin(this.cam.yaw));
    return Math.max(-1, Math.min(1, _v.dot(right) / Math.max(2, _v.length())));
  }

  // knocked back and slow for a moment
  dizzy(secs, from) {
    const P = this.ctrl.pos, dx = P.x - from.x, dz = P.z - from.z, l = Math.hypot(dx, dz) || 1;
    this.ctrl.vel.set((dx / l) * 5, 0, (dz / l) * 5); this.ctrl.vy = 3.6; this.ctrl.grounded = false;
    this.dizzyT = secs;
  }

  async finish(key) {
    this.busy = true;
    this.audio.purr(3);
    await this.ui.fade(true, 2600);
    const home = RESIDENTS.find((r) => r.key === key);
    this.ui.showEnding(home.ending, home.catName, this.state.heard.map((id) => CONVERSATIONS.find((c) => c.id === id)), RESIDENTS.filter((r) => r !== home).map((r) => r.left));
  }

  // everything stops until the player has seen how a game ended
  showResult(o) { this.ending = { ...o, t: 0 }; this.ui.flash('', 'info', 0.01); this.ui.result({ ...o, collar: this.collarText() }); }
  closeResult(again) {
    const e = this.ending; this.ending = null; this.ui.result(null);
    if (again) this.challenges.start(e.r, e.type);
  }
  collarText() { const Y = this.story; return [['pest', 'listón'], ['hunt', 'cascabel'], ['pattern', 'placa']].map(([id, t]) => `<i class="${Y.has(id) ? 'on' : ''}">${Y.has(id) ? '●' : '○'} ${t}</i>`).join(''); }

  // the notebook: everything heard, line by line
  toggleBook(on) {
    this.bookOpen = on;
    if (!on) return this.ui.book(null);
    const convs = this.narrative.convs.filter((c) => c.line > 0 || c.done).map((c) => [`${c.def.title}${c.done ? '' : `  (${c.line}/${c.def.lines.length})`}`, c.def.lines.slice(0, c.done ? undefined : c.line).map(([w, t]) => `${c.def.speakers[w].name}: ${t}`).join('\n')]);
    const wins = [...this.story.stalls, ...this.story.secrets].filter((q) => q.won).map((q) => [CHALLENGE[q.id].title, q.best]);
    this.ui.book([[TEXT.wins, wins], [TEXT.notebook, convs.length ? convs : [['', TEXT.notebookNone]]]].filter(([, l]) => l.length));
  }

  // ---------------------------------------------------------------- loop
  _tick() {
    const dt = this.time.tick();
    const I = this.input, S = this.state, P = this.ctrl.pos, Y = this.story;

    if (!this.started && I.pressed.size) { this.started = true; I.pressed.clear(); this.ui.hideTitle(); this.audio.start(); }
    if (S.ended && I.hit('KeyR')) location.reload();

    if (this.started && !this.busy && !S.ended && !this.challenges.active && !this.ending && I.hit('KeyL', 'Escape')) this.toggleBook(this.bookOpen ? false : I.hit('KeyL'));
    if (this.ending) {
      this.ending.t += dt;
      if (this.ending.t > 0.7) { if (I.hit('KeyE', 'Enter')) this.closeResult(!this.ending.won); else if (I.hit('Space', 'Escape')) this.closeResult(false); }
      I.pressed.clear();
    }
    const playing = this.started && !this.busy && !S.ended && !this.bookOpen && !this.ending;
    const ch = this.challenges.active;
    const pounce = playing && !ch && I.hit('Space');
    // what the cat looks at: whoever it's playing with, a nearby creature, or someone talking
    const who = this.residents.list.find((r) => r.actor.distTo(P) < 3.5);
    this.ctrl.lookAt = (ch && ch.type !== 'race' && ch.type !== 'cans' && ch.r.actor.h.object3d.position) || this.critters.nearestCreature(P, 2.5) || this.narrative.focus || (who && who.actor.h.object3d.position) || null;
    // with the rats, Space is crouch-and-pounce instead of jump
    const move = ch && ch.type === 'pest' ? { move: I.move, down: (...c) => I.down(...c), hit: (...c) => I.hit(...c.filter((x) => x !== 'Space')) } : I;
    this.ctrl.update(dt, playing ? move : NO_INPUT, this.cam.yaw, { locked: !playing });
    if (playing) S.tick(dt * (window.__timeScale || 1));
    wind.update(dt);

    if (playing && this.critters.tryCatch(P, pounce)) { this.ui.toast('¡un ratón!'); this.audio.squeak(); }
    this.dizzyT = Math.max(0, this.dizzyT - dt);
    if (!ch) this.ctrl.speedScale = this.dizzyT > 0 ? 0.45 : 1;
    const won = Y.secrets.filter((q) => q.won).length;
    this.ui.setCollar(`${this.collarText()}<small>juegos escondidos ${won}/${Y.secrets.length}</small>`);

    // the one thing to do here
    const act = this.act = playing && !ch && !this.dangers.busy ? Y.action(P) : null;
    this.ui.setPrompt(act ? act.text : playing && !ch && !this.dangers.busy && !this.narrative.listening && this.narrative.near ? 'quédate quieto para escuchar' : '');
    if (act && I.hit('KeyE')) { this.narrative.listening = false; act.run(); }
    else if (playing && !ch && I.hit('KeyF') && this.ctrl.grounded && !this.cat.rolling) this.cat.roll();
    if (playing) { this.challenges.update(dt, I, P); Y.update(dt, P); } else this.challenges.idle(dt);

    // names over the people of the story; the one who matters now stands out
    const goal = this.goal = playing && !this.dangers.busy && !this.challenges.active ? Y.goal(P) : null;
    this.ui.marks(this.residents.list.map((r) => ({ name: Y.done(r) ? `✓ ${r.def.short}` : r.def.short, on: !!Y.matters(r), obj: r.actor.h.object3d, dist: r.actor.distTo(P), show: !this.ending && (Y.matters(r) || r.actor.distTo(P) < 12) && this.started && !S.ended && !this.busy && !ch && !this.narrative.listening && Y.phase !== 'name' && r.sayT <= 0 })).concat(Y.secrets.map((q) => ({ name: q.won ? `✓ ${q.d.label}` : q.found ? q.d.label : '¿?', on: !q.won && Y.current === q, obj: q.mark || (q.mark = Object.assign(new THREE.Object3D(), { name: q.id })), low: true, dist: 10, show: this.started && Y.phase === 'play' && !ch && !this.narrative.listening && !S.ended && Math.hypot(P.x - q.d.at[0], P.z - q.d.at[2]) < (q.found ? 12 : q.d.reveal * 1.6) }))).concat(ch && ch.food ? [{ name: ch.mark || CHALLENGE.pest.meat, on: true, y: 1.05, obj: ch.food, dist: 6, show: true }] : []), this.cam.camera);
    for (const q of Y.secrets) if (q.mark) { q.mark.position.set(...q.d.at); q.mark.updateMatrixWorld(); }
    const target = goal && goal.target || (ch && !(ch.ready > 0) && ch.arrow) || null;
    if (target) {
      const dx = target.x - P.x, dz = target.z - P.z;
      this.ui.setGoal(goal ? goal.text : 'Por aquí', Math.atan2(-Math.sin(this.cam.yaw) * dz + Math.cos(this.cam.yaw) * dx, -Math.sin(this.cam.yaw) * dx - Math.cos(this.cam.yaw) * dz), Math.hypot(dx, dz, target.y - P.y));
    } else this.ui.setGoal(goal ? goal.text : '');

    // sniffing lays a trail to the next place, and it stays until you get there
    if (playing && !ch && !this.narrative.listening && I.hit('KeyQ')) { if (Y.sniff()) { this.audio.rustle(0); if (Y.open.length > 1) this.ui.toast('Q otra vez para seguir otro rastro', 2600); } else this.ui.toast('no hueles nada por ahora'); }
    const trail = Y.guide && Y.phase === 'play' && goal && !this.narrative.listening ? goal.target : null;
    if (trail && Math.hypot(trail.x - P.x, trail.z - P.z) > 2) this.scent.follow(P, trail, dt);
    this.scent.update(dt, [], P);

    while (S.events.length) {
      const e = S.events.shift();
      if (e.type === 'heard') this.ui.toast(`${TEXT.heardOne} · ${CONVERSATIONS.find((c) => c.id === e.id).title} (L para releer)`, 4500);
      if (e.type === 'end') this.finish(e.kind);
    }

    // dangers, always announced, only between chapters
    const D = this.dangers;
    const beside = this.residents.nearest(P, 2.1) || (this.market.anyoneNear(P, 1.8) ? true : null);
    const dv = playing ? D.update(dt, P, { allow: Y.dangers && !ch && !act && !this.narrative.listening && !this.narrative.near, person: !!beside && P.y < 1.2, people: true }) : null;
    if (dv) {
      if (dv.type === 'warn') { this.audio.alarm(); if (dv.kind === 'dog') this.audio.bark(); if (dv.kind === 'cart') this.audio.cartBell(); if (dv.kind === 'tomcat') this.audio.hiss(); }
      if (dv.type === 'go') this.ui.flash(DANGER[dv.kind].go, 'bad', 0.9);
      if (dv.type === 'safe') { this.ui.flash(DANGER.safe, 'good', 1.4); this.audio.good(); if (beside && beside.def) this.residents.speak(beside, beside.def.shoo, 2.5); }
      if (dv.type === 'caught') {
        this.dizzy(4, D);
        this.ui.flash(DANGER[dv.kind].caught, 'bad', 2); this.audio.bad();
      }
    }
    this.barkT -= dt;
    if (D.state === 'chase' && D.kind !== 'cart' && this.barkT <= 0) { if (D.kind === 'dog') this.audio.bark(); else this.audio.hiss(); this.barkT = 1.1 + Math.random() * 0.8; }
    if (D.state === 'warn' || D.state === 'chase') {
      const ok = D.safe(P, !!beside && P.y < 1.2);
      this.ui.setDanger(ok && D.state === 'chase' ? `${DANGER.safe} Quédate ahí` : D.text, D.state === 'warn' ? D.t / 3.2 : ok ? 1 : 0, ok);
    } else this.ui.setDanger('');

    // people. While someone is being overheard, nobody else is heard.
    const active = this.challenges.active, naming = Y.phase === 'name';
    const said = this.narrative.update(dt, P, { mute: !playing || !!active || act || Y.quiet('name', 'home', 'choose') || D.busy, idle: this.ctrl.idle });
    const quiet = this.narrative.listening || !!active || naming;
    const calls = this.residents.update(dt, P, { quiet: this.narrative.listening || naming, challenge: active, naming: naming ? Y.chosen : null });
    const barks = this.market.update(dt, S.hour, P, this.ctrl.speed, quiet, {
      cam: this.cam.camera.position, cat: P,
      clear: active && ['pest', 'pattern'].includes(active.type) ? { x: active.r.foodAt.x, z: active.r.foodAt.z, r: 2.6 } : naming ? { x: P.x, z: P.z, r: 2.4 } : this.narrative.listening ? { x: (P.x + this.narrative.focus.x) / 2, z: (P.z + this.narrative.focus.z) / 2, r: 1.8 } : null,
    });
    const bubbles = this.narrative.listening || naming ? [] : active ? calls : said.concat(calls, barks.slice(0, 2));
    this.ui.subtitle(this.started ? (naming ? Y.line : this.narrative.line) : null, naming);
    this.ui.bubbles(this.started && !S.ended ? bubbles : [], this.cam.camera);
    this.bubbleCount = bubbles.length;
    // the camera leans toward people you're sitting still to hear, and steps back for games
    this.cam.update(dt, I, P, naming ? Y.chosen.actor.pos : this.narrative.listening && this.ctrl.idle > 0.8 ? this.narrative.focus : null, !!active);

    const birdsBefore = this.critters.birds.filter((b) => b.fly > 0).length;
    this.critters.update(dt, S.hour, P, this.ctrl.speed, []);
    if (this.critters.birds.filter((b) => b.fly > 0).length > birdsBefore + 1) this.audio.flutter();
    updateKnockables(this.street.knockables, P, dt, (x, z, y) => collision.groundAt(x, z, y), (pos) => {
      this.audio.clink(this.pan(pos));
      this.critters.scare(pos.x, pos.z, 5);
      this.market.startle(pos.x, pos.z);
    });
    this.atmosphere.update(dt, P, (1 - this.lighting.night) * Math.min(1, this.lighting.sun.intensity / 2.5));
    this.audio.update(dt, {
      cat: P, hour: S.hour, marketOn: this.market.vendorsOn(S.hour), listening: this.narrative.listening,
      standOn: true, standDist: Math.hypot(P.x - this.street.anchors.stand.x, P.z - this.street.anchors.stand.z),
    });
    this.lighting.update(S.hour, P, this.cam.camera);
    this.distant.update(this.lighting.night);
    this.renderer.render();
    I.endFrame();
  }
}
