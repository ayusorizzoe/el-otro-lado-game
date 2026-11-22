// WebGL renderer with a light bloom pass for glare (sun, lamps, lit windows).

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Config } from '../core/Config.js';

export class Renderer {
  constructor(container) {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, Config.render.maxPixelRatio));
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = Config.render.exposure;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(r.domElement);
    this.three = r;
    this.domElement = r.domElement;
    this.onResize = null;
    this._resize = () => {
      r.setSize(window.innerWidth, window.innerHeight);
      if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
      if (this.onResize) this.onResize(window.innerWidth / window.innerHeight);
    };
    window.addEventListener('resize', this._resize);
  }

  get aspect() { return window.innerWidth / window.innerHeight; }

  setup(scene, camera) {
    const B = Config.render.bloom;
    this.composer = new EffectComposer(this.three);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), B.strength, B.radius, B.threshold);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setLoop(fn) { this.three.setAnimationLoop(fn); }
  render() { this.composer.render(); }

  dispose() {
    window.removeEventListener('resize', this._resize);
    this.three.dispose();
    this.domElement.remove();
  }
}
