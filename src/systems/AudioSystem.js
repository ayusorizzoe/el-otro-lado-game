// Ambient sound, synthesized with WebAudio (no files, no services): wind, market murmur,
// distant traffic, the sea to the west, sizzling at the taquero's cart, birds, an occasional
// dog, and small one-shots (a can falling, wings, a mouse). Volumes depend on where the cat
// is: rooftops are windier, the alley is quiet, the west end hears the sea. Everything
// ducks while a conversation is being overheard.

import { wind } from '../rendering/Wind.js';

function noiseBuffer(ctx, type = 'white', seconds = 3) {
  const n = ctx.sampleRate * seconds, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  let b = 0, p0 = 0, p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (type === 'brown') { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }
    else if (type === 'pink') { p0 = 0.997 * p0 + w * 0.029; p1 = 0.985 * p1 + w * 0.032; p2 = 0.95 * p2 + w * 0.048; d[i] = (p0 + p1 + p2 + w * 0.02) * 1.6; }
    else d[i] = w;
  }
  return buf;
}

export class AudioSystem {
  constructor() { this.ctx = null; this.duck = 1; this.t = 0; this.nextBird = 3; this.nextDog = 20; }

  // must be called from a user gesture
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(ctx.destination);
    this.amb = ctx.createGain(); this.amb.connect(this.master);
    this.buf = { white: noiseBuffer(ctx, 'white'), pink: noiseBuffer(ctx, 'pink'), brown: noiseBuffer(ctx, 'brown') };
    const loop = (type, filterType, freq, q = 0.7) => {
      const src = ctx.createBufferSource(); src.buffer = this.buf[type]; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.amb); src.start();
      return { f, g };
    };
    this.wind = loop('white', 'bandpass', 500, 0.6);
    this.murmur = loop('pink', 'bandpass', 650, 0.9);
    this.traffic = loop('brown', 'lowpass', 160);
    this.sea = loop('brown', 'lowpass', 420);
    this.sizzle = loop('white', 'highpass', 3200);
  }

  set(node, v, k = 0.3) { node.g.gain.setTargetAtTime(v, this.ctx.currentTime, k); }

  // ctx: { cat, hour, marketOn, standDist, listening }
  update(dt, s) {
    if (!this.ctx) return;
    this.t += dt;
    const c = s.cat, h = s.hour % 24;
    const roof = Math.min(1, Math.max(0, (c.y - 1.5) / 2.5));
    const back = c.z < 3.5 ? 1 : 0;                                    // alley and courtyard: sheltered, quiet
    const day = h > 7 && h < 20 ? 1 : 0.35;
    this.duck += ((s.listening ? 0.22 : 1) - this.duck) * Math.min(1, dt * 1.5);
    this.amb.gain.setTargetAtTime(this.duck, this.ctx.currentTime, 0.2);

    this.wind.f.frequency.setTargetAtTime(350 + wind.strength * 500, this.ctx.currentTime, 0.5);
    this.set(this.wind, (0.012 + wind.strength * 0.03) * (1 + roof * 2.2) * (back ? 0.6 : 1));
    const nearMarket = Math.max(0, 1 - Math.abs(c.z - 9.5) / 9) * Math.max(0, 1 - Math.max(0, Math.abs(c.x) - 14) / 8);
    const am = 0.75 + 0.25 * Math.sin(this.t * 1.7) * Math.sin(this.t * 0.43);
    this.set(this.murmur, (s.marketOn ? 0.05 : 0.012) * nearMarket * am * (back ? 0.25 : 1) * (1 - roof * 0.4), 0.15);
    this.set(this.traffic, (0.03 + roof * 0.03) * day * (back ? 0.6 : 1));
    const west = Math.max(0, Math.min(1, (-c.x - 10) / 16));
    this.sea.f.frequency.value = 300 + Math.sin(this.t * 0.25) * 140;
    this.set(this.sea, (0.005 + west * 0.06 + roof * 0.015) * (0.7 + 0.3 * Math.sin(this.t * 0.31)));
    const cook = s.standOn ? Math.max(0, 1 - s.standDist / 7) : 0;
    this.set(this.sizzle, cook * 0.025 * (0.6 + Math.random() * 0.4), 0.05);

    // birds by day, a distant dog at night
    this.nextBird -= dt; this.nextDog -= dt;
    if (this.nextBird <= 0) { this.nextBird = 2 + Math.random() * 7; if (day > 0.5 && !back) this.chirp(); }
    if (this.nextDog <= 0) { this.nextDog = 25 + Math.random() * 40; if (day < 1) this.bark(); }
  }

  env(g, t0, a, peak, d) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }

  chirp() {
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
      const f = 2400 + Math.random() * 1800, ts = t0 + i * 0.12;
      o.frequency.setValueAtTime(f, ts); o.frequency.exponentialRampToValueAtTime(f * 1.4, ts + 0.06);
      this.env(g, ts, 0.01, 0.012, 0.07); p.pan.value = Math.random() * 2 - 1;
      o.connect(g); g.connect(p); p.connect(this.amb); o.start(ts); o.stop(ts + 0.12);
    }
  }

  bark() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const src = ctx.createBufferSource(); src.buffer = this.buf.pink;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 3;
      const g = ctx.createGain(); const ts = t0 + i * 0.32;
      this.env(g, ts, 0.01, 0.05, 0.16);
      src.connect(f); f.connect(g); g.connect(this.amb); src.start(ts, Math.random()); src.stop(ts + 0.25);
    }
  }

  // one-shots, panned by where they happen relative to the camera's right vector
  clink(pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime, p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.master);
    for (const [f, a] of [[1350, 0.05], [2120, 0.03], [3300, 0.015]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * (0.95 + Math.random() * 0.1);
      this.env(g, t0, 0.002, a, 0.35); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + 0.4);
    }
    for (let i = 1; i < 3; i++) setTimeout(() => this.tick(pan, 0.02 / i), 140 * i);
  }
  tick(pan, a) {
    const ctx = this.ctx, t0 = ctx.currentTime, p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.master);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 1800 + Math.random() * 600;
    this.env(g, t0, 0.002, a, 0.08); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + 0.1);
  }
  flutter() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const src = ctx.createBufferSource(); src.buffer = this.buf.white;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 600; f.Q.value = 1.2;
      const g = ctx.createGain(); const ts = t0 + i * 0.06 + Math.random() * 0.02;
      this.env(g, ts, 0.005, 0.03, 0.05);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(ts, Math.random() * 2); src.stop(ts + 0.08);
    }
  }
  // plain tones for results and for the phones
  note(f, peak = 0.06, len = 0.2, type = 'triangle', delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; this.env(g, t0, 0.006, peak, len); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + len + 0.1);
  }
  good() { this.note(660, 0.07, 0.14); this.note(990, 0.07, 0.24, 'triangle', 0.09); }
  bad() { this.note(196, 0.08, 0.2, 'square'); this.note(147, 0.07, 0.3, 'square', 0.12); }
  alarm() { for (let i = 0; i < 3; i++) { this.note(740, 0.07, 0.12, 'square', i * 0.24); this.note(554, 0.06, 0.12, 'square', i * 0.24 + 0.12); } }
  cartBell() { for (let i = 0; i < 5; i++) this.note(1480 + (i % 2) * 180, 0.05, 0.2, 'sine', i * 0.16); }
  hiss() { for (let i = 0; i < 3; i++) setTimeout(() => this.rustle(0), i * 160); this.note(310, 0.05, 0.7, 'sawtooth'); }
  found() { [784, 988, 1175, 1568].forEach((f, i) => this.note(f, 0.05, 0.4, 'sine', i * 0.08)); }
  // a bag or a crate being moved
  rustle(pan = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime, p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(this.master);
    for (let i = 0; i < 6; i++) {
      const src = ctx.createBufferSource(); src.buffer = this.buf.white;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200 + Math.random() * 1800;
      const g = ctx.createGain(), ts = t0 + i * 0.11 + Math.random() * 0.04;
      this.env(g, ts, 0.004, 0.05, 0.06); src.connect(f); f.connect(g); g.connect(p); src.start(ts, Math.random() * 2); src.stop(ts + 0.1);
    }
  }
  purr(len = 1.4) {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime, o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 52; l.frequency.value = 24; lg.gain.value = 0.03; f.type = 'lowpass'; f.frequency.value = 260;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.2); g.gain.linearRampToValueAtTime(0, t0 + len);
    l.connect(lg); lg.connect(g.gain); o.connect(f); f.connect(g); g.connect(this.master); o.start(t0); l.start(t0); o.stop(t0 + len); l.stop(t0 + len);
  }
  squeak() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(3200, t0); o.frequency.exponentialRampToValueAtTime(4200, t0 + 0.08);
    this.env(g, t0, 0.005, 0.02, 0.1); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + 0.15);
  }
}
