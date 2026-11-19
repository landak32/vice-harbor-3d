// Third-person spring camera. On foot it rides over the right shoulder so the character is
// always in frame; in a car it pulls back and up, widens the lens and looks further ahead the
// faster you go. Everything is damped, nothing snaps except on purpose.
import * as THREE from '../../vendor/three.module.min.js';
import { damp, dampAngle, clamp, lerp, forwardX, forwardZ, rightX, rightZ } from '../core/math.js';

const PRESETS = {
  foot:  { back: 3.75, height: 1.85, side: 0.62, lookAhead: 4.2, lookY: 1.45, fov: 60 },
  aim:   { back: 2.55, height: 1.72, side: 0.95, lookAhead: 8.0, lookY: 1.5, fov: 54 },
  drive: { back: 7.9, height: 3.55, side: 0.0, lookAhead: 7.0, lookY: 1.25, fov: 66 },
  cine:  { back: 9.0, height: 4.4, side: 1.6, lookAhead: 6.0, lookY: 1.6, fov: 58 },
};

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 6, 12);
    this.look = new THREE.Vector3();
    this.yaw = 0;
    this.shake = 0;
    this.roll = 0;
    this.fov = 60;
    this.first = true;
  }

  addShake(a) { this.shake = Math.min(1.4, this.shake + a); }

  // mode: 'foot' | 'aim' | 'drive'; target: {x,y,z,yaw,speed}
  update(dt, target, mode = 'foot', extra = {}) {
    const p = PRESETS[mode] ?? PRESETS.foot;
    const speed = Math.abs(target.speed ?? 0);
    this.yaw = this.first ? target.yaw : dampAngle(this.yaw, target.yaw + (extra.yawOffset ?? 0), mode === 'drive' ? 3.4 : 5.0, dt);
    const back = p.back + (mode === 'drive' ? speed * 0.075 : 0);
    const fx = forwardX(this.yaw), fz = forwardZ(this.yaw);
    const rx = rightX(this.yaw), rz = rightZ(this.yaw);
    const ty = target.y + p.height + (extra.heightOffset ?? 0);
    let dx = target.x - fx * back + rx * p.side;
    let dz = target.z - fz * back + rz * p.side;
    let dy = ty;

    // keep the lens out of walls: walk back along the line to the player until it is clear
    if (extra.world) {
      const tgtX = target.x, tgtZ = target.z;
      let k = 1;
      for (let i = 0; i < 7; i++) {
        if (!extra.world.inside(tgtX + (dx - tgtX) * k, tgtZ + (dz - tgtZ) * k, 1.1)) break;
        k -= 0.14;
      }
      dx = tgtX + (dx - tgtX) * Math.max(0.2, k);
      dz = tgtZ + (dz - tgtZ) * Math.max(0.2, k);
      dy += (1 - Math.max(0.2, k)) * 1.2;
    }
    if (this.first) {
      this.pos.set(dx, dy, dz);
      this.first = false;
    } else {
      this.pos.x = damp(this.pos.x, dx, 9, dt);
      this.pos.y = damp(this.pos.y, dy, 7, dt);
      this.pos.z = damp(this.pos.z, dz, 9, dt);
    }
    const lookX = target.x + fx * p.lookAhead;
    const lookZ = target.z + fz * p.lookAhead;
    const lookY = target.y + p.lookY;
    this.look.x = damp(this.look.x, lookX, 10, dt);
    this.look.y = damp(this.look.y, lookY, 8, dt);
    this.look.z = damp(this.look.z, lookZ, 10, dt);

    this.shake = Math.max(0, this.shake - dt * 2.2);
    const sh = this.shake * this.shake;
    const t = performance.now() * 0.001;
    this.camera.position.set(
      this.pos.x + Math.sin(t * 41) * sh * 0.28,
      this.pos.y + Math.sin(t * 57) * sh * 0.22,
      this.pos.z + Math.cos(t * 47) * sh * 0.28);
    this.camera.lookAt(this.look.x, this.look.y + Math.sin(t * 37) * sh * 0.2, this.look.z);
    this.roll = damp(this.roll, clamp(-(target.yawRate ?? 0) * 0.05, -0.05, 0.05), 6, dt);
    this.camera.rotateZ(this.roll);

    const targetFov = p.fov + (mode === 'drive' ? clamp(speed * 0.22, 0, 9) : 0);
    this.fov = damp(this.fov, targetFov, 3, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  snap(target, mode = 'foot') {
    this.first = true;
    this.yaw = target.yaw;
    this.update(1 / 60, target, mode);
    this.camera.fov = (PRESETS[mode] ?? PRESETS.foot).fov;
    this.camera.updateProjectionMatrix();
    this.look.set(target.x + forwardX(target.yaw) * 4, target.y + 1.4, target.z + forwardZ(target.yaw) * 4);
    this.camera.lookAt(this.look);
  }
}
