// Day/night lighting: a sun that crosses the sky and sets low and warm, a hazy sky dome,
// a moon at night, warm lamps and windows. update(hour) drives everything.

import * as THREE from 'three';
import { Config } from '../core/Config.js';

// hour, sun colour, sun intensity, sky top, horizon/fog, hemi sky, hemi ground, hemi intensity, night
const K = [
  [0, 0x8fa4d8, 0.6, 0x0b1024, 0x1c2234, 0x46588a, 0x26242e, 1.0, 1],
  [5, 0x8fa4d8, 0.6, 0x0d1228, 0x20263a, 0x46588a, 0x26242e, 1.0, 1],
  [6.2, 0xff9a6a, 0.8, 0x3a4a6a, 0x9a8a8a, 0x8a8aa0, 0x4a3a30, 1.2, 0.6],
  [7.5, 0xffc89a, 2.0, 0x7a98b8, 0xd8c4b0, 0xb8c0cc, 0x7a6a5a, 2.0, 0.1],
  [10, 0xfff2e0, 2.8, 0x8fb0c8, 0xd2d4cc, 0xc8d4dc, 0x9a8a74, 1.35, 0],
  [16.5, 0xffe6c4, 2.7, 0x8eaac4, 0xdcd2c2, 0xc8d4dc, 0x9a8a74, 1.05, 0],
  [17.6, 0xffcf96, 2.65, 0x88a0bc, 0xe2c8aa, 0xc8c4bc, 0x8e7460, 1.03, 0.03],
  [18.3, 0xffa860, 2.5, 0x7a88b0, 0xe8b894, 0xc8b8b4, 0x8a6a5a, 1.0, 0.12],
  [18.8, 0xff9050, 2.1, 0x62709e, 0xd89a7e, 0xb0a0ac, 0x6e5650, 0.95, 0.28],
  [19.3, 0xff7a48, 1.6, 0x4a4a78, 0xc8826e, 0x9a8aa8, 0x5a4444, 0.9, 0.45],
  [20.3, 0x8fa4d8, 0.55, 0x141a34, 0x3a3450, 0x4a5488, 0x26242e, 0.95, 0.9],
  [21.5, 0x8fa4d8, 0.6, 0x0b1024, 0x1c2234, 0x46588a, 0x26242e, 1.0, 1],
  [24, 0x8fa4d8, 0.6, 0x0b1024, 0x1c2234, 0x46588a, 0x26242e, 1.0, 1],
];
const ca = new THREE.Color(), cb = new THREE.Color();
const mix = (a, b, t, out) => out.copy(ca.set(a)).lerp(cb.set(b), t);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Lighting {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    this.hemi = new THREE.HemisphereLight(0xc8d4dc, 0x9a8a74, 1.1);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.castShadow = true;
    const S = Config.render.shadowExtent;
    sun.shadow.mapSize.set(Config.render.shadowMapSize, Config.render.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 90 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 2;
    this.sun = sun;
    scene.add(sun, sun.target);
    scene.fog = new THREE.FogExp2(0xd2d4cc, 0.009);

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() },
        sunCol: { value: new THREE.Color() }, sunAmt: { value: 1 }, uTime: { value: 0 }, cloudLight: { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt; uniform float uTime; uniform vec3 cloudLight; varying vec3 vDir;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0.0, w = 0.5; for (int i = 0; i < 5; i++){ a += w * vn(p); p = p * 2.03 + 7.1; w *= 0.5; } return a; }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.55));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.4 + pow(s, 3.0) * 0.08) * sunAmt;
          // soft, irregular clouds drifting slowly with the wind
          if (d.y > 0.0) {
            vec2 uv = d.xz / (d.y + 0.12) * 0.9 + vec2(uTime * 0.004, uTime * 0.0015);
            float n = fbm(uv * 1.3) * 0.7 + fbm(uv * 3.1 + 3.0) * 0.3;
            float dens = smoothstep(0.48, 0.78, n) * smoothstep(0.0, 0.22, d.y);
            vec3 cc = mix(horizon * 1.08, cloudLight, 0.55) + sunCol * pow(s, 6.0) * 0.35 * sunAmt;
            c = mix(c, cc, dens * 0.85);
          }
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(280, 20, 10), this.skyMat);
    scene.add(this.sky);

    // street and stand lights
    this.points = [];
    this.night = 0;
    this._dir = new THREE.Vector3();
    this._moon = new THREE.Vector3(-0.3, 0.85, 0.4).normalize();
  }

  addLamp(pos, color = 0xffb36a, intensity = 14, distance = 12, hours = [18.5, 30]) {
    const l = new THREE.PointLight(color, 0, distance, 1.6);
    l.position.copy(pos);
    this.scene.add(l);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), this.materials.lamp);
    bulb.position.copy(pos);
    this.scene.add(bulb);
    this.points.push({ l, bulb, intensity, hours });
  }

  update(hour, focus, camera) {
    const h = ((hour % 24) + 24) % 24;
    let i = 0;
    while (i < K.length - 2 && K[i + 1][0] <= h) i++;
    const a = K[i], b = K[i + 1];
    const t = sm(0, 1, (h - a[0]) / (b[0] - a[0]));
    mix(a[1], b[1], t, this.sun.color);
    this.sun.intensity = a[2] + (b[2] - a[2]) * t;
    mix(a[3], b[3], t, this.skyMat.uniforms.top.value);
    mix(a[4], b[4], t, this.scene.fog.color);
    this.skyMat.uniforms.horizon.value.copy(this.scene.fog.color);
    mix(a[5], b[5], t, this.hemi.color);
    mix(a[6], b[6], t, this.hemi.groundColor);
    this.hemi.intensity = a[7] + (b[7] - a[7]) * t;
    const night = a[8] + (b[8] - a[8]) * t;
    this.night = night;
    this.scene.fog.density = 0.009 - night * 0.003;

    // the sun rises over the hills (east, +x) and sets over the ocean (west, -x), low across the street
    const ang = ((h - 6) / 12) * Math.PI;
    const sunDir = this._dir.set(Math.cos(ang), Math.max(0.05, Math.sin(ang)) * 0.75, 0.55).normalize();
    this.skyMat.uniforms.sunDir.value.copy(sunDir);
    this.skyMat.uniforms.sunCol.value.copy(this.sun.color);
    const moonW = Math.max(sm(19.6, 20.4, h), 1 - sm(5.2, 6.2, h));
    this.skyMat.uniforms.sunAmt.value = 1 - moonW;
    const dir = sunDir.clone().lerp(this._moon, moonW).normalize();
    this.sun.target.position.set(Math.round(focus.x), 0, Math.round(focus.z));
    this.sun.position.copy(this.sun.target.position).addScaledVector(dir, 40);
    this.sun.target.updateMatrixWorld();
    this.sky.position.copy(camera.position);
    this.skyMat.uniforms.uTime.value = performance.now() / 1000;
    this.skyMat.uniforms.cloudLight.value.copy(this.hemi.color).multiplyScalar(1.1 - night * 0.75);

    const on = (hrs) => (h >= hrs[0] && h < hrs[1]) || (h + 24 >= hrs[0] && h + 24 < hrs[1]);
    for (const p of this.points) {
      const lit = on(p.hours);
      p.l.intensity = lit ? p.intensity * night : 0;
      p.bulb.visible = lit && night > 0.2;
    }
    this.materials.glass.emissiveIntensity = night * 0.9;
  }
}
