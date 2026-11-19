// Effects: sparks, muzzle flashes, tracers, tyre and damage smoke, explosions. Everything is
// pooled — two points clouds, one instanced tracer mesh and four flash sprites — so firing an
// SMG never allocates.
import * as THREE from '../../vendor/three.module.min.js';

const SPARKS = 320, SMOKE = 160, TRACERS = 24;

export class Effects {
  constructor(scene, mats) {
    this.sp = { n: SPARKS, i: 0, life: new Float32Array(SPARKS), max: new Float32Array(SPARKS),
      vel: new Float32Array(SPARKS * 3), grav: new Float32Array(SPARKS) };
    this.pos = new Float32Array(SPARKS * 3);
    this.col = new Float32Array(SPARKS * 3);
    this.base = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) this.pos[i * 3 + 1] = -500;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({ map: mats.glowTex, size: 0.42, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.sm = { n: SMOKE, i: 0, life: new Float32Array(SMOKE), max: new Float32Array(SMOKE),
      vel: new Float32Array(SMOKE * 3), size: new Float32Array(SMOKE) };
    this.smPos = new Float32Array(SMOKE * 3);
    this.smCol = new Float32Array(SMOKE * 3);
    for (let i = 0; i < SMOKE; i++) this.smPos[i * 3 + 1] = -500;
    this.smGeo = new THREE.BufferGeometry();
    this.smGeo.setAttribute('position', new THREE.BufferAttribute(this.smPos, 3));
    this.smGeo.setAttribute('color', new THREE.BufferAttribute(this.smCol, 3));
    this.smokeMat = new THREE.PointsMaterial({ map: mats.smokeTex, size: 2.4, vertexColors: true, transparent: true,
      opacity: 0.55, depthWrite: false, sizeAttenuation: true });
    this.smoke = new THREE.Points(this.smGeo, this.smokeMat);
    this.smoke.frustumCulled = false;
    scene.add(this.smoke);

    const tg = new THREE.BoxGeometry(0.05, 0.05, 1);
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd89a, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false });
    this.tracers = new THREE.InstancedMesh(tg, this.tracerMat, TRACERS);
    this.tracers.frustumCulled = false;
    this.tracers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tr = { i: 0, life: new Float32Array(TRACERS) };
    this.dummy = new THREE.Object3D();
    for (let i = 0; i < TRACERS; i++) { this.dummy.position.set(0, -500, 0); this.dummy.updateMatrix(); this.tracers.setMatrixAt(i, this.dummy.matrix); }
    scene.add(this.tracers);

    this.flashes = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mats.glowTex, color: 0xffe6a0, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      s.scale.set(1.4, 1.4, 1);
      s.visible = false;
      scene.add(s);
      this.flashes.push({ sprite: s, life: 0 });
    }
    this.smokeClock = 0;
  }

  spark(x, y, z, n = 8, color = 0xffc060, spread = 4) {
    const S = this.sp;
    for (let k = 0; k < n; k++) {
      const i = S.i = (S.i + 1) % SPARKS;
      S.life[i] = S.max[i] = 0.25 + Math.random() * 0.35;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      const c = new THREE.Color(color);
      this.base[i * 3] = c.r; this.base[i * 3 + 1] = c.g; this.base[i * 3 + 2] = c.b;
      S.vel[i * 3] = (Math.random() - 0.5) * spread;
      S.vel[i * 3 + 1] = Math.random() * spread * 0.8 + 1;
      S.vel[i * 3 + 2] = (Math.random() - 0.5) * spread;
      S.grav[i] = 9;
    }
  }

  smoke(x, y, z, size = 1, dark = 0.55) {
    const S = this.sm;
    const i = S.i = (S.i + 1) % SMOKE;
    S.life[i] = S.max[i] = 1.1 + Math.random() * 1.2;
    S.size[i] = size;
    this.smPos[i * 3] = x; this.smPos[i * 3 + 1] = y; this.smPos[i * 3 + 2] = z;
    S.vel[i * 3] = (Math.random() - 0.5) * 1.2;
    S.vel[i * 3 + 1] = 0.6 + Math.random() * 1.1;
    S.vel[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    const c = 0.55 * dark + Math.random() * 0.12;
    this.smCol[i * 3] = c; this.smCol[i * 3 + 1] = c; this.smCol[i * 3 + 2] = c * 1.05;
  }

  tracer(ax, ay, az, bx, by, bz) {
    const i = this.tr.i = (this.tr.i + 1) % TRACERS;
    this.tr.life[i] = 0.07;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    this.dummy.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    this.dummy.lookAt(bx, by, bz);
    this.dummy.scale.set(1, 1, len);
    this.dummy.updateMatrix();
    this.tracers.setMatrixAt(i, this.dummy.matrix);
    this.tracers.instanceMatrix.needsUpdate = true;
  }

  flash(x, y, z, size = 1.6, color = 0xffe0a0) {
    const f = this.flashes.find((q) => q.life <= 0) ?? this.flashes[0];
    f.life = 0.06;
    f.sprite.visible = true;
    f.sprite.position.set(x, y, z);
    f.sprite.material.color.setHex(color);
    f.sprite.scale.set(size, size, 1);
    f.sprite.material.opacity = 1;
  }

  explosion(x, y, z) {
    this.spark(x, y, z, 40, 0xffa040, 12);
    this.spark(x, y, z, 16, 0xfff0c0, 7);
    for (let i = 0; i < 8; i++) this.smoke(x + (Math.random() - 0.5) * 2, y + Math.random() * 2, z + (Math.random() - 0.5) * 2, 2.2, 0.4);
    this.flash(x, y, z, 9, 0xffb060);
  }

  update(dt) {
    const S = this.sp;
    for (let i = 0; i < SPARKS; i++) {
      if (S.life[i] <= 0) { this.col[i * 3] = 0; this.col[i * 3 + 1] = 0; this.col[i * 3 + 2] = 0; continue; }
      S.life[i] -= dt;
      const k = Math.max(0, S.life[i] / S.max[i]);
      this.pos[i * 3] += S.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += S.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += S.vel[i * 3 + 2] * dt;
      S.vel[i * 3 + 1] -= S.grav[i] * dt;
      this.col[i * 3] = this.base[i * 3] * k;
      this.col[i * 3 + 1] = this.base[i * 3 + 1] * k;
      this.col[i * 3 + 2] = this.base[i * 3 + 2] * k;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;

    const M = this.sm;
    for (let i = 0; i < SMOKE; i++) {
      if (M.life[i] <= 0) { this.smCol[i * 3] = this.smCol[i * 3 + 1] = this.smCol[i * 3 + 2] = 0; continue; }
      M.life[i] -= dt;
      const k = Math.max(0, M.life[i] / M.max[i]);
      this.smPos[i * 3] += M.vel[i * 3] * dt;
      this.smPos[i * 3 + 1] += M.vel[i * 3 + 1] * dt;
      this.smPos[i * 3 + 2] += M.vel[i * 3 + 2] * dt;
      const f = 0.35 * k + 0.02;
      this.smCol[i * 3] *= 0.995; this.smCol[i * 3 + 1] *= 0.995; this.smCol[i * 3 + 2] *= 0.995;
      this.smCol[i * 3] = Math.max(this.smCol[i * 3], f * 0.5);
      this.smCol[i * 3 + 1] = Math.max(this.smCol[i * 3 + 1], f * 0.5);
      this.smCol[i * 3 + 2] = Math.max(this.smCol[i * 3 + 2], f * 0.55);
    }
    this.smGeo.attributes.position.needsUpdate = true;
    this.smGeo.attributes.color.needsUpdate = true;

    for (let i = 0; i < TRACERS; i++) {
      if (this.tr.life[i] > 0) {
        this.tr.life[i] -= dt;
        if (this.tr.life[i] <= 0) {
          this.dummy.position.set(0, -500, 0); this.dummy.scale.set(1, 1, 1); this.dummy.updateMatrix();
          this.tracers.setMatrixAt(i, this.dummy.matrix);
          this.tracers.instanceMatrix.needsUpdate = true;
        }
      }
    }
    for (const f of this.flashes) {
      if (f.life > 0) {
        f.life -= dt;
        f.sprite.material.opacity = Math.max(0, f.life / 0.06);
        if (f.life <= 0) f.sprite.visible = false;
      }
    }
  }
}
