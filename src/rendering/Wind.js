// One shared wind for the whole neighbourhood. Its strength drifts slowly, so tarps,
// cables, paper and dust all respond to the same gusts. Geometry that sways carries an
// `aSway` attribute (0 = fixed, 1 = free end) and uses a material made by windMaterial().

import * as THREE from 'three';

export const wind = {
  dir: new THREE.Vector3(1, 0, 0.35).normalize(),
  strength: 0.5,
  t: 0,
  uniforms: { uTime: { value: 0 }, uWind: { value: new THREE.Vector3(1, 0, 0.35).normalize() }, uStrength: { value: 0.5 } },
  update(dt) {
    this.t += dt;
    const t = this.t;
    // slow fluctuation with occasional gusts
    this.strength = 0.35 + 0.22 * Math.sin(t * 0.11) + 0.12 * Math.sin(t * 0.37 + 1.3) + 0.18 * Math.max(0, Math.sin(t * 0.23 + 0.5)) ** 6;
    const a = 0.33 + Math.sin(t * 0.05) * 0.2;
    this.dir.set(Math.cos(a), 0, Math.sin(a));
    this.uniforms.uTime.value = t;
    this.uniforms.uWind.value.copy(this.dir);
    this.uniforms.uStrength.value = this.strength;
  },
};

// amp: how far a fully free vertex moves (m) at full strength
export function windMaterial(base, amp = 0.15, key = 'wind') {
  base.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, wind.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aSway;
        uniform float uTime; uniform vec3 uWind; uniform float uStrength;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float ph = position.x * 0.45 + position.z * 0.3 + position.y * 0.2;
          float w = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 3.7 + ph * 2.3) * 0.3 + 0.5;
          transformed += uWind * (aSway * ${amp.toFixed(3)} * uStrength * w);
          transformed.y += aSway * ${(amp * 0.4).toFixed(3)} * uStrength * sin(uTime * 2.9 + ph * 1.7);
        }`);
  };
  base.customProgramCacheKey = () => key;
  return base;
}

// helpers to build swaying geometry with colour and aSway attributes
export function colorize(geo, hex, sway) {
  if (geo.index) geo = geo.toNonIndexed();
  const n = geo.attributes.position.count;
  const c = new THREE.Color(hex);
  const col = new Float32Array(n * 3), sw = new Float32Array(n);
  const p = geo.attributes.position;
  for (let i = 0; i < n; i++) {
    const k = 0.92 + Math.random() * 0.12;
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    sw[i] = typeof sway === 'function' ? sway(p.getX(i), p.getY(i), p.getZ(i)) : sway;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  return geo;
}
