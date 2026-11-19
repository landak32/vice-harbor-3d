// The road surface, the pavements and every painted line in the city. Roads are a single
// textured plane; lane dashes, crosswalks and curb edges are merged into one unlit mesh so
// they stay crisp at night.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG } from '../config.js';
import { MeshBatch } from '../render/geoBuilder.js';
import { roadCoord } from './cityGrid.js';

const WHITE = 0xdde4ea, YELLOW = 0xd8b04a, GREY = 0x9a9d9f, DARKGREY = 0x6f7376;

// Ground quads must wind so their normal points up; this helper keeps that straight.
export function groundQuad(b, x0, z0, x1, z1, y, color, uvScale = 0) {
  b.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], color, null, uvScale);
}

export function buildRoads(scene, mats, rng) {
  const group = new THREE.Group();
  group.name = 'roads';

  const apron = 30;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(CFG.CITY_W + apron * 2, CFG.CITY_W + apron * 2), mats.ground);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  plane.receiveShadow = true;
  group.add(plane);

  const walks = new MeshBatch();
  const solid = new MeshBatch();
  const marks = new MeshBatch();
  const R = CFG.ROAD_W / 2;

  // Pavements: a raised slab per block with a stone curb around it.
  for (let i = 0; i < CFG.BLOCKS; i++) {
    for (let j = 0; j < CFG.BLOCKS; j++) {
      const x0 = roadCoord(i) + R, x1 = roadCoord(i + 1) - R;
      const z0 = roadCoord(j) + R, z1 = roadCoord(j + 1) - R;
      groundQuad(walks, x0, z0, x1, z1, CFG.CURB_H, 0xffffff, 4);
      // curb faces
      solid.box((x0 + x1) / 2, CFG.CURB_H / 2, z0 + 0.12, x1 - x0, CFG.CURB_H, 0.26, GREY);
      solid.box((x0 + x1) / 2, CFG.CURB_H / 2, z1 - 0.12, x1 - x0, CFG.CURB_H, 0.26, GREY);
      solid.box(x0 + 0.12, CFG.CURB_H / 2, (z0 + z1) / 2, 0.26, CFG.CURB_H, z1 - z0, GREY);
      solid.box(x1 - 0.12, CFG.CURB_H / 2, (z0 + z1) / 2, 0.26, CFG.CURB_H, z1 - z0, GREY);
      // gutter strip of darker asphalt just off the curb
      groundQuad(marks, x0 - 0.5, z0 - 0.5, x1 + 0.5, z0 - 0.15, 0.012, 0x33363b);
      groundQuad(marks, x0 - 0.5, z1 + 0.15, x1 + 0.5, z1 + 0.5, 0.012, 0x33363b);
    }
  }

  const y = 0.03;
  // Lane markings: dashed centre line plus a solid edge line each side.
  for (let k = 0; k < 9; k++) {
    const c = roadCoord(k);
    for (let s = 0; s < 8; s++) {
      const a = roadCoord(s) + R + 1.6, b = roadCoord(s + 1) - R - 1.6;
      for (let x = a; x < b - 3; x += 8) {
        groundQuad(marks, x, c - 0.11, x + 3.6, c + 0.11, y, YELLOW);
        groundQuad(marks, c - 0.11, x, c + 0.11, x + 3.6, y, YELLOW);
      }
      for (const side of [-1, 1]) {
        groundQuad(marks, a, c + side * (R - 0.9) - 0.09, b, c + side * (R - 0.9) + 0.09, y, WHITE);
        groundQuad(marks, c + side * (R - 0.9) - 0.09, a, c + side * (R - 0.9) + 0.09, b, y, WHITE);
      }
    }
  }

  // Crosswalks and stop bars at every junction.
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const rx = roadCoord(i), rz = roadCoord(j);
      for (let s = 0; s < 9; s++) {
        const o = -7 + s * 1.65;
        // west + east crossings (stripes run along X, walkers move along Z)
        groundQuad(marks, rx - R - 3.4, rz + o, rx - R - 1.0, rz + o + 0.75, y, WHITE);
        groundQuad(marks, rx + R + 1.0, rz + o, rx + R + 3.4, rz + o + 0.75, y, WHITE);
        // north + south crossings (stripes run along Z)
        groundQuad(marks, rx + o, rz - R - 3.4, rx + o + 0.75, rz - R - 1.0, y, WHITE);
        groundQuad(marks, rx + o, rz + R + 1.0, rx + o + 0.75, rz + R + 3.4, y, WHITE);
      }
      // stop bars
      groundQuad(marks, rx - R - 4.6, rz - 0.2, rx - R - 4.0, rz - R + 0.4, y, WHITE);
      groundQuad(marks, rx + R + 4.0, rz + 0.2, rx + R + 4.6, rz + R - 0.4, y, WHITE);
    }
  }

  const walkMesh = new THREE.Mesh(walks.build(), mats.walk);
  walkMesh.receiveShadow = true;
  walkMesh.name = 'pavements';
  group.add(walkMesh);

  const solidMesh = new THREE.Mesh(solid.build(), mats.solid);
  solidMesh.receiveShadow = true;
  group.add(solidMesh);

  const markMesh = new THREE.Mesh(marks.build(), mats.markings);
  markMesh.name = 'markings';
  group.add(markMesh);

  scene.add(group);
  return { group, markMaterial: mats.markings, markMesh };
}
