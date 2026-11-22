// What you see from the roofs: hills packed with box houses (the rest of the city, kept
// deliberately crude, like distant game geometry), the border wall on the ridge to the
// north with its floodlights, and a corner of ocean to the west where the wall runs into it.

import * as THREE from 'three';
import { fbm3, rng } from '../utils/Math.js';
import { dotTexture } from '../rendering/Paint.js';

const OCEAN_X = -50;                     // shoreline (west)
const WALL_Z = -95;                      // border wall (north)

export function hillHeight(x, z) {
  const base = Math.max(0, Math.hypot(x / 1.4, (z - 8) / 1.2) - 22);       // flat around the street
  let h = base * 0.14 + fbm3(x * 0.02, 0, z * 0.02, 3) * 8 * Math.min(1, base / 30);
  // north: the land drops into a valley, then rises to the ridge where the wall runs
  if (z < -14) h = h * 0.3 - Math.min(9, (-14 - z) * 0.2) + Math.max(0, 1 - Math.abs(z - WALL_Z) / 22) * 13;
  // west: falls away to the sea
  if (x < -26) h = h * Math.max(0, (x - OCEAN_X) / 24) - Math.min(3, (-26 - x) * 0.12);
  return Math.max(h, -9);
}

export function buildDistant(scene, materials) {
  const group = new THREE.Group();
  group.name = 'distant';
  const r = rng(77);

  // hills
  const g = new THREE.PlaneGeometry(420, 420, 70, 70);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, 8);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color(), a = new THREE.Color(0x9a8a71), b = new THREE.Color(0x8c8a6a);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, hillHeight(x, z) - 0.05);
    c.copy(a).lerp(b, Math.max(0, fbm3(x * 0.05, 1, z * 0.05)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const hills = new THREE.Mesh(g, materials.ground);
  hills.receiveShadow = true;
  group.add(hills);

  // city: instanced boxes on the hills (not on the street, not past the wall, not in the sea)
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const N = 1400;
  const inst = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 1 }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const pal = [0xc28b70, 0xd2b46e, 0x9cb7b0, 0xc7a3b8, 0xe0cfa8, 0xb7bda6, 0x8e8b84, 0xd8cfbf, 0xb38f7c];
  const lights = [];
  let k = 0, tries = 0;
  while (k < N && tries < 20000) {
    tries++;
    const x = (r() - 0.5) * 360, z = 8 + (r() - 0.5) * 360;
    if (Math.abs(x) < 26 && z > -14 && z < 30) continue;
    if (x < -30 || z < WALL_Z + 6) continue;        // keep the view west to the sea open
    const far = Math.hypot(x, z - 8) > 70;
    const w = 4 + r() * 5, d = 4 + r() * 5, h = 2.7 * (1 + Math.floor(r() * (far ? 3 : 2)));
    const y = hillHeight(x, z);
    m4.compose(v.set(x, y - 0.5, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.round(r() * 3) * Math.PI / 2 + (r() - 0.5) * 0.2), s.set(w, h + 0.5, d));
    inst.setMatrixAt(k, m4);
    inst.setColorAt(k, c.set(pal[Math.floor(r() * pal.length)]));
    if (r() < 0.45) lights.push(x + (r() - 0.5) * w, y + h * 0.6, z + (r() - 0.5) * d);
    k++;
  }
  inst.count = k;
  group.add(inst);

  // ocean, and a pale band of surf along the shore
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(600, 900), new THREE.MeshStandardMaterial({ color: 0x3f86a6, roughness: 0.2, metalness: 0.25 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(OCEAN_X - 300, -2.4, 0);
  group.add(ocean);

  // border wall: rust bollards along the ridge, running into the ocean
  const posts = [];
  for (let x = OCEAN_X - 60; x < 200; x += 0.7) posts.push(x);
  const post = new THREE.BoxGeometry(0.3, 1, 0.3); post.translate(0, 0.5, 0);
  const wall = new THREE.InstancedMesh(post, new THREE.MeshStandardMaterial({ color: 0x6b4433, roughness: 0.9 }), posts.length);
  posts.forEach((x, i) => {
    const y = x < OCEAN_X ? -2.4 : hillHeight(x, WALL_Z);
    m4.compose(v.set(x, y - 0.5, WALL_Z + x * 0.04), q.identity(), s.set(1, x < OCEAN_X ? 6.5 : 9.5, 1));
    wall.setMatrixAt(i, m4);
  });
  group.add(wall);

  // floodlights along the wall and city lights: point sprites that only show at night
  const flood = [];
  for (let x = OCEAN_X; x < 200; x += 22) flood.push(x, hillHeight(x, WALL_Z) + 12, WALL_Z + x * 0.04 - 4);
  const mk = (arr, color, size) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ map: dotTexture(), color, size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const pts = new THREE.Points(geo, mat);
    group.add(pts);
    return mat;
  };
  const floodMat = mk(flood, 0xdfeaff, 6);
  const cityMat = mk(lights, 0xffc27a, 1.6);

  scene.add(group);
  return {
    group,
    update(night) { floodMat.opacity = Math.max(0, night * 1.2 - 0.2); cityMat.opacity = Math.max(0, night - 0.1); },
  };
}
