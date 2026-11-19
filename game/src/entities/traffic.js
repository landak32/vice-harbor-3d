// Traffic: cars that drive the grid on the right-hand lane, brake for whatever is ahead and
// pick a new direction at junctions. Bodies are instanced per type, wheels in one instanced
// mesh, headlamps and tail lamps as two points clouds, so thirty cars cost about ten calls.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG } from '../config.js';
import { roadCoord } from '../world/cityGrid.js';
import { carParts, wheelGeometry, CAR_SPECS, Car } from '../entities/vehicles.js';
import { clamp } from '../core/math.js';

const PAINTS = [0x9aa3ad, 0x2b3a4a, 0xb8b2a4, 0x6d2f2f, 0x1f4a3c, 0xd8d4c8, 0x4a4f58, 0x8a5a2a, 0x243447, 0xc0b8a8];
const TYPES = ['sedan', 'sedan', 'coupe', 'van', 'pickup', 'taxi', 'bus', 'sports', 'sedan', 'coupe', 'van', 'sedan'];

export class Traffic {
  constructor(scene, mats, rng, count = 30) {
    this.rng = rng;
    this.cars = [];
    this.meshes = new Map();
    this.wheelGeo = wheelGeometry(0.36);
    this.wheelMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.trimMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.paintMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.group = new THREE.Group();
    this.group.name = 'traffic';

    for (let n = 0; n < count; n++) {
      const type = TYPES[n % TYPES.length];
      const axis = rng.chance(0.5) ? 'x' : 'z';
      const road = 1 + rng.int(7);
      const dir = rng.chance(0.5) ? 1 : -1;
      const p = rng.range(-CFG.HALF + 20, CFG.HALF - 20);
      const car = {
        type, axis, road, dir, p, speed: rng.range(8, 15), max: rng.range(11, 17),
        x: 0, z: 0, yaw: 0, brake: false, wheelSpin: rng.range(0, 6), color: rng.pick(PAINTS),
        idx: 0, turn: 0,
      };
      this.place(car);
      this.cars.push(car);
    }
    // one instanced body per type
    for (const type of new Set(this.cars.map((c) => c.type))) {
      const list = this.cars.filter((c) => c.type === type);
      const parts = carParts(type);
      const paint = new THREE.InstancedMesh(parts.paint, this.paintMat, list.length);
      const trim = new THREE.InstancedMesh(parts.trim, this.trimMat, list.length);
      const lamps = new THREE.InstancedMesh(parts.lamps, Car.lampMat, list.length);
      lamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      paint.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      trim.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      list.forEach((c, i) => { c.idx = i; paint.setColorAt(i, new THREE.Color(c.color)); });
      if (paint.instanceColor) paint.instanceColor.needsUpdate = true;
      this.meshes.set(type, { paint, trim, lamps, list });
      this.group.add(paint, trim, lamps);
    }
    const total = this.cars.length;
    this.wheels = new THREE.InstancedMesh(this.wheelGeo, this.wheelMat, total * 4);
    this.wheels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.wheels);

    this.headPos = new Float32Array(total * 2 * 3);
    this.tailPos = new Float32Array(total * 2 * 3);
    this.headGeo = new THREE.BufferGeometry();
    this.headGeo.setAttribute('position', new THREE.BufferAttribute(this.headPos, 3));
    this.tailGeo = new THREE.BufferGeometry();
    this.tailGeo.setAttribute('position', new THREE.BufferAttribute(this.tailPos, 3));
    this.headMat = new THREE.PointsMaterial({ map: mats.glowTex, size: 1.7, sizeAttenuation: true, transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xfff0c0 });
    this.tailMat = new THREE.PointsMaterial({ map: mats.glowTex, size: 1.2, sizeAttenuation: true, transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xff2a1a });
    this.head = new THREE.Points(this.headGeo, this.headMat);
    this.tail = new THREE.Points(this.tailGeo, this.tailMat);
    this.head.frustumCulled = false;
    this.tail.frustumCulled = false;
    this.group.add(this.head, this.tail);
    scene.add(this.group);
    this.dummy = new THREE.Object3D();
    this.dummy.rotation.order = 'YXZ';
    this.setNight(0);
  }

  place(c) {
    if (c.axis === 'x') { c.x = c.p; c.z = roadCoord(c.road) + c.dir * CFG.LANE; c.yaw = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    else { c.z = c.p; c.x = roadCoord(c.road) - c.dir * CFG.LANE; c.yaw = c.dir > 0 ? Math.PI : 0; }
  }

  // Line a few cars up in one lane, for a shot that needs traffic ahead.
  lineUp(axis, road, dir, fromP, count, spacing = 16) {
    let k = 0;
    for (const c of this.cars) {
      if (k >= count) break;
      c.axis = axis; c.road = road; c.dir = dir;
      c.p = fromP + dir * spacing * (k + 1);
      c.lastK = -99;
      c.speed = c.max * 0.7;
      c.yaw = axis === 'x' ? (dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (dir > 0 ? Math.PI : 0);
      this.place(c);
      k++;
    }
    this.syncMeshes();
  }

  setNight(n) {
    this.headMat.opacity = n * 0.95;
    this.tailMat.opacity = 0.15 + n * 0.6;
  }

  update(dt, playerCar) {
    const cars = this.cars;
    for (let ci = 0; ci < cars.length; ci++) {
      const c = cars[ci];
      // brake for the nearest car ahead in the same lane
      let gap = 99;
      for (const o of cars) {
        if (o === c || o.axis !== c.axis || o.road !== c.road || o.dir !== c.dir) continue;
        const d = (o.p - c.p) * c.dir;
        if (d > 0 && d < gap) gap = d;
      }
      if (playerCar) {
        const onLane = c.axis === 'x'
          ? Math.abs(playerCar.z - (roadCoord(c.road) + c.dir * CFG.LANE)) < 3.2
          : Math.abs(playerCar.x - (roadCoord(c.road) - c.dir * CFG.LANE)) < 3.2;
        if (onLane) {
          const d = (c.axis === 'x' ? playerCar.x - c.p : playerCar.z - c.p) * c.dir;
          if (d > 0 && d < 14) gap = Math.min(gap, d);
        }
      }
      c.brake = gap < 9;
      const want = c.brake ? Math.min(2.5, c.max * (gap / 12)) : c.max;
      c.speed += (want - c.speed) * Math.min(1, dt * (c.brake ? 4.5 : 1.6));
      c.speed = Math.max(0, c.speed);
      c.p += c.speed * dt * c.dir;

      // junctions: index of the nearest cross street
      const k = Math.round((c.p + CFG.HALF) / CFG.PITCH);
      if (k >= 0 && k <= 8 && k !== c.lastK && Math.abs(c.p - roadCoord(k)) < 2.2) {
        c.lastK = k;
        if (this.rng.next() < 0.34) {
          const newDir = this.rng.chance(0.5) ? 1 : -1;
          if (c.axis === 'x') {
            const zNow = roadCoord(c.road) + c.dir * CFG.LANE;
            c.axis = 'z'; c.road = k; c.dir = newDir; c.p = zNow;
          } else {
            const xNow = roadCoord(c.road) - c.dir * CFG.LANE;
            c.axis = 'x'; c.road = k; c.dir = newDir; c.p = xNow;
          }
          c.yaw = c.axis === 'x' ? (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (c.dir > 0 ? Math.PI : 0);
        }
      }
      this.place(c);
      if (c.p > CFG.HALF + 26 || c.p < -CFG.HALF - 26) {
        c.p = c.dir > 0 ? -CFG.HALF - 16 : CFG.HALF + 16;
        c.lastK = -99;
        this.place(c);
      }
      c.wheelSpin += (c.speed / 0.36) * dt;
    }
    this.syncMeshes();
  }

  syncMeshes() {
    const d = this.dummy;
    for (let ci = 0; ci < this.cars.length; ci++) {
      const c = this.cars[ci];
      const m = this.meshes.get(c.type);
      const spec = CAR_SPECS[c.type];
      d.position.set(c.x, 0.02, c.z);
      d.rotation.set(0, c.yaw, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      m.paint.setMatrixAt(c.idx, d.matrix);
      m.trim.setMatrixAt(c.idx, d.matrix);
      m.lamps.setMatrixAt(c.idx, d.matrix);
      const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
      const hw = spec.wid / 2, hl = spec.len / 2;
      const wIdx = ci * 4;
      for (let i = 0; i < 4; i++) {
        const lx = (i % 2 ? 1 : -1) * (hw - 0.06), lz = (i < 2 ? -1 : 1) * hl * 0.62;
        d.position.set(c.x + lx * cs + lz * sn, spec.wheel, c.z - lx * sn + lz * cs);
        d.rotation.set(c.wheelSpin, c.yaw, 0);
        d.scale.set(spec.wheel / 0.36, spec.wheel / 0.36, spec.wheel / 0.36);
        d.updateMatrix();
        this.wheels.setMatrixAt(wIdx + i, d.matrix);
      }
      for (let i = 0; i < 2; i++) {
        const lx = (i ? 1 : -1) * (hw - 0.3);
        const fx = c.x + lx * cs - hl * sn, fz = c.z - lx * sn - hl * cs;
        this.headPos[(ci * 2 + i) * 3] = fx;
        this.headPos[(ci * 2 + i) * 3 + 1] = spec.wheel + 0.34;
        this.headPos[(ci * 2 + i) * 3 + 2] = fz;
        const bx = c.x + lx * cs + hl * sn, bz = c.z - lx * sn + hl * cs;
        this.tailPos[(ci * 2 + i) * 3] = bx;
        this.tailPos[(ci * 2 + i) * 3 + 1] = spec.wheel + 0.36;
        this.tailPos[(ci * 2 + i) * 3 + 2] = bz;
      }
    }
    for (const [, m] of this.meshes) { m.paint.instanceMatrix.needsUpdate = true; m.trim.instanceMatrix.needsUpdate = true; m.lamps.instanceMatrix.needsUpdate = true; }
    this.wheels.instanceMatrix.needsUpdate = true;
    this.headGeo.attributes.position.needsUpdate = true;
    this.tailGeo.attributes.position.needsUpdate = true;
  }
}
