// Central configuration. World units are metres.

export const Config = {
  render: {
    maxPixelRatio: 1.5,
    exposure: 1.2,
    shadowMapSize: 2048,
    shadowExtent: 16,
    bloom: { strength: 0.35, radius: 0.6, threshold: 0.82 },
  },

  cat: {
    radius: 0.16,
    height: 0.3,
    walk: 1.6,
    run: 3.6,
    starving: 1.0,
    jump: 7.2,               // vertical speed: about 1.3 m high
    gravity: 20,
    step: 0.3,
    sitDelay: 1.2,
    interact: 1.1,
  },

  camera: {
    fov: 50, near: 0.05, far: 300,
    distance: 2.6, minDistance: 1.0, maxDistance: 6,
    pitch: 0.38, minPitch: -0.05, maxPitch: 1.2,
    targetHeight: 0.45,
  },

  scent: { duration: 6, cooldown: 1.5 },

  street: { minX: -27.2, maxX: 24.8, minZ: -8.3, maxZ: 23 },

  paint: {
    fur: { scale: 13, strength: 0.4 },
    cloth: { scale: 5, strength: 0.3 },
    wall: { scale: 0.8, strength: 0.22 },
    metal: { scale: 3, strength: 0.18 },
    ground: { scale: 0.45, strength: 0.25 },
  },
};
