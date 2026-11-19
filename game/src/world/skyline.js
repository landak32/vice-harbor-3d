// The horizon. A ring of dark tower silhouettes and a couple of low islands beyond the fog
// line, so no screenshot ever ends in empty sky. Unlit, and tinted with the fog colour.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBatch } from '../render/geoBuilder.js';
import { CFG } from '../config.js';

export function buildSkyline(scene, rng) {
  const b = new MeshBatch();
  const ring = (radius, count, hMin, hMax, wMin, wMax, col) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng.range(-0.03, 0.03);
      const r = radius + rng.range(-40, 40);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const w = rng.range(wMin, wMax), d = rng.range(wMin, wMax);
      const h = rng.range(hMin, hMax);
      b.box(x, h / 2, z, w, h, d, col, a);
      if (rng.chance(0.35)) b.box(x, h + h * 0.12, z, w * 0.5, h * 0.24, d * 0.5, col);
    }
  };
  ring(760, 54, 40, 190, 20, 52, 0x2a3446);
  ring(980, 40, 60, 240, 26, 60, 0x222b3b);

  // Low islands across the water.
  for (let i = 0; i < 5; i++) {
    const x = -700 + i * 330 + rng.range(-60, 60);
    const z = CFG.OCEAN_Z + rng.range(320, 620);
    b.cylinder(x, -4, z, rng.range(50, 110), rng.range(8, 22), 0x243043, 7, rng.range(20, 50));
  }

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const mesh = new THREE.Mesh(b.build(), mat);
  mesh.frustumCulled = false;
  mesh.name = 'skyline';
  scene.add(mesh);
  return { mesh, mat };
}
