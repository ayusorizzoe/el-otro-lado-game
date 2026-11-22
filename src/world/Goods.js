// What each stall sells, built so you can tell what it is at a glance: phones look like
// phones, bread like bread. One kind per stall.

import * as THREE from 'three';
import { Finish } from './Architecture.js';

export const STALL_KIND = ['fruta', 'ropa', 'celulares', 'zapatos', 'herramientas', 'pan', 'plantas', 'juguetes', 'cobijas', 'ollas', 'fruta'];
const F = (hex, v = 0.06) => Finish.plain(hex, { var: v });
const J = { jitter: 0 };
const pick = (a, i) => a[i % a.length];

const MAKE = {
  // three crates of round fruit, and a hanging bunch of bananas
  fruta(b, x, y, z) {
    const cols = [0xc2402e, 0xe0902a, 0x6a9a3a];
    for (let k = 0; k < 3; k++) {
      const gx = x - 0.5 + k * 0.5;
      b.box(gx - 0.21, y, z - 0.22, gx + 0.21, y + 0.1, z + 0.22, F(0x9c7a50), J);
      for (let f = 0; f < 6; f++) { const g = new THREE.IcosahedronGeometry(0.062, 1); g.translate(gx - 0.12 + (f % 3) * 0.12, y + 0.14, z - 0.07 + Math.floor(f / 3) * 0.14); b.add(g, F(cols[k], 0.1), J); }
    }
    for (let i = 0; i < 4; i++) { const g = new THREE.CylinderGeometry(0.02, 0.012, 0.2, 5); g.rotateX(-0.5 + i * 0.3); g.translate(x + 0.75, y + 0.75, z + 0.1 + i * 0.02); b.add(g, F(0xe8c83a), J); }
  },
  // shirts on hangers, and folded jeans
  ropa(b, x, y, z, s) {
    b.cylinder([x, y + 0.98, z - s * 0.15], 0.012, 0.012, 1.9, Finish.metal(0x8a8a8a), { rotZ: Math.PI / 2, radial: 4 });
    for (let k = 0; k < 6; k++) {
      const gx = x - 0.75 + k * 0.3, h = pick([0xd8d0c0, 0x9c4a44, 0x4a6aa0, 0x3a3a3a, 0xc99a4a, 0x5a7a5a], k);
      b.box(gx - 0.03, y + 0.42, z - s * 0.15 - 0.2, gx + 0.03, y + 0.92, z - s * 0.15 + 0.2, F(h), J);
      b.box(gx - 0.025, y + 0.72, z - s * 0.15 - 0.32, gx + 0.025, y + 0.9, z - s * 0.15 + 0.32, F(h), J);
    }
    for (let k = 0; k < 3; k++) for (let n = 0; n < 4; n++) b.box(x - 0.65 + k * 0.45, y + n * 0.04, z - 0.15, x - 0.32 + k * 0.45, y + n * 0.04 + 0.035, z + 0.17, F(pick([0x3f5a86, 0x2f3f5c, 0x56709a, 0x24303f], n + k)), J);
  },
  // rows of phones standing up with lit screens, hanging chargers, a big phone on the side
  celulares(b, x, y, z, s) {
    const scr = [0x58c8ff, 0xff7aa8, 0x8cff9a, 0xffd34d, 0xb48cff];
    for (let row = 0; row < 2; row++) {
      b.box(x - 0.72, y, z - 0.2 + row * 0.24, x + 0.72, y + 0.04 + (1 - row) * 0.1, z - 0.06 + row * 0.24, F(0x2a2c34), J);
      for (let k = 0; k < 9; k++) {
        const gx = x - 0.64 + k * 0.16, gy = y + 0.13 + (1 - row) * 0.1, gz = z - 0.13 + row * 0.24;
        b.orientedBox([gx, gy, gz], [0.085, 0.17, 0.014], { x: -s * 0.3 }, F(0x0e0f13, 0), J);
        b.orientedBox([gx, gy + 0.002, gz + s * 0.011], [0.07, 0.14, 0.006], { x: -s * 0.3 }, F(pick(scr, k * 2 + row), 0), J);
      }
    }
    for (let k = 0; k < 7; k++) {                                    // cables and cases on a board
      b.box(x - 0.7 + k * 0.2, y + 0.45, z - s * 0.31, x - 0.6 + k * 0.2, y + 0.8, z - s * 0.29, F(pick([0xffffff, 0x18c0ff, 0xff5a7a, 0x222222], k), 0), J);
    }
    b.box(x + 0.86, y - 0.75, z - 0.02, x + 1.36, y + 0.35, z + 0.06, F(0x0e0f13, 0), J);   // the giant phone
    b.box(x + 0.91, y - 0.65, z + (s > 0 ? 0.06 : -0.04), x + 1.31, y + 0.27, z + (s > 0 ? 0.075 : -0.02), F(0x38b6ff, 0), J);
    for (let i = 0; i < 12; i++) b.box(x + 0.95 + (i % 3) * 0.12, y + 0.1 - Math.floor(i / 3) * 0.16, z + 0.075, x + 1.03 + (i % 3) * 0.12, y + 0.18 - Math.floor(i / 3) * 0.16, z + 0.085, F(pick([0xffffff, 0xff5a7a, 0x8cff9a, 0xffd34d], i), 0), J);
    b.cylinder([x + 1.11, y - 0.7, z + 0.07], 0.03, 0.03, 0.01, F(0x8a8a8a), { rotX: Math.PI / 2, radial: 10 });
  },
  zapatos(b, x, y, z) {
    for (let k = 0; k < 5; k++) for (const d of [-0.06, 0.06]) {
      const gx = x - 0.62 + k * 0.31 + d, h = pick([0xf2f2ee, 0x9c3a34, 0x24262c, 0x3f5a86, 0x8a5a34], k);
      b.box(gx - 0.042, y, z - 0.06, gx + 0.042, y + 0.025, z + 0.2, F(0xe8e4da, 0), J);
      b.box(gx - 0.04, y + 0.025, z - 0.06, gx + 0.04, y + 0.075, z + 0.19, F(h), J);
      b.box(gx - 0.04, y + 0.075, z - 0.06, gx + 0.04, y + 0.13, z + 0.06, F(h), J);
    }
    for (let k = 0; k < 4; k++) b.box(x - 0.7 + k * 0.36, y, z - 0.3, x - 0.4 + k * 0.36, y + 0.14, z - 0.12, F(pick([0xc96a3a, 0x4a6a8a, 0xb0a890, 0x6a6a6a], k)), J);
  },
  herramientas(b, x, y, z) {
    for (let k = 0; k < 4; k++) {                                    // hammers and wrenches
      const gx = x - 0.6 + k * 0.26;
      b.box(gx - 0.015, y, z - 0.2, gx + 0.015, y + 0.03, z + 0.16, F(0xb0834a), J);
      b.box(gx - 0.075, y, z + 0.13, gx + 0.075, y + 0.055, z + 0.19, Finish.metal(0x5a5e64), J);
    }
    b.box(x + 0.4, y, z - 0.18, x + 0.75, y + 0.2, z + 0.18, F(0xc0342a), J);
    b.box(x + 0.5, y + 0.2, z - 0.02, x + 0.65, y + 0.26, z + 0.02, F(0x222222), J);
    b.box(x + 0.395, y + 0.12, z - 0.185, x + 0.755, y + 0.135, z + 0.185, F(0x222222), J);
  },
  // conchas with their striped tops, long bolillos, horns on a rack
  pan(b, x, y, z, s) {
    for (let t = 0; t < 2; t++) {
      const tx = x - 0.4 + t * 0.8;
      b.orientedBox([tx, y + 0.05, z], [0.72, 0.03, 0.58], { x: s * 0.18 }, Finish.metal(0xc8c4b8), J);
      for (let i = 0; i < 12; i++) {
        const gx = tx - 0.26 + (i % 4) * 0.173, gz = z - 0.18 + Math.floor(i / 4) * 0.18, gy = y + 0.075 - s * (gz - z) * 0.18;
        if (t === 0) {
          const d = new THREE.SphereGeometry(0.076, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 0.72, 1); d.translate(gx, gy, gz); b.add(d, F(0xc98a4a, 0.04), J);
          const c = pick([0xf4a6bd, 0xfff0cf, 0x7a4a30], i);
          for (const o of [-0.036, 0, 0.036]) b.box(gx + o - 0.011, gy + 0.03, gz - 0.056 + Math.abs(o) * 0.5, gx + o + 0.011, gy + 0.062 - Math.abs(o) * 0.35, gz + 0.056 - Math.abs(o) * 0.5, F(c, 0), J);
        } else {
          const d = new THREE.SphereGeometry(0.06, 8, 5); d.scale(0.95, 0.75, 1.5); d.translate(gx, gy + 0.03, gz); b.add(d, F(i % 3 ? 0xd9a055 : 0xc07f3c, 0.05), J);
          b.box(gx - 0.008, gy + 0.066, gz - 0.05, gx + 0.008, gy + 0.08, gz + 0.05, F(0xf0d8a8, 0), J);
        }
      }
    }
    const bk = new THREE.CylinderGeometry(0.22, 0.17, 0.2, 10); bk.translate(x - 1.05, 0.45, z); b.add(bk, F(0xb0834a), J);
    b.box(x - 1.22, 0.12, z - 0.16, x - 0.88, 0.36, z + 0.16, F(0x8a6a40), J);
    for (let i = 0; i < 6; i++) { const g = new THREE.CapsuleGeometry(0.035, 0.28, 2, 6); g.rotateX(0.3 * Math.sin(i * 2)); g.rotateZ(0.35 * Math.cos(i * 2)); g.translate(x - 1.05 + Math.cos(i) * 0.1, 0.66, z + Math.sin(i) * 0.1); b.add(g, F(0xd9a055), J); }
  },
  plantas(b, x, y, z) {
    for (let k = 0; k < 5; k++) {
      const gx = x - 0.62 + k * 0.31, gz = z + (k % 2 ? 0.1 : -0.08);
      b.cylinder([gx, y + 0.07, gz], 0.08, 0.06, 0.14, F(0xb0583a), { radial: 8 });
      if (k % 2) { b.cylinder([gx, y + 0.28, gz], 0.06, 0.07, 0.28, F(0x4f8a4a), { radial: 7 }); b.cylinder([gx + 0.09, y + 0.3, gz], 0.03, 0.035, 0.14, F(0x4f8a4a), { radial: 6 }); const fl = new THREE.IcosahedronGeometry(0.035, 0); fl.translate(gx, y + 0.45, gz); b.add(fl, F(0xe0506a), J); }
      else for (let l = 0; l < 6; l++) { const g = new THREE.ConeGeometry(0.035, 0.3, 4); g.rotateX(0.5 * Math.cos(l * 1.05)); g.rotateZ(0.5 * Math.sin(l * 1.05)); g.translate(gx - Math.sin(l * 1.05) * 0.08, y + 0.26, gz + Math.cos(l * 1.05) * 0.08); b.add(g, F(0x5a9a4a, 0.1), J); }
    }
  },
  juguetes(b, x, y, z) {
    for (let k = 0; k < 3; k++) { const g = new THREE.IcosahedronGeometry(0.1, 2); g.translate(x - 0.6 + k * 0.23, y + 0.1, z - 0.12); b.add(g, F(pick([0xe0402e, 0x2f7ad0, 0xf0c030], k), 0), J); }
    for (let k = 0; k < 4; k++) {                                    // toy cars
      const gx = x - 0.55 + k * 0.28, h = pick([0xe0402e, 0x2f9a4a, 0x2f5ad0, 0xf0902a], k);
      b.box(gx - 0.1, y + 0.03, z + 0.1, gx + 0.1, y + 0.08, z + 0.2, F(h, 0), J); b.box(gx - 0.05, y + 0.08, z + 0.11, gx + 0.05, y + 0.12, z + 0.19, F(0xcfe4f0, 0), J);
      for (const ox of [-0.06, 0.06]) b.cylinder([gx + ox, y + 0.03, z + 0.15], 0.028, 0.028, 0.12, F(0x1a1a1a, 0), { rotX: Math.PI / 2, radial: 8 });
    }
    const t = new THREE.IcosahedronGeometry(0.1, 1); t.translate(x + 0.55, y + 0.12, z - 0.08); b.add(t, F(0xb0834a), J);   // a bear
    const h = new THREE.IcosahedronGeometry(0.08, 1); h.translate(x + 0.55, y + 0.27, z - 0.08); b.add(h, F(0xb0834a), J);
    for (const s of [-1, 1]) { const e = new THREE.IcosahedronGeometry(0.03, 0); e.translate(x + 0.55 + s * 0.065, y + 0.34, z - 0.08); b.add(e, F(0x8a6232), J); }
  },
  cobijas(b, x, y, z) {
    for (let k = 0; k < 4; k++) for (let n = 0; n < 2; n++) b.cylinder([x - 0.54 + k * 0.36, y + 0.12 + n * 0.22, z], 0.115, 0.115, 0.6, F(pick([0xa03a5a, 0x3a6a8a, 0xc08a3a, 0x5a7a4a, 0x7a4a8a], k + n * 2)), { rotX: Math.PI / 2, radial: 10 });
  },
  ollas(b, x, y, z) {
    for (let k = 0; k < 4; k++) {
      const gx = x - 0.56 + k * 0.37, r = 0.15 - k * 0.018, h = pick([0x2f5a8a, 0xb8bcc0, 0xa8382e, 0xb8bcc0], k);
      b.cylinder([gx, y + r * 0.7, z], r, r * 0.95, r * 1.4, F(h), { radial: 12 });
      b.cylinder([gx, y + r * 1.4 + 0.012, z], r * 1.03, r * 1.03, 0.02, F(0xd0d4d6), { radial: 12 }); b.cylinder([gx, y + r * 1.4 + 0.04, z], 0.02, 0.02, 0.04, F(0x222222), { radial: 6 });
      for (const s of [-1, 1]) b.box(gx + s * r - 0.03, y + r, z - 0.04, gx + s * r + 0.03, y + r + 0.02, z + 0.04, F(0x222222), J);
    }
  },
};

export function stallGoods(b, i, x, y, z, side) { MAKE[STALL_KIND[i % STALL_KIND.length]](b, x, y, z, side); }

// a hand-painted sign, drawn on a canvas
export function sign(text, bg, fg, w, h) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = fg; g.lineWidth = 12; g.strokeRect(14, 14, c.width - 28, c.height - 28);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = c.height * 0.62; g.font = `900 ${s}px "Arial Black", Impact, sans-serif`;
  while (g.measureText(text).width > c.width - 70) { s -= 4; g.font = `900 ${s}px "Arial Black", Impact, sans-serif`; }
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 }));
  return m;
}
