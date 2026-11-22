// Shared materials: matte, hand-painted strokes (Paint.js). `color(hex, kind)` returns a
// cached flat-coloured material, so low-poly models need no textures of their own.

import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { strokeTexture, applyPaint } from './Paint.js';

export class Materials {
  constructor() {
    const P = Config.paint;
    this.textures = {
      wall: strokeTexture({ seed: 3, strokes: 120, width: [0.08, 0.22], length: [0.3, 0.8], angle: 0, angleJitter: 0.12, contrast: 0.16 }),
      fur: strokeTexture({ seed: 7, strokes: 220, width: [0.03, 0.08], length: [0.12, 0.35], angle: 0.4, angleJitter: 0.6, contrast: 0.3, flecks: 120 }),
      cloth: strokeTexture({ seed: 11, strokes: 160, width: [0.05, 0.14], length: [0.2, 0.5], angle: 1.4, angleJitter: 0.5, contrast: 0.18 }),
      ground: strokeTexture({ seed: 19, strokes: 160, width: [0.06, 0.2], length: [0.2, 0.6], angle: 0.2, angleJitter: 1.2, contrast: 0.14, flecks: 400 }),
    };
    const T = this.textures;
    this._cache = new Map();
    // one shared material for baked figures and props
    this.figure = applyPaint(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }), { map: T.cloth, ...P.cloth, key: 'p-figure' });

    // the three people who matter have a warm light on their outline, so they stand out in a crowd
    this.figureKey = applyPaint(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { map: T.cloth, ...P.cloth, key: 'p-figure-key' });
    const paintKey = this.figureKey.onBeforeCompile;
    this.figureKey.onBeforeCompile = (sh, r) => {
      paintKey(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.2);
          totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * rim * 0.55 + diffuseColor.rgb * 0.12; }`);
    };
    this.figureKey.customProgramCacheKey = () => 'p-figure-key';

    this.construction = applyPaint(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }), { map: T.wall, ...P.wall, key: 'p-wall' });
    this.metal = applyPaint(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.15 }), { map: T.wall, ...P.metal, key: 'p-metal' });
    // window glass glows warm at night (emissive driven by Lighting)
    this.glass = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.1, emissive: 0xffb15a, emissiveIntensity: 0 });
    this.ground = applyPaint(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { map: T.ground, ...P.ground, key: 'p-ground' });

    this.catCoat = applyPaint(new THREE.MeshPhysicalMaterial({
      color: 0x141312, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color(0x4d4a47), sheenRoughness: 0.5,
    }), { map: T.fur, ...P.fur, key: 'p-fur' });
    // a faint rim of light on the silhouette so the black cat reads from behind (not a glow)
    const paintFur = this.catCoat.onBeforeCompile;
    this.catRim = { value: 0.16 };
    this.catCoat.onBeforeCompile = (sh, r) => {
      paintFur(sh, r);
      sh.uniforms.uRim = this.catRim;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uRim;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0);
            totalEmissiveRadiance += vec3(0.72, 0.68, 0.62) * rim * uRim; }`);
    };
    this.catCoat.customProgramCacheKey = () => 'p-fur-rim';
    this.catEye = new THREE.MeshStandardMaterial({ color: 0xd7a336, roughness: 0.25, emissive: 0xd7a336, emissiveIntensity: 0.25 });
    this.dark = new THREE.MeshStandardMaterial({ color: 0x080706, roughness: 0.4 });
    this.glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.lamp = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
    this.scent = new THREE.PointsMaterial({ color: 0xffe7a8, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  }

  // flat colour, painted. kind: 'cloth' | 'wall' | 'skin'
  color(hex, kind = 'cloth') {
    const key = hex + kind;
    if (!this._cache.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color: hex, roughness: kind === 'skin' ? 0.8 : 0.95 });
      const map = kind === 'wall' ? this.textures.wall : this.textures.cloth;
      this._cache.set(key, applyPaint(m, { map, ...(kind === 'wall' ? Config.paint.wall : Config.paint.cloth), key: 'p-' + kind }));
    }
    return this._cache.get(key);
  }

  // small found objects catch the light
  shiny(hex) {
    const key = 'shiny' + hex;
    if (!this._cache.has(key)) this._cache.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.25, metalness: 0.6, emissive: hex, emissiveIntensity: 0.25 }));
    return this._cache.get(key);
  }

  dispose() {
    for (const m of Object.values(this)) if (m && m.isMaterial) m.dispose();
    for (const m of this._cache.values()) m.dispose();
    for (const t of Object.values(this.textures)) t.dispose();
  }
}
