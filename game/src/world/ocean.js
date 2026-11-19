// The sea at the south edge: a big scrolling plane, a foam line where it meets the sand,
// and a sun glitter band that the sky module tints with the hour.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG } from '../config.js';
import { MeshBatch } from '../render/geoBuilder.js';
import { groundQuad } from './roads.js';

export function buildOcean(scene, mats, rng) {
  const group = new THREE.Group();
  group.name = 'ocean';
  const W = 1800, D = 1200;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W, D, 1, 1), mats.waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.25, CFG.OCEAN_Z + D / 2 - 6);
  group.add(water);

  // Surf: a few long pale bands just off the sand.
  const foam = new MeshBatch();
  for (let i = 0; i < 34; i++) {
    const z = CFG.OCEAN_Z + rng.range(0.5, 9);
    const x = rng.range(-CFG.HALF - 90, CFG.HALF + 90);
    const w = rng.range(18, 70);
    groundQuad(foam, x, z, x + w, z + rng.range(0.5, 1.6), 0.02, 0xdfeef2);
  }
  const foamMesh = new THREE.Mesh(foam.build(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }));
  group.add(foamMesh);

  // Wet sand sheen along the waterline.
  const wet = new MeshBatch();
  groundQuad(wet, -CFG.CITY_W / 2 - 120, CFG.OCEAN_Z - 16, CFG.CITY_W / 2 + 120, CFG.OCEAN_Z + 2, 0.03, 0xb7a887);
  const wetMesh = new THREE.Mesh(wet.build(), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }));
  group.add(wetMesh);

  scene.add(group);
  return { group, water, foamMesh, waterMat: mats.waterMat };
}
