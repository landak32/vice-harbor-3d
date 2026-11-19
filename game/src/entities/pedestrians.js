// The crowd. Every pedestrian walks a block perimeter on the pavement, turns the corners,
// swings arms and legs on a shared cycle, and runs for cover when a gun goes off or a horn
// sounds. Six instanced body parts draw the whole crowd in six calls.
import * as THREE from '../../vendor/three.module.min.js';
import { CFG } from '../config.js';
import { roadCoord, blockBounds } from '../world/cityGrid.js';

const SHIRTS = [0xd8544f, 0x3f7fa8, 0xe0c060, 0x6aa86a, 0xb06ab0, 0xe8e4d8, 0x2f3a4a, 0xd88a4a, 0x4a6a8a, 0x8a4a4a];
const PANTS = [0x2a3038, 0x3a3a42, 0x4a4238, 0x22303a, 0x5a5a62, 0x2a2a30];
const SKINS = [0xd8a878, 0xc08a5e, 0x8d5a3c, 0xe8c09a, 0x6b432c, 0xa87850];
const HAIRS = [0x1a1612, 0x3a2a1c, 0x5a4028, 0x0d0b09, 0x8a7a62, 0xc8b090];

function partBox(w, h, d, offsetY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (offsetY) g.translate(0, offsetY, 0);
  return g;
}

export class Crowd {
  constructor(scene, mats, rng, count = 88) {
    this.rng = rng;
    this.peds = [];
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.group = new THREE.Group();
    this.group.name = 'crowd';
    this.parts = {
      torso: new THREE.InstancedMesh(partBox(0.48, 0.58, 0.3), this.mat, count),
      head: new THREE.InstancedMesh(partBox(0.25, 0.29, 0.25), this.mat, count),
      hair: new THREE.InstancedMesh(partBox(0.27, 0.1, 0.27, 0.13), this.mat, count),
      armL: new THREE.InstancedMesh(partBox(0.13, 0.56, 0.15, -0.28), this.mat, count),
      armR: new THREE.InstancedMesh(partBox(0.13, 0.56, 0.15, -0.28), this.mat, count),
      legL: new THREE.InstancedMesh(partBox(0.17, 0.82, 0.19, -0.41), this.mat, count),
      legR: new THREE.InstancedMesh(partBox(0.17, 0.82, 0.19, -0.41), this.mat, count),
    };
    for (const k in this.parts) {
      this.parts[k].instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.parts[k].frustumCulled = false;
      this.group.add(this.parts[k]);
    }

    for (let i = 0; i < count; i++) {
      const i2 = rng.int(CFG.BLOCKS), j = rng.int(CFG.BLOCKS);
      const b = blockBounds(i2, j);
      const crosser = rng.chance(0.16);
      const ped = {
        block: b, side: rng.int(4), t: rng.range(0, 30), cw: rng.chance(0.5),
        speed: rng.range(1.05, 1.75), phase: rng.range(0, 6.28), panic: 0, dead: false,
        shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), skin: rng.pick(SKINS), hair: rng.pick(HAIRS),
        x: 0, z: 0, yaw: 0, y: CFG.CURB_H, swing: 0, scale: rng.range(0.9, 1.08),
        crosser, cross: null,
      };
      if (crosser) {
        const ji = rng.int(9), jj = rng.int(9);
        const horiz = rng.chance(0.5);
        ped.cross = { horiz, axis: horiz ? roadCoord(jj) : roadCoord(ji), at: (horiz ? roadCoord(ji) : roadCoord(jj)) + rng.range(-2, 2), t: rng.range(-8, 8), dir: rng.sign() };
      }
      this.setColors(ped, i);
      this.peds.push(ped);
    }
    scene.add(this.group);
    this.dummy = new THREE.Object3D();
    this.dummy.rotation.order = 'YXZ';
    this.update(0.016, null, 0);
  }

  setColors(ped, i) {
    const c = new THREE.Color();
    this.parts.torso.setColorAt(i, c.setHex(ped.shirt));
    this.parts.armL.setColorAt(i, c.setHex(ped.shirt).multiplyScalar(0.92));
    this.parts.armR.setColorAt(i, c.setHex(ped.shirt).multiplyScalar(0.92));
    this.parts.head.setColorAt(i, c.setHex(ped.skin));
    this.parts.hair.setColorAt(i, c.setHex(ped.hair));
    this.parts.legL.setColorAt(i, c.setHex(ped.pants));
    this.parts.legR.setColorAt(i, c.setHex(ped.pants));
  }

  // Put a cluster of pedestrians on the pavements around a point, for busy street scenes.
  gather(x, z, count = 8, radius = 26) {
    const bi = Math.max(0, Math.min(7, Math.floor((x + CFG.HALF) / CFG.PITCH)));
    const bj = Math.max(0, Math.min(7, Math.floor((z + CFG.HALF) / CFG.PITCH)));
    for (let i = 0; i < Math.min(count, this.peds.length); i++) {
      const p = this.peds[i];
      const b = blockBounds(Math.min(7, bi + (i % 3) - 1), Math.min(7, bj + ((i >> 2) % 3) - 1));
      p.block = b;
      p.side = i % 4;
      p.t = 2 + ((i * 7.3) % 28);
      p.cw = i % 2 === 0;
      p.crosser = false;
      p.panic = 0;
      p.dead = false;
      p.phase = i * 1.7;
    }
  }

  panic(x, z, radius = 26) {
    for (const p of this.peds) {
      if (p.dead) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < radius) p.panic = 2.6 + this.rng.range(0, 2.4);
    }
  }

  // Nearest live pedestrian to a point, for collisions with cars and bullets.
  nearest(x, z, maxD = 2.2) {
    let best = null, bd = maxD * maxD;
    for (const p of this.peds) {
      if (p.dead) continue;
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  update(dt, threat, panic) {
    const P = this.parts, d = this.dummy;
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      let speed = p.speed;
      if (p.dead) { speed = 0; }
      else if (p.panic > 0) {
        p.panic -= dt;
        speed = 5.4;
        if (threat) {
          const ax = p.x - threat.x, az = p.z - threat.z;
          const l = Math.hypot(ax, az) || 1;
          p.x += (ax / l) * speed * dt;
          p.z += (az / l) * speed * dt;
          p.yaw = Math.atan2(-ax / l, -az / l);
        }
        p.phase += dt * 15;
      } else if (p.crosser && p.cross) {
        const c = p.cross;
        speed = p.speed * 1.1;
        c.t += speed * dt * c.dir;
        if (Math.abs(c.t) > 8.4) c.dir *= -1;
        if (c.horiz) { p.x = c.at + c.t; p.z = c.axis; p.yaw = c.t > 0 ? -Math.PI / 2 : Math.PI / 2; }
        else { p.z = c.at + c.t; p.x = c.axis; p.yaw = c.t > 0 ? Math.PI : 0; }
        p.phase += dt * speed * 4.4;
        p.y = 0.02;
      } else {
        p.t += speed * dt;
        const L = 34;
        while (p.t > L) {
          p.t -= L;
          p.side = (p.side + (p.cw ? 1 : 3)) % 4;
        }
        const b = p.block;
        if (p.side === 0) { p.x = b.x0 + 1.5 + p.t; p.z = b.z0 + 1.5; p.yaw = -Math.PI / 2; }
        else if (p.side === 1) { p.x = b.x1 - 1.5; p.z = b.z0 + 1.5 + p.t; p.yaw = Math.PI; }
        else if (p.side === 2) { p.x = b.x1 - 1.5 - p.t; p.z = b.z1 - 1.5; p.yaw = Math.PI / 2; }
        else { p.x = b.x0 + 1.5; p.z = b.z1 - 1.5 - p.t; p.yaw = 0; }
        p.y = CFG.CURB_H;
        p.phase += dt * speed * 4.4;
      }
      p.swing = Math.sin(p.phase) * (p.panic > 0 ? 0.85 : 0.5);
      const bob = Math.abs(Math.cos(p.phase)) * (p.panic > 0 ? 0.06 : 0.02);
      d.position.set(p.x, p.y + bob, p.z);
      d.rotation.set(p.dead ? -1.5 : 0, p.yaw, 0);
      d.scale.set(p.scale, p.scale, p.scale);
      d.updateMatrix();
      P.torso.setMatrixAt(i, d.matrix);
      d.position.y += 0.44 * p.scale;
      d.updateMatrix();
      P.head.setMatrixAt(i, d.matrix);
      d.position.y += 0.13 * p.scale;
      d.updateMatrix();
      P.hair.setMatrixAt(i, d.matrix);
      for (const [k, sx, y] of [['armL', 0.31, 1.52], ['armR', -0.31, 1.52], ['legL', 0.12, 0.92], ['legR', -0.12, 0.92]]) {
        const s = k.startsWith('arm') ? -0.55 : 1.0;
        d.position.set(p.x + Math.cos(p.yaw) * sx * p.scale, p.y + y * p.scale + bob, p.z - Math.sin(p.yaw) * sx * p.scale);
        d.rotation.set(p.dead ? 0 : p.swing * s, p.yaw, 0);
        d.updateMatrix();
        P[k].setMatrixAt(i, d.matrix);
      }
    }
    for (const k in P) P[k].instanceMatrix.needsUpdate = true;
  }
}
