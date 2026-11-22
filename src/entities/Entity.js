// Base class for things placed in the world. Visual construction lives in subclasses;
// behaviour (movement, animation, interaction) will be attached by separate systems later.

import * as THREE from 'three';

export class Entity {
  constructor(name = 'entity') {
    this.name = name;
    this.object3d = new THREE.Group();
    this.object3d.name = name;
  }

  setPosition(x, y, z) { this.object3d.position.set(x, y, z); return this; }
  setRotationY(r) { this.object3d.rotation.y = r; return this; }

  update(/* dt, time */) {}

  // geometries are owned by the entity; shared materials are disposed by Materials
  dispose() {
    this.object3d.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.object3d.removeFromParent();
  }
}
