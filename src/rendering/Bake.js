// Merges the meshes that sit directly in a group into one vertex-coloured mesh, so a person
// or a prop costs a few draw calls instead of dozens. Pivots (sub-groups) stay animatable.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function bakeGroup(group, material, { recursive = true, shadow = true } = {}) {
  const parts = [];
  for (const child of group.children.slice()) {
    if (child.isMesh && !child.children.length && child.material.color) {
      child.updateMatrix();
      let g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      g.applyMatrix4(child.matrix);
      for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
      const c = child.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      parts.push(g);
      group.remove(child);
    } else if (recursive && child.isGroup) bakeGroup(child, material, { recursive, shadow });
  }
  if (!parts.length) return;
  const m = new THREE.Mesh(mergeGeometries(parts, false), material);
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
}
