// A low-poly humanoid: head, hair, torso in a jacket, two arms and two legs, each limb on its
// own pivot so a walk cycle, a run, an idle breath and a seated driving pose all come from the
// same rig. The player, mission characters and police officers all use this.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBatch } from '../render/geoBuilder.js';

const SKIN = [0xd8a878, 0xc08a5e, 0x8d5a3c, 0xe8c09a, 0x6b432c];
const HAIR = [0x1a1612, 0x3a2a1c, 0x5a4028, 0x0d0b09, 0x8a7a62];

export class Character {
  constructor(seedRng, opts = {}) {
    this.root = new THREE.Group();
    this.jacket = opts.jacket ?? 0x2f8f8a;
    this.pants = opts.pants ?? 0x27303c;
    this.skin = opts.skin ?? SKIN[seedRng.int(SKIN.length)];
    this.hairCol = opts.hair ?? HAIR[seedRng.int(HAIR.length)];
    this.shirt = opts.shirt ?? 0xe8e4d8;
    this.phase = 0;
    this.state = 'idle';
    this.mat = opts.material ?? new THREE.MeshLambertMaterial({ vertexColors: true });
    this.dead = false;
    this.deadT = 0;
    this.parts = {};
    this.build();
  }

  build() {
    const M = this.mat;
    const body = new MeshBatch();
    // hips, torso, jacket hem, collar, head, hair
    body.box(0, 0.98, 0, 0.42, 0.26, 0.26, this.pants);
    body.box(0, 1.33, 0, 0.52, 0.56, 0.31, this.jacket);
    body.box(0, 1.13, 0, 0.5, 0.12, 0.33, shadeHex(this.jacket, 0.82));
    body.box(0, 1.58, 0, 0.3, 0.14, 0.24, this.skin);
    body.box(0, 1.4, 0.16, 0.2, 0.4, 0.02, this.shirt);
    body.box(0, 1.62, 0, 0.44, 0.1, 0.34, shadeHex(this.jacket, 1.14));
    body.box(0, 1.78, 0, 0.25, 0.28, 0.25, this.skin);
    body.box(0, 1.92, -0.01, 0.27, 0.1, 0.27, this.hairCol);
    body.box(0, 1.84, -0.11, 0.27, 0.16, 0.06, this.hairCol);
    body.box(0, 1.79, 0.13, 0.19, 0.05, 0.03, shadeHex(this.skin, 0.8));
    this.parts.body = new THREE.Mesh(body.build(), M);
    this.parts.body.castShadow = true;
    this.root.add(this.parts.body);

    const limb = (w, h, d, color, x, y, z, shoe) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const b = new MeshBatch();
      b.box(0, -h / 2, 0, w, h, d, color);
      if (shoe) b.box(0, -h - 0.04, 0.05, w * 0.95, 0.1, d * 1.5, 0x1c1c20);
      const m = new THREE.Mesh(b.build(), M);
      m.castShadow = true;
      pivot.add(m);
      this.root.add(pivot);
      return pivot;
    };
    this.parts.armL = limb(0.15, 0.6, 0.17, this.jacket, 0.34, 1.52, 0, false);
    this.parts.armR = limb(0.15, 0.6, 0.17, this.jacket, -0.34, 1.52, 0, false);
    this.parts.legL = limb(0.18, 0.86, 0.2, this.pants, 0.12, 0.9, 0, true);
    this.parts.legR = limb(0.18, 0.86, 0.2, this.pants, -0.12, 0.9, 0, true);
    // hands
    for (const k of ['armL', 'armR']) {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.16), new THREE.MeshLambertMaterial({ color: this.skin }));
      hand.position.y = -0.64;
      this.parts[k].add(hand);
    }
    this.baseY = 0;
    // weapon in the right hand
    this.gun = new THREE.Group();
    const gm = new THREE.MeshLambertMaterial({ color: 0x1b1f24 });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.46), gm);
    barrel.position.set(0, 0, -0.2);
    this.gun.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.1), gm);
    grip.position.set(0, -0.13, 0.02);
    this.gun.add(grip);
    this.magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.09), gm);
    this.magMesh.position.set(0, -0.16, -0.12);
    this.gun.add(this.magMesh);
    this.gun.position.set(0, -0.62, -0.12);
    this.gun.visible = false;
    this.parts.armR.add(this.gun);
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, -0.46);
    this.gun.add(this.muzzle);
    this.recoil = 0;
    this._v = new THREE.Vector3();
  }

  setWeapon(key) {
    this.gun.visible = key && key !== 'fists';
    this.magMesh.visible = key === 'smg' || key === 'shotgun';
    const s = key === 'shotgun' ? 1.25 : key === 'smg' ? 1.15 : 1;
    this.gun.scale.set(1, 1, s);
  }

  setAim(on) {
    this.aim = on;
  }

  muzzleWorld() {
    this.muzzle.getWorldPosition(this._v);
    return { x: this._v.x, y: this._v.y, z: this._v.z };
  }

  // speed in m/s; mode picks the cycle. Called every fixed step.
  update(dt, speed, mode = 'walk') {
    if (this.dead) {
      this.deadT = Math.min(1, this.deadT + dt * 2.2);
      this.root.rotation.x = -1.45 * this.deadT;
      this.root.position.y = this.baseY + 0.1 * this.deadT;
      return;
    }
    const moving = speed > 0.15;
    const run = mode === 'run';
    const stride = run ? 2.3 : 1.55;
    this.phase += dt * speed * stride * 2.2;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    const amp = moving ? Math.min(0.95, 0.28 + speed * (run ? 0.11 : 0.2)) : 0;
    const s = Math.sin(this.phase), c = Math.cos(this.phase * 2);
    const P = this.parts;
    if (this.state === 'drive') {
      P.legL.rotation.x = -1.32; P.legR.rotation.x = -1.32;
      P.legL.rotation.z = 0.06; P.legR.rotation.z = -0.06;
      P.armL.rotation.x = -1.05; P.armR.rotation.x = -1.05;
      P.armL.rotation.z = 0.18; P.armR.rotation.z = -0.18;
      P.body.rotation.x = 0.04;
      this.root.position.y = this.baseY;
      return;
    }
    if (this.aim) {
      P.armR.rotation.x = -1.48 + this.recoil * 0.25;
      P.armL.rotation.x = -1.3;
      P.armR.rotation.z = -0.12;
      P.armL.rotation.z = 0.35;
      P.legL.rotation.x = -0.12; P.legR.rotation.x = 0.12;
      P.body.rotation.x = 0.02;
      this.root.position.y = this.baseY;
      return;
    }
    P.legL.rotation.x = s * amp;
    P.legR.rotation.x = -s * amp;
    P.legL.rotation.z = 0.02;
    P.legR.rotation.z = -0.02;
    P.armL.rotation.x = -s * amp * 0.85;
    P.armR.rotation.x = s * amp * 0.85;
    P.armL.rotation.z = 0.08 + (moving ? 0 : Math.sin(this.phase * 0.4) * 0.01);
    P.armR.rotation.z = -0.08;
    P.body.rotation.x = moving ? (run ? 0.12 : 0.05) : 0;
    P.body.rotation.z = 0;
    const bob = moving ? Math.abs(c) * (run ? 0.05 : 0.025) : Math.sin(this.phase * 0.6) * 0.008;
    this.root.position.y = this.baseY + bob;
    // idle breathing: the chest swells a touch
    const breathe = moving ? 1 : 1 + Math.sin(this.phase * 0.9) * 0.012;
    P.body.scale.set(1, breathe, 1);
  }

  setDrive(on) {
    this.state = on ? 'drive' : 'idle';
    if (on) { this.parts.body.rotation.x = 0.04; }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.root.rotation.z = (Math.random() - 0.5) * 0.6;
  }

  revive() {
    this.dead = false; this.deadT = 0;
    this.root.rotation.set(0, 0, 0);
    this.root.position.y = this.baseY;
  }
}

function shadeHex(hex, f) {
  const r = Math.min(255, ((hex >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((hex >> 8) & 255) * f) | 0;
  const b = Math.min(255, (hex & 255) * f) | 0;
  return (r << 16) | (g << 8) | b;
}
