// Eight hand-built vehicle types: sedan, coupe, van, pickup, taxi, bus, police cruiser and a
// sports car. Every one is merged geometry with a paint buffer (tinted per car) and a trim
// buffer (glass, bumpers, chrome, lamps), plus four wheels that spin and steer.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBatch } from '../render/geoBuilder.js';

export const CAR_SPECS = {
  sedan:   { len: 4.6,  wid: 1.82, roof: 1.46, wheel: 0.34, seats: 4, mass: 1.0 },
  coupe:   { len: 4.4,  wid: 1.86, roof: 1.30, wheel: 0.35, seats: 2, mass: 0.95 },
  van:     { len: 5.4,  wid: 2.02, roof: 2.20, wheel: 0.38, seats: 3, mass: 1.35 },
  pickup:  { len: 5.5,  wid: 2.04, roof: 1.82, wheel: 0.42, seats: 2, mass: 1.3 },
  taxi:    { len: 4.7,  wid: 1.84, roof: 1.52, wheel: 0.34, seats: 4, mass: 1.0 },
  bus:     { len: 10.6, wid: 2.52, roof: 3.10, wheel: 0.50, seats: 2, mass: 2.6 },
  police:  { len: 4.8,  wid: 1.90, roof: 1.50, wheel: 0.35, seats: 4, mass: 1.05 },
  sports:  { len: 4.5,  wid: 1.98, roof: 1.12, wheel: 0.36, seats: 2, mass: 0.85 },
};
export const CAR_NAMES = {
  sedan: 'Vantor 400', coupe: 'Rill GT', van: 'Hollis Van', pickup: 'Terra Haul',
  taxi: 'City Cab', bus: 'Loop Line', police: 'Harbor Patrol', sports: 'Kite R',
};
const GLASS = 0x18242e, DARK = 0x1b1f24, CHROME = 0x9aa2aa, TYRE = 0x16181b;

function side(b, x, y0, y1, z0, z1, color) {
  const s = x > 0 ? 1 : -1;
  if (s > 0) b.quad([x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1], color);
  else b.quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], color);
}

// Paint and trim for one type. Paint is left white so it can be tinted per instance.
export function carGeometry(type) {
  const s = CAR_SPECS[type];
  const P = new MeshBatch(), T = new MeshBatch(), L = new MeshBatch();
  const hw = s.wid / 2, hl = s.len / 2;
  const bodyBottom = s.wheel + 0.06;
  const shoulder = s.roof * 0.62;
  const cabinTop = s.roof;
  const cabinZ = type === 'sports' ? hl * 0.14 : hl * 0.05;
  const cabLen = type === 'bus' || type === 'van' ? s.len * 0.82 : s.len * 0.5;
  const cabW = s.wid * (type === 'bus' ? 0.98 : 0.86);

  // chassis + main body
  P.box(0, (bodyBottom + shoulder) / 2, 0, s.wid, shoulder - bodyBottom, s.len, 0xffffff);
  // rocker panel / skirt
  T.box(0, bodyBottom + 0.06, 0, s.wid + 0.02, 0.12, s.len * 0.94, DARK);

  if (type === 'bus') {
    P.box(0, (shoulder + cabinTop) / 2, 0, s.wid, cabinTop - shoulder, s.len, 0xffffff);
    // window band both sides
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z0 = -hl + 1.4 + i * 1.45, z1 = z0 + 1.15;
        side(T, sx * (hw + 0.01), shoulder + 0.25, cabinTop - 0.35, z0, z1, GLASS);
      }
      side(T, sx * (hw + 0.02), shoulder + 0.25, cabinTop - 0.35, -hl + 0.2, -hl + 0.9, GLASS);
    }
    // windscreen + rear
    T.quad([-hw + 0.15, shoulder + 0.2, -hl - 0.01], [hw - 0.15, shoulder + 0.2, -hl - 0.01],
      [hw - 0.25, cabinTop - 0.3, -hl - 0.01], [-hw + 0.25, cabinTop - 0.3, -hl - 0.01], GLASS);
    L.box(0, cabinTop - 0.12, -hl + 0.1, 1.5, 0.42, 0.06, 0xffc86a);
    T.box(0, cabinTop + 0.06, 0, s.wid * 0.7, 0.14, s.len * 0.6, 0xb9bec4);
    // door
    T.quad([hw + 0.02, bodyBottom + 0.15, -1.2], [hw + 0.02, bodyBottom + 0.15, 0.6],
      [hw + 0.02, cabinTop - 0.5, 0.6], [hw + 0.02, cabinTop - 0.5, -1.2], 0x2c3238);
  } else {
    P.box(0, (shoulder + cabinTop) / 2, cabinZ, cabW, cabinTop - shoulder, cabLen, 0xffffff);
    // windows: raked windscreen, side glass, rear glass
    const wz0 = cabinZ - cabLen / 2, wz1 = cabinZ + cabLen / 2;
    T.quad([-cabW / 2 + 0.06, shoulder + 0.03, wz0 + 0.02], [cabW / 2 - 0.06, shoulder + 0.03, wz0 + 0.02],
      [cabW / 2 - 0.12, cabinTop - 0.06, wz0 + 0.34], [-cabW / 2 + 0.12, cabinTop - 0.06, wz0 + 0.34], GLASS);
    T.quad([-cabW / 2 + 0.1, shoulder + 0.03, wz1 - 0.02], [cabW / 2 - 0.1, shoulder + 0.03, wz1 - 0.02],
      [cabW / 2 - 0.14, cabinTop - 0.06, wz1 - 0.26], [-cabW / 2 + 0.14, cabinTop - 0.06, wz1 - 0.26], GLASS);
    for (const sx of [-1, 1]) {
      side(T, sx * (cabW / 2 + 0.012), shoulder + 0.06, cabinTop - 0.1, wz0 + 0.32, wz1 - 0.24, GLASS);
      side(T, sx * (cabW / 2 + 0.014), shoulder + 0.06, cabinTop - 0.12, wz0 + 0.18, wz0 + 0.3, DARK);
      // door seam
      side(T, sx * (hw + 0.012), bodyBottom + 0.16, shoulder - 0.05, cabinZ - 0.5, cabinZ - 0.44, 0x8a8f95);
      // mirror
      P.box(sx * (hw + 0.1), shoulder + 0.16, wz0 + 0.28, 0.16, 0.1, 0.12, 0xffffff);
    }
    // hood and boot lids
    P.box(0, shoulder - 0.03, -hl * 0.62, s.wid * 0.9, 0.08, s.len * 0.3, 0xffffff);
    if (type !== 'van') P.box(0, shoulder - 0.03, hl * 0.66, s.wid * 0.88, 0.08, s.len * 0.24, 0xffffff);
  }

  // bumpers, grille, lamps
  T.box(0, bodyBottom + 0.16, -hl - 0.02, s.wid * 0.98, 0.26, 0.12, 0x2b3036);
  T.box(0, bodyBottom + 0.16, hl + 0.02, s.wid * 0.98, 0.26, 0.12, 0x2b3036);
  T.box(0, bodyBottom + 0.34, -hl - 0.03, s.wid * 0.42, 0.18, 0.06, 0x0e1114);
  const lampY = bodyBottom + 0.36;
  for (const sx of [-1, 1]) {
    L.box(sx * (hw - 0.3), lampY, -hl - 0.03, 0.36, 0.17, 0.07, 0xfff6dc);
    L.box(sx * (hw - 0.28), lampY + 0.02, hl + 0.03, 0.32, 0.15, 0.07, 0xff2a18);
    // wheels' arch shadow
    T.box(sx * hw, bodyBottom + 0.3, -hl * 0.32, 0.04, 0.3, 0.9, 0x2a2f34);
    T.box(sx * hw, bodyBottom + 0.3, hl * 0.3, 0.04, 0.3, 0.9, 0x2a2f34);
  }
  T.box(0, lampY + 0.1, -hl - 0.035, s.wid * 0.3, 0.05, 0.02, 0xc9ced4);

  if (type === 'pickup') {
    // open bed with side walls and a tailgate
    P.box(0, shoulder + 0.28, hl * 0.55, s.wid, 0.1, s.len * 0.42, 0xffffff);
    for (const sx of [-1, 1]) P.box(sx * (hw - 0.05), shoulder + 0.22, hl * 0.55, 0.1, 0.42, s.len * 0.42, 0xffffff);
    P.box(0, shoulder + 0.2, hl - 0.04, s.wid, 0.44, 0.1, 0xffffff);
    T.box(0, shoulder + 0.14, hl * 0.55, s.wid * 0.9, 0.06, s.len * 0.38, 0x2a2d31);
    T.box(0, cabinTop + 0.02, 0, s.wid * 0.4, 0.06, 0.3, 0xb9bec4);
  }
  if (type === 'van') {
    for (const sx of [-1, 1]) side(T, sx * (hw + 0.02), bodyBottom + 0.1, shoulder + 0.2, -0.6, -0.52, 0x8a8f95);
    P.box(0, cabinTop + 0.05, 0, s.wid * 0.8, 0.1, s.len * 0.5, 0xffffff);
    for (const sx of [-1, 1]) P.box(sx * (hw - 0.2), cabinTop + 0.14, 0, 0.08, 0.12, s.len * 0.7, 0x9aa0a6);
  }
  if (type === 'sports') {
    P.box(0, cabinTop - 0.02, hl * 0.86, s.wid * 0.9, 0.1, 0.34, 0xffffff);
    for (const sx of [-1, 1]) T.box(sx * (hw - 0.2), cabinTop - 0.18, hl * 0.86, 0.08, 0.22, 0.1, DARK);
    T.box(0, bodyBottom + 0.1, -hl - 0.06, s.wid * 0.86, 0.1, 0.2, 0x14181c);
  }
  if (type === 'taxi') {
    L.box(0, cabinTop + 0.12, cabinZ, 0.7, 0.24, 0.32, 0xffe9a8);
    for (let i = 0; i < 8; i++) T.box(-0.3 + i * 0.085, cabinTop + 0.12, cabinZ + 0.17, 0.045, 0.16, 0.02, i % 2 ? 0x1a1a1a : 0xffe9a8);
  }
  if (type === 'police') {
    T.box(0, cabinTop + 0.1, cabinZ, 1.1, 0.16, 0.28, 0x14181c);
    L.box(-0.36, cabinTop + 0.16, cabinZ, 0.34, 0.1, 0.24, 0x3b6bff);
    L.box(0.36, cabinTop + 0.16, cabinZ, 0.34, 0.1, 0.24, 0xff3b3b);
    T.box(0, bodyBottom + 0.3, -hl - 0.16, s.wid * 0.9, 0.34, 0.1, 0x1b1f24);
  }

  const wheelR = s.wheel;
  const wheels = [
    { x: -hw + 0.06, z: -hl * 0.62 }, { x: hw - 0.06, z: -hl * 0.62 },
    { x: -hw + 0.06, z: hl * 0.62 }, { x: hw - 0.06, z: hl * 0.62 },
  ];
  return { paint: P.build(), trim: T.build(), lamps: L.build(), wheels, wheelR, spec: s };
}

export function wheelGeometry(r) {
  const g = new THREE.CylinderGeometry(r, r, r * 0.62, 10);
  g.rotateZ(Math.PI / 2);
  const c = new THREE.Color(TYRE);
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const geoCache = new Map();
export function carParts(type) {
  if (!geoCache.has(type)) geoCache.set(type, carGeometry(type));
  return geoCache.get(type);
}

const wheelMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const paintMat = new THREE.MeshLambertMaterial({ vertexColors: true });

// A drivable car: paint + trim meshes, four wheel pivots, brake lights and headlight glow.
export class Car {
  constructor(type, paint, opts = {}) {
    this.type = type;
    this.spec = CAR_SPECS[type];
    const parts = carParts(type);
    this.group = new THREE.Group();
    this.paintMat = new THREE.MeshLambertMaterial({ vertexColors: true, color: paint });
    this.paintMesh = new THREE.Mesh(parts.paint, this.paintMat);
    this.paintMesh.castShadow = true;
    this.group.add(this.paintMesh);
    this.trimMesh = new THREE.Mesh(parts.trim, paintMat);
    this.trimMesh.castShadow = true;
    this.group.add(this.trimMesh);
    this.lampMesh = new THREE.Mesh(parts.lamps, Car.lampMat);
    this.group.add(this.lampMesh);
    this.wheels = parts.wheels.map((w) => {
      const pivot = new THREE.Group();
      pivot.position.set(w.x, parts.wheelR, w.z);
      const mesh = new THREE.Mesh(wheelGeometry(parts.wheelR), wheelMat);
      pivot.add(mesh);
      this.group.add(pivot);
      return { pivot, mesh, x: w.x, z: w.z };
    });
    this.spin = 0;
    this.paint = paint;
    this.damage = 0;
    this.baseColor = new THREE.Color(paint);
    this.headlights = [];
    if (opts.lights !== false) this.addLightSprites();
    this.group.rotation.order = 'YXZ';
  }

  addLightSprites() {
    const s = this.spec, hl = s.len / 2, hw = s.wid / 2;
    const tex = Car.glowTex;
    if (!tex) return;
    for (const sx of [-1, 1]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xfff1cc, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      sp.position.set(sx * (hw - 0.3), s.wheel + 0.36, -hl - 0.1);
      sp.scale.set(1.5, 1.5, 1);
      this.group.add(sp);
      this.headlights.push(sp);
      const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xff3a22, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      tail.position.set(sx * (hw - 0.28), s.wheel + 0.38, hl + 0.08);
      tail.scale.set(0.9, 0.9, 1);
      this.group.add(tail);
      this.headlights.push(tail);
    }
  }

  setLightLevel(level) {
    for (let i = 0; i < this.headlights.length; i++) {
      this.headlights[i].material.opacity = (i % 2 === 0 ? 0.85 : 0.55) * level;
    }
    this.lampMesh.visible = true;
    this.lampLevel = level;
  }

  // Spin and steer the wheels; steer angle is in radians on the front pair only.
  updateWheels(dt, speed, steer) {
    this.spin += (speed / this.spec.wheel) * dt;
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i];
      w.mesh.rotation.x = this.spin;
      w.pivot.rotation.y = i < 2 ? steer : 0;
    }
  }

  setDamage(d) {
    this.damage = Math.min(100, d);
    const f = 1 - this.damage / 190;
    this.paintMat.color.copy(this.baseColor).multiplyScalar(f);
    this.paintMesh.scale.set(1 + this.damage * 0.0006, 1 - this.damage * 0.0004, 1 + this.damage * 0.0009);
  }
}
Car.glowTex = null;
Car.lampMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, color: 0x555555 });
