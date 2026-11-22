// Third-person follow camera behind and above the cat. Drag to orbit, wheel to zoom.
// Pulls in when a wall is between the camera and the cat.

import * as THREE from 'three';
import { Config } from '../core/Config.js';

const C = Config.camera;
const _g = new THREE.Vector3();

export class CameraController {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(C.fov, aspect, C.near, C.far);
    this.yaw = Math.PI;       // behind a cat facing -z... set by the game at start
    this.pitch = C.pitch;
    this.dist = C.distance;
    this.target = new THREE.Vector3();
    this.blockers = [];
    this._ray = new THREE.Raycaster();
    this._dir = new THREE.Vector3();
    this._cur = C.distance;
  }

  setAspect(a) { this.camera.aspect = a; this.camera.updateProjectionMatrix(); }

  // attend: a point to lean toward (people being listened to), or null
  update(dt, input, focus, attend = null, wide = false) {
    this.yaw -= input.mouseDX * 0.005;
    this.pitch = Math.max(C.minPitch, Math.min(C.maxPitch, this.pitch + input.mouseDY * 0.004));
    if (input.down('KeyQ') === false) {
      if (input.down('KeyZ')) this.yaw += dt * 1.8;
      if (input.down('KeyC')) this.yaw -= dt * 1.8;
    }
    this.dist = Math.max(C.minDistance, Math.min(C.maxDistance, this.dist + input.wheel * 0.003));
    this.lean = (this.lean || 0) + ((attend ? 1 : 0) - (this.lean || 0)) * (1 - Math.exp(-1.6 * dt));
    if (attend) (this.point = this.point || new THREE.Vector3()).lerp(_g.set(attend.x, focus.y + 1.15, attend.z), this.lean < 0.05 ? 1 : 1 - Math.exp(-3 * dt));
    const goal = _g.set(focus.x, focus.y + C.targetHeight, focus.z);
    if (this.point) goal.lerp(this.point, 0.36 * this.lean);
    this.target.lerp(goal, 1 - Math.exp(-10 * dt));
    const cp = Math.cos(this.pitch);
    this._dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    this.wide = (this.wide || 0) + ((wide ? 1 : 0) - (this.wide || 0)) * (1 - Math.exp(-2 * dt));
    // pull in in front of walls
    const want = this.dist * (1 + 0.35 * this.lean + 0.5 * this.wide); // step back a little to fit the people in
    let d = want;
    if (this.blockers.length) {
      this._ray.set(this.target, this._dir);
      this._ray.far = want;
      const hit = this._ray.intersectObjects(this.blockers, false)[0];
      if (hit) d = Math.max(0.35, hit.distance - 0.15);
    }
    this._cur += (d - this._cur) * Math.min(1, (d < this._cur ? 20 : 4) * dt);
    this.camera.position.copy(this.target).addScaledVector(this._dir, this._cur);
    this.camera.lookAt(this.target);
  }
}
