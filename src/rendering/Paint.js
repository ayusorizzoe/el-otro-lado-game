// Hand-painted surface look, generated in code.
//
// strokeTexture() paints a tileable greyscale canvas of flat, dry-edged brush strokes
// (modelled on the props' textures: broad strokes of close values, ragged ends,
// small light flecks). applyPaint() makes a material sample it triplanar in the
// mesh's own rest-pose space, so the strokes stick to skinned characters and need
// no UVs. The texture only modulates the base colour, keeping everything matte.

import * as THREE from 'three';
import { rng } from '../utils/Math.js';

export function strokeTexture(o = {}) {
  const size = o.size ?? 512;
  const r = rng(o.seed ?? 1);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, size, size);

  const strokes = o.strokes ?? 140;
  const [wMin, wMax] = o.width ?? [0.06, 0.18];          // stroke width, fraction of tile
  const [lMin, lMax] = o.length ?? [0.25, 0.7];          // stroke length, fraction of tile
  const angle = o.angle ?? 0;                            // dominant direction (radians)
  const jitter = o.angleJitter ?? 0.25;
  const contrast = o.contrast ?? 0.22;                   // value spread around mid grey

  const drawWrapped = (fn) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { g.save(); g.translate(ox, oy); fn(); g.restore(); }
  };

  for (let s = 0; s < strokes; s++) {
    const x = r() * size, y = r() * size;
    const w = (wMin + r() * (wMax - wMin)) * size;
    const l = (lMin + r() * (lMax - lMin)) * size;
    const a = angle + (r() - 0.5) * 2 * jitter;
    const v = Math.round(128 + (r() - 0.5) * 2 * contrast * 255);
    const lines = Math.max(6, Math.round(w / 1.6));
    const alpha = 0.35 + r() * 0.4;
    drawWrapped(() => {
      g.translate(x, y);
      g.rotate(a);
      // a flat brush: many parallel bristle lines, each with a ragged start and end
      for (let i = 0; i < lines; i++) {
        const off = (i / lines - 0.5) * w;
        const s0 = -l / 2 + r() * l * 0.12, s1 = l / 2 - r() * l * 0.18;
        const vv = Math.max(0, Math.min(255, v + Math.round((r() - 0.5) * 10)));
        g.strokeStyle = `rgba(${vv},${vv},${vv},${alpha * (0.7 + r() * 0.3)})`;
        g.lineWidth = 1.6 + r() * 1.2;
        g.beginPath();
        g.moveTo(s0, off + (r() - 0.5) * 0.8);
        g.lineTo(s1, off + (r() - 0.5) * 0.8);
        g.stroke();
      }
    });
  }
  // dry-brush flecks
  const flecks = o.flecks ?? 260;
  for (let i = 0; i < flecks; i++) {
    const x = r() * size, y = r() * size, rad = 0.6 + r() * 1.6;
    const v = r() < 0.7 ? 200 : 70;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`;
    drawWrapped(() => { g.beginPath(); g.ellipse(x, y, rad * 2.2, rad, angle, 0, Math.PI * 2); g.fill(); });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;           // data, not colour
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Adds triplanar painted strokes to a MeshStandard/Physical material.
 *  map: stroke texture, scale: tiles per metre, strength: how much the strokes shift value
 */
export function applyPaint(material, { map, scale = 1, strength = 0.3, key = 'paint' }) {
  const uniforms = {
    uPaintMap: { value: map },
    uPaintScale: { value: scale },
    uPaintStrength: { value: strength },
  };
  material.userData.paint = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaintPos;\nvarying vec3 vPaintN;\nuniform float uPaintScale;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPos = position * uPaintScale;\nvPaintN = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaintPos;\nvarying vec3 vPaintN;\nuniform sampler2D uPaintMap;\nuniform float uPaintStrength;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 w = pow(abs(normalize(vPaintN)), vec3(4.0));
          w /= (w.x + w.y + w.z);
          float t = texture2D(uPaintMap, vPaintPos.zy).r * w.x
                  + texture2D(uPaintMap, vPaintPos.xz).r * w.y
                  + texture2D(uPaintMap, vPaintPos.xy).r * w.z;
          diffuseColor.rgb *= 1.0 + (t - 0.5) * 2.0 * uPaintStrength;
        }`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}

// a soft round dot for point sprites (lights, dust, scent)
let _dot = null;
export function dotTexture() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}
