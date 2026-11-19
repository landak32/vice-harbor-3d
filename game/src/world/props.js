// Street furniture: lamp posts with cones of light, palms, benches, hydrants, bus stops,
// bins and traffic signals. Static pieces are merged; the repeating ones (palms, light cones,
// lamp halos) are instanced or drawn as one points cloud.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG } from '../config.js';
import { MeshBatch } from '../render/geoBuilder.js';
import { roadCoord, districtOf } from './cityGrid.js';
import { groundQuad } from './roads.js';

const METAL = 0x3c4249, CONCRETE = 0xa9a8a2;

function palmCrown(rng) {
  const b = new MeshBatch();
  const fronds = 9;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const len = rng.range(2.6, 3.6);
    const lift = rng.range(0.5, 1.1);
    const ca = Math.cos(a), sa = Math.sin(a);
    let prev = null;
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      const px = ca * len * t, pz = sa * len * t;
      const py = lift * t - 1.5 * t * t;
      const w = 0.52 * (1 - t * 0.92) + 0.03;
      const ox = -sa * w, oz = ca * w;
      const col = t < 0.5 ? 0x2f6b3a : 0x4f8a45;
      const pt = [[px - ox, py, pz - oz], [px + ox, py, pz + oz]];
      if (prev) {
        b.quad([prev[0][0], prev[0][1], prev[0][2]], [prev[1][0], prev[1][1], prev[1][2]],
          [pt[1][0], pt[1][1], pt[1][2]], [pt[0][0], pt[0][1], pt[0][2]], col);
      }
      prev = pt;
    }
  }
  b.cylinder(0, -0.3, 0, 0.34, 0.7, 0x6b5a35, 6);
  return b.build();
}

export function buildProps(scene, mats, rng) {
  const solid = new MeshBatch();
  const glow = new MeshBatch();
  const group = new THREE.Group();
  group.name = 'props';
  const cones = [];
  const lamps = [];
  const palms = [];
  const R = CFG.ROAD_W / 2;
  const LIGHT_H = 7.6;

  // Lamp posts, staggered down every road.
  for (let k = 0; k < 9; k++) {
    const c = roadCoord(k);
    for (let s = 0; s < 8; s++) {
      const a = roadCoord(s) + R + 4, b = roadCoord(s + 1) - R - 4;
      for (let t = a; t <= b; t += 27) {
        const side = (Math.round(t / 27) % 2 === 0) ? 1 : -1;
        const lx = t, lz = c + side * (R + 1.3);
        solid.cylinder(lx, 0.18, lz, 0.13, LIGHT_H, METAL, 6, 0.1);
        solid.box(lx, LIGHT_H + 0.1, lz - side * 1.1, 0.16, 0.16, 2.4, METAL);
        solid.box(lx, LIGHT_H + 0.02, lz - side * 2.2, 0.5, 0.2, 0.9, 0x2e3439);
        glow.box(lx, LIGHT_H - 0.1, lz - side * 2.2, 0.42, 0.1, 0.75, 0xffe0a8);
        cones.push([lx, LIGHT_H - 0.2, lz - side * 2.2]);
        lamps.push([lx, LIGHT_H - 0.1, lz - side * 2.2]);
        // mirrored post on the other side of the road
        const mx = t + 13.5, mz = c - side * (R + 1.3);
        solid.cylinder(mx, 0.18, mz, 0.13, LIGHT_H, METAL, 6, 0.1);
        solid.box(mx, LIGHT_H + 0.1, mz + side * 1.1, 0.16, 0.16, 2.4, METAL);
        solid.box(mx, LIGHT_H + 0.02, mz + side * 2.2, 0.5, 0.2, 0.9, 0x2e3439);
        glow.box(mx, LIGHT_H - 0.1, mz + side * 2.2, 0.42, 0.1, 0.75, 0xffe0a8);
        cones.push([mx, LIGHT_H - 0.2, mz + side * 2.2]);
        lamps.push([mx, LIGHT_H - 0.1, mz + side * 2.2]);
      }
    }
  }

  // Traffic signals on two corners of every junction.
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const rx = roadCoord(i), rz = roadCoord(j);
      for (const [sx, sz] of [[1, 1], [-1, -1]]) {
        const px = rx + sx * (R + 1.4), pz = rz + sz * (R + 1.4);
        solid.cylinder(px, 0.18, pz, 0.14, 5.6, 0x2f343a, 6, 0.11);
        solid.box(px - sx * 2.4, 5.5, pz, 4.8, 0.16, 0.16, 0x2f343a);
        solid.box(px - sx * 4.6, 5.1, pz, 0.5, 1.5, 0.42, 0x22262a);
        const lit = (i + j) % 2 === 0;
        glow.box(px - sx * 4.6, 5.62, pz, 0.3, 0.3, 0.46, lit ? 0xff3b2f : 0x2a1412);
        glow.box(px - sx * 4.6, 5.12, pz, 0.3, 0.3, 0.46, 0x2a2412);
        glow.box(px - sx * 4.6, 4.62, pz, 0.3, 0.3, 0.46, lit ? 0x1d2a16 : 0x46ff8a);
      }
    }
  }

  // Palms: the beach, plus the strand and the coast boulevard.
  for (let n = 0; n < 46; n++) {
    const x = rng.range(-CFG.HALF, CFG.HALF);
    palms.push([x, rng.range(CFG.BEACH_Z + 6, CFG.OCEAN_Z - 10), rng.range(6.5, 11)]);
  }
  for (let n = 0; n < 34; n++) {
    const x = rng.range(-CFG.HALF + 10, CFG.HALF - 10);
    palms.push([x, roadCoord(8) + rng.range(9.5, 12.5), rng.range(7, 10)]);
    palms.push([x + 7, roadCoord(8) - rng.range(9.5, 12.5), rng.range(6.5, 9.5)]);
  }
  for (let i = 0; i < 8; i++) {
    const b = roadCoord(i) + CFG.PITCH / 2;
    palms.push([b + rng.range(-10, 10), roadCoord(7) + rng.range(9.5, 12), rng.range(6, 9)]);
  }

  // Beach dressing: umbrellas, loungers, a lifeguard hut.
  for (let n = 0; n < 16; n++) {
    const x = rng.range(-CFG.HALF, CFG.HALF), z = rng.range(CFG.BEACH_Z + 10, CFG.OCEAN_Z - 14);
    solid.cylinder(x, 0.05, z, 0.07, 2.2, 0xd8d4c8, 5);
    solid.cylinder(x, 2.1, z, 0.1, 0.1, 0xd8d4c8, 5);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const col = s % 2 ? 0xe05a5a : 0xf2ead6;
      const p0 = [x, 2.3, z], p1 = [x + Math.cos(a) * 1.9, 2.0, z + Math.sin(a) * 1.9];
      const p2 = [x + Math.cos(a + 1.05) * 1.9, 2.0, z + Math.sin(a + 1.05) * 1.9];
      solid.quad(p0, p1, p2, p0, col);
    }
    solid.box(x + 2.2, 0.28, z + 1.4, 0.8, 0.12, 1.9, rng.pick([0x3f6f8a, 0xc25a4a, 0xe0c070]));
  }
  solid.box(-40, 1.6, CFG.BEACH_Z + 14, 6, 3.2, 5, 0xe8dcc0);
  solid.box(-40, 3.4, CFG.BEACH_Z + 14, 7.2, 0.4, 6, 0xb9563f);
  solid.box(-40, 4.4, CFG.BEACH_Z + 14, 0.2, 1.6, 0.2, 0xdddddd);

  // Benches, bins, hydrants and bus shelters on the pavements.
  for (let i = 0; i < CFG.BLOCKS; i++) {
    for (let j = 0; j < CFG.BLOCKS; j++) {
      const bx0 = roadCoord(i) + R, bz0 = roadCoord(j) + R;
      const bx1 = roadCoord(i + 1) - R, bz1 = roadCoord(j + 1) - R;
      const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      // bench against the north curb, facing the road
      solid.box(cx + rng.range(-8, 8), 0.62, bz0 + 1.0, 1.9, 0.12, 0.55, 0x6b4a32);
      solid.box(cx + rng.range(-8, 8), 0.95, bz0 + 1.24, 1.9, 0.5, 0.1, 0x6b4a32);
      solid.box(cx, 0.4, bz0 + 1.0, 0.1, 0.44, 0.5, 0x3b3f44);
      // hydrant at the corner
      solid.cylinder(bx0 + 1.4, 0.18, bz0 + 1.4, 0.17, 0.62, 0xc0392b, 6);
      solid.cylinder(bx0 + 1.4, 0.78, bz0 + 1.4, 0.2, 0.12, 0xd64535, 6);
      solid.box(bx0 + 1.4, 0.62, bz0 + 1.4, 0.5, 0.12, 0.12, 0xb03020);
      // bin
      solid.cylinder(bx1 - 2.0, 0.18, bz1 - 2.0, 0.36, 0.95, 0x39544a, 7);
      // bus shelter every third block along the west side
      if ((i + j) % 3 === 0) {
        const sx = bx0 + 1.8, sz = cz;
        solid.box(sx, 2.9, sz, 3.2, 0.16, 5.6, 0x2f3a44);
        for (const o of [-2.4, 2.4]) solid.box(sx, 1.55, sz + o, 0.16, 2.8, 0.16, 0x4a5560);
        solid.box(sx - 0.9, 1.4, sz, 0.1, 2.2, 4.8, 0x6d8b9a);
        solid.box(sx + 0.4, 0.75, sz, 0.9, 0.12, 3.4, 0x5a4a3a);
        solid.box(sx + 0.4, 2.9, sz, 0.5, 1.1, 2.4, 0x2f6f8a);
        glow.box(sx + 0.45, 3.5, sz, 0.08, 0.5, 2.0, 0xbfe6ff);
      }
    }
  }

  // A few parked cars' worth of tyres and crates in Oru Yards alleys.
  for (let n = 0; n < 26; n++) {
    const i = rng.int(CFG.BLOCKS), j = rng.int(CFG.BLOCKS);
    if (districtOf(i, j) !== 'yards') continue;
    const b = { x: roadCoord(i) + CFG.PITCH / 2, z: roadCoord(j) + CFG.PITCH / 2 };
    solid.box(b.x + rng.range(-8, 8), 0.75, b.z + rng.range(-8, 8), 1.2, 1.1, 1.2, 0x8a6a44);
    solid.box(b.x, 1.35, b.z, 1.2, 0.1, 1.2, 0x6a5034);
  }

  group.add(new THREE.Mesh(solid.build(), mats.solid));
  group.add(new THREE.Mesh(glow.build(), mats.glow));

  // Light cones: open cones under each lamp head, additive, only really visible at night.
  const coneGeo = new THREE.ConeGeometry(3.5, 7.4, 7, 1, true);
  const coneMesh = new THREE.InstancedMesh(coneGeo, mats.cone, cones.length);
  const d = new THREE.Object3D();
  cones.forEach((p, i) => {
    d.position.set(p[0], p[1] - 3.7, p[2]);
    d.rotation.set(0, (i * 1.7) % 6.28, 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    coneMesh.setMatrixAt(i, d.matrix);
  });
  coneMesh.frustumCulled = false;
  group.add(coneMesh);

  // Lamp halos in one draw call.
  const lp = new Float32Array(lamps.length * 3);
  lamps.forEach((p, i) => { lp[i * 3] = p[0]; lp[i * 3 + 1] = p[1]; lp[i * 3 + 2] = p[2]; });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const haloMat = new THREE.PointsMaterial({ map: mats.glowTex, size: 3.2, sizeAttenuation: true,
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffdca8 });
  const halos = new THREE.Points(lg, haloMat);
  halos.frustumCulled = false;
  group.add(halos);

  // Palms.
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 1, 6, 1);
  trunkGeo.translate(0, 0.5, 0);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a7248 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  const crownGeo = palmCrown(rng);
  const crownMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, palms.length);
  palms.forEach((p, i) => {
    const lean = rng.range(-0.09, 0.09);
    d.position.set(p[0], 0.15, p[1]);
    d.rotation.set(lean, rng.range(0, 6.28), lean * 0.6);
    d.scale.set(1, p[2], 1);
    d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    d.position.set(p[0] + lean * p[2] * 0.5, p[2] + 0.1, p[1]);
    d.rotation.set(0, rng.range(0, 6.28), 0);
    d.scale.set(rng.range(0.85, 1.15), rng.range(0.85, 1.1), rng.range(0.85, 1.15));
    d.updateMatrix();
    crowns.setMatrixAt(i, d.matrix);
  });
  group.add(trunks, crowns);

  // Beach sand and the boardwalk strip.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CFG.CITY_W + 220, CFG.OCEAN_Z - CFG.BEACH_Z), mats.sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.04, (CFG.BEACH_Z + CFG.OCEAN_Z) / 2);
  sand.receiveShadow = true;
  group.add(sand);

  scene.add(group);
  return { group, coneMesh, halos, haloMat, coneMat: mats.cone, palms };
}
