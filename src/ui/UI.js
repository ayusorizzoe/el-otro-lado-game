// HUD, prompts, speech bubbles, title and ending screens.

import * as THREE from 'three';
import './styles.css';
import { TEXT } from '../narrative/Content.js';

const v = new THREE.Vector3();

export class UI {
  constructor(root) {
    root.innerHTML = `
      <div id="hud" class="hidden">
        <div id="collar"></div>
        <div id="goal"><span class="arrow">➤</span><span class="txt"></span><span class="far"></span></div>
        <div id="danger"><div class="txt"></div><div class="dbar"><div></div></div></div>
        <div id="challenge"><div class="how"></div><div class="num"></div></div>
        <div id="prompt"></div>
        <div id="toast"></div>
        <div id="hint">Q · olfatear &nbsp; L · libreta</div>
      </div>
      <div id="watch"></div>
      <div id="bubbles"></div>
      <div id="bars"><i></i><i></i></div>
      <div id="subtitle"><span class="prog"></span><span class="who"></span><span class="txt"></span></div>
      <div id="marks"></div>
      <div id="card"><div></div><div></div></div>
      <div id="result"><div class="rs-title"></div><div class="rs-text"></div><div class="rs-collar"></div><div class="rs-next"></div><div class="rs-keys"></div></div>
      <div id="chapter"></div>
      <div id="flash"></div>
      <div id="book"></div>
      <div id="title">
        <div class="inner">
          <h1>${TEXT.title}</h1>
          <div class="controls">${TEXT.controls.map((c) => `<div>${c}</div>`).join('')}</div>
          <div class="start">cargando…</div>
        </div>
      </div>
      <div id="fade"></div>
      <div id="ending"><div class="line"></div><div class="epilogue"></div><div class="restart">${TEXT.restart}</div></div>`;
    this.$ = (id) => root.querySelector('#' + id);
    this.pool = [];
  }

  ready() { this.$('title').querySelector('.start').textContent = TEXT.start; }
  hideTitle() { this.$('title').classList.add('gone'); this.$('hud').classList.remove('hidden'); }

  // the collar so far, and the hidden games found
  setCollar(html) { if (this._co !== html) { this._co = html; this.$('collar').innerHTML = html; } }
  // how a game ended; stays until a key is pressed
  result(o) {
    const el = this.$('result');
    el.className = o ? `show ${o.won ? 'won' : 'lost'}` : '';
    if (!o) return;
    const [t, x, co, n, k] = el.children;
    t.textContent = o.title; x.textContent = o.text + (o.score ? `   ·   ${o.score}` : '');
    co.innerHTML = o.collar || ''; co.style.display = o.won ? '' : 'none';
    n.textContent = o.next; k.textContent = o.won ? 'E · continuar' : 'E · otra vez      Espacio · dejarlo';
  }
  // a game's name and what it takes to win, before it starts
  card(title, win = '') { const el = this.$('card'); el.classList.toggle('show', !!title); if (title) { el.children[0].textContent = title; el.children[1].textContent = win; } }
  // a reward: what it is, large, and what it means
  chapter(title, text) {
    const el = this.$('chapter');
    el.innerHTML = ''; for (const t of [title, text]) { const d = document.createElement('div'); d.textContent = t; el.appendChild(d); }
    el.classList.add('show'); clearTimeout(this._ch); this._ch = setTimeout(() => el.classList.remove('show'), 3600);
  }
  setChallenge(text, how = '', color = '') {
    if (this._c === text) return;
    this._c = text;
    const el = this.$('challenge'); el.children[0].textContent = how; el.children[1].textContent = text; el.children[1].style.color = color; el.classList.toggle('show', !!text);
  }
  // the one next step: text, and an arrow and distance to it (angle 0 = straight ahead)
  setGoal(text, angle = null, dist = 0) {
    const el = this.$('goal');
    if (this._g !== text) { this._g = text; el.children[1].textContent = text; el.classList.toggle('show', !!text); el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); }
    const on = angle !== null;
    el.children[0].style.display = on ? '' : 'none';
    if (on) el.children[0].style.transform = `rotate(${angle - Math.PI / 2}rad)`;
    const far = on ? `${Math.max(1, Math.round(dist))} m` : '';
    if (this._far !== far) { this._far = far; el.children[2].textContent = far; }
  }
  // being looked at: the edges of the screen draw in
  setWatch(v) { if (this._w !== v) { this._w = v; this.$('watch').style.opacity = v; } }

  // what is being overheard, large and in one place
  subtitle(line, hold = false) {
    const el = this.$('subtitle');
    el.style.opacity = line ? 1 : 0;
    this.$('bars').classList.toggle('show', !!line || hold);
    this.$('hud').classList.toggle('hush', !!line || hold);
    if (!line) return;
    el.children[1].style.opacity = el.children[2].style.opacity = line.alpha;
    if (this._s === line.text) return;
    this._s = line.text;
    el.children[0].textContent = line.title ? `${line.title}   ${line.n}/${line.of}` : '';
    el.children[1].textContent = line.name;
    el.children[2].textContent = line.text;
  }
  // a short result in the middle of the screen. kind: good | bad | info
  flash(text, kind = 'info', secs = 1.3) {
    const el = this.$('flash');
    el.textContent = text; el.className = kind; void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._ft); this._ft = setTimeout(() => el.classList.remove('show'), secs * 1000);
  }
  setDanger(text, frac = 0, safe = false) {
    const el = this.$('danger');
    el.classList.toggle('show', !!text); el.classList.toggle('safe', safe);
    if (!text) return;
    if (this._d !== text) { this._d = text; el.children[0].textContent = text; }
    el.children[1].firstChild.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  }
  // the notebook: what's been heard
  book(sections) {
    const el = this.$('book');
    el.classList.toggle('show', !!sections);
    if (!sections) return;
    el.innerHTML = '';
    const add = (cls, t) => { const d = document.createElement('div'); d.className = cls; d.textContent = t; el.appendChild(d); };
    for (const [title, items] of sections) { add('bk-title', title); for (const [n, t] of items) { add('bk-name', n); add('bk-text', t); } }
    add('bk-close', 'L para cerrar');
  }
  // a letter printed on a phone screen
  label(ch) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#101014'; g.font = '900 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 35);
    return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  }

  setPrompt(t) {
    if (this._p === t) return;
    this._p = t;
    const el = this.$('prompt');
    el.textContent = t || '';
    el.classList.toggle('show', !!t);
  }
  toast(t, ms = 3000) {
    const el = this.$('toast');
    el.textContent = t; el.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('show'), ms);
  }

  // screen position above an object; kept inside the screen so speech is never lost
  project(obj, camera, y, clamp = true) {
    obj.getWorldPosition(v); v.y += y; v.project(camera);
    if (v.z > 1) return null;
    if (!clamp && (Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1)) return null;
    const x = clamp ? Math.max(-0.8, Math.min(0.8, v.x)) : v.x, yy = clamp ? Math.max(-0.6, Math.min(0.56, v.y)) : Math.min(0.8, v.y);
    return { x: (x * 0.5 + 0.5) * innerWidth, y: (-yy * 0.5 + 0.5) * innerHeight };
  }

  bubbles(list, camera) {
    const layer = this.$('bubbles');
    while (this.pool.length < list.length) {
      const d = document.createElement('div');
      d.className = 'bubble';
      d.innerHTML = '<span class="who"></span><span class="txt"></span>';
      layer.appendChild(d); this.pool.push(d);
    }
    this.pool.forEach((d, i) => {
      const b = list[i];
      const p = b && this.project(b.obj, camera, b.low ? 1.4 : 1.85, !!b.keep);
      if (!p) { d.style.display = 'none'; return; }
      d.style.display = 'block';
      d.classList.toggle('murmur', !!b.murmur);
      d.classList.toggle('small', !!b.small);
      d.classList.toggle('talk', !!b.talk);
      d.classList.toggle('faint', !!b.faint);
      d.children[0].textContent = b.name || '';
      if (d.children[1].textContent !== b.text) d.children[1].textContent = b.text;
      d.style.transform = `translate(-50%, -100%) translate(${p.x}px, ${p.y}px)`;
      d.style.opacity = b.alpha;
    });
  }

  // names over the people of the story, from anywhere in the street
  marks(list, camera) {
    const el = this.$('marks');
    while (el.children.length < list.length) el.appendChild(document.createElement('div'));
    list.forEach((m, i) => {
      const d = el.children[i], p = m.show && this.project(m.obj, camera, m.y ?? (m.low ? 1.65 : 2.2), false);
      d.style.display = p ? 'block' : 'none';
      if (!p) return;
      if (d.textContent !== m.name) d.textContent = m.name;
      d.classList.toggle('on', m.on);
      d.style.opacity = m.dist > 26 ? 0.55 : 1;
      d.style.transform = `translate(-50%, -100%) translate(${p.x}px, ${p.y}px) scale(${Math.max(0.72, Math.min(1.1, 8 / Math.max(6, m.dist)))})`;
    });
  }

  fade(on, ms = 900) {
    const el = this.$('fade');
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = on ? 1 : 0;
    return new Promise((r) => setTimeout(r, ms));
  }

  showEnding(line, name, heard, left) {
    this.$('hud').classList.add('hidden');
    const el = this.$('ending');
    el.querySelector('.line').textContent = line;
    const ep = el.querySelector('.epilogue');
    const add = (cls, text, to = ep) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; to.appendChild(d); return d; };
    add('ep-count', name);
    if (heard.length) add('ep-title', TEXT.epilogueTitle);
    for (const c of heard) { const it = add('ep-item', ''); add('ep-name', c.title, it); add('ep-text', c.epilogue, it); }
    if (left.length) { add('ep-title', TEXT.remembered); for (const t of left) add('ep-item ep-text', t); }
    el.classList.add('show');
    setTimeout(() => ep.classList.add('show'), 2400);
  }
}
